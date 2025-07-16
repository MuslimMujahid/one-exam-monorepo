# Connection Status Management

This module provides comprehensive connectivity checking for the exam platform, supporting both online and offline modes.

## Overview

The connection status system provides:

1. **Network connectivity detection** - Basic internet connection status
2. **Backend server health checking** - Verifies the exam server is reachable and healthy
3. **Comprehensive connection status** - Combines network and server status for accurate assessment
4. **Automatic monitoring** - Periodic health checks and event-driven updates
5. **Offline mode support** - Graceful degradation when connectivity is lost

## Hooks

### `useConnectionStatus()`

The main hook providing detailed connection information.

```tsx
import { useConnectionStatus } from '../hooks/useConnectionStatus';

function ExamComponent() {
  const {
    isNetworkOnline,      // Browser's network connectivity
    isServerReachable,    // Backend server health status
    isOnline,             // Overall connectivity (network + server)
    hasConnectionIssues,  // Network online but server unreachable
    lastServerCheck,      // Last successful server check timestamp
    serverError,          // Error message if server check failed
    checkServerConnection // Manual server check function
  } = useConnectionStatus();

  if (!isNetworkOnline) {
    return <div>You are offline. Using cached data.</div>;
  }

  if (hasConnectionIssues) {
    return <div>Server unavailable: {serverError}</div>;
  }

  return <div>Connected to exam server</div>;
}
```

### `useOnlineStatus()`

Simplified hook returning just the boolean online status.

```tsx
import { useOnlineStatus } from '../hooks/useConnectionStatus';

function SimpleComponent() {
  const isOnline = useOnlineStatus();

  return isOnline ? <OnlineContent /> : <OfflineContent />;
}
```

### `useConnectionEvents()`

Hook for responding to connection state changes.

```tsx
import { useConnectionEvents } from '../hooks/useConnectionStatus';

function App() {
  useConnectionEvents(
    () => {
      // Connection restored
      console.log('Back online!');
      // Refresh data, show success message, etc.
    },
    () => {
      // Connection lost
      console.log('Gone offline!');
      // Switch to offline mode, pause operations, etc.
    },
    () => {
      // Server reconnected
      console.log('Server is back!');
      // Retry failed requests, refresh cached data, etc.
    },
    () => {
      // Server disconnected
      console.log('Server connection lost!');
      // Show error message, switch to cached data, etc.
    }
  );

  return <YourApp />;
}
```

## Connection Utilities

### Server Health Checking

```tsx
import { checkServerHealth, checkBasicConnectivity } from '../lib/connectionUtils';

// Comprehensive server health check
const healthResult = await checkServerHealth();
if (healthResult.isReachable) {
  console.log(`Server healthy (${healthResult.latency}ms)`);
} else {
  console.error(`Server issue: ${healthResult.error}`);
}

// Quick connectivity test
const isConnected = await checkBasicConnectivity();
```

### Advanced Connection Testing

```tsx
import {
  performComprehensiveConnectivityCheck,
  testConnectionWithBackoff
} from '../lib/connectionUtils';

// Full connectivity assessment
const status = await performComprehensiveConnectivityCheck();
console.log(`Overall status: ${status.overallStatus}`);

// Retry with exponential backoff
const result = await testConnectionWithBackoff(3, 1000);
```

## Components

### `ConnectionStatusDemo`

A comprehensive demo component showing all connection status features:

```tsx
import { ConnectionStatusDemo } from '../components/ConnectionStatusDemo';

function DebugPage() {
  return (
    <div>
      <h1>Connection Status Debug</h1>
      <ConnectionStatusDemo />
    </div>
  );
}
```

### `ConnectionIndicator`

A lightweight status indicator for headers/navigation:

```tsx
import { ConnectionIndicator } from '../components/ConnectionStatusDemo';

function Header() {
  return (
    <nav>
      <div className="nav-content">
        <span>Exam Platform</span>
        <ConnectionIndicator />
      </div>
    </nav>
  );
}
```

## Integration Examples

### Exam Platform Integration

```tsx
function DashboardPage() {
  const {
    isOnline,
    hasConnectionIssues,
    checkServerConnection
  } = useConnectionStatus();

  // Show appropriate UI based on connection status
  if (!isOnline) {
    return (
      <div>
        <h1>Offline Mode</h1>
        <p>Showing downloaded exams only</p>
        <button onClick={checkServerConnection}>
          Check Connection
        </button>
      </div>
    );
  }

  if (hasConnectionIssues) {
    return (
      <div>
        <h1>Limited Connectivity</h1>
        <p>Server unreachable, using cached data</p>
        <button onClick={checkServerConnection}>
          Retry Connection
        </button>
      </div>
    );
  }

  return <FullDashboard />;
}
```

### Automatic Data Sync

```tsx
function useDataSync() {
  const { isOnline } = useConnectionStatus();

  useConnectionEvents(
    () => {
      // When connection is restored, sync pending data
      syncPendingSubmissions();
      refreshExamData();
    },
    () => {
      // When going offline, save current state
      saveCurrentState();
    }
  );

  return { isOnline };
}
```

## Configuration

### Timing Settings

The connection status system uses these default intervals:

- **Server health checks**: Every 30 seconds when online
- **Connection timeout**: 10 seconds for health checks
- **Basic connectivity timeout**: 5 seconds
- **Initial check delay**: 1 second after hook initialization

### Endpoints

The system expects these backend endpoints:

- `/api/health` - Server health status endpoint
- `/api/auth/verify` - Authentication verification endpoint
- `/favicon.ico` - Basic connectivity test endpoint

## Error Handling

The connection status system handles various error scenarios:

1. **Network offline**: Detected via `navigator.onLine`
2. **Server timeout**: Configurable timeout for server requests
3. **Server errors**: HTTP error codes and exceptions
4. **Authentication failures**: Token expiry and auth errors

## Best Practices

1. **Use `isOnline` for overall connectivity decisions**
2. **Use `hasConnectionIssues` to show appropriate warnings**
3. **Provide manual retry options** with `checkServerConnection()`
4. **Cache data appropriately** for offline scenarios
5. **Show clear status indicators** to users
6. **Handle connection transitions gracefully**

## Testing

Run the connection status tests:

```bash
# Run all connection status tests
npm test useConnectionStatus

# Run with coverage
npm test -- --coverage useConnectionStatus
```

The test suite covers:
- Network status changes
- Server connectivity scenarios
- Error handling
- Connection transitions
- Hook state management

## Migration from useNetworkStatus

If you're using the old `useNetworkStatus` hook, you can migrate easily:

```tsx
// Old
import { useNetworkStatus } from './useNetworkStatus';
const isOnline = useNetworkStatus();

// New (drop-in replacement)
import { useOnlineStatus } from './useConnectionStatus';
const isOnline = useOnlineStatus();

// Or use the full featured version
import { useConnectionStatus } from './useConnectionStatus';
const { isOnline, hasConnectionIssues } = useConnectionStatus();
```

The new hooks provide backward compatibility while offering enhanced functionality for robust offline support.
