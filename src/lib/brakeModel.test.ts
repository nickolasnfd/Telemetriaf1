import { describe, expect, it } from 'vitest';
import type { CarData } from '../api/types';
import { estimateBrakePressure } from './brakeModel';

const BASE_MS = Date.parse('2026-06-14T17:03:00.000Z');

function samples(count: number, make: (i: number) => Partial<CarData>, stepMs = 1000): CarData[] {
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

describe('estimateBrakePressure', () => {
  it('returns empty for empty input', () => {
    expect(estimateBrakePressure([])).toEqual([]);
  });

  it('is 0% at the first sample and whenever brake is off', () => {
    const points = estimateBrakePressure(
      samples(3, (i) => (i === 1 ? { speed: 150, brake: 100 } : { speed: 300, brake: 0 })),
    );
    expect(points[0].pressurePct).toBe(0);
    expect(points[2].pressurePct).toBe(0);
  });

  it('scales relative to the hardest braking event of the lap (100% at the peak)', () => {
    // speeds: 300 -(brake, -20)-> 280 -(brake, -80)-> 200 -(no brake, 0)-> 200 -(brake, -50)-> 150
    const speeds = [300, 280, 200, 200, 150];
    const brakes = [0, 100, 100, 0, 100];
    const points = estimateBrakePressure(
      samples(5, (i) => ({ speed: speeds[i], brake: brakes[i] })),
    );
    expect(points[1].pressurePct).toBeCloseTo(25, 5); // 5.556 / 22.222
    expect(points[2].pressurePct).toBe(100); // peak: 22.222 m/s²
    expect(points[3].pressurePct).toBe(0); // brake off, even though speed unchanged anyway
    expect(points[4].pressurePct).toBeCloseTo(62.5, 5); // 13.889 / 22.222
  });

  it('stays at 0% for a lap with no braking at all, without throwing', () => {
    const points = estimateBrakePressure(samples(10, (i) => ({ speed: 300 - i, brake: 0 })));
    expect(points.every((p) => p.pressurePct === 0)).toBe(true);
  });

  it('never exceeds 100% even with irregular sample gaps', () => {
    const points = estimateBrakePressure(
      samples(4, (i) => (i === 2 ? { speed: 100, brake: 100 } : { speed: 300, brake: 100 }), 500),
    );
    for (const p of points) {
      expect(p.pressurePct).toBeLessThanOrEqual(100);
      expect(p.pressurePct).toBeGreaterThanOrEqual(0);
    }
  });
});
