// Data management and persistence hook
import { useState, useEffect, useCallback } from 'react';
import { Note, Collection } from '../types';
import { db } from '../services/database';
import { syncManager } from '../services/syncManager';

interface UseAppDataReturn {
  // State
  notes: Note[];
  collections: Collection[];
  isLoading: boolean;
  isSyncEnabled: boolean;

  // Actions
  createNote: (
    content: string,
    title?: string,
    collectionId?: string | null
  ) => Promise<string>; // Returns note ID
  updateNote: (
    noteId: string,
    updates: Partial<Omit<Note, 'id'>>
  ) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  togglePinNote: (noteId: string) => Promise<void>;
  importNotes: (
    importedNotes: Note[],
    importedCollections: Collection[]
  ) => Promise<void>;
  setSyncEnabled: (enabled: boolean) => void;
}

export const useAppData = (): UseAppDataReturn => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);

  const setSyncEnabled = useCallback((enabled: boolean) => {
    setIsSyncEnabled(enabled);
  }, []);

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
        
        // Initialize cloud sync if enabled
        if (syncSettings?.cloudSyncEnabled) {
          syncManager.initializeCloudSync().catch(err => {
            console.error('Failed to initialize cloud sync:', err);
          });
        }
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

  const createNote = useCallback(
    async (content: string, title?: string, collectionId?: string | null) => {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: title || content.split('\n')[0].substring(0, 50) || 'New Note',
        content: content,
        date: new Date().toISOString(),
        collectionId: collectionId || undefined,
      };

      try {
        await db.notes.add(newNote);
        setNotes(prev => [newNote, ...prev]);

        // Sync to file if sync is enabled
        if (isSyncEnabled) {
          await syncManager.syncNoteToFile(newNote);
        }
        // Sync to cloud if cloud sync is enabled
        await syncManager.syncNoteToCloud(newNote);

        return newNote.id;
      } catch (error) {
        console.error('Failed to create note in IndexedDB:', error);
        throw error;
      }
    },
    [isSyncEnabled]
  );

  const updateNote = useCallback(
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

      try {
        await db.notes.update(noteId, updates);

        // Sync to file if sync is enabled
        if (isSyncEnabled && updatedNote) {
          await syncManager.syncNoteToFile(updatedNote);
        }
        // Sync to cloud if cloud sync is enabled
        if (updatedNote) {
          await syncManager.syncNoteToCloud(updatedNote);
        }
      } catch (error) {
        console.error('Failed to update note in IndexedDB:', error);
      }
    },
    [isSyncEnabled]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const noteToDelete = notes.find(n => n.id === noteId);
      if (!noteToDelete) return;

      try {
        await db.notes.delete(noteId);

        // Sync deletion to file if sync is enabled
        if (isSyncEnabled) {
          await syncManager.syncDeleteToFile(noteId, noteToDelete);
        }
        // Sync deletion to cloud if cloud sync is enabled
        await syncManager.syncDeleteToCloud(noteId);

        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
      } catch (error) {
        console.error('Failed to delete note from IndexedDB:', error);
      }
    },
    [notes, isSyncEnabled]
  );

  const togglePinNote = useCallback(
    async (noteId: string) => {
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
    },
    [notes]
  );

  const importNotes = useCallback(
    async (importedNotes: Note[], importedCollections: Collection[]) => {
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
    },
    [collections, notes]
  );

  return {
    notes,
    collections,
    isLoading,
    isSyncEnabled,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    importNotes,
    setSyncEnabled,
  };
};
