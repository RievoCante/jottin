// Loading spinner component
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading notes...',
}) => {
  return (
    <div className="bg-gray-100 dark:bg-[#171717] min-h-screen text-gray-900 dark:text-gray-300 font-sans flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
