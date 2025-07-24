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
    console.log('Checking server health at:', healthUrl);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add ngrok-skip-browser-warning header to avoid ngrok browser warning page
        'ngrok-skip-browser-warning': 'true',
      },
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      try {
        const data: ServerHealthResponse = await response.json();
        console.log('Health check successful:', {
          status: data.status,
          latency: latency + 'ms',
          response: data,
        });
        return {
          isReachable: data.status === 'ok',
          latency,
          response: data,
        };
      } catch (jsonError) {
        console.warn(
          'Health endpoint responded but with invalid JSON:',
          jsonError
        );
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
        console.warn(`Server health check timeout after ${timeoutMs}ms`);
        return {
          isReachable: false,
          latency,
          error: `Server connection timeout (${timeoutMs}ms)`,
        };
      }
      console.error('Server health check failed:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        url: `${API_BASE_URL}/health`,
      });
      return {
        isReachable: false,
        latency,
        error: error.message,
      };
    }

    console.error('Server health check failed with unknown error:', error);
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
      headers: {
        // Add ngrok-skip-browser-warning header to avoid ngrok browser warning page
        'ngrok-skip-browser-warning': 'true',
      },
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

/**
 * Debug function to manually test server connectivity from browser console
 * Usage: window.debugServerConnection()
 */
export async function debugServerConnection(): Promise<void> {
  console.group('🔍 Server Connection Debug');
  console.log('Environment variables:');
  console.log('  VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('  Computed API_BASE_URL:', API_BASE_URL);
  console.log('  Health URL:', `${API_BASE_URL}/health`);
  console.log('  Navigator online:', navigator.onLine);

  // Test direct fetch to see raw response
  console.log('\n🌐 Testing direct fetch...');
  try {
    const directResponse = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (directResponse.ok) {
      const text = await directResponse.text();
      console.log('Response body:', text);
      try {
        const json = JSON.parse(text);
        console.log('Parsed JSON:', json);
      } catch {
        console.log('Response is not valid JSON');
      }
    }
  } catch (error) {
    console.error('Direct fetch failed:', error);
  }

  console.log('\n🔧 Testing through checkServerHealth...');
  try {
    const result = await checkServerHealth(15000);
    console.log('Connection result:', result);

    if (result.isReachable) {
      console.log('✅ Server is reachable and healthy');
    } else {
      console.error('❌ Server check failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Exception during check:', error);
  }

  console.groupEnd();
}

/**
 * Debug function to test network connectivity from browser console
 * Usage: window.debugNetworkConnection()
 */
export async function debugNetworkConnection(): Promise<void> {
  console.group('🌐 Network Connection Debug');
  console.log('Navigator online:', navigator.onLine);

  // Test multiple external services
  const testUrls = [
    'https://1.1.1.1/',
    'https://8.8.8.8/',
    'https://google.com/',
  ];

  for (const url of testUrls) {
    console.log(`\n🧪 Testing ${url}...`);
    try {
      const start = Date.now();
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      console.log(`✅ ${url} reachable (${latency}ms)`);
    } catch (error) {
      console.error(`❌ ${url} failed:`, error);
    }
  }

  console.groupEnd();
}

// Make debug function available globally in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (
    window as typeof window & {
      debugServerConnection: typeof debugServerConnection;
      debugNetworkConnection: typeof debugNetworkConnection;
    }
  ).debugServerConnection = debugServerConnection;
  (
    window as typeof window & {
      debugNetworkConnection: typeof debugNetworkConnection;
    }
  ).debugNetworkConnection = debugNetworkConnection;
}
