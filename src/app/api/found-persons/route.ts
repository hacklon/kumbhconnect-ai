import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Mock DB for found persons
let mockFoundDatabase: any[] = [];

export async function GET() {
  const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (isMock) {
    return NextResponse.json({ success: true, isMock: true, data: mockFoundDatabase });
  }

  try {
    const { data, error } = await supabase.from('found_persons').select('*').order('reported_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, isMock: false, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!body.found_location || !body.finder_name || !body.finder_contact) {
      return NextResponse.json({ success: false, error: 'Location, finder name, and finder contact are required' }, { status: 400 });
    }

    const newSighting = {
      id: `found-${Math.random().toString(36).substring(2, 9)}`,
      reported_at: new Date().toISOString(),
      name: body.name || null,
      gender: body.gender || 'Unknown',
      age_band: body.age_band || 'Unknown',
      found_location: body.found_location,
      found_zone: body.found_zone || 'Zone Area 1',
      finder_name: body.finder_name,
      finder_contact: body.finder_contact,
      photo_url: body.photo_url || null,
      notes: body.notes || '',
      matching_case_id: null,
      status: 'Unmatched' as const
    };

    // Auto matcher logic: search database for matching missing person reports
    // Let's do a simple check: matches gender and age_band, or matches name
    let probableMatch: any = null;

    if (isMock) {
      // Search in our mock datastore or just simulate a potential match
      // For demo purposes, let's match by gender and age_band if any exists
      mockFoundDatabase.unshift(newSighting);
      return NextResponse.json({ 
        success: true, 
        isMock: true, 
        data: newSighting,
        matchFound: false,
        matchDetails: null 
      });
    }

    // Connect to real Supabase
    // 1. Search for matching missing persons (status = 'Pending')
    let query = supabase
      .from('missing_persons')
      .select('*')
      .eq('status', 'Pending');

    if (body.gender && body.gender !== 'Unknown') {
      query = query.eq('gender', body.gender);
    }
    if (body.age_band && body.age_band !== 'Unknown') {
      query = query.eq('age_band', body.age_band);
    }

    const { data: missingMatches, error: searchError } = await query.limit(5);

    if (!searchError && missingMatches && missingMatches.length > 0) {
      // Take the first one as a probable match for demonstration
      probableMatch = missingMatches[0];
      newSighting.matching_case_id = probableMatch.id;
      newSighting.status = 'Probable Match';
      
      // Update missing person status in background to indicate sighted
      await supabase
        .from('missing_persons')
        .update({ remarks: `Sighted by volunteer ${body.finder_name} in ${body.found_zone}. Notes: ${body.notes}` })
        .eq('id', probableMatch.id);

      // Create a notification for police / administrators
      await supabase.from('notifications').insert({
        recipient_id: null, // Broadcast to all operators
        message: `MATCH ALERT: Sighting reported for case ${probableMatch.case_id} (${probableMatch.name || 'Unnamed'}) at ${body.found_zone}`,
        type: 'Sighting_Alert'
      });
    }

    // Insert found record
    const { data, error } = await supabase
      .from('found_persons')
      .insert(newSighting)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      isMock: false, 
      data, 
      matchFound: !!probableMatch,
      matchDetails: probableMatch 
    });

  } catch (error: any) {
    console.error('API Error in POST /api/found-persons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
