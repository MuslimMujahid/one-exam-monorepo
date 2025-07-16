import React from 'react';
import {
  useConnectionStatus,
  useConnectionEvents,
} from '../hooks/useConnectionStatus';
import { AlertBanner } from '@one-exam-monorepo/ui';

/**
 * Demo component showing how to use the enhanced connection status hooks
 * This can be used in the dashboard or as a standalone component for debugging
 */
export function ConnectionStatusDemo() {
  const {
    isNetworkOnline,
    isServerReachable,
    isOnline,
    hasConnectionIssues,
    lastServerCheck,
    serverError,
    checkServerConnection,
  } = useConnectionStatus();

  // Example of using connection events
  useConnectionEvents(
    () => {
      console.log('Connection restored - back online!');
      // You could trigger data refresh, show success message, etc.
    },
    () => {
      console.log('Connection lost - now offline!');
      // You could show offline mode, pause certain operations, etc.
    },
    () => {
      console.log('Server reconnected!');
      // You could refresh cached data, retry failed requests, etc.
    },
    () => {
      console.log('Server connection lost!');
      // You could switch to offline mode, show error message, etc.
    }
  );

  const handleManualCheck = async () => {
    try {
      await checkServerConnection();
    } catch (error) {
      console.error('Manual server check failed:', error);
    }
  };

  const getConnectionStatusMessage = () => {
    if (!isNetworkOnline) {
      return {
        type: 'error' as const,
        message: 'No internet connection detected. Operating in offline mode.',
      };
    }

    if (hasConnectionIssues) {
      return {
        type: 'warning' as const,
        message: `Server unreachable: ${serverError}. Using cached data.`,
      };
    }

    if (isOnline) {
      return {
        type: 'success' as const,
        message: 'Connected to server. All features available.',
      };
    }

    return {
      type: 'info' as const,
      message: 'Checking connection status...',
    };
  };

  const statusMessage = getConnectionStatusMessage();

  return (
    <div className="space-y-4">
      {/* Main status banner */}
      <AlertBanner type={statusMessage.type} message={statusMessage.message} />

      {/* Detailed connection info (for debugging) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Connection Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Network:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isNetworkOnline
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {isNetworkOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Server:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isServerReachable
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {isServerReachable ? 'Reachable' : 'Unreachable'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Overall:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOnline
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {isOnline ? 'Fully Online' : 'Limited/Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Last Server Check:</span>
              <div className="text-gray-900">
                {lastServerCheck
                  ? lastServerCheck.toLocaleTimeString()
                  : 'Never'}
              </div>
            </div>

            {serverError && (
              <div>
                <span className="text-gray-600">Server Error:</span>
                <div className="text-red-600 text-xs break-words">
                  {serverError}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleManualCheck}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Check Server Connection
          </button>
        </div>
      </div>

      {/* Usage examples */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-2">
          Hook Usage Examples
        </h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            • Use <code className="bg-white px-1 rounded">isOnline</code> for
            overall connectivity
          </div>
          <div>
            • Use{' '}
            <code className="bg-white px-1 rounded">hasConnectionIssues</code>{' '}
            to show warnings
          </div>
          <div>
            • Use <code className="bg-white px-1 rounded">isNetworkOnline</code>{' '}
            for basic network status
          </div>
          <div>
            • Use{' '}
            <code className="bg-white px-1 rounded">isServerReachable</code> for
            backend health
          </div>
          <div>
            • Call{' '}
            <code className="bg-white px-1 rounded">
              checkServerConnection()
            </code>{' '}
            to test manually
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Lightweight connection indicator for headers/navigation
 */
export function ConnectionIndicator() {
  const { isOnline, hasConnectionIssues, isNetworkOnline } =
    useConnectionStatus();

  if (!isNetworkOnline) {
    return (
      <div className="flex items-center space-x-1 text-red-600">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-xs font-medium">Offline</span>
      </div>
    );
  }

  if (hasConnectionIssues) {
    return (
      <div className="flex items-center space-x-1 text-yellow-600">
        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        <span className="text-xs font-medium">Limited</span>
      </div>
    );
  }

  if (isOnline) {
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-xs font-medium">Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-gray-600">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
      <span className="text-xs font-medium">Checking...</span>
    </div>
  );
}
