import { consumeApiRequest, type UsageCheck } from '@/lib/api-usage';
import { adminAuth } from '@/lib/firebase/admin';
import { planAndSave } from '@/lib/plan-service';
import { MPS_PER_MPH } from '@/lib/routing/config';
import { AirspaceFullError, RouteParseError } from '@/lib/routing/types';

// POST /api/v1/routes
//
// Body: a Google Routes API or Directions API response, as JSON.
// Query: departureTime (ISO 8601, default now), cruiseSpeedMph (default 60, max 100).
// Auth: Authorization: Bearer <Firebase ID token>.
//
// Returns the body unchanged plus a `flightpaths` block with the plan, the same
// JSON the Home page downloads. The route is saved and its airspace reserved.
// Every authenticated request counts toward the daily limit, including ones
// rejected for a bad body, so the limit can't be dodged by retrying junk.

const MAX_BODY_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    return error(401, 'unauthenticated', 'Send a Firebase ID token as "Authorization: Bearer <token>".');
  }
  let uid: string;
  try {
    // checkRevoked: honour sign-outs and disabled accounts immediately.
    uid = (await adminAuth.verifyIdToken(token, true)).uid;
  } catch {
    return error(401, 'invalid_token', 'The bearer token is invalid or has expired. Get a fresh one and try again.');
  }

  const usage = await consumeApiRequest(uid);
  const limitHeaders = rateLimitHeaders(usage);
  if (!usage.allowed) {
    return error(
      429,
      'rate_limited',
      `You've used all ${usage.limit} requests for today. The limit resets at ${usage.resetAt.toISOString()}.`,
      { ...limitHeaders, 'Retry-After': String(Math.ceil((usage.resetAt.getTime() - Date.now()) / 1000)) },
    );
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return error(413, 'body_too_large', 'The request body is limited to 5 MB.', limitHeaders);
  }
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return error(400, 'invalid_json', 'The request body isn’t valid JSON.', limitHeaders);
  }

  const params = new URL(request.url).searchParams;
  const departure = params.get('departureTime');
  const speedMph = params.get('cruiseSpeedMph');
  if (speedMph !== null && !Number.isFinite(Number(speedMph))) {
    return error(422, 'invalid_parameter', 'cruiseSpeedMph must be a number.', limitHeaders);
  }

  try {
    const { routeId, plan } = await planAndSave(uid, input, {
      departureTime: departure ? new Date(departure) : undefined,
      cruiseSpeedMps: speedMph !== null ? Number(speedMph) * MPS_PER_MPH : undefined,
    });
    // normalizeRoute only accepts objects, so the spread keeps the caller's JSON intact.
    return Response.json({ ...(input as object), flightpaths: { routeId, ...plan } }, { headers: limitHeaders });
  } catch (e) {
    if (e instanceof RouteParseError) {
      return error(400, 'invalid_route', e.message, limitHeaders);
    }
    if (e instanceof RangeError) {
      return error(422, 'invalid_parameter', e.message, limitHeaders);
    }
    if (e instanceof AirspaceFullError) {
      return error(409, 'airspace_full', e.message, limitHeaders);
    }
    console.error('API failed to plan route', e);
    return error(500, 'internal', 'Something went wrong planning this route. Please try again.', limitHeaders);
  }
}

function rateLimitHeaders(usage: UsageCheck): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(usage.limit),
    'X-RateLimit-Remaining': String(usage.remaining),
    'X-RateLimit-Reset': String(Math.floor(usage.resetAt.getTime() / 1000)),
  };
}

function error(status: number, code: string, message: string, headers?: Record<string, string>) {
  return Response.json({ error: { code, message } }, { status, headers });
}
