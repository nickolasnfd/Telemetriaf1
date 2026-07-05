// Synthetic reference dataset — schema-accurate, deterministic, NOT real F1
// data. Drivers, teams and the Grand Prix are fictional on purpose so this
// can never be mistaken for real telemetry. It exists because the dev
// sandbox cannot reach api.openf1.org (spec: restrições de ambiente);
// activate with ?mock=1.

import type { QueryParams } from '../client';
import type {
  CarData,
  Driver,
  Lap,
  Location,
  Meeting,
  Pit,
  RaceControl,
  Session,
  Stint,
  Weather,
} from '../types';

const MEETING_KEY = 9901;
const RACE_KEY = 99011;
const QUALI_KEY = 99012;
const YEAR = 2026;
const TOTAL_LAPS = 20;
const RACE_START = Date.parse('2026-06-14T17:03:00.000Z');
const SAMPLE_INTERVAL_MS = 270; // ~3.7 Hz, like the real car_data feed

// Deterministic PRNG so every run renders identical fixtures.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const meetings: Meeting[] = [
  {
    meeting_key: MEETING_KEY,
    meeting_name: 'GP de Referência (fixture)',
    meeting_official_name: 'GRANDE PRÊMIO DE REFERÊNCIA (DADOS SINTÉTICOS)',
    circuit_short_name: 'Circuito Fictício',
    country_name: 'Brasil',
    location: 'Fictília',
    date_start: '2026-06-12T15:00:00.000Z',
    year: YEAR,
  },
];

const sessions: Session[] = [
  {
    session_key: QUALI_KEY,
    meeting_key: MEETING_KEY,
    session_name: 'Qualifying',
    session_type: 'Qualifying',
    date_start: '2026-06-13T18:00:00.000Z',
    date_end: '2026-06-13T19:00:00.000Z',
    year: YEAR,
  },
  {
    session_key: RACE_KEY,
    meeting_key: MEETING_KEY,
    session_name: 'Race',
    session_type: 'Race',
    date_start: new Date(RACE_START).toISOString(),
    date_end: new Date(RACE_START + 35 * 60 * 1000).toISOString(),
    year: YEAR,
  },
];

interface FixtureDriver extends Driver {
  paceOffset: number; // seconds added to the base lap time
  pitLap: number;
  seed: number;
}

const drivers: FixtureDriver[] = [
  {
    driver_number: 11,
    session_key: RACE_KEY,
    meeting_key: MEETING_KEY,
    broadcast_name: 'A SILVA',
    full_name: 'Ana SILVA',
    name_acronym: 'SIL',
    team_name: 'Equipe Azul',
    team_colour: '3671C6',
    paceOffset: 0,
    pitLap: 9,
    seed: 11,
  },
  {
    driver_number: 27,
    session_key: RACE_KEY,
    meeting_key: MEETING_KEY,
    broadcast_name: 'B COSTA',
    full_name: 'Bruno COSTA',
    name_acronym: 'COS',
    team_name: 'Equipe Laranja',
    team_colour: 'E06D10',
    paceOffset: 0.18,
    pitLap: 11,
    seed: 27,
  },
];

const BASE_LAP_SECONDS = 88;

function lapDuration(driver: FixtureDriver, lapNumber: number, rand: () => number): number {
  let duration = BASE_LAP_SECONDS + driver.paceOffset + rand() * 0.8 - 0.4;
  if (lapNumber === 1) duration += 4; // standing start
  if (lapNumber === driver.pitLap) duration += 21; // in-lap + pit lane
  if (lapNumber === driver.pitLap + 1) duration += 7; // out-lap on cold tyres
  if (lapNumber >= 11 && lapNumber <= 13) duration += 25; // safety car
  return Math.round(duration * 1000) / 1000;
}

