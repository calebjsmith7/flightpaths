import type { LatLng } from './types';

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Initial great-circle bearing from a to b, 0–360° clockwise from true north.
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Adds interpolated points so no gap exceeds maxSpacingM. Google leaves long
// straight roads as two far-apart points; terrain and the reservation grid both
// need samples along them. Linear interpolation is fine at these distances.
export function densify(points: LatLng[], maxSpacingM: number): LatLng[] {
  if (points.length < 2) {
    return points.slice();
  }
  const output: LatLng[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const pieces = Math.ceil(distanceMeters(a, b) / maxSpacingM);
    for (let j = 1; j < pieces; j++) {
      const f = j / pieces;
      output.push({ lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f });
    }
    output.push(b);
  }
  return output;
}

// Drops consecutive repeats, which appear where Google's step polylines join.
export function dedupe(points: LatLng[]): LatLng[] {
  return points.filter((p, i) => i === 0 || p.lat !== points[i - 1].lat || p.lng !== points[i - 1].lng);
}
