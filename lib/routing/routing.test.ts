import { cellToLatLng, latLngToCell } from 'h3-js';
import { describe, expect, it } from 'vitest';
import { CEILING_FT, DENSIFY_SPACING_M, FLOOR_FT, H3_RESOLUTION, LAYERS_FT, VERTICAL_RATE_FT_PER_S, layersForHeading } from './config';
import { flatElevation } from './elevation';
import { bearingDeg, densify, distanceMeters } from './geo';
import { normalizeRoute } from './normalize';
import { finalizeFlight, prepareFlight } from './plan';
import { assignLayers, cellVisits, reservationsFor, type CellVisit, type Reservation } from './airspace';
import { decodePolyline, encodePolyline } from './polyline';
import { RouteParseError, type ElevationProvider, type LatLng, type TrackPoint } from './types';

// The worked example from Google's polyline algorithm docs.
const GOOGLE_EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
const GOOGLE_EXAMPLE_POINTS = [
  { lat: 38.5, lng: -120.2 },
  { lat: 40.7, lng: -120.95 },
  { lat: 43.252, lng: -126.453 },
];

describe('polyline', () => {
  it('decodes the reference example', () => {
    expect(decodePolyline(GOOGLE_EXAMPLE)).toEqual(GOOGLE_EXAMPLE_POINTS);
  });

  it('encodes the reference example', () => {
    expect(encodePolyline(GOOGLE_EXAMPLE_POINTS)).toBe(GOOGLE_EXAMPLE);
  });

  it('rejects truncated input', () => {
    expect(() => decodePolyline('_p~iF~ps|')).toThrow();
  });
});

