import { describe, expect, it } from 'vitest';
import { buildAxisTooltipLines, nearestPointValue } from './tooltip';

const sil = { name_acronym: 'SIL', team_colour: '3671C6' };
const cos = { name_acronym: 'COS', team_colour: 'E06D10' };

describe('nearestPointValue', () => {
  const data: Array<[number, number]> = [
    [0, 10],
    [1, 20],
    [2, 30],
    [5, 60],
  ];

  it('finds the exact match', () => {
    expect(nearestPointValue(data, 1)).toBe(20);
  });

  it('finds the nearest neighbor between points', () => {
    expect(nearestPointValue(data, 1.9)).toBe(30);
    expect(nearestPointValue(data, 1.1)).toBe(20);
  });

  it('clamps at the edges within the gap tolerance', () => {
    expect(nearestPointValue(data, -0.5)).toBe(10);
    expect(nearestPointValue(data, 5.5, 1)).toBe(60);
  });

  it('returns null beyond the max gap', () => {
    expect(nearestPointValue(data, 3.6, 1)).toBeNull(); // 1.6s from x=2, 1.4s from x=5... within default but not maxGapS=1
    expect(nearestPointValue(data, 10, 1.5)).toBeNull();
  });

  it('returns null for empty data', () => {
    expect(nearestPointValue([], 1)).toBeNull();
  });
});

describe('buildAxisTooltipLines', () => {
  it('looks up each trace independently by axis value, ignoring ECharts params entirely', () => {
    const lines = buildAxisTooltipLines(
      41.1,
      [
        { driver: sil, data: [[40, 100], [41, 280], [42, 290]] },
        { driver: cos, data: [[40, 90], [41.05, 245], [42, 250]] },
      ],
      (v) => `${v} km/h`,
    );
    expect(lines[0]).toContain('SIL: 280 km/h');
    expect(lines[1]).toContain('COS: 245 km/h');
  });

  it('reports "sem dado" only when the nearest sample is genuinely far away', () => {
    const lines = buildAxisTooltipLines(
      100,
      [
        { driver: sil, data: [[87.7, 295], [88, 290]] }, // SIL's lap ends at 88s
        { driver: cos, data: [[99.8, 265], [100.1, 260]] }, // COS still running at 100s
      ],
      (v) => `${v} km/h`,
    );
    expect(lines[0]).toContain('SIL: sem dado neste ponto');
    expect(lines[1]).not.toContain('sem dado');
    expect(lines[1]).toContain('260 km/h');
  });

  it('never claims "sem dado" when a close point actually exists', () => {
    const lines = buildAxisTooltipLines(
      41.1,
      [{ driver: cos, data: [[41.05, 245]] }],
      (v) => `${v} km/h`,
    );
    expect(lines[0]).toContain('245 km/h');
    expect(lines[0]).not.toContain('sem dado');
  });
});
