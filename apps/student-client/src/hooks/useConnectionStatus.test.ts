import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useConnectionStatus, useOnlineStatus } from './useConnectionStatus';

// Mock the auth service
vi.mock('../lib/auth', () => ({
  AuthService: {
    getAccessToken: vi.fn(),
    authenticatedFetch: vi.fn(),
  },
}));

// Mock the connection utils
vi.mock('../lib/connectionUtils', () => ({
  checkServerHealth: vi.fn(),
  checkBasicConnectivity: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.onLine
let mockOnLine = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnLine,
  configurable: true,
});

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnLine = true;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', timestamp: Date.now() }),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isNetworkOnline).toBe(true);
    expect(result.current.isServerReachable).toBe(true);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.hasConnectionIssues).toBe(false);
    expect(result.current.lastServerCheck).toBeNull();
    expect(result.current.serverError).toBeNull();
    expect(typeof result.current.checkServerConnection).toBe('function');
  });

  it('should detect network offline status', async () => {
    const { result } = renderHook(() => useConnectionStatus());

    // Simulate going offline
    act(() => {
      mockOnLine = false;
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isNetworkOnline).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });
  });

  it('should detect network online status', async () => {
    // Start offline
    mockOnLine = false;
    const { result } = renderHook(() => useConnectionStatus());

    // Go online
    act(() => {
      mockOnLine = true;
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.isNetworkOnline).toBe(true);
    });
  });

  it('should handle server unreachable scenario', async () => {
    const { checkServerHealth } = await import('../lib/connectionUtils');
    vi.mocked(checkServerHealth).mockResolvedValue({
      isReachable: false,
      error: 'Server not responding',
    });

    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => {
      await result.current.checkServerConnection();
    });

    await waitFor(() => {
      expect(result.current.isServerReachable).toBe(false);
      expect(result.current.hasConnectionIssues).toBe(true);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.serverError).toBe('Server not responding');
    });
  });

  it('should handle successful server check', async () => {
    const { checkServerHealth } = await import('../lib/connectionUtils');
    vi.mocked(checkServerHealth).mockResolvedValue({
      isReachable: true,
      latency: 100,
    });

    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => {
      await result.current.checkServerConnection();
    });

    await waitFor(() => {
      expect(result.current.isServerReachable).toBe(true);
      expect(result.current.hasConnectionIssues).toBe(false);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.serverError).toBeNull();
      expect(result.current.lastServerCheck).toBeInstanceOf(Date);
    });
  });

  it('should not check server when network is offline', async () => {
    const { checkServerHealth } = await import('../lib/connectionUtils');
    const mockCheckServerHealth = vi.mocked(checkServerHealth);

    mockOnLine = false;
    const { result } = renderHook(() => useConnectionStatus());

    await act(async () => {
      await result.current.checkServerConnection();
    });

    // Should not call checkServerHealth when offline
    expect(mockCheckServerHealth).not.toHaveBeenCalled();
    expect(result.current.serverError).toBe('Network is offline');
  });

  it('should prevent concurrent server checks', async () => {
    const { checkServerHealth } = await import('../lib/connectionUtils');
    const mockCheckServerHealth = vi.mocked(checkServerHealth);

    // Make the first call hang
    mockCheckServerHealth.mockImplementation(
      () =>
        new Promise(() => {
          /* Never resolves */
        })
    );

    const { result } = renderHook(() => useConnectionStatus());

    // Start two concurrent checks
    const promise1 = result.current.checkServerConnection();
    const promise2 = result.current.checkServerConnection();

    await act(async () => {
      await Promise.all([promise1, promise2]);
    });

    // Should only be called once
    expect(mockCheckServerHealth).toHaveBeenCalledTimes(1);
  });
});

describe('useOnlineStatus', () => {
  it('should return true when fully online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('should return false when network is offline', async () => {
    mockOnLine = false;
    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should return false when server is unreachable', async () => {
    const { checkServerHealth } = await import('../lib/connectionUtils');
    vi.mocked(checkServerHealth).mockResolvedValue({
      isReachable: false,
      error: 'Server error',
    });

    const { result } = renderHook(() => useOnlineStatus());

    // Wait for the hook to perform its initial server check
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe('Connection Status Integration', () => {
  it('should handle complete offline to online flow', async () => {
    const { checkServerHealth } = await import('../lib/connectionUtils');

    // Start offline
    mockOnLine = false;
    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isNetworkOnline).toBe(false);
    expect(result.current.isOnline).toBe(false);

    // Network comes back
    act(() => {
      mockOnLine = true;
      window.dispatchEvent(new Event('online'));
    });

    // Mock successful server response
    vi.mocked(checkServerHealth).mockResolvedValue({
      isReachable: true,
      latency: 150,
    });

    await waitFor(() => {
      expect(result.current.isNetworkOnline).toBe(true);
    });

    // Wait for server check to complete
    await waitFor(() => {
      expect(result.current.isServerReachable).toBe(true);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.hasConnectionIssues).toBe(false);
    });
  });

  it('should handle network online but server unreachable', async () => {
    const { checkServerHealth } = await import('../lib/connectionUtils');

    // Mock server failure
    vi.mocked(checkServerHealth).mockResolvedValue({
      isReachable: false,
      error: 'Connection timeout',
    });

    const { result } = renderHook(() => useConnectionStatus());

    // Network is online but server check should fail
    await waitFor(() => {
      expect(result.current.isNetworkOnline).toBe(true);
      expect(result.current.hasConnectionIssues).toBe(true);
      expect(result.current.isOnline).toBe(false);
    });
  });
});
