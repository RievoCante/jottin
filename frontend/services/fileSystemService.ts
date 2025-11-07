// File System Access API service for reading/writing markdown files
import { Note, Collection } from '../types';
import {
  noteToMarkdown,
  markdownToNote,
  getFilenameForNote,
} from '../utils/markdownConverter';

export class FileSystemService {
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  async selectFolder(): Promise<FileSystemDirectoryHandle | null> {
    try {
      // @ts-ignore - File System Access API types
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
      return this.directoryHandle;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('User cancelled folder selection');
      } else if ((error as Error).message?.includes('system files')) {
        // Special handling for protected folders
        throw new Error(
          'PROTECTED_FOLDER: This folder is protected by your system. Please create a subfolder (e.g., "Downloads/JottinNotes") or choose a different location.'
        );
      } else {
        console.error('Error selecting folder:', error);
        throw error;
      }
      return null;
    }
  }

  async exportToFolder(
    notes: Note[],
    collections: Collection[],
    dirHandle: FileSystemDirectoryHandle
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      // Create .jottin metadata folder
      const metadataDir = await dirHandle.getDirectoryHandle('.jottin', {
        create: true,
      });

      // Save collections metadata
      const collectionsData = JSON.stringify(collections, null, 2);
      const collectionsFile = await metadataDir.getFileHandle(
        'collections.json',
        { create: true }
      );
      const collectionsWritable = await collectionsFile.createWritable();
      await collectionsWritable.write(collectionsData);
      await collectionsWritable.close();

      // Create collection directories
      const collectionDirs = new Map<string, FileSystemDirectoryHandle>();
      for (const collection of collections) {
        const collectionDir = await dirHandle.getDirectoryHandle(
          collection.name,
          { create: true }
        );
        collectionDirs.set(collection.id, collectionDir);
      }

      // Export each note
      for (const note of notes) {
        try {
          const markdown = noteToMarkdown(note);
          const filename = getFilenameForNote(note);

          // Determine which directory to use
          let targetDir = dirHandle;
          if (note.collectionId && collectionDirs.has(note.collectionId)) {
            targetDir = collectionDirs.get(note.collectionId)!;
          }

          // Write file
          const fileHandle = await targetDir.getFileHandle(filename, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(markdown);
          await writable.close();

          success++;
        } catch (error) {
          console.error(`Failed to export note ${note.id}:`, error);
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      console.error('Error exporting to folder:', error);
      return { success, failed };
    }
  }

  async importFromFolder(
    dirHandle: FileSystemDirectoryHandle
  ): Promise<{ notes: Note[]; collections: Collection[] }> {
    const notes: Note[] = [];
    const collections: Collection[] = [];

    try {
      // Try to load collections metadata
      try {
        const metadataDir = await dirHandle.getDirectoryHandle('.jottin');
        const collectionsFile =
          await metadataDir.getFileHandle('collections.json');
        const file = await collectionsFile.getFile();
        const content = await file.text();
        const loadedCollections = JSON.parse(content);
        collections.push(...loadedCollections);
      } catch (error) {
        console.log('No collections metadata found, will scan directories');
      }

      // Scan for markdown files recursively
      await this.scanDirectory(dirHandle, notes, collections, null);

      return { notes, collections };
    } catch (error) {
      console.error('Error importing from folder:', error);
      return { notes, collections };
    }
  }

  async importFromFiles(): Promise<{
    notes: Note[];
    collections: Collection[];
  }> {
    const notes: Note[] = [];
    const collections: Collection[] = [];

    try {
      // @ts-ignore - File System Access API types
      const fileHandles = await window.showOpenFilePicker({
        types: [
          {
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md', '.markdown'],
            },
          },
        ],
        multiple: true,
      });

      for (const fileHandle of fileHandles) {
        try {
          const file = await fileHandle.getFile();
          const content = await file.text();
          const note = markdownToNote(file.name, content);
          notes.push(note);
          console.log(`Successfully imported: ${file.name}`);
        } catch (error) {
          console.error(`Failed to import file ${fileHandle.name}:`, error);
        }
      }

      return { notes, collections };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('User cancelled file selection');
      } else {
        console.error('Error importing files:', error);
      }
      return { notes, collections };
    }
  }

  private async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    notes: Note[],
    collections: Collection[],
    collectionId: string | null
  ): Promise<void> {
    // @ts-ignore - File System Access API types
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const note = markdownToNote(entry.name, content);

          // Override collectionId if we're in a collection folder
          if (collectionId) {
            note.collectionId = collectionId;
          }

          notes.push(note);
          console.log(`Successfully imported: ${entry.name}`);
        } catch (error) {
          console.error(`Failed to import file ${entry.name}:`, error);
        }
      } else if (entry.kind === 'directory' && entry.name !== '.jottin') {
        // Skip certain system/hidden directories
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'backend' ||
          entry.name === 'frontend'
        ) {
          console.log(`Skipping directory: ${entry.name}`);
          continue;
        }

        // Create collection if it doesn't exist
        let collection = collections.find(c => c.name === entry.name);
        if (!collection) {
          collection = {
            id: entry.name.toLowerCase().replace(/\s+/g, '-'),
            name: entry.name,
            icon: '📁',
          };
          collections.push(collection);
        }

        // Recursively scan subdirectory
        await this.scanDirectory(entry, notes, collections, collection.id);
      }
    }
  }

  async checkPermission(
    dirHandle: FileSystemDirectoryHandle
  ): Promise<boolean> {
    // @ts-ignore - File System Access API types
    const options = { mode: 'readwrite' };
    // @ts-ignore - File System Access API types
    if ((await dirHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    // @ts-ignore - File System Access API types
    if ((await dirHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }

  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle;
  }

  setDirectoryHandle(handle: FileSystemDirectoryHandle | null) {
    this.directoryHandle = handle;
  }
}

export const fileSystemService = new FileSystemService();