function buildLaps(): Lap[] {
  const laps: Lap[] = [];
  for (const driver of drivers) {
    const rand = mulberry32(driver.seed);
    let cursor = RACE_START + (driver.driver_number === 11 ? 0 : 900);
    for (let lapNumber = 1; lapNumber <= TOTAL_LAPS; lapNumber++) {
      const duration = lapDuration(driver, lapNumber, rand);
      const third = duration / 3;
      laps.push({
        session_key: RACE_KEY,
        meeting_key: MEETING_KEY,
        driver_number: driver.driver_number,
        lap_number: lapNumber,
        date_start: new Date(cursor).toISOString(),
        lap_duration: duration,
        duration_sector_1: Math.round(third * 0.9 * 1000) / 1000,
        duration_sector_2: Math.round(third * 1.2 * 1000) / 1000,
        duration_sector_3: Math.round((duration - third * 0.9 - third * 1.2) * 1000) / 1000,
        is_pit_out_lap: lapNumber === driver.pitLap + 1,
      });
      cursor += duration * 1000;
    }
  }
  return laps;
}

const laps = buildLaps();

const stints: Stint[] = drivers.flatMap((driver) => [
  {
    session_key: RACE_KEY,
    meeting_key: MEETING_KEY,
    driver_number: driver.driver_number,
    stint_number: 1,
    lap_start: 1,
    lap_end: driver.pitLap,
    compound: driver.driver_number === 11 ? 'SOFT' : 'MEDIUM',
    tyre_age_at_start: 0,
  },
  {
    session_key: RACE_KEY,
    meeting_key: MEETING_KEY,
    driver_number: driver.driver_number,
    stint_number: 2,
    lap_start: driver.pitLap + 1,
    lap_end: TOTAL_LAPS,
    compound: driver.driver_number === 11 ? 'MEDIUM' : 'HARD',
    tyre_age_at_start: 0,
  },
]);

const pits: Pit[] = drivers.map((driver) => {
  const inLap = laps.find(
    (lap) => lap.driver_number === driver.driver_number && lap.lap_number === driver.pitLap,
  )!;
  return {
    session_key: RACE_KEY,
    meeting_key: MEETING_KEY,
    driver_number: driver.driver_number,
    lap_number: driver.pitLap,
    date: new Date(Date.parse(inLap.date_start!) + 60 * 1000).toISOString(),
    pit_duration: driver.driver_number === 11 ? 21.4 : 22.9,
  };
});

function buildWeather(): Weather[] {
  const rand = mulberry32(7);
  const samples: Weather[] = [];
  for (let i = 0; i < 40; i++) {
    samples.push({
      session_key: RACE_KEY,
      meeting_key: MEETING_KEY,
      date: new Date(RACE_START + i * 60 * 1000).toISOString(),
      air_temperature: Math.round((27 - i * 0.05 + rand() * 0.4) * 10) / 10,
      track_temperature: Math.round((43 - i * 0.15 + rand() * 0.6) * 10) / 10,
      humidity: Math.round(58 + i * 0.5 + rand() * 2),
      rainfall: i >= 22 && i <= 27 ? 1 : 0,
      wind_speed: Math.round((2.5 + rand() * 1.5) * 10) / 10,
    });
  }
  return samples;
}

const weather = buildWeather();

function raceControlAt(minutes: number): string {
  return new Date(RACE_START + minutes * 60 * 1000).toISOString();
}

const raceControl: RaceControl[] = [
  { session_key: RACE_KEY, meeting_key: MEETING_KEY, date: raceControlAt(0), category: 'Flag', flag: 'GREEN', scope: 'Track', sector: null, driver_number: null, lap_number: 1, message: 'GREEN LIGHT - PIT EXIT OPEN' },
  { session_key: RACE_KEY, meeting_key: MEETING_KEY, date: raceControlAt(7), category: 'Flag', flag: 'YELLOW', scope: 'Sector', sector: 7, driver_number: null, lap_number: 5, message: 'YELLOW IN TRACK SECTOR 7' },
  { session_key: RACE_KEY, meeting_key: MEETING_KEY, date: raceControlAt(8), category: 'Flag', flag: 'CLEAR', scope: 'Sector', sector: 7, driver_number: null, lap_number: 6, message: 'CLEAR IN TRACK SECTOR 7' },
  { session_key: RACE_KEY, meeting_key: MEETING_KEY, date: raceControlAt(16), category: 'SafetyCar', flag: null, scope: 'Track', sector: null, driver_number: null, lap_number: 11, message: 'SAFETY CAR DEPLOYED' },
  { session_key: RACE_KEY, meeting_key: MEETING_KEY, date: raceControlAt(20), category: 'SafetyCar', flag: null, scope: 'Track', sector: null, driver_number: null, lap_number: 13, message: 'SAFETY CAR IN THIS LAP' },
  { session_key: RACE_KEY, meeting_key: MEETING_KEY, date: raceControlAt(21), category: 'Flag', flag: 'GREEN', scope: 'Track', sector: null, driver_number: null, lap_number: 14, message: 'TRACK CLEAR' },
  { session_key: RACE_KEY, meeting_key: MEETING_KEY, date: raceControlAt(31), category: 'Flag', flag: 'CHEQUERED', scope: 'Track', sector: null, driver_number: null, lap_number: 20, message: 'CHEQUERED FLAG' },
];

