import type { CarData } from '../api/types';
import { cumulativeDistance } from './distance';

export type DeltaConfidence = 'high' | 'medium' | 'low';

export interface DeltaPoint {
  distanceM: number;
  deltaS: number;
}

export interface DeltaResult {
  points: DeltaPoint[];
  confidence: DeltaConfidence;
}

const GRID_STEP_M = 10;

function elapsedSeconds(samples: CarData[]): number[] {
  const startMs = Date.parse(samples[0].date);
  return samples.map((s) => (Date.parse(s.date) - startMs) / 1000);
}

// Linear interpolation of elapsed time at a given distance, over a
// monotonically non-decreasing distance array (see distance.ts). Falls back
// to the sample's own time when two consecutive samples share the same
// distance (car stopped/near-zero speed), avoiding a division by zero.
function timeAtDistance(distances: number[], elapsedS: number[], targetM: number): number {
  if (targetM <= distances[0]) return elapsedS[0];
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= targetM) {
      const d0 = distances[i - 1];
      const d1 = distances[i];
      if (d1 === d0) return elapsedS[i];
      const ratio = (targetM - d0) / (d1 - d0);
      return elapsedS[i - 1] + ratio * (elapsedS[i] - elapsedS[i - 1]);
    }
  }
  return elapsedS[elapsedS.length - 1];
}

// Confidence in the distance alignment: two laps whose total distance
// differs a lot (pit stop, safety car, off-track excursion) make "same
// distance = same physical point" less reliable — see spec fase-c1 §5.
function confidenceFor(totalA: number, totalB: number): DeltaConfidence {
  const diffPct = (Math.abs(totalA - totalB) / Math.max(totalA, totalB, 1)) * 100;
  if (diffPct <= 3) return 'high';
  if (diffPct <= 10) return 'medium';
  return 'low';
}

// Accumulated time delta between two laps, aligned by distance (not time —
// see spec fase-c1-delta-chart.md §5). `samplesA` is the reference driver:
// deltaS > 0 means `samplesB` is slower than `samplesA` at that point.
export function computeDelta(samplesA: CarData[], samplesB: CarData[]): DeltaResult {
  if (samplesA.length === 0 || samplesB.length === 0) {
    return { points: [], confidence: 'low' };
  }

  const distancesA = cumulativeDistance(samplesA);
  const distancesB = cumulativeDistance(samplesB);
  const timesA = elapsedSeconds(samplesA);
  const timesB = elapsedSeconds(samplesB);

  const totalA = distancesA[distancesA.length - 1];
  const totalB = distancesB[distancesB.length - 1];
  const maxCommonM = Math.min(totalA, totalB);

  if (maxCommonM <= 0) {
    return { points: [], confidence: 'low' };
  }

  const points: DeltaPoint[] = [];
  for (let d = 0; d <= maxCommonM; d += GRID_STEP_M) {
    const timeA = timeAtDistance(distancesA, timesA, d);
    const timeB = timeAtDistance(distancesB, timesB, d);
    points.push({ distanceM: d, deltaS: timeB - timeA });
  }

  return { points, confidence: confidenceFor(totalA, totalB) };
}
