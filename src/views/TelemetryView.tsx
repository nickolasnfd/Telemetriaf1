import { useMemo, useState } from 'react';
import { useCarData, useDrivers, useLaps } from '../api/queries';
import type { CarData, Driver, Lap } from '../api/types';
import { EChart, type ChartOption } from '../components/EChart';
import { ExportButton } from '../components/ExportButton';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { InsightsPanel } from '../components/InsightsPanel';
import { SummaryCards } from '../components/SummaryCards';
import { estimateBattery } from '../lib/batteryModel';
import { estimateBrakePressure } from '../lib/brakeModel';
import { ACCENT, axisStyle, INK_DIM, legendStyle, tooltipStyle } from '../lib/chartTheme';
import { detectCorners, type Corner } from '../lib/corners';
import { computeDelta, type DeltaConfidence, type DeltaResult } from '../lib/delta';
import { cumulativeDistance } from '../lib/distance';
import { formatLapTime, teamColor } from '../lib/format';
import { sectorTimeDeltas, segmentInsights } from '../lib/insights';
import { sectorBoundaries, type SectorBoundary } from '../lib/sectors';
import { isDrsOpen, lapDateWindow } from '../lib/telemetry';
import { buildAxisTooltipLines, DISTANCE_MAX_GAP_M, nearestPointValue, TIME_MAX_GAP_S } from '../lib/tooltip';
import type { AppState } from '../lib/urlState';
import styles from './TelemetryView.module.css';

interface Channel {
  label: string;
  unit: string;
  height: number;
  step: boolean;
  map: (sample: CarData) => number;
  yAxis: Record<string, unknown>;
  format: (value: number) => string;
  cornerLabels?: boolean;
}

const CHANNELS: Channel[] = [
  {
    label: 'Velocidade',
    unit: 'km/h',
    height: 240,
    step: false,
    map: (s) => s.speed,
    yAxis: { scale: true },
    format: (v) => `${Math.round(v)} km/h`,
    cornerLabels: true,
  },
  {
    label: 'Acelerador',
    unit: '%',
    height: 120,
    step: false,
    map: (s) => s.throttle,
    yAxis: { min: 0, max: 100 },
    format: (v) => `${Math.round(v)}%`,
  },
  {
    label: 'Freio',
    unit: '%',
    height: 100,
    step: true,
    map: (s) => s.brake,
    yAxis: { min: 0, max: 100 },
    format: (v) => (v > 0 ? 'freando' : 'solto'),
  },
  {
    label: 'Marcha',
    unit: '',
    height: 120,
    step: true,
    map: (s) => s.n_gear,
    yAxis: { min: 0, max: 8, interval: 2 },
    format: (v) => `${v}ª`,
  },
  {
    label: 'DRS',
    unit: '',
    height: 90,
    step: true,
    map: (s) => (isDrsOpen(s.drs) ? 1 : 0),
    yAxis: { min: 0, max: 1, interval: 1, axisLabel: { show: false } },
    format: (v) => (v === 1 ? 'aberto' : 'fechado'),
  },
];

interface DriverTrace {
  driver: Driver;
  lap: Lap;
  samples: CarData[];
  dashed: boolean;
}

type XAxisMode = 'time' | 'distance';

// X-axis values (elapsed seconds or cumulative meters), index-aligned with
// trace.samples. Computed once per trace/mode and shared by the series, the
// tooltip lookup and (in distance mode) the corner markers — every consumer
// must agree on the same numbers (see LEARNINGS on the tooltip/params bug).
function computeXValues(trace: DriverTrace, mode: XAxisMode): number[] {
  if (mode === 'distance') {
    return cumulativeDistance(trace.samples).map((d) => Math.round(d));
  }
  const lapStartMs = Date.parse(trace.lap.date_start!);
  return trace.samples.map(
    (sample) => Math.round(((Date.parse(sample.date) - lapStartMs) / 1000) * 100) / 100,
  );
}

function traceChannelData(
  xValues: number[],
  samples: CarData[],
  map: (sample: CarData) => number,
): Array<[number, number]> {
  return samples.map((sample, i) => [xValues[i], map(sample)]);
}

