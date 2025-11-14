import React, { useState, useRef, useEffect } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Note, Collection } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faBookmark,
  faChevronDown,
  faUpload,
  faDownload,
  faMoon,
  faGear,
  faTrash,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../contexts/ThemeContext';
import { fileSystemService } from '../services/fileSystemService';

interface SidebarProps {
  collections: Collection[];
  notes: Note[];
  activeNoteId?: string;
  activeCollectionId: string | null;
  onNoteSelect: (note: Note) => void;
  onCollectionSelect: (collectionId: string | null) => void;
  onCreateNote: () => void;
  onImportNotes?: (notes: Note[], collections: Collection[]) => void;
  onSyncStatusChange?: (enabled: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collections,
  notes,
  activeNoteId,
  activeCollectionId,
  onNoteSelect,
  onCollectionSelect,
  onCreateNote,
  onImportNotes,
  onSyncStatusChange,
  isSettingsOpen,
  setIsSettingsOpen,
}) => {
  const { user } = useUser();
  const [isNotesVisible, setIsNotesVisible] = useState(true);
  const [isCollectionsVisible, setIsCollectionsVisible] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const pinnedNotes = notes.filter(n => n.isPinned);
  const allNotesExceptPinned = notes.filter(n => !n.isPinned);

  const notesToShow = isNotesVisible ? allNotesExceptPinned.slice(0, 5) : [];
  const collectionsToShow = isCollectionsVisible ? collections.slice(0, 5) : [];

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

  const handleExportNotes = async () => {
    setIsExporting(true);
    try {
      const dirHandle = await fileSystemService.selectFolder();
      if (dirHandle) {
        const result = await fileSystemService.exportToFolder(
          notes,
          collections,
          dirHandle
        );
        alert(
          `Export complete!\n${result.success} notes exported successfully.\n${result.failed} notes failed.`
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = (error as Error).message;

      if (errorMessage?.startsWith('PROTECTED_FOLDER:')) {
        alert(
          '⚠️ Protected Folder\n\n' +
            errorMessage.replace('PROTECTED_FOLDER: ', '') +
            '\n\n💡 Tip: Create a new folder like "JottinNotes" in your desired location and select that instead.'
        );
      } else {
        alert('Failed to export notes. Please try again.');
      }
    } finally {
      setIsExporting(false);
      setIsProfileMenuOpen(false);
    }
  };

  const handleImportNotes = async () => {
    if (!onImportNotes) return;

    setIsImporting(true);
    try {
      const result = await fileSystemService.importFromFiles();

      if (result.notes.length > 0) {
        onImportNotes(result.notes, result.collections);
        alert(
          `✅ Import complete!\n\n${result.notes.length} note${result.notes.length > 1 ? 's' : ''} imported successfully.`
        );
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import notes. Please try again.');
    } finally {
      setIsImporting(false);
      setIsProfileMenuOpen(false);
    }
  };

  return (
    <aside className="w-80 lg:w-72 h-screen bg-gray-50 dark:bg-[#111111] border-r border-gray-200 dark:border-gray-800 flex flex-col p-3 text-sm overflow-y-auto">
      {/* User Profile with Clerk */}
      <div className="mb-4 p-3 rounded-lg bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-10 h-10',
                userButtonPopoverCard: 'shadow-xl',
              },
            }}
            afterSignOutUrl="/"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <FontAwesomeIcon
            icon={faGear}
            className="w-4 h-4 text-gray-600 dark:text-gray-400"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Settings
          </span>
        </button>
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
            onClick={() => setIsNotesVisible(!isNotesVisible)}
            className="w-full text-left flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 font-semibold rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`w-4 h-4 transition-transform ${!isNotesVisible ? '-rotate-90' : ''}`}
            />
            <span>Notes</span>
          </button>
          {isNotesVisible && (
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
            </ul>
          )}
        </div>

        <div>
          <button
            onClick={() => setIsCollectionsVisible(!isCollectionsVisible)}
            className="w-full text-left flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 font-semibold rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`w-4 h-4 transition-transform ${!isCollectionsVisible ? '-rotate-90' : ''}`}
            />
            <span>Collections</span>
          </button>
          {isCollectionsVisible && (
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
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
