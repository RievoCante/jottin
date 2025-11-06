// Gemini AI service for AI-powered features
package services

import (
	"backend/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiService struct {
	client *genai.Client
	ctx    context.Context
}

func NewGeminiService(apiKey string) (*GeminiService, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %v", err)
	}

	return &GeminiService{
		client: client,
		ctx:    ctx,
	}, nil
}

func (s *GeminiService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}

func (s *GeminiService) GetChatResponse(prompt string, contextNotes []models.Note) (string, error) {
	var contextParts []string
	for _, note := range contextNotes {
		contextParts = append(contextParts, fmt.Sprintf("Title: %s\nContent: %s", note.Title, note.Content))
	}
	context := strings.Join(contextParts, "\n\n---\n\n")

	fullPrompt := fmt.Sprintf(`Based on the following notes, answer the user's question.

NOTES:
%s

QUESTION:
%s`, context, prompt)

	model := s.client.GenerativeModel("gemini-2.0-flash-exp")
	resp, err := model.GenerateContent(s.ctx, genai.Text(fullPrompt))
	if err != nil {
		log.Printf("Error generating chat response: %v", err)
		return "", fmt.Errorf("failed to generate response: %v", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "Sorry, I couldn't process your request right now.", nil
	}

	return fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0]), nil
}

func (s *GeminiService) FindRelevantNotes(currentContent string, allNotes []models.Note) ([]models.Note, error) {
	if strings.TrimSpace(currentContent) == "" || len(allNotes) == 0 {
		return []models.Note{}, nil
	}

	type NoteSummary struct {
		ID             string `json:"id"`
		Title          string `json:"title"`
		ContentSnippet string `json:"contentSnippet"`
	}

	var summaries []NoteSummary
	for _, note := range allNotes {
		snippet := note.Content
		if len(snippet) > 200 {
			snippet = snippet[:200]
		}
		summaries = append(summaries, NoteSummary{
			ID:             note.ID,
			Title:          note.Title,
			ContentSnippet: snippet,
		})
	}

	summariesJSON, _ := json.Marshal(summaries)

	prompt := fmt.Sprintf(`
Current Note Content:
---
%s
---

Available Notes:
---
%s
---

Based on the "Current Note Content", identify the top 3 most relevant notes from the "Available Notes" list.
Your response must be a JSON object with a single key "relevantNoteIds" which is an array of the IDs of the most relevant notes, ordered by relevance.
Example response: {"relevantNoteIds": ["note-3", "note-1", "note-5"]}
`, currentContent, string(summariesJSON))

	model := s.client.GenerativeModel("gemini-2.0-flash-exp")
	model.ResponseMIMEType = "application/json"

	resp, err := model.GenerateContent(s.ctx, genai.Text(prompt))
	if err != nil {
		log.Printf("Error finding relevant notes: %v", err)
		return []models.Note{}, fmt.Errorf("failed to find relevant notes: %v", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return []models.Note{}, nil
	}

	responseText := fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0])
	var result models.RelevantNotesResponse
	if err := json.Unmarshal([]byte(responseText), &result); err != nil {
		log.Printf("Error parsing JSON response: %v", err)
		return []models.Note{}, fmt.Errorf("failed to parse response: %v", err)
	}

	var relevantNotes []models.Note
	for _, id := range result.RelevantNoteIds {
		for _, note := range allNotes {
			if note.ID == id {
				relevantNotes = append(relevantNotes, note)
				break
			}
		}
	}

	return relevantNotes, nil
}

func (s *GeminiService) CleanUpNote(content string) (string, error) {
	prompt := fmt.Sprintf(`You are an expert note organizer. Clean up and structure the following note.
Fix any spelling and grammar mistakes.
Format it with clear markdown, using bullet points, bolding for headers, and other elements to improve readability.
Do not add any new information, only reformat and correct the existing content.
Return only the cleaned-up note content, without any introductory text like "Here is the cleaned-up note:".

Original Note:
---
%s
---
`, content)

	model := s.client.GenerativeModel("gemini-2.0-flash-exp")
	resp, err := model.GenerateContent(s.ctx, genai.Text(prompt))
	if err != nil {
		log.Printf("Error cleaning up note: %v", err)
		return content, fmt.Errorf("failed to clean up note: %v", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return content, nil
	}

	return fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0]), nil
}

