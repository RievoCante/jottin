package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"os"
)

// EncryptionService handles AES-GCM encryption and decryption
type EncryptionService struct {
	key []byte
}

// NewEncryptionService creates a new EncryptionService instance
func NewEncryptionService() (*EncryptionService, error) {
	keyHex := os.Getenv("DATA_ENCRYPTION_KEY")
	if keyHex == "" {
		return nil, fmt.Errorf("DATA_ENCRYPTION_KEY environment variable is required")
	}

	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode encryption key: %w", err)
	}

	if len(key) != 32 {
		return nil, fmt.Errorf("encryption key must be 32 bytes (got %d)", len(key))
	}

	return &EncryptionService{key: key}, nil
}

// Encrypt encrypts the plaintext using AES-GCM
func (s *EncryptionService) Encrypt(plaintext string) (ciphertext, nonce []byte, err error) {
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return nil, nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, err
	}

	nonce = make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, err
	}

	ciphertext = gcm.Seal(nil, nonce, []byte(plaintext), nil)
	return ciphertext, nonce, nil
}

// Decrypt decrypts the ciphertext using AES-GCM
func (s *EncryptionService) Decrypt(ciphertext, nonce []byte) (string, error) {
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
