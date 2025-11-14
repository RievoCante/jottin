// Navigation utility functions
import { Note } from '../types';
import { getNoteCollections } from './notes';

/**
 * Determine if an empty note should be auto-deleted when navigating away
 */
export const shouldAutoDeleteNote = (note: Note | null): boolean => {
  if (!note) return false;
  const hasDefaultTitle = note.title === 'New Note';
  const hasNoTitle = !note.title.trim();
  const hasNoContent = !note.content.trim();
  return (hasDefaultTitle || hasNoTitle) && hasNoContent;
};

/**
 * Get the next note to select after deleting the current one
 * Prioritizes notes in the same collection, then falls back to first note
 */
export const getNextNoteAfterDelete = (
  deletedNoteId: string,
  notes: Note[],
  activeCollectionId: string | null
): string | null => {
  const remainingNotes = notes.filter(n => n.id !== deletedNoteId);

  if (remainingNotes.length === 0) {
    return null;
  }

  // If a collection is active, prioritize notes in that collection
  if (activeCollectionId) {
    const collectionNotes = remainingNotes.filter(note => {
      const noteCollections = getNoteCollections(note);
      return noteCollections.includes(activeCollectionId);
    });

    if (collectionNotes.length > 0) {
      return collectionNotes[0].id;
    }
  }

  // Fall back to first note
  return remainingNotes[0].id;
};
