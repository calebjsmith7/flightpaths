# FlightPaths

Safety for the flying vehicle space.

```bash
npm install
npm run dev
```

## Layout

- `app/(auth)/` — public auth pages (`/sign-in`). Its layout sends signed-in users to `/`.
- `app/(app)/` — everything behind sign-in. Its layout verifies the session and redirects to `/sign-in` otherwise.
- `lib/firebase/` — Firebase client SDK (`client.ts`, browser only) and Admin SDK (`admin.ts`, server only).
- `lib/session.ts` — Firebase session cookies (`__session`), created and verified with the Admin SDK.
- `lib/auth.ts` — server-only helpers (`getCurrentUser`, `requireUser`).
- `lib/actions.ts` — `startSession` / `endSession` server actions.

## Auth flow

The sign-in page authenticates with Firebase Auth in the browser (emailed sign-in link or Google),
then sends the ID token to `startSession`, which exchanges it for an httpOnly session cookie.
Email links return to `/sign-in`, which completes the sign-in; there is no separate sign-up, since
the first link sign-in creates the account. The link's host must be listed under Firebase Auth →
Settings → Authorized domains (`localhost` is included by default).
Layouts verify that cookie on the server to decide between `/sign-in` and the app.

## Environment

- **Local:** `.env.local` (gitignored) holds the `NEXT_PUBLIC_FIREBASE_*` web config plus
  `GOOGLE_APPLICATION_CREDENTIALS`, the absolute path to a service account key for the Admin SDK
  (Firebase console → Project settings → Service accounts → Generate new private key; keep it outside the repo).
- **App Hosting:** env vars come from `apphosting.yaml`. The Admin SDK uses the backend's runtime
  service account automatically, so `GOOGLE_APPLICATION_CREDENTIALS` is never set there. Real secrets
  go in Secret Manager via `firebase apphosting:secrets:set`. `.env*` files are excluded from deploys.
