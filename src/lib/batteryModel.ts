import type { CarData } from '../api/types';

// ESTIMATED battery state of charge — F1 publishes no real ERS data.
// 2026 power-unit parameters; sources in specs/battery-estimate.md §5.
export const CAPACITY_MJ = 4; // usable energy-store cap
const DEPLOY_KW = 350; // MGU-K deployment
const REGEN_KW = 350; // MGU-K recovery under braking
const TAPER_START_KMH = 290; // deployment tapers linearly...
const TAPER_END_KMH = 355; // ...down to zero here
const LAP_RECOVERY_CAP_MJ = 8.5; // per-lap recovery limit
const MAX_SAMPLE_GAP_S = 2; // ignore holes in the ~3.7 Hz feed

export interface BatteryPoint {
  date: string;
  socMJ: number;
  socPct: number;
}

export function deployTaper(speedKmh: number): number {
  if (speedKmh <= TAPER_START_KMH) return 1;
  if (speedKmh >= TAPER_END_KMH) return 0;
  return (TAPER_END_KMH - speedKmh) / (TAPER_END_KMH - TAPER_START_KMH);
}

// Integrates deploy/regen power over the lap's samples. Assumption (spec §5):
// the lap starts at 100% charge, so the curve shows dynamics, not the
// (unknowable) absolute level.
export function estimateBattery(samples: CarData[]): BatteryPoint[] {
  if (samples.length === 0) return [];
  let socMJ = CAPACITY_MJ;
  let recoveredMJ = 0;
  let prevMs = Date.parse(samples[0].date);
  const points: BatteryPoint[] = [];

  for (const sample of samples) {
    const ms = Date.parse(sample.date);
    const dt = Math.min(Math.max((ms - prevMs) / 1000, 0), MAX_SAMPLE_GAP_S);
    prevMs = ms;

    const deployMJ = ((DEPLOY_KW * (sample.throttle / 100) * deployTaper(sample.speed)) / 1000) * dt;
    let regenMJ = 0;
    if (sample.brake > 0) {
      regenMJ = Math.max(0, Math.min((REGEN_KW / 1000) * dt, LAP_RECOVERY_CAP_MJ - recoveredMJ));
      recoveredMJ += regenMJ;
    }

    socMJ = Math.min(CAPACITY_MJ, Math.max(0, socMJ - deployMJ + regenMJ));
    points.push({ date: sample.date, socMJ, socPct: (socMJ / CAPACITY_MJ) * 100 });
  }
  return points;
}
