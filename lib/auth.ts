import 'server-only';
import { cacheLife } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from './session';

export type User = {
  uid: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<User | null> {
  // Verifying the session cookie compares its expiry to the current time, which
  // Cache Components won't allow in a plain prerender. A private cache scope can
  // read cookies and the clock, and its result stays in this user's browser only.
  // stale >= 30s keeps authenticated routes prefetchable.
  'use cache: private';
  cacheLife({ stale: 60 });

  const session = await getSession();
  return session ? { uid: session.uid, email: session.email } : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }
  return user;
}
