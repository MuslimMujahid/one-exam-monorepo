import { SessionData } from '@auth0/nextjs-auth0/types';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Base configuration
const baseConfig: AxiosRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Public Axios instance (no authentication required)
export const publicApi: AxiosInstance = axios.create(baseConfig);

// Authenticated Axios instance (includes Auth0 token)
export const authenticatedApi = (session?: SessionData) => {
  const axiosInstance = axios.create({
    ...baseConfig,
    headers: {
      ...baseConfig.headers,
      Authorization: session ? `Bearer ${session.tokenSet.accessToken}` : '',
    },
  });

  return axiosInstance;
};

// Helper functions for common API operations
export const apiHelpers = {
  public: publicApi,
  auth: authenticatedApi,
};
