import { useMemo } from 'react';
import { useRaceControl, useWeather } from '../api/queries';
import type { RaceControl, Weather } from '../api/types';
import { EChart, type ChartOption } from '../components/EChart';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { axisStyle, legendStyle, tooltipStyle } from '../lib/chartTheme';
import { formatClock } from '../lib/format';
import type { AppState } from '../lib/urlState';
import styles from './SessionView.module.css';

// Reuses the CVD-validated blue/orange pair from the fixture palette:
// warm = track, cool = air.
const TRACK_COLOR = '#E06D10';
const AIR_COLOR = '#3671C6';
const RAIN_SHADE = 'rgba(54, 113, 198, 0.18)';

interface Badge {
  label: string;
  className: string;
}

function badgeFor(message: RaceControl): Badge {
  if (message.category === 'SafetyCar') return { label: 'SAFETY CAR', className: styles.badgeSc };
  if (message.category === 'Drs') return { label: 'DRS', className: styles.badgeNeutral };
  switch (message.flag) {
    case 'GREEN':
      return { label: 'VERDE', className: styles.badgeGreen };
    case 'CLEAR':
      return { label: 'LIVRE', className: styles.badgeGreen };
    case 'YELLOW':
      return { label: 'AMARELA', className: styles.badgeYellow };
    case 'DOUBLE YELLOW':
      return { label: 'AMARELA 2X', className: styles.badgeYellow };
    case 'RED':
      return { label: 'VERMELHA', className: styles.badgeRed };
    case 'CHEQUERED':
      return { label: 'QUADRICULADA', className: styles.badgeNeutral };
    case 'BLUE':
      return { label: 'AZUL', className: styles.badgeBlue };
    default:
      return { label: message.category.toUpperCase(), className: styles.badgeNeutral };
  }
}

// Contiguous rainfall==1 stretches become shaded bands on the chart.
function rainRanges(samples: Weather[]): Array<[string, string]> {
  const ranges: Array<[string, string]> = [];
  let start: string | null = null;
  for (let i = 0; i < samples.length; i++) {
    const wet = samples[i].rainfall > 0;
    if (wet && start == null) start = samples[i].date;
    if (!wet && start != null) {
      ranges.push([start, samples[i].date]);
      start = null;
    }
  }
  if (start != null) ranges.push([start, samples[samples.length - 1].date]);
  return ranges;
}

export function SessionView({ state }: { state: AppState }) {
  const weather = useWeather(state.session);
  const raceControl = useRaceControl(state.session);

  const option: ChartOption | null = useMemo(() => {
    if (!weather.data || weather.data.length === 0) return null;
    const samples = weather.data;
    return {
      legend: { ...legendStyle, data: ['Pista', 'Ar'], top: 0 },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        valueFormatter: (value: number) => `${value.toFixed(1)} °C`,
      },
      grid: { left: 48, right: 16, top: 34, bottom: 28 },
      xAxis: {
        type: 'time',
        ...axisStyle,
        splitLine: { show: false },
        axisLabel: { ...axisStyle.axisLabel, formatter: '{HH}:{mm}' },
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: '°C',
        nameTextStyle: { color: axisStyle.axisLabel.color },
        ...axisStyle,
      },
      series: [
        {
          name: 'Pista',
          type: 'line',
          color: TRACK_COLOR,
          symbol: 'none',
          lineStyle: { width: 2 },
          data: samples.map((w) => [w.date, w.track_temperature]),
          markArea: {
            silent: true,
            itemStyle: { color: RAIN_SHADE },
            label: { show: true, color: '#9ec3f0', fontSize: 11, position: 'insideTop' },
            data: rainRanges(samples).map(([from, to]) => [{ name: 'chuva', xAxis: from }, { xAxis: to }]),
          },
        },
        {
          name: 'Ar',
          type: 'line',
          color: AIR_COLOR,
          symbol: 'none',
          lineStyle: { width: 2 },
          data: samples.map((w) => [w.date, w.air_temperature]),
        },
      ],
    };
  }, [weather.data]);

  const latest = weather.data?.[weather.data.length - 1];

  if (weather.isError) return <ErrorBox onRetry={() => weather.refetch()} />;
  if (raceControl.isError) return <ErrorBox onRetry={() => raceControl.refetch()} />;
  if (weather.isPending || raceControl.isPending) return <Loading label="Carregando dados da sessão…" />;

  return (
    <div className={styles.view}>
      <section className={styles.panel} aria-label="Clima">
        <h2 className={styles.title}>Clima</h2>
        {option ? (
          <>
            <EChart option={option} height={260} />
            {latest && (
              <p className={styles.weatherNow}>
                Última medição: pista {latest.track_temperature.toFixed(1)} °C · ar{' '}
                {latest.air_temperature.toFixed(1)} °C · umidade {Math.round(latest.humidity)}% · vento{' '}
                {latest.wind_speed.toFixed(1)} m/s · {latest.rainfall > 0 ? 'chovendo' : 'sem chuva'}
              </p>
            )}
          </>
        ) : (
          <EmptyBox message="Sem dados de clima para esta sessão." />
        )}
      </section>

      <section className={styles.panel} aria-label="Direção de prova">
        <h2 className={styles.title}>Direção de prova</h2>
        {raceControl.data.length === 0 ? (
          <EmptyBox message="Sem mensagens da direção de prova para esta sessão." />
        ) : (
          <ol className={styles.messages}>
            {raceControl.data.map((message, index) => {
              const badge = badgeFor(message);
              return (
                <li key={`${message.date}-${index}`} className={styles.message}>
                  <span className={styles.time}>{formatClock(message.date)}</span>
                  <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
                  <span className={styles.text}>
                    {message.message}
                    {message.lap_number != null && <span className={styles.lapRef}> · volta {message.lap_number}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
