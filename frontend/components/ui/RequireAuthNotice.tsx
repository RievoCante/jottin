// Reusable notice prompting the user to sign in before accessing gated features
import React from 'react';
import { SignedOut, SignInButton } from '@clerk/clerk-react';

interface RequireAuthNoticeProps {
  message: string;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'minimal';
}

const RequireAuthNotice: React.FC<RequireAuthNoticeProps> = ({
  message,
  buttonText = 'Sign in',
  className = '',
  variant = 'default',
}) => {
  const containerClasses =
    variant === 'default'
      ? 'rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 p-4'
      : 'text-gray-600 dark:text-gray-400';

  return (
    <SignedOut>
      <div className={`${containerClasses} ${className}`}>
        <p
          className={`text-sm leading-relaxed ${variant === 'default' ? 'mb-4' : 'mb-3'}`}
        >
          {message}
        </p>
        <SignInButton mode="modal">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors">
            {buttonText}
          </button>
        </SignInButton>
      </div>
    </SignedOut>
  );
};

export default RequireAuthNotice;
