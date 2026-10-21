import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SurfaceDoc, SurfaceStatus, SurfaceUserResponse } from '../../types/firestore';

@Injectable()
export class SurfaceService {
  private readonly logger = new Logger(SurfaceService.name);

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
   * Create a new surface
   */
  async createSurface(
    sessionId: string,
    surfaceType: string,
    prompt: string,
    url?: string,
  ): Promise<SurfaceDoc> {
    const db = this.getDb();
    const now = new Date().toISOString();

    const docRef = await db.collection('surfaces').add({
      sessionId,
      type: surfaceType,
      prompt,
      url: url || null,
      status: 'open',
      userResponse: null,
      claudeResponse: null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      sessionId,
      type: surfaceType,
      prompt,
      url: url || null,
      status: 'open',
      userResponse: null,
      claudeResponse: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get all surfaces for a session
   */
  async getSurfacesBySession(sessionId: string): Promise<SurfaceDoc[]> {
    const db = this.getDb();
    
    const snapshot = await db
      .collection('surfaces')
      .where('sessionId', '==', sessionId)
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<SurfaceDoc, 'id'>,
    }));
  }

  /**
   * Get a specific surface by ID
   */
  async getSurface(surfaceId: string): Promise<SurfaceDoc | null> {
    const db = this.getDb();
    const surfaceDoc = await db.collection('surfaces').doc(surfaceId).get();

    if (!surfaceDoc.exists) {
      return null;
    }

    return {
      id: surfaceDoc.id,
      ...surfaceDoc.data() as Omit<SurfaceDoc, 'id'>,
    };
  }

  /**
   * Get open surfaces for a session
   */
  async getOpenSurfaces(sessionId: string): Promise<SurfaceDoc[]> {
    const db = this.getDb();
    
    const snapshot = await db
      .collection('surfaces')
      .where('sessionId', '==', sessionId)
      .where('status', '==', 'open')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<SurfaceDoc, 'id'>,
    }));
  }

  /**
   * Update surface status
   */
  async updateSurfaceStatus(
    surfaceId: string,
    status: SurfaceStatus,
  ): Promise<void> {
    const db = this.getDb();
    await db.collection('surfaces').doc(surfaceId).update({
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Add user response to a surface (append-only)
   */
  async addResponse(
    surfaceId: string,
    response: SurfaceUserResponse,
  ): Promise<void> {
    const db = this.getDb();
    
    // Surfaces are append-only - create a new document with the response
    const surfaceDoc = await db.collection('surfaces').doc(surfaceId).get();
    if (!surfaceDoc.exists) {
      throw new NotFoundException('Surface not found');
    }

    const currentData = surfaceDoc.data();
    const newDocRef = await db.collection('surfaces').add({
      ...currentData,
      id: undefined, // Firestore will assign new ID
      userResponse: response,
      updatedAt: new Date().toISOString(),
    });

    // Update original surface to point to latest response
    await db.collection('surfaces').doc(surfaceId).update({
      userResponse: response,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Add Claude response to a surface
   */
  async addClaudeResponse(
    surfaceId: string,
    claudeResponse: any, // SurfaceClaudeResponse
  ): Promise<void> {
    const db = this.getDb();
    
    await db.collection('surfaces').doc(surfaceId).update({
      claudeResponse,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Dismiss a surface (soft delete)
   */
  async dismissSurface(surfaceId: string): Promise<void> {
    const db = this.getDb();
    await db.collection('surfaces').doc(surfaceId).update({
      status: 'dismissed',
      updatedAt: new Date().toISOString(),
    });
  }
}