function traceBatteryData(xValues: number[], samples: CarData[]): Array<[number, number]> {
  return estimateBattery(samples).map((point, i) => [xValues[i], Math.round(point.socPct * 10) / 10]);
}

function traceBrakePressureData(xValues: number[], samples: CarData[]): Array<[number, number]> {
  return estimateBrakePressure(samples).map((point, i) => [xValues[i], Math.round(point.pressurePct * 10) / 10]);
}

function axisTooltipFormatter(
  traces: DriverTrace[],
  chartData: Array<Array<[number, number]>>,
  format: (value: number) => string,
  unitSuffix: string,
) {
  const maxGap = unitSuffix === 'm' ? DISTANCE_MAX_GAP_M : TIME_MAX_GAP_S;
  return (params: Array<{ axisValue?: number; value?: [number, number] }>) => {
    const axisValue = params[0]?.axisValue ?? params[0]?.value?.[0];
    if (axisValue == null) return '';
    return [`${axisValue.toFixed(unitSuffix === 'm' ? 0 : 1)}${unitSuffix} na volta`]
      .concat(
        buildAxisTooltipLines(
          axisValue,
          traces.map((trace, i) => ({ driver: trace.driver, data: chartData[i] })),
          format,
          maxGap,
        ),
      )
      .join('<br/>');
  };
}

function axisLabelFormatter(unitSuffix: string) {
  return (v: number) => `${v}${unitSuffix}`;
}

// Vertical lines marking curves (heuristic, dashed/dim) and sector
// boundaries (real timing data, solid/accent) — drawn on every channel for
// visual alignment; text labels only render on the channel that opts in
// (the speed chart) to avoid repeating them 7 times. Distinct styles keep
// the two kinds of marker (heuristic vs real) visually unambiguous.
function trackMarkersLine(
  corners: Corner[],
  sectors: SectorBoundary[],
  showLabels: boolean,
  includeZeroLine = false,
) {
  if (corners.length === 0 && sectors.length === 0 && !includeZeroLine) return undefined;
  const labelBase = { show: showLabels, fontSize: 10, position: 'insideEndTop' as const };
  const cornerItems = corners.map((c) => ({
    xAxis: c.distanceM,
    name: `T${c.index}`,
    lineStyle: { color: INK_DIM, type: 'dashed' as const, width: 1, opacity: 0.5 },
    label: { ...labelBase, formatter: (p: { name: string }) => p.name, color: INK_DIM },
  }));
  const sectorItems = sectors.map((s) => ({
    xAxis: s.distanceM,
    name: `S${s.sector}`,
    lineStyle: { color: ACCENT, type: 'solid' as const, width: 1.5, opacity: 0.8 },
    label: { ...labelBase, formatter: (p: { name: string }) => p.name, color: ACCENT, fontWeight: 700 },
  }));
  const zeroLineItem = includeZeroLine
    ? [{ yAxis: 0, name: '', lineStyle: { color: INK_DIM, type: 'solid' as const, width: 1 }, label: { show: false } }]
    : [];
  return {
    silent: true,
    symbol: 'none',
    data: [...cornerItems, ...sectorItems, ...zeroLineItem],
  };
}

function channelOption(
  channel: Channel,
  traces: DriverTrace[],
  xValuesByTrace: number[][],
  xMax: number,
  isLast: boolean,
  unitSuffix: string,
  corners: Corner[],
  sectors: SectorBoundary[],
): ChartOption {
  const chartData = traces.map((trace, i) => traceChannelData(xValuesByTrace[i], trace.samples, channel.map));
  return {
    animation: false,
    legend: { show: false },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis',
      formatter: axisTooltipFormatter(traces, chartData, channel.format, unitSuffix),
    },
    grid: { left: 56, right: 16, top: 26, bottom: isLast ? 30 : 8 },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      ...axisStyle,
      splitLine: { show: false },
      axisLabel: { ...axisStyle.axisLabel, show: isLast, formatter: axisLabelFormatter(unitSuffix) },
    },
    yAxis: {
      type: 'value',
      name: `${channel.label}${channel.unit ? ` (${channel.unit})` : ''}`,
      nameTextStyle: { color: INK_DIM, fontSize: 11, align: 'left', padding: [0, 0, 0, -40] },
      ...axisStyle,
      ...channel.yAxis,
    },
    dataZoom: [{ type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true }],
    series: traces.map((trace, i) => ({
      name: trace.driver.name_acronym,
      type: 'line',
      step: channel.step ? 'end' : false,
      symbol: 'none',
      color: teamColor(trace.driver.team_colour),
      lineStyle: { width: 2, type: trace.dashed ? 'dashed' : 'solid' },
      data: chartData[i],
      ...(i === 0
        ? { markLine: trackMarkersLine(corners, sectors, Boolean(channel.cornerLabels)) }
        : {}),
    })),
  };
}

