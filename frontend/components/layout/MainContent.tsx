import React, { useState, useEffect, useRef } from 'react';
import { Note, Collection } from '../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone,
  faCircleStop,
  faWandMagicSparkles,
  faBookmark,
  faEllipsis,
  faTrash,
  faHouse,
  faXmark,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import useLiveTranscription from '../../hooks/useLiveTranscription';
import Tooltip from '../ui/Tooltip';

interface MainContentProps {
  note: Note;
  collections: Collection[];
  onNoteChange: (noteId: string, updates: Partial<Omit<Note, 'id'>>) => void;
  createNewNote: (content: string, title?: string) => void;
  onCleanUp: (note: Note) => Promise<string>;
  onTogglePin: () => void;
  onDelete: () => void;
  onGoHome: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  note,
  collections,
  onNoteChange,
  createNewNote,
  onCleanUp,
  onTogglePin,
  onDelete,
  onGoHome,
}) => {
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanedContent, setCleanedContent] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const organizeRef = useRef<HTMLDivElement>(null);

  const { isRecording, transcript, startRecording, stopRecording } =
    useLiveTranscription();

  useEffect(() => {
    setContent(note.content);
    setTitle(note.title);
  }, [note.id, note.content, note.title]);

  useEffect(() => {
    if (transcript) {
      setContent(prev => (prev ? `${prev}\n${transcript}` : transcript));
      onNoteChange(note.id, {
        content: content ? `${content}\n${transcript}` : transcript,
      });
    }
  }, [transcript]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (
        organizeRef.current &&
        !organizeRef.current.contains(event.target as Node)
      ) {
        setIsOrganizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onNoteChange(note.id, { content: newContent });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onNoteChange(note.id, { title: newTitle });
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCleanUpClick = async () => {
    setIsMenuOpen(false);
    setIsCleaningUp(true);

    try {
      const cleaned = await onCleanUp(note);
      setCleanedContent(cleaned);
    } catch (error) {
      console.error('Failed to clean up note:', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleAcceptCleanup = () => {
    if (cleanedContent) {
      setContent(cleanedContent);
      onNoteChange(note.id, { content: cleanedContent });
      setCleanedContent(null);
    }
  };

  const handleRefineCleanup = async () => {
    if (cleanedContent) {
      setIsCleaningUp(true);
      try {
        const refined = await onCleanUp({ ...note, content: cleanedContent });
        setCleanedContent(refined);
      } catch (error) {
        console.error('Failed to refine note:', error);
      } finally {
        setIsCleaningUp(false);
      }
    }
  };

  const handleDiscardCleanup = () => {
    setCleanedContent(null);
  };

  const handleCollectionToggle = (collectionId: string) => {
    const currentIds =
      note.collectionIds || (note.collectionId ? [note.collectionId] : []);
    const newIds = currentIds.includes(collectionId)
      ? currentIds.filter(id => id !== collectionId)
      : [...currentIds, collectionId];

    onNoteChange(note.id, {
      collectionIds: newIds.length > 0 ? newIds : undefined,
      collectionId: undefined, // Clear legacy field
    });
  };

  const handlePinClick = () => {
    onTogglePin();
    setIsMenuOpen(false);
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDelete();
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#1E1E1E]">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-2 h-12 shrink-0 text-sm">
        <div className="flex items-center">
          <button
            onClick={onGoHome}
            title="Home"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/80 transition-colors text-gray-900 dark:text-gray-300"
          >
            <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
            <span>Home</span>
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        </div>
        <div className="flex-1 flex items-center min-w-0">
          <div className="flex items-center font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-3 py-1.5 rounded-md border border-b-0 border-gray-300 dark:border-gray-600 rounded-b-none relative -bottom-px">
            <span className="truncate">{note.title}</span>
          </div>
        </div>

        <div className="flex items-center">
          <Tooltip text="Close">
            <button
              onClick={onGoHome}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 pt-6 flex flex-col relative max-w-4xl mx-auto w-full px-8">
        <div className="flex justify-between items-center mb-4 text-gray-500 dark:text-gray-400">
          <div className="relative" ref={organizeRef}>
            <button
              onClick={() => setIsOrganizeOpen(!isOrganizeOpen)}
              className="text-sm flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {(() => {
                const selectedIds =
                  note.collectionIds ||
                  (note.collectionId ? [note.collectionId] : []);
                const selectedCollections = collections.filter(c =>
                  selectedIds.includes(c.id)
                );

                if (selectedCollections.length === 0) {
                  return <span># Organize</span>;
                }

                return (
                  <div className="flex items-center gap-2">
                    {selectedCollections.map(c => (
                      <span
                        key={c.id}
                        className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded"
                      >
                        {c.icon} {c.name}
                      </span>
                    ))}
                  </div>
                );
              })()}
              <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
            </button>

            {isOrganizeOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  Select collections
                </div>
                {collections.map(collection => {
                  const selectedIds =
                    note.collectionIds ||
                    (note.collectionId ? [note.collectionId] : []);
                  const isSelected = selectedIds.includes(collection.id);

                  return (
                    <button
                      key={collection.id}
                      onClick={() => handleCollectionToggle(collection.id)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                      />
                      <span>{collection.icon}</span>
                      <span>{collection.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 relative">
            <Tooltip text={isRecording ? 'Stop Recording' : 'Start Recording'}>
              <button
                onClick={handleToggleRecording}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {isRecording ? (
                  <FontAwesomeIcon
                    icon={faCircleStop}
                    className="w-5 h-5 text-red-500"
                  />
                ) : (
                  <FontAwesomeIcon icon={faMicrophone} className="w-5 h-5" />
                )}
              </button>
            </Tooltip>
            <Tooltip text="Clean Up Note">
              <button
                onClick={handleCleanUpClick}
                disabled={isCleaningUp}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon
                  icon={faWandMagicSparkles}
                  className={`w-5 h-5 ${isCleaningUp ? 'animate-spin' : ''}`}
                />
              </button>
            </Tooltip>
            <Tooltip text={note.isPinned ? 'Unpin Note' : 'Pin Note'}>
              <button
                onClick={onTogglePin}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <FontAwesomeIcon
                  icon={faBookmark}
                  className={`w-5 h-5 transition-colors ${note.isPinned ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                />
              </button>
            </Tooltip>
            <Tooltip text="More Actions">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <FontAwesomeIcon icon={faEllipsis} className="w-5 h-5" />
              </button>
            </Tooltip>
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#2F2F2F] rounded-lg shadow-xl z-10 border border-gray-200 dark:border-gray-700 text-sm"
              >
                <div className="p-2">
                  <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    Magic Actions
                  </p>
                  <button
                    onClick={handleCleanUpClick}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                  >
                    <FontAwesomeIcon
                      icon={faWandMagicSparkles}
                      className="w-4 h-4"
                    />{' '}
                    Clean Up
                  </button>
                </div>
                <div className="p-2 border-t border-gray-200 dark:border-gray-600/50">
                  <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    Note Actions
                  </p>
                  <button
                    onClick={handlePinClick}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                  >
                    <FontAwesomeIcon icon={faBookmark} className="w-4 h-4" />{' '}
                    {note.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" /> Trash
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col pb-8">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent focus:outline-none w-full mb-4"
            placeholder="Untitled Note"
          />

          {cleanedContent && (
            <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faWandMagicSparkles}
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                  />
                  <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                    Edited Note
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefineCleanup}
                    disabled={isCleaningUp}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <FontAwesomeIcon
                      icon={faWandMagicSparkles}
                      className="w-3 h-3"
                    />
                    Refine
                  </button>
                  <button
                    onClick={handleAcceptCleanup}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-gray-800 dark:bg-gray-700 rounded-md hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={handleDiscardCleanup}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-gray-900/50 p-4 rounded border border-indigo-100 dark:border-indigo-900 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200">
                  {cleanedContent}
                </pre>
              </div>
            </div>
          )}

          <textarea
            value={content}
            onChange={handleContentChange}
            disabled={!!cleanedContent}
            className="w-full h-full flex-1 bg-transparent text-gray-800 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none text-base leading-relaxed disabled:opacity-50"
            placeholder="Start writing your note here..."
          />
          {isRecording && (
            <div className="mt-4 text-red-500 dark:text-red-400 animate-pulse">
              Recording...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainContent;
