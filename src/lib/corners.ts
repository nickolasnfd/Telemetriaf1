// Heuristic corner detection over a distance-indexed speed trace: smooth to
// remove sampling noise, find local minima, keep only "prominent" ones (real
// braking zones, not tiny wiggles), then merge minima that are too close
// together (same physical corner detected twice). Numbering is SEQUENTIAL
// (T1, T2…) — NOT the circuit's official corner numbers, which would require
// a per-track map we don't have (see AGENTS.md §4: never invent data).

export interface CornerPoint {
  distanceM: number;
  speed: number;
}

export interface Corner {
  index: number;
  distanceM: number;
}

export interface DetectCornersOptions {
  smoothingWindow?: number; // samples, odd-ish window for the moving average
  minProminenceKmh?: number; // valley must dip at least this much below nearby peaks
  minSpacingM?: number; // merge minima closer than this into one corner
  peakSearchWindow?: number; // samples scanned each side to find the nearby peak
}

const DEFAULTS: Required<DetectCornersOptions> = {
  smoothingWindow: 5,
  minProminenceKmh: 15,
  minSpacingM: 50,
  peakSearchWindow: 40,
};

function movingAverage(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) sum += values[j];
    return sum / (end - start);
  });
}

function localMinimaIndices(values: number[]): number[] {
  const minima: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    const isValley = values[i] <= values[i - 1] && values[i] <= values[i + 1];
    const isStrict = values[i] < values[i - 1] || values[i] < values[i + 1];
    if (isValley && isStrict) minima.push(i);
  }
  return minima;
}

function nearbyPeak(values: number[], center: number, direction: 1 | -1, window: number): number {
  let peak = values[center];
  for (let step = 1; step <= window; step++) {
    const idx = center + step * direction;
    if (idx < 0 || idx >= values.length) break;
    if (values[idx] > peak) peak = values[idx];
  }
  return peak;
}

export function detectCorners(points: CornerPoint[], options: DetectCornersOptions = {}): Corner[] {
  const opts = { ...DEFAULTS, ...options };
  if (points.length < 3) return [];

  const speeds = points.map((p) => p.speed);
  const smoothed = movingAverage(speeds, opts.smoothingWindow);

  const candidates = localMinimaIndices(smoothed)
    .filter((i) => {
      const leftPeak = nearbyPeak(smoothed, i, -1, opts.peakSearchWindow);
      const rightPeak = nearbyPeak(smoothed, i, 1, opts.peakSearchWindow);
      const prominence = Math.min(leftPeak, rightPeak) - smoothed[i];
      return prominence >= opts.minProminenceKmh;
    })
    .map((i) => ({ i, distanceM: points[i].distanceM, speed: smoothed[i] }));

  // Merge candidates within minSpacingM, keeping the deepest valley of each cluster.
  candidates.sort((a, b) => a.distanceM - b.distanceM);
  const merged: typeof candidates = [];
  for (const candidate of candidates) {
    const last = merged[merged.length - 1];
    if (last && candidate.distanceM - last.distanceM < opts.minSpacingM) {
      if (candidate.speed < last.speed) merged[merged.length - 1] = candidate;
    } else {
      merged.push(candidate);
    }
  }

  return merged.map((c, index) => ({ index: index + 1, distanceM: c.distanceM }));
}
