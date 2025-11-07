// Quick search modal for finding notes by title or content
import React, { useState, useEffect, useRef } from 'react';
import { Note, Collection } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faXmark, faFileLines } from '@fortawesome/free-solid-svg-icons';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  collections: Collection[];
  onNoteSelect: (noteId: string) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  collections,
  onNoteSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = notes.filter(note => {
      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content.toLowerCase().includes(query);
      return titleMatch || contentMatch;
    });

    setSearchResults(results.slice(0, 10)); // Limit to 10 results
    setSelectedIndex(0);
  }, [searchQuery, notes]);

  useEffect(() => {
    // Scroll selected item into view
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      e.preventDefault();
      handleSelectNote(searchResults[selectedIndex].id);
    }
  };

  const handleSelectNote = (noteId: string) => {
    onNoteSelect(noteId);
    onClose();
    setSearchQuery('');
  };

  const getCollectionNames = (note: Note) => {
    const collectionIds = note.collectionIds || (note.collectionId ? [note.collectionId] : []);
    return collectionIds
      .map(id => collections.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({ icon: c!.icon, name: c!.name }));
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);
    
    return (
      <>
        {before}
        <span className="bg-yellow-200 dark:bg-yellow-900 text-gray-900 dark:text-white">
          {match}
        </span>
        {after}
      </>
    );
  };

  const getContentPreview = (note: Note, query: string) => {
    if (!query.trim()) return note.content.slice(0, 100);
    
    const index = note.content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return note.content.slice(0, 100);
    
    const start = Math.max(0, index - 40);
    const end = Math.min(note.content.length, index + query.length + 60);
    const preview = (start > 0 ? '...' : '') + note.content.slice(start, end) + (end < note.content.length ? '...' : '');
    
    return preview;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes by title or content..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Search Results */}
        <div
          ref={resultsRef}
          className="max-h-[60vh] overflow-y-auto"
        >
          {searchQuery && searchResults.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No notes found matching "{searchQuery}"
            </div>
          )}

          {!searchQuery && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Start typing to search your notes...</p>
              <p className="text-xs mt-2">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">↑</kbd>
                {' '}
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">↓</kbd>
                {' '}to navigate
                {' · '}
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd>
                {' '}to select
                {' · '}
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd>
                {' '}to close
              </p>
            </div>
          )}

          {searchResults.map((note, index) => {
            const noteCollections = getCollectionNames(note);
            return (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note.id)}
                className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  index === selectedIndex
                    ? 'bg-gray-50 dark:bg-gray-800'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon
                    icon={faFileLines}
                    className="w-4 h-4 mt-1 text-gray-400 dark:text-gray-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {highlightMatch(note.title, searchQuery)}
                      </h3>
                      {noteCollections.map((col, idx) => (
                        <span 
                          key={idx}
                          className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded shrink-0"
                        >
                          {col.icon} {col.name}
                        </span>
                      ))}
                    </div>
                    {note.content && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {highlightMatch(getContentPreview(note, searchQuery), searchQuery)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;

