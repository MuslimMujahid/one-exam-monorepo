/**
 * Server-Side Authentication Service
 *
 * This module contains authentication methods that can only be used on the server side.
 * Use in: Server components, API routes, middleware
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionData {
  user: User;
  tokens: AuthTokens;
}

export class AuthServerService {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_DATA_KEY = 'userData';

  /**
   * SERVER-SIDE: Get session from HTTP-only cookies
   * Use in: Server components, API routes, middleware
   */
  static async getSession(): Promise<SessionData | null> {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get(this.ACCESS_TOKEN_KEY)?.value;
      const refreshToken = cookieStore.get(this.REFRESH_TOKEN_KEY)?.value;
      const userDataCookie = cookieStore.get(this.USER_DATA_KEY)?.value;

      if (!accessToken || !refreshToken || !userDataCookie) {
        return null;
      }

      const userData = JSON.parse(userDataCookie) as User;

      return {
        user: userData,
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * SERVER-SIDE: Set session in HTTP-only cookies
   * Use in: API routes, server actions
   */
  static async setSession(sessionData: SessionData): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.set(this.ACCESS_TOKEN_KEY, sessionData.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    cookieStore.set(this.REFRESH_TOKEN_KEY, sessionData.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    cookieStore.set(this.USER_DATA_KEY, JSON.stringify(sessionData.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
  }

  /**
   * SERVER-SIDE: Clear session cookies
   * Use in: API routes, server actions
   */
  static async clearSession(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.delete(this.ACCESS_TOKEN_KEY);
    cookieStore.delete(this.REFRESH_TOKEN_KEY);
    cookieStore.delete(this.USER_DATA_KEY);
  }

  /**
   * SERVER-SIDE: Require authentication, redirect if not authenticated
   * Use in: Server components that need auth
   */
  static async requireAuth(): Promise<SessionData> {
    const session = await this.getSession();

    if (!session) {
      redirect('/login');
    }

    return session;
  }

  /**
   * SERVER-SIDE: Require specific role, redirect if unauthorized
   * Use in: Server components that need role-based access
   */
  static async requireRole(
    role: User['role'] | User['role'][]
  ): Promise<SessionData> {
    const session = await this.requireAuth();
    const allowedRoles = Array.isArray(role) ? role : [role];

    if (!allowedRoles.includes(session.user.role)) {
      redirect('/unauthorized');
    }

    return session;
  }

  /**
   * SERVER-SIDE: Direct backend login (for server use)
   * Use in: Server actions, API routes that need direct backend auth
   */
  static async loginDirect(
    email: string,
    password: string
  ): Promise<SessionData> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Login failed');
    }

    const data = await response.json();

    const sessionData: SessionData = {
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
      },
      tokens: data.tokens,
    };

    await this.setSession(sessionData);
    return sessionData;
  }

  /**
   * SERVER-SIDE: Refresh tokens (for server use)
   * Use in: Middleware, API routes
   */
  static async refreshTokens(): Promise<AuthTokens | null> {
    try {
      const session = await this.getSession();
      if (!session?.tokens.refreshToken) {
        return null;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
        }
      );

      if (!response.ok) {
        await this.clearSession();
        return null;
      }

      const tokens = await response.json();

      // Update session with new tokens
      await this.setSession({
        ...session,
        tokens,
      });

      return tokens;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      await this.clearSession();
      return null;
    }
  }
}
