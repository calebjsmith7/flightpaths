// Airspace parameters for altitude assignment. All altitudes are feet AGL.
//
// The band stays under the Part 107 ceiling (400 ft) so drones keep a 100 ft
// buffer below the 500 ft minimum manned aircraft may descend to.

export const FLOOR_FT = 150;
export const CEILING_FT = 400;

// Vertical gap between layers. 25 ft (~7.6 m) leaves each vehicle a ±12 ft
// error budget, which GNSS + barometric fusion can hold; 10 ft would need RTK.
export const LAYER_SPACING_FT = 25;

// Layers alternate by direction of travel (like the semicircular rule), so
// opposing traffic on the same road never shares a layer:
//   heading 0–179°   → 150, 200, 250, 300, 350, 400
//   heading 180–359° → 175, 225, 275, 325, 375
export const LAYERS_FT: readonly number[] = Array.from(
  { length: Math.floor((CEILING_FT - FLOOR_FT) / LAYER_SPACING_FT) + 1 },
  (_, i) => FLOOR_FT + i * LAYER_SPACING_FT,
);

export function layersForHeading(headingDeg: number): number[] {
  const parity = ((headingDeg % 360) + 360) % 360 < 180 ? 0 : 1;
  return LAYERS_FT.filter((_, i) => i % 2 === parity);
}

// How fast a vehicle changes layers. ~5 m/s is a typical multirotor climb rate;
// a change has to fit within the two cells either side of it.
export const VERTICAL_RATE_FT_PER_S = 1000 / 60;

// The cost of a layer change, expressed as metres flown one layer higher. A
// route only drops back down if the lower layer stays free for longer than this,
// so it doesn't hop down for one free cell and straight back up.
export const LAYER_CHANGE_PENALTY_M = 500;

// A route holds each cell from (entry - margin) to (exit + margin). Cell docs
// expire via a Firestore TTL policy on `expiresAt`.
export const RESERVATION_MARGIN_MS = 2 * 60 * 1000;

// Google's durations are for cars; flight timing uses this unless the caller
// supplies its own cruise speed. 60 mph is typical for delivery drones.
export const DEFAULT_CRUISE_SPEED_MPS = 26.8224;

export const MPS_PER_MPH = 0.44704;

// Part 107 caps groundspeed at 87 knots (~100 mph).
export const MAX_CRUISE_SPEED_MPS = 100 * MPS_PER_MPH;

// Longest route we'll plan. Well beyond near-term drone range, and it keeps a
// saved plan (one sample per DENSIFY_SPACING_M) far under Firestore's 1 MB cap.
export const MAX_ROUTE_M = 100_000;

// Maximum gap between path samples, for terrain lookups and the reservation grid.
export const DENSIFY_SPACING_M = 50;

// H3 resolution for the reservation grid. At 10, cells are ~76 m on a side and
// ~150 m across, so routes on roads a block apart don't share cells.
export const H3_RESOLUTION = 10;
