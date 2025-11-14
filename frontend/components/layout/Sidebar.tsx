import React, { useState, useRef, useEffect } from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  useAuth,
} from '@clerk/clerk-react';
import { Note, Collection } from '../../types';
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
import { useTheme } from '../../contexts/ThemeContext';
import { fileSystemService } from '../../services/fileSystemService';

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
  const { signOut } = useAuth();
  const [isNotesVisible, setIsNotesVisible] = useState(true);
  const [isCollectionsVisible, setIsCollectionsVisible] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const pinnedNotes = notes.filter(n => n.isPinned);
  const allNotesExceptPinned = notes.filter(n => !n.isPinned);

  const sortByDateDesc = (a: Note, b: Note) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();

  const sortedPinnedNotes = [...pinnedNotes].sort(sortByDateDesc);
  const sortedNotes = [...allNotesExceptPinned].sort(sortByDateDesc);

  const notesToShow = isNotesVisible ? sortedNotes.slice(0, 5) : [];
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
      {/* User Profile */}
      <div className="mb-4">
        <SignedIn>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(prev => !prev)}
              className="w-full p-3 rounded-xl border border-transparent hover:border-indigo-500/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 flex items-center gap-3 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-200 dark:bg-indigo-700 flex items-center justify-center text-indigo-900 dark:text-white text-lg font-semibold">
                {(
                  user?.fullName ||
                  user?.primaryEmailAddress?.emailAddress ||
                  '?'
                )
                  ?.charAt(0)
                  ?.toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-50 dark:text-gray-100 truncate">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute top-full left-0 w-full bg-white dark:bg-[#1E1E1E] rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 mt-2 z-50 text-sm">
                <div className="p-2">
                  <button
                    onClick={handleExportNotes}
                    disabled={isExporting}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                    <span>{isExporting ? 'Exporting…' : 'Export notes'}</span>
                  </button>

                  <button
                    onClick={handleImportNotes}
                    disabled={isImporting}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                    <span>{isImporting ? 'Importing…' : 'Import notes'}</span>
                  </button>

                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faMoon} className="w-4 h-4" />
                      <span>Dark mode</span>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${
                        theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform translate-y-0.5 ${
                          theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
                    <span>Settings</span>
                  </button>

                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600 dark:text-red-400 transition-colors"
                    onClick={() => {
                      signOut();
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faRightFromBracket}
                      className="w-4 h-4"
                    />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </SignedIn>

        <SignedOut>
          <div className="p-3 rounded-xl border border-transparent hover:border-indigo-500/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 flex items-center gap-3 transition-colors">
            <div className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center text-lg font-semibold">
              G
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-200">Guest</p>
              <p className="text-xs text-gray-500 mb-2">
                Sign in to unlock AI features
              </p>
              <SignInButton mode="modal">
                <button className="px-3 py-1 text-xs font-semibold bg-indigo-600 rounded-md text-white hover:bg-indigo-700 transition-colors">
                  Sign in
                </button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>
      </div>

      <button
        onClick={onCreateNote}
        className="flex items-center justify-center gap-2 w-full text-left p-2 rounded-md bg-gray-200 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors mb-4 font-semibold text-gray-900 dark:text-gray-300"
      >
        <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
        <span>Create Note</span>
      </button>

      <div className="flex-1 overflow-y-auto pr-1">
        {sortedPinnedNotes.length > 0 && (
          <div className="mb-4">
            <h3 className="flex items-center gap-2 p-2 text-gray-600 dark:text-gray-400 font-semibold">
              <FontAwesomeIcon icon={faBookmark} className="w-4 h-4" />
              <span>Pinned</span>
            </h3>
            <ul>
              {sortedPinnedNotes.map(note => (
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
