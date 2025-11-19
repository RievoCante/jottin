// Migration runner for Neon PostgreSQL
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	// Get DATABASE_URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Connect to database
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		// Clean up before exiting
		if closeErr := db.Close(); closeErr != nil {
			log.Printf("Error closing database during cleanup: %v", closeErr)
		}
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Set up cleanup after all checks succeed
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	fmt.Println("Connected to database successfully!")

	// Read migration file - try multiple paths
	var migrationSQL []byte
	var err2 error

	// Try paths in order
	paths := []string{
		"migrations/001_initial_schema.sql",
		"backend/migrations/001_initial_schema.sql",
		filepath.Join("..", "migrations", "001_initial_schema.sql"),
	}

	for _, migrationPath := range paths {
		migrationSQL, err2 = os.ReadFile(migrationPath)
		if err2 == nil {
			fmt.Printf("Found migration file at: %s\n", migrationPath)
			break
		}
	}

	if err2 != nil {
		// Clean up before exiting
		if closeErr := db.Close(); closeErr != nil {
			log.Printf("Error closing database during cleanup: %v", closeErr)
		}
		//nolint:gocritic // Explicit cleanup done before exit
		log.Fatalf("Failed to read migration file (tried: %v): %v", paths, err2)
	}

	// Execute migration
	fmt.Println("Running migration...")
	if _, err := db.Exec(string(migrationSQL)); err != nil {
		// Clean up before exiting
		if closeErr := db.Close(); closeErr != nil {
			log.Printf("Error closing database during cleanup: %v", closeErr)
		}
		//nolint:gocritic // Explicit cleanup done before exit
		log.Fatalf("Migration failed: %v", err)
	}

	fmt.Println("Migration completed successfully!")
}
