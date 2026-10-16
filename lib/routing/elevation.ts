import type { ElevationProvider, LatLng } from './types';

// Used when no Google Maps key is configured: treats the ground as sea level.
// Plans made this way say elevationSource "none" so nobody mistakes them for real
// terrain-following altitudes.
export const flatElevation: ElevationProvider = {
  source: 'none',
  async getElevationsMeters(points: LatLng[]) {
    return points.map(() => 0);
  },
};
