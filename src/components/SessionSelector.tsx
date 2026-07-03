import { useDrivers, useMeetings, useSessions } from '../api/queries';
import { sessionNamePt, teamColor } from '../lib/format';
import type { AppState } from '../lib/urlState';
import { ErrorBox } from './Feedback';
import styles from './SessionSelector.module.css';

// OpenF1 coverage starts in 2023.
const FIRST_SEASON = 2023;
const CURRENT_SEASON = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_SEASON - FIRST_SEASON + 1 }, (_, i) => CURRENT_SEASON - i);

interface Props {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}

export function SessionSelector({ state, update }: Props) {
  const meetings = useMeetings(state.year);
  const sessions = useSessions(state.meeting);
  const drivers = useDrivers(state.session);

  const toggleDriver = (driverNumber: number) => {
    const selected = state.drivers.includes(driverNumber)
      ? state.drivers.filter((n) => n !== driverNumber)
      : [...state.drivers, driverNumber].slice(-2); // keep at most 2, newest wins
    update({ drivers: selected });
  };

  return (
    <section className={styles.selector} aria-label="Seleção de sessão">
      <div className={styles.row}>
        <label className={styles.field}>
          <span>Temporada</span>
          <select
            value={state.year ?? ''}
            onChange={(e) =>
              update({
                year: e.target.value ? Number(e.target.value) : null,
                meeting: null,
                session: null,
                drivers: [],
                lap: null,
              })
            }
          >
            <option value="">Selecione…</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Grande Prêmio</span>
          <select
            value={state.meeting ?? ''}
            disabled={state.year == null || meetings.isPending}
            onChange={(e) =>
              update({
                meeting: e.target.value ? Number(e.target.value) : null,
                session: null,
                drivers: [],
                lap: null,
              })
            }
          >
            <option value="">{meetings.isFetching ? 'Carregando…' : 'Selecione…'}</option>
            {meetings.data?.map((meeting) => (
              <option key={meeting.meeting_key} value={meeting.meeting_key}>
                {meeting.meeting_name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Sessão</span>
          <select
            value={state.session ?? ''}
            disabled={state.meeting == null || sessions.isPending}
            onChange={(e) =>
              update({
                session: e.target.value ? Number(e.target.value) : null,
                drivers: [],
                lap: null,
              })
            }
          >
            <option value="">{sessions.isFetching ? 'Carregando…' : 'Selecione…'}</option>
            {sessions.data?.map((session) => (
              <option key={session.session_key} value={session.session_key}>
                {sessionNamePt(session.session_name)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {meetings.isError && <ErrorBox onRetry={() => meetings.refetch()} />}
      {sessions.isError && <ErrorBox onRetry={() => sessions.refetch()} />}
      {drivers.isError && <ErrorBox onRetry={() => drivers.refetch()} />}

      {drivers.data && drivers.data.length > 0 && (
        <div className={styles.drivers} role="group" aria-label="Pilotos (até 2)">
          {drivers.data.map((driver) => {
            const selected = state.drivers.includes(driver.driver_number);
            return (
              <button
                key={driver.driver_number}
                type="button"
                className={selected ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                style={{ '--team': teamColor(driver.team_colour) } as React.CSSProperties}
                onClick={() => toggleDriver(driver.driver_number)}
                title={`${driver.full_name} — ${driver.team_name ?? 'equipe desconhecida'}`}
              >
                <span className={styles.num}>{driver.driver_number}</span>
                {driver.name_acronym}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
