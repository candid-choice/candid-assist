import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SessionDoc, EmbeddedSurface, SessionStatus } from '../../types/firestore';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private getDb() {
    const db = this.firebaseService.getFirestore();
    if (!db) {
      this.logger.error('Firestore not available — Firebase not configured');
      throw new Error('Firebase Firestore not available');
    }
    return db;
  }

  /**
   * Sessions live in a PER-USER subcollection:
   *   users/{uid}/sessions/{sessionId}
   * A session belongs to exactly one user; there is no top-level
   * `sessions` collection. Every read/write is scoped by construction —
   * knowing another user's session id is not enough to touch it.
   * (The `userId` field is kept denormalized inside the doc for
   * debugging/export convenience.)
   */
  private sessionsPath(userId: string) {
    return `users/${userId}/sessions`;
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    title: string,
    meta?: { agentSessionId?: string; agentClient?: string },
  ): Promise<SessionDoc> {
    const db = this.getDb();
    const now = new Date().toISOString();

    const docRef = await db.collection(this.sessionsPath(userId)).add({
      userId,
      title,
      status: 'active',
      surfaces: [] as EmbeddedSurface[],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      ...(meta?.agentSessionId ? { agentSessionId: meta.agentSessionId } : {}),
      ...(meta?.agentClient ? { agentClient: meta.agentClient } : {}),
    });

    return {
      id: docRef.id,
      userId,
      title,
      status: 'active',
      surfaces: [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
  }

  /**
   * Get all active sessions for a user (most recent first)
   */
  async getUserSessions(userId: string): Promise<SessionDoc[]> {
    const db = this.getDb();

    const snapshot = await db
      .collection(this.sessionsPath(userId))
      .where('status', '==', 'active')
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<SessionDoc, 'id'>),
    }));
  }

  /**
   * Get all sessions (including archived) for a user
   */
  async getAllUserSessions(userId: string): Promise<SessionDoc[]> {
    const db = this.getDb();

    const snapshot = await db
      .collection(this.sessionsPath(userId))
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<SessionDoc, 'id'>),
    }));
  }

  /**
   * Get a specific session by ID — scoped to the owning user.
   */
  async getSession(userId: string, sessionId: string): Promise<SessionDoc | null> {
    const db = this.getDb();
    const sessionDoc = await db
      .collection(this.sessionsPath(userId))
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return null;
    }

    return {
      id: sessionDoc.id,
      ...(sessionDoc.data() as Omit<SessionDoc, 'id'>),
    };
  }

  /**
   * Update session title
   */
  async updateSessionTitle(userId: string, sessionId: string, title: string): Promise<void> {
    const db = this.getDb();
    await db
      .collection(this.sessionsPath(userId))
      .doc(sessionId)
      .update({
        title,
        updatedAt: new Date().toISOString(),
      });
  }

  /**
   * Update session status
   */
  async updateSessionStatus(userId: string, sessionId: string, status: SessionStatus): Promise<void> {
    const db = this.getDb();
    await db
      .collection(this.sessionsPath(userId))
      .doc(sessionId)
      .update({
        status,
        updatedAt: new Date().toISOString(),
      });
  }

  /**
   * Archive a session (soft delete)
   */
  async archiveSession(userId: string, sessionId: string): Promise<void> {
    const db = this.getDb();
    await db
      .collection(this.sessionsPath(userId))
      .doc(sessionId)
      .update({
        status: 'done',
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  }

  /**
   * Delete a session (hard delete)
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const db = this.getDb();
    await db
      .collection(this.sessionsPath(userId))
      .doc(sessionId)
      .delete();
  }

  /**
   * Add a surface to a session (embedded)
   */
  async addSurfaceToSession(
    userId: string,
    sessionId: string,
    surface: EmbeddedSurface,
  ): Promise<void> {
    const db = this.getDb();

    const sessionRef = db.collection(this.sessionsPath(userId)).doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new NotFoundException('Session not found');
    }

    const currentSurfaces = sessionDoc.data()?.surfaces || [];
    const updatedSurfaces = [...currentSurfaces, surface];

    await sessionRef.update({
      surfaces: updatedSurfaces,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Add a user response to a surface in a session
   */
  async addResponseToSurface(
    userId: string,
    sessionId: string,
    surfaceId: string,
    response: unknown, // SurfaceUserResponse
  ): Promise<void> {
    const db = this.getDb();

    const sessionRef = db.collection(this.sessionsPath(userId)).doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      throw new NotFoundException('Session not found');
    }

    const currentSurfaces: Array<Record<string, unknown>> =
      sessionDoc.data()?.surfaces || [];
    const updatedSurfaces = currentSurfaces.map((surface) =>
      surface["surfaceId"] === surfaceId
        ? { ...surface, userResponse: response }
        : surface,
    );

    await sessionRef.update({
      surfaces: updatedSurfaces,
      updatedAt: new Date().toISOString(),
    });
  }
}
