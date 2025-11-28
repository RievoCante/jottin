import React, { useState, useEffect } from 'react';
import { Note, ChatMessage } from '../../types';
import llmService from '../../services/llmService';
import { SignedIn } from '@clerk/clerk-react';
import { db } from '../../services/database';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faArrowUp,
  faPlus,
  faFileLines,
} from '@fortawesome/free-solid-svg-icons';
import RequireAuthNotice from '../ui/RequireAuthNotice';
import Markdown from 'react-markdown';

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

interface HeadsUpProps {
  notesContext: Note[];
  activeNote: Note | null;
  relevantNotes: Note[];
  _isLoading?: boolean;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onSelectNote?: (noteId: string) => void;
}

const HeadsUp: React.FC<HeadsUpProps> = ({
  notesContext,
  activeNote,
  relevantNotes,
  _isLoading,
  width,
  onResizeStart,
  onOpenSettings,
  onSelectNote,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: 'default', title: 'New Chat', messages: [] },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [userInput, setUserInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAIConfigured, setIsAIConfigured] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId)!;

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
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [],
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };

  const closeSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      // If closing the last session, just reset it
      setSessions([{ id: 'default', title: 'New Chat', messages: [] }]);
      setActiveSessionId('default');
      return;
    }

    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(newSessions[newSessions.length - 1].id);
    }
  };

  const updateSessionMessages = (
    sessionId: string,
    messages: ChatMessage[]
  ) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id === sessionId) {
          // Update title based on first user message if it's "New Chat"
          let title = s.title;
          if (s.title === 'New Chat' && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.sender === 'user');
            if (firstUserMsg) {
              title =
                firstUserMsg.text.slice(0, 20) +
                (firstUserMsg.text.length > 20 ? '...' : '');
            }
          }
          return { ...s, messages, title };
        }
        return s;
      })
    );
  };

  const submitQuery = async (query: string) => {
    if (!query.trim() || isChatLoading) return;

    const currentSessionId = activeSessionId;
    const newUserMessage: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    const currentMessages =
      sessions.find(s => s.id === currentSessionId)?.messages || [];
    const updatedMessages = [...currentMessages, newUserMessage];
    updateSessionMessages(currentSessionId, updatedMessages);

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

      // Get fresh messages in case state changed
      const freshSession = sessions.find(s => s.id === currentSessionId);
      if (freshSession) {
        updateSessionMessages(currentSessionId, [
          ...freshSession.messages,
          newAiMessage,
        ]);
      } else {
        // Session might have been closed, but we should probably still update if we can find it in current state ref (not using ref here though)
        // For now, just update using the state setter to be safe
        setSessions(prev =>
          prev.map(s => {
            if (s.id === currentSessionId) {
              return { ...s, messages: [...s.messages, newAiMessage] };
            }
            return s;
          })
        );
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      const errorMessage: ChatMessage = {
        id: `chat-${Date.now() + 1}`,
        sender: 'ai',
        text: 'Sorry, I ran into an error.',
      };
      setSessions(prev =>
        prev.map(s => {
          if (s.id === currentSessionId) {
            return { ...s, messages: [...s.messages, errorMessage] };
          }
          return s;
        })
      );
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

  const LinkRenderer = (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement>
  ) => {
    const { href, children } = props;
    if (href?.startsWith('note:')) {
      const noteId = href.replace('note:', '');
      return (
        <button
          onClick={() => onSelectNote?.(noteId)}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1 align-baseline"
        >
          <FontAwesomeIcon icon={faFileLines} className="w-3 h-3" />
          {children}
        </button>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {children}
      </a>
    );
  };

  return (
    <aside
      className="bg-gray-50 dark:bg-black border-l border-gray-200 dark:border-gray-800 flex flex-col relative h-screen w-full lg:w-auto overflow-hidden"
      style={{ width: window.innerWidth >= 1024 ? `${width}px` : '100%' }}
    >
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize z-10 hidden lg:block"
      />

      {/* Tabs Header */}
      <div className="flex items-center bg-gray-100 dark:bg-[#121212] border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => setActiveSessionId(session.id)}
            className={`
              group flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer min-w-[120px] max-w-[200px] border-r border-gray-200 dark:border-gray-800 select-none
              ${
                activeSessionId === session.id
                  ? 'bg-white dark:bg-black text-indigo-600 dark:text-indigo-400 border-b-2 border-b-indigo-600 dark:border-b-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }
            `}
          >
            <span className="truncate flex-1">{session.title}</span>
            <button
              onClick={e => closeSession(e, session.id)}
              className={`
                p-0.5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity
                ${activeSessionId === session.id ? 'opacity-100' : ''}
              `}
            >
              <FontAwesomeIcon icon={faPlus} className="w-3 h-3 rotate-45" />
            </button>
          </div>
        ))}
        <button
          onClick={createNewSession}
          className="px-3 py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="New Chat"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Area */}
        <SignedIn>
          <>
            <div className="flex-1 p-4 flex flex-col overflow-y-auto">
              {activeSession.messages.length === 0 && !isChatLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                    <FontAwesomeIcon
                      icon={faWandMagicSparkles}
                      className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                  <p className="text-gray-900 dark:text-gray-200 font-semibold mb-2">
                    How can I help with your notes?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    Ask questions, summarize content, or get creative ideas
                    based on your notes.
                  </p>

                  <div className="mt-8 space-y-2 w-full max-w-xs">
                    <button
                      onClick={() =>
                        handleSuggestionClick('Summarize this note')
                      }
                      className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg w-full transition-colors text-left"
                    >
                      Summarize this note
                    </button>
                    <button
                      onClick={() =>
                        handleSuggestionClick('What are the key takeaways?')
                      }
                      className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg w-full transition-colors text-left"
                    >
                      What are the key takeaways?
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {activeSession.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full shrink-0 flex items-center justify-center mt-1">
                          <FontAwesomeIcon
                            icon={faWandMagicSparkles}
                            className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.sender === 'ai' ? (
                          <div className="markdown-body">
                            <Markdown
                              components={{
                                a: LinkRenderer,
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-4 mb-2">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-4 mb-2">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="mb-1">{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold">
                                    {children}
                                  </strong>
                                ),
                              }}
                            >
                              {msg.text}
                            </Markdown>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full shrink-0 flex items-center justify-center mt-1">
                        <FontAwesomeIcon
                          icon={faWandMagicSparkles}
                          className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse"
                        />
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Context & Input Area */}
            <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
              {/* Compact Related Notes (Horizontal Scroll) */}
              {relevantNotes.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-3 px-4 no-scrollbar border-b border-gray-100 dark:border-gray-900">
                  <div className="flex-shrink-0 flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">
                    Related:
                  </div>
                  {relevantNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote?.(note.id)}
                      className="flex-shrink-0 max-w-[160px] bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-md px-3 py-1.5 cursor-pointer transition-colors group"
                    >
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {note.title || 'Untitled'}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate mt-0.5">
                        {note.content.substring(0, 30)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4">
                {!isAIConfigured ? (
                  <div className="text-center py-2">
                    <button
                      onClick={onOpenSettings}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Configure AI to start chatting
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="relative">
                    <input
                      type="text"
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="w-full bg-gray-100 dark:bg-[#1E1E1E] border-0 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-gray-900 dark:text-gray-300 placeholder-gray-500"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                      disabled={isChatLoading || !userInput.trim()}
                    >
                      <FontAwesomeIcon
                        icon={faArrowUp}
                        className="w-3 h-3 text-white"
                      />
                    </button>
                  </form>
                )}
                <div className="text-center mt-2">
                  <p className="text-[10px] text-gray-400 dark:text-gray-600">
                    AI can make mistakes. Check important info.
                  </p>
                </div>
              </div>
            </div>
          </>
        </SignedIn>

        <RequireAuthNotice
          message="Sign in to use AI Chat"
          buttonText="Sign in"
          className="flex-1 m-4 flex flex-col items-center justify-center text-center space-y-4"
        />
      </div>
    </aside>
  );
};

export default HeadsUp;
