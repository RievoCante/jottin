// Database service for Neon PostgreSQL connection
package services

import (
	"context"
	"database/sql"
	"fmt"
	"os"
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
