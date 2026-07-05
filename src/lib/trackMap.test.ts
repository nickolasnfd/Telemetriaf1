import { describe, expect, it } from 'vitest';
import { buildTrackPath, normalizeTrackPoints } from './trackMap';
import type { Location } from '../api/types';

function loc(x: number, y: number): Location {
  return { session_key: 1, meeting_key: 1, driver_number: 11, date: '2026-01-01T00:00:00.000Z', x, y, z: 0 };
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
