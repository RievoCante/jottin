import React, { useState, useRef, useEffect } from 'react';
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
import Settings from './Settings';

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
}) => {
  const [isNotesVisible, setIsNotesVisible] = useState(true);
  const [isCollectionsVisible, setIsCollectionsVisible] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
          <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-[#1E1E1E] rounded-lg shadow-2xl z-50 border border-gray-200 dark:border-gray-700 text-sm">
            {/* Profile Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-300 rounded-lg flex items-center justify-center font-bold text-black text-lg">
                  R
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Ravit Chutivisuth
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    putter.ravit@gmail.com
                  </div>
                </div>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                  Free
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <button
                onClick={handleExportNotes}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faUpload} className="w-5 h-5" />
                <span>{isExporting ? 'Exporting...' : 'Export notes'}</span>
              </button>

              <button
                onClick={handleImportNotes}
                disabled={isImporting}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faDownload} className="w-5 h-5" />
                <span>{isImporting ? 'Importing...' : 'Import notes'}</span>
              </button>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
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

              <button
                onClick={() => {
                  setIsSettingsOpen(true);
                  setIsProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                <FontAwesomeIcon icon={faGear} className="w-5 h-5" />
                <span>Settings</span>
              </button>

              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
                <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />
                <span>Trash</span>
              </button>

              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
                <FontAwesomeIcon
                  icon={faRightFromBracket}
                  className="w-5 h-5"
                />
                <span>Sign out</span>
              </button>
            </div>

            {/* Last Synced */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
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

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        collections={collections}
        onSyncStatusChange={onSyncStatusChange}
      />
    </aside>
  );
};

export default Sidebar;
