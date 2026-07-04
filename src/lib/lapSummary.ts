import type { CarData } from '../api/types';

export interface LapSummary {
  topSpeed: number;
  avgSpeed: number;
  brakingEvents: number;
  fullThrottlePct: number;
}

const EMPTY_SUMMARY: LapSummary = { topSpeed: 0, avgSpeed: 0, brakingEvents: 0, fullThrottlePct: 0 };

// Counts braking EVENTS (off->on transitions), not samples — "6 frenagens"
// means 6 distinct brake applications, robust to the ~3.7 Hz sampling.
function countBrakingEvents(samples: CarData[]): number {
  let events = 0;
  let wasBraking = false;
  for (const sample of samples) {
    const isBraking = sample.brake > 0;
    if (isBraking && !wasBraking) events++;
    wasBraking = isBraking;
  }
  return events;
}

export function summarizeLap(samples: CarData[]): LapSummary {
  if (samples.length === 0) return EMPTY_SUMMARY;
  let speedSum = 0;
  let topSpeed = 0;
  let fullThrottleCount = 0;
  for (const sample of samples) {
    speedSum += sample.speed;
    if (sample.speed > topSpeed) topSpeed = sample.speed;
    if (sample.throttle >= 100) fullThrottleCount++;
  }
  return {
    topSpeed: Math.round(topSpeed),
    avgSpeed: Math.round((speedSum / samples.length) * 10) / 10,
    brakingEvents: countBrakingEvents(samples),
    fullThrottlePct: Math.round((fullThrottleCount / samples.length) * 1000) / 10,
  };
}
