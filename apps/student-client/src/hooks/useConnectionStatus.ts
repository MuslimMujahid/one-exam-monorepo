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
      const result = await checkServerHealth(8000);

      if (result.isReachable) {
        setServerReachable(true);
        setLastServerCheck(new Date());
      } else {
        setServerReachable(false, result.error || 'Server health check failed');

        // If server check failed, also verify network connectivity
        // This catches cases where network went down but navigator.onLine is stale
        if (
          result.error?.includes('fetch') ||
          result.error?.includes('network') ||
          result.error?.includes('timeout')
        ) {
          try {
            await fetch('https://1.1.1.1/', {
              method: 'HEAD',
              mode: 'no-cors',
              cache: 'no-cache',
              signal: AbortSignal.timeout(3000),
            });
          } catch {
            console.log('Network connectivity lost during server check');
            setNetworkOnline(false);
          }
        }
      }
    } catch (error) {
      let errorMessage = 'Failed to reach server';
      if (error instanceof Error) {
        errorMessage = error.message;

        // If it's a network error, also check if we actually lost internet
        if (
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.name === 'TypeError'
        ) {
          try {
            await fetch('https://1.1.1.1/', {
              method: 'HEAD',
              mode: 'no-cors',
              cache: 'no-cache',
              signal: AbortSignal.timeout(3000),
            });
          } catch {
            console.log('Network connectivity lost, updating network status');
            setNetworkOnline(false);
            errorMessage = 'Network connection lost';
          }
        }
      }

      setServerReachable(false, errorMessage);
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [setServerReachable, setLastServerCheck, setIsChecking, setNetworkOnline]);

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
   * Handle network status changes with actual connectivity verification
   */
  const handleNetworkChange = useCallback(async () => {
    const navigatorOnline = navigator.onLine;
    console.log('Network change detected:', navigatorOnline);

    // Always do an actual connectivity test, don't just trust navigator.onLine
    let actuallyOnline = navigatorOnline;

    if (navigatorOnline) {
      // Navigator says we're online, but let's verify with a real test
      try {
        // Try to reach a reliable external service with a quick timeout
        await fetch('https://1.1.1.1/', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000),
        });
        actuallyOnline = true;
      } catch {
        // If we can't reach a basic external service, we're probably offline
        actuallyOnline = false;
        console.log('Connectivity test failed, treating as offline');
      }
    } else {
      // Navigator says we're offline, trust it
      actuallyOnline = false;
    }

    setNetworkOnline(actuallyOnline);

    if (actuallyOnline) {
      // Network came back online, check server immediately
      checkServerConnection();
    } else {
      // Network went offline - this is already handled by setNetworkOnline
      console.log('Network is offline, marking server as unreachable');
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

    // Check both network and server connectivity every 15 seconds
    intervalRef.current = setInterval(async () => {
      // First verify actual network connectivity
      let networkOnline = navigator.onLine;
      if (networkOnline) {
        try {
          await fetch('https://1.1.1.1/', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: AbortSignal.timeout(2000),
          });
        } catch {
          networkOnline = false;
          console.log('Periodic connectivity test failed');
        }
      }

      setNetworkOnline(networkOnline);

      // Only check server if network is actually online
      if (networkOnline) {
        checkServerConnection();
      }
    }, 15000);

    // Initial check - do network verification first
    handleNetworkChange();
  }, [checkServerConnection, setNetworkOnline, handleNetworkChange]);

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
