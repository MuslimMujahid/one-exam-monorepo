/**
 * Server health check utilities for the exam platform
 * These utilities help determine backend server connectivity
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ServerHealthResponse {
  status: 'ok' | 'error';
  timestamp: number;
  services?: {
    database: boolean;
    auth: boolean;
    redis?: boolean;
  };
  message?: string;
}

export interface ConnectionCheckResult {
  isReachable: boolean;
  latency?: number;
  error?: string;
  response?: ServerHealthResponse;
}

/**
 * Check if the server health endpoint is reachable
 */
export async function checkServerHealth(
  timeoutMs = 10000
): Promise<ConnectionCheckResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Use full API URL instead of relative path
    const healthUrl = `${API_BASE_URL}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      try {
        const data: ServerHealthResponse = await response.json();
        return {
          isReachable: data.status === 'ok',
          latency,
          response: data,
        };
      } catch {
        return {
          isReachable: false,
          latency,
          error: 'Invalid health response format',
        };
      }
    } else {
      return {
        isReachable: false,
        latency,
        error: `Server responded with status: ${response.status}`,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isReachable: false,
          latency,
          error: `Server connection timeout (${timeoutMs}ms)`,
        };
      }
      return {
        isReachable: false,
        latency,
        error: error.message,
      };
    }

    return {
      isReachable: false,
      latency,
      error: 'Unknown server error',
    };
  }
}

/**
 * Perform a lightweight connectivity test
 * This is faster than the full health check
 */
export async function checkBasicConnectivity(
  timeoutMs = 5000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Try to reach the API base URL with a HEAD request
    const response = await fetch(API_BASE_URL, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 is fine, means server is reachable
  } catch {
    return false;
  }
}

/**
 * Check multiple connectivity indicators
 */
export async function performComprehensiveConnectivityCheck(): Promise<{
  basicConnectivity: boolean;
  serverHealth: ConnectionCheckResult;
  overallStatus: 'online' | 'offline' | 'limited';
}> {
  // Check basic connectivity first (faster)
  const basicConnectivity = await checkBasicConnectivity();

  // If basic connectivity fails, don't bother with health check
  if (!basicConnectivity) {
    return {
      basicConnectivity: false,
      serverHealth: {
        isReachable: false,
        error: 'Basic connectivity test failed',
      },
      overallStatus: 'offline',
    };
  }

  // Perform health check
  const serverHealth = await checkServerHealth();

  // Determine overall status
  let overallStatus: 'online' | 'offline' | 'limited';
  if (serverHealth.isReachable) {
    overallStatus = 'online';
  } else if (basicConnectivity) {
    overallStatus = 'limited'; // Can reach server but health check failed
  } else {
    overallStatus = 'offline';
  }

  return {
    basicConnectivity,
    serverHealth,
    overallStatus,
  };
}

/**
 * Utility to test connection with exponential backoff
 */
export async function testConnectionWithBackoff(
  maxAttempts = 3,
  initialDelayMs = 1000
): Promise<ConnectionCheckResult> {
  let lastResult: ConnectionCheckResult = {
    isReachable: false,
    error: 'No attempts made',
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await checkServerHealth();

    if (lastResult.isReachable) {
      return lastResult;
    }

    // If not the last attempt, wait before retrying
    if (attempt < maxAttempts) {
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult;
}

/**
 * Get a human-readable connection status message
 */
export function getConnectionStatusMessage(
  isNetworkOnline: boolean,
  serverHealth: ConnectionCheckResult
): {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
} {
  if (!isNetworkOnline) {
    return {
      type: 'error',
      message: 'No internet connection',
      details: 'Check your network settings and try again',
    };
  }

  if (!serverHealth.isReachable) {
    return {
      type: 'warning',
      message: 'Server unavailable',
      details: serverHealth.error || 'Cannot connect to the exam server',
    };
  }

  return {
    type: 'success',
    message: 'Connected',
    details: `Server responding in ${serverHealth.latency}ms`,
  };
}
