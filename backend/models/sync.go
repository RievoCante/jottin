// Sync-related data models
package models

import "time"

// SyncNote represents a note in sync operations
type SyncNote struct {
	ID               string     `json:"id"`
	UserID           string     `json:"userId"`
	Title            string     `json:"title"`
	ContentEncrypted string     `json:"contentEncrypted"` // Base64 encoded encrypted content (as string)
	ContentIV        string     `json:"contentIV"`        // Base64 encoded IV (as string)
	Domain           *string    `json:"domain,omitempty"`
	Date             time.Time  `json:"date"`
	IsPinned         bool       `json:"isPinned"`
	CollectionIDs    []string   `json:"collectionIds,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	DeletedAt        *time.Time `json:"deletedAt,omitempty"`
}

// SyncCollection represents a collection in sync operations
type SyncCollection struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// SyncRequest represents a batch sync request
type SyncRequest struct {
	Notes       []SyncNote       `json:"notes"`
	Collections []SyncCollection `json:"collections"`
	Since       *time.Time       `json:"since,omitempty"` // Only sync changes since this time
}

// SyncResponse represents the response from sync endpoint
type SyncResponse struct {
	Notes       []SyncNote       `json:"notes"`
	Collections []SyncCollection `json:"collections"`
	LastSync    time.Time        `json:"lastSync"`
}

// DBNote represents a note in the database (for internal use)
type DBNote struct {
	ID               string
	UserID           string
	Title            string
	ContentEncrypted []byte
	ContentIV        []byte
	Domain           *string
	Date             time.Time
	IsPinned         bool
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        *time.Time
}

// DBCollection represents a collection in the database (for internal use)
type DBCollection struct {
	ID        string
	UserID    string
	Name      string
	Icon      string
	CreatedAt time.Time
	UpdatedAt time.Time
}
