// Real-time filesystem sync manager and cloud sync manager
import { Note, Collection } from '../../types';
import { SyncSettings } from '../database';
import { FileSystemSync } from './FileSystemSync';
import { CloudSync } from './CloudSync';

export class SyncManager {
  private fileSystemSync: FileSystemSync;
  private cloudSync: CloudSync;

  constructor() {
    this.fileSystemSync = new FileSystemSync();
    this.cloudSync = new CloudSync();
  }

  // ========== File System Sync Delegates ==========

  async enableFolderSync(
    dirHandle: FileSystemDirectoryHandle,
    collections: Collection[]
  ): Promise<void> {
    return this.fileSystemSync.enableFolderSync(dirHandle, collections);
  }

  async disableFolderSync(): Promise<void> {
    return this.fileSystemSync.disableFolderSync();
  }

  async syncNoteToFile(note: Note): Promise<void> {
    return this.fileSystemSync.syncNoteToFile(note);
  }

  async syncDeleteToFile(noteId: string, note: Note): Promise<void> {
    return this.fileSystemSync.syncDeleteToFile(noteId, note);
  }

  isSyncEnabled(): boolean {
    return this.fileSystemSync.isSyncEnabled();
  }

  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.fileSystemSync.getDirectoryHandle();
  }

  // ========== Cloud Sync Delegates ==========

  async getSyncStatus(): Promise<SyncSettings | null> {
    return this.cloudSync.getSyncStatus();
  }

  async initializeCloudSync(): Promise<void> {
    return this.cloudSync.initializeCloudSync();
  }

  async enableCloudSync(): Promise<void> {
    return this.cloudSync.enableCloudSync();
  }

  async disableCloudSync(): Promise<void> {
    return this.cloudSync.disableCloudSync();
  }

  async performCloudSync(): Promise<void> {
    return this.cloudSync.performCloudSync();
  }

  async syncNoteToCloud(note: Note): Promise<void> {
    return this.cloudSync.syncNoteToCloud(note);
  }

  async syncDeleteToCloud(noteId: string): Promise<void> {
    return this.cloudSync.syncDeleteToCloud(noteId);
  }

  async syncCollectionToCloud(collection: Collection): Promise<void> {
    return this.cloudSync.syncCollectionToCloud(collection);
  }

  async manualCloudSync(): Promise<void> {
    return this.cloudSync.manualCloudSync();
  }
}

export const syncManager = new SyncManager();
