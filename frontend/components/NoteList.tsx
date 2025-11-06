import React from 'react';
import { Note, Collection } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faPlus,
  faEllipsis,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import Tooltip from './Tooltip';

const groupNotesByDate = (notes: Note[]) => {
  const groups: { [key: string]: Note[] } = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  notes.forEach(note => {
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
    }
    groups[groupKey].push(note);
  });

  return groups;
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
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  onNoteSelect,
  onCreateNote,
  collection,
  collections,
}) => {
  const groupedNotes = groupNotesByDate(notes);
  const collectionsMap = new Map(collections.map(c => [c.id, c]));

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
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
        <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
          <button className="text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-1">
            All
          </button>
          <button className="hover:text-gray-900 dark:hover:text-white">Created by me</button>
          <button className="hover:text-gray-900 dark:hover:text-white">Shared with me</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#1E1E1E] overflow-y-auto">
      <div className="sticky top-0 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-sm z-10 border-b border-gray-200 dark:border-gray-700 px-8 py-3 flex justify-between items-center">
        {headerContent}
      </div>
      <div className="px-8 py-4">
        {Object.entries(groupedNotes).map(
          ([group, notesInGroup]) =>
            notesInGroup.length > 0 && (
              <div key={group} className="mb-6">
                <h2 className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
                  {group}
                </h2>
                <div className="space-y-1">
                  {notesInGroup.map(note => {
                    const noteCollection = note.collectionId
                      ? collectionsMap.get(note.collectionId)
                      : null;
                    return (
                      <button
                        key={note.id}
                        onClick={() => onNoteSelect(note.id)}
                        className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50"
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
                              {noteCollection && (
                                <span className="text-xs bg-green-100 dark:bg-green-900/70 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full shrink-0">
                                  {noteCollection.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {note.content.substring(0, 60)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0 ml-4">
                          {formatDate(note.date)}
                        </span>
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
