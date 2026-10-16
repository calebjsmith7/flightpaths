import 'server-only';
import { adminDb } from './firebase/admin';

export type UserProfile = {
  uid: string;
  email: string | null;
  recentRoutes: string[];
};

// gRPC status for a create() that hits an existing document.
const ALREADY_EXISTS = 6;

// Firebase has no separate sign-up step (Google and email-link sign-in create
// the account on first use), so this runs on every sign-in and only writes the
// first time.
export async function ensureUserProfile(uid: string, email: string | null) {
  const profile: UserProfile = { uid, email, recentRoutes: [] };
  try {
    await adminDb.collection('userprofiles').doc(uid).create(profile);
  } catch (error) {
    if ((error as { code?: number }).code !== ALREADY_EXISTS) {
      throw error;
    }
  }
}
