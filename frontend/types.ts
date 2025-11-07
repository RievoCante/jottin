export interface Note {
  id: string;
  title: string;
  content: string;
  domain?: string;
  date: string;
  collectionId?: string; // Legacy support
  collectionIds?: string[]; // Multiple collections support
  isPinned?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export interface SyncSettings {
  id: string;
  syncEnabled: boolean;
  syncFolderName?: string;
  lastSyncTime?: string;
  encryptionEnabled: boolean;
  encryptedKey?: string;
}

export interface EncryptionConfig {
  enabled: boolean;
  password?: string;
}
