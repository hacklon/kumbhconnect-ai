import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: 'Text content is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isMock = !apiKey || apiKey.includes('placeholder') || apiKey.startsWith('sk-ant-api03');

    // 1. Mock Fallback Parser (using local keyword matching to support keyless deploy)
    if (isMock) {
      console.log('API: Running mock AI parser (no Anthropic API key configured)');
      const textLower = text.toLowerCase();
      
      const response = {
        name: text.match(/name is\s+([A-Z][a-z]+(\s+[A-Z][a-z]+)?)/i)?.[1] || null,
        gender: textLower.includes('woman') || textLower.includes('female') || textLower.includes('saree') || textLower.includes('lady') ? 'Female' : 'Male',
        age_band: textLower.includes('child') || textLower.includes('boy') || textLower.includes('girl') ? '0-12' : 
                  textLower.includes('old') || textLower.includes('elderly') || textLower.includes('senior') ? '61-70' : '18-40',
        language: textLower.includes('marathi') ? 'Marathi' :
                  textLower.includes('hindi') ? 'Hindi' :
                  textLower.includes('gujarati') ? 'Gujarati' : 'English',
        clothing: textLower.includes('saree') ? 'Saree' :
                  textLower.includes('kurta') ? 'Kurta' :
                  textLower.includes('dhoti') ? 'Dhoti' : 'Standard Pilgrim Clothes',
        physical_description: text
      };

      return NextResponse.json({ success: true, isMock: true, data: response });
    }

    // 2. Call Anthropic Claude API
    console.log('API: Invoking Claude for text structuring');
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
        system: 'You are an AI data extractor for the Nashik Kumbh Mela Missing Persons platform. Extract the following structured fields from the raw missing pilgrim report description. Return ONLY a valid JSON object matching this schema, without any markdown backticks or extra text: { "name": string|null, "gender": "Male"|"Female"|"Unknown", "age_band": "0-12"|"13-17"|"18-40"|"41-60"|"61-70"|"71-80"|"80+", "language": string|null, "clothing": string|null, "physical_description": string }',
        messages: [{ role: 'user', content: text }]
      })
    });

    const data = await response.json();
    const resultText = data.content?.[0]?.text || '{}';
    const structuredData = JSON.parse(resultText);

    return NextResponse.json({ success: true, isMock: false, data: structuredData });

  } catch (error: any) {
    console.error('API Error in POST /api/ai/parse-report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
