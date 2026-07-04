import { describe, expect, it } from 'vitest';
import type { CarData } from '../api/types';
import { cumulativeDistance } from './distance';

function sample(dateIso: string, speed: number): CarData {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: 11,
    date: dateIso,
    speed,
    n_gear: 6,
    throttle: 100,
    brake: 0,
    drs: 0,
    rpm: 10000,
  };
}

describe('cumulativeDistance', () => {
  it('returns an empty array for empty input', () => {
    expect(cumulativeDistance([])).toEqual([]);
  });

  it('returns [0] for a single sample', () => {
    expect(cumulativeDistance([sample('2026-06-14T17:03:00.000Z', 200)])).toEqual([0]);
  });

  it('integrates constant speed correctly (100 km/h for 36s = 1000m)', () => {
    const samples = [
      sample('2026-06-14T17:03:00.000Z', 100),
      sample('2026-06-14T17:03:36.000Z', 100),
    ];
    const distances = cumulativeDistance(samples);
    expect(distances[0]).toBe(0);
    expect(distances[1]).toBeCloseTo(1000, 0);
  });

  it('is monotonically non-decreasing and index-aligned with input length', () => {
    const samples = [
      sample('2026-06-14T17:03:00.000Z', 0),
      sample('2026-06-14T17:03:01.000Z', 50),
      sample('2026-06-14T17:03:02.000Z', 300),
      sample('2026-06-14T17:03:03.000Z', 100),
    ];
    const distances = cumulativeDistance(samples);
    expect(distances).toHaveLength(samples.length);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
    }
  });

  it('accounts for irregular sample gaps via trapezoidal averaging', () => {
    // 10s at 100km/h then 1s at 200km/h: distance should reflect the
    // trapezoid between 100 and 200, not just the latest speed.
    const samples = [
      sample('2026-06-14T17:03:00.000Z', 100),
      sample('2026-06-14T17:03:10.000Z', 100),
      sample('2026-06-14T17:03:11.000Z', 200),
    ];
    const distances = cumulativeDistance(samples);
    expect(distances[1]).toBeCloseTo((100 * 1000) / 3600 * 10, 0);
    const lastLegDistance = distances[2] - distances[1];
    expect(lastLegDistance).toBeCloseTo(((100 + 200) / 2 * 1000) / 3600 * 1, 1);
  });
});
