/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";

// Always initialize with the named apiKey parameter from import.meta.env.VITE_API_KEY
const getAI = () => new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export const getDailyVibe = async () => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Give me a single, short motivational study quote using current Gen-Z slang. Make it funny and high energy. Max 15 words. Just the quote, no intro.",
    config: {
      temperature: 1,
      topP: 0.95,
    }
  });
  // Use .text property to get the generated content
  return response.text?.trim() || "Stay on your grind, the glow up is real! ✨";
};

export const summarizeNotes = async (content: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Please summarize these study notes in a fun, Gen-Z friendly way with bullet points and emojis. Focus on the juice: ${content}`,
    config: {
      temperature: 0.7,
    }
  });
  return response.text || '';
};

export const generateQuiz = async (content: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a 3-question multiple choice quiz based on these study notes. JSON only.
    Notes: ${content}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.INTEGER }
          },
          required: ['question', 'options', 'correctAnswer']
        }
      }
    }
  });
  // Use .text property to get the JSON string and parse it
  return JSON.parse(response.text || '[]');
};
