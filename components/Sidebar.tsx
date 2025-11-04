import React, { useState } from 'react';
import { Note, Collection } from '../types';
import { PlusIcon, PinIcon, ChevronDownIcon } from './Icons';

interface SidebarProps {
  collections: Collection[];
  notes: Note[];
  activeNoteId?: string;
  activeCollectionId: string | null;
  onNoteSelect: (note: Note) => void;
  onCollectionSelect: (collectionId: string | null) => void;
  onCreateNote: () => void;
}

const INITIAL_NOTE_LIMIT = 3;
const INITIAL_COLLECTION_LIMIT = 5;

const Sidebar: React.FC<SidebarProps> = ({ collections, notes, activeNoteId, activeCollectionId, onNoteSelect, onCollectionSelect, onCreateNote }) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(false);
  
  const pinnedNotes = notes.filter(n => n.isPinned);
  const allNotesExceptPinned = notes.filter(n => !n.isPinned);

  const notesToShow = isNotesExpanded ? allNotesExceptPinned : allNotesExceptPinned.slice(0, INITIAL_NOTE_LIMIT);
  const collectionsToShow = isCollectionsExpanded ? collections : collections.slice(0, INITIAL_COLLECTION_LIMIT);

  const handleCollectionClick = (collectionId: string) => {
    if (collectionId === activeCollectionId) {
      onCollectionSelect(null); // Deselect if the same collection is clicked
    } else {
      onCollectionSelect(collectionId);
    }
  };

  return (
    <aside className="w-72 bg-[#111111] border-r border-gray-800 flex flex-col p-3 text-sm">
      <div className="flex items-center gap-2 p-2 mb-4">
        <div className="w-8 h-8 bg-pink-300 rounded-lg flex items-center justify-center font-bold text-black">
          R
        </div>
        <span className="font-semibold text-white">Ravit Chutivisuth</span>
      </div>

      <button onClick={onCreateNote} className="flex items-center justify-center gap-2 w-full text-left p-2 rounded-md bg-gray-700/50 hover:bg-gray-700 transition-colors mb-4 font-semibold">
        <PlusIcon className="w-4 h-4" />
        <span>Create Note</span>
      </button>

      <div className="flex-1 overflow-y-auto pr-1">
        {pinnedNotes.length > 0 && (
          <div className="mb-4">
            <h3 className="flex items-center gap-2 p-2 text-gray-400 font-semibold">
              <PinIcon className="w-4 h-4" />
              <span>Pinned</span>
            </h3>
            <ul>
              {pinnedNotes.map(note => (
                <li key={note.id}>
                  <button onClick={() => onNoteSelect(note)} className={`w-full text-left p-2 rounded-md truncate ${activeNoteId === note.id ? 'bg-indigo-600/30 text-white' : 'hover:bg-gray-800'}`}>
                    {note.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mb-4">
          <button onClick={() => onCollectionSelect(null)} className={`w-full text-left flex items-center gap-2 p-2 text-gray-400 font-semibold rounded-md ${activeCollectionId === null ? 'bg-gray-700/50 text-white' : 'hover:bg-gray-800'}`}>
            <ChevronDownIcon className="w-4 h-4" />
            <span>Notes</span>
          </button>
          <ul>
            {notesToShow.map(note => (
              <li key={note.id}>
                <button onClick={() => onNoteSelect(note)} className={`w-full text-left p-2 rounded-md truncate ${activeNoteId === note.id ? 'bg-indigo-600/30 text-white' : 'hover:bg-gray-800'}`}>
                  {note.title}
                </button>
              </li>
            ))}
            {!isNotesExpanded && allNotesExceptPinned.length > INITIAL_NOTE_LIMIT && (
                <li>
                    <button onClick={() => setIsNotesExpanded(true)} className="w-full text-left p-2 rounded-md text-gray-500 hover:bg-gray-800 hover:text-gray-300">See All</button>
                </li>
            )}
          </ul>
        </div>
        
        <div>
          <h3 className="flex items-center gap-2 p-2 text-gray-400 font-semibold">
            <ChevronDownIcon className="w-4 h-4" />
            <span>Collections</span>
          </h3>
          <ul>
            {collectionsToShow.map(collection => (
              <li key={collection.id}>
                <button onClick={() => handleCollectionClick(collection.id)} className={`w-full text-left p-2 rounded-md flex items-center gap-2 ${activeCollectionId === collection.id ? 'bg-indigo-600/30 text-white' : 'hover:bg-gray-800'}`}>
                  <span>{collection.icon}</span>
                  <span className="truncate">{collection.name}</span>
                </button>
              </li>
            ))}
            {!isCollectionsExpanded && collections.length > INITIAL_COLLECTION_LIMIT && (
                 <li>
                    <button onClick={() => setIsCollectionsExpanded(true)} className="w-full text-left p-2 rounded-md text-gray-500 hover:bg-gray-800 hover:text-gray-300">See All</button>
                </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;