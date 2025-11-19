// Real-time filesystem sync manager and cloud sync manager
import { Note, Collection } from '../types';
import { db, SyncSettings } from './database';
import {
  noteToMarkdown,
  markdownToNote,
  getFilenameForNote,
} from '../utils/markdownConverter';
import { apiClient } from './apiClient';
import { encryptionService } from './encryption';
import { authService } from './authService';

export class SyncManager {
  // Folder sync properties
  private syncInterval: number | null = null;
  private pendingWrites: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 300; // ms
  private readonly POLL_INTERVAL = 5000; // ms
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private collectionDirs: Map<string, FileSystemDirectoryHandle> = new Map();
  private lastModifiedTimes: Map<string, number> = new Map();

  // Cloud sync properties
  private cloudSyncInterval: number | null = null;
  private readonly CLOUD_SYNC_INTERVAL = 30000; // 30 seconds
  private isCloudSyncing: boolean = false;
  private lastCloudSyncTime: string | null = null;

  async enableFolderSync(
    dirHandle: FileSystemDirectoryHandle,
    collections: Collection[]
  ): Promise<void> {
    this.dirHandle = dirHandle;

    // Store directory handle (note: can't persist FileSystemHandle to IndexedDB)
    await db.settings.put({
      id: 'sync-settings',
      syncEnabled: true,
      syncFolderName: dirHandle.name,
      lastSyncTime: new Date().toISOString(),
      encryptionEnabled: false,
    });

    // Create collection directories
    for (const collection of collections) {
      try {
        const collectionDir = await dirHandle.getDirectoryHandle(
          collection.name,
          { create: true }
        );
        this.collectionDirs.set(collection.id, collectionDir);
      } catch (error) {
        console.error(
          `Failed to create directory for collection ${collection.name}:`,
          error
        );
      }
    }

    // Start watching for external changes
    this.startWatchingForChanges();
  }

  async disableFolderSync(): Promise<void> {
    this.stopWatchingForChanges();
    this.dirHandle = null;
    this.collectionDirs.clear();
    this.lastModifiedTimes.clear();

    await db.settings.update('sync-settings', {
      syncEnabled: false,
      syncFolderName: undefined,
    });
  }

