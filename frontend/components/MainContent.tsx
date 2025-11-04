import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
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
} from '@fortawesome/free-solid-svg-icons';
import useLiveTranscription from '../hooks/useLiveTranscription';
import Tooltip from './Tooltip';

interface MainContentProps {
  note: Note;
  onNoteChange: (noteId: string, updates: Partial<Omit<Note, 'id'>>) => void;
  createNewNote: (content: string, title?: string) => void;
  onCleanUp: (note: Note) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onGoHome: () => void;
}

const MainContent: React.FC<MainContentProps> = ({
  note,
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
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleCleanUpClick = () => {
    onCleanUp(note);
    setIsMenuOpen(false);
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
    <div className="flex-1 flex flex-col bg-[#1E1E1E]">
      <div className="flex items-center justify-between border-b border-gray-700 px-2 h-12 shrink-0 text-sm">
        <div className="flex items-center">
          <button
            onClick={onGoHome}
            title="Home"
            className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700/80 transition-colors"
          >
            <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
            <span>Home</span>
          </button>
          <div className="w-px h-5 bg-gray-700 mx-1"></div>
        </div>
        <div className="flex-1 flex items-center min-w-0">
          <div className="flex items-center font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-md border border-b-0 border-gray-600 rounded-b-none relative -bottom-px">
            <span className="truncate">{note.title}</span>
          </div>
        </div>

        <div className="flex items-center">
          <Tooltip text="Close">
            <button className="p-2 rounded hover:bg-gray-700">
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 pt-6 flex flex-col relative max-w-4xl mx-auto w-full px-8">
        <div className="flex justify-between items-center mb-4 text-gray-400">
          <span className="text-sm"># Organize</span>
          <div className="flex items-center gap-1 relative">
            <Tooltip text={isRecording ? 'Stop Recording' : 'Start Recording'}>
              <button
                onClick={handleToggleRecording}
                className="p-2 rounded-full hover:bg-gray-700"
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
                onClick={() => onCleanUp(note)}
                className="p-2 rounded-full hover:bg-gray-700"
              >
                <FontAwesomeIcon
                  icon={faWandMagicSparkles}
                  className="w-5 h-5"
                />
              </button>
            </Tooltip>
            <Tooltip text={note.isPinned ? 'Unpin Note' : 'Pin Note'}>
              <button
                onClick={onTogglePin}
                className="p-2 rounded-full hover:bg-gray-700"
              >
                <FontAwesomeIcon
                  icon={faBookmark}
                  className={`w-5 h-5 transition-colors ${note.isPinned ? 'text-indigo-400' : ''}`}
                />
              </button>
            </Tooltip>
            <Tooltip text="More Actions">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full hover:bg-gray-700"
              >
                <FontAwesomeIcon icon={faEllipsis} className="w-5 h-5" />
              </button>
            </Tooltip>
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-2 w-56 bg-[#2F2F2F] rounded-lg shadow-xl z-10 border border-gray-700 text-sm"
              >
                <div className="p-2">
                  <p className="px-2 py-1 text-xs text-gray-400">
                    Magic Actions
                  </p>
                  <button
                    onClick={handleCleanUpClick}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-600 text-gray-200"
                  >
                    <FontAwesomeIcon
                      icon={faWandMagicSparkles}
                      className="w-4 h-4"
                    />{' '}
                    Clean Up
                  </button>
                </div>
                <div className="p-2 border-t border-gray-600/50">
                  <p className="px-2 py-1 text-xs text-gray-400">
                    Note Actions
                  </p>
                  <button
                    onClick={handlePinClick}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-600 text-gray-200"
                  >
                    <FontAwesomeIcon icon={faBookmark} className="w-4 h-4" />{' '}
                    {note.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-red-500/20 text-red-400"
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
            className="text-3xl font-bold text-white bg-transparent focus:outline-none w-full mb-4"
            placeholder="Untitled Note"
          />
          <textarea
            value={content}
            onChange={handleContentChange}
            className="w-full h-full flex-1 bg-transparent text-gray-300 placeholder-gray-500 resize-none focus:outline-none text-base leading-relaxed"
            placeholder="Start writing your note here..."
          />
          {isRecording && (
            <div className="mt-4 text-red-400 animate-pulse">Recording...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainContent;
