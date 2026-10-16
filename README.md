# FlightPaths

Safety for the flying vehicle space.

```bash
npm install
npm run dev
```

## Layout

- `app/(auth)/` — public auth pages (`/sign-in`). Its layout sends signed-in users to `/`.
- `app/(app)/` — everything behind sign-in. Its layout verifies the session and redirects to `/sign-in` otherwise.
- `lib/session.ts` — session cookie storage (placeholder; replace with a real provider).
- `lib/auth.ts` — server-only helpers (`getCurrentUser`, `requireUser`).
- `lib/actions.ts` — `signIn` / `signOut` server actions.
- `theme/` — MUI theme (from the MUI sign-in-side template) and color-mode controls.
