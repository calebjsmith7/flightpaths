import 'server-only';
import { FieldValue, Timestamp, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { adminDb } from './firebase/admin';
import { assignLayers, cellVisits, reservationsFor, type Reservation } from './routing/airspace';
import { layersForHeading } from './routing/config';
import { finalizeFlight, type PreparedFlight } from './routing/plan';
import { AirspaceFullError, type FlightPlan } from './routing/types';

// How many route ids a profile's recentRoutes keeps, newest first.
const RECENT_ROUTES_LIMIT = 10;

// End of a permanent reservation: the last millisecond Firestore Timestamps
// can represent, so the TTL policy never removes it.
const PERMANENT_END_MS = Date.UTC(9999, 11, 31, 23, 59, 59, 999);

// airspace/{h3Cell}: { reservations: Reservation[], expiresAt: Timestamp }
// expiresAt is the latest reservation end, so a TTL policy on it deletes cells
// once nothing in them is live. Expired entries are also pruned on every write.
type AirspaceCell = { reservations: Reservation[]; expiresAt: Timestamp };

export type SaveOptions = {
  // false plans against the current airspace without holding any of it: a dry
  // run. The demo uses this so repeated runs don't block each other.
  reserve?: boolean;
  demo?: boolean;
};

// Chooses a layer for every cell the route passes through, reserves them (plus
// the layers crossed while climbing, descending, taking off and landing), saves
// the plan to routes/{id}, and puts that id at the front of the owner's
// recentRoutes, all in one transaction so two concurrent requests can never
// claim the same airspace.
export async function reserveAndSaveRoute(
  uid: string,
  prepared: PreparedFlight,
  { reserve = true, demo = false }: SaveOptions = {},
): Promise<{ routeId: string; plan: FlightPlan }> {
  const visits = cellVisits(prepared.track);
  const candidates = layersForHeading(prepared.headingDeg);
  const cells = [...new Set(visits.map((v) => v.cell))];
  const routeRef = adminDb.collection('routes').doc();
  const profileRef = adminDb.collection('userprofiles').doc(uid);
  const cellRefs = cells.map((cell) => adminDb.collection('airspace').doc(cell));

  return adminDb.runTransaction(async (tx) => {
    const [profile, ...snaps] = await tx.getAll(profileRef, ...cellRefs);
    const now = Date.now();

    const live = new Map<string, Reservation[]>();
    snaps.forEach((snap, i) => {
      const data = snap.data() as AirspaceCell | undefined;
      live.set(cells[i], (data?.reservations ?? []).filter((r) => r.endMs > now));
    });

    const layers = assignLayers(visits, candidates, live);
    if (!layers) {
      throw new AirspaceFullError('There’s no free path through the airspace along this route. Try a later departure.');
    }
    const plan = finalizeFlight(prepared, visits, layers);

    if (reserve) {
      writeReservations(tx, cells, cellRefs, live, reservationsFor(visits, layers, routeRef.id));
    }

    // Firestore can't store nested arrays, so the GeoJSON path is left out;
    // it's rebuilt from `points` when needed.
    const { path: _path, ...stored } = plan;
    tx.set(routeRef, {
      ...stored,
      uid,
      demo,
      reserved: reserve,
      cellVisits: visits.length,
      createdAt: FieldValue.serverTimestamp(),
    });

    const recent: string[] = profile.get('recentRoutes') ?? [];
    tx.set(profileRef, { recentRoutes: [routeRef.id, ...recent].slice(0, RECENT_ROUTES_LIMIT) }, { merge: true });

    return { routeId: routeRef.id, plan };
  });
}

// Seeds a route that holds the lowest layer for its direction in every cell it
// passes through, at all times. Used for the demo's fixed traffic. Does nothing
// if routes/{routeId} already exists, so it's safe to call on every demo run.
export async function ensurePermanentRoute(routeId: string, prepared: PreparedFlight): Promise<void> {
  const routeRef = adminDb.collection('routes').doc(routeId);
  if ((await routeRef.get()).exists) {
    return;
  }

  const visits = cellVisits(prepared.track).map((v) => ({ ...v, startMs: 0, endMs: PERMANENT_END_MS }));
  const layer = layersForHeading(prepared.headingDeg)[0];
  const layers = visits.map(() => layer);
  const cells = [...new Set(visits.map((v) => v.cell))];
  const cellRefs = cells.map((cell) => adminDb.collection('airspace').doc(cell));

  await adminDb.runTransaction(async (tx) => {
    const [existing, ...snaps] = await tx.getAll(routeRef, ...cellRefs);
    if (existing.exists) {
      return;
    }
    const now = Date.now();
    const live = new Map<string, Reservation[]>();
    snaps.forEach((snap, i) => {
      const data = snap.data() as AirspaceCell | undefined;
      live.set(cells[i], (data?.reservations ?? []).filter((r) => r.endMs > now));
    });
    writeReservations(tx, cells, cellRefs, live, reservationsFor(visits, layers, routeId));

    const { path: _path, ...stored } = finalizeFlight(prepared, visits, layers);
    tx.set(routeRef, {
      ...stored,
      uid: 'system',
      demo: true,
      permanent: true,
      reserved: true,
      cellVisits: visits.length,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

// Adds new reservations to the live ones and rewrites each cell, with
// expiresAt at the latest reservation end for the TTL policy.
function writeReservations(
  tx: Transaction,
  cells: string[],
  cellRefs: DocumentReference[],
  live: Map<string, Reservation[]>,
  added: { cell: string; reservation: Reservation }[],
) {
  for (const { cell, reservation } of added) {
    live.get(cell)!.push(reservation);
  }
  cells.forEach((cell, i) => {
    const reservations = live.get(cell)!;
    const expiresAt = Timestamp.fromMillis(Math.max(...reservations.map((r) => r.endMs)));
    tx.set(cellRefs[i], { reservations, expiresAt } satisfies AirspaceCell);
  });
}
