// Reusable HTTP client with built-in authentication
import { authService } from './authService';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  }

  /**
   * Make authenticated API request
   * Automatically includes JWT auth headers from Clerk
   */
  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Get auth headers
    const authHeaders = await authService.getAuthHeaders();

    // Merge with provided headers
    const headers = {
      ...authHeaders,
      ...options.headers,
    };

    // Make request
    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  }

  /**
   * Convenience method for GET requests
   */
  async get(endpoint: string, options?: RequestInit): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Convenience method for POST requests
   */
  async post(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Convenience method for PUT requests
   */
  async put(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete(endpoint: string, options?: RequestInit): Promise<Response> {
    return this.fetch(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
