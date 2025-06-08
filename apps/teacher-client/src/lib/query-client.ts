import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long to consider data fresh (5 minutes)
      staleTime: 5 * 60 * 1000,
      // How long to keep data in cache (30 minutes)
      gcTime: 30 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Query keys factory for consistent cache management
export const queryKeys = {
  // User queries
  user: {
    current: ['user', 'current'] as const,
  },

  // Exam queries
  exams: {
    all: ['exams'] as const,
    lists: () => [...queryKeys.exams.all, 'list'] as const,
    list: (page: number, limit: number) =>
      [...queryKeys.exams.lists(), { page, limit }] as const,
    details: () => [...queryKeys.exams.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.exams.details(), id] as const,
    results: (id: string) =>
      [...queryKeys.exams.detail(id), 'results'] as const,
  },

  // Class queries
  classes: {
    all: ['classes'] as const,
    lists: () => [...queryKeys.classes.all, 'list'] as const,
    list: (page: number, limit: number) =>
      [...queryKeys.classes.lists(), { page, limit }] as const,
    details: () => [...queryKeys.classes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.classes.details(), id] as const,
  },

  // Student queries
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (page: number, limit: number) =>
      [...queryKeys.students.lists(), { page, limit }] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
    search: (query: string) =>
      [...queryKeys.students.all, 'search', query] as const,
  },

  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    dashboard: ['analytics', 'dashboard'] as const,
  },
} as const;
