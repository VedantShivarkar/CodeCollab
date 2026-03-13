import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini using the environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, language, query } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code context is required.' }, { status: 400 });
    }

    // We use the 1.5-flash model for high-speed, low-latency hackathon demos
    // Upgraded to the current 2026 production-grade Flash model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // The Prompt Engineering here is key. We force it to act as an AST analyzer, not a basic chatbot.
    const prompt = `
      Act as an expert Staff Principal Engineer and strict Static Code Analyzer.
      Language: ${language || 'Unknown'}
      
      Current Code Block:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      User Query/Action: "${query || 'Analyze this code for potential runtime bugs, edge cases, and architectural flaws.'}"
      
      Instructions: Do not write a pleasant greeting. Do not offer basic syntax fixes. Analyze the logical flow and abstract syntax tree implications. Point out memory leaks, race conditions, or security vulnerabilities if any exist. Keep it concise, aggressive, and highly technical.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText }, { status: 200 });
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: 'Failed to process AI request', details: error.message }, { status: 500 });
  }
}