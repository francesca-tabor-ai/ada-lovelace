
import { decode, decodeAudioData } from "../utils/audio";

export const generateAdaImage = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.imageUrl) {
      throw new Error("Failed to generate image: No image data in response");
    }

    return data.imageUrl;
  } catch (error: any) {
    console.error("Image generation error:", error);
    throw new Error(`Failed to generate image: ${error.message || error}`);
  }
};

export const generateAdaSpeechAudio = async (text: string, audioCtx: AudioContext): Promise<AudioBuffer> => {
  try {
    const response = await fetch('/api/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.audioData) {
      throw new Error("Failed to generate speech audio: No audio data in response");
    }

    const rawBytes = decode(data.audioData);
    return await decodeAudioData(rawBytes, audioCtx, 24000, 1);
  } catch (error: any) {
    console.error("Audio generation error:", error);
    throw new Error(`Failed to generate speech audio: ${error.message || error}`);
  }
};
