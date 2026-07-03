import { useMemo } from 'react';
import { useCarData, useDrivers, useLaps } from '../api/queries';
import type { CarData, Driver, Lap } from '../api/types';
import { EChart, type ChartOption } from '../components/EChart';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { estimateBattery } from '../lib/batteryModel';
import { axisStyle, INK_DIM, legendStyle, tooltipStyle } from '../lib/chartTheme';
import { formatLapTime, teamColor } from '../lib/format';
import { isDrsOpen, lapDateWindow } from '../lib/telemetry';
import { buildAxisTooltipLines } from '../lib/tooltip';
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

// Elapsed-time chart data, computed once per trace and shared by both the
// series and the tooltip lookup — the tooltip must never disagree with
// what's actually drawn (see LEARNINGS: ECharts' own axis-trigger `params`
// can drop a series that clearly has a rendered point at that x).
function traceChannelData(trace: DriverTrace, map: (sample: CarData) => number): Array<[number, number]> {
  const lapStartMs = Date.parse(trace.lap.date_start!);
  return trace.samples.map((sample) => [
    Math.round(((Date.parse(sample.date) - lapStartMs) / 1000) * 100) / 100,
    map(sample),
  ]);
}

function traceBatteryData(trace: DriverTrace): Array<[number, number]> {
  const lapStartMs = Date.parse(trace.lap.date_start!);
  return estimateBattery(trace.samples).map((point) => [
    Math.round(((Date.parse(point.date) - lapStartMs) / 1000) * 100) / 100,
    Math.round(point.socPct * 10) / 10,
  ]);
}

function axisTooltipFormatter(
  traces: DriverTrace[],
  chartData: Array<Array<[number, number]>>,
  format: (value: number) => string,
) {
  return (params: Array<{ axisValue?: number; value?: [number, number] }>) => {
    const axisValue = params[0]?.axisValue ?? params[0]?.value?.[0];
    if (axisValue == null) return '';
    return [`${axisValue.toFixed(1)}s na volta`]
      .concat(
        buildAxisTooltipLines(
          axisValue,
          traces.map((trace, i) => ({ driver: trace.driver, data: chartData[i] })),
          format,
        ),
      )
      .join('<br/>');
  };
}

function channelOption(
  channel: Channel,
  traces: DriverTrace[],
  xMax: number,
  isLast: boolean,
): ChartOption {
  const chartData = traces.map((trace) => traceChannelData(trace, channel.map));
  return {
    animation: false,
    legend: { show: false },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis',
      formatter: axisTooltipFormatter(traces, chartData, channel.format),
    },
    grid: { left: 56, right: 16, top: 26, bottom: isLast ? 30 : 8 },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      ...axisStyle,
      splitLine: { show: false },
      axisLabel: { ...axisStyle.axisLabel, show: isLast, formatter: (v: number) => `${v}s` },
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
    })),
  };
}

// Battery is integrated over the lap (stateful), unlike the per-sample
// CHANNELS above, so it gets a dedicated option builder.
function batteryOption(traces: DriverTrace[], xMax: number): ChartOption {
  const chartData = traces.map((trace) => traceBatteryData(trace));
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
      ),
    },
    grid: { left: 56, right: 16, top: 26, bottom: 30 },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      ...axisStyle,
      splitLine: { show: false },
      axisLabel: { ...axisStyle.axisLabel, show: true, formatter: (v: number) => `${v}s` },
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
  const xMax = Math.ceil(Math.max(...traces.map((t) => t.lap.lap_duration ?? 0), 1));

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
          {lapsByDriver.map(({ driver, lap }) => (
            <span
              key={driver.driver_number}
              className={styles.lapChip}
              style={{ borderColor: teamColor(driver.team_colour) }}
            >
              {driver.name_acronym} {lap ? formatLapTime(lap.lap_duration) : 'sem volta'}
            </span>
          ))}
        </div>
      </div>

      {loadingTelemetry ? (
        <Loading label="Carregando telemetria…" />
      ) : traces.length === 0 ? (
        <EmptyBox message="Sem telemetria para esta volta." />
      ) : (
        <section className={styles.panel} aria-label="Telemetria do carro">
          {traces.length > 1 && (
            <EChart
              option={{
                legend: { ...legendStyle, data: traces.map((t) => t.driver.name_acronym), top: 0 },
                grid: { height: 0, top: 24 },
                xAxis: { show: false, type: 'value' },
                yAxis: { show: false, type: 'value' },
                series: traces.map((t) => ({
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
              option={channelOption(channel, traces, xMax, false)}
              height={channel.height}
              group="telemetry"
            />
          ))}
          <EChart option={batteryOption(traces, xMax)} height={140} group="telemetry" />
          <p className={styles.hint}>
            Arraste para mover · roda do mouse ou pinça para dar zoom · os 6 canais ficam sincronizados
          </p>
          <p className={styles.hint}>
            ⚠ Bateria é uma ESTIMATIVA — a F1 não publica o dado real. Modelo 2026: deploy 350 kW
            (reduzindo acima de 290 km/h), recuperação 350 kW na frenagem com teto de 8,5 MJ/volta,
            capacidade útil 4 MJ, volta iniciando em 100%.
          </p>
        </section>
      )}
    </div>
  );
}
