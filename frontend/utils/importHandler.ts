// Import conflict resolution utilities
import { Note } from '../types';

export interface ImportConflict {
  existingNote: Note;
  importedNote: Note;
}

export type ConflictResolution = 'skip' | 'replace' | 'keep-both';

export function detectConflicts(
  existingNotes: Note[],
  importedNotes: Note[]
): ImportConflict[] {
  const conflicts: ImportConflict[] = [];

  for (const importedNote of importedNotes) {
    // Check for ID match
    const existingById = existingNotes.find(n => n.id === importedNote.id);
    if (existingById) {
      conflicts.push({ existingNote: existingById, importedNote });
      continue;
    }

    // Check for title match (potential duplicate)
    const existingByTitle = existingNotes.find(
      n =>
        n.title.toLowerCase() === importedNote.title.toLowerCase() &&
        n.collectionId === importedNote.collectionId
    );
    if (existingByTitle) {
      conflicts.push({ existingNote: existingByTitle, importedNote });
    }
  }

  return conflicts;
}

export function resolveConflict(
  conflict: ImportConflict,
  resolution: ConflictResolution
): { noteToKeep: Note | null; noteToAdd: Note | null } {
  switch (resolution) {
    case 'skip':
      // Keep existing, skip imported
      return { noteToKeep: conflict.existingNote, noteToAdd: null };

    case 'replace':
      // Replace existing with imported
      return { noteToKeep: conflict.importedNote, noteToAdd: null };

    case 'keep-both':
      // Keep existing and add imported with new ID
      const newNote: Note = {
        ...conflict.importedNote,
        id: `${conflict.importedNote.id}-imported-${Date.now()}`,
        title: `${conflict.importedNote.title} (imported)`,
      };
      return { noteToKeep: conflict.existingNote, noteToAdd: newNote };

    default:
      return { noteToKeep: conflict.existingNote, noteToAdd: null };
  }
}

export function generateDiffSummary(conflict: ImportConflict): string {
  const existing = conflict.existingNote;
  const imported = conflict.importedNote;

  const diffs: string[] = [];

  if (existing.content !== imported.content) {
    diffs.push(
      `Content differs (existing: ${existing.content.length} chars, imported: ${imported.content.length} chars)`
    );
  }

  if (existing.date !== imported.date) {
    diffs.push(
      `Date differs (existing: ${existing.date}, imported: ${imported.date})`
    );
  }

  if (existing.isPinned !== imported.isPinned) {
    diffs.push(
      `Pinned status differs (existing: ${existing.isPinned}, imported: ${imported.isPinned})`
    );
  }

  if (existing.collectionId !== imported.collectionId) {
    diffs.push(
      `Collection differs (existing: ${existing.collectionId || 'none'}, imported: ${imported.collectionId || 'none'})`
    );
  }

  return diffs.length > 0 ? diffs.join('\n') : 'No differences detected';
}
