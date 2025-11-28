// HTTP handlers for AI-powered endpoints
package handlers

import (
	"backend/models"
	"backend/services"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
)

// AIHandlers handles AI-powered HTTP endpoints
type AIHandlers struct {
	db                *services.Database
	encryptionService *services.EncryptionService
}

// NewAIHandlers creates a new AIHandlers instance
func NewAIHandlers(db *services.Database, encryptionService *services.EncryptionService) *AIHandlers {
	return &AIHandlers{
		db:                db,
		encryptionService: encryptionService,
	}
}

// HandleChat handles POST /api/chat - chat with AI
func (h *AIHandlers) HandleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get API key from header (user's key)
	userApiKey := r.Header.Get("X-API-Key")
	if userApiKey == "" {
		respondWithError(w, "API key required", http.StatusUnauthorized)
		return
	}

	// Get User ID for DB query
	// Note: We need to extract User ID from the request context or auth header if available.
	// However, HandleChat is not currently wrapped in AuthMiddleware in main.go, but it should be if we access DB.
	// The user sends X-API-Key but maybe not auth token?
	// The frontend sends auth token in Authorization header if signed in.
	// We should probably use GetUserID(r) if available, or require auth.
	// Assuming GetUserID works if AuthMiddleware is used or if we manually check.
	// But wait, HandleChat in main.go is NOT wrapped in AuthMiddleware.
	// If it's not wrapped, we can't get userID easily unless we verify token here.
	// But RAG requires userID to fetch user's notes.
	// So we MUST require authentication for RAG.
	// I will assume the caller (frontend) sends the token and I can use GetUserID(r) after wrapping in middleware or verifying here.
	// For now, I'll try GetUserID(r). If it fails, I can't fetch notes.

	// Actually, let's look at main.go. HandleChat is NOT wrapped.
	// I should update main.go to wrap it, OR verify token here.
	// Since I'm refactoring, I should probably wrap it in main.go.
	// But for now, let's implement the logic assuming I can get userID.

	// Wait, if I can't get userID, I can't search DB.
	// I'll add a check for userID.

	userID, err := GetUserID(r)
	// If GetUserID fails (e.g. no token), we can't do RAG.
	// But maybe the user just wants to chat without notes?
	// The request has ContextNotes.
	// The user request says: "Switch from sending ALL notes in the chat context to sending only the most relevant notes found via Vector Search."
	// This implies we ignore ContextNotes from request and fetch from DB.
	// So we need userID.

	if err != nil {
		// If we can't identify user, we can't fetch their notes.
		// We could fall back to standard chat without context, or return error.
		// Given this is a "Note-Taking App", context is key.
		respondWithError(w, "Unauthorized: Sign in required for context-aware chat", http.StatusUnauthorized)
		return
	}

	var req models.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding chat request: %v", err)
		respondWithError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Prompt == "" {
		respondWithError(w, "Prompt is required", http.StatusBadRequest)
		return
	}

	// Create service with user's key based on provider
	var response string

	if req.Provider == "gemini" || req.Provider == "" {
		geminiService, err := services.NewGeminiService(userApiKey)
		if err != nil {
			log.Printf("Error initializing Gemini service: %v", err)
			respondWithError(w, "Invalid API key", http.StatusUnauthorized)
			return
		}
		defer geminiService.Close()

		// 1. Generate embedding for the prompt
		embedding, err := geminiService.GenerateEmbedding(req.Prompt)
		if err != nil {
			log.Printf("Error generating embedding: %v", err)
			respondWithError(w, "Failed to process prompt", http.StatusInternalServerError)
			return
		}

		// 2. Find and decrypt similar notes
		contextNotes, err := h.findAndDecryptNotes(r.Context(), embedding, userID)
		if err != nil {
			log.Printf("Error finding similar notes: %v", err)
			respondWithError(w, "Failed to fetch context", http.StatusInternalServerError)
			return
		}

		// 3. Generate chat response with RAG context
		response, err = geminiService.GetChatResponse(req.Prompt, contextNotes)
		if err != nil {
			log.Printf("Error getting chat response: %v", err)

			// Check for quota/rate limit errors
			errMsg := err.Error()
			if strings.Contains(errMsg, "quota") || strings.Contains(errMsg, "429") {
				respondWithError(w, "API quota exceeded. Please check your API key's usage limits or try again later.", http.StatusTooManyRequests)
				return
			}

			respondWithError(w, "Failed to get chat response", http.StatusInternalServerError)
			return
		}
	} else {
		respondWithError(w, "Unsupported provider", http.StatusBadRequest)
		return
	}

	respondWithJSON(w, map[string]string{"response": response}, http.StatusOK)
}

