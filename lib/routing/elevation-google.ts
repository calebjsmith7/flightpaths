import 'server-only';
import { flatElevation } from './elevation';
import { encodePolyline } from './polyline';
import type { ElevationProvider, LatLng } from './types';

// Google Elevation API. It allows 512 locations per request; smaller batches
// keep each URL well under the 16 KB limit.
const ENDPOINT = 'https://maps.googleapis.com/maps/api/elevation/json';
const BATCH_SIZE = 256;

export function googleElevation(apiKey: string): ElevationProvider {
  return {
    source: 'google',
    async getElevationsMeters(points: LatLng[]) {
      const batches: LatLng[][] = [];
      for (let i = 0; i < points.length; i += BATCH_SIZE) {
        batches.push(points.slice(i, i + BATCH_SIZE));
      }
      const results = await Promise.all(batches.map((batch) => fetchBatch(batch, apiKey)));
      return results.flat();
    },
  };
}

async function fetchBatch(points: LatLng[], apiKey: string): Promise<number[]> {
  const url = `${ENDPOINT}?locations=enc:${encodeURIComponent(encodePolyline(points))}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Elevation API returned HTTP ${response.status}`);
  }
  const body = (await response.json()) as { status: string; error_message?: string; results?: { elevation: number }[] };
  if (body.status !== 'OK' || body.results?.length !== points.length) {
    throw new Error(`Elevation API returned ${body.status}${body.error_message ? `: ${body.error_message}` : ''}`);
  }
  return body.results.map((r) => r.elevation);
}

export function defaultElevationProvider(): ElevationProvider {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return key ? googleElevation(key) : flatElevation;
}
