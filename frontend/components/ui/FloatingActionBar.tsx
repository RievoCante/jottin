import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faWandMagicSparkles,
  faXmark,
  faComment,
} from '@fortawesome/free-solid-svg-icons';

interface FloatingActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onOrganize: () => void;
}

const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onDelete,
  onOrganize,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#2A2A2A] rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 border-r border-gray-200 dark:border-gray-700 pr-6">
        <span className="font-semibold text-gray-900 dark:text-white">
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Clear selection"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          onClick={() => {}} // Future feature
        >
          <FontAwesomeIcon
            icon={faWandMagicSparkles}
            className="text-indigo-500"
          />
          Auto Organize
        </button>

        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          onClick={() => {}} // Future feature
        >
          <FontAwesomeIcon icon={faComment} />
          Chat
        </button>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          onClick={onOrganize}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} />
          Organize
        </button>

        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} />
          Trash
        </button>
      </div>
    </div>
  );
};

export default FloatingActionBar;
