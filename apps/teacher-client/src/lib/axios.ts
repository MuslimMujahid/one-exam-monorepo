import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { auth0 } from './auth0';

// Base configuration
const baseConfig: AxiosRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Public Axios instance (no authentication required)
export const publicApi: AxiosInstance = axios.create(baseConfig);

// Authenticated Axios instance (includes Auth0 token)
export const authenticatedApi: AxiosInstance = axios.create(baseConfig);

// Request interceptor for authenticated API to add Auth0 token
authenticatedApi.interceptors.request.use(
  async (config) => {
    try {
      const session = await auth0.getSession();

      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    } catch (error) {
      console.warn('Failed to get Auth0 session for API request:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
const responseInterceptor = (response: AxiosResponse) => response;

const errorInterceptor = (error: any) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Unauthorized - redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        break;
      case 403:
        // Forbidden
        console.error(
          'Access forbidden:',
          data?.message || 'Insufficient permissions'
        );
        break;
      case 404:
        // Not found
        console.error(
          'Resource not found:',
          data?.message || 'Endpoint not found'
        );
        break;
      case 422:
        // Validation error
        console.error(
          'Validation error:',
          data?.message || 'Invalid data provided'
        );
        break;
      case 500:
        // Server error
        console.error(
          'Server error:',
          data?.message || 'Internal server error'
        );
        break;
      default:
        console.error(
          'API Error:',
          data?.message || `Request failed with status ${status}`
        );
    }
  } else if (error.request) {
    // Network error
    console.error('Network error:', error.message);
  } else {
    // Other error
    console.error('Request error:', error.message);
  }

  return Promise.reject(error);
};

// Add response interceptors to both instances
publicApi.interceptors.response.use(responseInterceptor, errorInterceptor);
authenticatedApi.interceptors.response.use(
  responseInterceptor,
  errorInterceptor
);

// Helper functions for common API operations
export const apiHelpers = {
  public: publicApi,
  auth: authenticatedApi,
};
