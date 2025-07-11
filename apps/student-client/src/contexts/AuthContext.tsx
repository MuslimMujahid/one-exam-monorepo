import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
import {
  AuthContextType,
  AuthState,
  LoginCredentials,
  User,
  AuthTokens,
} from '../types/auth';
import { AuthService } from '../lib/auth';

// Auth actions
type AuthAction =
  | { type: 'INIT_AUTH'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESH'; payload: { tokens: AuthTokens } };

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INIT_AUTH':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'TOKEN_REFRESH':
      return {
        ...state,
        tokens: action.payload.tokens,
      };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth on component mount
  useEffect(() => {
    const initAuth = () => {
      try {
        // Clean up any corrupted localStorage data first
        AuthService.validateAndCleanStorage();

        const user = AuthService.getUserData();
        const accessToken = AuthService.getAccessToken();
        const refreshToken = AuthService.getRefreshToken();

        if (user && accessToken && refreshToken) {
          dispatch({
            type: 'INIT_AUTH',
            payload: {
              user,
              tokens: { accessToken, refreshToken },
            },
          });
        } else {
          dispatch({ type: 'LOGIN_ERROR' });
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // Clear potentially corrupted data
        AuthService.logout();
        dispatch({ type: 'LOGIN_ERROR' });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const { user, tokens } = await AuthService.login(credentials);
      console.log('Login successful:', user, tokens);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, tokens },
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR' });
      throw error;
    }
  };

  const logout = (): void => {
    AuthService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const tokens = await AuthService.refreshAccessToken();
      dispatch({
        type: 'TOKEN_REFRESH',
        payload: { tokens },
      });
    } catch (error) {
      // If refresh fails, logout the user
      logout();
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
