import { describe, expect, it } from 'vitest';
import { buildAxisTooltipLines } from './tooltip';

const sil = { name_acronym: 'SIL', team_colour: '3671C6' };
const cos = { name_acronym: 'COS', team_colour: 'E06D10' };

describe('buildAxisTooltipLines', () => {
  it('lists every param normally when both drivers have data', () => {
    const lines = buildAxisTooltipLines(
      [
        { seriesName: 'SIL', marker: '●', value: [10, 300] },
        { seriesName: 'COS', marker: '●', value: [10, 280] },
      ],
      [{ driver: sil }, { driver: cos }],
      (v) => `${v} km/h`,
    );
    expect(lines).toEqual(['● SIL: 300 km/h', '● COS: 280 km/h']);
  });

  it('adds an explicit "sem dado" line for a driver missing from params', () => {
    const lines = buildAxisTooltipLines(
      [{ seriesName: 'COS', marker: '●', value: [10, 280] }],
      [{ driver: sil }, { driver: cos }],
      (v) => `${v} km/h`,
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('● COS: 280 km/h');
    expect(lines[1]).toContain('SIL: sem dado neste ponto');
    expect(lines[1]).toContain('background:#3671C6');
  });

  it('returns only the "sem dado" lines when no params match', () => {
    const lines = buildAxisTooltipLines([], [{ driver: sil }, { driver: cos }], (v) => `${v}`);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('SIL: sem dado');
    expect(lines[1]).toContain('COS: sem dado');
  });

  it('is a no-op when every param has a matching trace', () => {
    const lines = buildAxisTooltipLines(
      [{ seriesName: 'SIL', marker: '●', value: [10, 300] }],
      [{ driver: sil }],
      (v) => `${v}`,
    );
    expect(lines).toEqual(['● SIL: 300']);
  });
});
