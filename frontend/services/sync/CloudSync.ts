import { Note, Collection } from '../../types';
import { db, SyncSettings } from '../database';
import { apiClient } from '../apiClient';
import { encryptionService } from '../encryption';
import { authService } from '../authService';

export class CloudSync {
  private cloudSyncInterval: number | null = null;
  private readonly CLOUD_SYNC_INTERVAL = 30000; // 30 seconds
  private isCloudSyncing: boolean = false;
  private lastCloudSyncTime: string | null = null;

  async getSyncStatus(): Promise<SyncSettings | null> {
    try {
      return await db.settings.get('sync-settings');
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return null;
    }
  }

  /**
   * Initialize cloud sync if already enabled (called on app load)
   */
  async initializeCloudSync(): Promise<void> {
    const settings = await this.getSyncStatus();
    if (settings?.cloudSyncEnabled && authService.isAuthenticated()) {
      this.startCloudSync();

      // Perform immediate sync if it's been a while or never synced
      // This ensures fresh data on startup
      const lastSync = settings.lastCloudSyncTime
        ? new Date(settings.lastCloudSyncTime)
        : null;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (!lastSync || lastSync < fiveMinutesAgo) {
        console.warn('[Sync] Performing immediate initial sync');
        this.performCloudSync().catch(err => {
          console.error('Initial cloud sync error:', err);
        });
      }
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
      lastCloudSyncTime: undefined, // Reset to ensure full initial sync
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
      // Get last sync time
      const since = settings.lastCloudSyncTime
        ? new Date(settings.lastCloudSyncTime)
        : undefined;

      // =================================================================
      // STEP 1: PULL (Fetch remote changes)
      // =================================================================

      let endpoint = '/api/sync/notes';
      if (since) {
        endpoint += `?since=${since.toISOString()}`;
      }

      const pullResponse = await apiClient.get(endpoint);
      if (!pullResponse.ok) {
        throw new Error(`Sync pull failed: ${pullResponse.statusText}`);
      }

      const pullData = await pullResponse.json();

      // Decrypt and merge remote notes from PULL
      await this.mergeRemoteNotes(pullData.notes);
      await this.mergeRemoteCollections(pullData.collections);

      // =================================================================
      // STEP 2: PUSH (Send local changes)
      // =================================================================

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

      // Push changes to server
      const pushResponse = await apiClient.post('/api/sync/push', {
        notes: encryptedNotes,
        collections: syncCollections,
        since: since?.toISOString(),
      });

      if (!pushResponse.ok) {
        throw new Error(`Sync push failed: ${pushResponse.statusText}`);
      }

      const pushData = await pushResponse.json();

      // Merge any changes returned by push (safeguard)
      await this.mergeRemoteNotes(pushData.notes);
      await this.mergeRemoteCollections(pushData.collections);

      // Update last sync time
      const lastSync = pushData.lastSync
        ? new Date(pushData.lastSync)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async mergeRemoteNotes(remoteNotes: any[]): Promise<void> {
    for (const remoteNote of remoteNotes || []) {
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
        const localUpdated = localNote ? new Date(localNote.date) : new Date(0);

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
        console.warn('[Sync] Failed note details:', {
          id: remoteNote.id,
          contentEncrypted: remoteNote.contentEncrypted,
          contentIV: remoteNote.contentIV,
        });
      }
    }
  }

  private async mergeRemoteCollections(
    remoteCollections: unknown[]
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const remoteColl of (remoteCollections as any[]) || []) {
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
      // Note might be already deleted from DB, so we construct a minimal sync object
      // or rely on what we have. If we don't have the note, we can't sync the deletion
      // properly unless we track deleted IDs separately.
      // For now, if note is missing, we can try to sync just the ID if the backend supports it,
      // but the current backend expects a full struct.
      // If the note is already gone from IndexedDB, we can't get its title/etc.
      // However, for deletion, the backend mainly needs ID and DeletedAt.

      const syncNote = {
        id: noteId,
        userId: authService.getUserId()!,
        title: note?.title || 'Deleted Note', // Fallback
        contentEncrypted: '',
        contentIV: '',
        domain: note?.domain,
        date: new Date(),
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
   * Sync a single collection to cloud (called when collection is created/updated)
   */
  async syncCollectionToCloud(collection: Collection): Promise<void> {
    const settings = await this.getSyncStatus();
    if (!settings?.cloudSyncEnabled || !authService.isAuthenticated()) {
      return;
    }

    try {
      const syncCollection = {
        id: collection.id,
        userId: authService.getUserId()!,
        name: collection.name,
        icon: collection.icon,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await apiClient.post('/api/sync/push', {
        notes: [],
        collections: [syncCollection],
      });
    } catch (error) {
      console.error(
        `Failed to sync collection ${collection.id} to cloud:`,
        error
      );
    }
  }

  /**
   * Manual sync trigger (for "Sync Now" button)
   */
  async manualCloudSync(): Promise<void> {
    await this.performCloudSync();
  }
}
