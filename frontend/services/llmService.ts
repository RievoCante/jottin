// Service to call backend AI endpoints
import { Note } from '../types';
import { db } from './database';

class LLMService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  }

  private async getSettings() {
    const settings = await db.settings.get('sync-settings');
    return {
      provider: settings?.aiProvider || 'gemini',
      apiKey: settings?.aiApiKey || '',
    };
  }

  async getChatResponse(prompt: string, contextNotes: Note[]): Promise<string> {
    try {
      const { provider, apiKey } = await this.getSettings();

      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          provider,
          prompt,
          contextNotes,
        }),
      });

      if (!response.ok) {
        // Try to get error message from response
        try {
          const errorData = await response.json();
          if (errorData.error) {
            return `Error: ${errorData.error}`;
          }
        } catch (e) {
          // If parsing fails, fall through to generic error
        }

        if (response.status === 429) {
          return "API quota exceeded. Please check your API key's usage limits and try again later.";
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error getting chat response:', error);
      if (error instanceof Error && error.message.includes('quota')) {
        return "API quota exceeded. Please check your API key's usage limits and try again later.";
      }
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
      const { provider, apiKey } = await this.getSettings();

      if (!apiKey) {
        console.warn('API key not configured for finding relevant notes');
        return [];
      }

      const response = await fetch(`${this.baseUrl}/api/notes/relevant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          provider,
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
      const { provider, apiKey } = await this.getSettings();

      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const response = await fetch(`${this.baseUrl}/api/notes/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          provider,
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

  async validateApiKey(
    provider: string,
    apiKey: string
  ): Promise<{ valid: boolean; error?: string; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          apiKey,
        }),
      });

      if (!response.ok) {
        return { valid: false, error: 'Failed to validate API key' };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating API key:', error);
      return { valid: false, error: 'Network error during validation' };
    }
  }
}

const llmService = new LLMService();
export default llmService;
