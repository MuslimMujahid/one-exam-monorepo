/**
 * API client utilities for making authenticated requests to the backend
 */

import type { Session } from '@auth0/nextjs-auth0';

interface ApiClientConfig {
  baseUrl: string;
  credentials?: RequestCredentials;
}

export class ApiClient {
  private baseUrl: string;
  private defaultConfig: RequestInit;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultConfig = {
      credentials: config.credentials || 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Make an authenticated API request
   */
  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    session?: Session | null
  ): Promise<T> {
    const url = `${this.baseUrl}${
      endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    }`;

    const config: RequestInit = {
      ...this.defaultConfig,
      ...options,
      headers: {
        ...this.defaultConfig.headers,
        ...options.headers,
        ...(session?.accessToken
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {}),
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `API Error (${response.status}): ${error || response.statusText}`
      );
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    endpoint: string,
    session?: Session | null
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, session);
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    session?: Session | null
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      session
    );
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    session?: Session | null
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      session
    );
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(
    endpoint: string,
    session?: Session | null
  ): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, session);
  }
}

/**
 * Create a new API client instance
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
