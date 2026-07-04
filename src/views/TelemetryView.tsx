import { useMemo, useState } from 'react';
import { useCarData, useDrivers, useLaps } from '../api/queries';
import type { CarData, Driver, Lap } from '../api/types';
import { EChart, type ChartOption } from '../components/EChart';
import { ExportButton } from '../components/ExportButton';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { SummaryCards } from '../components/SummaryCards';
import { estimateBattery } from '../lib/batteryModel';
import { axisStyle, INK_DIM, legendStyle, tooltipStyle } from '../lib/chartTheme';
import { detectCorners, type Corner } from '../lib/corners';
import { cumulativeDistance } from '../lib/distance';
import { formatLapTime, teamColor } from '../lib/format';
import { isDrsOpen, lapDateWindow } from '../lib/telemetry';
import { buildAxisTooltipLines, DISTANCE_MAX_GAP_M, TIME_MAX_GAP_S } from '../lib/tooltip';
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

// Dashed vertical lines marking heuristically-detected corners, drawn on
// every channel for visual alignment; the "Tn" text only renders on the
// channel that opts in (the speed chart) to avoid repeating it 7 times.
function cornerMarkLine(corners: Corner[], showLabels: boolean) {
  if (corners.length === 0) return undefined;
  return {
    silent: true,
    symbol: 'none',
    lineStyle: { color: INK_DIM, type: 'dashed', width: 1, opacity: 0.5 },
    label: showLabels
      ? {
          show: true,
          formatter: (p: { name: string }) => p.name,
          color: INK_DIM,
          fontSize: 10,
          position: 'insideEndTop',
        }
      : { show: false },
    data: corners.map((c) => ({ xAxis: c.distanceM, name: `T${c.index}` })),
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
      ...(i === 0 ? { markLine: cornerMarkLine(corners, Boolean(channel.cornerLabels)) } : {}),
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
      ...(i === 0 ? { markLine: cornerMarkLine(corners, false) } : {}),
    })),
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

  // Corners are detected once, on the first available trace (same
  // "reference driver" convention as the lap picker) — only meaningful in
  // distance mode, since time-domain positions wouldn't align between laps.
  const corners: Corner[] =
    xAxisMode === 'distance' && traces.length > 0
      ? detectCorners(
          traces[0].samples.map((sample, i) => ({ distanceM: allXValues[0][i], speed: sample.speed })),
        )
      : [];

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
          {CHANNELS.map((channel) => (
            <EChart
              key={channel.label}
              option={channelOption(channel, visibleTraces, visibleXValues, xMax, false, unitSuffix, corners)}
              height={channel.height}
              group="telemetry"
            />
          ))}
          <EChart
            option={batteryOption(visibleTraces, visibleXValues, xMax, unitSuffix, corners)}
            height={140}
            group="telemetry"
          />
          <p className={styles.hint}>
            Arraste para mover · roda do mouse ou pinça para dar zoom · os 6 canais ficam sincronizados
          </p>
          {xAxisMode === 'distance' && corners.length > 0 && (
            <p className={styles.hint}>
              ⚠ A numeração das curvas (T1, T2…) é APROXIMADA — calculada pelos vales de velocidade
              desta volta, não são os números oficiais do circuito.
            </p>
          )}
          <p className={styles.hint}>
            ⚠ Bateria é uma ESTIMATIVA — a F1 não publica o dado real. Modelo 2026: deploy 350 kW
            (reduzindo acima de 290 km/h), recuperação 350 kW na frenagem com teto de 8,5 MJ/volta,
            capacidade útil 4 MJ, volta iniciando em 100%.
          </p>
          </section>
        </>
      )}
    </div>
  );
}
