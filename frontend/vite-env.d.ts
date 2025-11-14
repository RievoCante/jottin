/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Clerk window type definitions
interface Window {
  Clerk?: {
    session?: {
      getToken: () => Promise<string | null>;
    };
    signOut?: () => Promise<void>;
    user?: {
      id: string;
      fullName?: string;
      primaryEmailAddress?: {
        emailAddress: string;
      };
    };
  };
}
