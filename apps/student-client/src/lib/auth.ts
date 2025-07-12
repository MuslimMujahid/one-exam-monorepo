import { User, AuthTokens, LoginCredentials } from '../types/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_DATA_KEY = 'userData';

  /**
   * Login with email and password
   */
  static async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(this.getApiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store tokens and user data
    const { tokens, ...user } = data;
    this.setTokens(tokens);
    this.setUserData(user);

    return { user, tokens };
  }

  /**
   * Logout and clear stored data
   */
  static logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
  }

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    return token && token !== 'undefined' && token !== 'null' ? token : null;
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    const token = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    return token && token !== 'undefined' && token !== 'null' ? token : null;
  }

  /**
   * Get stored user data
   */
  static getUserData(): User | null {
    const userData = localStorage.getItem(this.USER_DATA_KEY);
    if (!userData || userData === 'undefined' || userData === 'null') {
      return null;
    }
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.warn('Failed to parse user data from localStorage:', error);
      return null;
    }
  }

  /**
   * Store authentication tokens
   */
  static setTokens(tokens: AuthTokens): void {
    if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
      console.warn('Attempted to set invalid tokens');
      return;
    }
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Failed to store tokens in localStorage');
    }
  }

  /**
   * Store user data
   */
  static setUserData(user: User): void {
    if (!user) {
      console.warn('Attempted to set null/undefined user data');
      return;
    }
    try {
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('Failed to store user data in localStorage');
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getUserData();
    return !!(token && user);
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.getApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Token refresh failed');
    }

    this.setTokens(data.tokens);
    return data.tokens;
  }

  /**
   * Construct full API URL from endpoint path
   */
  static getApiUrl(endpoint: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/')
      ? endpoint.slice(1)
      : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }

  /**
   * Make authenticated API request with endpoint path
   */
  static async authenticatedFetch(
    urlOrEndpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    // If it's a full URL (contains ://), use as-is, otherwise treat as endpoint
    const url = urlOrEndpoint.includes('://')
      ? urlOrEndpoint
      : this.getApiUrl(urlOrEndpoint);
    const token = this.getAccessToken();

    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If token expired, try to refresh and retry
    if (response.status === 401) {
      try {
        await this.refreshAccessToken();
        const newToken = this.getAccessToken();

        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch {
        // Refresh failed, user needs to login again
        this.logout();
        throw new Error('Authentication expired. Please login again.');
      }
    }

    return response;
  }

  /**
   * Validate and clean localStorage data
   * This method checks for corrupted data and cleans it up
   */
  static validateAndCleanStorage(): void {
    try {
      // Check if user data is corrupted
      const userData = localStorage.getItem(this.USER_DATA_KEY);
      if (userData && (userData === 'undefined' || userData === 'null')) {
        localStorage.removeItem(this.USER_DATA_KEY);
      }

      // Check if access token is corrupted
      const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      if (
        accessToken &&
        (accessToken === 'undefined' || accessToken === 'null')
      ) {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      }

      // Check if refresh token is corrupted
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (
        refreshToken &&
        (refreshToken === 'undefined' || refreshToken === 'null')
      ) {
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      }

      // Try to parse user data if it exists
      if (userData && userData !== 'undefined' && userData !== 'null') {
        try {
          JSON.parse(userData);
        } catch {
          localStorage.removeItem(this.USER_DATA_KEY);
        }
      }
    } catch (error) {
      console.warn('Error while validating localStorage:', error);
      // If there's any error, clear all auth data to be safe
      this.logout();
    }
  }
}