describe('geo', () => {
  it('measures one degree of latitude as ~111 km', () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it.each([
    [{ lat: 1, lng: 0 }, 0],
    [{ lat: 0, lng: 1 }, 90],
    [{ lat: -1, lng: 0 }, 180],
    [{ lat: 0, lng: -1 }, 270],
  ])('bearing to %o is %d°', (to, expected) => {
    expect(bearingDeg({ lat: 0, lng: 0 }, to)).toBeCloseTo(expected, 5);
  });

  it('densifies so no gap exceeds the spacing, keeping the original points', () => {
    const original = [
      { lat: 0, lng: 0 },
      { lat: 0.01, lng: 0 },
    ];
    const dense = densify(original, 50);
    expect(dense[0]).toEqual(original[0]);
    expect(dense.at(-1)).toEqual(original[1]);
    for (let i = 1; i < dense.length; i++) {
      expect(distanceMeters(dense[i - 1], dense[i])).toBeLessThanOrEqual(50);
    }
  });
});

describe('config', () => {
  it('spans the legal drone band', () => {
    expect(LAYERS_FT[0]).toBe(FLOOR_FT);
    expect(LAYERS_FT.at(-1)).toBe(CEILING_FT);
  });

  it('gives opposing directions disjoint layers that together cover the band', () => {
    const east = layersForHeading(90);
    const west = layersForHeading(270);
    expect(east.filter((l) => west.includes(l))).toEqual([]);
    expect([...east, ...west].sort((a, b) => a - b)).toEqual(LAYERS_FT);
  });

  it('wraps headings outside 0–360', () => {
    expect(layersForHeading(-90)).toEqual(layersForHeading(270));
    expect(layersForHeading(450)).toEqual(layersForHeading(90));
  });
});

describe('normalizeRoute', () => {
  const stepA = [
    { lat: 37.0, lng: -122.0 },
    { lat: 37.001, lng: -122.0 },
  ];
  const stepB = [
    { lat: 37.001, lng: -122.0 },
    { lat: 37.002, lng: -122.001 },
  ];

  it('reads a Routes API encoded polyline', () => {
    const response = { routes: [{ distanceMeters: 1, duration: '1s', polyline: { encodedPolyline: GOOGLE_EXAMPLE } }] };
    expect(normalizeRoute(response)).toEqual({ source: 'routes-api', points: GOOGLE_EXAMPLE_POINTS });
  });

  it('reads a Routes API GeoJSON polyline', () => {
    const response = {
      routes: [{ polyline: { geoJsonLinestring: { type: 'LineString', coordinates: [[-122, 37], [-122.1, 37.1]] } } }],
    };
    expect(normalizeRoute(response).points).toEqual([
      { lat: 37, lng: -122 },
      { lat: 37.1, lng: -122.1 },
    ]);
  });

  it('falls back to Routes API step polylines', () => {
    const route = {
      legs: [{ steps: [{ polyline: { encodedPolyline: encodePolyline(stepA) } }, { polyline: { encodedPolyline: encodePolyline(stepB) } }] }],
    };
    expect(normalizeRoute(route)).toEqual({ source: 'routes-api', points: [stepA[0], stepA[1], stepB[1]] });
  });

  it('joins Directions API steps across legs and drops repeated join points', () => {
    const response = {
      status: 'OK',
      routes: [
        {
          overview_polyline: { points: GOOGLE_EXAMPLE },
          legs: [
            { steps: [{ polyline: { points: encodePolyline(stepA) } }] },
            { steps: [{ polyline: { points: encodePolyline(stepB) } }] },
          ],
        },
      ],
    };
    expect(normalizeRoute(response)).toEqual({ source: 'directions-api', points: [stepA[0], stepA[1], stepB[1]] });
  });

  it('falls back to the Directions overview polyline, nested or bare', () => {
    expect(normalizeRoute({ routes: [{ overview_polyline: { points: GOOGLE_EXAMPLE } }] }).points).toEqual(GOOGLE_EXAMPLE_POINTS);
    expect(normalizeRoute({ routes: [{ overview_polyline: GOOGLE_EXAMPLE }] }).points).toEqual(GOOGLE_EXAMPLE_POINTS);
  });

  it('picks the requested alternate route', () => {
    const response = {
      routes: [{ polyline: { encodedPolyline: encodePolyline(stepA) } }, { polyline: { encodedPolyline: GOOGLE_EXAMPLE } }],
    };
    expect(normalizeRoute(response, 1).points).toEqual(GOOGLE_EXAMPLE_POINTS);
  });

  it.each([
    ['a non-object', 'hello'],
    ['a failed Directions status', { status: 'ZERO_RESULTS', routes: [] }],
    ['an empty routes array', { routes: [] }],
    ['an unrecognised shape', { routes: [{ foo: 'bar' }] }],
    ['a malformed polyline', { routes: [{ polyline: { encodedPolyline: '_p~iF~ps|' } }] }],
    ['a single-point path', { routes: [{ polyline: { encodedPolyline: encodePolyline([stepA[0]]) } }] }],
    ['an out-of-range coordinate', { routes: [{ polyline: { geoJsonLinestring: { coordinates: [[0, 0], [0, 95]] } } }] }],
  ])('rejects %s', (_, input) => {
    expect(() => normalizeRoute(input)).toThrow(RouteParseError);
  });

  it('rejects a missing route index', () => {
    expect(() => normalizeRoute({ routes: [{ polyline: { encodedPolyline: GOOGLE_EXAMPLE } }] }, 3)).toThrow(RouteParseError);
  });
});

describe('prepareFlight / finalizeFlight', () => {
  // ~1.1 km due north from the equator.
  const north = { source: 'routes-api' as const, points: [{ lat: 0, lng: 0 }, { lat: 0.01, lng: 0 }] };
  const departureTime = new Date('2026-10-16T12:00:00Z');
  // Every visit at one layer.
  const level = (prepared: Awaited<ReturnType<typeof prepareFlight>>, layer: number) => {
    const visits = cellVisits(prepared.track);
    return finalizeFlight(prepared, visits, visits.map(() => layer));
  };

  it('times the flight at cruise speed, not driving speed', async () => {
    const plan = level(await prepareFlight(north, { elevation: flatElevation, departureTime, cruiseSpeedMps: 10 }), 150);
    const seconds = (Date.parse(plan.arriveAt) - departureTime.getTime()) / 1000;
    expect(plan.departAt).toBe(departureTime.toISOString());
    expect(seconds).toBeCloseTo(plan.distanceMeters / 10, 0);
    expect(plan.points[0].eta).toBe(plan.departAt);
    expect(plan.points.at(-1)!.eta).toBe(plan.arriveAt);
  });

  it('samples densely enough for terrain and the reservation grid', async () => {
    const plan = level(await prepareFlight(north, { elevation: flatElevation }), 150);
    for (let i = 1; i < plan.points.length; i++) {
      expect(plan.points[i].distanceMeters - plan.points[i - 1].distanceMeters).toBeLessThanOrEqual(DENSIFY_SPACING_M + 0.1);
    }
  });

  it('records the overall heading used to pick the layer set', async () => {
    const south = { source: 'routes-api' as const, points: [...north.points].reverse() };
    expect((await prepareFlight(north, { elevation: flatElevation })).headingDeg).toBeCloseTo(0, 5);
    expect((await prepareFlight(south, { elevation: flatElevation })).headingDeg).toBeCloseTo(180, 5);
  });

  it('follows terrain: MSL altitude is ground plus AGL', async () => {
    // A hill that rises 1 m per sample.
    const sloped: ElevationProvider = {
      source: 'google',
      getElevationsMeters: async (points: LatLng[]) => points.map((_, i) => 100 + i),
    };
    const plan = level(await prepareFlight(north, { elevation: sloped }), 200);
    expect(plan.elevationSource).toBe('google');
    expect(plan).toMatchObject({ minAltitudeAglFt: 200, maxAltitudeAglFt: 200, layerChanges: 0 });
    expect(plan.segments).toHaveLength(1);
    for (const p of plan.points) {
      expect(p.altitudeAglFt).toBe(200);
      expect(p.altitudeMslFt).toBeCloseTo(p.groundElevationFt + 200, 0);
    }
  });

  it('ramps smoothly between layers instead of jumping', async () => {
    const prepared = await prepareFlight(north, { elevation: flatElevation });
    const visits = cellVisits(prepared.track);
    const half = Math.floor(visits.length / 2);
    const plan = finalizeFlight(prepared, visits, visits.map((_, k) => (k < half ? 150 : 200)));

    const agl = plan.points.map((p) => p.altitudeAglFt);
    expect(agl[0]).toBe(150);
    expect(agl.at(-1)).toBe(200);
    agl.forEach((a, i) => i > 0 && expect(a).toBeGreaterThanOrEqual(agl[i - 1]));
    expect(agl.some((a) => a > 150 && a < 200)).toBe(true);

    // The ramp covers about the distance a 50 ft climb takes at cruise speed.
    const rampPoints = agl.filter((a) => a > 150 && a < 200).length;
    const climbM = (50 / VERTICAL_RATE_FT_PER_S) * prepared.cruiseSpeedMps;
    expect(rampPoints).toBeLessThanOrEqual(Math.ceil(climbM / DENSIFY_SPACING_M) + 1);

    expect(plan).toMatchObject({ minAltitudeAglFt: 150, maxAltitudeAglFt: 200, layerChanges: 1 });
    expect(plan.segments.map((s) => s.altitudeAglFt)).toEqual([150, 200]);
    expect(plan.segments[0].fromIndex).toBe(0);
    expect(plan.segments[1].toIndex).toBe(plan.points.length - 1);
  });

  it('builds a GeoJSON path that climbs from and descends to the ground', async () => {
    const ground: ElevationProvider = { source: 'google', getElevationsMeters: async (pts) => pts.map(() => 50) };
    const plan = level(await prepareFlight(north, { elevation: ground }), 150);
    const coords = plan.path.coordinates;
    expect(coords).toHaveLength(plan.points.length + 2);
    expect(coords[0]).toEqual([0, 0, 50]);
    expect(coords[1][2]).toBeCloseTo(50 + 150 / 3.28084, 1);
    expect(coords.at(-1)).toEqual([0, 0.01, 50]);
  });

  it.each([
    ['a zero cruise speed', { cruiseSpeedMps: 0 }, /greater than zero/],
    ['a speed over the Part 107 limit', { cruiseSpeedMps: 46 }, /100 mph/],
    ['an invalid departure time', { departureTime: new Date('nope') }, /valid date/],
  ])('rejects %s', async (_, options, message) => {
    await expect(prepareFlight(north, { elevation: flatElevation, ...options })).rejects.toThrow(message);
  });

  it('accepts exactly 100 mph', async () => {
    await expect(prepareFlight(north, { elevation: flatElevation, cruiseSpeedMps: 100 * 0.44704 })).resolves.toBeDefined();
  });

  it('rejects routes longer than the cap', async () => {
    const long = { source: 'routes-api' as const, points: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }] };
    await expect(prepareFlight(long, { elevation: flatElevation })).rejects.toThrow(/limited to/);
  });
});

