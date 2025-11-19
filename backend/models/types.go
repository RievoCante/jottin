// Data models for the application
package models

// Note represents a note in the application
type Note struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	Date         string `json:"date"`
	IsPinned     bool   `json:"isPinned,omitempty"`
	CollectionID string `json:"collectionId,omitempty"`
}

// ChatRequest represents a chat API request
type ChatRequest struct {
	Provider     string `json:"provider"`
	Prompt       string `json:"prompt"`
	ContextNotes []Note `json:"contextNotes"`
}

// RelevantNotesRequest represents a request to find relevant notes
type RelevantNotesRequest struct {
	Provider       string `json:"provider"`
	CurrentContent string `json:"currentContent"`
	AllNotes       []Note `json:"allNotes"`
}

// CleanupRequest represents a request to clean up note content
type CleanupRequest struct {
	Provider string `json:"provider"`
	Content  string `json:"content"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// RelevantNotesResponse represents a response containing relevant note IDs
type RelevantNotesResponse struct {
	RelevantNoteIds []string `json:"relevantNoteIds"`
}
