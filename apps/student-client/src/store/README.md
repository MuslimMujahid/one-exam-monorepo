# Connection Status with Zustand Integration

This implementation migrates the connection status management from local React state to persistent Zustand store for better state management and persistence across sessions.

## Changes Made

### 1. Created Zustand Store (`src/store/connectionStore.ts`)

- **Persistent Storage**: Uses sessionStorage to persist connection data across page refreshes within the same session
- **State Management**: Centralized state for network and server connectivity status
- **Computed Values**: Automatically calculated `isOnline` and `hasConnectionIssues` properties
- **Date Handling**: Proper serialization/deserialization of `lastServerCheck` Date objects

### 2. Updated Connection Hook (`src/hooks/useConnectionStatus.ts`)

- **Store Integration**: Now uses Zustand store instead of local useState
- **Preserved API**: Maintains the same public API for backward compatibility
- **Enhanced Error Handling**: Better error management with persistent error states
- **Optimized Checks**: Prevents redundant server checks with proper state management

### 3. Key Features

#### Persistent State
- Connection status persists across page refreshes
- Server check timestamps are maintained
- Error messages are preserved

#### Smart Storage Strategy
- Uses **sessionStorage** (not localStorage) for session-specific data
- Only persists relevant data (`lastServerCheck`, `serverError`)
- Excludes temporary states (`isChecking`, live connectivity status)

#### Backward Compatibility
- All existing hooks maintain their original API
- `useConnectionStatus()` - Full connection status with actions
- `useOnlineStatus()` - Simple boolean status
- `useConnectionEvents()` - Event-based connection monitoring

## Usage Examples

### Basic Usage
```tsx
import { useConnectionStatus } from '../hooks/useConnectionStatus';

function MyComponent() {
  const { isOnline, isServerReachable, checkServerConnection } = useConnectionStatus();

  return (
    <div>
      Status: {isOnline ? 'Online' : 'Offline'}
      <button onClick={checkServerConnection}>Check Server</button>
    </div>
  );
}
```

### Simple Boolean Status
```tsx
import { useOnlineStatus } from '../hooks/useConnectionStatus';

function SimpleComponent() {
  const isOnline = useOnlineStatus();
  return <div>Status: {isOnline ? '🟢' : '🔴'}</div>;
}
```

### Connection Events
```tsx
import { useConnectionEvents } from '../hooks/useConnectionStatus';

function EventComponent() {
  useConnectionEvents(
    () => console.log('Back online!'),
    () => console.log('Gone offline!'),
    () => console.log('Server reconnected!'),
    () => console.log('Server disconnected!')
  );

  return <div>Check console for connection events</div>;
}
```

### Direct Store Access (Advanced)
```tsx
import { useConnectionSelectors, useConnectionStore } from '../store/connectionStore';

function AdvancedComponent() {
  const { isOnline, lastServerCheck } = useConnectionSelectors();
  const resetConnection = useConnectionStore(state => state.resetConnection);

  return (
    <div>
      <p>Online: {isOnline}</p>
      <p>Last Check: {lastServerCheck?.toLocaleString()}</p>
      <button onClick={resetConnection}>Reset</button>
    </div>
  );
}
```

## Benefits

1. **Persistence**: Connection status survives page refreshes
2. **Performance**: Reduced redundant state calculations
3. **Centralized**: Single source of truth for connection state
4. **Scalable**: Easy to extend with additional connection-related state
5. **Type-Safe**: Full TypeScript support with proper typing
6. **Memory Efficient**: Session-based storage prevents data accumulation

## Store Structure

```typescript
interface ConnectionState {
  isNetworkOnline: boolean;          // Browser network status
  isServerReachable: boolean;        // Backend server reachability
  lastServerCheck: Date | null;      // Last successful server check
  serverError: string | null;        // Latest server error message
  isChecking: boolean;              // Currently checking server (not persisted)
}

// Computed properties
isOnline: boolean;                  // Overall connectivity (network + server)
hasConnectionIssues: boolean;       // Network ok but server unreachable
```

## Migration Notes

- No changes required for existing components using the hooks
- State is now persistent across page refreshes within the same session
- Server checks are more intelligent and avoid redundant requests
- Error states are preserved and accessible across the application

This implementation provides a robust foundation for connection management in the exam platform, ensuring reliable offline/online detection crucial for exam integrity.
