# Authentication Migration - Teacher Client

This document outlines the migration from Auth0 to custom JWT authentication for the teacher-client application.

## Environment Variables Required

Make sure the following environment variables are set in your `.env.local` or deployment environment:

```env
# Core Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# JWT Secrets (should match core-backend)
JWT_ACCESS_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret
```

## Changes Made

### 1. Authentication Service (`src/lib/auth.ts`)
- Replaced Auth0 client with custom JWT authentication
- Server-side session management using HTTP-only cookies
- Support for access/refresh token rotation
- Role-based access control

### 2. Client Store (`src/store/auth.ts`)
- Zustand store for client-side authentication state
- Persistent storage for auth state
- Client-side authentication utilities
- Token refresh handling

### 3. Middleware (`src/middleware.ts`)
- JWT token validation
- Automatic token refresh
- Route protection
- Public route handling

### 4. API Configuration (`src/lib/axios.ts`)
- Updated axios instances for JWT authentication
- Automatic token injection
- Response interceptors for token refresh
- Error handling for 401 responses

### 5. Components
- **Login Page** (`src/app/login/page.tsx`): Custom login form
- **Logout Button** (`src/components/LogoutButton.tsx`): Logout functionality
- **Auth Provider** (`src/components/AuthProvider.tsx`): Client-side auth initialization
- **Auth Hooks** (`src/hooks/useAuth.ts`): Authentication utilities for components

### 6. Updated Layouts
- **Dashboard Layout** (`src/app/dashboard/layout.tsx`): Updated to use custom auth
- **Root Layout** (`src/app/layout.tsx`): Ready for auth provider integration

### 7. Backend Endpoints Added
- `POST /auth/refresh`: Token refresh endpoint
- `GET /auth/verify`: Token validation endpoint
- `POST /auth/logout`: Logout endpoint

### 8. Type Updates
- Updated User interface to remove Auth0-specific fields
- Added custom authentication types

## Migration Steps

1. **Remove Auth0 Dependencies**:
   ```bash
   npm uninstall @auth0/nextjs-auth0
   ```

2. **Set Environment Variables**: Ensure JWT secrets match between frontend and backend

3. **Update Core Backend**: Add the new authentication endpoints (refresh, verify, logout)

4. **Test Authentication Flow**:
   - Login with existing teacher account
   - Access protected routes
   - Token refresh functionality
   - Logout functionality

## Security Improvements

1. **HTTP-Only Cookies**: Tokens are stored in HTTP-only cookies, preventing XSS attacks
2. **Token Rotation**: Access tokens expire in 15 minutes, refresh tokens in 7 days
3. **Role-Based Access**: Middleware enforces role-based access control
4. **Automatic Refresh**: Seamless token refresh without user intervention

## Next Steps

1. Test the authentication flow thoroughly
2. Update any remaining components that use Auth0 patterns
3. Add error boundaries for authentication errors
4. Consider adding remember me functionality
5. Add password reset functionality if needed

## API Usage Examples

### Server-side (in page components):
```typescript
import { AuthService } from '../lib/auth';

export default async function MyPage() {
  const session = await AuthService.requireRole('teacher');
  // Use session.user and session.tokens
}
```

### Client-side (in client components):
```typescript
import { useRequireAuth } from '../hooks/useAuth';

export default function MyComponent() {
  const { user, isAuthenticated } = useRequireAuth('teacher');
  // Component will auto-redirect if not authenticated
}
```

### API Calls:
```typescript
import { createClientAuthenticatedApi } from '../lib/axios';

const api = createClientAuthenticatedApi();
const response = await api.get('/protected-endpoint');
```
