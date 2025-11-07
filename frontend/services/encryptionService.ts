// Client-side encryption service for cloud sync preparation
import CryptoJS from 'crypto-js';

export class EncryptionService {
  private encryptionKey: string | null = null;

  async generateKey(password: string, salt?: string): Promise<string> {
    // Use provided salt or generate a random one
    const actualSalt =
      salt || CryptoJS.lib.WordArray.random(128 / 8).toString();

    // Derive key from password using PBKDF2
    const key = CryptoJS.PBKDF2(password, actualSalt, {
      keySize: 256 / 32,
      iterations: 10000,
    });

    return `${actualSalt}:${key.toString()}`;
  }

  setKey(encryptedKey: string) {
    this.encryptionKey = encryptedKey;
  }

  async encrypt(content: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const [, key] = this.encryptionKey.split(':');
    if (!key) {
      throw new Error('Invalid encryption key format');
    }

    // Encrypt using AES-256
    const encrypted = CryptoJS.AES.encrypt(content, key);
    return encrypted.toString();
  }

  async decrypt(encryptedContent: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }

    const [, key] = this.encryptionKey.split(':');
    if (!key) {
      throw new Error('Invalid encryption key format');
    }

    // Decrypt using AES-256
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  async verifyPassword(
    password: string,
    encryptedKey: string
  ): Promise<boolean> {
    try {
      const [salt] = encryptedKey.split(':');
      const derivedKey = await this.generateKey(password, salt);
      return derivedKey === encryptedKey;
    } catch (error) {
      console.error('Failed to verify password:', error);
      return false;
    }
  }

  clearKey() {
    this.encryptionKey = null;
  }

  hasKey(): boolean {
    return this.encryptionKey !== null;
  }
}

export const encryptionService = new EncryptionService();
