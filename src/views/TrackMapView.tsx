import { useMemo } from 'react';
import { useDrivers, useLaps, useLocation } from '../api/queries';
import type { Lap } from '../api/types';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { lapDateWindow } from '../lib/telemetry';
import { buildTrackPath } from '../lib/trackMap';
import type { AppState } from '../lib/urlState';
import styles from './TrackMapView.module.css';

export function TrackMapView({ state }: { state: AppState }) {
  const drivers = useDrivers(state.session);
  const laps = useLaps(state.session);

  // Reference driver only (traces[0], spec fase-d1 §5) — the outline doesn't
  // need a 2nd driver, unlike the Delta chart in Telemetria.
  const referenceDriver = useMemo(
    () => (drivers.data ?? []).find((d) => d.driver_number === state.drivers[0]),
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
  const window = lap ? lapDateWindow(lap) : null;

  const location = useLocation(state.session, referenceDriver?.driver_number ?? null, window);

  if (state.drivers.length === 0) {
    return <EmptyBox message="Selecione ao menos um piloto acima para ver o traçado da pista." />;
  }
  if (laps.isError) return <ErrorBox onRetry={() => laps.refetch()} />;
  if (drivers.isError) return <ErrorBox onRetry={() => drivers.refetch()} />;
  if (laps.isPending || drivers.isPending) return <Loading label="Carregando voltas…" />;
  if (referenceLaps.length === 0 || lapNumber == null) {
    return <EmptyBox message="Sem voltas com telemetria disponível nesta sessão." />;
  }
  if (location.isError) return <ErrorBox onRetry={() => location.refetch()} />;
  if (location.isPending) return <Loading label="Carregando traçado…" />;

  const { path, viewBox } = buildTrackPath(location.data ?? []);

  if (!path) {
    return <EmptyBox message="Sem dados de posição (location) disponíveis para esta volta." />;
  }

  return (
    <div className={styles.view}>
      <h2 className={styles.title}>
        Traçado — {referenceDriver?.name_acronym} · volta {lapNumber}
      </h2>
      <svg className={styles.svg} viewBox={viewBox} role="img" aria-label="Traçado da pista">
        <path d={path} className={styles.path} />
      </svg>
    </div>
  );
}
