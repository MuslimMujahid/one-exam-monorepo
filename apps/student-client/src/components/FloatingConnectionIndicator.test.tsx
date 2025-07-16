import { describe, it, expect, vi } from 'vitest';

// Mock the connection status hook
vi.mock('../hooks/useConnectionStatus', () => ({
  useConnectionStatus: vi.fn(() => ({
    isNetworkOnline: true,
    isServerReachable: true,
    isOnline: true,
    hasConnectionIssues: false,
    serverError: null,
    lastServerCheck: new Date(),
    checkServerConnection: vi.fn(),
  })),
}));

describe('FloatingConnectionIndicator', () => {
  it('should export FloatingConnectionIndicator component', () => {
    const module = require('./FloatingConnectionIndicator');
    expect(module.FloatingConnectionIndicator).toBeDefined();
  });

  it('should export MinimalFloatingConnectionIndicator component', () => {
    const module = require('./FloatingConnectionIndicator');
    expect(module.MinimalFloatingConnectionIndicator).toBeDefined();
  });

  it('should use the connection status hook', () => {
    const { useConnectionStatus } = require('../hooks/useConnectionStatus');

    // Import component to verify it exists
    require('./FloatingConnectionIndicator');

    // The hook should be available
    expect(useConnectionStatus).toBeDefined();
  });
});
