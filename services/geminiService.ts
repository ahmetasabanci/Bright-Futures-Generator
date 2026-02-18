
import { GoogleGenAI } from "@google/genai";

export async function fetchExplanation(sector: string, technology: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    The statement is: "The future of ${sector} will be bright because of ${technology}."
    
    Provide a short, optimistic, and compelling 2-3 sentence argument explaining why this combination specifically creates a better future. 
    Use professional but inspiring language. Avoid cliches.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.9,
      }
    });

    if (!response.text) {
      return "No explanation could be generated at this time.";
    }
    
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Connection failed";
    throw new Error(`Failed to connect to the future-seeing core: ${errorMessage}`);
  }
}

export async function generateVisionImage(sector: string, technology: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `A cinematic, high-quality, futuristic visualization of ${technology} transforming ${sector}. 
    Abstract, clean, professional aesthetic, optimistic atmosphere, wide-angle 16:9 composition. 
    No text in the image. Deep blues, vibrant oranges, and soft glow lighting. 8k resolution style.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data received from API");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
}
