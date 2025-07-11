'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClientService, User } from '../lib/auth-client';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export function useRequireAuth(requiredRole?: 'TEACHER' | 'STUDENT' | 'ADMIN') {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await AuthClientService.checkAuth();

        if (!result.isAuthenticated) {
          router.push('/login');
          return;
        }

        if (requiredRole && result.user?.role !== requiredRole) {
          router.push('/unauthorized');
          return;
        }

        setAuthState({
          isAuthenticated: true,
          user: result.user || null,
          isLoading: false,
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [requiredRole, router]);

  return {
    ...authState,
    logout: async () => {
      await AuthClientService.logout();
      router.push('/login');
    },
  };
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await AuthClientService.checkAuth();
        setAuthState({
          isAuthenticated: result.isAuthenticated,
          user: result.user || null,
          isLoading: false,
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  return {
    ...authState,
    login: AuthClientService.login,
    logout: async () => {
      await AuthClientService.logout();
      window.location.href = '/login';
    },
  };
}
