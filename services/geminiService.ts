
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from "../utils/audio";

export const generateAdaImage = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not defined. Please set it in your .env.local file.");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [{ text: prompt }],
      }],
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    // Iterate through parts to find inlineData (don't hardcode parts[0])
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    console.error("Image generation response:", JSON.stringify(response, null, 2));
    throw new Error("Failed to generate image: No image data found in response");
  } catch (error: any) {
    console.error("Image generation error:", error);
    throw new Error(`Failed to generate image: ${error.message || error}`);
  }
};

export const generateAdaSpeechAudio = async (text: string, audioCtx: AudioContext): Promise<AudioBuffer> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not defined. Please set it in your .env.local file.");
  }
  
  try {
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

    // Iterate through parts to find inlineData (don't hardcode parts[0])
    let base64Audio: string | undefined;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64Audio = part.inlineData.data;
        break;
      }
    }
    
    if (!base64Audio) {
      console.error("Audio generation response:", JSON.stringify(response, null, 2));
      throw new Error("Failed to generate speech audio: No audio data found in response");
    }

    const rawBytes = decode(base64Audio);
    return await decodeAudioData(rawBytes, audioCtx, 24000, 1);
  } catch (error: any) {
    console.error("Audio generation error:", error);
    throw new Error(`Failed to generate speech audio: ${error.message || error}`);
  }
};
