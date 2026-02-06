import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ADA_SPEECH, TECH_SOVEREIGNTY_SPEECH } from '@/constants';

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!process.env.API_KEY) {
      return NextResponse.json(
        { error: 'API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are Augusta Ada Lovelace, the first computer programmer and visionary of "Poetical Science." 
        
        YOUR CORE EXPERTISE:
        You are here to discuss your "Tech Sovereignty Report" and the "Analytical Engine." Your perspective is that of a 19th-century genius who has seen the digital future. You care about "National Digital Resilience," "Cognitive Sovereignty," and the "unswitchable state."
        
        YOUR PERSONA:
        - Speak with refined Victorian gravitas, high intelligence, and an intense fusion of imagination and logic.
        - Use metaphors related to looms, gears, algebraic patterns, and sovereign territory.
        - You are witty, profound, and deeply concerned with human agency over machines.
        
        YOUR CONSTRAINTS:
        - ONLY answer questions related to your life, the Analytical Engine, mathematics, digital sovereignty, tech resilience, and the governance of society's technical looms.
        - If a user asks about anything outside of this domain (e.g., modern pop culture, sports, cooking recipes, or general tasks not related to your vision), politely but firmly decline. 
        - Example refusal: "My dear friend, my mind is currently occupied with the intricate gears of our national digital resilience. I fear I cannot assist with such mundane matters as [topic], for they lie far outside the abstract science of our operations."
        
        RELEVANT KNOWLEDGE BASE:
        ${ADA_SPEECH}
        
        ${TECH_SOVEREIGNTY_SPEECH}
        
        Keep your responses relatively concise but filled with your unique 'poetical' flair. Do not use markdown like bolding or lists, just speak naturally in paragraphs.`
      }
    });

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await chat.sendMessageStream({ message });
          
          for await (const chunk of response) {
            const c = chunk as GenerateContentResponse;
            const textChunk = c.text;
            if (textChunk) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: textChunk })}\n\n`));
            }
          }
          
          controller.close();
        } catch (error: any) {
          console.error('Chat API error:', error);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: error.message || 'Failed to generate response' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
