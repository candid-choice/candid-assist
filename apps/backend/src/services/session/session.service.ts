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
   * Create a new session
   */
  async createSession(
    userId: string,
    title: string,
  ): Promise<SessionDoc> {
    const db = this.getDb();
    const now = new Date().toISOString();

    const docRef = await db.collection('sessions').add({
      userId,
      title,
      status: 'active',
      surfaces: [] as EmbeddedSurface[],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
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
      .collection('sessions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<SessionDoc, 'id'>,
    }));
  }

  /**
   * Get all sessions (including archived) for a user
   */
  async getAllUserSessions(userId: string): Promise<SessionDoc[]> {
    const db = this.getDb();
    
    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<SessionDoc, 'id'>,
    }));
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<SessionDoc | null> {
    const db = this.getDb();
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      return null;
    }

    return {
      id: sessionDoc.id,
      ...sessionDoc.data() as Omit<SessionDoc, 'id'>,
    };
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const db = this.getDb();
    await db.collection('sessions').doc(sessionId).update({
      title,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const db = this.getDb();
    await db.collection('sessions').doc(sessionId).update({
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Archive a session (soft delete)
   */
  async archiveSession(sessionId: string): Promise<void> {
    const db = this.getDb();
    await db.collection('sessions').doc(sessionId).update({
      status: 'done',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete a session (hard delete)
   */
  async deleteSession(sessionId: string): Promise<void> {
    const db = this.getDb();
    await db.collection('sessions').doc(sessionId).delete();
  }

  /**
   * Add a surface to a session (embedded)
   */
  async addSurfaceToSession(
    sessionId: string,
    surface: EmbeddedSurface,
  ): Promise<void> {
    const db = this.getDb();
    
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new NotFoundException('Session not found');
    }

    const currentSurfaces = sessionDoc.data()?.surfaces || [];
    const updatedSurfaces = [...currentSurfaces, surface];

    await db.collection('sessions').doc(sessionId).update({
      surfaces: updatedSurfaces,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Add a user response to a surface in a session
   */
  async addResponseToSurface(
    sessionId: string,
    surfaceId: string,
    response: any, // SurfaceUserResponse
  ): Promise<void> {
    const db = this.getDb();
    
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new NotFoundException('Session not found');
    }

    const currentSurfaces = sessionDoc.data()?.surfaces || [];
    const updatedSurfaces = currentSurfaces.map((surface: any) =>
      surface.surfaceId === surfaceId
        ? { ...surface, userResponse: response }
        : surface
    );

    await db.collection('sessions').doc(sessionId).update({
      surfaces: updatedSurfaces,
      updatedAt: new Date().toISOString(),
    });
  }
}
