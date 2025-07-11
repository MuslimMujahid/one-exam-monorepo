# Student Client Authentication

This document describes the authentication system implemented for the student-client React application.

## Overview

The student-client uses a React-based authentication system with the following features:

- JWT-based authentication
- Token refresh mechanism
- Protected routes
- Role-based access control
- Persistent login state

## Architecture

### Authentication Components

1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Provides authentication state management using React Context API
   - Manages user data, tokens, and authentication status
   - Provides login, logout, and token refresh functions

2. **AuthService** (`src/lib/auth.ts`)
   - Handles API communication for authentication
   - Manages token storage in localStorage
   - Provides automatic token refresh
   - Makes authenticated API requests

3. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
   - Wrapper component for protected pages
   - Checks authentication status
   - Enforces role-based access control
   - Redirects unauthenticated users to login

4. **Router** (`src/components/Router.tsx`)
   - Handles application routing using React Router
   - Manages public and protected routes
   - Provides automatic redirects based on authentication status

### Pages

1. **LoginPage** (`src/pages/LoginPage.tsx`)
   - Student login form
   - Email and password authentication
   - Error handling and loading states

2. **DashboardPage** (`src/pages/DashboardPage.tsx`)
   - Main student dashboard
   - Displays available exams
   - Shows enrollment status and exam schedules
   - Provides exam enrollment and access

## Authentication Flow

### Login Process
1. User enters email and password
2. AuthService sends credentials to API
3. On success, tokens and user data are stored
4. AuthContext updates state
5. User is redirected to dashboard

### Token Management
- Access tokens are stored in localStorage
- Refresh tokens are used for automatic token renewal
- Expired tokens trigger automatic refresh
- Failed refresh results in logout

### Protected Routes
- All routes except `/login` require authentication
- Student role is enforced on protected routes
- Unauthorized access results in redirect to login

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Student Portal
```

### API Endpoints Expected

The authentication system expects the following API endpoints:

- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /exams/student` - Get student exams

## Usage

### Wrapping Your App

```tsx
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './components/Router';

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
```

### Using Authentication in Components

```tsx
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  // Component logic here
}
```

### Creating Protected Routes

```tsx
import { ProtectedRoute } from './components/ProtectedRoute';

function ProtectedPage() {
  return (
    <ProtectedRoute requiredRole="STUDENT">
      <YourPageContent />
    </ProtectedRoute>
  );
}
```

## Development

### Running the Application

```bash
nx serve student-client
```

### Building for Production

```bash
nx build student-client
```

## Dependencies

- React 18+
- React Router DOM 6+
- TypeScript
- Vite
- @one-exam-monorepo/ui (shared UI components)

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage. Consider using httpOnly cookies for production.
2. **API Communication**: All API calls should use HTTPS in production.
3. **Token Expiration**: Implement proper token expiration handling.
4. **Role Validation**: Server-side role validation is essential.

## Future Enhancements

1. Add remember me functionality
2. Implement password reset flow
3. Add multi-factor authentication
4. Implement session timeout warnings
5. Add offline authentication state management
