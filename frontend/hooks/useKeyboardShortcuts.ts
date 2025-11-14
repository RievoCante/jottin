// Global keyboard shortcuts hook
import { useEffect } from 'react';

interface KeyboardShortcutsCallbacks {
  onSearch?: () => void;
}

export const useKeyboardShortcuts = (callbacks: KeyboardShortcutsCallbacks) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        callbacks.onSearch?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks.onSearch]);
};