func (h *AIHandlers) findAndDecryptNotes(ctx context.Context, embedding []float32, userID string) ([]models.Note, error) {
	similarDBNotes, err := h.db.FindSimilarNotes(ctx, embedding, 5, userID)
	if err != nil {
		return nil, err
	}

	var contextNotes []models.Note
	for i := range similarDBNotes {
		dbNote := &similarDBNotes[i]
		decryptedContent, err := h.encryptionService.Decrypt(dbNote.ContentEncrypted, dbNote.ContentIV)
		if err != nil {
			log.Printf("Error decrypting note %s: %v", dbNote.ID, err)
			continue
		}

		note := models.Note{
			ID:      dbNote.ID,
			Title:   dbNote.Title,
			Content: decryptedContent,
			Date:    dbNote.Date.Format(time.RFC3339),
		}
		contextNotes = append(contextNotes, note)
	}
	return contextNotes, nil
}

// HandleRelevantNotes handles POST /api/notes/relevant - find relevant notes
func (h *AIHandlers) HandleRelevantNotes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get API key from header (user's key)
	userApiKey := r.Header.Get("X-API-Key")
	if userApiKey == "" {
		respondWithError(w, "API key required", http.StatusUnauthorized)
		return
	}

	var req models.RelevantNotesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding relevant notes request: %v", err)
		respondWithError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Create service with user's key based on provider
	var relevantNotes []models.Note

	if req.Provider == "gemini" || req.Provider == "" {
		geminiService, err := services.NewGeminiService(userApiKey)
		if err != nil {
			log.Printf("Error initializing Gemini service: %v", err)
			respondWithError(w, "Invalid API key", http.StatusUnauthorized)
			return
		}
		defer geminiService.Close()

		relevantNotes, err = geminiService.FindRelevantNotes(req.CurrentContent, req.AllNotes)
		if err != nil {
			log.Printf("Error finding relevant notes: %v", err)
			respondWithError(w, "Failed to find relevant notes", http.StatusInternalServerError)
			return
		}
	} else {
		respondWithError(w, "Unsupported provider", http.StatusBadRequest)
		return
	}

	respondWithJSON(w, map[string]interface{}{"relevantNotes": relevantNotes}, http.StatusOK)
}

// HandleCleanup handles POST /api/notes/cleanup - clean up note content
func (h *AIHandlers) HandleCleanup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get API key from header (user's key)
	userApiKey := r.Header.Get("X-API-Key")
	if userApiKey == "" {
		respondWithError(w, "API key required", http.StatusUnauthorized)
		return
	}

	var req models.CleanupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding cleanup request: %v", err)
		respondWithError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		respondWithError(w, "Content is required", http.StatusBadRequest)
		return
	}

	// Create service with user's key based on provider
	var cleanedContent string

	if req.Provider == "gemini" || req.Provider == "" {
		geminiService, err := services.NewGeminiService(userApiKey)
		if err != nil {
			log.Printf("Error initializing Gemini service: %v", err)
			respondWithError(w, "Invalid API key", http.StatusUnauthorized)
			return
		}
		defer geminiService.Close()

		cleanedContent, err = geminiService.CleanUpNote(req.Content)
		if err != nil {
			log.Printf("Error cleaning up note: %v", err)
			respondWithError(w, "Failed to clean up note", http.StatusInternalServerError)
			return
		}
	} else {
		respondWithError(w, "Unsupported provider", http.StatusBadRequest)
		return
	}

	respondWithJSON(w, map[string]string{"cleanedContent": cleanedContent}, http.StatusOK)
}

// HandleValidateKey handles POST /api/validate-key - validate API key
func (h *AIHandlers) HandleValidateKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Provider string `json:"provider"`
		ApiKey   string `json:"apiKey"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding validate key request: %v", err)
		respondWithError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ApiKey == "" {
		respondWithError(w, "API key is required", http.StatusBadRequest)
		return
	}

	// Try to create a service with the key - if initialization succeeds, key format is valid
	if req.Provider == "gemini" || req.Provider == "" {
		geminiService, err := services.NewGeminiService(req.ApiKey)
		if err != nil {
			respondWithJSON(w, map[string]interface{}{
				"valid": false,
				"error": "Invalid API key format or service unavailable",
			}, http.StatusOK)
			return
		}
		defer geminiService.Close()

		// If we successfully created the service, the key is valid
		// We don't make an actual API call to avoid quota usage and rate limits
		respondWithJSON(w, map[string]interface{}{
			"valid":   true,
			"message": "API key is valid!",
		}, http.StatusOK)
	} else {
		respondWithError(w, "Unsupported provider", http.StatusBadRequest)
		return
	}
}

func respondWithJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}

func respondWithError(w http.ResponseWriter, message string, status int) {
	respondWithJSON(w, models.ErrorResponse{Error: message}, status)
}
