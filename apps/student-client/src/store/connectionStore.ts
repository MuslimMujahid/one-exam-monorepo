import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ConnectionState {
  /** Whether the browser detects internet connectivity */
  isNetworkOnline: boolean;
  /** Whether the backend server is reachable and healthy */
  isServerReachable: boolean;
  /** Last time the server was successfully reached */
  lastServerCheck: Date | null;
  /** Error message if server check failed */
  serverError: string | null;
  /** Whether we're currently checking server connectivity */
  isChecking: boolean;
}

export interface ConnectionActions {
  /** Set network online status */
  setNetworkOnline: (isOnline: boolean) => void;
  /** Set server reachable status */
  setServerReachable: (isReachable: boolean, error?: string | null) => void;
  /** Set last server check timestamp */
  setLastServerCheck: (date: Date | null) => void;
  /** Set server error message */
  setServerError: (error: string | null) => void;
  /** Set checking status */
  setIsChecking: (isChecking: boolean) => void;
  /** Reset all connection states to defaults */
  resetConnection: () => void;
}

export type ConnectionStore = ConnectionState & ConnectionActions;

const initialState: ConnectionState = {
  isNetworkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isServerReachable: true,
  lastServerCheck: null,
  serverError: null,
  isChecking: false,
};

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setNetworkOnline: (isOnline: boolean) => {
        set({ isNetworkOnline: isOnline });

        // If network went offline, also mark server as unreachable
        if (!isOnline) {
          set({
            isServerReachable: false,
            serverError: 'Network is offline',
          });
        }
      },

      setServerReachable: (
        isReachable: boolean,
        error: string | null = null
      ) => {
        set({
          isServerReachable: isReachable,
          serverError: error,
          // Clear error if server becomes reachable
          ...(isReachable && { serverError: null }),
        });
      },

      setLastServerCheck: (date: Date | null) => {
        set({ lastServerCheck: date });
      },

      setServerError: (error: string | null) => {
        set({ serverError: error });
      },

      setIsChecking: (isChecking: boolean) => {
        set({ isChecking });
      },

      resetConnection: () => {
        set(initialState);
      },
    }),
    {
      name: 'connection-status-storage',
      storage: createJSONStorage(() => {
        // Use sessionStorage for connection status as it's session-specific
        // and we don't want stale connection data from previous sessions
        return typeof window !== 'undefined'
          ? window.sessionStorage
          : {
              getItem: () => null,
              setItem: () => {
                // No-op for SSR
              },
              removeItem: () => {
                // No-op for SSR
              },
            };
      }),
      // Only persist certain fields, not temporary states like isChecking
      partialize: (state) => ({
        lastServerCheck: state.lastServerCheck
          ? state.lastServerCheck instanceof Date
            ? state.lastServerCheck.toISOString()
            : state.lastServerCheck
          : null,
        serverError: state.serverError,
        // Don't persist isNetworkOnline and isServerReachable as they should be checked fresh
      }),
      // Handle rehydration to convert string dates back to Date objects
      onRehydrateStorage: () => (state) => {
        if (
          state?.lastServerCheck &&
          typeof state.lastServerCheck === 'string'
        ) {
          state.lastServerCheck = new Date(state.lastServerCheck);
        }
      },
    }
  )
);

// Computed selectors
export const useConnectionSelectors = () => {
  const store = useConnectionStore();

  return {
    ...store,
    /** Overall connectivity status (both network and server) */
    isOnline: store.isNetworkOnline && store.isServerReachable,
    /** Whether there are connection issues detected */
    hasConnectionIssues: store.isNetworkOnline && !store.isServerReachable,
  };
};
