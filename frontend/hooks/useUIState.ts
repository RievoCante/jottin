// UI state management hook
import { useState, useMemo } from 'react';
import { Note, Collection } from '../types';

interface UseUIStateReturn {
  // State
  activeNoteId: string | null;
  activeCollectionId: string | null;
  isMobileSidebarOpen: boolean;
  isMobileHeadsUpOpen: boolean;
  isSearchModalOpen: boolean;
  isSettingsOpen: boolean;

  // Derived values
  activeNote: Note | null;
  activeCollection: Collection | null;

  // Setters
  setActiveNoteId: (id: string | null) => void;
  setActiveCollectionId: (id: string | null) => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
  setIsMobileHeadsUpOpen: (open: boolean) => void;
  setIsSearchModalOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;

  // Actions
  selectNote: (noteId: string) => void;
  selectCollection: (collectionId: string | null) => void;
  goHome: () => void;
  closeMobilePanels: () => void;
}

export const useUIState = (
  notes: Note[],
  collections: Collection[]
): UseUIStateReturn => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileHeadsUpOpen, setIsMobileHeadsUpOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Derived values
  const activeNote = useMemo(
    () => notes.find(n => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  );

  const activeCollection = useMemo(
    () => collections.find(c => c.id === activeCollectionId) || null,
    [collections, activeCollectionId]
  );

  // Actions
  const selectNote = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  const selectCollection = (collectionId: string | null) => {
    setActiveCollectionId(collectionId);
    setActiveNoteId(null); // Go to collection view, not a specific note
  };

  const goHome = () => {
    setActiveNoteId(null);
    setActiveCollectionId(null);
  };

  const closeMobilePanels = () => {
    setIsMobileSidebarOpen(false);
    setIsMobileHeadsUpOpen(false);
  };

  return {
    // State
    activeNoteId,
    activeCollectionId,
    isMobileSidebarOpen,
    isMobileHeadsUpOpen,
    isSearchModalOpen,
    isSettingsOpen,

    // Derived
    activeNote,
    activeCollection,

    // Setters
    setActiveNoteId,
    setActiveCollectionId,
    setIsMobileSidebarOpen,
    setIsMobileHeadsUpOpen,
    setIsSearchModalOpen,
    setIsSettingsOpen,

    // Actions
    selectNote,
    selectCollection,
    goHome,
    closeMobilePanels,
  };
};
