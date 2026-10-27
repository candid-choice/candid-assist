/** Human Assist — Sync Service (renderer → backend → Firestore).

The backend (NestJS, port 3601) is the bridge to Firestore.  The renderer
never talks to Firestore directly — it talks to backend REST endpoints
with the Firebase ID token as `Authorization: Bearer <token>`.

Responsibilities:
  1. REST client (`apiFetch`) with auth from the store.
  2. Initial sync (`syncFromServer`) — fetch sessions, hydrate the store.
  3. Offline-queue replay executor — maps queued ops to REST calls so
     writes made while offline are delivered when connectivity returns.
*/

import { useStore } from '../../store';

import type {
  SessionDoc,
  SessionStatus,
  SurfaceUserResponse,
  EmbeddedSurface,
} from './types';

// ── Backend URL ──────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL
  : 'http://localhost:3601';

export const getBackendUrl = () => BACKEND_URL;

// ── REST client ──────────────────────────────────────────────────────────

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

/** Low-level fetch with Bearer auth from the store. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = useStore.getState().authToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  } catch (err) {
    const e = new Error(`Network error: ${String(err)}`) as ApiError;
    e.code = 'NETWORK_ERROR';
    throw e;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const e = new Error(body.message || `Request failed (${response.status})`) as ApiError;
    e.status = response.status;
    e.code = body.code || `HTTP_${response.status}`;
    throw e;
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ── Session API ──────────────────────────────────────────────────────────

/** Fetch all active sessions for the current user. */
export function fetchSessions(): Promise<SessionDoc[]> {
  return apiFetch<SessionDoc[]>('/sessions');
}

/** Fetch all sessions including archived. */
export function fetchAllSessions(): Promise<SessionDoc[]> {
  return apiFetch<SessionDoc[]>('/sessions/all');
}

export function fetchSession(sessionId: string): Promise<SessionDoc> {
  return apiFetch<SessionDoc>(`/sessions/${sessionId}`);
}

export function createSession(
  title: string,
  workspacePath = '',
): Promise<SessionDoc> {
  return apiFetch<SessionDoc>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, workspacePath }),
  });
}

export function updateSessionTitle(
  sessionId: string,
  title: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/sessions/${sessionId}/title`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
): Promise<{ success: boolean }> {
  return apiFetch(`/sessions/${sessionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function archiveSession(
  sessionId: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/sessions/${sessionId}/archive`, { method: 'POST' });
}

export function deleteSession(
  sessionId: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
}

// ── Surface API ──────────────────────────────────────────────────────────

/** Attach (embed) a surface snapshot to a session document. */
export function addSurfaceToSession(
  sessionId: string,
  surface: EmbeddedSurface,
): Promise<{ success: boolean }> {
  return apiFetch(`/sessions/${sessionId}/surfaces`, {
    method: 'POST',
    body: JSON.stringify(surface),
  });
}

/** Submit the user's response on a surface (via session path). */
export function sendSurfaceResponse(
  sessionId: string,
  surfaceId: string,
  response: SurfaceUserResponse,
): Promise<{ success: boolean }> {
  return apiFetch(`/sessions/${sessionId}/surfaces/${surfaceId}/response`, {
    method: 'POST',
    body: JSON.stringify(response),
  });
}

// ── Initial sync ─────────────────────────────────────────────────────────

/**
 * Fetch server state and hydrate the store.
 * Call after auth is valid and the app is online.
 * Returns the fetched sessions (empty if unauthenticated).
 */
export async function syncFromServer(): Promise<SessionDoc[]> {
  const { authToken, setSessions } = useStore.getState();

  if (!authToken) {
    // Not signed in — nothing to sync.
    return [];
  }

  try {
    const sessions = await fetchSessions();
    setSessions(sessions);
    return sessions;
  } catch (err) {
    const e = err as ApiError;
    if (e.status === 401) {
      // Token expired/invalid — drop auth state, UI shows sign-in.
      useStore.getState().logout();
    }
    throw err;
  }
}

// ── Offline queue executor ───────────────────────────────────────────────

/**
 * Register this executor with the offline queue so queued ops (made
 * while disconnected) replay against the backend when connectivity
 * returns.
 *
 * Ops handled: createSession, updateSession, archiveSession,
 * pushSurface, completeSurface.
 * Unknown ops are treated as no-ops (dropped) to avoid clogging replay.
 */
export async function executeSyncAction(action: {
  op: string;
  data: Record<string, unknown>;
}): Promise<void> {
  switch (action.op) {
    case 'createSession': {
      await createSession(
        String(action.data['title'] ?? 'Untitled'),
        String(action.data['workspacePath'] ?? ''),
      );
      break;
    }
    case 'updateSession': {
      const { sessionId, title, status } = action.data as {
        sessionId: string;
        title?: string;
        status?: SessionStatus;
      };
      if (title) await updateSessionTitle(sessionId, title);
      if (status) await updateSessionStatus(sessionId, status);
      break;
    }
    case 'archiveSession': {
      await archiveSession(String(action.data['sessionId']));
      break;
    }
    case 'pushSurface': {
      // Surface was pushed while offline — embed it into the session.
      const { sessionId, surface } = action.data as {
        sessionId?: string;
        surface?: EmbeddedSurface;
      };
      if (sessionId && surface) {
        await addSurfaceToSession(sessionId, surface);
      }
      break;
    }
    case 'completeSurface': {
      // Responses were already POSTed at submit time when online; when
      // offline they arrive via the queue with session+surface ids.
      const { sessionId, surfaceId, response } = action.data as {
        sessionId?: string;
        surfaceId?: string;
        response?: SurfaceUserResponse;
      };
      if (sessionId && surfaceId && response) {
        await sendSurfaceResponse(sessionId, surfaceId, response);
      }
      break;
    }
    case 'saveSettings':
    case 'sendMessage':
      // Settings/message ops have no backend endpoint yet — drop.
      break;
    default:
      // Unknown op — drop so replay can finish.
      break;
  }
}
