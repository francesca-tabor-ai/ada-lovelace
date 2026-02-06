import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!process.env.API_KEY) {
      return NextResponse.json(
        { error: 'API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ text: `Speak with the refined, old-fashioned British accent of a 19th-century aristocrat. Use historical gravitas, wisdom, and urgency: ${text}` }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    // Iterate through parts to find inlineData
    let base64Audio: string | undefined;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64Audio = part.inlineData.data;
        break;
      }
    }
    
    if (!base64Audio) {
      return NextResponse.json(
        { error: 'Failed to generate speech audio: No audio data found in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audioData: base64Audio
    });
  } catch (error: any) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech audio' },
      { status: 500 }
    );
  }
}
