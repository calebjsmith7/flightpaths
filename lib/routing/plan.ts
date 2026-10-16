import type { CellVisit } from './airspace';
import {
  DEFAULT_CRUISE_SPEED_MPS,
  DENSIFY_SPACING_M,
  MAX_CRUISE_SPEED_MPS,
  MAX_ROUTE_M,
  VERTICAL_RATE_FT_PER_S,
} from './config';
import { bearingDeg, densify, distanceMeters } from './geo';
import type { ElevationProvider, FlightPlan, FlightSegment, NormalizedRoute, TrackPoint } from './types';

const FT_PER_M = 3.28084;

export type PrepareOptions = {
  elevation: ElevationProvider;
  departureTime?: Date;
  cruiseSpeedMps?: number;
};

// Everything about a flight except its altitude. Choosing the layer needs a
// Firestore transaction, so planning is split around it: prepareFlight does the
// slow work (including the elevation lookup) up front, and finalizeFlight
// applies the chosen layer.
export type PreparedFlight = {
  source: NormalizedRoute['source'];
  elevationSource: ElevationProvider['source'];
  headingDeg: number;
  cruiseSpeedMps: number;
  departMs: number;
  track: TrackPoint[];
  groundM: number[];
};

export async function prepareFlight(route: NormalizedRoute, options: PrepareOptions): Promise<PreparedFlight> {
  const speed = options.cruiseSpeedMps ?? DEFAULT_CRUISE_SPEED_MPS;
  if (!(speed > 0)) {
    throw new RangeError('Cruise speed must be greater than zero.');
  }
  if (speed > MAX_CRUISE_SPEED_MPS) {
    throw new RangeError('Cruise speed can’t exceed 100 mph (the Part 107 limit).');
  }
  const departMs = (options.departureTime ?? new Date()).getTime();
  if (Number.isNaN(departMs)) {
    throw new RangeError('Departure time is not a valid date.');
  }

  let routeLength = 0;
  for (let i = 1; i < route.points.length; i++) {
    routeLength += distanceMeters(route.points[i - 1], route.points[i]);
  }
  if (routeLength > MAX_ROUTE_M) {
    throw new RangeError(`Routes are limited to ${MAX_ROUTE_M / 1000} km; this one is ${Math.round(routeLength / 1000)} km.`);
  }

  const points = densify(route.points, DENSIFY_SPACING_M);
  let travelled = 0;
  const track: TrackPoint[] = points.map((p, i) => {
    if (i > 0) {
      travelled += distanceMeters(points[i - 1], p);
    }
    return { ...p, distanceMeters: travelled, etaMs: departMs + (travelled / speed) * 1000 };
  });

  const groundM = await options.elevation.getElevationsMeters(points);
  if (groundM.length !== points.length) {
    throw new Error('Elevation provider returned the wrong number of samples.');
  }

  return {
    source: route.source,
    elevationSource: options.elevation.source,
    // Overall direction of travel, which picks the route's layer set.
    headingDeg: bearingDeg(points[0], points[points.length - 1]),
    cruiseSpeedMps: speed,
    departMs,
    track,
    groundM,
  };
}

// Applies the layer chosen for each visit (see assignLayers). Points take their
// visit's layer, except around a change, where altitude ramps linearly over the
// distance the climb or descent takes, kept within the two visits involved
// (which is where assignLayers reserved the layers in between).
export function finalizeFlight(
  prepared: PreparedFlight,
  visits: CellVisit[],
  layers: number[],
  verticalRateFtPerS = VERTICAL_RATE_FT_PER_S,
): FlightPlan {
  const { track, groundM } = prepared;

  const aglFt = new Array<number>(track.length);
  const inRamp = new Array<boolean>(track.length).fill(false);
  visits.forEach((v, k) => aglFt.fill(layers[k], v.firstIndex, v.lastIndex + 1));

  let prevRampEnd = -Infinity;
  for (let k = 1; k < visits.length; k++) {
    const from = layers[k - 1];
    const to = layers[k];
    if (from === to) {
      continue;
    }
    const lo = Math.max(visits[k - 1].startDistanceM, prevRampEnd);
    const hi = visits[k].endDistanceM;
    const rampM = Math.min(hi - lo, (Math.abs(to - from) / verticalRateFtPerS) * prepared.cruiseSpeedMps);
    if (!(rampM > 0)) {
      continue;
    }
    // Centre the ramp on the cell boundary, shifted to stay inside [lo, hi].
    const start = Math.min(Math.max(visits[k].startDistanceM - rampM / 2, lo), hi - rampM);
    const end = start + rampM;
    for (let i = visits[k - 1].firstIndex; i <= visits[k].lastIndex; i++) {
      const d = track[i].distanceMeters;
      if (d > start && d < end) {
        aglFt[i] = from + ((to - from) * (d - start)) / rampM;
        inRamp[i] = true;
      }
    }
    prevRampEnd = end;
  }

  const points = track.map((t, i) => ({
    lat: t.lat,
    lng: t.lng,
    distanceMeters: round(t.distanceMeters, 1),
    eta: new Date(t.etaMs).toISOString(),
    groundElevationFt: round(groundM[i] * FT_PER_M, 1),
    altitudeAglFt: round(aglFt[i], 1),
    altitudeMslFt: round(groundM[i] * FT_PER_M + aglFt[i], 1),
  }));

  const first = track[0];
  const last = track[track.length - 1];
  const coordinates: [number, number, number][] = [
    [first.lng, first.lat, round(groundM[0], 2)],
    ...track.map((t, i): [number, number, number] => [t.lng, t.lat, round(groundM[i] + aglFt[i] / FT_PER_M, 2)]),
    [last.lng, last.lat, round(groundM[groundM.length - 1], 2)],
  ];

  const segments = levelSegments(points, inRamp);

  return {
    source: prepared.source,
    elevationSource: prepared.elevationSource,
    headingDeg: round(prepared.headingDeg, 1),
    minAltitudeAglFt: Math.min(...layers),
    maxAltitudeAglFt: Math.max(...layers),
    layerChanges: layers.filter((l, k) => k > 0 && l !== layers[k - 1]).length,
    segments,
    cruiseSpeedMps: prepared.cruiseSpeedMps,
    distanceMeters: round(last.distanceMeters, 1),
    departAt: new Date(prepared.departMs).toISOString(),
    arriveAt: new Date(last.etaMs).toISOString(),
    points,
    path: { type: 'LineString', coordinates },
  };
}

// Runs of consecutive points flown level at one layer. Ramp points belong to
// no segment.
function levelSegments(points: FlightPlan['points'], inRamp: boolean[]): FlightSegment[] {
  const segments: FlightSegment[] = [];
  points.forEach((p, i) => {
    if (inRamp[i]) {
      return;
    }
    const last = segments.at(-1);
    if (last && last.toIndex === i - 1 && last.altitudeAglFt === p.altitudeAglFt) {
      last.toIndex = i;
      last.endDistanceMeters = p.distanceMeters;
    } else {
      segments.push({
        altitudeAglFt: p.altitudeAglFt,
        fromIndex: i,
        toIndex: i,
        startDistanceMeters: p.distanceMeters,
        endDistanceMeters: p.distanceMeters,
      });
    }
  });
  return segments;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
