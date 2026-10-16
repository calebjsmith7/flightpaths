import 'server-only';
import { DEMO_TRAFFIC } from './demo-routes';
import { ensurePermanentRoute, reserveAndSaveRoute } from './routes';
import { defaultElevationProvider } from './routing/elevation-google';
import { normalizeRoute } from './routing/normalize';
import { prepareFlight } from './routing/plan';
import type { FlightPlan } from './routing/types';

export type PlanOptions = {
  departureTime?: Date;
  cruiseSpeedMps?: number;
  // A demo run: seeds the permanent demo traffic and plans without reserving.
  demo?: boolean;
};

// Plans a flight from a Google route response, reserves its airspace and saves
// it. Shared by the Home page and the HTTP API. Throws RouteParseError,
// RangeError or AirspaceFullError for problems with the request; anything else
// is unexpected.
export async function planAndSave(
  uid: string,
  input: unknown,
  { departureTime, cruiseSpeedMps, demo = false }: PlanOptions = {},
): Promise<{ routeId: string; plan: FlightPlan }> {
  const elevation = defaultElevationProvider();
  if (demo) {
    // One at a time: some share cells, and parallel seeding would contend.
    for (const traffic of DEMO_TRAFFIC) {
      const prepared = await prepareFlight(normalizeRoute(traffic.route), { elevation });
      await ensurePermanentRoute(traffic.id, prepared, traffic.layerAglFt);
    }
  }
  const prepared = await prepareFlight(normalizeRoute(input), { elevation, departureTime, cruiseSpeedMps });
  return reserveAndSaveRoute(uid, prepared, { reserve: !demo, demo });
}
