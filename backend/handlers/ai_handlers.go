// HTTP handlers for AI-powered endpoints
package handlers

import (
	"backend/models"
	"backend/services"
	"encoding/json"
	"log"
	"net/http"
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

	response, err := h.geminiService.GetChatResponse(req.Prompt, req.ContextNotes)
	if err != nil {
		log.Printf("Error getting chat response: %v", err)
		respondWithError(w, "Failed to get chat response", http.StatusInternalServerError)
		return
	}

	respondWithJSON(w, map[string]string{"response": response}, http.StatusOK)
}

func (h *AIHandlers) HandleRelevantNotes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.RelevantNotesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding relevant notes request: %v", err)
		respondWithError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	relevantNotes, err := h.geminiService.FindRelevantNotes(req.CurrentContent, req.AllNotes)
	if err != nil {
		log.Printf("Error finding relevant notes: %v", err)
		respondWithError(w, "Failed to find relevant notes", http.StatusInternalServerError)
		return
	}

	respondWithJSON(w, map[string]interface{}{"relevantNotes": relevantNotes}, http.StatusOK)
}

func (h *AIHandlers) HandleCleanup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
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

	cleanedContent, err := h.geminiService.CleanUpNote(req.Content)
	if err != nil {
		log.Printf("Error cleaning up note: %v", err)
		respondWithError(w, "Failed to clean up note", http.StatusInternalServerError)
		return
	}

	respondWithJSON(w, map[string]string{"cleanedContent": cleanedContent}, http.StatusOK)
}

func respondWithJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondWithError(w http.ResponseWriter, message string, status int) {
	respondWithJSON(w, models.ErrorResponse{Error: message}, status)
}

