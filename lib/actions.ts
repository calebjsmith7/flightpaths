'use server';

import { redirect } from 'next/navigation';
import { adminAuth } from './firebase/admin';
import { ensureUserProfile } from './profile';
import { createSession, deleteSession } from './session';

export type SessionResult = {
  error?: string;
};

// Called by the sign-in form after Firebase has authenticated the user in the
// browser. createSessionCookie verifies the ID token, so a forged token fails here.
export async function startSession(idToken: string, remember: boolean): Promise<SessionResult> {
  try {
    const { uid, email } = await adminAuth.verifyIdToken(idToken);
    await ensureUserProfile(uid, email ?? null);
    await createSession(idToken, { remember });
  } catch (error) {
    console.error('Failed to create session', error);
    return { error: 'Could not start your session. Please try again.' };
  }
  redirect('/');
}

export async function endSession() {
  await deleteSession();
  redirect('/sign-in');
}
