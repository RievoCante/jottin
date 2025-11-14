import React from 'react';
import {
  Sidebar,
  MainContent,
  HeadsUp,
  NoteList,
  MobileHeader,
  FloatingActionButton,
} from './components/layout';
import { SearchModal, Settings } from './components/modals';
import { SyncStatus, LoadingSpinner } from './components/ui';
import { useAppData } from './hooks/useAppData';
import { useUIState } from './hooks/useUIState';
import { useHeadsUp } from './hooks/useHeadsUp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNoteOperations } from './hooks/useNoteOperations';
import { getDisplayedNotes } from './utils/notes';

const App: React.FC = () => {
  // Data management
  const appData = useAppData();

  // UI state management
  const uiState = useUIState(appData.notes, appData.collections);

  // HeadsUp panel state
  const headsUp = useHeadsUp();

  // Complex note operations
  const noteOperations = useNoteOperations(appData, uiState, headsUp);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => uiState.setIsSearchModalOpen(true),
  });

  // Handle note creation with auto-selection
  const handleCreateNote = async (content: string, title?: string) => {
    const noteId = await appData.createNote(
      content,
      title,
      uiState.activeCollectionId
    );
    uiState.selectNote(noteId);
  };

  // Get displayed notes based on active collection
  const displayedNotes = getDisplayedNotes(
    appData.notes,
    uiState.activeCollectionId
  );

  // Loading state
  if (appData.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-gray-100 dark:bg-[#171717] min-h-screen text-gray-900 dark:text-gray-300 font-sans flex antialiased">
      {/* Mobile Overlay */}
      {(uiState.isMobileSidebarOpen || uiState.isMobileHeadsUpOpen) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={uiState.closeMobilePanels}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${uiState.isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          collections={appData.collections}
          notes={appData.notes}
          activeNoteId={uiState.activeNote?.id}
          activeCollectionId={uiState.activeCollectionId}
          onNoteSelect={note => {
            uiState.selectNote(note.id);
            uiState.setIsMobileSidebarOpen(false);
          }}
          onCollectionSelect={collectionId => {
            uiState.selectCollection(collectionId);
            uiState.setIsMobileSidebarOpen(false);
          }}
          onCreateNote={() => {
            handleCreateNote('');
            uiState.setIsMobileSidebarOpen(false);
          }}
          onImportNotes={appData.importNotes}
          onSyncStatusChange={appData.setSyncEnabled}
          isSettingsOpen={uiState.isSettingsOpen}
          setIsSettingsOpen={uiState.setIsSettingsOpen}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <MobileHeader
          onToggleSidebar={() =>
            uiState.setIsMobileSidebarOpen(!uiState.isMobileSidebarOpen)
          }
          onToggleHeadsUp={() =>
            uiState.setIsMobileHeadsUpOpen(!uiState.isMobileHeadsUpOpen)
          }
        />

        {/* Sync Status Indicator */}
        <div className="absolute top-4 right-4 z-10 hidden lg:block">
          <SyncStatus isSyncEnabled={appData.isSyncEnabled} />
        </div>

        {uiState.activeNote ? (
          <MainContent
            key={uiState.activeNote.id}
            note={uiState.activeNote}
            collections={appData.collections}
            onNoteChange={noteOperations.handleNoteChange}
            createNewNote={handleCreateNote}
            onCleanUp={noteOperations.handleCleanUpNote}
            onTogglePin={() => appData.togglePinNote(uiState.activeNote!.id)}
            onDelete={() =>
              noteOperations.handleDeleteNote(uiState.activeNote!.id)
            }
            onGoHome={noteOperations.handleGoHome}
          />
        ) : (
          <NoteList
            notes={displayedNotes}
            onNoteSelect={uiState.selectNote}
            onCreateNote={() => handleCreateNote('')}
            collection={uiState.activeCollection}
            collections={appData.collections}
            onPinNote={appData.togglePinNote}
            onOrganizeNote={noteId => uiState.selectNote(noteId)}
            onDeleteNote={noteOperations.handleDeleteNote}
            onOpenSearch={() => uiState.setIsSearchModalOpen(true)}
          />
        )}
      </main>

      {/* HeadsUp Panel */}
      <div
        className={`
          fixed lg:static inset-y-0 right-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${uiState.isMobileHeadsUpOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          ${uiState.isMobileHeadsUpOpen ? 'block' : 'hidden'}
          lg:block
        `}
      >
        <HeadsUp
          notesContext={appData.notes}
          activeNote={uiState.activeNote}
          relevantNotes={headsUp.relevantNotes}
          isLoading={headsUp.isLoadingHeadsUp}
          width={headsUp.headsUpWidth}
          onResizeStart={headsUp.handleMouseDownResize}
          onOpenSettings={() => uiState.setIsSettingsOpen(true)}
        />
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={() => handleCreateNote('')} />

      {/* Modals */}
      <SearchModal
        isOpen={uiState.isSearchModalOpen}
        onClose={() => uiState.setIsSearchModalOpen(false)}
        notes={appData.notes}
        collections={appData.collections}
        onNoteSelect={uiState.selectNote}
      />

      <Settings
        isOpen={uiState.isSettingsOpen}
        onClose={() => uiState.setIsSettingsOpen(false)}
        collections={appData.collections}
        onSyncStatusChange={appData.setSyncEnabled}
      />
    </div>
  );
};

export default App;
