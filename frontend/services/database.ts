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
    const noteCount = await this.notes.count();

    if (noteCount === 0) {
      // Initialize with default collections
      await this.collections.bulkAdd([
        { id: 'liberator', name: 'Liberator', icon: '⚡️' },
        { id: 'money', name: 'Money', icon: '💰' },
        { id: 'health', name: 'Health', icon: '❤️' },
        { id: 'workout', name: 'Workout', icon: '💪' },
        { id: 'solopreneur', name: 'Solopreneur', icon: '🚀' },
      ]);

      // Initialize default settings
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
