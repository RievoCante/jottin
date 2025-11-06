import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import HeadsUp from './components/HeadsUp';
import NoteList from './components/NoteList';
import { Note, Collection } from './types';
import { MOCK_NOTES, MOCK_COLLECTIONS } from './constants';
import geminiService from './services/geminiService';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [collections, setCollections] =
    useState<Collection[]>(MOCK_COLLECTIONS);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );
  const [relevantNotes, setRelevantNotes] = useState<Note[]>([]);
  const [isLoadingHeadsUp, setIsLoadingHeadsUp] = useState(false);
  const [headsUpWidth, setHeadsUpWidth] = useState(384); // w-96 in pixels

  const activeNote = notes.find(n => n.id === activeNoteId) || null;
  const activeCollection = collections.find(c => c.id === activeCollectionId);

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

      if (updatedNote && updates.content !== undefined) {
        setIsLoadingHeadsUp(true);
        try {
          const relevant = await geminiService.findRelevantNotes(
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

  const createNewNote = (content: string, title?: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: title || content.split('\n')[0].substring(0, 50) || 'New Note',
      content: content,
      date: new Date().toISOString(),
      collectionId: activeCollectionId || undefined,
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const handleTogglePinNote = (noteId: string) => {
    setNotes(prevNotes =>
      prevNotes.map(n =>
        n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
      )
    );
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(prevNotes => {
      const newNotes = prevNotes.filter(n => n.id !== noteId);
      if (activeNote?.id === noteId) {
        const notesToConsider = activeCollectionId
          ? newNotes.filter(n => n.collectionId === activeCollectionId)
          : newNotes;
        setActiveNoteId(notesToConsider[0]?.id || newNotes[0]?.id || null);
      }
      return newNotes;
    });
  };

  const handleCleanUpNote = async (note: Note) => {
    try {
      const cleanedContent = await geminiService.cleanUpNote(note.content);
      handleNoteChange(note.id, { content: cleanedContent });
    } catch (error) {
      console.error('Failed to clean up note:', error);
    }
  };

  const handleSelectCollection = (collectionId: string | null) => {
    setActiveCollectionId(collectionId);
    setActiveNoteId(null); // Go to collection view, not a specific note
  };

  const handleSelectNote = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  const handleGoHome = () => {
    setActiveNoteId(null);
    setActiveCollectionId(null);
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
    ? notes.filter(note => note.collectionId === activeCollectionId)
    : notes;

  return (
    <div className="bg-gray-100 dark:bg-[#171717] min-h-screen text-gray-900 dark:text-gray-300 font-sans flex antialiased">
      <Sidebar
        collections={collections}
        notes={notes}
        activeNoteId={activeNote?.id}
        activeCollectionId={activeCollectionId}
        onNoteSelect={note => handleSelectNote(note.id)}
        onCollectionSelect={handleSelectCollection}
        onCreateNote={() => createNewNote('')}
      />
      <main className="flex-1 flex flex-col">
        {activeNote ? (
          <MainContent
            key={activeNote.id}
            note={activeNote}
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
      <HeadsUp
        notesContext={notes}
        activeNote={activeNote}
        relevantNotes={relevantNotes}
        isLoading={isLoadingHeadsUp}
        width={headsUpWidth}
        onResizeStart={handleMouseDownResize}
      />
    </div>
  );
};

export default App;