describe('cellVisits', () => {
  const T0 = Date.parse('2026-10-16T12:00:00Z');
  const MIN = 60_000;
  const [lat, lng] = cellToLatLng(latLngToCell(30.2622, -97.7451, H3_RESOLUTION));
  const at = (dLat: number, distanceMeters: number, s: number): TrackPoint => ({
    lat: lat + dLat,
    lng,
    distanceMeters,
    etaMs: T0 + s * 1000,
  });

  it('groups consecutive points in a cell and pads the window by the margin', () => {
    // Two points ~10 m apart around a cell's center, then one ~1.1 km away.
    const visits = cellVisits([at(0, 0, 0), at(0.0001, 10, 2), at(0.01, 1100, 40)], MIN);
    expect(visits).toHaveLength(2);
    expect(visits[0]).toMatchObject({
      firstIndex: 0,
      lastIndex: 1,
      enterMs: T0,
      exitMs: T0 + 40_000, // when the next cell is entered
      startDistanceM: 0,
      endDistanceM: 1100,
      startMs: T0 - MIN,
      endMs: T0 + 40_000 + MIN,
    });
  });

  it('treats a return to an earlier cell as a separate visit', () => {
    const visits = cellVisits([at(0, 0, 0), at(0.01, 1100, 40), at(0, 2200, 80)], MIN);
    expect(visits.map((v) => v.cell)).toEqual([visits[0].cell, visits[1].cell, visits[0].cell]);
  });
});

