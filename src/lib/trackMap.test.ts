import { describe, expect, it } from 'vitest';
import { attachDistances, buildTrackPath, normalizeTrackPoints, pointAtDistance } from './trackMap';
import type { CarData, Location } from '../api/types';

const START = Date.parse('2026-01-01T00:00:00.000Z');

function loc(x: number, y: number, atS = 0): Location {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: 11,
    date: new Date(START + atS * 1000).toISOString(),
    x,
    y,
    z: 0,
  };
}

function car(atS: number, speedKmh: number): CarData {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: 11,
    date: new Date(START + atS * 1000).toISOString(),
    speed: speedKmh,
    n_gear: 4,
    throttle: 100,
    brake: 0,
    drs: 0,
    rpm: 10000,
  };
}

describe('normalizeTrackPoints', () => {
  it('maps a known square into the viewBox, flipping Y and preserving proportion', () => {
    const square = [loc(0, 0), loc(100, 0), loc(100, 100), loc(0, 100)];
    expect(normalizeTrackPoints(square)).toEqual([
      { x: 40, y: 960 },
      { x: 960, y: 960 },
      { x: 960, y: 40 },
      { x: 40, y: 40 },
    ]);
  });

  it('returns empty for fewer than 2 points', () => {
    expect(normalizeTrackPoints([])).toEqual([]);
    expect(normalizeTrackPoints([loc(0, 0)])).toEqual([]);
  });

  it('returns empty when all points coincide (degenerate bounding box)', () => {
    expect(normalizeTrackPoints([loc(5, 5), loc(5, 5), loc(5, 5)])).toEqual([]);
  });
});

describe('buildTrackPath', () => {
  it('builds a closed polyline path for a known square', () => {
    const square = [loc(0, 0), loc(100, 0), loc(100, 100), loc(0, 100)];
    const result = buildTrackPath(square);
    expect(result.path).toBe('M 40 960 L 960 960 L 960 40 L 40 40 Z');
    expect(result.viewBox).toBe('0 0 1000 1000');
  });

  it('returns an empty path (but valid viewBox) for degenerate input', () => {
    const result = buildTrackPath([loc(1, 1)]);
    expect(result.path).toBe('');
    expect(result.viewBox).toBe('0 0 1000 1000');
  });
});

describe('attachDistances', () => {
  // Constant 100 km/h => 27.7778 m/s => distance grows linearly with time.
  const carSamples = [car(0, 100), car(1, 100), car(2, 100), car(3, 100), car(4, 100)];

  it('interpolates distance linearly for a constant-speed profile', () => {
    const locationSamples = [loc(0, 0, 0.5), loc(0, 0, 2.5)];
    const result = attachDistances(locationSamples, carSamples);
    expect(result[0]).toBeCloseTo(13.889, 2);
    expect(result[1]).toBeCloseTo(69.444, 2);
  });

  it('clamps out-of-window samples to the first/last distance instead of extrapolating', () => {
    const locationSamples = [loc(0, 0, -5), loc(0, 0, 50)];
    const result = attachDistances(locationSamples, carSamples);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeCloseTo(111.111, 2);
  });

  it('returns empty for empty inputs, without throwing', () => {
    expect(attachDistances([], carSamples)).toEqual([]);
    expect(attachDistances([loc(0, 0)], [])).toEqual([]);
  });
});

describe('pointAtDistance', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ];
  const distances = [0, 25, 50, 75];

  it('returns the point at the exact matching distance', () => {
    expect(pointAtDistance(points, distances, 50)).toEqual({ x: 2, y: 0 });
  });

  it('picks the nearest sample for an in-between distance', () => {
    expect(pointAtDistance(points, distances, 60)).toEqual({ x: 2, y: 0 }); // closer to 50 than 75
  });

  it('clamps to the nearest end for out-of-range distances', () => {
    expect(pointAtDistance(points, distances, -10)).toEqual({ x: 0, y: 0 });
    expect(pointAtDistance(points, distances, 1000)).toEqual({ x: 3, y: 0 });
  });

  it('returns the origin for empty input, without throwing', () => {
    expect(pointAtDistance([], [], 10)).toEqual({ x: 0, y: 0 });
  });
});
