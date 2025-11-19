// Entry point for the Jottin backend server
package main

import (
	"backend/handlers"
	"backend/services"
	"log"
	"net/http"
	"os"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize Clerk SDK
	clerkSecretKey := os.Getenv("CLERK_SECRET_KEY")
	if clerkSecretKey == "" {
		log.Fatal("CLERK_SECRET_KEY environment variable is required")
	}
	clerk.SetKey(clerkSecretKey)

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize database (Neon PostgreSQL)
	database, err := services.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize Gemini service
	geminiService, err := services.NewGeminiService(apiKey)
	if err != nil {
		// Clean up database before exiting
		if closeErr := database.Close(); closeErr != nil {
			log.Printf("Error closing database during cleanup: %v", closeErr)
		}
		log.Fatalf("Failed to initialize Gemini service: %v", err)
	}

	// Set up cleanup after all initialization succeeds
	defer func() {
		if err := database.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
		geminiService.Close() // Close() handles its own error logging
	}()

	// Initialize handlers
	aiHandlers := handlers.NewAIHandlers(geminiService)
	syncHandlers := handlers.NewSyncHandlers(database)

	// Setup routes
	mux := http.NewServeMux()

	// AI routes
	mux.HandleFunc("/api/chat", aiHandlers.HandleChat)
	mux.HandleFunc("/api/notes/relevant", aiHandlers.HandleRelevantNotes)
	mux.HandleFunc("/api/notes/cleanup", aiHandlers.HandleCleanup)
	mux.HandleFunc("/api/validate-key", aiHandlers.HandleValidateKey)

	// Sync routes (protected with auth middleware)
	mux.HandleFunc("/api/sync/notes", handlers.AuthMiddleware(syncHandlers.HandleSyncNotes))
	mux.HandleFunc("/api/sync/push", handlers.AuthMiddleware(syncHandlers.HandleSyncPush))

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte("OK")); err != nil {
			log.Printf("Error writing health check response: %v", err)
		}
	})

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "X-API-Key"},
		AllowCredentials: false, // Must be false when using "*" for origins
	})

	handler := c.Handler(mux)

	// Start server
	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		// Clean up before exiting
		if closeErr := database.Close(); closeErr != nil {
			log.Printf("Error closing database during cleanup: %v", closeErr)
		}
		geminiService.Close()
		//nolint:gocritic // Explicit cleanup done before exit
		log.Fatalf("Server failed to start: %v", err)
	}
}
