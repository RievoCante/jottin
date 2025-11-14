// Sync status indicator component (Google Docs style)
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSync, faCloud } from '@fortawesome/free-solid-svg-icons';
import { syncManager } from '../../services/syncManager';

interface SyncStatusProps {
  isSyncEnabled: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ isSyncEnabled }) => {
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isSyncEnabled) return;

    const loadSyncStatus = async () => {
      const status = await syncManager.getSyncStatus();
      if (status && status.lastSyncTime) {
        setLastSyncTime(status.lastSyncTime);
      }
    };

    loadSyncStatus();

    // Poll for sync status updates
    const interval = setInterval(loadSyncStatus, 2000);

    return () => clearInterval(interval);
  }, [isSyncEnabled]);

  useEffect(() => {
    if (!isSyncEnabled) return;

    // Simulate syncing state (in a real implementation, this would be managed by syncManager)
    const syncTimeout = setTimeout(() => {
      setIsSyncing(false);
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [lastSyncTime, isSyncEnabled]);

  const getTimeAgo = (isoString: string): string => {
    if (!isoString) return '';

    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isSyncEnabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
      {isSyncing ? (
        <>
          <FontAwesomeIcon
            icon={faSync}
            className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400"
          />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <FontAwesomeIcon
            icon={faCheck}
            className="w-3 h-3 text-green-600 dark:text-green-400"
          />
          <span>
            Synced {lastSyncTime ? getTimeAgo(lastSyncTime) : 'recently'}
          </span>
          <FontAwesomeIcon
            icon={faCloud}
            className="w-3 h-3 text-gray-400 dark:text-gray-500"
          />
        </>
      )}
    </div>
  );
};

export default SyncStatus;
