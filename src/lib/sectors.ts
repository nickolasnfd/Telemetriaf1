import type { Lap } from '../api/types';

export interface SectorBoundary {
  sector: 1 | 2 | 3;
  distanceM: number;
}

type SectorLap = Pick<Lap, 'date_start' | 'duration_sector_1' | 'duration_sector_2' | 'duration_sector_3'>;

// Sector TIMES are real timing data; the METERS position is an approximation
// (nearest car_data sample to the sector boundary instant), unlike corner
// numbering which is fully heuristic — see spec fase-b2-sector-markers.md §4.
export function sectorBoundaries(
  lap: SectorLap,
  sampleDatesMs: number[],
  distances: number[],
): SectorBoundary[] {
  if (
    !lap.date_start ||
    lap.duration_sector_1 == null ||
    lap.duration_sector_2 == null ||
    lap.duration_sector_3 == null ||
    sampleDatesMs.length === 0
  ) {
    return [];
  }

  const lapStartMs = Date.parse(lap.date_start);
  const sector2StartMs = lapStartMs + lap.duration_sector_1 * 1000;
  const sector3StartMs = sector2StartMs + lap.duration_sector_2 * 1000;

  const nearestDistance = (targetMs: number): number => {
    let bestIdx = 0;
    let bestDiff = Math.abs(sampleDatesMs[0] - targetMs);
    for (let i = 1; i < sampleDatesMs.length; i++) {
      const diff = Math.abs(sampleDatesMs[i] - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return distances[bestIdx];
  };

  return [
    { sector: 1, distanceM: 0 },
    { sector: 2, distanceM: nearestDistance(sector2StartMs) },
    { sector: 3, distanceM: nearestDistance(sector3StartMs) },
  ];
}
