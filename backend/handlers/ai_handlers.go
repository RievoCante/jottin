// HTTP handlers for AI-powered endpoints
package handlers

import (
	"backend/models"
	"backend/services"
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

type AIHandlers struct {
	geminiService *services.GeminiService
}

func NewAIHandlers(geminiService *services.GeminiService) *AIHandlers {
	return &AIHandlers{
		geminiService: geminiService,
	}
}

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
		
		response, err = geminiService.GetChatResponse(req.Prompt, req.ContextNotes)
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
	json.NewEncoder(w).Encode(data)
}

func respondWithError(w http.ResponseWriter, message string, status int) {
	respondWithJSON(w, models.ErrorResponse{Error: message}, status)
}

