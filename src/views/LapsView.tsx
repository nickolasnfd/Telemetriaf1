import { useMemo } from 'react';
import { useDrivers, useLaps, usePits, useStints } from '../api/queries';
import type { Driver } from '../api/types';
import { EChart, type ChartOption } from '../components/EChart';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { axisStyle, compoundInfo, INK_DIM, legendStyle, tooltipStyle } from '../lib/chartTheme';
import { formatLapTime, teamColor } from '../lib/format';
import type { AppState } from '../lib/urlState';
import styles from './LapsView.module.css';

interface TooltipParam {
  seriesName: string;
  marker: string;
  value: [number, number];
}

function lapAxisLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds - minutes * 60)).padStart(2, '0')}`;
}

export function LapsView({ state }: { state: AppState }) {
  const drivers = useDrivers(state.session);
  const laps = useLaps(state.session);
  const stints = useStints(state.session);
  const pits = usePits(state.session);

  const selected: Driver[] = useMemo(
    () => (drivers.data ?? []).filter((d) => state.drivers.includes(d.driver_number)),
    [drivers.data, state.drivers],
  );

  // Same-team pairs share a hue; the second line goes dashed so identity
  // never depends on color alone.
  const dashed = selected.length === 2 && teamColor(selected[0].team_colour) === teamColor(selected[1].team_colour);

  const option: ChartOption | null = useMemo(() => {
    if (!laps.data || selected.length === 0) return null;
    const pitLapsByDriver = new Map<number, Map<number, number | null>>(
      selected.map((driver) => [
        driver.driver_number,
        new Map(
          (pits.data ?? [])
            .filter((pit) => pit.driver_number === driver.driver_number)
            .map((pit) => [pit.lap_number, pit.pit_duration]),
        ),
      ]),
    );

    const series = selected.flatMap((driver, index) => {
      const color = teamColor(driver.team_colour);
      const driverLaps = laps.data
        .filter((lap) => lap.driver_number === driver.driver_number && lap.lap_duration != null)
        .map((lap) => [lap.lap_number, lap.lap_duration] as [number, number]);
      const pitLaps = pitLapsByDriver.get(driver.driver_number)!;
      return [
        {
          name: driver.name_acronym,
          type: 'line',
          data: driverLaps,
          color,
          lineStyle: { width: 2, type: index === 1 && dashed ? 'dashed' : 'solid' },
          symbol: 'circle',
          symbolSize: 5,
          emphasis: { scale: 2 },
        },
        {
          name: `${driver.name_acronym} · pit`,
          type: 'scatter',
          data: driverLaps.filter(([lapNumber]) => pitLaps.has(lapNumber)),
          color,
          symbol: 'triangle',
          symbolSize: 11,
          itemStyle: { borderColor: '#101318', borderWidth: 2 },
          tooltip: {
            formatter: (p: { value: [number, number] }) => {
              const duration = pitLaps.get(p.value[0]);
              return `PIT na volta ${p.value[0]}${duration ? ` — parada de ${duration.toFixed(1)}s` : ''}`;
            },
          },
        },
      ];
    });

    return {
      legend: { ...legendStyle, data: selected.map((d) => d.name_acronym), top: 0 },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        formatter: (params: TooltipParam[]) =>
          [`Volta ${params[0]?.value[0]}`]
            .concat(params.map((p) => `${p.marker} ${p.seriesName}: ${formatLapTime(p.value[1])}`))
            .join('<br/>'),
      },
      grid: { left: 56, right: 16, top: 32, bottom: 32 },
      xAxis: { type: 'value', name: 'volta', nameTextStyle: { color: INK_DIM }, min: 1, minInterval: 1, ...axisStyle, splitLine: { show: false } },
      yAxis: { type: 'value', scale: true, ...axisStyle, axisLabel: { ...axisStyle.axisLabel, formatter: lapAxisLabel } },
      dataZoom: [{ type: 'inside' }],
      series,
    };
  }, [laps.data, pits.data, selected, dashed]);

  if (state.drivers.length === 0) {
    return <EmptyBox message="Selecione ao menos um piloto acima para ver os tempos de volta." />;
  }
  if (laps.isError) return <ErrorBox onRetry={() => laps.refetch()} />;
  if (stints.isError) return <ErrorBox onRetry={() => stints.refetch()} />;
  if (laps.isPending || stints.isPending || pits.isPending || drivers.isPending) {
    return <Loading label="Carregando voltas…" />;
  }
  if (!option || laps.data.length === 0) {
    return <EmptyBox message="Sem voltas registradas para esta sessão." />;
  }

  const totalLaps = Math.max(...laps.data.map((lap) => lap.lap_number));

  return (
    <div className={styles.view}>
      <section className={styles.panel} aria-label="Tempos de volta">
        <h2 className={styles.title}>Tempos de volta</h2>
        <EChart option={option} height={340} />
      </section>

      <section className={styles.panel} aria-label="Stints de pneu">
        <h2 className={styles.title}>Stints e paradas</h2>
        {selected.map((driver) => {
          const driverStints = (stints.data ?? [])
            .filter((stint) => stint.driver_number === driver.driver_number)
            .sort((a, b) => a.stint_number - b.stint_number);
          return (
            <div key={driver.driver_number} className={styles.stintRow}>
              <span className={styles.stintDriver} style={{ borderColor: teamColor(driver.team_colour) }}>
                {driver.name_acronym}
              </span>
              <div className={styles.stintTrack}>
                {driverStints.length === 0 && <span className={styles.stintEmpty}>sem dados de stint</span>}
                {driverStints.map((stint) => {
                  const compound = compoundInfo(stint.compound);
                  const width = ((stint.lap_end - stint.lap_start + 1) / totalLaps) * 100;
                  return (
                    <div
                      key={stint.stint_number}
                      className={styles.stintSeg}
                      style={{ width: `${width}%`, background: compound.color, color: compound.darkText ? '#15181d' : '#fff' }}
                      title={`Stint ${stint.stint_number} · ${compound.labelPt} · voltas ${stint.lap_start}–${stint.lap_end}`}
                    >
                      {compound.letter}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className={styles.legendNote}>
          S macio · M médio · H duro · I intermediário · W chuva · ▲ no gráfico = volta com pit stop
        </p>
      </section>
    </div>
  );
}
