/** Human Assist — Error Context.

Central error hub that:
- Receives errors from any layer
- Routes to appropriate UI (toast, banner, overlay, inline)
- Tracks error history for session detail
- Logs silently for P3/P4

Used by all components to report errors consistently.
*/

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';

import type { ErrorInfo } from './error-hierarchy';
import { ErrorCode, ErrorSeverity, HAError, shouldToast } from './error-hierarchy';

// ── Error Log Entry ────────────────────────────────────────────────────────

interface ErrorLogEntry {
  id: string;
  info: ErrorInfo;
  timestamp: number;
  message: string;
  shown: number;
}

// ── Reducer ────────────────────────────────────────────────────────────────

interface ErrorState {
  toasts: ErrorInfo[];
  banners: ErrorInfo[];
  overlays: ErrorInfo[];
  inline: ErrorInfo | null;
  log: ErrorLogEntry[];
  maxLog: number;
}

type ErrorAction =
  | { type: 'ADD_ERROR'; error: ErrorInfo }
  | { type: 'DISMISS_TOAST'; index: number }
  | { type: 'CLEAR_INLINE' }
  | { type: 'DISMISS_OVERLAY'; index: number };

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR': {
      const info = action.error;
      const entry: ErrorLogEntry = {
        id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        info,
        timestamp: Date.now(),
        message: info.message,
        shown: 1,
      };

      const nextLog = [...state.log.slice(-state.maxLog), entry];
      let nextState = { ...state, log: nextLog };

      if (info.showOverlay || info.severity === ErrorSeverity.P0) {
        nextState = { ...nextState, overlays: [...state.overlays, info] };
      } else if (info.showInline) {
        nextState = { ...nextState, inline: info };
      } else if (shouldToast(info)) {
        const lastToast = state.toasts[state.toasts.length - 1];
        if (lastToast?.message !== info.message) {
          nextState = { ...nextState, toasts: [...state.toasts.slice(-8), info] };
        }
      }

      return nextState;
    }

    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((_, idx) => idx !== action.index) };

    case 'CLEAR_INLINE':
      return { ...state, inline: null };

    case 'DISMISS_OVERLAY':
      return { ...state, overlays: state.overlays.filter((_, idx) => idx !== action.index) };

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────

interface ErrorContextValue {
  state: ErrorState;
  report: (error: HAError | ErrorInfo) => void;
  reportHangingSurface: () => void;
  reportSurfaceError: (type: string, details?: string) => void;
  reportSessionError: (msg: string, code?: ErrorCode) => void;
  reportNetworkError: (code?: ErrorCode) => void;
  reportAppError: (code?: ErrorCode) => void;
  dismissToast: (index: number) => void;
  dismissInline: () => void;
  dismissOverlay: (index: number) => void;
  clearAll: () => void;
  log: ErrorLogEntry[];
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(errorReducer, {
    toasts: [],
    banners: [],
    overlays: [],
    inline: null,
    log: [],
    maxLog: 1000,
  });

  const report = useCallback(
    (error: HAError | ErrorInfo) => {
      if (error instanceof HAError) {
        dispatch({ type: 'ADD_ERROR', error: error.toInfo() });
      } else {
        dispatch({ type: 'ADD_ERROR', error });
      }
    },
    [dispatch],
  );

  const reportHangingSurface = useCallback(() => {
    report(
      new HAError(
        ErrorCode.SURFACE_RENDER_FAILED,
        ErrorSeverity.P1,
        'A surface was left hanging — please close it',
        { recovery: 'Close the surface from the sidebar' },
      ),
    );
  }, [report]);

  const reportSurfaceError = useCallback(
    (type: string, details?: string) => {
      report(
        new HAError(
          ErrorCode.SURFACE_RENDER_FAILED,
          ErrorSeverity.P1,
          `Surface ${type} failed to render${details ? `: ${details}` : ''}`,
          { recovery: 'Close and retry, or open a new surface' },
        ),
      );
    },
    [report],
  );

  const reportSessionError = useCallback(
    (msg: string, code?: ErrorCode) => {
      report(
        new HAError(
          code ?? ErrorCode.SESSION_UPDATE_FAILED,
          ErrorSeverity.P1,
          msg,
          { recovery: 'Try again or restart the session' },
        ),
      );
    },
    [report],
  );

  const reportNetworkError = useCallback(
    (code?: ErrorCode) => {
      report(
        new HAError(
          code ?? ErrorCode.NETWORK_OFFLINE,
          ErrorSeverity.P2,
          code === ErrorCode.NETWORK_OFFLINE
            ? 'No internet — actions queued locally'
            : code === ErrorCode.NETWORK_TIMEOUT
              ? 'Request timed out'
              : 'Connection lost',
          { recovery: 'Check your network and retry' },
        ),
      );
    },
    [report],
  );

  const reportAppError = useCallback(
    (code?: ErrorCode) => {
      report(
        new HAError(
          code ?? ErrorCode.APP_CRASH,
          ErrorSeverity.P0,
          'Application error — please restart',
          { recovery: 'Restart the app' },
        ),
      );
    },
    [report],
  );

  const dismissToast = useCallback((index: number) => {
    dispatch({ type: 'DISMISS_TOAST', index });
  }, []);

  const dismissInline = useCallback(() => {
    dispatch({ type: 'CLEAR_INLINE' });
  }, []);

  const dismissOverlay = useCallback((index: number) => {
    dispatch({ type: 'DISMISS_OVERLAY', index });
  }, []);

  const clearAll = useCallback(() => {
    state.toasts.forEach((_, index) => {
      dispatch({ type: 'DISMISS_TOAST', index });
    });
    dispatch({ type: 'CLEAR_INLINE' });
    state.overlays.forEach((_, index) => {
      dispatch({ type: 'DISMISS_OVERLAY', index });
    });
  }, [state.toasts, state.overlays]);

  return (
    <ErrorContext.Provider
      value={{
        state,
        report,
        reportHangingSurface,
        reportSurfaceError,
        reportSessionError,
        reportNetworkError,
        reportAppError,
        dismissToast,
        dismissInline,
        dismissOverlay,
        clearAll,
        log: state.log,
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Consume error context.
 *
 * Usage:
 *   const { report, log } = useErrors()
 *   report(Errors.surfaceTimeout('surf_abc123'))
 */
export function useErrors(): ErrorContextValue {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useErrors must be used within ErrorProvider');
  return ctx;
}