// Battery is integrated over the lap (stateful), unlike the per-sample
// CHANNELS above, so it gets a dedicated option builder.
function batteryOption(
  traces: DriverTrace[],
  xValuesByTrace: number[][],
  xMax: number,
  unitSuffix: string,
  corners: Corner[],
  sectors: SectorBoundary[],
): ChartOption {
  const chartData = traces.map((trace, i) => traceBatteryData(xValuesByTrace[i], trace.samples));
  return {
    animation: false,
    legend: { show: false },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis',
      formatter: axisTooltipFormatter(
        traces,
        chartData,
        (v) => `${v.toFixed(0)}% (~${((v / 100) * 4).toFixed(2)} MJ)`,
        unitSuffix,
      ),
    },
    grid: { left: 56, right: 16, top: 26, bottom: 30 },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      ...axisStyle,
      splitLine: { show: false },
      axisLabel: { ...axisStyle.axisLabel, show: true, formatter: axisLabelFormatter(unitSuffix) },
    },
    yAxis: {
      type: 'value',
      name: 'Bateria (estimativa) %',
      nameTextStyle: { color: INK_DIM, fontSize: 11, align: 'left', padding: [0, 0, 0, -40] },
      min: 0,
      max: 100,
      ...axisStyle,
    },
    dataZoom: [{ type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true }],
    series: traces.map((trace, i) => ({
      name: trace.driver.name_acronym,
      type: 'line',
      symbol: 'none',
      color: teamColor(trace.driver.team_colour),
      lineStyle: { width: 2, type: trace.dashed ? 'dashed' : 'solid' },
      data: chartData[i],
      ...(i === 0 ? { markLine: trackMarkersLine(corners, sectors, false) } : {}),
    })),
  };
}

// Brake pressure is normalized against this same lap's own peak deceleration
// (self-calibrated, no external absolute reference — spec fase-e-brake-pressure.md
// §5), so it also gets a dedicated option builder rather than the per-sample
// CHANNELS path.
function brakePressureOption(
  traces: DriverTrace[],
  xValuesByTrace: number[][],
  xMax: number,
  unitSuffix: string,
  corners: Corner[],
  sectors: SectorBoundary[],
): ChartOption {
  const chartData = traces.map((trace, i) => traceBrakePressureData(xValuesByTrace[i], trace.samples));
  return {
    animation: false,
    legend: { show: false },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis',
      formatter: axisTooltipFormatter(traces, chartData, (v) => `${v.toFixed(0)}%`, unitSuffix),
    },
    grid: { left: 56, right: 16, top: 26, bottom: 8 },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      ...axisStyle,
      splitLine: { show: false },
      axisLabel: { ...axisStyle.axisLabel, show: false, formatter: axisLabelFormatter(unitSuffix) },
    },
    yAxis: {
      type: 'value',
      name: 'Freio (estimativa) %',
      nameTextStyle: { color: INK_DIM, fontSize: 11, align: 'left', padding: [0, 0, 0, -40] },
      min: 0,
      max: 100,
      ...axisStyle,
    },
    dataZoom: [{ type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true }],
    series: traces.map((trace, i) => ({
      name: trace.driver.name_acronym,
      type: 'line',
      symbol: 'none',
      color: teamColor(trace.driver.team_colour),
      lineStyle: { width: 2, type: trace.dashed ? 'dashed' : 'solid' },
      data: chartData[i],
      ...(i === 0 ? { markLine: trackMarkersLine(corners, sectors, false) } : {}),
    })),
  };
}

