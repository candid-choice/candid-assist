/** Human Assist — Error Hierarchy & Types.

Defines the complete error taxonomy for the app.
Each error has a code, severity, human message, and optional recovery action.

Error hierarchy (bottom to top):
  Surface → Session → Backend → App → System
*/

// ── Severity ───────────────────────────────────────────────────────────────

export enum ErrorSeverity {
  P0 = 0,
  P1 = 1,
  P2 = 2,
  P3 = 3,
  P4 = 4,
}

export function severityLabel(sev: ErrorSeverity): string {
  return { 0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' }[sev];
}

export function severityIsUserVisible(sev: ErrorSeverity): boolean {
  return sev <= ErrorSeverity.P1;
}

// ── Error Code ─────────────────────────────────────────────────────────────

export enum ErrorCode {
  NETWORK_OFFLINE = 'NET_OFFLINE',
  NETWORK_TIMEOUT = 'NET_TIMEOUT',
  NETWORK_CONNECTION_LOST = 'NET_CONN_LOST',
  NETWORK_RECONNECTED = 'NET_RECONNECTED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_SUSPENDED = 'AUTH_SUSPENDED',
  AUTH_NETWORK_FAILED = 'AUTH_NETWORK_FAILED',
  AUTH_REAUTH_OK = 'AUTH_REAUTH_OK',
  SURFACE_RENDER_FAILED = 'SURF_RENDER_FAILED',
  SURFACE_API_ERROR = 'SURF_API_ERROR',
  SURFACE_DISCONNECT = 'SURF_DISCONNECT',
  SURFACE_TIMEOUT = 'SURF_TIMEOUT',
  SURFACE_MAX_REACHED = 'SURF_MAX_REACHED',
  SURFACE_LOAD_FAILED = 'SURF_LOAD_FAILED',
  SESSION_CREATE_FAILED = 'SESS_CREATE_FAILED',
  SESSION_NOT_FOUND = 'SESS_NOT_FOUND',
  SESSION_UPDATE_FAILED = 'SESS_UPDATE_FAILED',
  SESSION_ARCHIVE_FAILED = 'SESS_ARCHIVE_FAILED',
  SESSION_TOO_MANY = 'SESS_TOO_MANY',
  WRITE_FAILED = 'WRITE_FAILED',
  FIRESTORE_ERROR = 'FIRESTORE_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  HTTP_CONSECUTIVE_FAILURES = 'HTTP_CONSECUTIVE_FAILURES',
  MCP_START_FAILED = 'MCP_START_FAILED',
  APP_CRASH = 'APP_CRASH',
  APP_QUIT = 'APP_QUIT',
  WORKSPACE_INACCESSIBLE = 'WORKSPACE_INACCESSIBLE',
  LOW_STORAGE = 'LOW_STORAGE',
  OFFLINE_REPLAY_SUCCESS = 'OFFLINE_REPLAY_OK',
  OFFLINE_QUEUE_OVERFLOW = 'OFFLINE_QUEUE_OVERFLOW',
}

// ── Error Info ─────────────────────────────────────────────────────────────

export interface ErrorInfo {
  code: ErrorCode;
  severity: ErrorSeverity;
  message: string;
  recovery?: string;
  showToast?: boolean;
  showOverlay?: boolean;
  showInline?: boolean;
  retry?: {
    maxRetries: number;
    baseMs: number;
    backoff: 'exponential' | 'linear';
    maxDurationMs: number;
  };
  context?: Record<string, unknown>;
}

// ── HAError ─────────────────────────────────────────────────────────────────

export class HAError extends Error {
  public readonly showToast?: boolean;
  public readonly showOverlay?: boolean;

  public readonly opts?: Pick<ErrorInfo, 'recovery' | 'retry' | 'context' | 'showToast' | 'showOverlay'>;

  constructor(
    public readonly code: ErrorCode,
    public readonly severity: ErrorSeverity,
    message: string,
    opts?: Pick<ErrorInfo, 'recovery' | 'retry' | 'context' | 'showToast' | 'showOverlay'>,
  ) {
    super(message);
    this.name = 'HAError';
    this.opts = opts;
    this.showToast = opts?.showToast;
    this.showOverlay = opts?.showOverlay;
  }

  toInfo(): ErrorInfo {
    const info: ErrorInfo = {
      code: this.code,
      severity: this.severity,
      message: this.message,
      recovery: this.opts?.recovery,
      showToast: this.showToast ?? severityIsUserVisible(this.severity),
      showOverlay: this.showOverlay ?? false,
      retry: this.opts?.retry,
      context: this.opts?.context,
    };
    return info;
  }
}

// ── Error Factory ──────────────────────────────────────────────────────────

export const Errors = {
  networkOffline: () =>
    new HAError(
      ErrorCode.NETWORK_OFFLINE,
      ErrorSeverity.P2,
      'No internet connection — actions queued locally',
      { recovery: 'Check your network and retry' },
    ),

  networkTimeout: () =>
    new HAError(
      ErrorCode.NETWORK_TIMEOUT,
      ErrorSeverity.P2,
      'Request timed out — queued locally',
      { recovery: 'Check your network and retry' },
    ),

  connectionLost: () =>
    new HAError(
      ErrorCode.NETWORK_CONNECTION_LOST,
      ErrorSeverity.P1,
      'Connection lost — reconnecting...',
      { recovery: 'Waiting for connection to restore', retry: { maxRetries: 5, baseMs: 1000, backoff: 'exponential', maxDurationMs: 31000 } },
    ),

  reconnected: () =>
    new HAError(
      ErrorCode.NETWORK_RECONNECTED,
      ErrorSeverity.P3,
      'Reconnected',
      { retry: { maxRetries: 0, baseMs: 0, backoff: 'linear', maxDurationMs: 0 } },
    ),

  authExpired: () =>
    new HAError(
      ErrorCode.AUTH_EXPIRED,
      ErrorSeverity.P0,
      'Sign-in expired — please sign in again',
      { recovery: 'Tap "Sign In" to authenticate' },
    ),

  authInvalidCredentials: (email: string) =>
    new HAError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      ErrorSeverity.P0,
      `Invalid email or password for ${email}`,
      { recovery: 'Check credentials and try again' },
    ),

  authSuspended: () =>
    new HAError(
      ErrorCode.AUTH_SUSPENDED,
      ErrorSeverity.P0,
      'Your account has been suspended',
    ),

  authNetworkFailed: () =>
    new HAError(
      ErrorCode.AUTH_NETWORK_FAILED,
      ErrorSeverity.P0,
      'Authentication service unavailable — check connection',
      { recovery: 'Check network and try again' },
    ),

  authReauthOk: () =>
    new HAError(
      ErrorCode.AUTH_REAUTH_OK,
      ErrorSeverity.P3,
      'Token re-authenticated silently',
    ),

  surfaceRenderFailed: (type: string) =>
    new HAError(
      ErrorCode.SURFACE_RENDER_FAILED,
      ErrorSeverity.P1,
      `Failed to load surface content (${type})`,
      { recovery: 'Retry or dismiss' },
    ),

  surfaceApiError: (status: number) =>
    new HAError(
      ErrorCode.SURFACE_API_ERROR,
      ErrorSeverity.P1,
      `Backend error (${status}) — please try again`,
      { recovery: 'Retry fetches from backend', retry: { maxRetries: 3, baseMs: 200, backoff: 'linear', maxDurationMs: 1000 } },
    ),

  surfaceDisconnect: () =>
    new HAError(
      ErrorCode.SURFACE_DISCONNECT,
      ErrorSeverity.P1,
      'Claude disconnected — this surface will be abandoned',
      { recovery: 'Surface stays open; retry when Claude reconnects' },
    ),

  surfaceTimeout: (id: string) =>
    new HAError(
      ErrorCode.SURFACE_TIMEOUT,
      ErrorSeverity.P2,
      `Surface ${id} timed out after 30 minutes`,
      { recovery: 'Data preserved in session; reopen on next launch' },
    ),

  surfaceMaxReached: () =>
    new HAError(
      ErrorCode.SURFACE_MAX_REACHED,
      ErrorSeverity.P1,
      'Maximum 10 surfaces open at once — please close one',
      { recovery: 'Close a surface before pushing a new one' },
    ),

  surfaceLoadFailed: (_url?: string) =>
    new HAError(
      ErrorCode.SURFACE_LOAD_FAILED,
      ErrorSeverity.P1,
      'Failed to load surface — [Retry] [Dismiss]',
      { recovery: 'Retry from backend; dismiss closes surface' },
    ),

  sessionCreateFailed: () =>
    new HAError(
      ErrorCode.SESSION_CREATE_FAILED,
      ErrorSeverity.P1,
      'Failed to create session',
      { recovery: 'Try again or restart Claude Code' },
    ),

  sessionNotFound: (id: string) =>
    new HAError(
      ErrorCode.SESSION_NOT_FOUND,
      ErrorSeverity.P1,
      `Session ${id} not found`,
      { recovery: 'Back to sessions' },
    ),

  sessionUpdateFailed: () =>
    new HAError(
      ErrorCode.SESSION_UPDATE_FAILED,
      ErrorSeverity.P1,
      'Failed to save session — queued locally',
      { recovery: 'Auto-replay on reconnect' },
    ),

  sessionTooMany: () =>
    new HAError(
      ErrorCode.SESSION_TOO_MANY,
      ErrorSeverity.P2,
      'Too many sessions open (max 50)',
      { recovery: 'Archive old sessions to free slots' },
    ),

  writeFailed: () =>
    new HAError(
      ErrorCode.WRITE_FAILED,
      ErrorSeverity.P2,
      'Failed to save — queued locally',
      { recovery: 'Will replay on reconnect', retry: { maxRetries: 3, baseMs: 100, backoff: 'exponential', maxDurationMs: 2000 } },
    ),

  firestoreError: (details?: string) =>
    new HAError(
      ErrorCode.FIRESTORE_ERROR,
      ErrorSeverity.P2,
      `Firestore error${details ? `: ${details}` : ''}`,
      { recovery: 'Check Firebase configuration' },
    ),

  httpError: (status: number, attempts: number) =>
    new HAError(
      ErrorCode.HTTP_ERROR,
      attempts >= 3 ? ErrorSeverity.P1 : ErrorSeverity.P2,
      attempts >= 3
        ? `Connection lost — try again (${status})`
        : `Request failed (${status})`,
      { recovery: 'Retry after network recovers', retry: { maxRetries: 3, baseMs: 200, backoff: 'linear', maxDurationMs: 5000 } },
    ),

  httpConsecutiveFailures: () =>
    new HAError(
      ErrorCode.HTTP_CONSECUTIVE_FAILURES,
      ErrorSeverity.P1,
      'Connection lost — try again',
      { recovery: 'Check network and retry' },
    ),

  mcpStartFailed: (port: number) =>
    new HAError(
      ErrorCode.MCP_START_FAILED,
      ErrorSeverity.P0,
      `MCP server cannot start — port ${port} blocked`,
      { recovery: 'Close other processes using port 3615' },
    ),

  appCrash: () =>
    new HAError(
      ErrorCode.APP_CRASH,
      ErrorSeverity.P0,
      'We noticed the app crashed — here is what we recovered',
    ),

  appQuit: () =>
    new HAError(
      ErrorCode.APP_QUIT,
      ErrorSeverity.P2,
      'Quitting — all active surfaces sending { completed: false }',
    ),

  workspaceInaccessible: () =>
    new HAError(
      ErrorCode.WORKSPACE_INACCESSIBLE,
      ErrorSeverity.P0,
      'Cannot access workspace — please select a folder',
      { recovery: 'Open a folder via Claude Code' },
    ),

  lowStorage: () =>
    new HAError(
      ErrorCode.LOW_STORAGE,
      ErrorSeverity.P2,
      'Low storage — queued actions may not save',
      { recovery: 'Free up disk space' },
    ),

  offlineReplaySuccess: () =>
    new HAError(
      ErrorCode.OFFLINE_REPLAY_SUCCESS,
      ErrorSeverity.P3,
      'Offline queue replayed successfully',
      { retry: { maxRetries: 0, baseMs: 0, backoff: 'linear', maxDurationMs: 0 } },
    ),

  offlineQueueOverflow: () =>
    new HAError(
      ErrorCode.OFFLINE_QUEUE_OVERFLOW,
      ErrorSeverity.P3,
      'Offline queue full — oldest actions dropped',
      { recovery: 'Reconnect soon to prevent data loss' },
    ),
};

