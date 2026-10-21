import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    // If we have credentials, connect to production Firebase
    if (projectId && privateKey && clientEmail) {
      try {
        if (!admin.apps.length) {
          this.firebaseApp = admin.initializeApp({
            projectId,
            credential: admin.credential.cert({
              projectId,
              privateKey: privateKey.replace(/\\n/g, '\n'),
              clientEmail,
            }),
          });
          this.logger.log('Firebase: Connected to production');
        } else {
          this.firebaseApp = admin.app();
        }
      } catch (error) {
        this.logger.error('Firebase initialization error:', error);
      }
    } else {
      // Use Firebase emulator for local development
      this.logger.log('Firebase: Connecting to emulator (dev mode)');
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:3613';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:3602';
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:3604';

      if (!admin.apps.length) {
        this.firebaseApp = admin.initializeApp({
          projectId: projectId || 'candid-assist',
        });
      } else {
        this.firebaseApp = admin.app();
      }
    }
  }

  getFirestore(): admin.firestore.Firestore | null {
    if (!this.firebaseApp) {
      return null;
    }
    return this.firebaseApp.firestore();
  }

  getAuth(): admin.auth.Auth | null {
    if (!this.firebaseApp) {
      return null;
    }
    return this.firebaseApp.auth();
  }

  getStorage(): admin.storage.Storage | null {
    if (!this.firebaseApp) {
      return null;
    }
    return this.firebaseApp.storage();
  }

  get appsAvailable(): boolean {
    return this.firebaseApp !== null;
  }
}