// Speed profile over one lap: a fast track interrupted by gaussian "corner"
// dips. frac is the position within the lap, in [0, 1).
const CORNERS: Array<{ at: number; minSpeed: number; width: number }> = [
  { at: 0.14, minSpeed: 110, width: 0.03 },
  { at: 0.3, minSpeed: 85, width: 0.035 },
  { at: 0.46, minSpeed: 150, width: 0.025 },
  { at: 0.63, minSpeed: 70, width: 0.04 },
  { at: 0.82, minSpeed: 175, width: 0.025 },
  { at: 0.95, minSpeed: 120, width: 0.03 },
];
const TOP_SPEED = 328;
const DRS_ZONES: Array<[number, number]> = [
  [0.0, 0.11],
  [0.5, 0.6],
];

function speedAt(frac: number, jitter: number): number {
  let speed = TOP_SPEED;
  for (const corner of CORNERS) {
    const dip = (TOP_SPEED - corner.minSpeed) * Math.exp(-((frac - corner.at) ** 2) / (2 * corner.width ** 2));
    speed -= dip;
  }
  return Math.max(50, Math.round(speed + jitter));
}

function buildCarSample(driver: FixtureDriver, dateMs: number, frac: number, prevSpeed: number, rand: () => number): CarData {
  const speed = speedAt(frac, rand() * 4 - 2);
  const accelerating = speed >= prevSpeed - 1;
  const braking = speed < prevSpeed - 8;
  const gear = Math.min(8, Math.max(1, Math.ceil(speed / 42)));
  const inDrsZone = DRS_ZONES.some(([from, to]) => frac >= from && frac < to);
  const drs = inDrsZone && speed > 250 ? 12 : inDrsZone ? 8 : 0;
  return {
    session_key: RACE_KEY,
    meeting_key: MEETING_KEY,
    driver_number: driver.driver_number,
    date: new Date(dateMs).toISOString(),
    speed,
    n_gear: gear,
    throttle: accelerating && !braking ? 100 : braking ? 0 : 60,
    brake: braking ? 100 : 0,
    drs,
    rpm: Math.round(4500 + (speed / TOP_SPEED) * 7500),
  };
}

function generateCarData(driverNumber: number, fromMs: number, toMs: number): CarData[] {
  const driver = drivers.find((d) => d.driver_number === driverNumber);
  if (!driver) return [];
  const driverLaps = laps.filter((lap) => lap.driver_number === driverNumber);
  const samples: CarData[] = [];
  const rand = mulberry32(driver.seed * 1000 + Math.floor(fromMs / 1000));
  let prevSpeed = TOP_SPEED;
  for (let t = fromMs; t < toMs; t += SAMPLE_INTERVAL_MS) {
    const lap = driverLaps.find((candidate) => {
      const start = Date.parse(candidate.date_start!);
      return t >= start && t < start + candidate.lap_duration! * 1000;
    });
    if (!lap) continue;
    const lapStart = Date.parse(lap.date_start!);
    const frac = (t - lapStart) / (lap.lap_duration! * 1000);
    const sample = buildCarSample(driver, t, frac, prevSpeed, rand);
    prevSpeed = sample.speed;
    samples.push(sample);
  }
  return samples;
}

