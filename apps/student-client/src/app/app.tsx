import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@one-exam-monorepo/ui';
import { AuthProvider } from '../contexts/AuthContext';
import { AppRouter } from '../components/Router';
import { queryClient } from '../lib/queryClient';
import { FloatingConnectionIndicator } from '../components/FloatingConnectionIndicator';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <FloatingConnectionIndicator />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
