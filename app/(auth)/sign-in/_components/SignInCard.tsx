'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth';
import { unstable_rethrow } from 'next/navigation';
import { startSession } from '@/lib/actions';
import { auth } from '@/lib/firebase/client';
import { GoogleIcon } from './GoogleIcon';
import { Wordmark } from './Wordmark';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const EMAIL_PATTERN = /\S+@\S+\.\S+/;

// Remembered between sending the link and opening it, so a same-device click
// signs straight in. Opening the link elsewhere asks for the email again.
const PENDING_SIGN_IN_KEY = 'flightpaths:pendingSignIn';

type PendingSignIn = { email: string; remember: boolean };

function readPendingSignIn(): PendingSignIn | null {
  try {
    const value = window.localStorage.getItem(PENDING_SIGN_IN_KEY);
    return value ? (JSON.parse(value) as PendingSignIn) : null;
  } catch {
    return null;
  }
}

function writePendingSignIn(pending: PendingSignIn | null) {
  try {
    if (pending) {
      window.localStorage.setItem(PENDING_SIGN_IN_KEY, JSON.stringify(pending));
    } else {
      window.localStorage.removeItem(PENDING_SIGN_IN_KEY);
    }
  } catch {
    // Storage unavailable (private mode etc.); the link flow falls back to asking.
  }
}

function describeAuthError(error: unknown): string | null {
  if (!(error instanceof FirebaseError)) {
    return 'Something went wrong. Please try again.';
  }
  switch (error.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/invalid-email':
      return "That email doesn't match the one the sign-in link was sent to.";
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This sign-in link has expired or was already used. Request a new one below.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// request: enter email to get a link. sent: link is on its way.
// confirm: link opened without a stored email, so ask which address it was for.
// completing: link opened on the device that requested it; signing in.
type Step = 'request' | 'sent' | 'confirm' | 'completing';

export default function SignInCard() {
  const [step, setStep] = React.useState<Step>('request');
  const [email, setEmail] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [emailError, setEmailError] = React.useState('');
  const [error, setError] = React.useState('');
  const [pending, startTransition] = React.useTransition();
  const linkHandled = React.useRef(false);

  // Firebase authenticates in the browser; the server then swaps the ID token
  // for a session cookie and redirects home.
  const authenticate = React.useCallback(
    (signInWith: () => Promise<UserCredential>, rememberSession: boolean) => {
      setError('');
      startTransition(async () => {
        try {
          const credential = await signInWith();
          writePendingSignIn(null);
          const result = await startSession(await credential.user.getIdToken(), rememberSession);
          if (result?.error) {
            setError(result.error);
          }
        } catch (err) {
          // startSession's redirect home arrives as a rejection; let Next handle it.
          unstable_rethrow(err);
          console.error('Firebase sign-in failed', err);
          setError(describeAuthError(err) ?? '');
          setStep((current) => (current === 'completing' ? 'request' : current));
          // A dead link can't be retried; drop it from the URL and start over.
          if (
            err instanceof FirebaseError &&
            (err.code === 'auth/invalid-action-code' || err.code === 'auth/expired-action-code')
          ) {
            window.history.replaceState(null, '', window.location.pathname);
            setStep('request');
          }
        }
      });
    },
    [],
  );

  // Next keeps this page alive (hidden) after navigating away, so clear the
  // transient flow state then; signing out later lands on a fresh card.
  React.useLayoutEffect(() => {
    return () => {
      setStep('request');
      setError('');
      setEmailError('');
    };
  }, []);

  // Arriving from the emailed link: finish signing in.
  React.useEffect(() => {
    const link = window.location.href;
    // The oob code is single-use, so guard against Strict Mode's double effect.
    if (linkHandled.current || !isSignInWithEmailLink(auth, link)) {
      return;
    }
    linkHandled.current = true;
    const stored = readPendingSignIn();
    if (stored) {
      setStep('completing');
      authenticate(() => signInWithEmailLink(auth, stored.email, link), stored.remember);
    } else {
      setStep('confirm');
    }
  }, [authenticate]);

  const validateEmail = (value: string) => {
    const nextError = EMAIL_PATTERN.test(value) ? '' : 'Please enter a valid email address.';
    setEmailError(nextError);
    return !nextError;
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!validateEmail(value)) {
      return;
    }

    if (step === 'confirm') {
      authenticate(() => signInWithEmailLink(auth, value, window.location.href), remember);
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        await sendSignInLinkToEmail(auth, value, {
          url: `${window.location.origin}/sign-in`,
          handleCodeInApp: true,
        });
        writePendingSignIn({ email: value, remember });
        setStep('sent');
      } catch (err) {
        console.error('Failed to send sign-in link', err);
        setError(describeAuthError(err) ?? '');
      }
    });
  };

  const handleGoogle = () => {
    authenticate(() => signInWithPopup(auth, new GoogleAuthProvider()), remember);
  };

  const heading =
    step === 'sent' ? 'Check your email' : step === 'confirm' ? 'Confirm your email' : 'Sign in';

  return (
    <Card variant="outlined">
      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        <Wordmark />
      </Box>
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
      >
        {heading}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {step === 'completing' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography sx={{ color: 'text.secondary' }}>Signing you in…</Typography>
        </Box>
      ) : step === 'sent' ? (
        <>
          <Typography sx={{ color: 'text.secondary' }}>
            We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to
            finish signing in.
          </Typography>
          <Typography sx={{ textAlign: 'center' }}>
            Wrong address or no email?{' '}
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                setStep('request');
                setError('');
              }}
              sx={{ verticalAlign: 'baseline' }}
            >
              Try again
            </Link>
          </Typography>
        </>
      ) : (
        <>
          <Typography sx={{ color: 'text.secondary' }}>
            {step === 'confirm'
              ? 'You opened the sign-in link on a different device or browser. Enter the email it was sent to.'
              : "Enter your email and we'll send you a link to sign in. No password needed, and new accounts are created automatically."}
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}
          >
            <FormControl>
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                error={!!emailError}
                helperText={emailError}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                color={emailError ? 'error' : 'primary'}
              />
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  color="primary"
                />
              }
              label="Remember me"
            />
            <Button type="submit" fullWidth variant="contained" loading={pending}>
              {step === 'confirm' ? 'Sign in' : 'Email me a sign-in link'}
            </Button>
          </Box>
          {step === 'request' && (
            <>
              <Divider>or</Divider>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogle}
                disabled={pending}
                startIcon={<GoogleIcon />}
              >
                Continue with Google
              </Button>
            </>
          )}
        </>
      )}
    </Card>
  );
}
