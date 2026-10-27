/** Human Assist — sync service types.

Client-side mirrors of the backend Firestore documents
(`apps/backend/src/types/firestore.ts`).  Kept separate because the
desktop renderer cannot import backend workspace code.
*/

export type SessionStatus = 'active' | 'waiting' | 'done' | 'error';

export interface SurfaceUserResponse {
  type: 'feedback' | 'approval' | 'dismiss';
  text: string;
}

export interface SurfaceClaudeResponse {
  type: 'action' | 'summary' | 'error';
  text: string;
}

/** Embedded surface snapshot inside a session document. */
export interface EmbeddedSurface {
  surfaceId: string;
  type: string;
  url: string | null;
  prompt: string;
  createdAt: string;
  userResponse: SurfaceUserResponse | null;
  claudeResponse: SurfaceClaudeResponse | null;
  closedAt: string | null;
}

/** Session document (mirrors backend `SessionDoc`). */
export interface SessionDoc {
  id: string;
  userId: string;
  title: string;
  status: SessionStatus;
  surfaces: EmbeddedSurface[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
