import React, { useState, useCallback, useEffect } from 'react';
import { AuthGuard } from './components/AuthGuard';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import HeadsUp from './components/HeadsUp';
import NoteList from './components/NoteList';
import SyncStatus from './components/SyncStatus';
import SearchModal from './components/SearchModal';
import Settings from './components/Settings';
import { Note, Collection } from './types';
import { db } from './services/database';
import llmService from './services/llmService';
import { syncManager } from './services/syncManager';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );
  const [relevantNotes, setRelevantNotes] = useState<Note[]>([]);
  const [isLoadingHeadsUp, setIsLoadingHeadsUp] = useState(false);
  const [headsUpWidth, setHeadsUpWidth] = useState(384); // w-96 in pixels
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileHeadsUpOpen, setIsMobileHeadsUpOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;
  const activeCollection = collections.find(c => c.id === activeCollectionId);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedNotes, loadedCollections, syncSettings] =
          await Promise.all([
            db.notes.toArray(),
            db.collections.toArray(),
            db.settings.get('sync-settings'),
          ]);
        setNotes(loadedNotes);
        setCollections(loadedCollections);
        setIsSyncEnabled(syncSettings?.syncEnabled || false);
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Listen for database changes (external sync updates)
  useEffect(() => {
    const handleDatabaseChange = async () => {
      const loadedNotes = await db.notes.toArray();
      setNotes(loadedNotes);
    };

    // Poll for changes (in production, use Dexie.Observable or custom events)
    const interval = setInterval(handleDatabaseChange, 1000);

    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNoteChange = useCallback(
    async (noteId: string, updates: Partial<Omit<Note, 'id'>>) => {
      let updatedNote: Note | undefined;
      setNotes(prevNotes =>
        prevNotes.map(n => {
          if (n.id === noteId) {
            updatedNote = { ...n, ...updates };
            return updatedNote;
          }
          return n;
        })
      );

      // Persist to IndexedDB and sync to file
      if (updatedNote) {
        try {
          await db.notes.update(noteId, updates);

          // Sync to file if sync is enabled
          if (isSyncEnabled) {
            await syncManager.syncNoteToFile(updatedNote);
          }
        } catch (error) {
          console.error('Failed to update note in IndexedDB:', error);
        }
      }

      if (updatedNote && updates.content !== undefined) {
        setIsLoadingHeadsUp(true);
        try {
          const relevant = await llmService.findRelevantNotes(
            updates.content,
            notes.filter(n => n.id !== noteId)
          );
          setRelevantNotes(relevant);
        } catch (error) {
          console.error('Error finding relevant notes:', error);
          setRelevantNotes([]);
        } finally {
          setIsLoadingHeadsUp(false);
        }
      }
    },
    [notes]
  );

  const createNewNote = async (content: string, title?: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: title || content.split('\n')[0].substring(0, 50) || 'New Note',
      content: content,
      date: new Date().toISOString(),
      collectionId: activeCollectionId || undefined,
    };

    try {
      await db.notes.add(newNote);
      setNotes(prev => [newNote, ...prev]);
      setActiveNoteId(newNote.id);

      // Sync to file if sync is enabled
      if (isSyncEnabled) {
        await syncManager.syncNoteToFile(newNote);
      }
    } catch (error) {
      console.error('Failed to create note in IndexedDB:', error);
    }
  };

  const handleTogglePinNote = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newPinnedState = !note.isPinned;

    try {
      await db.notes.update(noteId, { isPinned: newPinnedState });
      setNotes(prevNotes =>
        prevNotes.map(n =>
          n.id === noteId ? { ...n, isPinned: newPinnedState } : n
        )
      );
    } catch (error) {
      console.error('Failed to toggle pin in IndexedDB:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    if (!noteToDelete) return;

    try {
      await db.notes.delete(noteId);

      // Sync deletion to file if sync is enabled
      if (isSyncEnabled) {
        await syncManager.syncDeleteToFile(noteId, noteToDelete);
      }

      setNotes(prevNotes => {
        const newNotes = prevNotes.filter(n => n.id !== noteId);
        if (activeNote?.id === noteId) {
          const notesToConsider = activeCollectionId
            ? newNotes.filter(n => {
                const noteCollections =
                  n.collectionIds || (n.collectionId ? [n.collectionId] : []);
                return noteCollections.includes(activeCollectionId);
              })
            : newNotes;
          setActiveNoteId(notesToConsider[0]?.id || newNotes[0]?.id || null);
        }
        return newNotes;
      });
    } catch (error) {
      console.error('Failed to delete note from IndexedDB:', error);
    }
  };

  const handleCleanUpNote = async (note: Note): Promise<string> => {
    try {
      const cleanedContent = await llmService.cleanUpNote(note.content);
      return cleanedContent;
    } catch (error) {
      console.error('Failed to clean up note:', error);
      throw error;
    }
  };

  const handleSelectCollection = (collectionId: string | null) => {
    setActiveCollectionId(collectionId);
    setActiveNoteId(null); // Go to collection view, not a specific note
  };

  const handleSelectNote = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  const handleGoHome = async () => {
    // Check if the current note is empty and delete it
    if (activeNote) {
      const hasDefaultTitle = activeNote.title === 'New Note';
      const hasNoContent = !activeNote.content.trim();
      const isEmpty =
        (hasDefaultTitle || !activeNote.title.trim()) && hasNoContent;

      if (isEmpty) {
        await handleDeleteNote(activeNote.id);
      }
    }
    // Always go to home page (all notes, no collection filter)
    setActiveNoteId(null);
    setActiveCollectionId(null);
  };

  const handleImportNotes = async (
    importedNotes: Note[],
    importedCollections: Collection[]
  ) => {
    try {
      // Merge collections
      for (const collection of importedCollections) {
        const existing = collections.find(c => c.id === collection.id);
        if (!existing) {
          await db.collections.add(collection);
          setCollections(prev => [...prev, collection]);
        }
      }

      // Merge notes
      for (const note of importedNotes) {
        const existing = notes.find(n => n.id === note.id);
        if (!existing) {
          await db.notes.add(note);
          setNotes(prev => [note, ...prev]);
        } else {
          // For now, skip duplicates - will handle conflicts in next step
          console.log(`Skipping duplicate note: ${note.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to import notes:', error);
    }
  };

  // Resizing logic
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMoveResize);
    document.addEventListener('mouseup', handleMouseUpResize);
  };

  const handleMouseMoveResize = (e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 300 && newWidth < 800) {
      // Min and max width constraints
      setHeadsUpWidth(newWidth);
    }
  };

  const handleMouseUpResize = () => {
    document.removeEventListener('mousemove', handleMouseMoveResize);
    document.removeEventListener('mouseup', handleMouseUpResize);
  };

  const displayedNotes = activeCollectionId
    ? notes.filter(note => {
        const noteCollections =
          note.collectionIds || (note.collectionId ? [note.collectionId] : []);
        return noteCollections.includes(activeCollectionId);
      })
    : notes;

  if (isLoading) {
    return (
      <div className="bg-gray-100 dark:bg-[#171717] min-h-screen text-gray-900 dark:text-gray-300 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="bg-gray-100 dark:bg-[#171717] min-h-screen text-gray-900 dark:text-gray-300 font-sans flex antialiased">
        {/* Mobile Overlay */}
        {(isMobileSidebarOpen || isMobileHeadsUpOpen) && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => {
              setIsMobileSidebarOpen(false);
              setIsMobileHeadsUpOpen(false);
            }}
          />
        )}

        {/* Sidebar - Hidden on mobile, slides in when open */}
        <div
          className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        >
          <Sidebar
            collections={collections}
            notes={notes}
            activeNoteId={activeNote?.id}
            activeCollectionId={activeCollectionId}
            onNoteSelect={note => {
              handleSelectNote(note.id);
              setIsMobileSidebarOpen(false);
            }}
            onCollectionSelect={collectionId => {
              handleSelectCollection(collectionId);
              setIsMobileSidebarOpen(false);
            }}
            onCreateNote={() => {
              createNewNote('');
              setIsMobileSidebarOpen(false);
            }}
            onImportNotes={handleImportNotes}
            onSyncStatusChange={setIsSyncEnabled}
            isSettingsOpen={isSettingsOpen}
            setIsSettingsOpen={setIsSettingsOpen}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative min-w-0">
          {/* Mobile Header with Menu Buttons */}
          <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Jottin</h1>
            <button
              onClick={() => setIsMobileHeadsUpOpen(!isMobileHeadsUpOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              aria-label="Toggle chat"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </button>
          </div>

          {/* Sync Status Indicator */}
          <div className="absolute top-4 right-4 z-10 hidden lg:block">
            <SyncStatus isSyncEnabled={isSyncEnabled} />
          </div>

          {activeNote ? (
            <MainContent
              key={activeNote.id}
              note={activeNote}
              collections={collections}
              onNoteChange={handleNoteChange}
              createNewNote={createNewNote}
              onCleanUp={handleCleanUpNote}
              onTogglePin={() => handleTogglePinNote(activeNote.id)}
              onDelete={() => handleDeleteNote(activeNote.id)}
              onGoHome={handleGoHome}
            />
          ) : (
            <NoteList
              notes={displayedNotes}
              onNoteSelect={handleSelectNote}
              onCreateNote={() => createNewNote('')}
              collection={activeCollection}
              collections={collections}
            />
          )}
        </main>

        {/* HeadsUp - Hidden on mobile/tablet, slides in from right on mobile when toggled */}
        <div
          className={`
          fixed lg:static inset-y-0 right-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isMobileHeadsUpOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          hidden lg:block
          ${isMobileHeadsUpOpen ? '!block' : ''}
        `}
        >
          <HeadsUp
            notesContext={notes}
            activeNote={activeNote}
            relevantNotes={relevantNotes}
            isLoading={isLoadingHeadsUp}
            width={headsUpWidth}
            onResizeStart={handleMouseDownResize}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        {/* Floating Action Button - Mobile Only */}
        <button
          onClick={() => createNewNote('')}
          className="lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95"
          aria-label="Create new note"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          notes={notes}
          collections={collections}
          onNoteSelect={handleSelectNote}
        />

        {/* Settings Modal */}
        <Settings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          collections={collections}
          onSyncStatusChange={setIsSyncEnabled}
        />
      </div>
    </AuthGuard>
  );
};

export default App;
