import React from 'react';
import {
  useConnectionStatus,
  useOnlineStatus,
  useConnectionEvents,
} from '../hooks/useConnectionStatus';

/**
 * Example component demonstrating the usage of the Zustand-powered connection status
 */
export const ConnectionStatusExample: React.FC = () => {
  // Using the full connection status hook
  const {
    isNetworkOnline,
    isServerReachable,
    isOnline,
    hasConnectionIssues,
    lastServerCheck,
    serverError,
    checkServerConnection,
  } = useConnectionStatus();

  // Using the simplified boolean hook
  const simpleOnlineStatus = useOnlineStatus();

  // Using connection events hook
  useConnectionEvents(
    () => console.log('Back online!'),
    () => console.log('Gone offline!'),
    () => console.log('Server reconnected!'),
    () => console.log('Server disconnected!')
  );

  const handleManualCheck = async () => {
    await checkServerConnection();
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Connection Status</h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>Overall Status: {isOnline ? 'Online' : 'Offline'}</span>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <div>Network: {isNetworkOnline ? 'Connected' : 'Disconnected'}</div>
          <div>Server: {isServerReachable ? 'Reachable' : 'Unreachable'}</div>
          <div>Simple Status: {simpleOnlineStatus ? 'Online' : 'Offline'}</div>

          {hasConnectionIssues && (
            <div className="text-yellow-600">
              <span role="img" aria-label="Warning">
                ⚠️
              </span>{' '}
              Connection issues detected
            </div>
          )}

          {lastServerCheck && (
            <div>Last Check: {lastServerCheck.toLocaleTimeString()}</div>
          )}

          {serverError && (
            <div className="text-red-600">Error: {serverError}</div>
          )}
        </div>

        <button
          onClick={handleManualCheck}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Check Server Connection
        </button>
      </div>
    </div>
  );
};
