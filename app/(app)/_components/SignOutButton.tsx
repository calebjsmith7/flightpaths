'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import { signOut } from 'firebase/auth';
import { endSession } from '@/lib/actions';
import { auth } from '@/lib/firebase/client';

export default function SignOutButton() {
  const [pending, startTransition] = React.useTransition();

  const handleClick = () => {
    startTransition(async () => {
      // Clear the browser's Firebase state as well as the server session cookie.
      await signOut(auth);
      await endSession();
    });
  };

  return (
    <Button variant="outlined" size="small" onClick={handleClick} loading={pending}>
      Sign out
    </Button>
  );
}
