import 'server-only';
import { adminDb } from './firebase/admin';

// Requests each user may make to the HTTP API per UTC day.
export const API_DAILY_LIMIT = 20;

// apiUsage/{uid}: { day: 'YYYY-MM-DD', count }. One doc per user, reset when the
// day changes, so it never grows and needs no cleanup. It lives outside
// userprofiles because users can write their own profile from the browser and
// would be able to reset their count; the security rules deny this collection
// to clients entirely.
type ApiUsage = { day: string; count: number };

export type UsageCheck = {
  allowed: boolean;
  limit: number;
  remaining: number;
  // Next UTC midnight, when the count resets.
  resetAt: Date;
};

// Counts one request against today's limit, unless the limit is already used up.
export async function consumeApiRequest(uid: string, now = new Date()): Promise<UsageCheck> {
  const ref = adminDb.collection('apiUsage').doc(uid);
  const day = utcDay(now);
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  return adminDb.runTransaction(async (tx) => {
    const usage = (await tx.get(ref)).data() as ApiUsage | undefined;
    const used = usage?.day === day ? usage.count : 0;
    if (used >= API_DAILY_LIMIT) {
      return { allowed: false, limit: API_DAILY_LIMIT, remaining: 0, resetAt };
    }
    tx.set(ref, { day, count: used + 1 } satisfies ApiUsage);
    return { allowed: true, limit: API_DAILY_LIMIT, remaining: API_DAILY_LIMIT - used - 1, resetAt };
  });
}

export async function getApiUsageToday(uid: string, now = new Date()): Promise<number> {
  const usage = (await adminDb.collection('apiUsage').doc(uid).get()).data() as ApiUsage | undefined;
  return usage?.day === utcDay(now) ? usage.count : 0;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
