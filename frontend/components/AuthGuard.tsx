// Authentication guard component to protect routes
import React, { useEffect } from 'react';
import {
  SignedIn,
  SignedOut,
  SignIn,
  useUser,
  useAuth,
} from '@clerk/clerk-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    // Log authentication status when user logs in
    if (userId && user) {
      console.log('User authenticated:', user.id);
    }
  }, [userId, user]);

  // Show loading spinner while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Jottin
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your AI-powered note-taking companion
              </p>
            </div>
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'mx-auto',
                  card: 'shadow-lg rounded-lg',
                },
              }}
              routing="hash"
            />
          </div>
        </div>
      </SignedOut>
      <SignedIn>{children}</SignedIn>
    </>
  );
};
