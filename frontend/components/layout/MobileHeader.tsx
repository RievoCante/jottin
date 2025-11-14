// Mobile header with menu buttons
import React from 'react';

interface MobileHeaderProps {
  onToggleSidebar: () => void;
  onToggleHeadsUp: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  onToggleSidebar,
  onToggleHeadsUp,
}) => {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
      <button
        onClick={onToggleSidebar}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        Jottin
      </h1>
      <button
        onClick={onToggleHeadsUp}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        aria-label="Toggle chat"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    </div>
  );
};

export default MobileHeader;
