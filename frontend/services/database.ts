// IndexedDB service using Dexie for persistent storage
import Dexie, { Table } from 'dexie';
import { Note, Collection } from '../types';

export interface SyncSettings {
  id: string;
  syncEnabled: boolean; // Folder sync
  syncFolderName?: string;
  lastSyncTime?: string;
  cloudSyncEnabled?: boolean; // Cloud sync (Jottin Cloud)
  lastCloudSyncTime?: string;
  encryptionEnabled: boolean;
  encryptedKey?: string;
  // AI Provider Settings
  aiProvider?: 'gemini' | 'openai' | 'ollama';
  aiApiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

class JottinDatabase extends Dexie {
  notes!: Table<Note, string>;
  collections!: Table<Collection, string>;
  settings!: Table<SyncSettings, string>;

  constructor() {
    super('JottinDB');

    this.version(1).stores({
      notes: 'id, title, date, collectionId, isPinned',
      collections: 'id, name',
      settings: 'id',
    });
  }

  async initializeDefaultData() {
    // Initialize Settings only if they don't exist
    const settings = await this.settings.get('sync-settings');

    if (!settings) {
      await this.settings.add({
        id: 'sync-settings',
        syncEnabled: false,
        encryptionEnabled: false,
        aiProvider: undefined, // Force user to configure
        aiApiKey: undefined,
      });
    }
  }
}

export const db = new JottinDatabase();

// Initialize database with default data on first run
db.on('ready', () => {
  return db.initializeDefaultData();
});
