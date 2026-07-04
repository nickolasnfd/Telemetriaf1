import { describe, expect, it } from 'vitest';
import { sectorBoundaries } from './sectors';

const LAP_START_MS = Date.parse('2026-06-14T17:03:00.000Z');

// 91 samples, 1s apart, 10m apart (constant "speed") — easy math to verify.
function buildSamples() {
  const sampleDatesMs = Array.from({ length: 91 }, (_, i) => LAP_START_MS + i * 1000);
  const distances = Array.from({ length: 91 }, (_, i) => i * 10);
  return { sampleDatesMs, distances };
}

describe('sectorBoundaries', () => {
  it('places S1 at distance 0 and S2/S3 at the nearest sample to each sector end', () => {
    const { sampleDatesMs, distances } = buildSamples();
    const lap = {
      date_start: new Date(LAP_START_MS).toISOString(),
      duration_sector_1: 30,
      duration_sector_2: 30,
      duration_sector_3: 30,
    };
    const boundaries = sectorBoundaries(lap, sampleDatesMs, distances);
    expect(boundaries).toEqual([
      { sector: 1, distanceM: 0 },
      { sector: 2, distanceM: 300 },
      { sector: 3, distanceM: 600 },
    ]);
  });

  it('snaps to the nearest sample when the boundary falls between samples', () => {
    const { sampleDatesMs, distances } = buildSamples();
    const lap = {
      date_start: new Date(LAP_START_MS).toISOString(),
      duration_sector_1: 30.4, // closer to sample at 30s than 31s
      duration_sector_2: 29.4, // sector2 ends at 59.8s, closer to sample at 60s
      duration_sector_3: 30,
    };
    const boundaries = sectorBoundaries(lap, sampleDatesMs, distances);
    expect(boundaries[1].distanceM).toBe(300);
    expect(boundaries[2].distanceM).toBe(600);
  });

  it('returns empty when sector durations are missing', () => {
    const { sampleDatesMs, distances } = buildSamples();
    const lap = {
      date_start: new Date(LAP_START_MS).toISOString(),
      duration_sector_1: null,
      duration_sector_2: 30,
      duration_sector_3: 30,
    };
    expect(sectorBoundaries(lap, sampleDatesMs, distances)).toEqual([]);
  });

  it('returns empty when date_start is missing', () => {
    const { sampleDatesMs, distances } = buildSamples();
    const lap = {
      date_start: null,
      duration_sector_1: 30,
      duration_sector_2: 30,
      duration_sector_3: 30,
    };
    expect(sectorBoundaries(lap, sampleDatesMs, distances)).toEqual([]);
  });

  it('returns empty when there are no samples', () => {
    const lap = {
      date_start: new Date(LAP_START_MS).toISOString(),
      duration_sector_1: 30,
      duration_sector_2: 30,
      duration_sector_3: 30,
    };
    expect(sectorBoundaries(lap, [], [])).toEqual([]);
  });
});
