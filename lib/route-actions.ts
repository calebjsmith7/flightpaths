'use server';

import { DEMO_TRAFFIC, SAMPLE_ROUTE } from './demo-routes';
import { ensurePermanentRoute, reserveAndSaveRoute } from './routes';
import { defaultElevationProvider } from './routing/elevation-google';
import { normalizeRoute } from './routing/normalize';
import { prepareFlight } from './routing/plan';
import { AirspaceFullError, RouteParseError, type FlightPlan } from './routing/types';
import { loadRouteScene, type RouteScene } from './scene';
import { getSession } from './session';

export type PlanRouteResult = { ok: true; routeId: string; plan: FlightPlan } | { ok: false; error: string };

export type PlanRouteOptions = {
  // ISO string; omitted means "now".
  departureTime?: string;
  cruiseSpeedMps?: number;
};

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
// always contains the permanent demo traffic it has to work around. Route 1 is
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
      // One at a time: some share cells, and parallel seeding would contend.
      for (const traffic of DEMO_TRAFFIC) {
        const prepared = await prepareFlight(normalizeRoute(traffic.route), { elevation });
        await ensurePermanentRoute(traffic.id, prepared, traffic.layerAglFt);
      }
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

export type RouteSceneResult = { ok: true; scene: RouteScene } | { ok: false; error: string };

// The 3D visualizer's data for one of the user's routes.
export async function getRouteScene(routeId: string): Promise<RouteSceneResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: 'Your session has expired. Please sign in again.' };
  }
  if (typeof routeId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(routeId)) {
    return { ok: false, error: 'Route not found.' };
  }
  try {
    const scene = await loadRouteScene(session.uid, routeId);
    return scene ? { ok: true, scene } : { ok: false, error: 'Route not found.' };
  } catch (error) {
    console.error('Failed to load route scene', error);
    return { ok: false, error: 'Couldn’t load the visualizer. Please try again.' };
  }
}
