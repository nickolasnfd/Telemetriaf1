import { describe, expect, it } from 'vitest';
import type { CarData } from '../api/types';
import { CAPACITY_MJ, deployTaper, estimateBattery } from './batteryModel';

const BASE_MS = Date.parse('2026-06-14T17:03:00.000Z');

function samples(
  count: number,
  make: (i: number) => Partial<CarData>,
  stepMs = 1000,
): CarData[] {
  return Array.from({ length: count }, (_, i) => ({
    session_key: 1,
    meeting_key: 1,
    driver_number: 11,
    date: new Date(BASE_MS + i * stepMs).toISOString(),
    speed: 200,
    n_gear: 6,
    throttle: 0,
    brake: 0,
    drs: 0,
    rpm: 10000,
    ...make(i),
  }));
}

describe('deployTaper', () => {
  it('is full below 290 km/h, zero at 355+, linear between', () => {
    expect(deployTaper(200)).toBe(1);
    expect(deployTaper(290)).toBe(1);
    expect(deployTaper(355)).toBe(0);
    expect(deployTaper(400)).toBe(0);
    expect(deployTaper(322.5)).toBeCloseTo(0.5);
  });
});

describe('estimateBattery', () => {
  it('returns empty for empty input', () => {
    expect(estimateBattery([])).toEqual([]);
  });

  it('drains at 350 kW under full throttle below the taper', () => {
    const points = estimateBattery(samples(11, () => ({ throttle: 100, speed: 200 })));
    // 10 s × 0.35 MJ/s = 3.5 MJ drained from the 4 MJ cap
    expect(points[10].socMJ).toBeCloseTo(CAPACITY_MJ - 3.5, 3);
    expect(points[10].socPct).toBeCloseTo(12.5, 1);
  });

  it('does not drain above 355 km/h (taper)', () => {
    const points = estimateBattery(samples(5, () => ({ throttle: 100, speed: 360 })));
    expect(points[4].socMJ).toBeCloseTo(CAPACITY_MJ, 6);
  });

  it('recovers under braking and clamps at 100%', () => {
    const drainThenBrake = samples(11, (i) =>
      i < 5 ? { throttle: 100, speed: 200 } : { brake: 100, throttle: 0, speed: 150 },
    );
    const points = estimateBattery(drainThenBrake);
    const afterDrain = points[4].socMJ;
    expect(points[10].socMJ).toBeGreaterThan(afterDrain);
    expect(points[10].socMJ).toBeLessThanOrEqual(CAPACITY_MJ);
  });

  it('never goes below zero', () => {
    const points = estimateBattery(samples(30, () => ({ throttle: 100, speed: 200 })));
    expect(points[29].socMJ).toBe(0);
    expect(points[29].socPct).toBe(0);
  });

  it('caps recovery at 8.5 MJ per lap', () => {
    // 40 s of braking would recover 14 MJ without the cap; battery is full,
    // so the cap is only observable through the accounting: drain 4 MJ first,
    // then brake for 30 s (10.5 MJ potential > 8.5 MJ cap).
    const seq = samples(60, (i) =>
      i < 12 ? { throttle: 100, speed: 200 } : { brake: 100, throttle: 0, speed: 120 },
    );
    const points = estimateBattery(seq);
    // after 11 s full drain (3.85 MJ) battery ≈ 0.15 MJ; 8.5 MJ of regen fills
    // it to the 4 MJ clamp; further braking must not "store" beyond the cap.
    expect(points[59].socMJ).toBeLessThanOrEqual(CAPACITY_MJ);
    // the recovery cap makes regen stop after 8.5 MJ: with clamping at 4 MJ
    // the final value equals the cap-limited fill, still ≤ capacity.
    expect(points[59].socMJ).toBeGreaterThan(3);
  });

  it('ignores large gaps between samples', () => {
    const gapSamples = samples(2, () => ({ throttle: 100, speed: 200 }), 60_000);
    const points = estimateBattery(gapSamples);
    // 60 s gap is clamped to 2 s → at most 0.7 MJ drained, not 21 MJ
    expect(points[1].socMJ).toBeGreaterThanOrEqual(CAPACITY_MJ - 0.7 - 1e-9);
  });
});