  async syncNoteToFile(note: Note): Promise<void> {
    if (!this.dirHandle) {
      console.warn('Sync not enabled, skipping file write');
      return;
    }

    // Clear any pending write for this note
    const existingTimeout = this.pendingWrites.get(note.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Debounce the write
    const timeout = setTimeout(async () => {
      try {
        await this.writeNoteToFile(note);
        this.pendingWrites.delete(note.id);

        // Update last sync time
        await db.settings.update('sync-settings', {
          lastSyncTime: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Failed to sync note ${note.id} to file:`, error);
      }
    }, this.DEBOUNCE_DELAY);

    this.pendingWrites.set(note.id, timeout);
  }

  private async writeNoteToFile(note: Note): Promise<void> {
    if (!this.dirHandle) return;

    const markdown = noteToMarkdown(note);
    const filename = getFilenameForNote(note);

    // Determine target directory
    let targetDir = this.dirHandle;
    if (note.collectionId && this.collectionDirs.has(note.collectionId)) {
      targetDir = this.collectionDirs.get(note.collectionId)!;
    }

    // Write file
    const fileHandle = await targetDir.getFileHandle(filename, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(markdown);
    await writable.close();

    // Update last modified time
    const file = await fileHandle.getFile();
    this.lastModifiedTimes.set(note.id, file.lastModified);
  }

  async syncDeleteToFile(noteId: string, note: Note): Promise<void> {
    if (!this.dirHandle) return;

    try {
      const filename = getFilenameForNote(note);

      // Determine target directory
      let targetDir = this.dirHandle;
      if (note.collectionId && this.collectionDirs.has(note.collectionId)) {
        targetDir = this.collectionDirs.get(note.collectionId)!;
      }

      // Delete file
      await targetDir.removeEntry(filename);
      this.lastModifiedTimes.delete(noteId);

      await db.settings.update('sync-settings', {
        lastSyncTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to delete file for note ${noteId}:`, error);
    }
  }

  private startWatchingForChanges(): void {
    if (this.syncInterval !== null) {
      return; // Already watching
    }

    this.syncInterval = window.setInterval(() => {
      this.checkForExternalChanges();
    }, this.POLL_INTERVAL);
  }

  private stopWatchingForChanges(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async checkForExternalChanges(): Promise<void> {
    if (!this.dirHandle) return;

    try {
      // Scan all markdown files
      await this.scanForChanges(this.dirHandle, null);

      // Scan collection directories
      for (const [collectionId, dirHandle] of this.collectionDirs.entries()) {
        await this.scanForChanges(dirHandle, collectionId);
      }
    } catch (error) {
      console.error('Error checking for external changes:', error);
    }
  }

  private async scanForChanges(
    dirHandle: FileSystemDirectoryHandle,
    collectionId: string | null
  ): Promise<void> {
    // @ts-ignore - File System Access API types
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const importedNote = markdownToNote(entry.name, content);

          // Override collection if in collection folder
          if (collectionId) {
            importedNote.collectionId = collectionId;
          }

          // Check if file was modified externally
          const lastModified = this.lastModifiedTimes.get(importedNote.id);
          if (!lastModified || file.lastModified > lastModified) {
            // File was modified externally, update database
            const existingNote = await db.notes.get(importedNote.id);

            if (existingNote) {
              // Update existing note
              await db.notes.update(importedNote.id, {
                title: importedNote.title,
                content: importedNote.content,
                domain: importedNote.domain,
                date: importedNote.date,
                collectionId: importedNote.collectionId,
                collectionIds: importedNote.collectionIds,
                isPinned: importedNote.isPinned,
              });
              console.log(
                `Updated note from external change: ${importedNote.id}`
              );
            } else {
              // New file, add to database
              await db.notes.add(importedNote);
              console.log(
                `Added new note from external file: ${importedNote.id}`
              );
            }

            // Update last modified time
            this.lastModifiedTimes.set(importedNote.id, file.lastModified);
          }
        } catch (error) {
          console.error(`Failed to process file ${entry.name}:`, error);
        }
      }
    }
  }

  async getSyncStatus(): Promise<SyncSettings | null> {
    try {
      return await db.settings.get('sync-settings');
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return null;
    }
  }

  isSyncEnabled(): boolean {
    return this.dirHandle !== null;
  }

  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.dirHandle;
  }

  // ========== Cloud Sync Methods ==========

  /**
   * Initialize cloud sync if already enabled (called on app load)
   */
  async initializeCloudSync(): Promise<void> {
    const settings = await this.getSyncStatus();
    if (settings?.cloudSyncEnabled && authService.isAuthenticated()) {
      this.startCloudSync();
      // Don't perform sync immediately on init, let it happen naturally
    }
  }

  /**
   * Enable cloud sync (Jottin Cloud)
   */
  async enableCloudSync(): Promise<void> {
    if (!authService.isAuthenticated()) {
      throw new Error('User must be authenticated to enable cloud sync');
    }

    await db.settings.update('sync-settings', {
      cloudSyncEnabled: true,
      lastCloudSyncTime: new Date().toISOString(),
    });

    // Start periodic sync
    this.startCloudSync();

    // Perform initial sync
    await this.performCloudSync();
  }

  /**
   * Disable cloud sync
   */
  async disableCloudSync(): Promise<void> {
    this.stopCloudSync();

    await db.settings.update('sync-settings', {
      cloudSyncEnabled: false,
    });
  }

  /**
   * Start periodic cloud sync
   */
  private startCloudSync(): void {
    if (this.cloudSyncInterval !== null) {
      return; // Already running
    }

    this.cloudSyncInterval = window.setInterval(() => {
      this.performCloudSync().catch(err => {
        console.error('Cloud sync error:', err);
      });
    }, this.CLOUD_SYNC_INTERVAL);
  }

  /**
   * Stop periodic cloud sync
   */
  private stopCloudSync(): void {
    if (this.cloudSyncInterval !== null) {
      clearInterval(this.cloudSyncInterval);
      this.cloudSyncInterval = null;
    }
  }

  /**
   * Perform cloud sync: push local changes and pull remote changes
   */
  async performCloudSync(): Promise<void> {
    if (this.isCloudSyncing) {
      return; // Already syncing
    }

    if (!authService.isAuthenticated()) {
      return;
    }

    const settings = await this.getSyncStatus();
    if (!settings?.cloudSyncEnabled) {
      return;
    }

    this.isCloudSyncing = true;

    try {
      // Get all local notes and collections
      const localNotes = await db.notes.toArray();
      const localCollections = await db.collections.toArray();

      // Encrypt notes before sending
      const encryptedNotes = await Promise.all(
        localNotes.map(async note => {
          const { encrypted, iv } = await encryptionService.encrypt(
            note.content
          );
          return {
            id: note.id,
            userId: authService.getUserId()!,
            title: note.title,
            contentEncrypted: encrypted,
            contentIV: iv,
            domain: note.domain,
            date: new Date(note.date),
            isPinned: note.isPinned || false,
            collectionIds:
              note.collectionIds ||
              (note.collectionId ? [note.collectionId] : []),
            createdAt: new Date(note.date),
            updatedAt: new Date(note.date),
            deletedAt: undefined,
          };
        })
      );

      const syncCollections = localCollections.map(coll => ({
        id: coll.id,
        userId: authService.getUserId()!,
        name: coll.name,
        icon: coll.icon,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Get last sync time
      const since = settings.lastCloudSyncTime
        ? new Date(settings.lastCloudSyncTime)
        : undefined;

      // Push changes to server
      const pushResponse = await apiClient.post('/api/sync/push', {
        notes: encryptedNotes,
        collections: syncCollections,
        since: since?.toISOString(),
      });

      if (!pushResponse.ok) {
        throw new Error(`Sync push failed: ${pushResponse.statusText}`);
      }

      const syncResponse = await pushResponse.json();

      // Decrypt and merge remote notes
      for (const remoteNote of syncResponse.notes || []) {
        try {
          // Skip if deleted
          if (remoteNote.deletedAt) {
            const existing = await db.notes.get(remoteNote.id);
            if (existing) {
              await db.notes.delete(remoteNote.id);
            }
            continue;
          }

          // Decrypt content
          const decryptedContent = await encryptionService.decrypt(
            remoteNote.contentEncrypted,
            remoteNote.contentIV
          );

          // Check if local note is newer
          const localNote = await db.notes.get(remoteNote.id);
          const remoteUpdated = new Date(remoteNote.updatedAt);
          const localUpdated = localNote
            ? new Date(localNote.date)
            : new Date(0);

          // Merge: use newer version (simple conflict resolution)
          if (!localNote || remoteUpdated >= localUpdated) {
            const mergedNote: Note = {
              id: remoteNote.id,
              title: remoteNote.title,
              content: decryptedContent,
              domain: remoteNote.domain,
              date: new Date(remoteNote.date).toISOString(),
              isPinned: remoteNote.isPinned,
              collectionIds: remoteNote.collectionIds || [],
            };

            if (localNote) {
              await db.notes.update(remoteNote.id, {
                title: mergedNote.title,
                content: mergedNote.content,
                domain: mergedNote.domain,
                date: mergedNote.date,
                collectionIds: mergedNote.collectionIds,
                isPinned: mergedNote.isPinned,
              });
            } else {
              await db.notes.add(mergedNote);
            }
          }
        } catch (error) {
          console.error(`Failed to merge remote note ${remoteNote.id}:`, error);
        }
      }

      // Merge collections
      for (const remoteColl of syncResponse.collections || []) {
        const existing = await db.collections.get(remoteColl.id);
        if (existing) {
          await db.collections.update(remoteColl.id, {
            name: remoteColl.name,
            icon: remoteColl.icon,
          });
        } else {
          await db.collections.add({
            id: remoteColl.id,
            name: remoteColl.name,
            icon: remoteColl.icon,
          });
        }
      }

      // Update last sync time
      const lastSync = syncResponse.lastSync
        ? new Date(syncResponse.lastSync)
        : new Date();
      this.lastCloudSyncTime = lastSync.toISOString();

      await db.settings.update('sync-settings', {
        lastCloudSyncTime: this.lastCloudSyncTime,
      });
    } catch (error) {
      console.error('Cloud sync failed:', error);
      throw error;
    } finally {
      this.isCloudSyncing = false;
    }
  }

  /**
   * Sync a single note to cloud (called when note is updated)
   */
  async syncNoteToCloud(note: Note): Promise<void> {
    const settings = await this.getSyncStatus();
    if (!settings?.cloudSyncEnabled || !authService.isAuthenticated()) {
      return;
    }

    try {
      const { encrypted, iv } = await encryptionService.encrypt(note.content);

      const syncNote = {
        id: note.id,
        userId: authService.getUserId()!,
        title: note.title,
        contentEncrypted: encrypted,
        contentIV: iv,
        domain: note.domain,
        date: new Date(note.date),
        isPinned: note.isPinned || false,
        collectionIds:
          note.collectionIds || (note.collectionId ? [note.collectionId] : []),
        createdAt: new Date(note.date),
        updatedAt: new Date(),
        deletedAt: undefined,
      };

      await apiClient.post('/api/sync/push', {
        notes: [syncNote],
        collections: [],
      });
    } catch (error) {
      console.error(`Failed to sync note ${note.id} to cloud:`, error);
    }
  }

  /**
   * Sync note deletion to cloud
   */
  async syncDeleteToCloud(noteId: string): Promise<void> {
    const settings = await this.getSyncStatus();
    if (!settings?.cloudSyncEnabled || !authService.isAuthenticated()) {
      return;
    }

    try {
      const note = await db.notes.get(noteId);
      if (!note) return;

      const syncNote = {
        id: noteId,
        userId: authService.getUserId()!,
        title: note.title,
        contentEncrypted: '',
        contentIV: '',
        domain: note.domain,
        date: new Date(note.date),
        isPinned: false,
        collectionIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };

      await apiClient.post('/api/sync/push', {
        notes: [syncNote],
        collections: [],
      });
    } catch (error) {
      console.error(`Failed to sync note deletion ${noteId} to cloud:`, error);
    }
  }

  /**
   * Manual sync trigger (for "Sync Now" button)
   */
  async manualCloudSync(): Promise<void> {
    await this.performCloudSync();
  }
}

export const syncManager = new SyncManager();
