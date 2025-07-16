import React, { useState } from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

/**
 * Floating connection status indicator that appears in the bottom-left corner
 * of the screen and is available on every page
 */
export function FloatingConnectionIndicator() {
  const {
    isNetworkOnline,
    isServerReachable,
    isOnline,
    hasConnectionIssues,
    serverError,
    checkServerConnection,
    lastServerCheck,
  } = useConnectionStatus();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await checkServerConnection();
    } catch (error) {
      console.error('Manual connection check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = () => {
    if (!isNetworkOnline) return 'bg-red-500';
    if (hasConnectionIssues) return 'bg-yellow-500';
    if (isOnline) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (!isNetworkOnline) return 'Offline';
    if (hasConnectionIssues) return 'Limited';
    if (isOnline) return 'Online';
    return 'Checking...';
  };

  const getStatusDescription = () => {
    if (!isNetworkOnline) {
      return 'No internet connection detected';
    }
    if (hasConnectionIssues) {
      return `Server unreachable: ${serverError}`;
    }
    if (isOnline) {
      return 'Connected to exam server';
    }
    return 'Checking connection status...';
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Main indicator */}
      <div
        className={`
          relative cursor-pointer transition-all duration-300 ease-in-out
          ${isExpanded ? 'mb-2' : ''}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-full
            bg-white shadow-lg border border-gray-200
            hover:shadow-xl transition-all duration-200
            ${isExpanded ? 'rounded-lg px-4 py-3' : ''}
          `}
        >
          {/* Status dot */}
          <div className="relative">
            <div
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${getStatusColor()}
                ${!isOnline && !isExpanded ? 'animate-pulse' : ''}
              `}
            />
            {/* Checking spinner overlay */}
            {isChecking && (
              <div className="absolute inset-0 border border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            )}
          </div>

          {/* Status text */}
          <span
            className={`
              text-sm font-medium text-gray-700 transition-all duration-200
              ${isExpanded ? 'block' : 'hidden sm:block'}
            `}
          >
            {getStatusText()}
          </span>

          {/* Expand/collapse icon */}
          <div
            className={`
              transform transition-transform duration-200
              ${isExpanded ? 'rotate-180' : 'rotate-0'}
            `}
          >
            <svg
              className="w-3 h-3 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded details panel */}
      {isExpanded && (
        <div
          className={`
            bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-72
            transform transition-all duration-300 ease-in-out
            ${
              isExpanded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }
          `}
        >
          <div className="space-y-3">
            {/* Status description */}
            <div>
              <p className="text-sm text-gray-600 mb-2">
                {getStatusDescription()}
              </p>
            </div>

            {/* Detailed status grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Network:</span>
                  <span
                    className={`
                      px-2 py-0.5 rounded-full font-medium
                      ${
                        isNetworkOnline
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }
                    `}
                  >
                    {isNetworkOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Server:</span>
                  <span
                    className={`
                      px-2 py-0.5 rounded-full font-medium
                      ${
                        isServerReachable
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }
                    `}
                  >
                    {isServerReachable ? 'Reachable' : 'Unreachable'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div>
                  <span className="text-gray-500">Last Check:</span>
                  <div className="text-gray-700">
                    {lastServerCheck
                      ? lastServerCheck.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </div>
                </div>
              </div>
            </div>

            {/* Manual check button */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className={`
                  w-full px-3 py-1.5 text-xs font-medium rounded-md
                  transition-colors duration-200
                  ${
                    isChecking
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }
                `}
              >
                {isChecking ? 'Checking...' : 'Check Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

/**
 * Simplified floating indicator that shows just the status dot
 * Can be used when you want minimal visual impact
 */
export function MinimalFloatingConnectionIndicator() {
  const { isNetworkOnline, hasConnectionIssues, isOnline } =
    useConnectionStatus();

  const getStatusColor = () => {
    if (!isNetworkOnline) return 'bg-red-500';
    if (hasConnectionIssues) return 'bg-yellow-500';
    if (isOnline) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getTooltipText = () => {
    if (!isNetworkOnline) return 'Offline - No internet connection';
    if (hasConnectionIssues) return 'Limited - Server unreachable';
    if (isOnline) return 'Online - Connected to server';
    return 'Checking connection...';
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="relative group cursor-pointer" title={getTooltipText()}>
        <div
          className={`
            w-4 h-4 rounded-full shadow-lg transition-all duration-300
            ${getStatusColor()}
            ${!isOnline ? 'animate-pulse' : ''}
            hover:scale-110
          `}
        />

        {/* Tooltip */}
        <div
          className="
            absolute bottom-full left-0 mb-2 px-2 py-1
            bg-gray-900 text-white text-xs rounded
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            whitespace-nowrap pointer-events-none
          "
        >
          {getTooltipText()}
        </div>
      </div>
    </div>
  );
}
