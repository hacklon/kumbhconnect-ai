import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Expected fields from SMS Gateway:
    // sender: +91XXXXXXXXXX (Phone number)
    // message: "GPS: 20.0067, 73.7906, Accuracy: 12m, Battery: 76%"
    const { sender, message } = body;

    if (!sender || !message) {
      return NextResponse.json({ success: false, error: 'Sender phone and message content are required' }, { status: 400 });
    }

    console.log(`Received SMS webhook from ${sender}: "${message}"`);

    // Parse coordinates and battery metrics using regex
    // e.g. Match: 20.0067, 73.7906
    const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const batRegex = /Battery:\s*(\d+)%/i;
    const accRegex = /Accuracy:\s*(\d+)m/i;

    const coordMatch = message.match(coordRegex);
    const batMatch = message.match(batRegex);
    const accMatch = message.match(accRegex);

    if (!coordMatch) {
      return NextResponse.json({ success: false, error: 'Could not parse coordinates from SMS text' }, { status: 422 });
    }

    const latitude = parseFloat(coordMatch[1]);
    const longitude = parseFloat(coordMatch[2]);
    const battery = batMatch ? parseInt(batMatch[1]) : null;
    const accuracy = accMatch ? parseInt(accMatch[1]) : null;

    const logDetails = `SMS Coordinates parsed: Lat ${latitude}, Lng ${longitude}, Acc ${accuracy}m, Battery ${battery}%`;
    console.log(logDetails);

    if (isMock) {
      return NextResponse.json({
        success: true,
        isMock: true,
        data: {
          sender,
          latitude,
          longitude,
          battery,
          accuracy,
          status: "Parsed locally, no database updated"
        }
      });
    }

    // 1. Check if the sender matches a volunteer's phone number
    const { data: volunteer, error: volError } = await supabase
      .from('volunteers')
      .select('id, assigned_zone')
      .eq('phone_number', sender)
      .maybeSingle();

    if (!volError && volunteer) {
      // Update volunteer last known location
      await supabase
        .from('volunteers')
        .update({
          last_known_lat: latitude,
          last_known_lng: longitude
        })
        .eq('id', volunteer.id);

      // Audit log the update
      await supabase.from('audit_logs').insert({
        action: 'VOLUNTEER_GPS_SMS_UPDATE',
        target_table: 'volunteers',
        target_id: volunteer.id,
        details: `Volunteer location updated via SMS: Lat ${latitude}, Lng ${longitude}`
      });

      return NextResponse.json({ success: true, userType: 'Volunteer', data: { latitude, longitude } });
    }

    // 2. Check if the sender matches a missing person case (emergency contact or target mobile)
    const { data: missingCase, error: caseError } = await supabase
      .from('missing_persons')
      .select('id, case_id, name')
      .eq('reporter_mobile', sender)
      .eq('status', 'Pending')
      .maybeSingle();

    if (!caseError && missingCase) {
      // Create a map alert/notification with the coordinates
      const updateRemarks = `AUTOLOCATE: Sighting coordinates received via SMS from reporter phone. GPS: ${latitude}, ${longitude}. Acc: ${accuracy || 'N/A'}m. Battery: ${battery || 'N/A'}%`;
      
      await supabase
        .from('missing_persons')
        .update({ remarks: updateRemarks })
        .eq('id', missingCase.id);

      await supabase.from('notifications').insert({
        message: `SMS Geolocation received for Case ${missingCase.case_id} (${missingCase.name || 'Unnamed'}). Location: Lat ${latitude}, Lng ${longitude}`,
        type: 'Sighting_Alert'
      });

      await supabase.from('audit_logs').insert({
        action: 'CASE_GPS_SMS_UPDATE',
        target_table: 'missing_persons',
        target_id: missingCase.id,
        details: `Sighting coordinate mapped to case via reporter SMS: Lat ${latitude}, Lng ${longitude}`
      });

      return NextResponse.json({ success: true, userType: 'MissingPersonCase', data: { latitude, longitude, caseId: missingCase.case_id } });
    }

    // 3. Fallback: Log as general coordinates sighting
    await supabase.from('notifications').insert({
      message: `Unmapped SMS Sighting from ${sender}: Lat ${latitude}, Lng ${longitude}`,
      type: 'Sighting_Alert'
    });

    return NextResponse.json({ success: true, userType: 'Unmapped', data: { latitude, longitude } });

  } catch (error: any) {
    console.error('API Error in GET /api/sms-gateway:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
