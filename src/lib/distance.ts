import type { CarData } from '../api/types';

const KMH_TO_MS = 1000 / 3600;

// Trapezoidal integration of speed over time — more accurate than a
// rectangular sum under the OpenF1 car_data's irregular ~3.7 Hz sampling.
// Returns cumulative distance in meters, one value per sample (index-aligned).
export function cumulativeDistance(samples: CarData[]): number[] {
  if (samples.length === 0) return [];
  const distances = [0];
  for (let i = 1; i < samples.length; i++) {
    const dtS = (Date.parse(samples[i].date) - Date.parse(samples[i - 1].date)) / 1000;
    const avgSpeedMs = ((samples[i - 1].speed + samples[i].speed) / 2) * KMH_TO_MS;
    distances.push(distances[i - 1] + Math.max(0, avgSpeedMs * dtS));
  }
  return distances;
}
