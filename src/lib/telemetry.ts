import type { Lap } from '../api/types';

// OpenF1 `drs` codes: 0/1 = off, 8 = eligible, 10/12/14 = open.
const DRS_OPEN_CODES = new Set([10, 12, 14]);

export function isDrsOpen(drs: number): boolean {
  return DRS_OPEN_CODES.has(drs);
}

// Time window of a lap, used to slice `car_data` server-side
// (AGENTS.md §9: never query car_data without filters).
export function lapDateWindow(
  lap: Pick<Lap, 'date_start' | 'lap_duration'>,
): { start: string; end: string } | null {
  if (!lap.date_start || !lap.lap_duration) return null;
  const startMs = Date.parse(lap.date_start);
  if (Number.isNaN(startMs)) return null;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + lap.lap_duration * 1000).toISOString(),
  };
}
