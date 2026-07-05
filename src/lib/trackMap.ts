import type { Location } from '../api/types';

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
