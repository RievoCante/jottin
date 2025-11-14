// Settings component for sync configuration
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faFolder,
  faSync,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import { syncManager } from '../../services/syncManager';
import { Collection } from '../../types';
import { db } from '../../services/database';
import { SignedIn } from '@clerk/clerk-react';
import RequireAuthNotice from '../ui/RequireAuthNotice';
import llmService from '../../services/llmService';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSyncStatusChange?: (enabled: boolean) => void;
}

// Pass onSyncStatusChange from App.tsx when Settings is wired up

const Settings: React.FC<SettingsProps> = ({
  isOpen,
  onClose,
  collections,
  onSyncStatusChange,
}) => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncFolderName, setSyncFolderName] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [isEnablingSync, setIsEnablingSync] = useState(false);

  // AI Provider Settings
  const [aiProvider, setAiProvider] = useState<
    'gemini' | 'openai' | 'ollama' | undefined
  >(undefined);
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    loadSyncSettings();
    loadAISettings();
  }, [isOpen]);

  const loadSyncSettings = async () => {
    const settings = await syncManager.getSyncStatus();
    if (settings) {
      setSyncEnabled(settings.syncEnabled);
      setSyncFolderName(settings.syncFolderName || '');
      setLastSyncTime(settings.lastSyncTime || '');
      setEncryptionEnabled(settings.encryptionEnabled);
    }
  };

  const loadAISettings = async () => {
    const settings = await db.settings.get('sync-settings');
    if (settings) {
      setAiProvider(settings.aiProvider);
      setApiKey(settings.aiApiKey || '');
    }
  };

  const handleEnableSync = async () => {
    setIsEnablingSync(true);
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      if (dirHandle) {
        await syncManager.enableFolderSync(dirHandle, collections);
        setSyncEnabled(true);
        setSyncFolderName(dirHandle.name);
        setLastSyncTime(new Date().toISOString());

        if (onSyncStatusChange) {
          onSyncStatusChange(true);
        }

        alert('Folder sync enabled successfully!');
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('User cancelled folder selection');
      } else {
        console.error('Failed to enable sync:', error);
        const errorMessage = (error as Error).message;

        if (errorMessage?.includes('system files')) {
          alert(
            '⚠️ Protected Folder\n\n' +
              'This folder is protected by your system (Downloads, Documents, Desktop, etc.).\n\n' +
              '💡 Solution:\n' +
              '1. Create a new folder like "JottinNotes" inside Downloads\n' +
              '2. Or choose a different location like your home folder\n' +
              '3. Then try enabling sync again'
          );
        } else {
          alert('Failed to enable sync. Please try again.');
        }
      }
    } finally {
      setIsEnablingSync(false);
    }
  };

  const handleDisableSync = async () => {
    if (confirm('Are you sure you want to disable folder sync?')) {
      try {
        await syncManager.disableFolderSync();
        setSyncEnabled(false);
        setSyncFolderName('');

        if (onSyncStatusChange) {
          onSyncStatusChange(false);
        }

        alert('Folder sync disabled successfully!');
      } catch (error) {
        console.error('Failed to disable sync:', error);
        alert('Failed to disable sync. Please try again.');
      }
    }
  };

  const handleToggleEncryption = async () => {
    const newValue = !encryptionEnabled;

    if (newValue) {
      alert(
        'Encryption feature is prepared for cloud sync but not yet fully implemented. Enable encryption in Phase 4.'
      );
      return;
    }

    try {
      await db.settings.update('sync-settings', {
        encryptionEnabled: newValue,
      });
      setEncryptionEnabled(newValue);
    } catch (error) {
      console.error('Failed to toggle encryption:', error);
    }
  };

  const formatSyncTime = (isoString: string) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const handleTestApiKey = async () => {
    if (!apiKey || !aiProvider) return;

    setIsValidating(true);
    setValidationStatus('idle');

    const result = await llmService.validateApiKey(aiProvider, apiKey);

    setIsValidating(false);

    if (result.valid) {
      setValidationStatus('success');
      setValidationMessage(result.message || 'API key is valid!');

      // Auto-save settings when key is valid
      await handleSaveAISettings();
    } else {
      setValidationStatus('error');
      setValidationMessage(result.error || 'Invalid API key');
    }
  };

  const handleRemoveApiKey = async () => {
    if (confirm('Are you sure you want to remove your API key?')) {
      setApiKey('');
      setValidationStatus('idle');
      setValidationMessage('');
      await db.settings.update('sync-settings', {
        aiProvider: undefined,
        aiApiKey: '',
      });
    }
  };

  const handleSaveAISettings = async () => {
    try {
      await db.settings.update('sync-settings', {
        aiProvider,
        aiApiKey: apiKey,
      });

      if (validationStatus === 'success') {
        alert('API key validated and saved successfully!');
      } else {
        alert('AI settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      alert('Failed to save AI settings. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-9999">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FontAwesomeIcon
              icon={faXmark}
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Folder Sync Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faFolder} className="w-5 h-5" />
              Folder Sync
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Enable Folder Sync
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically sync notes to a local folder as markdown files
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncEnabled}
                    onChange={
                      syncEnabled ? handleDisableSync : handleEnableSync
                    }
                    disabled={isEnablingSync}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {syncEnabled && (
                <>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sync Folder
                      </span>
                      <button
                        onClick={handleEnableSync}
                        disabled={isEnablingSync}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                      >
                        Change
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {syncFolderName || 'No folder selected'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FontAwesomeIcon
                        icon={faSync}
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Last Synced
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatSyncTime(lastSyncTime)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Encryption Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faLock} className="w-5 h-5" />
              Encryption (Coming Soon)
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between opacity-50">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Encrypt Synced Files
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Protect your notes with AES-256 encryption
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-not-allowed">
                  <input
                    type="checkbox"
                    checked={encryptionEnabled}
                    onChange={handleToggleEncryption}
                    disabled
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* AI Provider Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              AI Provider Configuration
            </h3>

            <RequireAuthNotice
              message="Sign in to configure AI providers, connect local LLMs, or subscribe to premium services."
              buttonText="Sign in to configure AI"
              className="mb-4"
              variant="minimal"
            />

            <SignedIn>
              <div className="space-y-4">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Choose AI Provider
                  </label>
                  <div className="space-y-3">
                    {/* Option 1: Gemini API */}
                    <label
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        aiProvider === 'gemini'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="aiProvider"
                        value="gemini"
                        checked={aiProvider === 'gemini'}
                        onChange={() => setAiProvider('gemini')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            Google Gemini API
                          </p>
                          {aiProvider === 'gemini' &&
                            apiKey &&
                            validationStatus === 'success' && (
                              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Active
                              </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Use your own Gemini API key (fastest & most capable)
                        </p>
                      </div>
                    </label>

                    {/* Option 2: OpenAI API */}
                    <label
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        aiProvider === 'openai'
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="aiProvider"
                        value="openai"
                        checked={aiProvider === 'openai'}
                        onChange={() => setAiProvider('openai')}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            OpenAI API
                          </p>
                          {aiProvider === 'openai' &&
                            apiKey &&
                            validationStatus === 'success' && (
                              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Active
                              </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Use your own OpenAI API key (GPT-4 & GPT-3.5)
                        </p>
                      </div>
                    </label>

                    {/* Option 3: Ollama (Disabled - Future) */}
                    <div className="flex items-start p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg opacity-50 cursor-not-allowed">
                      <input type="radio" disabled className="mt-1 mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Ollama (Local LLM)
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Coming soon - Run AI locally on your machine
                        </p>
                      </div>
                    </div>

                    {/* Option 4: Subscription (Disabled - Future) */}
                    <div className="flex items-start p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg opacity-50 cursor-not-allowed">
                      <input type="radio" disabled className="mt-1 mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Jottin Pro Subscription
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Coming soon - No API key needed, just subscribe
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Key Input (shown when Gemini or OpenAI selected) */}
                {(aiProvider === 'gemini' || aiProvider === 'openai') && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={e => {
                          setApiKey(e.target.value);
                          setValidationStatus('idle'); // Reset validation on change
                        }}
                        placeholder="Enter your API key"
                        className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleTestApiKey}
                        disabled={!apiKey || isValidating}
                        className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {isValidating ? 'Testing...' : 'Test'}
                      </button>
                      {apiKey && (
                        <button
                          onClick={handleRemoveApiKey}
                          className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Validation Status */}
                    {validationStatus !== 'idle' && (
                      <div
                        className={`mt-3 p-3 rounded-lg text-sm flex items-center gap-2 ${
                          validationStatus === 'success'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        <span className="font-medium">
                          {validationStatus === 'success' ? '✓' : '✗'}
                        </span>
                        <span>{validationMessage}</span>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Get your API key from{' '}
                      {aiProvider === 'gemini' ? (
                        <a
                          href="https://makersuite.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Google AI Studio
                        </a>
                      ) : (
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          OpenAI Platform
                        </a>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </SignedIn>
          </div>

          {/* Info Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                About Folder Sync
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Notes are saved as markdown files with frontmatter</li>
                <li>• Collections become folders</li>
                <li>• Changes sync automatically (300ms debounce)</li>
                <li>• External changes are detected every 5 seconds</li>
                <li>
                  • Works like Obsidian - files are portable and human-readable
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
