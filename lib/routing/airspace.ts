import { latLngToCell } from 'h3-js';
import {
  H3_RESOLUTION,
  LAYER_CHANGE_PENALTY_M,
  LAYERS_FT,
  RESERVATION_MARGIN_MS,
  VERTICAL_RATE_FT_PER_S,
} from './config';
import type { TrackPoint } from './types';

// The reservation grid. A route is split into visits: consecutive track points
// in the same H3 cell. Each visit flies at one layer and holds that layer in its
// cell from entry to exit, padded by a margin either side. Two routes conflict
// only if they share a cell, a layer, and an overlapping window.

export type CellVisit = {
  cell: string;
  // Track points inside the cell, inclusive.
  firstIndex: number;
  lastIndex: number;
  // From the first point in this cell to the first point in the next one.
  enterMs: number;
  exitMs: number;
  startDistanceM: number;
  endDistanceM: number;
  // The reservation window: enter/exit padded by the margin.
  startMs: number;
  endMs: number;
};

export type Reservation = {
  routeId: string;
  layerAglFt: number;
  startMs: number;
  endMs: number;
};

export type LayerOptions = {
  // Every layer in the band, both directions. Climbs, descents, takeoff and
  // landing pass through these, so they must be free too.
  allLayers: readonly number[];
  verticalRateFtPerS: number;
  changePenaltyM: number;
};

const DEFAULT_LAYER_OPTIONS: LayerOptions = {
  allLayers: LAYERS_FT,
  verticalRateFtPerS: VERTICAL_RATE_FT_PER_S,
  changePenaltyM: LAYER_CHANGE_PENALTY_M,
};

export function cellVisits(
  track: TrackPoint[],
  marginMs = RESERVATION_MARGIN_MS,
  resolution = H3_RESOLUTION,
): CellVisit[] {
  const runs: { cell: string; firstIndex: number; lastIndex: number }[] = [];
  track.forEach((point, i) => {
    const cell = latLngToCell(point.lat, point.lng, resolution);
    const last = runs.at(-1);
    if (last?.cell === cell) {
      last.lastIndex = i;
    } else {
      runs.push({ cell, firstIndex: i, lastIndex: i });
    }
  });

  return runs.map((run, k) => {
    const enter = track[run.firstIndex];
    const exit = track[runs[k + 1]?.firstIndex ?? run.lastIndex];
    return {
      ...run,
      enterMs: enter.etaMs,
      exitMs: exit.etaMs,
      startDistanceM: enter.distanceMeters,
      endDistanceM: exit.distanceMeters,
      startMs: enter.etaMs - marginMs,
      endMs: exit.etaMs + marginMs,
    };
  });
}

export function isLayerFree(
  layerAglFt: number,
  visit: Pick<CellVisit, 'cell' | 'startMs' | 'endMs'>,
  reservationsByCell: ReadonlyMap<string, Reservation[]>,
): boolean {
  return (reservationsByCell.get(visit.cell) ?? []).every(
    (r) => r.layerAglFt !== layerAglFt || r.endMs <= visit.startMs || visit.endMs <= r.startMs,
  );
}