// Closed, non-circular 2D loop standing in for the real circuit shape —
// schema-accurate but fictional, like the rest of this fixture. frac is the
// position within the lap, in [0, 1).
function trackPointAt(frac: number): { x: number; y: number } {
  const angle = 2 * Math.PI * frac;
  return {
    x: 500 + 400 * Math.cos(angle) + 80 * Math.cos(3 * angle),
    y: 300 + 250 * Math.sin(angle) + 60 * Math.sin(2 * angle),
  };
}

function generateLocation(driverNumber: number, fromMs: number, toMs: number): Location[] {
  const driver = drivers.find((d) => d.driver_number === driverNumber);
  if (!driver) return [];
  const driverLaps = laps.filter((lap) => lap.driver_number === driverNumber);
  const samples: Location[] = [];
  for (let t = fromMs; t < toMs; t += SAMPLE_INTERVAL_MS) {
    const lap = driverLaps.find((candidate) => {
      const start = Date.parse(candidate.date_start!);
      return t >= start && t < start + candidate.lap_duration! * 1000;
    });
    if (!lap) continue;
    const lapStart = Date.parse(lap.date_start!);
    const frac = (t - lapStart) / (lap.lap_duration! * 1000);
    const { x, y } = trackPointAt(frac);
    samples.push({
      session_key: RACE_KEY,
      meeting_key: MEETING_KEY,
      driver_number: driverNumber,
      date: new Date(t).toISOString(),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      z: 0,
    });
  }
  return samples;
}

function matches(record: Record<string, unknown>, params: QueryParams): boolean {
  return Object.entries(params).every(([key, value]) => {
    if (value === undefined) return true;
    if (key.endsWith('>') || key.endsWith('<')) return true; // handled by caller
    return String(record[key]) === String(value);
  });
}

function dateBounds(params: QueryParams): { fromMs: number; toMs: number } {
  const from = params['date>'];
  const to = params['date<'];
  return {
    fromMs: from !== undefined ? Date.parse(String(from)) : RACE_START,
    toMs: to !== undefined ? Date.parse(String(to)) : RACE_START + 40 * 60 * 1000,
  };
}

export async function mockFetch(endpoint: string, params: QueryParams = {}): Promise<unknown[]> {
  await new Promise((resolve) => setTimeout(resolve, 120)); // simulated latency
  switch (endpoint) {
    case 'meetings':
      return meetings.filter((m) => matches(m as unknown as Record<string, unknown>, params));
    case 'sessions':
      return sessions.filter((s) => matches(s as unknown as Record<string, unknown>, params));
    case 'drivers':
      return drivers
        .map(({ paceOffset: _p, pitLap: _l, seed: _s, ...driver }) => ({
          ...driver,
          session_key: Number(params.session_key ?? RACE_KEY),
        }))
        .filter((d) => matches(d as unknown as Record<string, unknown>, params));
    case 'laps':
      return laps.filter((lap) => matches(lap as unknown as Record<string, unknown>, params));
    case 'stints':
      return stints.filter((s) => matches(s as unknown as Record<string, unknown>, params));
    case 'pit':
      return pits.filter((p) => matches(p as unknown as Record<string, unknown>, params));
    case 'weather': {
      const { fromMs, toMs } = dateBounds(params);
      return weather.filter(
        (w) =>
          matches(w as unknown as Record<string, unknown>, params) &&
          Date.parse(w.date) >= fromMs &&
          Date.parse(w.date) < toMs,
      );
    }
    case 'race_control':
      return raceControl.filter((r) => matches(r as unknown as Record<string, unknown>, params));
    case 'car_data': {
      if (params.driver_number === undefined) return []; // never unfiltered
      const { fromMs, toMs } = dateBounds(params);
      return generateCarData(Number(params.driver_number), fromMs, toMs);
    }
    case 'location': {
      if (params.driver_number === undefined) return []; // never unfiltered
      const { fromMs, toMs } = dateBounds(params);
      return generateLocation(Number(params.driver_number), fromMs, toMs);
    }
    default:
      return [];
  }
}
