import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { Note } from '../types';

class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error('API_KEY environment variable not set');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getChatResponse(prompt: string, contextNotes: Note[]): Promise<string> {
    const context = contextNotes
      .map(note => `Title: ${note.title}\nContent: ${note.content}`)
      .join('\n\n---\n\n');
    const fullPrompt = `Based on the following notes, answer the user's question. \n\nNOTES:\n${context}\n\nQUESTION:\n${prompt}`;

    try {
      const response: GenerateContentResponse =
        await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
        });
      return response.text;
    } catch (error) {
      console.error('Error getting chat response:', error);
      return "Sorry, I couldn't process your request right now.";
    }
  }

  async findRelevantNotes(
    currentContent: string,
    allNotes: Note[]
  ): Promise<Note[]> {
    if (!currentContent.trim() || allNotes.length === 0) {
      return [];
    }

    const noteSummaries = allNotes.map(n => ({
      id: n.id,
      title: n.title,
      contentSnippet: n.content.substring(0, 200),
    }));

    const prompt = `
      Current Note Content:
      ---
      ${currentContent}
      ---
      
      Available Notes:
      ---
      ${JSON.stringify(noteSummaries)}
      ---
      
      Based on the "Current Note Content", identify the top 3 most relevant notes from the "Available Notes" list. 
      Your response must be a JSON object with a single key "relevantNoteIds" which is an array of the IDs of the most relevant notes, ordered by relevance.
      Example response: {"relevantNoteIds": ["note-3", "note-1", "note-5"]}
    `;

    try {
      const response: GenerateContentResponse =
        await this.ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                relevantNoteIds: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                  },
                },
              },
            },
          },
        });

      const jsonString = response.text.trim();
      const result = JSON.parse(jsonString);

      if (
        result &&
        result.relevantNoteIds &&
        Array.isArray(result.relevantNoteIds)
      ) {
        const relevantIds = result.relevantNoteIds as string[];
        return relevantIds
          .map(id => allNotes.find(note => note.id === id))
          .filter((n): n is Note => n !== undefined);
      }
      return [];
    } catch (error) {
      console.error('Error finding relevant notes:', error);
      return [];
    }
  }

  async cleanUpNote(content: string): Promise<string> {
    const prompt = `You are an expert note organizer. Clean up and structure the following note. 
    Fix any spelling and grammar mistakes. 
    Format it with clear markdown, using bullet points, bolding for headers, and other elements to improve readability. 
    Do not add any new information, only reformat and correct the existing content.
    Return only the cleaned-up note content, without any introductory text like "Here is the cleaned-up note:".

    Original Note:
    ---
    ${content}
    ---
    `;

    try {
      const response: GenerateContentResponse =
        await this.ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
        });
      return response.text;
    } catch (error) {
      console.error('Error cleaning up note:', error);
      return content; // Return original content on error
    }
  }
}

const geminiService = new GeminiService();
export default geminiService;
