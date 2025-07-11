import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AuthServerService } from './auth-server';

// Base configuration for server-side requests
const baseConfig: AxiosRequestConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
};

// Server-side authenticated Axios instance
// Use this in server components, API routes, and middleware
export const createServerAuthenticatedApi =
  async (): Promise<AxiosInstance> => {
    const session = await AuthServerService.getSession();

    return axios.create({
      ...baseConfig,
      headers: {
        ...baseConfig.headers,
        Authorization: session ? `Bearer ${session.tokens.accessToken}` : '',
      },
    });
  };

// Public server-side API instance (no authentication)
export const serverApi: AxiosInstance = axios.create(baseConfig);

// Server-side API helpers
export const serverApiHelpers = {
  public: serverApi,
  createAuth: createServerAuthenticatedApi,
};
