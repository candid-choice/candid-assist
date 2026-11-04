/**
 * Eagerly initialise the default Firebase Admin app.
 *
 * The Functions emulator does not always expose GOOGLE_CLOUD_PROJECT to
 * the child runtime, which leaves firebase-admin unable to determine the
 * project. Initialising with an explicit projectId keeps Admin working
 * locally (against the emulators via FIRESTORE_EMULATOR_HOST /
 * FIREBASE_AUTH_EMULATOR_HOST) and in Cloud (ADC picked up automatically).
 */
import { getApps, initializeApp } from 'firebase-admin/app';

if (!getApps().length) {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    'candid-assist';
  initializeApp({ projectId });
}
