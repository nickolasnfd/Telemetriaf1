import { describe, expect, it } from 'vitest';
import { colorSegments, cornerSegments, sectorSegments } from './trackColoring';
import type { Corner } from './corners';
import type { DeltaPoint } from './delta';
import type { SectorBoundary } from './sectors';
import type { TrackPoint } from './trackMap';

describe('sectorSegments', () => {
  it('builds 3 segments from sector boundaries, closing the last at maxM', () => {
    const boundaries: SectorBoundary[] = [
      { sector: 1, distanceM: 0 },
      { sector: 2, distanceM: 40 },
      { sector: 3, distanceM: 70 },
    ];
    expect(sectorSegments(boundaries, 100)).toEqual([
      { startM: 0, endM: 40 },
      { startM: 40, endM: 70 },
      { startM: 70, endM: 100 },
    ]);
  });

  it('returns empty when there are no sector boundaries', () => {
    expect(sectorSegments([], 100)).toEqual([]);
  });
});

describe('cornerSegments', () => {
  it('builds segments between start/corners/end', () => {
    const corners: Corner[] = [
      { index: 1, distanceM: 30 },
      { index: 2, distanceM: 60 },
    ];
    expect(cornerSegments(corners, 100)).toEqual([
      { startM: 0, endM: 30 },
      { startM: 30, endM: 60 },
      { startM: 60, endM: 100 },
    ]);
  });

  it('falls back to a single whole-lap segment when no corners are detected', () => {
    expect(cornerSegments([], 100)).toEqual([{ startM: 0, endM: 100 }]);
  });
});

describe('colorSegments', () => {
  const points: TrackPoint[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 0 },
  ];
  const distances = [0, 25, 50, 75, 100];
  const boundaries = [
    { startM: 0, endM: 50 },
    { startM: 50, endM: 100 },
  ];

  it('assigns each segment to the driver who gained time in it', () => {
    // B loses 5s in [0,50] (A faster there), then gains 3s back in [50,100] (B faster there).
    const delta: DeltaPoint[] = [
      { distanceM: 0, deltaS: 0 },
      { distanceM: 50, deltaS: -5 },
      { distanceM: 100, deltaS: -2 },
    ];
    const result = colorSegments(points, distances, boundaries, delta);
    expect(result).toEqual([
      { path: 'M 0 0 L 1 0 L 2 0', faster: 1 },
      { path: 'M 2 0 L 3 0 L 4 0', faster: 0 },
    ]);
  });

  it('marks a segment as neutral (null) when the time gain is below the tie threshold', () => {
    const delta: DeltaPoint[] = [
      { distanceM: 0, deltaS: 0 },
      { distanceM: 50, deltaS: 0.01 },
      { distanceM: 100, deltaS: 0.02 },
    ];
    const result = colorSegments(points, distances, boundaries, delta);
    expect(result.every((s) => s.faster === null)).toBe(true);
  });

  it('skips segments with fewer than 2 points in range instead of emitting a broken path', () => {
    const outOfRange = [{ startM: 200, endM: 300 }];
    const delta: DeltaPoint[] = [{ distanceM: 0, deltaS: 0 }];
    expect(colorSegments(points, distances, outOfRange, delta)).toEqual([]);
  });
});