const CONFIDENCE_LABEL: Record<DeltaConfidence, string> = {
  high: 'alta',
  medium: 'média',
  low: 'baixa',
};

// Always distance-domain (see spec fase-c1-delta-chart.md §5) — independent
// of the Tempo/Distância toggle that governs the 6 channels + battery above.
function deltaOption(traces: DriverTrace[], delta: DeltaResult, corners: Corner[], sectors: SectorBoundary[]): ChartOption {
  const data: Array<[number, number]> = delta.points.map((p) => [p.distanceM, Math.round(p.deltaS * 1000) / 1000]);
  const xMax = delta.points.length > 0 ? delta.points[delta.points.length - 1].distanceM : 0;
  const referenceName = traces[0].driver.name_acronym;
  const otherName = traces[1].driver.name_acronym;
  return {
    animation: false,
    legend: { show: false },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis',
      formatter: (params: Array<{ axisValue?: number; value?: [number, number] }>) => {
        const axisValue = params[0]?.axisValue ?? params[0]?.value?.[0];
        if (axisValue == null) return '';
        const deltaS = nearestPointValue(data, axisValue, DISTANCE_MAX_GAP_M);
        if (deltaS == null) return `${axisValue.toFixed(0)}m na volta<br/>sem dado neste ponto`;
        const sign = deltaS > 0 ? '+' : '';
        const behind = deltaS >= 0 ? otherName : referenceName;
        return `${axisValue.toFixed(0)}m na volta<br/>Delta: ${sign}${deltaS.toFixed(3)}s (${behind} atrás)`;
      },
    },
    grid: { left: 56, right: 16, top: 26, bottom: 30 },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      ...axisStyle,
      splitLine: { show: false },
      axisLabel: { ...axisStyle.axisLabel, show: true, formatter: axisLabelFormatter('m') },
    },
    yAxis: {
      type: 'value',
      name: `Delta (s) · ref. ${referenceName}`,
      nameTextStyle: { color: INK_DIM, fontSize: 11, align: 'left', padding: [0, 0, 0, -40] },
      scale: true,
      ...axisStyle,
    },
    dataZoom: [{ type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true }],
    series: [
      {
        name: 'Delta',
        type: 'line',
        symbol: 'none',
        color: ACCENT,
        lineStyle: { width: 2 },
        data,
        markLine: trackMarkersLine(corners, sectors, false, true),
      },
    ],
  };
}

