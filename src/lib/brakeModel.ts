import type { CarData } from '../api/types';

const KMH_TO_MS = 1000 / 3600;

export interface BrakePressurePoint {
  date: string;
  pressurePct: number;
}

// Deceleration per sample (m/s²), from consecutive speed samples. First
// sample has no previous point, so decel = 0. Non-positive/duplicate
// timestamps also yield 0 (avoids division by zero).
function decelerations(samples: CarData[]): number[] {
  const decel = [0];
  for (let i = 1; i < samples.length; i++) {
    const dtS = (Date.parse(samples[i].date) - Date.parse(samples[i - 1].date)) / 1000;
    if (dtS <= 0) {
      decel.push(0);
      continue;
    }
    const dvMs = (samples[i].speed - samples[i - 1].speed) * KMH_TO_MS;
    decel.push(Math.max(0, -dvMs / dtS));
  }
  return decel;
}

// Brake PRESSURE is not published by OpenF1 (car_data.brake is binary
// 0/100). This ESTIMATES relative intensity: 100% = the hardest braking
// event of this same lap — self-calibrated, since no external absolute
// reference exists for "100% pressure" (unlike batteryModel's regulatory
// deploy/capacity constants; see spec fase-e-brake-pressure.md §5). Gated
// by the real binary signal: only samples where brake > 0 get a nonzero
// estimate.
export function estimateBrakePressure(samples: CarData[]): BrakePressurePoint[] {
  if (samples.length === 0) return [];

  const decel = decelerations(samples);
  let peakDecel = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].brake > 0 && decel[i] > peakDecel) peakDecel = decel[i];
  }

  return samples.map((sample, i) => ({
    date: sample.date,
    pressurePct: sample.brake > 0 && peakDecel > 0 ? Math.min(100, (decel[i] / peakDecel) * 100) : 0,
  }));
}
