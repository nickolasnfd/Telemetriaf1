import type { Corner } from './corners';
import type { DeltaPoint } from './delta';
import type { SectorBoundary } from './sectors';
import type { TrackPoint } from './trackMap';

export interface SegmentBoundary {
  startM: number;
  endM: number;
}

export interface ColoredSegment {
  path: string;
  faster: 0 | 1 | null; // index of the faster driver in this segment; null = tie/neutral
}

// Same spirit as insights.ts's MIN_RELEVANT_S: a segment whose time gain is
// this small isn't a confident enough signal to declare a "winner" (spec
// fase-d2-track-coloring.md §5).
const TIE_THRESHOLD_S = 0.02;

// [0, sector2Start, sector3Start] -> [{0,sector2Start}, {sector2Start,sector3Start}, {sector3Start,maxM}].
export function sectorSegments(boundaries: SectorBoundary[], maxM: number): SegmentBoundary[] {
  if (boundaries.length === 0) return [];
  const sorted = [...boundaries].sort((a, b) => a.distanceM - b.distanceM);
  return sorted.map((b, i) => ({
    startM: b.distanceM,
    endM: i + 1 < sorted.length ? sorted[i + 1].distanceM : maxM,
  }));
}

// Fixed COUNT of equal-length segments (not fixed distance — user decision,
// spec fase-d4-mini-sectors.md §5), regardless of circuit length.
export function miniSectorSegments(maxM: number, count = 20): SegmentBoundary[] {
  if (maxM <= 0 || count <= 0) return [];
  const step = maxM / count;
  const segments: SegmentBoundary[] = [];
  for (let i = 0; i < count; i++) {
    segments.push({ startM: i * step, endM: i + 1 < count ? (i + 1) * step : maxM });
  }
  return segments;
}

// Same boundary construction as insights.ts's segmentInsights (replicated,
// not imported — that module returns phrases, not segments; see spec §5).
export function cornerSegments(corners: Corner[], maxM: number): SegmentBoundary[] {
  const bounds = [0, ...corners.map((c) => c.distanceM).filter((d) => d > 0 && d < maxM), maxM];
  const segments: SegmentBoundary[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    segments.push({ startM: bounds[i], endM: bounds[i + 1] });
  }
  return segments;
}

// Same interpolation as insights.ts's private deltaAtDistance, replicated
// here for the same reason as cornerSegments above.
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

function segmentPath(points: TrackPoint[], distances: number[], startM: number, endM: number): string {
  const inRange = points.filter((_, i) => distances[i] >= startM && distances[i] <= endM);
  if (inRange.length < 2) return '';
  const [first, ...rest] = inRange;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

// Slices the reference driver's normalized track points into the given
// segments and decides, for each, which driver was faster (by the sign of
// the accumulated delta over that stretch) — deltaS > 0 means driver B lost
// time in the segment (see delta.ts), so driver A (index 0) was faster.
export function colorSegments(
  points: TrackPoint[],
  distances: number[],
  boundaries: SegmentBoundary[],
  delta: DeltaPoint[],
): ColoredSegment[] {
  const segments: ColoredSegment[] = [];
  for (const { startM, endM } of boundaries) {
    const path = segmentPath(points, distances, startM, endM);
    if (!path) continue;
    const segGain = deltaAtDistance(delta, endM) - deltaAtDistance(delta, startM);
    const faster: 0 | 1 | null = Math.abs(segGain) < TIE_THRESHOLD_S ? null : segGain > 0 ? 0 : 1;
    segments.push({ path, faster });
  }
  return segments;
}
