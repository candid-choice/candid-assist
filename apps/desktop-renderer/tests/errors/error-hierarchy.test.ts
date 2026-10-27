import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  ErrorSeverity,
  HAError,
  Errors,
  defaultSeverity,
  shouldToast,
  isBlocking,
  severityLabel,
  severityIsUserVisible,
} from '@/views/errors/error-hierarchy';

describe('ErrorSeverity', () => {
  it('should have correct severity values', () => {
    expect(ErrorSeverity.P0).toBe(0);
    expect(ErrorSeverity.P1).toBe(1);
    expect(ErrorSeverity.P2).toBe(2);
    expect(ErrorSeverity.P3).toBe(3);
    expect(ErrorSeverity.P4).toBe(4);
  });
});

describe('severityLabel', () => {
  it('should return correct label for each severity', () => {
    expect(severityLabel(ErrorSeverity.P0)).toBe('P0');
    expect(severityLabel(ErrorSeverity.P1)).toBe('P1');
    expect(severityLabel(ErrorSeverity.P2)).toBe('P2');
    expect(severityLabel(ErrorSeverity.P3)).toBe('P3');
    expect(severityLabel(ErrorSeverity.P4)).toBe('P4');
  });
});

describe('severityIsUserVisible', () => {
  it('should return true for P0 and P1', () => {
    expect(severityIsUserVisible(ErrorSeverity.P0)).toBe(true);
    expect(severityIsUserVisible(ErrorSeverity.P1)).toBe(true);
  });

  it('should return false for P2, P3, and P4', () => {
    expect(severityIsUserVisible(ErrorSeverity.P2)).toBe(false);
    expect(severityIsUserVisible(ErrorSeverity.P3)).toBe(false);
    expect(severityIsUserVisible(ErrorSeverity.P4)).toBe(false);
  });
});

describe('HAError', () => {
  it('should create error with required parameters', () => {
    const error = new HAError(
      ErrorCode.NETWORK_OFFLINE,
      ErrorSeverity.P2,
      'Test message',
    );

    expect(error.code).toBe(ErrorCode.NETWORK_OFFLINE);
    expect(error.severity).toBe(ErrorSeverity.P2);
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('HAError');
    expect(error.opts).toBeUndefined();
  });

  it('should create error with options', () => {
    const error = new HAError(
      ErrorCode.SESSION_UPDATE_FAILED,
      ErrorSeverity.P1,
      'Test message',
      { recovery: 'Try again' },
    );

    expect(error.opts?.recovery).toBe('Try again');
  });

  it('should create error with retry options', () => {
    const retry = {
      maxRetries: 3,
      baseMs: 100,
      backoff: 'exponential' as const,
      maxDurationMs: 1000,
    };

    const error = new HAError(
      ErrorCode.WRITE_FAILED,
      ErrorSeverity.P2,
      'Write failed',
      { retry },
    );

    expect(error.opts?.retry).toEqual(retry);
  });

  it('toInfo should return correct ErrorInfo', () => {
    const error = new HAError(
      ErrorCode.NETWORK_TIMEOUT,
      ErrorSeverity.P2,
      'Test timeout',
      { recovery: 'Check network' },
    );

    const info = error.toInfo();

    expect(info.code).toBe(ErrorCode.NETWORK_TIMEOUT);
    expect(info.severity).toBe(ErrorSeverity.P2);
    expect(info.message).toBe('Test timeout');
    expect(info.recovery).toBe('Check network');
  });

  it('toInfo should set showToast based on severity', () => {
    const p1Error = new HAError(
      ErrorCode.APP_CRASH,
      ErrorSeverity.P0,
      'P0 error',
    );
    expect(p1Error.toInfo().showToast).toBe(true);

    const p2Error = new HAError(
      ErrorCode.NETWORK_OFFLINE,
      ErrorSeverity.P2,
      'P2 error',
    );
    expect(p2Error.toInfo().showToast).toBe(false);
  });

  it('should handle custom showToast and showOverlay', () => {
    const error = new HAError(
      ErrorCode.AUTH_EXPIRED,
      ErrorSeverity.P0,
      'Auth expired',
      {
        showToast: false,
        showOverlay: true,
      },
    );

    const info = error.toInfo();
    expect(info.showToast).toBe(false);
    expect(info.showOverlay).toBe(true);
  });
});

