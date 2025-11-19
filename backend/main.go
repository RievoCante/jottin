// Entry point for the Jottin backend server
package main

import (
	"backend/handlers"
	"backend/services"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

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
	defer database.Close()

	// Initialize Gemini service
	geminiService, err := services.NewGeminiService(apiKey)
	if err != nil {
		log.Fatalf("Failed to initialize Gemini service: %v", err)
	}
	defer geminiService.Close()

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
		w.Write([]byte("OK"))
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
		log.Fatalf("Server failed to start: %v", err)
	}
}

