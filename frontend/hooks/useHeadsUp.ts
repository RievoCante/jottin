// HeadsUp panel state and AI-related logic
import { useState, useCallback, useRef } from 'react';
import { Note } from '../types';
import llmService from '../services/llmService';

interface UseHeadsUpReturn {
  // State
  relevantNotes: Note[];
  isLoadingHeadsUp: boolean;
  headsUpWidth: number;

  // Actions
  findRelevantNotes: (
    content: string,
    allNotes: Note[],
    excludeNoteId?: string
  ) => Promise<void>;
  handleMouseDownResize: (e: React.MouseEvent) => void;
}

export const useHeadsUp = (): UseHeadsUpReturn => {
  const [relevantNotes, setRelevantNotes] = useState<Note[]>([]);
  const [isLoadingHeadsUp, setIsLoadingHeadsUp] = useState(false);
  const [headsUpWidth, setHeadsUpWidth] = useState(384); // w-96 in pixels

  const findRelevantNotes = useCallback(
    async (content: string, allNotes: Note[], excludeNoteId?: string) => {
      if (!content.trim() || allNotes.length === 0) {
        setRelevantNotes([]);
        return;
      }

      setIsLoadingHeadsUp(true);
      try {
        const notesToSearch = excludeNoteId
          ? allNotes.filter(n => n.id !== excludeNoteId)
          : allNotes;
        const relevant = await llmService.findRelevantNotes(
          content,
          notesToSearch
        );
        setRelevantNotes(relevant);
      } catch (error) {
        console.error('Error finding relevant notes:', error);
        setRelevantNotes([]);
      } finally {
        setIsLoadingHeadsUp(false);
      }
    },
    []
  );

  // Resizing logic
  const handleMouseMoveResize = useRef((e: MouseEvent) => {
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 300 && newWidth < 800) {
      // Min and max width constraints
      setHeadsUpWidth(newWidth);
    }
  });

  const handleMouseUpResize = useRef(() => {
    document.removeEventListener('mousemove', handleMouseMoveResize.current);
    document.removeEventListener('mouseup', handleMouseUpResize.current);
  });

  const handleMouseDownResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMoveResize.current);
    document.addEventListener('mouseup', handleMouseUpResize.current);
  }, []);

  return {
    relevantNotes,
    isLoadingHeadsUp,
    headsUpWidth,
    findRelevantNotes,
    handleMouseDownResize,
  };
};
