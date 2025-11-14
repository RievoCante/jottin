import React, { useEffect, useState } from 'react';
import { Note, Collection } from '../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faPlus,
  faEllipsis,
  faWandMagicSparkles,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import Tooltip from '../ui/Tooltip';

interface GroupedNotes {
  label: string;
  notes: Note[];
}

const groupNotesByDate = (notes: Note[]): GroupedNotes[] => {
  const groups: { [key: string]: Note[] } = {};
  const order: string[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sortedNotes.forEach(note => {
    const noteDate = new Date(note.date);
    let groupKey: string;

    const diffDays =
      (today.getTime() - noteDate.getTime()) / (1000 * 3600 * 24);

    if (noteDate.toDateString() === today.toDateString()) {
      groupKey = 'TODAY';
    } else if (noteDate.toDateString() === yesterday.toDateString()) {
      groupKey = 'YESTERDAY';
    } else if (diffDays < 7) {
      groupKey = 'LAST WEEK';
    } else {
      groupKey = noteDate
        .toLocaleString('default', { month: 'long', year: 'numeric' })
        .toUpperCase();
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
      order.push(groupKey);
    }
    groups[groupKey].push(note);
  });

  return order.map(label => ({
    label,
    notes: groups[label],
  }));
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

interface NoteListProps {
  notes: Note[];
  onNoteSelect: (noteId: string) => void;
  onCreateNote: () => void;
  collection?: Collection;
  collections: Collection[];
  onPinNote?: (noteId: string) => void;
  onOrganizeNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onOpenSearch?: () => void;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  onNoteSelect,
  onCreateNote,
  collection,
  collections,
  onPinNote,
  onOrganizeNote,
  onDeleteNote,
  onOpenSearch,
}) => {
  const groupedNotes = groupNotesByDate(notes);
  const collectionsMap = new Map(collections.map(c => [c.id, c]));
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-note-menu]')) {
        setActiveMenuId(null);
      }
    };

    if (activeMenuId) {
      document.addEventListener('mousedown', handleClick);
    }

    return () => document.removeEventListener('mousedown', handleClick);
  }, [activeMenuId]);

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1E1E1E]">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-500 text-lg">
            {collection
              ? `No notes in "${collection.name}"`
              : 'You have no notes'}
          </p>
          <button
            onClick={onCreateNote}
            className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-semibold transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Create New Note
          </button>
        </div>
      </div>
    );
  }

  const searchInput = (
    <button
      type="button"
      onClick={() => onOpenSearch?.()}
      className="group w-full max-w-2xl flex items-center justify-between bg-[#fdf7ef] dark:bg-[#1f1a14] hover:bg-[#f5ecdd] dark:hover:bg-[#292218] text-gray-600 dark:text-gray-300 rounded-full px-5 py-3 transition-all border border-transparent hover:border-[#f1e3cd] dark:hover:border-[#3a3024]"
    >
      <div className="flex items-center gap-3">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="w-4 h-4 text-gray-400 dark:text-gray-500"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Search here
        </span>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        ⌘ K
      </span>
    </button>
  );

  const headerContent = collection ? (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          <span className="mr-3">{collection.icon}</span>
          {collection.name}
        </h1>
        <input
          type="text"
          placeholder="Add a description"
          className="bg-transparent text-sm text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <Tooltip text="New note in collection">
          <button className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
            <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
          </button>
        </Tooltip>
        <Tooltip text="Clean up notes">
          <button className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="w-5 h-5" />
          </button>
        </Tooltip>
        <Tooltip text="More actions">
          <button className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
            <FontAwesomeIcon icon={faEllipsis} className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
    </>
  ) : (
    <div className="w-full flex justify-center lg:justify-start">
      {searchInput}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#1E1E1E] overflow-y-auto">
      <div className="sticky top-0 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-sm z-10 border-b border-gray-200 dark:border-gray-700 px-8 py-3 flex justify-between items-center">
        {headerContent}
      </div>
      <div className="px-8 py-4">
        {groupedNotes.map(
          group =>
            group.notes.length > 0 && (
              <div key={group.label} className="mb-6">
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                  {group.label}
                </h2>
                <div className="space-y-1">
                  {group.notes.map(note => {
                    const noteCollectionIds =
                      note.collectionIds ||
                      (note.collectionId ? [note.collectionId] : []);
                    const noteCollections = noteCollectionIds
                      .map(id => collectionsMap.get(id))
                      .filter(Boolean);
                    return (
                      <button
                        key={note.id}
                        onClick={() => onNoteSelect(note.id)}
                        className="group w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-3 text-left min-w-0">
                          <FontAwesomeIcon
                            icon={faFileLines}
                            className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {note.title}
                              </p>
                              {noteCollections.map(collection => (
                                <span
                                  key={collection!.id}
                                  className="text-xs bg-green-100 dark:bg-green-900/70 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full shrink-0"
                                >
                                  {collection!.icon} {collection!.name}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {note.content.substring(0, 60)}
                            </p>
                          </div>
                        </div>
                        <div
                          className="relative ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-note-menu
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600/70 text-gray-500 dark:text-gray-300"
                            onClick={() =>
                              setActiveMenuId(prev =>
                                prev === note.id ? null : note.id
                              )
                            }
                            aria-label="Open note actions"
                          >
                            <FontAwesomeIcon
                              icon={faEllipsis}
                              className="w-4 h-4"
                            />
                          </button>
                          {activeMenuId === note.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#2A2A2A] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 flex items-center gap-2"
                                onClick={() => {
                                  onPinNote?.(note.id);
                                  setActiveMenuId(null);
                                }}
                              >
                                Pin
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 flex items-center gap-2"
                                onClick={() => {
                                  onOrganizeNote?.(note.id);
                                  setActiveMenuId(null);
                                }}
                              >
                                Organize
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/70 flex items-center gap-2"
                                onClick={() => {
                                  onDeleteNote?.(note.id);
                                  setActiveMenuId(null);
                                }}
                              >
                                Trash
                              </button>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default NoteList;