describe('Errors factory', () => {
  it('should create network offline error', () => {
    const error = Errors.networkOffline();
    expect(error.code).toBe(ErrorCode.NETWORK_OFFLINE);
    expect(error.severity).toBe(ErrorSeverity.P2);
    expect(error.message).toContain('No internet');
  });

  it('should create auth expired error', () => {
    const error = Errors.authExpired();
    expect(error.code).toBe(ErrorCode.AUTH_EXPIRED);
    expect(error.severity).toBe(ErrorSeverity.P0);
    expect(error.message).toContain('Sign-in expired');
  });

  it('should create surface render failed error', () => {
    const error = Errors.surfaceRenderFailed('browser');
    expect(error.code).toBe(ErrorCode.SURFACE_RENDER_FAILED);
    expect(error.severity).toBe(ErrorSeverity.P1);
    expect(error.message).toContain('browser');
  });

  it('should create session create failed error', () => {
    const error = Errors.sessionCreateFailed();
    expect(error.code).toBe(ErrorCode.SESSION_CREATE_FAILED);
    expect(error.message).toBe('Failed to create session');
  });

  it('should create workspace inaccessible error', () => {
    const error = Errors.workspaceInaccessible();
    expect(error.code).toBe(ErrorCode.WORKSPACE_INACCESSIBLE);
    expect(error.severity).toBe(ErrorSeverity.P0);
  });

  it('should create offline queue overflow error', () => {
    const error = Errors.offlineQueueOverflow();
    expect(error.code).toBe(ErrorCode.OFFLINE_QUEUE_OVERFLOW);
    expect(error.severity).toBe(ErrorSeverity.P3);
  });
});

describe('defaultSeverity', () => {
  it('should return correct default severity for all codes', () => {
    expect(defaultSeverity(ErrorCode.NETWORK_OFFLINE)).toBe(ErrorSeverity.P2);
    expect(defaultSeverity(ErrorCode.AUTH_EXPIRED)).toBe(ErrorSeverity.P0);
    expect(defaultSeverity(ErrorCode.SURFACE_RENDER_FAILED)).toBe(ErrorSeverity.P1);
    expect(defaultSeverity(ErrorCode.OFFLINE_REPLAY_SUCCESS)).toBe(ErrorSeverity.P3);
  });

  it('should return P3 for unknown codes', () => {
    // @ts-expect-error Testing fallback behavior
    expect(defaultSeverity('UNKNOWN_CODE')).toBe(ErrorSeverity.P3);
  });
});

describe('shouldToast', () => {
  it('should return true for P0 errors', () => {
    const info = {
      code: ErrorCode.APP_CRASH,
      severity: ErrorSeverity.P0,
      message: 'Crash',
    };
    expect(shouldToast(info)).toBe(true);
  });

  it('should respect explicit showToast', () => {
    const info = {
      code: ErrorCode.NETWORK_OFFLINE,
      severity: ErrorSeverity.P2,
      message: 'Offline',
      showToast: true,
    };
    expect(shouldToast(info)).toBe(true);
  });
});

describe('isBlocking', () => {
  it('should return true for P0 errors', () => {
    const info = {
      code: ErrorCode.APP_CRASH,
      severity: ErrorSeverity.P0,
      message: 'Crash',
    };
    expect(isBlocking(info)).toBe(true);
  });

  it('should respect explicit showOverlay', () => {
    const info = {
      code: ErrorCode.NETWORK_OFFLINE,
      severity: ErrorSeverity.P2,
      message: 'Offline',
      showOverlay: true,
    };
    expect(isBlocking(info)).toBe(true);
  });
});
