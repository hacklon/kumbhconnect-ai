import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function to calculate a simple overlap score locally when in mock mode
function calculateLocalMatchScore(desc1: string, desc2: string): number {
  const d1 = desc1.toLowerCase();
  const d2 = desc2.toLowerCase();
  
  const keywords = ['saree', 'kurta', 'dhoti', 'stick', 'scar', 'spectacles', 'cap', 'glass', 'gujarati', 'marathi', 'crying', 'confused'];
  let score = 20; // baseline match
  
  keywords.forEach(word => {
    if (d1.includes(word) && d2.includes(word)) {
      score += 25;
    }
  });
  
  return Math.min(score, 95);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { foundPerson } = body;

    if (!foundPerson) {
      return NextResponse.json({ success: false, error: 'Found person details are required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isMock = !apiKey || apiKey.includes('placeholder') || apiKey.startsWith('sk-ant-api03');

    // 1. Fetch potential candidates
    let candidates: any[] = [];
    
    // In mock mode, we fetch cases from local Next.js client or query Supabase which might return empty
    // To make it run, we will fetch standard mock database rows
    const isSupabaseMock = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isSupabaseMock) {
      // Return a simulated matching candidate
      candidates = [
        {
          case_id: "KMP-2027-00002",
          name: "Prakash Nair",
          gender: "Male",
          age_band: "71-80",
          last_seen_location: "Trimbakeshwar Approach",
          physical_description: "Old man wearing white dhoti, walks with a walking stick, speaks Gujarati and Hindi.",
          clothing_description: "White dhoti",
          reporter_mobile: "+91 8266944844"
        }
      ];
    } else {
      let query = supabase
        .from('missing_persons')
        .select('*')
        .eq('status', 'Pending');

      if (foundPerson.gender && foundPerson.gender !== 'Unknown') {
        query = query.eq('gender', foundPerson.gender);
      }
      if (foundPerson.age_band && foundPerson.age_band !== 'Unknown') {
        query = query.eq('age_band', foundPerson.age_band);
      }

      const { data, error } = await query.limit(5);
      if (error) throw error;
      candidates = data || [];
    }

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, count: 0, matches: [] });
    }

    // 2. Score candidates
    if (isMock) {
      console.log('API: Running mock AI matching scorer (no Anthropic API key)');
      const scoredMatches = candidates.map(candidate => {
        const foundDesc = `${foundPerson.notes} ${foundPerson.clothing || ''}`;
        const candidateDesc = `${candidate.physical_description} ${candidate.clothing_description || ''}`;
        const score = calculateLocalMatchScore(foundDesc, candidateDesc);
        
        return {
          candidate,
          score,
          matchConfidence: score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
          notes: `Simulated fuzzy matches. Common key terms detected between description and sighting.`
        };
      });

      // Sort by score descending
      scoredMatches.sort((a, b) => b.score - a.score);
      return NextResponse.json({ success: true, isMock: true, matches: scoredMatches });
    }

    // 3. Call Claude to perform matching analysis
    console.log('API: Invoking Claude for double-description matching verification');
    const scoredMatches = [];

    for (const candidate of candidates) {
      const prompt = `Compare the following two reports and assess if they describe the same missing person:
Report A (Found Person): Gender: ${foundPerson.gender}, Age: ${foundPerson.age_band}, Location: ${foundPerson.found_location}, Notes: ${foundPerson.notes}
Report B (Missing Case): Name: ${candidate.name}, Gender: ${candidate.gender}, Age: ${candidate.age_band}, Description: ${candidate.physical_description}, Clothing: ${candidate.clothing_description}

Provide your assessment in this JSON format ONLY, without markdown backticks:
{
  "score": number (0 to 100),
  "confidence": "HIGH"|"MEDIUM"|"LOW",
  "match_rationale": "Explanation of matching elements like clothing, dialect, items, age etc."
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const resultText = data.content?.[0]?.text || '{}';
      const parsedMatch = JSON.parse(resultText);

      scoredMatches.push({
        candidate,
        score: parsedMatch.score || 10,
        matchConfidence: parsedMatch.confidence || 'LOW',
        notes: parsedMatch.match_rationale || 'Could not compute rationale'
      });
    }

    scoredMatches.sort((a, b) => b.score - a.score);
    return NextResponse.json({ success: true, isMock: false, matches: scoredMatches });

  } catch (error: any) {
    console.error('API Error in POST /api/ai/match-sighting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
