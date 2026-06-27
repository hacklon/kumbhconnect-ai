import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Mock datastore fallback to ensure the app is immediately testable and functional
const MOCK_MISSING_PERSONS = [
  {
    id: "uuid-1",
    case_id: "KMP-2027-00001",
    reported_at: "2027-07-28T06:01:00Z",
    name: "Savita Desai",
    gender: "Female",
    age_band: "41-60",
    state: "Bihar",
    district: "Nalanda",
    language: "Maithili",
    last_seen_location: "Trimbakeshwar Approach",
    last_seen_zone: "Zone Area 1",
    reporting_center: "Trimbakeshwar Kho-Ya-Paya Kendra",
    reporter_mobile: "+91 6734036506",
    physical_description: "Man in saffron kurta, has rudraksha mala",
    status: "Reunited",
    resolution_hours: 3.3,
    is_duplicate_report: false,
    remarks: "GGTalk app used"
  },
  {
    id: "uuid-2",
    case_id: "KMP-2027-00002",
    reported_at: "2027-07-14T15:06:00Z",
    name: "Prakash Nair",
    gender: "Male",
    age_band: "71-80",
    state: "Gujarat",
    district: "Anand",
    language: "Telugu",
    last_seen_location: "Trimbakeshwar Approach",
    last_seen_zone: "Zone Area 1",
    reporting_center: "Adgaon Kho-Ya-Paya",
    reporter_mobile: "+91 8266944844",
    physical_description: "Woman in green saree, has tilak on forehead",
    status: "Pending",
    resolution_hours: null,
    is_duplicate_report: false,
    remarks: "Announcement made on PA"
  },
  {
    id: "uuid-3",
    case_id: "KMP-2027-00028",
    reported_at: "2027-08-06T17:30:00Z",
    name: "Suresh Joshi",
    gender: "Male",
    age_band: "41-60",
    state: "Kerala",
    district: "Kerala District 3",
    language: "Bengali",
    last_seen_location: "Ramkund Ghat",
    last_seen_zone: "Zone Area 30",
    reporting_center: "Panchavati Center",
    reporter_mobile: null,
    physical_description: "Old man confused, keeps asking for Ramkund",
    status: "Pending",
    resolution_hours: null,
    is_duplicate_report: false,
    remarks: "Bharat Bharati volunteer handled"
  }
];

// In-memory array to capture writes when using mock mode
let localDatabase = [...MOCK_MISSING_PERSONS];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const gender = searchParams.get('gender') || '';
    const ageBand = searchParams.get('ageBand') || '';
    const zone = searchParams.get('zone') || '';
    const status = searchParams.get('status') || '';

    // Check if Supabase keys are configured properly
    const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isMock) {
      // Perform local filtering
      let results = [...localDatabase];
      if (query) {
        const q = query.toLowerCase();
        results = results.filter(p => 
          p.name?.toLowerCase().includes(q) || 
          p.case_id.toLowerCase().includes(q) || 
          p.physical_description.toLowerCase().includes(q) ||
          p.last_seen_location.toLowerCase().includes(q)
        );
      }
      if (gender) {
        results = results.filter(p => p.gender.toLowerCase() === gender.toLowerCase());
      }
      if (ageBand) {
        results = results.filter(p => p.age_band === ageBand);
      }
      if (zone) {
        results = results.filter(p => p.last_seen_zone === zone);
      }
      if (status) {
        results = results.filter(p => p.status.toLowerCase() === status.toLowerCase());
      }

      return NextResponse.json({ success: true, isMock: true, count: results.length, data: results });
    }

    // Connect to real Supabase
    let builder = supabase.from('missing_persons').select('*');

    if (query) {
      // Simple text match. In real database, trigram indexes will index columns.
      builder = builder.or(`name.ilike.%${query}%,case_id.ilike.%${query}%,physical_description.ilike.%${query}%,last_seen_location.ilike.%${query}%`);
    }
    if (gender) {
      builder = builder.eq('gender', gender);
    }
    if (ageBand) {
      builder = builder.eq('age_band', ageBand);
    }
    if (zone) {
      builder = builder.eq('last_seen_zone', zone);
    }
    if (status) {
      builder = builder.eq('status', status);
    }

    const { data, error } = await builder.order('reported_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, isMock: false, count: data.length, data });

  } catch (error: any) {
    console.error('API Error in GET /api/missing-persons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Validate request
    if (!body.gender || !body.last_seen_location) {
      return NextResponse.json({ success: false, error: 'Gender and Last Seen Location are required' }, { status: 400 });
    }

    const newCaseId = `KMP-2027-${Math.floor(10000 + Math.random() * 90000)}`;
    const newRecord = {
      id: `uuid-${Math.random().toString(36).substring(2, 9)}`,
      case_id: newCaseId,
      reported_at: new Date().toISOString(),
      name: body.name || null,
      gender: body.gender,
      age_band: body.age_band || 'Unknown',
      state: body.state || 'Maharashtra',
      district: body.district || 'Nashik',
      language: body.language || 'Marathi',
      last_seen_location: body.last_seen_location,
      last_seen_zone: body.last_seen_zone || 'Zone Area 1',
      reporting_center: body.reporting_center || 'Central Control Room',
      reporter_mobile: body.reporter_mobile || null,
      emergency_contact: body.emergency_contact || null,
      physical_description: body.physical_description || '',
      clothing_description: body.clothing_description || '',
      landmark: body.landmark || '',
      health_conditions: body.health_conditions || '',
      special_needs: body.special_needs || '',
      voice_url: body.voice_url || null,
      photo_url: body.photo_url || null,
      status: 'Pending' as const,
      resolution_hours: null,
      is_duplicate_report: false,
      remarks: body.remarks || ''
    };

    if (isMock) {
      localDatabase.unshift(newRecord);
      return NextResponse.json({ success: true, isMock: true, data: newRecord });
    }

    // Insert to Supabase
    const { data, error } = await supabase
      .from('missing_persons')
      .insert(newRecord)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, isMock: false, data });

  } catch (error: any) {
    console.error('API Error in POST /api/missing-persons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
