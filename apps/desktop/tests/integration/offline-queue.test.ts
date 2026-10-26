import { describe, it, expect } from 'vitest';

describe('Offline Queue Structure', () => {
  it('should have correct exported interface structure', async () => {
    // Dynamic import to test module structure
    const module = await import('@/views/errors/offline-queue');

    // Check exported functions exist
    expect(typeof module.isIndexedDBAvailable).toBe('function');
    expect(typeof module.queueAction).toBe('function');
    expect(typeof module.replayQueue).toBe('function');
    expect(typeof module.getQueueSize).toBe('function');
    expect(typeof module.clearQueue).toBe('function');
    expect(typeof module.getPendingActions).toBe('function');
  });

  it('should define onReconnect and onDisconnect', async () => {
    const module = await import('@/views/errors/offline-queue');
    expect(typeof module.onReconnect).toBe('function');
    expect(typeof module.onDisconnect).toBe('function');
  });
});

describe('Error Hierarchy Integration', () => {
  it('should have all required error codes', async () => {
    const { ErrorCode } = await import('@/views/errors/error-hierarchy');

    const requiredCodes = [
      'NETWORK_OFFLINE',
      'NETWORK_TIMEOUT',
      'AUTH_EXPIRED',
      'SURFACE_RENDER_FAILED',
      'SESSION_UPDATE_FAILED',
      'WRITE_FAILED',
      'APP_CRASH',
      'OFFLINE_QUEUE_OVERFLOW',
    ];

    requiredCodes.forEach((code) => {
      expect(ErrorCode[code as keyof typeof ErrorCode]).toBeDefined();
    });
  });

  it('should have HAError class with correct methods', async () => {
    const { HAError, ErrorCode, ErrorSeverity } = await import('@/views/errors/error-hierarchy');

    const error = new HAError(
      ErrorCode.NETWORK_OFFLINE,
      ErrorSeverity.P2,
      'Test message',
    );

    expect(typeof error.toInfo).toBe('function');
    expect(typeof error.toString).toBe('function');
  });
});
