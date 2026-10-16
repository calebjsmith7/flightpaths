import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from './firebase/admin';

// Sessions are Firebase session cookies: the browser signs in with the Firebase
// SDK, hands us the ID token, and we exchange it for a long-lived, httpOnly
// cookie that the Admin SDK can verify on every request.

export type SessionData = {
  uid: string;
  email: string | null;
};

const COOKIE_NAME = '__session';
const DAY_IN_MS = 24 * 60 * 60 * 1000;
// Firebase caps session cookies at 14 days.
const REMEMBERED_SESSION_MS = 14 * DAY_IN_MS;
const DEFAULT_SESSION_MS = DAY_IN_MS;

export async function getSession(): Promise<SessionData | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  try {
    // checkRevoked: honour sign-outs and disabled accounts immediately.
    const claims = await adminAuth.verifySessionCookie(value, true);
    return { uid: claims.uid, email: claims.email ?? null };
  } catch {
    return null;
  }
}

export async function createSession(idToken: string, { remember = false } = {}) {
  const expiresIn = remember ? REMEMBERED_SESSION_MS : DEFAULT_SESSION_MS;
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  (await cookies()).set(COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Without "remember me" this is a browser-session cookie.
    maxAge: remember ? expiresIn / 1000 : undefined,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}
