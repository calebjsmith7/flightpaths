'use server';

import { redirect } from 'next/navigation';
import { createSession, deleteSession } from './session';

export type SignInState = {
  error?: string;
};

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!/\S+@\S+\.\S+/.test(email) || password.length < 6) {
    return { error: 'Invalid email or password.' };
  }

  // TODO: verify the credentials against a real user store.
  await createSession({ email }, { remember: formData.get('remember') === 'on' });
  redirect('/');
}

export async function signOut() {
  await deleteSession();
  redirect('/sign-in');
}
