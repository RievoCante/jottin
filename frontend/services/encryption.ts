// End-to-end encryption service using Web Crypto API (AES-GCM)
import { authService } from './authService';

class EncryptionService {
  private keyCache: CryptoKey | null = null;
  private readonly KEY_DERIVATION_ALGORITHM = 'PBKDF2';
  private readonly KEY_USAGE: KeyUsage[] = ['encrypt', 'decrypt'];
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12; // 96 bits for AES-GCM
  private readonly SALT_LENGTH = 16;

  // Derive encryption key from user's passphrase or device key
  // Uses PBKDF2 with 100,000 iterations

  async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    // Import passphrase as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: this.KEY_DERIVATION_ALGORITHM },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    // Cast salt to BufferSource to satisfy TypeScript
    const key = await crypto.subtle.deriveKey(
      {
        name: this.KEY_DERIVATION_ALGORITHM,
        salt: salt as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      this.KEY_USAGE
    );

    return key;
  }

  // Generate or retrieve encryption key
  // For now, uses a device-stored key derived from user ID
  // In production, this should prompt for passphrase or use secure key storage

  async getOrCreateKey(): Promise<CryptoKey> {
    if (this.keyCache) {
      return this.keyCache;
    }

    const userID = authService.getUserId();
    if (!userID) {
      throw new Error('User must be authenticated to use encryption');
    }

    // Generate a device-specific key from user ID
    // In production, this should be stored securely (e.g., IndexedDB with encryption)
    const storageKey = `encryption_key_${userID}`;
    const storedKeyData = localStorage.getItem(storageKey);

    if (storedKeyData) {
      // Import existing key
      const keyData = JSON.parse(storedKeyData);
      const salt = Uint8Array.from(atob(keyData.salt), c => c.charCodeAt(0));
      const passphrase = keyData.passphrase; // In production, prompt user for this

      this.keyCache = await this.deriveKey(passphrase, salt);
      return this.keyCache;
    } else {
      // Generate new key
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      // For now, use user ID as passphrase (in production, prompt user)
      const passphrase = `jottin_${userID}_${Date.now()}`;

      const key = await this.deriveKey(passphrase, salt);

      // Store salt and passphrase hint (in production, encrypt this)
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          salt: btoa(String.fromCharCode(...salt)),
          passphrase: passphrase, // In production, don't store plaintext
        })
      );

      this.keyCache = key;
      return key;
    }
  }

  // Encrypt text content
  // Returns base64-encoded encrypted data and IV
  async encrypt(plaintext: string): Promise<{ encrypted: string; iv: string }> {
    const key = await this.getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoded
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  // Decrypt encrypted content
  // Expects base64-encoded encrypted data and IV
  async decrypt(encryptedBase64: string, ivBase64: string): Promise<string> {
    const key = await this.getOrCreateKey();
    const encrypted = Uint8Array.from(atob(encryptedBase64), c =>
      c.charCodeAt(0)
    );
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  // Clear cached key (for logout)
  clearKey(): void {
    this.keyCache = null;
  }
}

export const encryptionService = new EncryptionService();
