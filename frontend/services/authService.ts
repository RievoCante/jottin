// Service to handle authentication and token management
class AuthService {
  /**
   * Get authentication headers with JWT token
   * Centralized auth logic - reusable across all API services
   */
  async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Get Clerk session token
    if (window.Clerk?.session) {
      try {
        const token = await window.Clerk.session.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get authentication token:', error);
        // Don't throw - allow request to proceed without auth
        // Backend will handle unauthorized requests
      }
    }

    return headers;
  }

  isAuthenticated(): boolean {
    return !!window.Clerk?.user;
  }

  getUserId(): string | null {
    return window.Clerk?.user?.id || null;
  }

  getUserEmail(): string | null {
    return window.Clerk?.user?.primaryEmailAddress?.emailAddress || null;
  }

  async signOut(): Promise<void> {
    try {
      await window.Clerk?.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
