import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../firebase/firebase.service';
import {
  UserProfile,
  Nullable,
  UserWorkspace,
  UserMcpConfig,
  UserPreferences,
} from '../types/firestore';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Verify a Firebase ID token and return user claims
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    const auth = this.firebaseService.getAuth();
    if (!auth) {
      throw new UnauthorizedException('Firebase Auth not available');
    }
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }
  }

  /**
   * Get or create a user profile from Firebase auth
   */
  async getOrCreateUser(decodedToken: admin.auth.DecodedIdToken): Promise<UserProfile> {
    const { uid, email, name, picture } = decodedToken;

    // Check if user exists in Firestore
    const userDoc = await this.getUser(uid);

    if (userDoc) {
      // Update user profile if needed
      return userDoc;
    }

    // Create new user
    const now = new Date().toISOString();
    const newUser: UserProfile = {
      id: uid,
      email: email || '',
      name: name || null,
      photoURL: picture || null,
      workspace: {
        path: '',
        gitUrl: null,
        createdAt: now,
      },
      mcp: {
        endpoint: 'http://localhost:3602/mcp',
        active: false,
      },
      preferences: {
        theme: 'dark',
        surfaces: {
          autoMinimize: true,
          showNotifications: true,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    await this.createUser(newUser);

    return newUser;
  }

  /**
   * Get user profile from Firestore
   */
  async getUser(userId: string): Promise<UserProfile | null> {
    const db = this.firebaseService.getFirestore();
    if (!db) {
      return null;
    }
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as UserProfile;
  }

  /**
   * Create a new user document
   */
  async createUser(user: UserProfile): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('users').doc(user.id).set(user);
  }

  /**
   * Update user workspace
   */
  async updateUserWorkspace(userId: string, workspace: UserWorkspace): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('users').doc(userId).update({
      workspace,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Update MCP configuration
   */
  async updateUserMcp(userId: string, mcp: UserMcpConfig): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('users').doc(userId).update({
      mcp,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('users').doc(userId).update({
      preferences,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete user (soft delete - set a flag)
   */
  async deleteUser(userId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('users').doc(userId).update({
      deletedAt: new Date().toISOString(),
    });
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    title: string,
    surfaces: any[] = [],
  ) {
    const db = this.firebaseService.getFirestore();
    if (!db) return null;
    const now = new Date().toISOString();

    const sessionDoc = await db.collection('sessions').add({
      userId,
      title,
      status: 'active',
      surfaces,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    return { id: sessionDoc.id, title, status: 'active', surfaces, createdAt: now, updatedAt: now, archivedAt: null };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const db = this.firebaseService.getFirestore();
    if (!db) return [];
    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<any> {
    const db = this.firebaseService.getFirestore();
    if (!db) return null;
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      return null;
    }

    return { id: sessionDoc.id, ...sessionDoc.data() };
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: 'active' | 'waiting' | 'done' | 'error'): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('sessions').doc(sessionId).update({
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Archive a session (soft delete)
   */
  async archiveSession(sessionId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('sessions').doc(sessionId).update({
      status: 'done',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    if (!db) return;
    await db.collection('sessions').doc(sessionId).update({
      title,
      updatedAt: new Date().toISOString(),
    });
  }
}
