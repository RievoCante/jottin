// Custom hook for file sync state management
import { useState, useEffect } from 'react';
import { syncManager } from '../services/syncManager';
import { db } from '../services/database';

export function useFileSync() {
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [syncFolderName, setSyncFolderName] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const settings = await db.settings.get('sync-settings');
      if (settings) {
        setIsSyncEnabled(settings.syncEnabled);
        setSyncFolderName(settings.syncFolderName || '');
        setLastSyncTime(settings.lastSyncTime || '');
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
    setIsSyncEnabled,
    refreshSyncStatus,
  };
}
