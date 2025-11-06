import React, { useState, useRef, useEffect } from 'react';
import { Note, Collection } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faBookmark,
  faChevronDown,
  faUpload,
  faMoon,
  faGear,
  faTrash,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  collections: Collection[];
  notes: Note[];
  activeNoteId?: string;
  activeCollectionId: string | null;
  onNoteSelect: (note: Note) => void;
  onCollectionSelect: (collectionId: string | null) => void;
  onCreateNote: () => void;
}

const INITIAL_NOTE_LIMIT = 3;
const INITIAL_COLLECTION_LIMIT = 5;

const Sidebar: React.FC<SidebarProps> = ({
  collections,
  notes,
  activeNoteId,
  activeCollectionId,
  onNoteSelect,
  onCollectionSelect,
  onCreateNote,
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const pinnedNotes = notes.filter(n => n.isPinned);
  const allNotesExceptPinned = notes.filter(n => !n.isPinned);

  const notesToShow = isNotesExpanded
    ? allNotesExceptPinned
    : allNotesExceptPinned.slice(0, INITIAL_NOTE_LIMIT);
  const collectionsToShow = isCollectionsExpanded
    ? collections
    : collections.slice(0, INITIAL_COLLECTION_LIMIT);

  const handleCollectionClick = (collectionId: string) => {
    if (collectionId === activeCollectionId) {
      onCollectionSelect(null); // Deselect if the same collection is clicked
    } else {
      onCollectionSelect(collectionId);
    }
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get last sync time
  const getLastSyncTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <aside className="w-72 bg-gray-50 dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 flex flex-col p-3 text-sm">
      <div className="relative mb-4" ref={menuRef}>
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center gap-2 p-2 w-full rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 bg-pink-300 rounded-lg flex items-center justify-center font-bold text-black">
            R
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            Ravit Chutivisuth
          </span>
        </button>

        {isProfileMenuOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-2xl z-50 border border-gray-200 text-sm">
            {/* Profile Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-300 rounded-lg flex items-center justify-center font-bold text-black text-lg">
                  R
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    Ravit Chutivisuth
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    putter.ravit@gmail.com
                  </div>
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                  Free
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors">
                <FontAwesomeIcon icon={faUpload} className="w-5 h-5" />
                <span>Import notes</span>
              </button>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faMoon} className="w-5 h-5" />
                  <span>Dark mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                      theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                    onClick={e => {
                      e.stopPropagation();
                      toggleTheme();
                    }}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}
                    />
                  </div>
                </div>
              </button>

              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors">
                <FontAwesomeIcon icon={faGear} className="w-5 h-5" />
                <span>Settings</span>
              </button>

              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors">
                <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />
                <span>Trash</span>
              </button>

              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 text-gray-700 transition-colors">
                <FontAwesomeIcon
                  icon={faRightFromBracket}
                  className="w-5 h-5"
                />
                <span>Sign out</span>
              </button>
            </div>

            {/* Last Synced */}
            <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
              Last synced at {getLastSyncTime()}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onCreateNote}
        className="flex items-center justify-center gap-2 w-full text-left p-2 rounded-md bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors mb-4 font-semibold text-gray-900 dark:text-gray-300"
      >
        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
        <span>Create Note</span>
      </button>

      <div className="flex-1 overflow-y-auto pr-1">
        {pinnedNotes.length > 0 && (
          <div className="mb-4">
            <h3 className="flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 font-semibold">
              <FontAwesomeIcon icon={faBookmark} className="w-4 h-4" />
              <span>Pinned</span>
            </h3>
            <ul>
              {pinnedNotes.map(note => (
                <li key={note.id}>
                  <button
                    onClick={() => onNoteSelect(note)}
                    className={`w-full text-left p-2 rounded-md truncate ${
                      activeNoteId === note.id
                        ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-900 dark:text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-300'
                    }`}
                  >
                    {note.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={() => onCollectionSelect(null)}
            className={`w-full text-left flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 font-semibold rounded-md ${
              activeCollectionId === null
                ? 'bg-gray-200 dark:bg-gray-700/50 text-gray-900 dark:text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
            <span>Notes</span>
          </button>
          <ul>
            {notesToShow.map(note => (
              <li key={note.id}>
                <button
                  onClick={() => onNoteSelect(note)}
                  className={`w-full text-left p-2 rounded-md truncate ${
                    activeNoteId === note.id
                      ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-900 dark:text-white'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-300'
                  }`}
                >
                  {note.title}
                </button>
              </li>
            ))}
            {!isNotesExpanded &&
              allNotesExceptPinned.length > INITIAL_NOTE_LIMIT && (
                <li>
                  <button
                    onClick={() => setIsNotesExpanded(true)}
                    className="w-full text-left p-2 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    See All
                  </button>
                </li>
              )}
          </ul>
        </div>

        <div>
          <h3 className="flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 font-semibold">
            <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
            <span>Collections</span>
          </h3>
          <ul>
            {collectionsToShow.map(collection => (
              <li key={collection.id}>
                <button
                  onClick={() => handleCollectionClick(collection.id)}
                  className={`w-full text-left p-2 rounded-md flex items-center gap-2 ${
                    activeCollectionId === collection.id
                      ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-900 dark:text-white'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-300'
                  }`}
                >
                  <span>{collection.icon}</span>
                  <span className="truncate">{collection.name}</span>
                </button>
              </li>
            ))}
            {!isCollectionsExpanded &&
              collections.length > INITIAL_COLLECTION_LIMIT && (
                <li>
                  <button
                    onClick={() => setIsCollectionsExpanded(true)}
                    className="w-full text-left p-2 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    See All
                  </button>
                </li>
              )}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