describe('assignLayers', () => {
  // A straight route through n synthetic 150 m cells c0…c(n-1) at ~60 mph.
  const LEN = 150;
  const SPEED = 26.8;
  const makeVisits = (n: number): CellVisit[] =>
    Array.from({ length: n }, (_, k) => {
      const enterMs = ((k * LEN) / SPEED) * 1000;
      const exitMs = (((k + 1) * LEN) / SPEED) * 1000;
      return {
        cell: `c${k}`,
        firstIndex: k,
        lastIndex: k,
        enterMs,
        exitMs,
        startDistanceM: k * LEN,
        endDistanceM: (k + 1) * LEN,
        startMs: enterMs - 60_000,
        endMs: exitMs + 60_000,
      };
    });
  // Other routes holding `layer` in the given cells for the whole flight.
  const busy = (...entries: [number[], number][]) => {
    const map = new Map<string, Reservation[]>();
    for (const [cells, layer] of entries) {
      for (const k of cells) {
        const list = map.get(`c${k}`) ?? [];
        list.push({ routeId: 'other', layerAglFt: layer, startMs: -Infinity, endMs: Infinity });
        map.set(`c${k}`, list);
      }
    }
    return map;
  };
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const NORTH = [150, 200, 250, 300, 350, 400];

  it('flies the lowest layer when the airspace is empty', () => {
    expect(assignLayers(makeVisits(10), NORTH, new Map())).toEqual(Array(10).fill(150));
  });

  it('climbs only around a busy stretch, then comes back down', () => {
    const layers = assignLayers(makeVisits(30), NORTH, busy([[10, 11, 12], 150]))!;
    // The climb has to finish before c10 (150 is taken there), so it happens
    // at the c8→c9 boundary; the descent waits until c13→c14.
    expect(layers).toEqual([...Array(9).fill(150), ...Array(5).fill(200), ...Array(16).fill(150)]);
  });

  it('does not hop down for a short free gap', () => {
    const layers = assignLayers(makeVisits(20), NORTH, busy([[5, 9], 150]))!;
    expect(layers.slice(4, 11)).toEqual(Array(7).fill(200));
  });

  it('does come down for a long free gap', () => {
    const layers = assignLayers(makeVisits(40), NORTH, busy([[5, 30], 150]))!;
    expect(layers.slice(10, 25)).toEqual(Array(15).fill(150));
  });

  it('only climbs where the layers in between are free', () => {
    // Opposite-direction traffic at 175 in c7 and c8, and 150 taken at c10:
    // the latest boundary where 150→200 can pass through 175 is c5→c6.
    const layers = assignLayers(makeVisits(20), NORTH, busy([[7, 8], 175], [[10], 150]))!;
    expect(layers[5]).toBe(150);
    expect(layers[6]).toBe(200);
  });

  it('fails when there is no way past the conflict', () => {
    // 175 is taken everywhere, so nothing can climb through it, and 150 is taken at c10.
    expect(assignLayers(makeVisits(20), NORTH, busy([range(0, 19), 175], [[10], 150]))).toBeNull();
  });

  it('cannot take off or land through a busy layer', () => {
    expect(assignLayers(makeVisits(10), NORTH, busy([[0], 150]))).toBeNull();
    expect(assignLayers(makeVisits(10), NORTH, busy([[9], 150]))).toBeNull();
    expect(assignLayers(makeVisits(10), [175, 225], busy([[0], 150]))).toBeNull();
  });

  it('respects the vertical rate', () => {
    // 200 is taken over the origin, so the route must take off at 150 and climb
    // to get past c10. At 1 ft/s a 50 ft climb takes 50 s, but crossing two
    // cells takes ~11 s.
    const slow = { allLayers: LAYERS_FT, verticalRateFtPerS: 1, changePenaltyM: 500 };
    const traffic = busy([[0, 1, 2, 3], 200], [[10], 150]);
    expect(assignLayers(makeVisits(20), NORTH, traffic, slow)).toBeNull();
    expect(assignLayers(makeVisits(20), NORTH, traffic)).not.toBeNull();
  });

  it('ignores reservations that do not overlap in time', () => {
    const past = new Map([['c3', [{ routeId: 'old', layerAglFt: 150, startMs: -10 * 60_000, endMs: -2 * 60_000 }]]]);
    expect(assignLayers(makeVisits(10), NORTH, past)).toEqual(Array(10).fill(150));
  });

  it('reserves the layers crossed at takeoff, landing and each change', () => {
    const visits = makeVisits(4);
    const held = reservationsFor(visits, [175, 175, 225, 225], 'me');
    const layersIn = (k: number) => held.filter((h) => h.cell === `c${k}`).map((h) => h.reservation.layerAglFt);
    expect(layersIn(0)).toEqual([150, 175]); // takeoff column
    expect(layersIn(1)).toEqual([175, 200, 225]); // climb out of c1
    expect(layersIn(2)).toEqual([175, 200, 225]); // climb into c2
    expect(layersIn(3)).toEqual([150, 175, 200, 225]); // landing column
    expect(held.every((h) => h.reservation.routeId === 'me')).toBe(true);
    expect(held[0].reservation).toMatchObject({ startMs: visits[0].startMs, endMs: visits[0].endMs });
  });
});
