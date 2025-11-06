// Data models for the application
package models

type Note struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	Date         string `json:"date"`
	IsPinned     bool   `json:"isPinned,omitempty"`
	CollectionID string `json:"collectionId,omitempty"`
}

type ChatRequest struct {
	Prompt       string `json:"prompt"`
	ContextNotes []Note `json:"contextNotes"`
}

type RelevantNotesRequest struct {
	CurrentContent string `json:"currentContent"`
	AllNotes       []Note `json:"allNotes"`
}

type CleanupRequest struct {
	Content string `json:"content"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type RelevantNotesResponse struct {
	RelevantNoteIds []string `json:"relevantNoteIds"`
}

