import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthService } from '../lib/auth';
import { checkServerHealth } from '../lib/connectionUtils';
import { useConnectionSelectors } from '../store/connectionStore';

export interface ConnectionStatus {
  /** Whether the browser detects internet connectivity */
  isNetworkOnline: boolean;
  /** Whether the backend server is reachable and healthy */
  isServerReachable: boolean;
  /** Overall connectivity status (both network and server) */
  isOnline: boolean;
  /** Whether there are connection issues detected */
  hasConnectionIssues: boolean;
  /** Last time the server was successfully reached */
  lastServerCheck: Date | null;
  /** Error message if server check failed */
  serverError: string | null;
  /** Manually trigger a server connectivity check */
  checkServerConnection: () => Promise<void>;
}

/**
 * Enhanced hook for checking both network and backend server connectivity
 * This is crucial for an exam platform that needs to work offline
 */
export function useConnectionStatus(): ConnectionStatus {
  // Use Zustand store for persistent state management
  const {
    isNetworkOnline,
    isServerReachable,
    lastServerCheck,
    serverError,
    isOnline,
    hasConnectionIssues,
    setNetworkOnline,
    setServerReachable,
    setLastServerCheck,
    setIsChecking,
  } = useConnectionSelectors();

  // Use refs to avoid stale closures in intervals
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  /**
   * Check if the backend server is reachable and healthy
   */
  const checkServerConnection = useCallback(async (): Promise<void> => {
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return;
    }

    // Don't check server if network is offline
    if (!navigator.onLine) {
      setServerReachable(false, 'Network is offline');
      return;
    }

    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      const result = await checkServerHealth(10000);

      if (result.isReachable) {
        setServerReachable(true);
        setLastServerCheck(new Date());
      } else {
        setServerReachable(false, result.error || 'Server health check failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        setServerReachable(false, error.message);
      } else {
        setServerReachable(false, 'Failed to reach server');
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [setServerReachable, setLastServerCheck, setIsChecking]);

  /**
   * Check server connection with an authenticated endpoint as fallback
   */
  const checkAuthenticatedConnection = useCallback(async (): Promise<void> => {
    if (isCheckingRef.current) {
      return;
    }

    // Only try authenticated check if we have a token
    const token = AuthService.getAccessToken();
    if (!token) {
      return;
    }

    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      // Try a lightweight authenticated endpoint
      const response = await AuthService.authenticatedFetch('/auth/verify', {
        method: 'GET',
      });

      if (response.ok) {
        setServerReachable(true);
        setLastServerCheck(new Date());
      } else {
        setServerReachable(
          false,
          `Authentication check failed: ${response.status}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        setServerReachable(false, error.message);
      } else {
        setServerReachable(false, 'Authentication check failed');
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [setServerReachable, setLastServerCheck, setIsChecking]);

  /**
   * Handle network status changes
   */
  const handleNetworkChange = useCallback(() => {
    const newNetworkStatus = navigator.onLine;
    setNetworkOnline(newNetworkStatus);

    if (newNetworkStatus) {
      // Network came back online, check server immediately
      checkServerConnection();
    } else {
      // Network went offline - this is already handled by setNetworkOnline
    }
  }, [checkServerConnection, setNetworkOnline]);

  /**
   * Start periodic server checks
   */
  const startPeriodicChecks = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Check server connectivity every 30 seconds
    intervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        checkServerConnection();
      }
    }, 30000);

    // Initial check
    if (navigator.onLine) {
      // Delay initial check slightly to avoid race conditions
      timeoutRef.current = setTimeout(() => {
        checkServerConnection();
      }, 1000);
    }
  }, [checkServerConnection]);

  /**
   * Enhanced server check that tries multiple endpoints
   */
  const enhancedServerCheck = useCallback(async (): Promise<void> => {
    // First try the health endpoint
    await checkServerConnection();

    // If health check failed and we have auth, try authenticated endpoint
    if (!isServerReachable && navigator.onLine) {
      await checkAuthenticatedConnection();
    }
  }, [checkServerConnection, checkAuthenticatedConnection, isServerReachable]);

  // Setup network event listeners and periodic checks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial network status
    setNetworkOnline(navigator.onLine);

    // Add network event listeners
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    // Start periodic server checks
    startPeriodicChecks();

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [handleNetworkChange, startPeriodicChecks, setNetworkOnline]);

  return {
    isNetworkOnline,
    isServerReachable,
    isOnline,
    hasConnectionIssues,
    lastServerCheck,
    serverError,
    checkServerConnection: enhancedServerCheck,
  };
}

/**
 * Simplified hook that returns just the boolean online status
 * Compatible with the existing useNetworkStatus hook
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useConnectionStatus();
  return isOnline;
}

/**
 * Hook for components that need to react to connection changes
 */
export function useConnectionEvents(
  onOnline?: () => void,
  onOffline?: () => void,
  onServerReconnect?: () => void,
  onServerDisconnect?: () => void
) {
  const { isOnline, isServerReachable, isNetworkOnline } =
    useConnectionSelectors();

  // Get the enhanced server check function
  const { checkServerConnection } = useConnectionStatus();

  // Track previous states to detect transitions
  const [prevIsOnline, setPrevIsOnline] = useState(isOnline);
  const [prevIsServerReachable, setPrevIsServerReachable] =
    useState(isServerReachable);

  useEffect(() => {
    // Detect online/offline transitions
    if (isOnline && !prevIsOnline) {
      onOnline?.();
    } else if (!isOnline && prevIsOnline) {
      onOffline?.();
    }

    // Detect server reconnect/disconnect
    if (isServerReachable && !prevIsServerReachable && isNetworkOnline) {
      onServerReconnect?.();
    } else if (!isServerReachable && prevIsServerReachable) {
      onServerDisconnect?.();
    }

    setPrevIsOnline(isOnline);
    setPrevIsServerReachable(isServerReachable);
  }, [
    isOnline,
    isServerReachable,
    isNetworkOnline,
    prevIsOnline,
    prevIsServerReachable,
    onOnline,
    onOffline,
    onServerReconnect,
    onServerDisconnect,
  ]);

  return { checkServerConnection };
}
