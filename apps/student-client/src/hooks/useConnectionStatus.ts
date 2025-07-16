import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthService } from '../lib/auth';
import { checkServerHealth } from '../lib/connectionUtils';

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
  const [isNetworkOnline, setIsNetworkOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [lastServerCheck, setLastServerCheck] = useState<Date | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

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
      setIsServerReachable(false);
      setServerError('Network is offline');
      return;
    }

    isCheckingRef.current = true;

    try {
      const result = await checkServerHealth(10000);

      if (result.isReachable) {
        setIsServerReachable(true);
        setServerError(null);
        setLastServerCheck(new Date());
      } else {
        setIsServerReachable(false);
        setServerError(result.error || 'Server health check failed');
      }
    } catch (error) {
      setIsServerReachable(false);

      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Failed to reach server');
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

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

    try {
      // Try a lightweight authenticated endpoint
      const response = await AuthService.authenticatedFetch('/auth/verify', {
        method: 'GET',
      });

      if (response.ok) {
        setIsServerReachable(true);
        setServerError(null);
        setLastServerCheck(new Date());
      } else {
        setIsServerReachable(false);
        setServerError(`Authentication check failed: ${response.status}`);
      }
    } catch (error) {
      setIsServerReachable(false);

      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Authentication check failed');
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  /**
   * Handle network status changes
   */
  const handleNetworkChange = useCallback(() => {
    const newNetworkStatus = navigator.onLine;
    setIsNetworkOnline(newNetworkStatus);

    if (newNetworkStatus) {
      // Network came back online, check server immediately
      checkServerConnection();
    } else {
      // Network went offline
      setIsServerReachable(false);
      setServerError('Network is offline');
    }
  }, [checkServerConnection]);

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
    setIsNetworkOnline(navigator.onLine);

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
  }, [handleNetworkChange, startPeriodicChecks]);

  // Calculate derived values
  const isOnline = isNetworkOnline && isServerReachable;
  const hasConnectionIssues = isNetworkOnline && !isServerReachable;

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
  const {
    isOnline,
    isServerReachable,
    isNetworkOnline,
    checkServerConnection,
  } = useConnectionStatus();

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
