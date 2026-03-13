import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, language } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code context is required.' }, { status: 400 });
    }

    // Force JSON output to guarantee frontend parsing
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Act as a Staff Principal Engineer. Analyze the following ${language} code.
      Identify any bugs, architectural flaws, or anti-patterns.
      Then, write the completely fixed and optimized code.
      
      You MUST return a valid JSON object with EXACTLY two keys:
      1. "analysis": A concise, harsh string explaining the flaws.
      2. "fixed_code": A string containing the completely corrected, production-ready code. DO NOT wrap it in markdown formatting blocks, just the raw code.

      Current Code:
      \`\`\`${language}
      ${code}
      \`\`\`
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse it securely before passing to the client
    const jsonResponse = JSON.parse(responseText);

    return NextResponse.json(jsonResponse, { status: 200 });
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: 'Failed to process AI request', details: error.message }, { status: 500 });
  }
}