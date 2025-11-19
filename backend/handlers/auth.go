// Authentication middleware for Clerk JWT validation
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type ClerkClaims struct {
	Sub string `json:"sub"` // User ID
	jwt.RegisteredClaims
}

// AuthMiddleware validates Clerk JWT tokens
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondWithError(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			respondWithError(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// Get Clerk secret key from environment
		secretKey := os.Getenv("CLERK_SECRET_KEY")
		if secretKey == "" {
			respondWithError(w, "Server configuration error", http.StatusInternalServerError)
			return
		}

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secretKey), nil
		})

		if err != nil || !token.Valid {
			respondWithError(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			respondWithError(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		// Get user ID from claims (Clerk uses "sub" for user ID)
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			respondWithError(w, "User ID not found in token", http.StatusUnauthorized)
			return
		}

		// Add user ID to request context
		ctx := context.WithValue(r.Context(), "userID", userID)
		next(w, r.WithContext(ctx))
	}
}

// GetUserID extracts user ID from request context
func GetUserID(r *http.Request) (string, error) {
	userID, ok := r.Context().Value("userID").(string)
	if !ok || userID == "" {
		return "", fmt.Errorf("user ID not found in context")
	}
	return userID, nil
}

