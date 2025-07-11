import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { AppRouter } from '../components/Router';

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
