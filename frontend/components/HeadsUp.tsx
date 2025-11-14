import React, { useState, useRef, useEffect } from 'react';
import { Note, ChatMessage } from '../types';
import llmService from '../services/llmService';
import { db } from '../services/database';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faArrowUp,
  faPlus,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

interface HeadsUpProps {
  notesContext: Note[];
  activeNote: Note | null;
  relevantNotes: Note[];
  isLoading: boolean;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  onOpenSettings: () => void;
}

const HeadsUp: React.FC<HeadsUpProps> = ({
  notesContext,
  activeNote,
  relevantNotes,
  isLoading,
  width,
  onResizeStart,
  onOpenSettings,
}) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAIConfigured, setIsAIConfigured] = useState(false);
  const [aiProvider, setAiProvider] = useState<
    'gemini' | 'openai' | 'ollama' | undefined
  >(undefined);

  useEffect(() => {
    checkAIConfiguration();

    // Re-check periodically to detect when settings are saved
    const interval = setInterval(checkAIConfiguration, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkAIConfiguration = async () => {
    const settings = await db.settings.get('sync-settings');
    const hasProvider =
      settings?.aiProvider === 'gemini' || settings?.aiProvider === 'openai';
    const hasKey = !!settings?.aiApiKey;
    setIsAIConfigured(hasProvider && hasKey);
    setAiProvider(settings?.aiProvider);
  };

  const submitQuery = async (query: string) => {
    if (!query.trim() || isChatLoading) return;

    const newUserMessage: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: 'user',
      text: query,
    };
    setChatHistory(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsChatLoading(true);

    try {
      const aiResponse = await llmService.getChatResponse(
        query,
        activeNote ? [activeNote, ...notesContext] : notesContext
      );
      const newAiMessage: ChatMessage = {
        id: `chat-${Date.now() + 1}`,
        sender: 'ai',
        text: aiResponse,
      };
      setChatHistory(prev => [...prev, newAiMessage]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorMessage: ChatMessage = {
        id: `chat-${Date.now() + 1}`,
        sender: 'ai',
        text: 'Sorry, I ran into an error.',
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(userInput);
  };

  const handleSuggestionClick = (suggestion: string) => {
    submitQuery(suggestion);
  };

  const showHeadsUpContent = isLoading || relevantNotes.length > 0;

  return (
    <aside
      className="bg-gray-50 dark:bg-black border-l border-gray-200 dark:border-gray-800 flex flex-col relative h-screen w-full lg:w-auto overflow-y-auto"
      style={{ width: window.innerWidth >= 1024 ? `${width}px` : '100%' }}
    >
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize z-10 hidden lg:block"
      />

      {showHeadsUpContent && (
        <div className="p-4 space-y-4">
          {isLoading && (
            <div className="p-3 bg-gray-200 dark:bg-gray-800/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              Searching for relevant notes...
            </div>
          )}
          {!isLoading && relevantNotes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Related Notes
              </h3>
              {relevantNotes.map(note => (
                <div
                  key={note.id}
                  className="p-3 bg-gray-200 dark:bg-gray-800/50 rounded-lg"
                >
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {note.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={`flex-1 flex flex-col ${showHeadsUpContent ? 'border-t border-gray-200 dark:border-gray-800' : ''}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              AI Chat Bot
            </h2>
            {isAIConfigured && aiProvider && (
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                {aiProvider === 'gemini'
                  ? 'Gemini'
                  : aiProvider === 'openai'
                    ? 'OpenAI'
                    : 'Ollama'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
            </button>
            <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faClock} className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col overflow-y-auto">
          {chatHistory.length === 0 && !isChatLoading ? (
            <div className="flex-1 flex flex-col items-center justify-start pt-8 text-center">
              <button className="text-sm flex items-center gap-2 mb-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3" /> Resume
                last Chat
              </button>
              <p className="text-gray-900 dark:text-gray-200 font-semibold mb-3">
                Ask about your notes
              </p>
              <div className="space-y-2 w-full max-w-xs">
                <button
                  onClick={() =>
                    handleSuggestionClick(
                      'What should I follow up on from this week?'
                    )
                  }
                  className="text-sm bg-gray-200 dark:bg-[#1E1E1E] hover:bg-gray-300 dark:hover:bg-gray-700/80 text-gray-900 dark:text-gray-300 px-4 py-2 rounded-lg w-full transition-colors border border-gray-300 dark:border-gray-700"
                >
                  What should I follow up on from this week?
                </button>
                <button
                  onClick={() =>
                    handleSuggestionClick(
                      'Give me an overview of my last 14 days'
                    )
                  }
                  className="text-sm bg-gray-200 dark:bg-[#1E1E1E] hover:bg-gray-300 dark:hover:bg-gray-700/80 text-gray-900 dark:text-gray-300 px-4 py-2 rounded-lg w-full transition-colors border border-gray-300 dark:border-gray-700"
                >
                  Give me an overview of my last 14 days
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-6 h-6 bg-indigo-500 rounded-full shrink-0 flex items-center justify-center">
                      <FontAwesomeIcon
                        icon={faWandMagicSparkles}
                        className="w-4 h-4 text-white"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-xs p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-300'}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 bg-indigo-500 rounded-full shrink-0 flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faWandMagicSparkles}
                      className="w-4 h-4 text-white"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {!isAIConfigured ? (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Configure your AI provider to start chatting
              </p>
              <div className="space-y-2">
                <button
                  onClick={onOpenSettings}
                  className="block w-full p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  1. Add your API key
                </button>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg opacity-50 cursor-not-allowed text-sm text-gray-600 dark:text-gray-400">
                  2. Download Ollama (Coming soon)
                </div>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg opacity-50 cursor-not-allowed text-sm text-gray-600 dark:text-gray-400">
                  3. Subscribe to Jottin Pro (Coming soon)
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="relative">
              <FontAwesomeIcon
                icon={faPlus}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="Tell or ask Mem something"
                className="w-full bg-gray-100 dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-700 rounded-full pl-11 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 dark:text-gray-300"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gray-400 dark:bg-gray-600 rounded-full hover:bg-indigo-600 dark:hover:bg-indigo-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
                disabled={isChatLoading || !userInput.trim()}
              >
                <FontAwesomeIcon
                  icon={faArrowUp}
                  className="w-4 h-4 text-white"
                />
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
};

export default HeadsUp;
