export type LatLng = { lat: number; lng: number };

// A Google route reduced to what flight planning needs, whichever API it came from.
export type NormalizedRoute = {
  source: 'routes-api' | 'directions-api';
  points: LatLng[];
};

export interface ElevationProvider {
  // Recorded on the plan so callers can tell real terrain from a flat fallback.
  readonly source: 'google' | 'none';
  getElevationsMeters(points: LatLng[]): Promise<number[]>;
}

// Where the vehicle is and when, before an altitude is chosen. The reservation
// grid is built from this.
export type TrackPoint = LatLng & {
  distanceMeters: number;
  etaMs: number;
};

export type FlightPoint = {
  lat: number;
  lng: number;
  distanceMeters: number;
  eta: string;
  groundElevationFt: number;
  altitudeAglFt: number;
  altitudeMslFt: number;
};

// A stretch of the route flown level at one layer. Climbs and descents happen
// in the gaps between consecutive segments.
export type FlightSegment = {
  altitudeAglFt: number;
  fromIndex: number;
  toIndex: number;
  startDistanceMeters: number;
  endDistanceMeters: number;
};

export type FlightPlan = {
  source: NormalizedRoute['source'];
  elevationSource: ElevationProvider['source'];
  headingDeg: number;
  minAltitudeAglFt: number;
  maxAltitudeAglFt: number;
  layerChanges: number;
  segments: FlightSegment[];
  cruiseSpeedMps: number;
  distanceMeters: number;
  departAt: string;
  arriveAt: string;
  points: FlightPoint[];
  // GeoJSON, so coordinates are [lng, lat, altitude in meters MSL]. Starts and
  // ends on the ground, with a vertical climb and descent at the endpoints.
  path: { type: 'LineString'; coordinates: [number, number, number][] };
};

export class RouteParseError extends Error {
  name = 'RouteParseError';
}

export class AirspaceFullError extends Error {
  name = 'AirspaceFullError';
}
