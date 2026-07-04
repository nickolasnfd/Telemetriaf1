import { usePits, useRaceControl, useStints, useWeather } from '../api/queries';
import type { CarData, Driver, Lap } from '../api/types';
import { buildExportZip, downloadZip } from '../lib/exportZip';
import styles from './ExportButton.module.css';

interface Props {
  sessionKey: number;
  lapNumber: number;
  traces: Array<{ driver: Driver; lap: Lap; samples: CarData[] }>;
}

export function ExportButton({ sessionKey, lapNumber, traces }: Props) {
  const stints = useStints(sessionKey);
  const pits = usePits(sessionKey);
  const weather = useWeather(sessionKey);
  const raceControl = useRaceControl(sessionKey);

  const ready = traces.length > 0 && !stints.isPending && !pits.isPending && !weather.isPending && !raceControl.isPending;

  const handleExport = () => {
    const bytes = buildExportZip({
      session: { session_key: sessionKey, lap_number: lapNumber },
      drivers: traces.map((t) => t.driver),
      laps: traces.map((t) => t.lap),
      car_data: Object.fromEntries(traces.map((t) => [t.driver.driver_number, t.samples])),
      stints: stints.data ?? [],
      pits: pits.data ?? [],
      weather: weather.data ?? [],
      race_control: raceControl.data ?? [],
    });
    downloadZip(bytes, `telemetriaf1_${sessionKey}_volta${lapNumber}.zip`);
  };

  return (
    <button type="button" className={styles.button} onClick={handleExport} disabled={!ready}>
      ⭳ Exportar dados (ZIP)
    </button>
  );
}
