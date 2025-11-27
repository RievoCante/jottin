import { useState, useCallback, useEffect } from 'react';
import { Note } from '../types';

interface UseNoteSelectionReturn {
  selectedNoteIds: string[];
  toggleNoteSelection: (
    noteId: string,
    isShiftKey: boolean,
    allNotes: Note[]
  ) => void;
  clearSelection: () => void;
  selectAll: (allNotes: Note[]) => void;
}

export const useNoteSelection = (): UseNoteSelectionReturn => {
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedNoteIds([]);
    setLastSelectedId(null);
  }, []);

  const selectAll = useCallback((allNotes: Note[]) => {
    setSelectedNoteIds(allNotes.map(n => n.id));
  }, []);

  const toggleNoteSelection = useCallback(
    (noteId: string, isShiftKey: boolean, allNotes: Note[]) => {
      if (isShiftKey && lastSelectedId) {
        // Range selection
        const lastIndex = allNotes.findIndex(n => n.id === lastSelectedId);
        const currentIndex = allNotes.findIndex(n => n.id === noteId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = allNotes.slice(start, end + 1).map(n => n.id);

          setSelectedNoteIds(prev => {
            const newSet = new Set(prev);
            rangeIds.forEach(id => newSet.add(id));
            return Array.from(newSet);
          });
        }
      } else {
        // Single toggle
        setSelectedNoteIds(prev => {
          if (prev.includes(noteId)) {
            return prev.filter(id => id !== noteId);
          } else {
            return [...prev, noteId];
          }
        });
        setLastSelectedId(noteId);
      }
    },
    [lastSelectedId]
  );

  // Clear selection on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  return {
    selectedNoteIds,
    toggleNoteSelection,
    clearSelection,
    selectAll,
  };
};
