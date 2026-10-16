'use server';

import { DEMO_TRAFFIC_ROUTE, SAMPLE_ROUTE } from './demo-routes';
import { ensurePermanentRoute, reserveAndSaveRoute } from './routes';
import { defaultElevationProvider } from './routing/elevation-google';
import { normalizeRoute } from './routing/normalize';
import { prepareFlight } from './routing/plan';
import { AirspaceFullError, RouteParseError, type FlightPlan } from './routing/types';
import { getSession } from './session';

export type PlanRouteResult = { ok: true; routeId: string; plan: FlightPlan } | { ok: false; error: string };

export type PlanRouteOptions = {
  // ISO string; omitted means "now".
  departureTime?: string;
  cruiseSpeedMps?: number;
};

const DEMO_TRAFFIC_ID = 'demo-traffic';

// Plans and saves a flight from a pasted or uploaded Google route response.
export async function planRoute(routeJson: string, options: PlanRouteOptions = {}): Promise<PlanRouteResult> {
  if (typeof routeJson !== 'string' || !routeJson.trim()) {
    return { ok: false, error: 'Paste or upload a Google route response first.' };
  }
  let input: unknown;
  try {
    input = JSON.parse(routeJson);
  } catch {
    return { ok: false, error: 'That isn’t valid JSON.' };
  }
  return plan(input, options, false);
}

// Runs the demo: route 1 (the sample) planned against the airspace, which
// always contains route 2 (the demo traffic) crossing it halfway. Route 1 is
// saved but doesn't reserve airspace, so the demo can be run again and again.
// The route comes from the server, not the client, so the dry run can't be
// used to plan arbitrary routes without reserving them.
export async function planDemoRoute(options: PlanRouteOptions = {}): Promise<PlanRouteResult> {
  return plan(SAMPLE_ROUTE, options, true);
}

async function plan(input: unknown, options: PlanRouteOptions, demo: boolean): Promise<PlanRouteResult> {
  const { departureTime, cruiseSpeedMps } = options;
  const session = await getSession();
  if (!session) {
    return { ok: false, error: 'Your session has expired. Please sign in again.' };
  }

  try {
    const elevation = defaultElevationProvider();
    if (demo) {
      const traffic = await prepareFlight(normalizeRoute(DEMO_TRAFFIC_ROUTE), { elevation });
      await ensurePermanentRoute(DEMO_TRAFFIC_ID, traffic);
    }
    const prepared = await prepareFlight(normalizeRoute(input), {
      elevation,
      departureTime: departureTime ? new Date(departureTime) : undefined,
      cruiseSpeedMps: typeof cruiseSpeedMps === 'number' ? cruiseSpeedMps : undefined,
    });
    const { routeId, plan } = await reserveAndSaveRoute(session.uid, prepared, { reserve: !demo, demo });
    return { ok: true, routeId, plan };
  } catch (error) {
    if (error instanceof RouteParseError || error instanceof AirspaceFullError || error instanceof RangeError) {
      return { ok: false, error: error.message };
    }
    console.error('Failed to plan route', error);
    return { ok: false, error: 'Something went wrong planning this route. Please try again.' };
  }
}
