/**
 * Firestore data model types.
 *
 * Collections: users, sessions, surfaces, notifications
 *
 * Rules:
 *  - User owns their data.
 *  - Surfaces are immutable (append-only).
 *  - Sessions are soft-deleted via `archivedAt`.
 *  - Notifications expire after 7 days.
 */

// ──────────────────────────────────────────────
// Common
// ──────────────────────────────────────────────

/** Firestore server-timestamp placeholder (set via FieldValue.serverTimestamp()). */
export declare class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
}

type Nullable<T> = T | null;

/** ISO-8601 UTC string timestamp */
export type TimestampString = string;

// ──────────────────────────────────────────────
// users
// ──────────────────────────────────────────────

/** Workspace configuration for the user. */
export interface UserWorkspace {
  /** Absolute filesystem path to the workspace root. */
  path: string;
  /** Remote git URL, e.g. "https://github.com/org/repo". */
  gitUrl: Nullable<string>;
  /** When the workspace was first linked. */
  createdAt: TimestampString;
}

/** MCP server connection info. */
export interface UserMcpConfig {
  /** Server endpoint, e.g. "http://localhost:3613/mcp". */
  endpoint: string;
  /** Whether the connection is active / verified. */
  active: boolean;
}

/** Surface-related preferences. */
export interface UserSurfacePreferences {
  /** Automatically minimize surfaces when a new one opens. */
  autoMinimize: boolean;
  /** Show toast/banner notifications for surface events. */
  showNotifications: boolean;
}

/** User preferences snapshot. */
export interface UserPreferences {
  theme: 'light' | 'dark';
  surfaces: UserSurfacePreferences;
}

/**
 * User profile document.
 *
 * One document per user in the `users` collection.
 */
export interface UserProfile {
  /** Firestore document ID (same as Firebase UID). */
  id: string;
  email: string;
  name: Nullable<string>;
  photoURL: Nullable<string>;
  workspace: UserWorkspace;
  mcp: UserMcpConfig;
  preferences: UserPreferences;
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

// ──────────────────────────────────────────────
// sessions
// ──────────────────────────────────────────────

/** Session status values. */
export type SessionStatus = 'active' | 'waiting' | 'done' | 'error';

/** User's response on a surface. */
export interface SurfaceUserResponse {
  type: 'feedback' | 'approval' | 'dismiss';
  text: string;
}

/** Claude / MCP response summary on a surface. */
export interface SurfaceClaudeResponse {
  type: 'action' | 'summary' | 'error';
  text: string;
}

/**
 * Embedded surface snapshot stored inside a session document.
 *
 * Surfaces also have their own top-level `surfaces` collection;
 * this embedded copy is a lightweight read-optimization for session listing.
 */
export interface EmbeddedSurface {
  surfaceId: string;
  type: string;
  url: Nullable<string>;
  prompt: string;
  createdAt: TimestampString;
  userResponse: Nullable<SurfaceUserResponse>;
  claudeResponse: Nullable<SurfaceClaudeResponse>;
  closedAt: Nullable<TimestampString>;
}

/**
 * Session document in the `sessions` collection.
 *
 * Each session owns its embedded surfaces array (append-only).
 */
export interface SessionDoc {
  id: string;
  userId: string;
  title: string;
  status: SessionStatus;
  /** Embedded surface snapshots — append-only. */
  surfaces: EmbeddedSurface[];
  createdAt: TimestampString;
  updatedAt: TimestampString;
  /** When the session was archived (soft-delete). */
  archivedAt: Nullable<TimestampString>;
}

// ──────────────────────────────────────────────
// surfaces
// ──────────────────────────────────────────────

/** Surface status values. */
export type SurfaceStatus = 'open' | 'responding' | 'complete' | 'dismissed';

/**
 * Standalone surface document in the `surfaces` collection.
 *
 * Surfaces are immutable once saved — append-only via new documents.
 */
export interface SurfaceDoc {
  id: string;
  sessionId: string;
  type: string;
  url: Nullable<string>;
  prompt: string;
  status: SurfaceStatus;
  userResponse: Nullable<SurfaceUserResponse>;
  claudeResponse: Nullable<SurfaceClaudeResponse>;
  createdAt: TimestampString;
  updatedAt: TimestampString;
}

// ──────────────────────────────────────────────
// notifications
// ──────────────────────────────────────────────

/** Notification message entry. */
export interface NotificationMessage {
  id: string;
  type: 'surface' | 'session' | 'system';
  surfaceId: Nullable<string>;
  message: string;
  /** Arbitrary surface/session payload for toast/content. */
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: TimestampString;
}

/** Notification preferences. */
export interface NotificationPreferences {
  surfaceNotifications: boolean;
  sessionNotifications: boolean;
  soundEnabled: boolean;
}

/**
 * Notifications document — one per user in the `notifications` collection.
 *
 * Ephemeral: messages older than 7 days may be pruned.
 */
export interface NotificationDoc {
  /** Firestore document ID matches `userId`. */
  userId: string;
  messages: NotificationMessage[];
  preferences: NotificationPreferences;
}

// ──────────────────────────────────────────────
// Query helpers (type-safe field paths)
// ──────────────────────────────────────────────

/** Strongly-typed field path enums for queries. */
export namespace Fields {
  // sessions
  export const sessionIdUserId = 'userId' as const;
  export const sessionIdStatus = 'status' as const;
  export const sessionIdUpdatedAt = 'updatedAt' as const;

  // surfaces
  export const surfaceSessionId = 'sessionId' as const;
  export const surfaceStatus = 'status' as const;

  // users
  export const userIdField = 'id' as const;
}

/** Firestore index definitions for `firestore.indexes.json`. */
export interface FirestoreIndexDefinition {
  collectionId: string;
  fields: Array<{ fieldPath: string; mode: 'ASCENDING' | 'DESCENDING' | 'INDEX_DISABLE' }>;
}
