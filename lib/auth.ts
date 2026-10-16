import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from './session';

export type User = {
  email: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session ? { email: session.email } : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/sign-in');
  }
  return user;
}
