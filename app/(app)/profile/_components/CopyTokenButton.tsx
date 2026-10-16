'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import { auth } from '@/lib/firebase/client';

// Copies a fresh Firebase ID token for the signed-in user, to use as the API's
// bearer token. Tokens last an hour.
export default function CopyTokenButton() {
  const [status, setStatus] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const [pending, startTransition] = React.useTransition();

  const copy = () =>
    startTransition(async () => {
      try {
        if (!auth.currentUser) {
          throw new Error('Not signed in');
        }
        await navigator.clipboard.writeText(await auth.currentUser.getIdToken(true));
        setStatus('copied');
      } catch {
        setStatus('error');
      }
    });

  return (
    <div>
      <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copy} loading={pending}>
        Copy API token
      </Button>
      {status !== 'idle' && (
        <Typography variant="body2" sx={{ mt: 1, color: status === 'copied' ? 'success.main' : 'error.main' }}>
          {status === 'copied'
            ? 'Copied. It’s valid for one hour.'
            : 'Couldn’t get a token. Try signing out and back in.'}
        </Typography>
      )}
    </div>
  );
}
