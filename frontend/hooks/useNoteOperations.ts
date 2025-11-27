// Complex note operations that combine multiple concerns
import { useCallback, useRef } from 'react';
import { Note } from '../types';
import llmService from '../services/llmService';
import {
  shouldAutoDeleteNote,
  getNextNoteAfterDelete,
} from '../utils/navigation';
import { UseAppDataReturn } from './useAppData';
import { UseUIStateReturn } from './useUIState';
import { UseHeadsUpReturn } from './useHeadsUp';

interface UseNoteOperationsReturn {
  handleNoteChange: (
    noteId: string,
    updates: Partial<Omit<Note, 'id'>>
  ) => Promise<void>;
  handleDeleteNote: (noteId: string) => Promise<void>;
  handleDeleteNotes: (noteIds: string[]) => Promise<void>;
  handleGoHome: () => Promise<void>;
  handleCleanUpNote: (note: Note) => Promise<string>;
}

export const useNoteOperations = (
  appData: UseAppDataReturn,
  uiState: UseUIStateReturn,
  headsUp: UseHeadsUpReturn
): UseNoteOperationsReturn => {
  const relevantNotesDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleNoteChange = useCallback(
    async (noteId: string, updates: Partial<Omit<Note, 'id'>>) => {
      // Update note in app data immediately
      await appData.updateNote(noteId, updates);

      // If content changed, find relevant notes (debounced)
      if (updates.content !== undefined) {
        if (relevantNotesDebounceRef.current) {
          clearTimeout(relevantNotesDebounceRef.current);
        }

        relevantNotesDebounceRef.current = setTimeout(async () => {
          const updatedNote = appData.notes.find(n => n.id === noteId);
          if (updatedNote) {
            await headsUp.findRelevantNotes(
              updates.content!,
              appData.notes,
              noteId
            );
          }
        }, 2000); // 2 second debounce
      }
    },
    [appData, headsUp]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      // Compute next note before deletion (while notes array still has the deleted note)
      let nextNoteId: string | null = null;
      if (uiState.activeNote?.id === noteId) {
        nextNoteId = getNextNoteAfterDelete(
          noteId,
          appData.notes,
          uiState.activeCollectionId
        );
      }

      await appData.deleteNote(noteId);

      // Navigate to next note after deletion
      if (nextNoteId !== null) {
        uiState.setActiveNoteId(nextNoteId);
      }
    },
    [appData, uiState]
  );

  const handleDeleteNotes = useCallback(
    async (noteIds: string[]) => {
      // If active note is being deleted, navigate away
      if (uiState.activeNote && noteIds.includes(uiState.activeNote.id)) {
        const nextNoteId = getNextNoteAfterDelete(
          uiState.activeNote.id,
          appData.notes.filter(n => !noteIds.includes(n.id)), // Filter out all being deleted
          uiState.activeCollectionId
        );

        if (nextNoteId) {
          uiState.setActiveNoteId(nextNoteId);
        } else {
          uiState.goHome();
        }
      }

      // Delete all notes
      await Promise.all(noteIds.map(id => appData.deleteNote(id)));
    },
    [appData, uiState]
  );

  const handleGoHome = useCallback(async () => {
    // Check if the current note is empty and delete it
    if (uiState.activeNote && shouldAutoDeleteNote(uiState.activeNote)) {
      await appData.deleteNote(uiState.activeNote.id);
    }
    // Always go to home page (all notes, no collection filter)
    uiState.goHome();
  }, [uiState, appData]);

  const handleCleanUpNote = useCallback(async (note: Note): Promise<string> => {
    try {
      const cleanedContent = await llmService.cleanUpNote(note.content);
      return cleanedContent;
    } catch (error) {
      console.error('Failed to clean up note:', error);
      throw error;
    }
  }, []);

  return {
    handleNoteChange,
    handleDeleteNote,
    handleDeleteNotes,
    handleGoHome,
    handleCleanUpNote,
  };
};
