import React, { createContext, useContext, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationCircle,
  faInfoCircle,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  isExiting?: boolean;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev =>
      prev.map(toast =>
        toast.id === id ? { ...toast, isExiting: true } : toast
      )
    );

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 500); // Match animation duration
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType, duration = 3000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { id, message, type, duration, isExiting: false };

      setToasts(prev => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all
              ${toast.isExiting ? 'animate-fade-out' : 'animate-slide-up'}
              ${
                toast.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/80 dark:text-green-100 dark:border-green-800'
                  : toast.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/80 dark:text-red-100 dark:border-red-800'
                    : toast.type === 'warning'
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-100 dark:border-yellow-800'
                      : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/80 dark:text-blue-100 dark:border-blue-800'
              }
            `}
            role="alert"
          >
            <FontAwesomeIcon
              icon={
                toast.type === 'success'
                  ? faCheckCircle
                  : toast.type === 'error'
                    ? faExclamationCircle
                    : toast.type === 'warning'
                      ? faExclamationCircle
                      : faInfoCircle
              }
              className="w-4 h-4"
            />
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
