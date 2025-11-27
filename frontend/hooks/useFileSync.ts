// Custom hook for file sync state management
import { useState, useEffect } from 'react';
import { db } from '../services/database';
import { syncManager } from '../services/sync/syncManager';

export function useFileSync() {
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [syncFolderName, setSyncFolderName] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadSyncStatus();

    // Subscribe to sync state changes
    const unsubscribe = syncManager.subscribeToSyncState(isSyncing => {
      setIsSyncing(isSyncing);
      if (!isSyncing) {
        // Refresh status when sync finishes to get new lastSyncTime
        loadSyncStatus();
      }
    });

    // Set initial state
    setIsSyncing(syncManager.isCloudSyncing());

    return () => unsubscribe();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const settings = await db.settings.get('sync-settings');
      if (settings) {
        setIsSyncEnabled(settings.syncEnabled || settings.cloudSyncEnabled);
        setSyncFolderName(settings.syncFolderName || '');
        setLastSyncTime(
          settings.lastCloudSyncTime || settings.lastSyncTime || ''
        );
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const refreshSyncStatus = () => {
    loadSyncStatus();
  };

  return {
    isSyncEnabled,
    syncFolderName,
    lastSyncTime,
    isSyncing,
    setIsSyncEnabled,
    refreshSyncStatus,
  };
}
