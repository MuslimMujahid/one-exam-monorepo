import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Base configuration
const baseConfig: AxiosRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies
};

// Public Axios instance (no authentication required)
export const publicApi: AxiosInstance = axios.create(baseConfig);

// Client-side authenticated Axios instance
// Use this in client components that need to make API calls
// Note: Since we're using HTTP-only cookies, the authentication happens
// automatically through the cookies. For direct backend calls that need
// tokens, consider using the Next.js API routes as a proxy.
export const clientApi: AxiosInstance = axios.create(baseConfig);

// Helper function to create an API call through Next.js API routes
// This is preferred for client-side authenticated requests
export const createApiCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  return fetch(endpoint, {
    ...options,
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

// Helper functions for common API operations
export const apiHelpers = {
  public: publicApi,
  client: clientApi,
  apiCall: createApiCall,
  // Convenience method for authenticated requests
  auth: () => clientApi,
  createClientAuth: () => clientApi,
};