// ── Severity helpers ───────────────────────────────────────────────────────

export function defaultSeverity(code: ErrorCode): ErrorSeverity {
  const m: Record<ErrorCode, ErrorSeverity> = {
    [ErrorCode.NETWORK_OFFLINE]: ErrorSeverity.P2,
    [ErrorCode.NETWORK_TIMEOUT]: ErrorSeverity.P2,
    [ErrorCode.NETWORK_CONNECTION_LOST]: ErrorSeverity.P1,
    [ErrorCode.NETWORK_RECONNECTED]: ErrorSeverity.P3,
    [ErrorCode.AUTH_EXPIRED]: ErrorSeverity.P0,
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: ErrorSeverity.P0,
    [ErrorCode.AUTH_SUSPENDED]: ErrorSeverity.P0,
    [ErrorCode.AUTH_NETWORK_FAILED]: ErrorSeverity.P0,
    [ErrorCode.AUTH_REAUTH_OK]: ErrorSeverity.P3,
    [ErrorCode.SURFACE_RENDER_FAILED]: ErrorSeverity.P1,
    [ErrorCode.SURFACE_API_ERROR]: ErrorSeverity.P1,
    [ErrorCode.SURFACE_DISCONNECT]: ErrorSeverity.P1,
    [ErrorCode.SURFACE_TIMEOUT]: ErrorSeverity.P2,
    [ErrorCode.SURFACE_MAX_REACHED]: ErrorSeverity.P1,
    [ErrorCode.SURFACE_LOAD_FAILED]: ErrorSeverity.P1,
    [ErrorCode.SESSION_CREATE_FAILED]: ErrorSeverity.P1,
    [ErrorCode.SESSION_NOT_FOUND]: ErrorSeverity.P1,
    [ErrorCode.SESSION_UPDATE_FAILED]: ErrorSeverity.P1,
    [ErrorCode.SESSION_ARCHIVE_FAILED]: ErrorSeverity.P2,
    [ErrorCode.SESSION_TOO_MANY]: ErrorSeverity.P2,
    [ErrorCode.WRITE_FAILED]: ErrorSeverity.P2,
    [ErrorCode.FIRESTORE_ERROR]: ErrorSeverity.P2,
    [ErrorCode.HTTP_ERROR]: ErrorSeverity.P2,
    [ErrorCode.HTTP_CONSECUTIVE_FAILURES]: ErrorSeverity.P1,
    [ErrorCode.MCP_START_FAILED]: ErrorSeverity.P0,
    [ErrorCode.APP_CRASH]: ErrorSeverity.P0,
    [ErrorCode.APP_QUIT]: ErrorSeverity.P2,
    [ErrorCode.WORKSPACE_INACCESSIBLE]: ErrorSeverity.P0,
    [ErrorCode.LOW_STORAGE]: ErrorSeverity.P2,
    [ErrorCode.OFFLINE_REPLAY_SUCCESS]: ErrorSeverity.P3,
    [ErrorCode.OFFLINE_QUEUE_OVERFLOW]: ErrorSeverity.P3,
  };
  return m[code] ?? ErrorSeverity.P3;
}

export function shouldToast(info: ErrorInfo): boolean {
  return info.showToast ?? severityIsUserVisible(info.severity);
}

export function isBlocking(info: ErrorInfo): boolean {
  return info.showOverlay ?? info.severity === ErrorSeverity.P0;
}
