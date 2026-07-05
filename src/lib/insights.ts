import type { CarData, Lap } from '../api/types';
import type { Corner } from './corners';
import type { DeltaPoint } from './delta';

// Deterministic, rules-based lap-comparison insights — NO generative AI
// (AGENTS.md §4: never invent data/behavior). Every phrase is produced by
// the fixed table in segmentPhrase(), so it's fully testable and reproducible.

export interface SectorDelta {
  sector: 1 | 2 | 3;
  deltaS: number; // timeB - timeA: positive = driver B slower in this sector
}

type SectorLap = Pick<Lap, 'duration_sector_1' | 'duration_sector_2' | 'duration_sector_3'>;

export function sectorTimeDeltas(lapA: SectorLap, lapB: SectorLap): SectorDelta[] {
  const durationsA = [lapA.duration_sector_1, lapA.duration_sector_2, lapA.duration_sector_3];
  const durationsB = [lapB.duration_sector_1, lapB.duration_sector_2, lapB.duration_sector_3];
  if ([...durationsA, ...durationsB].some((d) => d == null)) return [];
  return [1, 2, 3].map((sector, i) => ({
    sector: sector as 1 | 2 | 3,
    deltaS: Math.round((durationsB[i]! - durationsA[i]!) * 1000) / 1000,
  }));
}

export interface SegmentInsight {
  label: string;
  deltaS: number; // change in delta over the segment: positive = B lost time
  phrase: string;
}

const MIN_RELEVANT_S = 0.02;
const MAX_SEGMENTS = 6;
const SPEED_ADVANTAGE_KMH = 3; // "clearly" faster/slower top speed threshold

// Linear interpolation of the cumulative delta at a given distance.
function deltaAtDistance(points: DeltaPoint[], targetM: number): number {
  if (points.length === 0) return 0;
  if (targetM <= points[0].distanceM) return points[0].deltaS;
  if (targetM >= points[points.length - 1].distanceM) return points[points.length - 1].deltaS;
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceM >= targetM) {
      const p0 = points[i - 1];
      const p1 = points[i];
      if (p1.distanceM === p0.distanceM) return p1.deltaS;
      const ratio = (targetM - p0.distanceM) / (p1.distanceM - p0.distanceM);
      return p0.deltaS + ratio * (p1.deltaS - p0.deltaS);
    }
  }
  return points[points.length - 1].deltaS;
}

function maxSpeedInRange(samples: CarData[], distances: number[], startM: number, endM: number): number {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    if (distances[i] >= startM && distances[i] <= endM && samples[i].speed > max) {
      max = samples[i].speed;
    }
  }
  return max;
}

// The rule table. `segGain > 0` means B lost time in the segment; `topSpeedDelta`
// is B's max speed minus A's in the segment. Hedged wording ("provável") where
// the cause isn't directly measured.
function segmentPhrase(driverB: string, segGain: number, topSpeedDelta: number): string {
  const lostTime = segGain > 0;
  const clearlySlower = topSpeedDelta <= -SPEED_ADVANTAGE_KMH;
  const clearlyFaster = topSpeedDelta >= SPEED_ADVANTAGE_KMH;
  if (lostTime) {
    return clearlySlower
      ? `${driverB} perde tempo com menor velocidade máxima neste trecho`
      : `${driverB} perde tempo apesar de velocidade máxima parecida — provável frenagem/tração`;
  }
  return clearlyFaster
    ? `${driverB} ganha tempo com maior velocidade máxima neste trecho`
    : `${driverB} ganha tempo mesmo sem vantagem de velocidade máxima — provável melhor no técnico`;
}

function segmentLabel(corners: Corner[], index: number): string {
  const from = index === 0 ? 'Largada' : `T${corners[index - 1].index}`;
  const to = index === corners.length ? 'Final' : `T${corners[index].index}`;
  return `${from} → ${to}`;
}

export function segmentInsights(
  delta: DeltaPoint[],
  corners: Corner[],
  driverBName: string,
  samplesA: CarData[],
  distancesA: number[],
  samplesB: CarData[],
  distancesB: number[],
): SegmentInsight[] {
  if (delta.length === 0) return [];
  const maxM = delta[delta.length - 1].distanceM;
  const boundaries = [0, ...corners.map((c) => c.distanceM).filter((d) => d > 0 && d < maxM), maxM];

  const insights: SegmentInsight[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startM = boundaries[i];
    const endM = boundaries[i + 1];
    const segGain = deltaAtDistance(delta, endM) - deltaAtDistance(delta, startM);
    if (Math.abs(segGain) < MIN_RELEVANT_S) continue;
    const topSpeedDelta =
      maxSpeedInRange(samplesB, distancesB, startM, endM) - maxSpeedInRange(samplesA, distancesA, startM, endM);
    insights.push({
      label: segmentLabel(corners, i),
      deltaS: Math.round(segGain * 1000) / 1000,
      phrase: segmentPhrase(driverBName, segGain, topSpeedDelta),
    });
  }

  return insights.sort((a, b) => Math.abs(b.deltaS) - Math.abs(a.deltaS)).slice(0, MAX_SEGMENTS);
}
