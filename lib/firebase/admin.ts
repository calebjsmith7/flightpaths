import 'server-only';
import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Server-side Firebase. On App Hosting the runtime service account supplies
// credentials automatically; locally, point GOOGLE_APPLICATION_CREDENTIALS at a
// service account key (see README).
const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
