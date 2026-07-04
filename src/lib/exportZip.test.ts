import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildExportZip } from './exportZip';

describe('buildExportZip', () => {
  it('produces a valid zip with one JSON file per key', () => {
    const bytes = buildExportZip({
      session: { session_key: 1, session_name: 'Race' },
      laps: [{ lap_number: 1 }, { lap_number: 2 }],
    });
    const unzipped = unzipSync(bytes);
    expect(Object.keys(unzipped).sort()).toEqual(['laps.json', 'session.json']);
    expect(JSON.parse(strFromU8(unzipped['session.json']))).toEqual({
      session_key: 1,
      session_name: 'Race',
    });
    expect(JSON.parse(strFromU8(unzipped['laps.json']))).toEqual([
      { lap_number: 1 },
      { lap_number: 2 },
    ]);
  });

  it('produces an empty zip for no files', () => {
    const bytes = buildExportZip({});
    expect(Object.keys(unzipSync(bytes))).toHaveLength(0);
  });

  it('handles null/empty payloads without throwing', () => {
    const bytes = buildExportZip({ pits: [], weather: null });
    const unzipped = unzipSync(bytes);
    expect(JSON.parse(strFromU8(unzipped['pits.json']))).toEqual([]);
    expect(JSON.parse(strFromU8(unzipped['weather.json']))).toBeNull();
  });
});
