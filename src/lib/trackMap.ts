import type { CarData, Location } from '../api/types';
import { cumulativeDistance } from './distance';

export interface TrackPoint {
  x: number;
  y: number;
}

export interface TrackPath {
  path: string;
  viewBox: string;
}

const VIEWBOX_SIZE = 1000;
const PADDING = 40;

// Maps raw OpenF1 x/y (arbitrary units, circuit-dependent) into a fixed,
// responsive viewBox: same scale factor on both axes (no distortion) and Y
// flipped, since SVG grows downward while track y grows upward.
// Exposed on its own (not folded into buildTrackPath) so the D.2 spec can
// slice the same normalized points into colored segments without redoing
// the viewBox/proportion/Y-axis math (spec fase-d1-track-map.md §5).
export function normalizeTrackPoints(points: Location[]): TrackPoint[] {
  if (points.length < 2) return [];

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  if (width <= 0 || height <= 0) return [];

  const drawSize = VIEWBOX_SIZE - 2 * PADDING;
  const scale = Math.min(drawSize / width, drawSize / height);
  const offsetX = PADDING + (drawSize - width * scale) / 2;
  const offsetY = PADDING + (drawSize - height * scale) / 2;

  const round = (n: number) => Math.round(n * 100) / 100;
  return points.map((p) => ({
    x: round(offsetX + (p.x - minX) * scale),
    y: round(offsetY + (maxY - p.y) * scale), // flip Y for SVG's downward axis
  }));
}

// Closed SVG path following the car's route, in the fixed viewBox above.
export function buildTrackPath(points: Location[]): TrackPath {
  const viewBox = `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`;
  const normalized = normalizeTrackPoints(points);
  if (normalized.length === 0) return { path: '', viewBox };

  const [first, ...rest] = normalized;
  const path = `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')} Z`;
  return { path, viewBox };
}

// Inverse of delta.ts's timeAtDistance: linear interpolation of distance (m)
// at a given elapsed time (s), over a monotonically non-decreasing time
// array. Out-of-range targets clamp to the first/last distance (spec
// fase-d2-track-coloring.md §5).
function distanceAtTime(distances: number[], elapsedS: number[], targetS: number): number {
  if (targetS <= elapsedS[0]) return distances[0];
  for (let i = 1; i < elapsedS.length; i++) {
    if (elapsedS[i] >= targetS) {
      const t0 = elapsedS[i - 1];
      const t1 = elapsedS[i];
      if (t1 === t0) return distances[i];
      const ratio = (targetS - t0) / (t1 - t0);
      return distances[i - 1] + ratio * (distances[i] - distances[i - 1]);
    }
  }
  return distances[distances.length - 1];
}

// Maps each `location` sample (own ~3.7 Hz feed, own timestamps) to a
// distance along the lap (m), by interpolating over the reference driver's
// car_data-derived time/distance series — location and car_data are
// independent OpenF1 feeds that don't share sample instants (spec
// fase-d2-track-coloring.md §5).
export function attachDistances(locationSamples: Location[], carSamples: CarData[]): number[] {
  if (locationSamples.length === 0 || carSamples.length === 0) return [];

  const distances = cumulativeDistance(carSamples);
  const carStartMs = Date.parse(carSamples[0].date);
  const elapsedS = carSamples.map((s) => (Date.parse(s.date) - carStartMs) / 1000);

  return locationSamples.map((loc) => {
    const targetS = (Date.parse(loc.date) - carStartMs) / 1000;
    return distanceAtTime(distances, elapsedS, targetS);
  });
}

// Nearest normalized point to a target distance (m) — used to place corner
// and sector labels on the track outline. Visual placement doesn't need
// sub-meter precision, same "nearest sample" approximation already accepted
// in sectors.ts (spec fase-d3-track-labels.md §5). Returns {x:0,y:0} for
// empty input, never throws.
export function pointAtDistance(points: TrackPoint[], distances: number[], targetM: number): TrackPoint {
  if (points.length === 0) return { x: 0, y: 0 };

  let bestIdx = 0;
  let bestDiff = Math.abs(distances[0] - targetM);
  for (let i = 1; i < distances.length; i++) {
    const diff = Math.abs(distances[i] - targetM);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return points[bestIdx];
}
