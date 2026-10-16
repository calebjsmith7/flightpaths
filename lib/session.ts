import 'server-only';
import { cookies } from 'next/headers';

// Placeholder session storage: an unsigned cookie holding the user's email.
// Anyone can forge this, so swap it for a real provider (or a signed/encrypted
// session such as iron-session) before shipping. Everything else talks to the
// session through these three functions, so this is the only file that changes.

export type SessionData = {
  email: string;
};

const COOKIE_NAME = 'flightpaths_session';
const DAY_IN_SECONDS = 60 * 60 * 24;

export async function getSession(): Promise<SessionData | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return typeof data?.email === 'string' ? { email: data.email } : null;
  } catch {
    return null;
  }
}

export async function createSession(data: SessionData, { remember = false } = {}) {
  (await cookies()).set(COOKIE_NAME, Buffer.from(JSON.stringify(data)).toString('base64url'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Without "remember me" this is a browser-session cookie.
    maxAge: remember ? 30 * DAY_IN_SECONDS : undefined,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}
