import { useDrivers, useTeamRadio } from '../api/queries';
import { EmptyBox, ErrorBox, Loading } from '../components/Feedback';
import { formatClock, teamColor } from '../lib/format';
import type { AppState } from '../lib/urlState';
import styles from './RadioView.module.css';

export function RadioView({ state }: { state: AppState }) {
  const drivers = useDrivers(state.session);
  const radio = useTeamRadio(state.session);

  if (radio.isError) return <ErrorBox onRetry={() => radio.refetch()} />;
  if (drivers.isError) return <ErrorBox onRetry={() => drivers.refetch()} />;
  if (radio.isPending || drivers.isPending) return <Loading label="Carregando rádio…" />;

  if (radio.data.length === 0) {
    return (
      <EmptyBox message="Sem clipes de rádio disponíveis para esta sessão. A cobertura de rádio da OpenF1 é baixa em muitas sessões — isso é esperado, não um erro." />
    );
  }

  return (
    <ol className={styles.list}>
      {radio.data.map((clip, i) => {
        const driver = (drivers.data ?? []).find((d) => d.driver_number === clip.driver_number);
        return (
          <li key={`${clip.date}-${i}`} className={styles.clip}>
            <span className={styles.driverChip} style={{ borderColor: teamColor(driver?.team_colour) }}>
              {driver?.name_acronym ?? clip.driver_number}
            </span>
            <span className={styles.time}>{formatClock(clip.date)}</span>
            <audio controls src={clip.recording_url} className={styles.audio} />
            <a href={clip.recording_url} target="_blank" rel="noreferrer" className={styles.openLink}>
              Abrir em nova aba
            </a>
          </li>
        );
      })}
    </ol>
  );
}
