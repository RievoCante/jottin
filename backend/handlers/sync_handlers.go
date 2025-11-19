// HTTP handlers for cloud sync endpoints
package handlers

import (
	"backend/models"
	"backend/services"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"time"

)

type SyncHandlers struct {
	db *services.Database
}

func NewSyncHandlers(db *services.Database) *SyncHandlers {
	return &SyncHandlers{db: db}
}

// HandleSyncNotes handles GET /api/sync/notes - fetch notes since last sync
func (h *SyncHandlers) HandleSyncNotes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := GetUserID(r)
	if err != nil {
		respondWithError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get since parameter (optional)
	sinceParam := r.URL.Query().Get("since")
	var since *time.Time
	if sinceParam != "" {
		parsed, err := time.Parse(time.RFC3339, sinceParam)
		if err == nil {
			since = &parsed
		}
	}

	ctx := r.Context()

	// Ensure user exists
	email := r.URL.Query().Get("email") // Optional email from frontend
	if err := h.db.EnsureUser(ctx, userID, email); err != nil {
		log.Printf("Error ensuring user: %v", err)
	}

	// Fetch notes
	notes, err := h.fetchNotes(ctx, userID, since)
	if err != nil {
		log.Printf("Error fetching notes: %v", err)
		respondWithError(w, "Failed to fetch notes", http.StatusInternalServerError)
		return
	}

	// Fetch collections
	collections, err := h.fetchCollections(ctx, userID, since)
	if err != nil {
		log.Printf("Error fetching collections: %v", err)
		respondWithError(w, "Failed to fetch collections", http.StatusInternalServerError)
		return
	}

	respondWithJSON(w, models.SyncResponse{
		Notes:       notes,
		Collections: collections,
		LastSync:    time.Now(),
	}, http.StatusOK)
}

// HandleSyncPush handles POST /api/sync/push - push local changes to server
func (h *SyncHandlers) HandleSyncPush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := GetUserID(r)
	if err != nil {
		respondWithError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding sync request: %v", err)
		respondWithError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// Ensure user exists
	if err := h.db.EnsureUser(ctx, userID, ""); err != nil {
		log.Printf("Error ensuring user: %v", err)
	}

	// Process collections first
	for _, coll := range req.Collections {
		if err := h.upsertCollection(ctx, userID, coll); err != nil {
			log.Printf("Error upserting collection %s: %v", coll.ID, err)
		}
	}

	// Process notes
	for _, note := range req.Notes {
		if note.DeletedAt != nil {
			// Soft delete
			if err := h.deleteNote(ctx, userID, note.ID); err != nil {
				log.Printf("Error deleting note %s: %v", note.ID, err)
			}
		} else {
			// Upsert note
			if err := h.upsertNote(ctx, userID, note); err != nil {
				log.Printf("Error upserting note %s: %v", note.ID, err)
			}
		}
	}

	// Fetch updated notes and collections
	notes, _ := h.fetchNotes(ctx, userID, nil)
	collections, _ := h.fetchCollections(ctx, userID, nil)

	respondWithJSON(w, models.SyncResponse{
		Notes:       notes,
		Collections: collections,
		LastSync:    time.Now(),
	}, http.StatusOK)
}

// Helper functions

