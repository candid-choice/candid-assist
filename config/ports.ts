/**
 * Centralized port allocation for all local services.
 * All values are in the 36xx range to avoid conflicts with
 * common defaults (3000, 4000, 5000, 8080, 9099, 9199).
 */

export const PORTS = {
  WEB: parseInt(process.env.WEB_PORT ?? '3600', 10),
  BACKEND: parseInt(process.env.BACKEND_PORT ?? '3601', 10),

  // Firebase emulator ports
  AUTH: parseInt(process.env.FIREBASE_AUTH_PORT ?? '3602', 10),
  FIRESTORE: parseInt(process.env.FIREBASE_FIRESTORE_PORT ?? '3613', 10),
  STORAGE: parseInt(process.env.FIREBASE_STORAGE_PORT ?? '3604', 10),
  FUNCTIONS: parseInt(process.env.FIREBASE_FUNCTIONS_PORT ?? '3605', 10),
  HOSTING: parseInt(process.env.FIREBASE_HOSTING_PORT ?? '3606', 10),
  UI: parseInt(process.env.FIREBASE_UI_PORT ?? '3607', 10),
  DATABASE: parseInt(process.env.FIREBASE_DATABASE_PORT ?? '3608', 10),
  PUBSUB: parseInt(process.env.FIREBASE_PUBSUB_PORT ?? '3609', 10),
} as const;
