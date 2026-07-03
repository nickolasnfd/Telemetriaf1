import { describe, expect, it } from 'vitest';
import { parseState, serializeState, type AppState } from './urlState';

describe('parseState', () => {
  it('restores the full state from a query string', () => {
    const state = parseState('?year=2026&meeting=9901&session=99011&drivers=11,27&lap=5&view=telemetry');
    expect(state).toEqual({
      year: 2026,
      meeting: 9901,
      session: 99011,
      drivers: [11, 27],
      lap: 5,
      view: 'telemetry',
    });
  });

  it('falls back to defaults on missing or invalid params', () => {
    expect(parseState('')).toEqual({
      year: null,
      meeting: null,
      session: null,
      drivers: [],
      lap: null,
      view: 'laps',
    });
    const garbage = parseState('?year=abc&drivers=x,-2,44&view=banana&lap=0');
    expect(garbage.year).toBeNull();
    expect(garbage.drivers).toEqual([44]);
    expect(garbage.view).toBe('laps');
    expect(garbage.lap).toBeNull();
  });

  it('keeps at most 2 drivers', () => {
    expect(parseState('?drivers=1,2,3,4').drivers).toEqual([1, 2]);
  });
});

describe('serializeState', () => {
  const state: AppState = {
    year: 2026,
    meeting: 9901,
    session: 99011,
    drivers: [11, 27],
    lap: 5,
    view: 'telemetry',
  };

  it('round-trips through parseState', () => {
    expect(parseState(`?${serializeState(state, '')}`)).toEqual(state);
  });

  it('preserves unrelated params like ?mock=1', () => {
    const query = serializeState(state, '?mock=1');
    expect(query).toContain('mock=1');
  });

  it('omits defaults to keep the URL short', () => {
    const empty: AppState = { year: null, meeting: null, session: null, drivers: [], lap: null, view: 'laps' };
    expect(serializeState(empty, '')).toBe('');
  });
});
