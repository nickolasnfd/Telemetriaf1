import { SessionSelector } from './components/SessionSelector';
import { EmptyBox } from './components/Feedback';
import { LapsView } from './views/LapsView';
import { TelemetryView } from './views/TelemetryView';
import { SessionView } from './views/SessionView';
import { TrackMapView } from './views/TrackMapView';
import { useAppState, type View } from './lib/urlState';
import styles from './App.module.css';

const TABS: Array<{ id: View; label: string }> = [
  { id: 'laps', label: 'Voltas' },
  { id: 'telemetry', label: 'Telemetria' },
  { id: 'session', label: 'Sessão' },
  { id: 'track', label: 'Traçado' },
];

function App() {
  const [state, update] = useAppState();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          Telemetria<span>F1</span>
        </h1>
        <p className={styles.tagline}>dados pós-sessão · fonte gratuita OpenF1</p>
      </header>

      <SessionSelector state={state} update={update} />

      <nav className={styles.tabs} aria-label="Visualizações">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={state.view === tab.id ? `${styles.tab} ${styles.tabOn}` : styles.tab}
            onClick={() => update({ view: tab.id })}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={styles.content}>
        {state.session == null ? (
          <EmptyBox message="Selecione temporada, Grande Prêmio e sessão para começar. Os dados ficam disponíveis cerca de 30 minutos após o fim de cada sessão." />
        ) : state.view === 'laps' ? (
          <LapsView state={state} />
        ) : state.view === 'telemetry' ? (
          <TelemetryView state={state} update={update} />
        ) : state.view === 'track' ? (
          <TrackMapView state={state} />
        ) : (
          <SessionView state={state} />
        )}
      </main>

      <footer className={styles.footer}>
        Dados históricos gratuitos da{' '}
        <a href="https://openf1.org" target="_blank" rel="noreferrer">
          OpenF1 API
        </a>{' '}
        · disponíveis ~30 min após cada sessão
      </footer>
    </div>
  );
}

export default App;
