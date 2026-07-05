import { describe, expect, it } from 'vitest';
import type { CarData } from '../api/types';
import type { Corner } from './corners';
import type { DeltaPoint } from './delta';
import { sectorTimeDeltas, segmentInsights } from './insights';

function car(speed: number): CarData {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: 1,
    date: '2026-06-14T17:00:00.000Z',
    speed,
    n_gear: 6,
    throttle: 100,
    brake: 0,
    drs: 0,
    rpm: 10000,
  };
}

describe('sectorTimeDeltas', () => {
  it('computes timeB - timeA per sector', () => {
    const lapA = { duration_sector_1: 28.1, duration_sector_2: 35.7, duration_sector_3: 24.5 };
    const lapB = { duration_sector_1: 28.0, duration_sector_2: 35.75, duration_sector_3: 24.6 };
    expect(sectorTimeDeltas(lapA, lapB)).toEqual([
      { sector: 1, deltaS: -0.1 },
      { sector: 2, deltaS: 0.05 },
      { sector: 3, deltaS: 0.1 },
    ]);
  });

  it('returns empty when any sector duration is missing', () => {
    const lapA = { duration_sector_1: 28.1, duration_sector_2: null, duration_sector_3: 24.5 };
    const lapB = { duration_sector_1: 28.0, duration_sector_2: 35.75, duration_sector_3: 24.6 };
    expect(sectorTimeDeltas(lapA, lapB)).toEqual([]);
  });
});

// Single segment [0, 1000], B "loses time" (delta rises) or "gains" (falls).
function singleSegmentDelta(endDelta: number): DeltaPoint[] {
  return [
    { distanceM: 0, deltaS: 0 },
    { distanceM: 1000, deltaS: endDelta },
  ];
}
const midSamples = [car(0), car(0)];
const midDistances = [400, 600];

describe('segmentInsights — phrase rule table', () => {
  it('B loses time with clearly lower top speed → straight/power phrase', () => {
    const [insight] = segmentInsights(
      singleSegmentDelta(0.1),
      [],
      'COS',
      [car(300)],
      [500],
      [car(290)],
      [500],
    );
    expect(insight.deltaS).toBe(0.1);
    expect(insight.phrase).toBe('COS perde tempo com menor velocidade máxima neste trecho');
  });

  it('B loses time with similar top speed → braking/traction phrase (hedged)', () => {
    const [insight] = segmentInsights(
      singleSegmentDelta(0.1),
      [],
      'COS',
      [car(300)],
      [500],
      [car(300)],
      [500],
    );
    expect(insight.phrase).toContain('perde tempo apesar de velocidade máxima parecida');
    expect(insight.phrase).toContain('provável');
  });

  it('B gains time with clearly higher top speed → speed-advantage phrase', () => {
    const [insight] = segmentInsights(
      singleSegmentDelta(-0.1),
      [],
      'COS',
      [car(300)],
      [500],
      [car(310)],
      [500],
    );
    expect(insight.deltaS).toBe(-0.1);
    expect(insight.phrase).toBe('COS ganha tempo com maior velocidade máxima neste trecho');
  });

  it('B gains time without speed advantage → technical phrase (hedged)', () => {
    const [insight] = segmentInsights(
      singleSegmentDelta(-0.1),
      [],
      'COS',
      [car(300)],
      [500],
      [car(300)],
      [500],
    );
    expect(insight.phrase).toContain('melhor no técnico');
    expect(insight.phrase).toContain('provável');
  });
});

describe('segmentInsights — segmentation, filtering, ranking', () => {
  it('returns empty for empty delta', () => {
    expect(segmentInsights([], [], 'COS', [], [], [], [])).toEqual([]);
  });

  it('filters segments below the relevance threshold and ranks by |deltaS|', () => {
    // Cumulative delta at 0/100/200/300/400 → segment gains 0.05/0.30/0.10/0.01
    const delta: DeltaPoint[] = [
      { distanceM: 0, deltaS: 0 },
      { distanceM: 100, deltaS: 0.05 },
      { distanceM: 200, deltaS: 0.35 },
      { distanceM: 300, deltaS: 0.45 },
      { distanceM: 400, deltaS: 0.46 },
    ];
    const corners: Corner[] = [
      { index: 1, distanceM: 100 },
      { index: 2, distanceM: 200 },
      { index: 3, distanceM: 300 },
    ];
    const result = segmentInsights(delta, corners, 'COS', midSamples, midDistances, midSamples, midDistances);
    // 0.01 segment (T3 → Final) filtered out; rest sorted by |deltaS| desc
    expect(result.map((r) => r.label)).toEqual(['T1 → T2', 'T2 → T3', 'Largada → T1']);
    expect(result.map((r) => r.deltaS)).toEqual([0.3, 0.1, 0.05]);
  });

  it('caps the list at 6 segments', () => {
    const delta: DeltaPoint[] = [{ distanceM: 0, deltaS: 0 }];
    const corners: Corner[] = [];
    for (let i = 1; i <= 9; i++) {
      delta.push({ distanceM: i * 100, deltaS: i * 0.1 }); // each segment gains 0.1
      if (i < 9) corners.push({ index: i, distanceM: i * 100 });
    }
    const result = segmentInsights(delta, corners, 'COS', midSamples, midDistances, midSamples, midDistances);
    expect(result.length).toBe(6);
  });
});
