// Database service for Neon PostgreSQL connection
package services

import (
	"backend/models"
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Database provides database connection and operations
type Database struct {
	DB *sql.DB
}

// NewDatabase creates a new Database instance and connects to Neon PostgreSQL
func NewDatabase() (*Database, error) {
	// Get connection string from environment
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	// Open connection
	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		// If ping fails, close the connection before returning to prevent leaks
		if closeErr := db.Close(); closeErr != nil {
			log.Printf("Failed to close database connection during failed ping: %v", closeErr)
		}
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{DB: db}, nil
}

// Close the database connection
func (d *Database) Close() error {
	return d.DB.Close()
}

// EnsureUser creates a user record if it doesn't exist
func (d *Database) EnsureUser(ctx context.Context, userID, email string) error {
	query := `
		INSERT INTO users (id, email, created_at, updated_at)
		VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = CURRENT_TIMESTAMP
	`
	_, err := d.DB.ExecContext(ctx, query, userID, email)
	return err
}

// FindSimilarNotes finds notes similar to the given embedding
func (d *Database) FindSimilarNotes(ctx context.Context, embedding []float32, limit int, userID string) ([]models.DBNote, error) {
	// Format embedding as string "[x,y,z]" for pgvector
	var embeddingStrs []string
	for _, v := range embedding {
		embeddingStrs = append(embeddingStrs, fmt.Sprintf("%f", v))
	}
	embeddingStr := "[" + strings.Join(embeddingStrs, ",") + "]"

	query := `
		SELECT id, user_id, title, content_encrypted, content_iv, domain, date, is_pinned, created_at, updated_at, deleted_at
		FROM notes
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY embedding <=> $2
		LIMIT $3
	`
	rows, err := d.DB.QueryContext(ctx, query, userID, embeddingStr, limit)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			log.Printf("Error closing rows: %v", err)
		}
	}()

	var notes []models.DBNote
	for rows.Next() {
		var note models.DBNote
		var domain sql.NullString
		var deletedAt sql.NullTime
		var contentEncryptedBytes []byte
		var contentIVBytes []byte

		err := rows.Scan(
			&note.ID, &note.UserID, &note.Title, &contentEncryptedBytes, &contentIVBytes,
			&domain, &note.Date, &note.IsPinned, &note.CreatedAt, &note.UpdatedAt, &deletedAt,
		)
		if err != nil {
			log.Printf("Error scanning note: %v", err)
			continue
		}

		note.ContentEncrypted = contentEncryptedBytes
		note.ContentIV = contentIVBytes

		if domain.Valid {
			note.Domain = &domain.String
		}
		if deletedAt.Valid {
			note.DeletedAt = &deletedAt.Time
		}

		notes = append(notes, note)
	}

	return notes, nil
}
