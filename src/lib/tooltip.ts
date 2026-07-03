import type { Driver } from '../api/types';
import { teamColor } from './format';

// ECharts' axis-trigger tooltip can drop a series from its own `params`
// even when that series clearly has a rendered point near the hovered x
// (observed with real OpenF1 data, 2 series on a 'value' x-axis). Rather
// than trust `params` for values, we look up each trace's own nearest
// sample directly — `params` is only used to read the current axis
// position (`axisValue`), which is purely geometric and reliable.
const DEFAULT_MAX_GAP_S = 1.5;

export function nearestPointValue(
  data: Array<[number, number]>,
  x: number,
  maxGapS = DEFAULT_MAX_GAP_S,
): number | null {
  if (data.length === 0) return null;
  let lo = 0;
  let hi = data.length - 1;
  if (x <= data[lo][0]) {
    return Math.abs(data[lo][0] - x) <= maxGapS ? data[lo][1] : null;
  }
  if (x >= data[hi][0]) {
    return Math.abs(data[hi][0] - x) <= maxGapS ? data[hi][1] : null;
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (data[mid][0] <= x) lo = mid;
    else hi = mid;
  }
  const closer = Math.abs(data[lo][0] - x) <= Math.abs(data[hi][0] - x) ? data[lo] : data[hi];
  return Math.abs(closer[0] - x) <= maxGapS ? closer[1] : null;
}

export function buildAxisTooltipLines(
  axisValue: number,
  traces: Array<{ driver: Pick<Driver, 'name_acronym' | 'team_colour'>; data: Array<[number, number]> }>,
  formatValue: (value: number) => string,
): string[] {
  return traces.map((trace) => {
    const color = teamColor(trace.driver.team_colour);
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;"></span>`;
    const value = nearestPointValue(trace.data, axisValue);
    return value == null
      ? `${dot}${trace.driver.name_acronym}: sem dado neste ponto`
      : `${dot}${trace.driver.name_acronym}: ${formatValue(value)}`;
  });
}
