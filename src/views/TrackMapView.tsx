import { useMemo, useState } from 'react';
import { useCarData, useDrivers, useLaps, useLocation } from '../api/queries';
import type { Lap } from '../api/types';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { detectCorners } from '../lib/corners';
import { computeDelta } from '../lib/delta';
import { cumulativeDistance } from '../lib/distance';
import { teamColor } from '../lib/format';
import { sectorBoundaries } from '../lib/sectors';
import { lapDateWindow } from '../lib/telemetry';
import { attachDistances, buildTrackPath, normalizeTrackPoints } from '../lib/trackMap';
import { colorSegments, cornerSegments, sectorSegments } from '../lib/trackColoring';
import type { AppState } from '../lib/urlState';
import styles from './TrackMapView.module.css';

type Granularity = 'sector' | 'corner';

export function TrackMapView({ state }: { state: AppState }) {
  const drivers = useDrivers(state.session);
  const laps = useLaps(state.session);
  const [granularity, setGranularity] = useState<Granularity>('sector');

  // Reference driver only (traces[0], spec fase-d1 §5) — the outline itself
  // doesn't need a 2nd driver's location, unlike the coloring below (D.2),
  // which only needs the 2nd driver's car_data for the delta. Falls back to
  // the session's first driver when none is explicitly selected (adendo
  // 2026-07-05): the shape doesn't depend on whose lap it is.
  const explicitDriver = useMemo(
    () => (drivers.data ?? []).find((d) => d.driver_number === state.drivers[0]),
    [drivers.data, state.drivers],
  );
  const referenceDriver = explicitDriver ?? drivers.data?.[0];
  const isAutoDriver = state.drivers.length === 0;

  const secondDriver = useMemo(
    () => (drivers.data ?? []).find((d) => d.driver_number === state.drivers[1]),
    [drivers.data, state.drivers],
  );

  const referenceLaps = useMemo(
    () =>
      (laps.data ?? []).filter(
        (lap) => lap.driver_number === referenceDriver?.driver_number && lap.lap_duration != null,
      ),
    [laps.data, referenceDriver],
  );
  const fastestLap = referenceLaps.reduce<Lap | null>(
    (best, lap) => (best == null || lap.lap_duration! < best.lap_duration! ? lap : best),
    null,
  );
  const lapNumber = state.lap ?? fastestLap?.lap_number ?? null;
  const lap = referenceLaps.find((candidate) => candidate.lap_number === lapNumber);
  const referenceWindow = lap ? lapDateWindow(lap) : null;

  const location = useLocation(state.session, referenceDriver?.driver_number ?? null, referenceWindow);

  // Coloring (D.2) needs both drivers' car_data for the delta, gated the
  // same way as the Delta chart in Telemetria (exactly 2 drivers). Only
  // fetched in that case (spec fase-d2-track-coloring.md §5).
  const wantsColoring = state.drivers.length === 2 && secondDriver != null;
  const secondLap = (laps.data ?? []).find(
    (candidate) => candidate.driver_number === secondDriver?.driver_number && candidate.lap_number === lapNumber,
  );
  const secondWindow = secondLap ? lapDateWindow(secondLap) : null;
  const carA = useCarData(
    state.session,
    wantsColoring ? (referenceDriver?.driver_number ?? null) : null,
    wantsColoring ? referenceWindow : null,
  );
  const carB = useCarData(
    state.session,
    wantsColoring ? (secondDriver?.driver_number ?? null) : null,
    wantsColoring ? secondWindow : null,
  );

  if (laps.isError) return <ErrorBox onRetry={() => laps.refetch()} />;
  if (drivers.isError) return <ErrorBox onRetry={() => drivers.refetch()} />;
  if (laps.isPending || drivers.isPending) return <Loading label="Carregando voltas…" />;
  if (!referenceDriver) {
    return <EmptyBox message="Sem pilotos disponíveis nesta sessão." />;
  }
  if (referenceLaps.length === 0 || lapNumber == null) {
    return <EmptyBox message="Sem voltas com telemetria disponível nesta sessão." />;
  }
  if (location.isError) return <ErrorBox onRetry={() => location.refetch()} />;
  if (location.isPending) return <Loading label="Carregando traçado…" />;

  const { path, viewBox } = buildTrackPath(location.data ?? []);

  if (!path) {
    return <EmptyBox message="Sem dados de posição (location) disponíveis para esta volta." />;
  }

  const coloringReady =
    wantsColoring && !!lap && (carA.data?.length ?? 0) > 0 && (carB.data?.length ?? 0) > 0;

  const coloredSegments = coloringReady
    ? (() => {
        const distancesA = cumulativeDistance(carA.data!).map((d) => Math.round(d));
        const locationDistances = attachDistances(location.data ?? [], carA.data!);
        const normalizedPoints = normalizeTrackPoints(location.data ?? []);
        const maxM = distancesA[distancesA.length - 1] ?? 0;
        const delta = computeDelta(carA.data!, carB.data!);
        const boundaries =
          granularity === 'sector'
            ? sectorSegments(
                sectorBoundaries(lap!, carA.data!.map((s) => Date.parse(s.date)), distancesA),
                maxM,
              )
            : cornerSegments(
                detectCorners(carA.data!.map((s, i) => ({ distanceM: distancesA[i], speed: s.speed }))),
                maxM,
              );
        return colorSegments(normalizedPoints, locationDistances, boundaries, delta.points);
      })()
    : [];

  const showColored = coloringReady && coloredSegments.length > 0;
  const dashSecond =
    !!secondDriver && teamColor(referenceDriver.team_colour) === teamColor(secondDriver.team_colour);

  return (
    <div className={styles.view}>
      <h2 className={styles.title}>
        Traçado — {referenceDriver.name_acronym} · volta {lapNumber}
      </h2>
      {isAutoDriver && (
        <p className={styles.autoNote}>
          Piloto de referência automático — selecione um piloto acima para ver a volta dele.
        </p>
      )}
      {coloringReady && (
        <div className={styles.controls}>
          <div className={styles.axisToggle} role="group" aria-label="Granularidade da coloração">
            <button
              type="button"
              className={granularity === 'sector' ? `${styles.axisButton} ${styles.axisButtonOn}` : styles.axisButton}
              onClick={() => setGranularity('sector')}
            >
              Setor
            </button>
            <button
              type="button"
              className={granularity === 'corner' ? `${styles.axisButton} ${styles.axisButtonOn}` : styles.axisButton}
              onClick={() => setGranularity('corner')}
            >
              Curva
            </button>
          </div>
          <div className={styles.legend}>
            <span
              className={styles.legendItem}
              style={{ '--legend-color': teamColor(referenceDriver.team_colour) } as React.CSSProperties}
            >
              {referenceDriver.name_acronym}
            </span>
            <span
              className={dashSecond ? `${styles.legendItem} ${styles.legendDashed}` : styles.legendItem}
              style={{ '--legend-color': teamColor(secondDriver!.team_colour) } as React.CSSProperties}
            >
              {secondDriver!.name_acronym}
            </span>
          </div>
        </div>
      )}
      <svg className={styles.svg} viewBox={viewBox} role="img" aria-label="Traçado da pista">
        {showColored ? (
          coloredSegments.map((segment, i) => (
            <path
              key={i}
              d={segment.path}
              className={segment.faster == null ? styles.path : styles.coloredSegment}
              style={
                segment.faster == null
                  ? undefined
                  : {
                      stroke: teamColor(segment.faster === 0 ? referenceDriver.team_colour : secondDriver!.team_colour),
                      strokeDasharray: segment.faster === 1 && dashSecond ? '10 6' : undefined,
                    }
              }
            />
          ))
        ) : (
          <path d={path} className={styles.path} />
        )}
      </svg>
    </div>
  );
}
