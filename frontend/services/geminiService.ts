// Service to call backend AI endpoints
import { Note } from '../types';

class GeminiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  }

  async getChatResponse(prompt: string, contextNotes: Note[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          contextNotes,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
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

    try {
      const response = await fetch(`${this.baseUrl}/api/notes/relevant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentContent,
          allNotes,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.relevantNotes || [];
    } catch (error) {
      console.error('Error finding relevant notes:', error);
      return [];
    }
  }

  async cleanUpNote(content: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notes/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.cleanedContent;
    } catch (error) {
      console.error('Error cleaning up note:', error);
      return content;
    }
  }
}

const geminiService = new GeminiService();
export default geminiService;
