import type { LatLng } from './types';

// Google's Encoded Polyline Algorithm Format, precision 1e5.
// https://developers.google.com/maps/documentation/utilities/polylinealgorithm

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += readValue();
    lng += readValue();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;

  function readValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) {
        throw new Error('Truncated polyline');
      }
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}

export function encodePolyline(points: LatLng[]): string {
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    output += encodeValue(lat - prevLat) + encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return output;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let output = '';
  while (v >= 0x20) {
    output += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return output + String.fromCharCode(v + 63);
}
