// Complex note operations that combine multiple concerns
import { useCallback } from 'react';
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
  handleGoHome: () => Promise<void>;
  handleCleanUpNote: (note: Note) => Promise<string>;
}

export const useNoteOperations = (
  appData: UseAppDataReturn,
  uiState: UseUIStateReturn,
  headsUp: UseHeadsUpReturn
): UseNoteOperationsReturn => {
  const handleNoteChange = useCallback(
    async (noteId: string, updates: Partial<Omit<Note, 'id'>>) => {
      // Update note in app data
      await appData.updateNote(noteId, updates);

      // If content changed, find relevant notes
      if (updates.content !== undefined) {
        const updatedNote = appData.notes.find(n => n.id === noteId);
        if (updatedNote) {
          await headsUp.findRelevantNotes(
            updates.content,
            appData.notes,
            noteId
          );
        }
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
    handleGoHome,
    handleCleanUpNote,
  };
};
