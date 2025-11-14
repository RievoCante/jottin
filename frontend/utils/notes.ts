// Utility functions for note operations
import { Note } from '../types';

/**
 * Get collection IDs from a note (handles both legacy and new format)
 */
export const getNoteCollections = (note: Note): string[] => {
  return note.collectionIds || (note.collectionId ? [note.collectionId] : []);
};

/**
 * Filter notes by active collection ID
 */
export const getDisplayedNotes = (
  notes: Note[],
  activeCollectionId: string | null
): Note[] => {
  if (!activeCollectionId) {
    return notes;
  }

  return notes.filter(note => {
    const noteCollections = getNoteCollections(note);
    return noteCollections.includes(activeCollectionId);
  });
};

/**
 * Check if a note is empty and should be auto-deleted
 */
export const isNoteEmpty = (note: Note): boolean => {
  const hasDefaultTitle = note.title === 'New Note';
  const hasNoTitle = !note.title.trim();
  const hasNoContent = !note.content.trim();
  return (hasDefaultTitle || hasNoTitle) && hasNoContent;
};
