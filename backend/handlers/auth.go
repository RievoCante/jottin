// Authentication middleware for Clerk JWT validation
package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
)

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const userIDKey contextKey = "userID"

// AuthMiddleware validates Clerk JWT tokens using Clerk SDK
// It wraps Clerk's middleware and extracts user ID to our custom context
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	// Use Clerk's built-in middleware for token verification
	clerkMiddleware := clerkhttp.WithHeaderAuthorization()

	// Wrap it to extract user ID and add to our custom context
	return func(w http.ResponseWriter, r *http.Request) {
		// First, let Clerk's middleware verify the token
		clerkHandler := clerkMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract session claims from Clerk's context
			claims, ok := clerk.SessionClaimsFromContext(r.Context())
			if !ok {
				respondWithError(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// Get user ID from claims
			userID := claims.Subject
			if userID == "" {
				respondWithError(w, "User ID not found in token", http.StatusUnauthorized)
				return
			}

			// Add user ID to our custom context
			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next(w, r.WithContext(ctx))
		}))

		clerkHandler.ServeHTTP(w, r)
	}
}

// GetUserID extracts user ID from request context
func GetUserID(r *http.Request) (string, error) {
	userID, ok := r.Context().Value(userIDKey).(string)
	if !ok || userID == "" {
		return "", fmt.Errorf("user ID not found in context")
	}
	return userID, nil
}
