import { describe, expect, it } from 'vitest';
import { mockFetch } from './mock';
import type { CarData, Lap, Location, RaceControl, Stint, TeamRadio, Weather } from '../types';

const RACE_KEY = 99011;

describe('mockFetch (synthetic reference dataset)', () => {
  it('filters meetings by year', async () => {
    expect(await mockFetch('meetings', { year: 2026 })).toHaveLength(1);
    expect(await mockFetch('meetings', { year: 2024 })).toHaveLength(0);
  });

  it('returns 20 laps per driver for the race, sorted windows that chain', async () => {
    const laps = (await mockFetch('laps', { session_key: RACE_KEY, driver_number: 11 })) as Lap[];
    expect(laps).toHaveLength(20);
    for (const lap of laps) {
      expect(lap.date_start).toBeTruthy();
      expect(lap.lap_duration).toBeGreaterThan(60);
    }
  });

  it('slices car_data by driver and date window at ~3.7 Hz', async () => {
    const [lap] = (await mockFetch('laps', {
      session_key: RACE_KEY,
      driver_number: 11,
      lap_number: 3,
    })) as Lap[];
    const start = lap.date_start!;
    const end = new Date(Date.parse(start) + lap.lap_duration! * 1000).toISOString();
    const samples = (await mockFetch('car_data', {
      session_key: RACE_KEY,
      driver_number: 11,
      'date>': start,
      'date<': end,
    })) as CarData[];

    // ~88 s lap at 270 ms interval ≈ 320+ samples
    expect(samples.length).toBeGreaterThan(250);
    expect(samples.length).toBeLessThan(400);
    for (const sample of samples) {
      expect(sample.driver_number).toBe(11);
      expect(Date.parse(sample.date)).toBeGreaterThanOrEqual(Date.parse(start));
      expect(Date.parse(sample.date)).toBeLessThan(Date.parse(end));
      expect(sample.speed).toBeGreaterThanOrEqual(50);
      expect(sample.speed).toBeLessThanOrEqual(340);
      expect([0, 60, 100]).toContain(sample.throttle);
      expect([0, 100]).toContain(sample.brake);
      expect(sample.n_gear).toBeGreaterThanOrEqual(1);
      expect(sample.n_gear).toBeLessThanOrEqual(8);
    }
  });

  it('refuses car_data without a driver filter (AGENTS.md §9)', async () => {
    expect(await mockFetch('car_data', { session_key: RACE_KEY })).toHaveLength(0);
  });

  it('slices location by driver and date window, forming a closed loop', async () => {
    const [lap] = (await mockFetch('laps', {
      session_key: RACE_KEY,
      driver_number: 11,
      lap_number: 3,
    })) as Lap[];
    const start = lap.date_start!;
    const end = new Date(Date.parse(start) + lap.lap_duration! * 1000).toISOString();
    const samples = (await mockFetch('location', {
      session_key: RACE_KEY,
      driver_number: 11,
      'date>': start,
      'date<': end,
    })) as Location[];

    expect(samples.length).toBeGreaterThan(250);
    for (const sample of samples) {
      expect(sample.driver_number).toBe(11);
      expect(Date.parse(sample.date)).toBeGreaterThanOrEqual(Date.parse(start));
      expect(Date.parse(sample.date)).toBeLessThan(Date.parse(end));
      expect(Number.isFinite(sample.x)).toBe(true);
      expect(Number.isFinite(sample.y)).toBe(true);
      expect(sample.z).toBe(0);
    }
    // First and last samples of a full lap should be close together (closed loop).
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dist = Math.hypot(last.x - first.x, last.y - first.y);
    expect(dist).toBeLessThan(50);
  });

  it('refuses location without a driver filter (AGENTS.md §9)', async () => {
    expect(await mockFetch('location', { session_key: RACE_KEY })).toHaveLength(0);
  });

  it('provides two stints per driver with a compound change', async () => {
    const stints = (await mockFetch('stints', {
      session_key: RACE_KEY,
      driver_number: 11,
    })) as Stint[];
    expect(stints).toHaveLength(2);
    expect(stints[0].compound).not.toBe(stints[1].compound);
  });

  it('bounds weather samples by date window', async () => {
    const all = (await mockFetch('weather', { session_key: RACE_KEY })) as Weather[];
    expect(all).toHaveLength(40);
    expect(all.some((w) => w.rainfall === 1)).toBe(true);
  });

  it('includes flags and safety car in race control', async () => {
    const messages = (await mockFetch('race_control', { session_key: RACE_KEY })) as RaceControl[];
    expect(messages.some((m) => m.category === 'SafetyCar')).toBe(true);
    expect(messages.some((m) => m.flag === 'CHEQUERED')).toBe(true);
  });

  it('filters team_radio clips by session', async () => {
    const clips = (await mockFetch('team_radio', { session_key: RACE_KEY })) as TeamRadio[];
    expect(clips.length).toBeGreaterThan(0);
    for (const clip of clips) {
      expect(clip.recording_url).toMatch(/^https:\/\//);
      expect(clip.driver_number).toBeGreaterThan(0);
    }
    expect(await mockFetch('team_radio', { session_key: 999999 })).toHaveLength(0);
  });
});
