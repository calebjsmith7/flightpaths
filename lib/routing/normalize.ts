import { dedupe } from './geo';
import { decodePolyline } from './polyline';
import { RouteParseError, type LatLng, type NormalizedRoute } from './types';

// Accepts either a Routes API (computeRoutes) response or a Directions API
// response, in full or as a single route object, and returns its path.
//
// Routes API:     route.polyline.encodedPolyline | route.polyline.geoJsonLinestring,
//                 legs[].steps[].polyline.encodedPolyline
// Directions API: legs[].steps[].polyline.points, overview_polyline.points
export function normalizeRoute(input: unknown, routeIndex = 0): NormalizedRoute {
  if (!isObject(input)) {
    throw new RouteParseError('Expected a JSON object.');
  }
  if (typeof input.status === 'string' && input.status !== 'OK') {
    throw new RouteParseError(`Google returned status "${input.status}", so there is no route to read.`);
  }

  const route = pickRoute(input, routeIndex);
  const parsed = parseRoutesApi(route) ?? parseDirectionsApi(route);
  if (!parsed) {
    throw new RouteParseError('Could not find a route path. Expected a Google Routes API or Directions API response.');
  }

  const points = dedupe(parsed.points);
  if (points.length < 2) {
    throw new RouteParseError('The route path needs at least two points.');
  }
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) {
      throw new RouteParseError('The route contains an invalid coordinate.');
    }
  }
  return { source: parsed.source, points };
}

function pickRoute(input: Record<string, unknown>, routeIndex: number): Record<string, unknown> {
  if (!Array.isArray(input.routes)) {
    return input;
  }
  if (input.routes.length === 0) {
    throw new RouteParseError('The response has no routes.');
  }
  const route = input.routes[routeIndex];
  if (!isObject(route)) {
    throw new RouteParseError(`There is no route at index ${routeIndex}.`);
  }
  return route;
}

function parseRoutesApi(route: Record<string, unknown>): NormalizedRoute | null {
  const polyline = route.polyline;
  if (isObject(polyline)) {
    if (typeof polyline.encodedPolyline === 'string') {
      return { source: 'routes-api', points: decode(polyline.encodedPolyline) };
    }
    const coords = isObject(polyline.geoJsonLinestring) ? polyline.geoJsonLinestring.coordinates : undefined;
    if (Array.isArray(coords)) {
      return { source: 'routes-api', points: coords.map(fromLngLatPair) };
    }
  }
  const fromSteps = stepPolylines(route, (p) => p.encodedPolyline);
  return fromSteps ? { source: 'routes-api', points: fromSteps } : null;
}

function parseDirectionsApi(route: Record<string, unknown>): NormalizedRoute | null {
  // Step polylines are full detail; the overview is simplified, so it's only a fallback.
  const fromSteps = stepPolylines(route, (p) => p.points);
  if (fromSteps) {
    return { source: 'directions-api', points: fromSteps };
  }
  const overview = route.overview_polyline;
  // The REST API nests the string under `points`; the JS API serializes it bare.
  const encoded = isObject(overview) ? overview.points : overview;
  return typeof encoded === 'string' ? { source: 'directions-api', points: decode(encoded) } : null;
}

// Concatenates every step's polyline across all legs, or returns null if any
// step lacks one in the expected field.
function stepPolylines(
  route: Record<string, unknown>,
  field: (polyline: Record<string, unknown>) => unknown,
): LatLng[] | null {
  if (!Array.isArray(route.legs) || route.legs.length === 0) {
    return null;
  }
  const points: LatLng[] = [];
  for (const leg of route.legs) {
    if (!isObject(leg) || !Array.isArray(leg.steps) || leg.steps.length === 0) {
      return null;
    }
    for (const step of leg.steps) {
      const encoded = isObject(step) && isObject(step.polyline) ? field(step.polyline) : undefined;
      if (typeof encoded !== 'string') {
        return null;
      }
      points.push(...decode(encoded));
    }
  }
  return points;
}

function decode(encoded: string): LatLng[] {
  try {
    return decodePolyline(encoded);
  } catch {
    throw new RouteParseError('The route polyline is malformed.');
  }
}

function fromLngLatPair(pair: unknown): LatLng {
  if (!Array.isArray(pair) || typeof pair[0] !== 'number' || typeof pair[1] !== 'number') {
    throw new RouteParseError('The route GeoJSON has an invalid coordinate.');
  }
  return { lat: pair[1], lng: pair[0] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