func (h *SyncHandlers) fetchNotes(ctx context.Context, userID string, since *time.Time) ([]models.SyncNote, error) {
	var rows *sql.Rows
	var err error

	if since != nil {
		query := `
			SELECT n.id, n.user_id, n.title, n.content_encrypted, n.content_iv, 
			       n.domain, n.date, n.is_pinned, n.created_at, n.updated_at, n.deleted_at
			FROM notes n
			WHERE n.user_id = $1 AND n.updated_at >= $2 AND (n.deleted_at IS NULL OR n.deleted_at >= $2)
			ORDER BY n.updated_at DESC
		`
		rows, err = h.db.DB.QueryContext(ctx, query, userID, *since)
	} else {
		query := `
			SELECT n.id, n.user_id, n.title, n.content_encrypted, n.content_iv, 
			       n.domain, n.date, n.is_pinned, n.created_at, n.updated_at, n.deleted_at
			FROM notes n
			WHERE n.user_id = $1 AND n.deleted_at IS NULL
			ORDER BY n.updated_at DESC
		`
		rows, err = h.db.DB.QueryContext(ctx, query, userID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []models.SyncNote
	for rows.Next() {
		var note models.SyncNote
		var domain sql.NullString
		var deletedAt sql.NullTime
		var contentEncryptedBytes []byte
		var contentIVBytes []byte

		err := rows.Scan(
			&note.ID, &note.UserID, &note.Title, &contentEncryptedBytes, &contentIVBytes,
			&domain, &note.Date, &note.IsPinned, &note.CreatedAt, &note.UpdatedAt, &deletedAt,
		)
		if err != nil {
			continue
		}

		// Convert bytes to base64 strings for JSON response
		note.ContentEncrypted = []byte(base64.StdEncoding.EncodeToString(contentEncryptedBytes))
		note.ContentIV = []byte(base64.StdEncoding.EncodeToString(contentIVBytes))

		if domain.Valid {
			note.Domain = &domain.String
		}
		if deletedAt.Valid {
			note.DeletedAt = &deletedAt.Time
		}

		// Fetch collection IDs for this note
		note.CollectionIDs, _ = h.fetchNoteCollections(ctx, note.ID)

		notes = append(notes, note)
	}

	return notes, nil
}

func (h *SyncHandlers) fetchCollections(ctx context.Context, userID string, since *time.Time) ([]models.SyncCollection, error) {
	var rows *sql.Rows
	var err error

	if since != nil {
		query := `
			SELECT id, user_id, name, icon, created_at, updated_at
			FROM collections
			WHERE user_id = $1 AND updated_at >= $2
			ORDER BY updated_at DESC
		`
		rows, err = h.db.DB.QueryContext(ctx, query, userID, *since)
	} else {
		query := `
			SELECT id, user_id, name, icon, created_at, updated_at
			FROM collections
			WHERE user_id = $1
			ORDER BY updated_at DESC
		`
		rows, err = h.db.DB.QueryContext(ctx, query, userID)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collections []models.SyncCollection
	for rows.Next() {
		var coll models.SyncCollection
		err := rows.Scan(
			&coll.ID, &coll.UserID, &coll.Name, &coll.Icon, &coll.CreatedAt, &coll.UpdatedAt,
		)
		if err != nil {
			continue
		}
		collections = append(collections, coll)
	}

	return collections, nil
}

func (h *SyncHandlers) fetchNoteCollections(ctx context.Context, noteID string) ([]string, error) {
	query := `SELECT collection_id FROM note_collections WHERE note_id = $1`
	rows, err := h.db.DB.QueryContext(ctx, query, noteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var collectionIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			collectionIDs = append(collectionIDs, id)
		}
	}
	return collectionIDs, nil
}

func (h *SyncHandlers) upsertCollection(ctx context.Context, userID string, coll models.SyncCollection) error {
	query := `
		INSERT INTO collections (id, user_id, name, icon, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			icon = EXCLUDED.icon,
			updated_at = EXCLUDED.updated_at
	`
	_, err := h.db.DB.ExecContext(ctx, query, coll.ID, userID, coll.Name, coll.Icon, coll.CreatedAt, coll.UpdatedAt)
	return err
}

func (h *SyncHandlers) upsertNote(ctx context.Context, userID string, note models.SyncNote) error {
	// ContentEncrypted and ContentIV are base64 strings from frontend
	// Decode them to []byte for database storage
	contentEncrypted, err := base64.StdEncoding.DecodeString(string(note.ContentEncrypted))
	if err != nil {
		return err
	}
	contentIV, err := base64.StdEncoding.DecodeString(string(note.ContentIV))
	if err != nil {
		return err
	}

	// Upsert note
	query := `
		INSERT INTO notes (id, user_id, title, content_encrypted, content_iv, domain, date, is_pinned, created_at, updated_at, deleted_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			content_encrypted = EXCLUDED.content_encrypted,
			content_iv = EXCLUDED.content_iv,
			domain = EXCLUDED.domain,
			date = EXCLUDED.date,
			is_pinned = EXCLUDED.is_pinned,
			updated_at = EXCLUDED.updated_at,
			deleted_at = NULL
	`
	_, err = h.db.DB.ExecContext(ctx, query,
		note.ID, userID, note.Title, contentEncrypted, contentIV, note.Domain, note.Date, note.IsPinned,
		note.CreatedAt, note.UpdatedAt,
	)
	if err != nil {
		return err
	}

	// Update note collections
	// Delete existing associations
	_, err = h.db.DB.ExecContext(ctx, `DELETE FROM note_collections WHERE note_id = $1`, note.ID)
	if err != nil {
		return err
	}

	// Insert new associations
	if len(note.CollectionIDs) > 0 {
		query = `INSERT INTO note_collections (note_id, collection_id) VALUES ($1, $2)`
		for _, collID := range note.CollectionIDs {
			_, err = h.db.DB.ExecContext(ctx, query, note.ID, collID)
			if err != nil {
				log.Printf("Error associating note %s with collection %s: %v", note.ID, collID, err)
			}
		}
	}

	return nil
}

func (h *SyncHandlers) deleteNote(ctx context.Context, userID string, noteID string) error {
	query := `UPDATE notes SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`
	_, err := h.db.DB.ExecContext(ctx, query, noteID, userID)
	return err
}

