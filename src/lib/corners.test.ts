import { describe, expect, it } from 'vitest';
import { detectCorners, type CornerPoint } from './corners';

function buildProfile(
  lengthM: number,
  dips: Array<{ center: number; depth: number; width: number }>,
  base = 300,
  noise: (d: number) => number = () => 0,
): CornerPoint[] {
  const points: CornerPoint[] = [];
  for (let d = 0; d < lengthM; d++) {
    let speed = base + noise(d);
    for (const dip of dips) {
      speed -= dip.depth * Math.exp(-((d - dip.center) ** 2) / (2 * dip.width ** 2));
    }
    points.push({ distanceM: d, speed });
  }
  return points;
}

describe('detectCorners', () => {
  it('returns no corners for a flat speed profile', () => {
    expect(detectCorners(buildProfile(1000, []))).toEqual([]);
  });

  it('returns no corners for fewer than 3 points', () => {
    expect(detectCorners([{ distanceM: 0, speed: 100 }])).toEqual([]);
  });

  it('detects a single prominent corner near its center', () => {
    const corners = detectCorners(buildProfile(1000, [{ center: 500, depth: 150, width: 20 }]));
    expect(corners).toHaveLength(1);
    expect(corners[0].index).toBe(1);
    expect(corners[0].distanceM).toBeGreaterThan(480);
    expect(corners[0].distanceM).toBeLessThan(520);
  });

  it('detects multiple well-separated corners in distance order', () => {
    const corners = detectCorners(
      buildProfile(2000, [
        { center: 300, depth: 150, width: 20 },
        { center: 900, depth: 200, width: 20 },
        { center: 1600, depth: 100, width: 20 },
      ]),
    );
    expect(corners.map((c) => c.index)).toEqual([1, 2, 3]);
    expect(corners[0].distanceM).toBeCloseTo(300, -1);
    expect(corners[1].distanceM).toBeCloseTo(900, -1);
    expect(corners[2].distanceM).toBeCloseTo(1600, -1);
  });

  it('ignores small noise wiggles below the prominence threshold', () => {
    const corners = detectCorners(
      buildProfile(1000, [{ center: 500, depth: 5, width: 10 }]), // only 5 km/h dip
    );
    expect(corners).toEqual([]);
  });

  it('merges two minima that are closer than minSpacingM into one corner', () => {
    // A double-dip within 30m of each other (noisy bottom of the same corner).
    const corners = detectCorners(
      buildProfile(1000, [
        { center: 495, depth: 150, width: 8 },
        { center: 510, depth: 145, width: 8 },
      ]),
    );
    expect(corners).toHaveLength(1);
  });

  it('respects custom thresholds', () => {
    const points = buildProfile(1000, [{ center: 500, depth: 20, width: 15 }]);
    expect(detectCorners(points, { minProminenceKmh: 30 })).toEqual([]);
    expect(detectCorners(points, { minProminenceKmh: 10 })).toHaveLength(1);
  });
});
