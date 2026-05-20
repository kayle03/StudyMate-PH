import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateSummary(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert academic assistant for Filipino college students. 
      Summarize the following study notes in a clear, concise, and structured way (using bullet points). 
      Make it tailored for a student's quick review. Use 'Taglish' where appropriate to sound helpful and natural.
      
      Notes:
      ${text}`,
      config: {
          temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Summary Error:", error);
    return "Pasensya na, failed to generate summary. Please try again later.";
  }
}

export async function generatePracticeQuestions(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following academic materials, generate 5 challenging practice questions with answers. 
      Format the output as a JSON array of objects with 'question' and 'answer' properties.
      Tailor them for Filipino college students.
      
      Materials:
      ${text}`,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Quiz Error:", error);
    return [];
  }
}
