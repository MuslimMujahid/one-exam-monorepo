/**
 * Client-Side Authentication Service
 *
 * This module contains authentication methods that can be used on the client side.
 * Use in: Client components, React hooks
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
}

export class AuthClientService {
  /**
   * CLIENT-SIDE: Login via Next.js API route
   * Use in: Client components (login forms)
   */
  static async login(email: string, password: string): Promise<User> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    return data.user;
  }

  /**
   * CLIENT-SIDE: Logout via Next.js API route
   * Use in: Client components (logout buttons)
   */
  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * CLIENT-SIDE: Check authentication status via API route
   * Use in: Client components, React hooks
   */
  static async checkAuth(): Promise<{ isAuthenticated: boolean; user?: User }> {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return {
          isAuthenticated: true,
          user: data.user,
        };
      }

      return { isAuthenticated: false };
    } catch (error) {
      console.error('Auth check error:', error);
      return { isAuthenticated: false };
    }
  }
}
