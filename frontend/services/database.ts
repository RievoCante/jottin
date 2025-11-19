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

      // Initialize with sample notes
      await this.notes.bulkAdd([
        {
          id: 'note-1',
          title: 'OCI (Oracle Cloud Infrastructure)',
          content: 'DNS Domain Name: K3ssublnet.nevo.oraclevcn.com',
          date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          collectionId: 'liberator',
          isPinned: true,
        },
        {
          id: 'note-3',
          title: 'My Address',
          content:
            '666/982 Supalai Veranda Phasi Charoen, Phetkasem Rd, Bang Wa, Phasi Charoen, Bangkok 10160',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          isPinned: true,
        },
        {
          id: 'note-2',
          title: 'Fintellect Consulting Website',
          content: 'e learning in website',
          date: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
          collectionId: 'solopreneur',
        },
        {
          id: 'note-4',
          title: 'Lib Responsibilities',
          content: 'I have access permission for both Dev and Infrastructure.',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
          collectionId: 'liberator',
        },
        {
          id: 'note-5',
          title: 'Senior DevOps engineer task',
          content:
            'Your task is to dockerize my application that uses Neon.\n1. **Development Environment (Local):**\n2. **Staging Environment:**\n3. **Production Environment:**',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
          collectionId: 'liberator',
        },
        {
          id: 'note-6',
          title: 'Note to myself',
          content: 'we might be able to do some thing with',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          collectionId: 'solopreneur',
        },
        {
          id: 'note-7',
          title: 'Workout Plan',
          content:
            'Monday: Chest & Triceps\nWednesday: Back & Biceps\nFriday: Legs & Shoulders',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
          collectionId: 'workout',
        },
        {
          id: 'note-8',
          title: 'Quarterly Financial Goals',
          content:
            '- Increase savings by 5%\n- Invest $2000 in index funds\n- Review budget for potential cuts',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          collectionId: 'money',
        },
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
