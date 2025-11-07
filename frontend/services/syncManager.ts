// Real-time filesystem sync manager for markdown files
import { Note, Collection } from '../types';
import { db, SyncSettings } from './database';
import {
  noteToMarkdown,
  markdownToNote,
  getFilenameForNote,
} from '../utils/markdownConverter';

export class SyncManager {
  private syncInterval: number | null = null;
  private pendingWrites: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 300; // ms
  private readonly POLL_INTERVAL = 5000; // ms
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private collectionDirs: Map<string, FileSystemDirectoryHandle> = new Map();
  private lastModifiedTimes: Map<string, number> = new Map();

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
              await db.notes.update(importedNote.id, importedNote);
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
}

export const syncManager = new SyncManager();
