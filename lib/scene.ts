import 'server-only';
import { latLngToCell } from 'h3-js';
import { adminDb } from './firebase/admin';
import type { Conflict } from './routing/airspace';
import { H3_RESOLUTION, LAYER_SPACING_FT, LAYERS_FT } from './routing/config';
import type { FlightPoint } from './routing/types';

// What the 3D visualizer draws for one route: the route itself, the stretches of
// other routes it conflicted with, and the cells they shared.

// [lng, lat, altitude AGL in feet]
export type ScenePoint = [number, number, number];
export type ScenePath = { kind: 'route' | 'traffic'; label: string; points: ScenePoint[] };
// A shared cell and the layers each side flew through in it. Includes any layer
// passed through while climbing or descending, since those were reserved too.
export type SceneCell = { cell: string; routeLayersFt: number[]; trafficLayersFt: number[] };
export type RouteScene = { paths: ScenePath[]; cells: SceneCell[] };

// Traffic is clipped to the shared stretch plus this many points either side
// (~1.25 km at 50 m spacing), so the scene never reveals someone else's whole trip.
const CLIP_PADDING_POINTS = 25;

// Returns null if the route doesn't exist or isn't the user's.
export async function loadRouteScene(uid: string, routeId: string): Promise<RouteScene | null> {
  const snap = await adminDb.collection('routes').doc(routeId).get();
  if (!snap.exists || snap.get('uid') !== uid) {
    return null;
  }
  const points: FlightPoint[] = snap.get('points');
  const conflicts: Conflict[] = snap.get('conflicts') ?? [];

  const trafficDocs = conflicts.length
    ? await adminDb.getAll(...conflicts.map((c) => adminDb.collection('routes').doc(c.routeId)), {
        fieldMask: ['points'],
      })
    : [];
  const shared = new Set(conflicts.flatMap((c) => c.cells));
  const routeLayers = layersByCell(points, shared);
  const trafficLayers = new Map<string, Set<number>>();
  const trafficPoints = trafficDocs.map((doc) => (doc.get('points') as FlightPoint[] | undefined) ?? []);
  trafficPoints.forEach((pts, i) => {
    for (const [cell, layers] of layersByCell(pts, new Set(conflicts[i].cells))) {
      const all = trafficLayers.get(cell) ?? new Set<number>();
      layers.forEach((l) => all.add(l));
      trafficLayers.set(cell, all);
    }
  });

  // Labels only, no ids or owners: the client never learns whose route it is.
  const traffic = trafficPoints
    .map((pts, i) => clipToCells(pts, new Set(conflicts[i].cells)))
    .filter((clipped) => clipped.length >= 2)
    .map((clipped, i): ScenePath => ({ kind: 'traffic', label: `Traffic ${i + 1}`, points: clipped.map(toScenePoint) }));

  const sorted = (layers?: Set<number>) => [...(layers ?? [])].sort((a, b) => a - b);
  return {
    paths: [{ kind: 'route', label: 'Your route', points: points.map(toScenePoint) }, ...traffic],
    cells: [...shared].map((cell) => ({
      cell,
      routeLayersFt: sorted(routeLayers.get(cell)),
      trafficLayersFt: sorted(trafficLayers.get(cell)),
    })),
  };
}

// For each of `cells`, the layers a route flew through there: every layer within
// the span of its altitudes in that cell, so a climb counts the layers it crosses.
function layersByCell(points: FlightPoint[], cells: Set<string>): Map<string, Set<number>> {
  const spans = new Map<string, { lo: number; hi: number }>();
  for (const p of points) {
    const cell = latLngToCell(p.lat, p.lng, H3_RESOLUTION);
    if (cells.has(cell)) {
      const span = spans.get(cell);
      spans.set(cell, {
        lo: Math.min(span?.lo ?? Infinity, p.altitudeAglFt),
        hi: Math.max(span?.hi ?? -Infinity, p.altitudeAglFt),
      });
    }
  }
  const half = LAYER_SPACING_FT / 2;
  return new Map(
    [...spans].map(([cell, { lo, hi }]) => [cell, new Set(LAYERS_FT.filter((l) => l > lo - half && l < hi + half))]),
  );
}

function clipToCells(points: FlightPoint[], cells: Set<string>): FlightPoint[] {
  let first = -1;
  let last = -1;
  points.forEach((p, i) => {
    if (cells.has(latLngToCell(p.lat, p.lng, H3_RESOLUTION))) {
      if (first === -1) first = i;
      last = i;
    }
  });
  if (first === -1) {
    return [];
  }
  return points.slice(Math.max(0, first - CLIP_PADDING_POINTS), last + CLIP_PADDING_POINTS + 1);
}

function toScenePoint(p: FlightPoint): ScenePoint {
  return [p.lng, p.lat, p.altitudeAglFt];
}
