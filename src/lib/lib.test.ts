import { describe, expect, it } from 'vitest';
import { formatLapTime, teamColor } from './format';
import { isDrsOpen, lapDateWindow } from './telemetry';

describe('formatLapTime', () => {
  it('formats seconds as m:ss.mmm', () => {
    expect(formatLapTime(88.123)).toBe('1:28.123');
    expect(formatLapTime(60)).toBe('1:00.000');
    expect(formatLapTime(112.4)).toBe('1:52.400');
  });

  it('returns a dash for missing values', () => {
    expect(formatLapTime(null)).toBe('—');
    expect(formatLapTime(undefined)).toBe('—');
    expect(formatLapTime(0)).toBe('—');
  });
});

describe('lapDateWindow', () => {
  it('computes the window from date_start + lap_duration', () => {
    const window = lapDateWindow({ date_start: '2026-06-14T17:03:00.000Z', lap_duration: 88 });
    expect(window).toEqual({
      start: '2026-06-14T17:03:00.000Z',
      end: '2026-06-14T17:04:28.000Z',
    });
  });

  it('returns null when the lap has no start or duration', () => {
    expect(lapDateWindow({ date_start: null, lap_duration: 88 })).toBeNull();
    expect(lapDateWindow({ date_start: '2026-06-14T17:03:00.000Z', lap_duration: null })).toBeNull();
    expect(lapDateWindow({ date_start: 'not-a-date', lap_duration: 88 })).toBeNull();
  });
});

describe('isDrsOpen', () => {
  it('maps OpenF1 drs codes', () => {
    expect(isDrsOpen(0)).toBe(false);
    expect(isDrsOpen(1)).toBe(false);
    expect(isDrsOpen(8)).toBe(false); // eligible, not open
    expect(isDrsOpen(10)).toBe(true);
    expect(isDrsOpen(12)).toBe(true);
    expect(isDrsOpen(14)).toBe(true);
  });
});

describe('teamColor', () => {
  it('prefixes the OpenF1 hex value', () => {
    expect(teamColor('3671C6')).toBe('#3671C6');
    expect(teamColor(null)).toBe('#888888');
  });
});
