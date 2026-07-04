import { describe, expect, it } from 'vitest';
import type { CarData } from '../api/types';
import { computeDelta } from './delta';

function sample(dateIso: string, speed: number): CarData {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: 1,
    date: dateIso,
    speed,
    n_gear: 6,
    throttle: 100,
    brake: 0,
    drs: 0,
    rpm: 10000,
  };
}

describe('computeDelta', () => {
  it('returns an empty result without throwing for empty samples', () => {
    expect(computeDelta([], [])).toEqual({ points: [], confidence: 'low' });
    const some = [sample('2026-06-14T17:00:00.000Z', 100)];
    expect(computeDelta(some, [])).toEqual({ points: [], confidence: 'low' });
    expect(computeDelta([], some)).toEqual({ points: [], confidence: 'low' });
  });

  it('returns ~zero delta and high confidence for identical laps', () => {
    const samples = [
      sample('2026-06-14T17:00:00.000Z', 100),
      sample('2026-06-14T17:00:50.000Z', 100),
      sample('2026-06-14T17:01:40.000Z', 100),
    ];
    const result = computeDelta(samples, [...samples]);
    expect(result.confidence).toBe('high');
    expect(result.points.length).toBeGreaterThan(0);
    for (const p of result.points) {
      expect(p.deltaS).toBeCloseTo(0, 1);
    }
  });

  it('gives a negative delta when the second driver (B) is faster than the reference (A)', () => {
    const samplesA = [
      sample('2026-06-14T17:00:00.000Z', 100),
      sample('2026-06-14T17:01:40.000Z', 100), // 100s @ 100km/h
    ];
    const samplesB = [
      sample('2026-06-14T17:00:00.000Z', 110),
      sample('2026-06-14T17:01:40.000Z', 110), // 100s @ 110km/h -> travels further
    ];
    const result = computeDelta(samplesA, samplesB);
    expect(result.points.length).toBeGreaterThan(0);
    const last = result.points[result.points.length - 1];
    expect(last.deltaS).toBeLessThan(0);
    for (const p of result.points) {
      expect(p.deltaS).toBeLessThanOrEqual(0.001);
    }
  });

  it('marks low confidence when total lap distances differ a lot', () => {
    const samplesA = [
      sample('2026-06-14T17:00:00.000Z', 100),
      sample('2026-06-14T17:01:40.000Z', 100), // ~2778m in 100s
    ];
    const samplesB = [
      sample('2026-06-14T17:00:00.000Z', 200),
      sample('2026-06-14T17:01:40.000Z', 200), // ~5556m in 100s
    ];
    const result = computeDelta(samplesA, samplesB);
    expect(result.confidence).toBe('low');
  });

  it('cuts the grid at the shorter of the two total distances', () => {
    const samplesA = [
      sample('2026-06-14T17:00:00.000Z', 100),
      sample('2026-06-14T17:01:40.000Z', 100), // ~2778m
    ];
    const samplesB = [
      sample('2026-06-14T17:00:00.000Z', 50),
      sample('2026-06-14T17:01:40.000Z', 50), // ~1389m
    ];
    const result = computeDelta(samplesA, samplesB);
    const maxDistance = result.points[result.points.length - 1].distanceM;
    expect(maxDistance).toBeLessThanOrEqual(1389);
  });
});