// Chooses a layer for every visit, or returns null if no sequence of free
// layers gets the route from takeoff to landing.
//
// This is a shortest-path search (Viterbi) over visits × candidate layers.
// Flying a visit costs its length times the layer's rank, so lower is cheaper;
// each change adds changePenaltyM. Constraints:
//   - the visit's layer is free in its cell;
//   - a change between two visits needs every layer in between free in both
//     cells, and must be climbable in the time spent crossing them;
//   - takeoff and landing need every layer from the floor up to the route's
//     layer free in the first and last cells.
export function assignLayers(
  visits: CellVisit[],
  candidates: number[],
  reservationsByCell: ReadonlyMap<string, Reservation[]>,
  options: LayerOptions = DEFAULT_LAYER_OPTIONS,
): number[] | null {
  const n = visits.length;
  if (n === 0) {
    return [];
  }
  const { allLayers, verticalRateFtPerS, changePenaltyM } = options;
  const floor = allLayers[0];

  const freeCache = new Map<string, boolean>();
  const free = (i: number, layer: number) => {
    const key = `${i}:${layer}`;
    let value = freeCache.get(key);
    if (value === undefined) {
      value = isLayerFree(layer, visits[i], reservationsByCell);
      freeCache.set(key, value);
    }
    return value;
  };
  const rangeFree = (i: number, a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return allLayers.every((l) => l < lo || l > hi || free(i, l));
  };
  const visitCost = (i: number, c: number) => c * (visits[i].endDistanceM - visits[i].startDistanceM);

  let cost = candidates.map((layer, c) => (rangeFree(0, floor, layer) ? visitCost(0, c) : Infinity));
  const back: number[][] = [];

  for (let i = 1; i < n; i++) {
    const crossingS = (visits[i].exitMs - visits[i - 1].enterMs) / 1000;
    const next = candidates.map(() => Infinity);
    const from = candidates.map(() => -1);

    candidates.forEach((layer, c) => {
      if (!free(i, layer)) {
        return;
      }
      candidates.forEach((prevLayer, p) => {
        if (cost[p] === Infinity) {
          return;
        }
        let total = cost[p];
        if (prevLayer !== layer) {
          const climbS = Math.abs(layer - prevLayer) / verticalRateFtPerS;
          if (climbS > crossingS || !rangeFree(i - 1, prevLayer, layer) || !rangeFree(i, prevLayer, layer)) {
            return;
          }
          total += changePenaltyM;
        }
        // Strict < keeps the lowest previous layer on ties.
        if (total < next[c]) {
          next[c] = total;
          from[c] = p;
        }
      });
      next[c] += visitCost(i, c);
    });

    cost = next;
    back.push(from);
  }

  let best = -1;
  candidates.forEach((layer, c) => {
    if (cost[c] < Infinity && rangeFree(n - 1, floor, layer) && (best === -1 || cost[c] < cost[best])) {
      best = c;
    }
  });
  if (best === -1) {
    return null;
  }

  const path = [best];
  for (let i = n - 1; i > 0; i--) {
    path.push(back[i - 1][path[path.length - 1]]);
  }
  return path.reverse().map((c) => candidates[c]);
}

// Everything a route holds once its layers are chosen: its own layer in each
// visit, every layer it passes through while changing layers, and the column
// from the floor up at takeoff and landing.
export function reservationsFor(
  visits: CellVisit[],
  layers: number[],
  routeId: string,
  allLayers: readonly number[] = LAYERS_FT,
): { cell: string; reservation: Reservation }[] {
  const floor = allLayers[0];
  const between = (a: number, b: number) =>
    allLayers.filter((l) => l >= Math.min(a, b) && l <= Math.max(a, b));

  return visits.flatMap((visit, i) => {
    const held = new Set([layers[i]]);
    const add = (ls: number[]) => ls.forEach((l) => held.add(l));
    if (i === 0) add(between(floor, layers[0]));
    if (i === visits.length - 1) add(between(floor, layers[i]));
    if (i > 0 && layers[i - 1] !== layers[i]) add(between(layers[i - 1], layers[i]));
    if (i < visits.length - 1 && layers[i + 1] !== layers[i]) add(between(layers[i], layers[i + 1]));

    return [...held]
      .sort((a, b) => a - b)
      .map((layerAglFt) => ({
        cell: visit.cell,
        reservation: { routeId, layerAglFt, startMs: visit.startMs, endMs: visit.endMs },
      }));
  });
}

export type Conflict = { routeId: string; cells: string[] };

// Other routes this one had to fly over or climb past: anything holding a layer
// at or below this route's layer, in a cell it passes through, at an
// overlapping time. Ordered by how many cells they share, most first.
export function findConflicts(
  visits: CellVisit[],
  layers: number[],
  reservationsByCell: ReadonlyMap<string, Reservation[]>,
  ownRouteId?: string,
): Conflict[] {
  const byRoute = new Map<string, Set<string>>();
  visits.forEach((visit, i) => {
    for (const r of reservationsByCell.get(visit.cell) ?? []) {
      const overlaps = r.startMs < visit.endMs && visit.startMs < r.endMs;
      if (r.routeId !== ownRouteId && overlaps && r.layerAglFt <= layers[i]) {
        const cells = byRoute.get(r.routeId) ?? new Set<string>();
        cells.add(visit.cell);
        byRoute.set(r.routeId, cells);
      }
    }
  });
  return [...byRoute]
    .map(([routeId, cells]) => ({ routeId, cells: [...cells] }))
    .sort((a, b) => b.cells.length - a.cells.length);
}
