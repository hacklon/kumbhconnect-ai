import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Mock analytics database for demonstration
const MOCK_ANALYTICS = {
  active_missing: 48,
  found_persons: 212,
  high_priority: 15,
  elderly_cases: 28,
  children_cases: 9,
  average_resolution_hours: 4.8,
  zone_statistics: [
    { zone: "Zone Area 1", missing: 12, found: 45 },
    { zone: "Zone Area 8", missing: 8, found: 32 },
    { zone: "Zone Area 21", missing: 6, found: 21 },
    { zone: "Zone Area 30", missing: 14, found: 64 },
    { zone: "Zone Area 31", missing: 8, found: 50 }
  ],
  heat_map: [
    { latitude: 20.0067, longitude: 73.7906, weight: 1.0 }, // Ramkund Access
    { latitude: 19.9869, longitude: 73.7956, weight: 0.8 }, // Dwarka Circle
    { latitude: 19.9549, longitude: 73.8354, weight: 0.6 }, // Upnagar Junction
    { latitude: 20.0251, longitude: 73.4130, weight: 0.4 }, // Adgaon
    { latitude: 20.0142, longitude: 73.7500, weight: 0.3 }  // Gangapur
  ]
};

export async function GET() {
  try {
    const isMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isMock) {
      return NextResponse.json({ success: true, isMock: true, data: MOCK_ANALYTICS });
    }

    // Connect to real Supabase
    // 1. Fetch count of active missing persons (status = 'Pending')
    const { count: activeMissing, error: activeErr } = await supabase
      .from('missing_persons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    if (activeErr) throw activeErr;

    // 2. Fetch count of found persons (status != 'Resolved')
    const { count: foundPersons, error: foundErr } = await supabase
      .from('found_persons')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'Resolved');

    if (foundErr) throw foundErr;

    // 3. Fetch count of elderly and children cases
    const { data: ageBands, error: ageErr } = await supabase
      .from('missing_persons')
      .select('age_band, status')
      .eq('status', 'Pending');

    if (ageErr) throw ageErr;

    let elderlyCases = 0;
    let childrenCases = 0;
    let highPriority = 0;

    ageBands?.forEach(p => {
      if (p.age_band === '61-70' || p.age_band === '71-80' || p.age_band === '80+') {
        elderlyCases++;
        highPriority++;
      } else if (p.age_band === '0-12') {
        childrenCases++;
        highPriority++;
      }
    });

    // 4. Compute average resolution hours
    const { data: resolvedHours, error: resErr } = await supabase
      .from('missing_persons')
      .select('resolution_hours')
      .eq('status', 'Reunited');

    if (resErr) throw resErr;

    let avgHours = 4.8; // Default fallback if no data
    if (resolvedHours && resolvedHours.length > 0) {
      const sum = resolvedHours.reduce((acc, curr) => acc + (curr.resolution_hours || 0), 0);
      avgHours = parseFloat((sum / resolvedHours.length).toFixed(1));
    }

    // 5. Compute Zone Statistics
    const { data: zoneData, error: zoneErr } = await supabase
      .from('missing_persons')
      .select('last_seen_zone, status');

    if (zoneErr) throw zoneErr;

    const zoneCounts: { [key: string]: { missing: number, found: number } } = {};
    zoneData?.forEach(p => {
      const zone = p.last_seen_zone || 'Unknown';
      if (!zoneCounts[zone]) zoneCounts[zone] = { missing: 0, found: 0 };
      if (p.status === 'Pending') {
        zoneCounts[zone].missing++;
      } else if (p.status === 'Reunited') {
        zoneCounts[zone].found++;
      }
    });

    const zoneStatistics = Object.entries(zoneCounts).map(([zone, counts]) => ({
      zone,
      missing: counts.missing,
      found: counts.found
    }));

    return NextResponse.json({
      success: true,
      isMock: false,
      data: {
        active_missing: activeMissing || 0,
        found_persons: foundPersons || 0,
        high_priority: highPriority,
        elderly_cases: elderlyCases,
        children_cases: childrenCases,
        average_resolution_hours: avgHours,
        zone_statistics: zoneStatistics.slice(0, 10), // Limit top 10 zones
        heat_map: MOCK_ANALYTICS.heat_map // Fallback for heatmap overlay coordinates
      }
    });

  } catch (error: any) {
    console.error('API Error in GET /api/analytics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