export function TelemetryView({
  state,
  update,
}: {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}) {
  const drivers = useDrivers(state.session);
  const laps = useLaps(state.session);
  const [hiddenDrivers, setHiddenDrivers] = useState<Set<number>>(new Set());
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('time');
  const [brakeMode, setBrakeMode] = useState<'onoff' | 'pressure'>('onoff');

  const toggleDriverVisibility = (driverNumber: number) => {
    setHiddenDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(driverNumber)) next.delete(driverNumber);
      else next.add(driverNumber);
      return next;
    });
  };

  const selected: Driver[] = useMemo(
    () => (drivers.data ?? []).filter((d) => state.drivers.includes(d.driver_number)),
    [drivers.data, state.drivers],
  );

  // Lap picker is driven by the first selected driver; default = their fastest lap.
  const referenceLaps = useMemo(
    () =>
      (laps.data ?? []).filter(
        (lap) => lap.driver_number === selected[0]?.driver_number && lap.lap_duration != null,
      ),
    [laps.data, selected],
  );
  const fastestLap = referenceLaps.reduce<Lap | null>(
    (best, lap) => (best == null || lap.lap_duration! < best.lap_duration! ? lap : best),
    null,
  );
  const lapNumber = state.lap ?? fastestLap?.lap_number ?? null;

  const lapsByDriver: Array<{ driver: Driver; lap: Lap | undefined }> = selected.map((driver) => ({
    driver,
    lap: (laps.data ?? []).find(
      (lap) => lap.driver_number === driver.driver_number && lap.lap_number === lapNumber,
    ),
  }));

  const windowA = lapsByDriver[0]?.lap ? lapDateWindow(lapsByDriver[0].lap) : null;
  const windowB = lapsByDriver[1]?.lap ? lapDateWindow(lapsByDriver[1].lap) : null;
  const carA = useCarData(state.session, lapsByDriver[0]?.driver.driver_number ?? null, windowA);
  const carB = useCarData(state.session, lapsByDriver[1]?.driver.driver_number ?? null, windowB);

  if (state.drivers.length === 0) {
    return <EmptyBox message="Selecione ao menos um piloto acima para ver a telemetria (até 2 para comparar)." />;
  }
  if (laps.isError) return <ErrorBox onRetry={() => laps.refetch()} />;
  if (laps.isPending || drivers.isPending) return <Loading label="Carregando voltas…" />;
  if (referenceLaps.length === 0 || lapNumber == null) {
    return <EmptyBox message="Sem voltas com telemetria disponível nesta sessão." />;
  }
  if (carA.isError) return <ErrorBox onRetry={() => carA.refetch()} />;
  if (carB.isError) return <ErrorBox onRetry={() => carB.refetch()} />;

  const dashed =
    selected.length === 2 && teamColor(selected[0].team_colour) === teamColor(selected[1].team_colour);
  const traces: DriverTrace[] = [];
  if (lapsByDriver[0]?.lap && carA.data?.length) {
    traces.push({ driver: lapsByDriver[0].driver, lap: lapsByDriver[0].lap, samples: carA.data, dashed: false });
  }
  if (lapsByDriver[1]?.lap && carB.data?.length) {
    traces.push({ driver: lapsByDriver[1].driver, lap: lapsByDriver[1].lap, samples: carB.data, dashed });
  }

  const loadingTelemetry =
    (windowA != null && carA.isPending) || (windowB != null && carB.isPending);

  // xValues/xMax are derived from ALL traces (not just visible ones) so
  // hiding a driver never rescales the axis — same invariant as before.
  const allXValues = traces.map((trace) => computeXValues(trace, xAxisMode));
  const xMax =
    xAxisMode === 'distance'
      ? Math.ceil(Math.max(...allXValues.map((values) => values[values.length - 1] ?? 0), 1))
      : Math.ceil(Math.max(...traces.map((t) => t.lap.lap_duration ?? 0), 1));
  const unitSuffix = xAxisMode === 'distance' ? 'm' : 's';

  const visibleTraces = traces.filter((t) => !hiddenDrivers.has(t.driver.driver_number));
  const visibleXValues = traces
    .map((t, i) => ({ trace: t, values: allXValues[i] }))
    .filter(({ trace }) => !hiddenDrivers.has(trace.driver.driver_number))
    .map(({ values }) => values);

  // Distance-based x-values, computed regardless of the toggle: the Delta
  // chart (fase-c1) is always distance-domain, and corners/sectors below
  // need a stable distance reference even when the toggle is on "Tempo".
  const distanceXValues = traces.map((trace) => computeXValues(trace, 'distance'));

  // Corners are detected once, on the first available trace (same
  // "reference driver" convention as the lap picker) — position only makes
  // sense in distance terms, since time-domain positions wouldn't align
  // between laps.
  const corners: Corner[] =
    traces.length > 0
      ? detectCorners(
          traces[0].samples.map((sample, i) => ({ distanceM: distanceXValues[0][i], speed: sample.speed })),
        )
      : [];

  // Sector boundaries use REAL timing data (duration_sector_*), snapped to
  // the nearest sample's distance — unlike corners, which are fully
  // heuristic. Same reference trace as corners.
  const sectors: SectorBoundary[] =
    traces.length > 0
      ? sectorBoundaries(
          traces[0].lap,
          traces[0].samples.map((s) => Date.parse(s.date)),
          distanceXValues[0],
        )
      : [];

  // The 6 channels + battery keep their current behavior: markers only show
  // in Distance mode. The Delta chart always receives corners/sectors.
  const channelCorners = xAxisMode === 'distance' ? corners : [];
  const channelSectors = xAxisMode === 'distance' ? sectors : [];

  // Delta only exists with exactly 2 drivers WITH telemetry (traces, not the
  // legend-hidden subset — hiding a driver's line elsewhere shouldn't hide
  // the comparison itself).
  const deltaResult: DeltaResult | null =
    traces.length === 2 ? computeDelta(traces[0].samples, traces[1].samples) : null;

  // Insights (fase-c2) derive from the delta + corners; same 2-driver gating.
  const insights =
    traces.length === 2 && deltaResult
      ? {
          sectors: sectorTimeDeltas(traces[0].lap, traces[1].lap),
          segments: segmentInsights(
            deltaResult.points,
            corners,
            traces[1].driver.name_acronym,
            traces[0].samples,
            distanceXValues[0],
            traces[1].samples,
            distanceXValues[1],
          ),
        }
      : null;

  return (
    <div className={styles.view}>
      <div className={styles.controls}>
        <label className={styles.lapField}>
          <span>Volta</span>
          <select value={lapNumber} onChange={(e) => update({ lap: Number(e.target.value) })}>
            {referenceLaps.map((lap) => (
              <option key={lap.lap_number} value={lap.lap_number}>
                {`Volta ${lap.lap_number} — ${formatLapTime(lap.lap_duration)}`}
                {fastestLap?.lap_number === lap.lap_number ? ' ⚡' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.lapTimes}>
          {lapsByDriver.map(({ driver, lap }) => {
            const hidden = hiddenDrivers.has(driver.driver_number);
            return (
              <button
                key={driver.driver_number}
                type="button"
                className={hidden ? `${styles.lapChip} ${styles.lapChipHidden}` : styles.lapChip}
                style={{ borderColor: teamColor(driver.team_colour) }}
                onClick={() => toggleDriverVisibility(driver.driver_number)}
                title={hidden ? `Mostrar ${driver.name_acronym}` : `Ocultar ${driver.name_acronym}`}
              >
                {driver.name_acronym} {lap ? formatLapTime(lap.lap_duration) : 'sem volta'}
              </button>
            );
          })}
        </div>
        <div className={styles.axisToggle} role="group" aria-label="Eixo do gráfico">
          <button
            type="button"
            className={xAxisMode === 'time' ? `${styles.axisButton} ${styles.axisButtonOn}` : styles.axisButton}
            onClick={() => setXAxisMode('time')}
          >
            Tempo
          </button>
          <button
            type="button"
            className={xAxisMode === 'distance' ? `${styles.axisButton} ${styles.axisButtonOn}` : styles.axisButton}
            onClick={() => setXAxisMode('distance')}
          >
            Distância
          </button>
        </div>
        {state.session != null && lapNumber != null && traces.length > 0 && (
          <ExportButton sessionKey={state.session} lapNumber={lapNumber} traces={traces} />
        )}
      </div>

      {loadingTelemetry ? (
        <Loading label="Carregando telemetria…" />
      ) : traces.length === 0 ? (
        <EmptyBox message="Sem telemetria para esta volta." />
      ) : visibleTraces.length === 0 ? (
        <>
          <SummaryCards traces={traces} />
          <EmptyBox message="Todos os pilotos estão ocultos — clique num chip acima para mostrar." />
        </>
      ) : (
        <>
          <SummaryCards traces={traces} />
          {traces.length === 2 && deltaResult && deltaResult.points.length > 0 ? (
            <section className={styles.panel} aria-label="Delta entre pilotos">
              <div className={styles.deltaHeader}>
                <span>
                  Delta acumulado — referência: {traces[0].driver.name_acronym}
                </span>
                <span className={styles.confidenceBadge} data-level={deltaResult.confidence}>
                  Confiança do alinhamento: {CONFIDENCE_LABEL[deltaResult.confidence]}
                </span>
              </div>
              <EChart option={deltaOption(traces, deltaResult, corners, sectors)} height={180} />
              <p className={styles.hint}>
                Sempre no eixo de distância, independente do toggle Tempo/Distância acima. Delta
                positivo = {traces[1].driver.name_acronym} mais lento que {traces[0].driver.name_acronym}{' '}
                naquele ponto da pista; negativo = mais rápido.
              </p>
            </section>
          ) : traces.length < 2 ? (
            <section className={styles.panel} aria-label="Delta entre pilotos">
              <div className={styles.deltaHeader}>
                <span>Delta acumulado</span>
              </div>
              <EmptyBox message="O gráfico de Delta exige exatamente 2 pilotos com telemetria — selecione o segundo piloto acima para comparar." />
            </section>
          ) : null}
          {traces.length === 2 && deltaResult && insights && (
            <InsightsPanel
              driverA={traces[0].driver}
              driverB={traces[1].driver}
              sectorDeltas={insights.sectors}
              segments={insights.segments}
              confidence={deltaResult.confidence}
            />
          )}
          <section className={styles.panel} aria-label="Telemetria do carro">
          {visibleTraces.length > 1 && (
            <EChart
              option={{
                legend: { ...legendStyle, data: visibleTraces.map((t) => t.driver.name_acronym), top: 0 },
                grid: { height: 0, top: 24 },
                xAxis: { show: false, type: 'value' },
                yAxis: { show: false, type: 'value' },
                series: visibleTraces.map((t) => ({
                  name: t.driver.name_acronym,
                  type: 'line',
                  data: [],
                  color: teamColor(t.driver.team_colour),
                })),
              }}
              height={30}
            />
          )}
          {CHANNELS.map((channel) =>
            channel.label === 'Freio' ? (
              <div key={channel.label} className={styles.brakePanel}>
                <div className={styles.axisToggle} role="group" aria-label="Modo do canal de freio">
                  <button
                    type="button"
                    className={
                      brakeMode === 'onoff' ? `${styles.axisButton} ${styles.axisButtonOn}` : styles.axisButton
                    }
                    onClick={() => setBrakeMode('onoff')}
                  >
                    On/Off
                  </button>
                  <button
                    type="button"
                    className={
                      brakeMode === 'pressure' ? `${styles.axisButton} ${styles.axisButtonOn}` : styles.axisButton
                    }
                    onClick={() => setBrakeMode('pressure')}
                  >
                    Pressão
                  </button>
                </div>
                <EChart
                  option={
                    brakeMode === 'pressure'
                      ? brakePressureOption(visibleTraces, visibleXValues, xMax, unitSuffix, channelCorners, channelSectors)
                      : channelOption(
                          channel,
                          visibleTraces,
                          visibleXValues,
                          xMax,
                          false,
                          unitSuffix,
                          channelCorners,
                          channelSectors,
                        )
                  }
                  height={channel.height}
                  group="telemetry"
                />
              </div>
            ) : (
              <EChart
                key={channel.label}
                option={channelOption(
                  channel,
                  visibleTraces,
                  visibleXValues,
                  xMax,
                  false,
                  unitSuffix,
                  channelCorners,
                  channelSectors,
                )}
                height={channel.height}
                group="telemetry"
              />
            ),
          )}
          <EChart
            option={batteryOption(visibleTraces, visibleXValues, xMax, unitSuffix, channelCorners, channelSectors)}
            height={140}
            group="telemetry"
          />
          <p className={styles.hint}>
            Arraste para mover · roda do mouse ou pinça para dar zoom · os 6 canais ficam sincronizados
          </p>
          {xAxisMode === 'distance' && corners.length > 0 && (
            <p className={styles.hint}>
              ⚠ A numeração das curvas (T1, T2…, tracejado) é APROXIMADA — calculada pelos vales de
              velocidade desta volta, não são os números oficiais do circuito. Os limites de setor
              (S1/S2/S3, linha sólida) usam o TEMPO real de cronometragem; só a posição em metros é
              aproximada (amostra mais próxima do instante do limite).
            </p>
          )}
          <p className={styles.hint}>
            ⚠ Bateria é uma ESTIMATIVA — a F1 não publica o dado real. Modelo 2026: deploy 350 kW
            (reduzindo acima de 290 km/h), recuperação 350 kW na frenagem com teto de 8,5 MJ/volta,
            capacidade útil 4 MJ, volta iniciando em 100%.
          </p>
          {brakeMode === 'pressure' && (
            <p className={styles.hint}>
              ⚠ Pressão de freio é uma ESTIMATIVA — a OpenF1 só publica o sinal binário (freando/solto).
              100% representa a frenagem mais forte DESTA volta (calibração relativa, não um valor físico
              absoluto); as demais frenagens aparecem em proporção a esse pico.
            </p>
          )}
          </section>
        </>
      )}
    </div>
  );
}
