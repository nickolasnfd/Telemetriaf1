import type { Driver } from '../api/types';
import { teamColor } from './format';

interface AxisTooltipParam {
  seriesName: string;
  marker: string;
  value: [number, number];
}

// ECharts' axis-trigger tooltip silently omits a series when it has no
// nearby data point (observed with real OpenF1 car_data gaps, not
// reproducible with the synthetic fixture). This always lists every
// currently-plotted driver, marking the ones missing at this x position.
export function buildAxisTooltipLines(
  params: AxisTooltipParam[],
  traces: Array<{ driver: Pick<Driver, 'name_acronym' | 'team_colour'> }>,
  formatValue: (value: number) => string,
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const p of params) {
    lines.push(`${p.marker} ${p.seriesName}: ${formatValue(p.value[1])}`);
    seen.add(p.seriesName);
  }
  for (const trace of traces) {
    if (seen.has(trace.driver.name_acronym)) continue;
    const color = teamColor(trace.driver.team_colour);
    lines.push(
      `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;"></span>${trace.driver.name_acronym}: sem dado neste ponto`,
    );
  }
  return lines;
}
