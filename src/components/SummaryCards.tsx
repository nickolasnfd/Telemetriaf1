import { summarizeLap } from '../lib/lapSummary';
import { teamColor } from '../lib/format';
import type { Driver, CarData } from '../api/types';
import styles from './SummaryCards.module.css';

interface Props {
  traces: Array<{ driver: Driver; samples: CarData[] }>;
}

export function SummaryCards({ traces }: Props) {
  return (
    <div className={styles.row} aria-label="Resumo da volta">
      {traces.map((trace) => {
        const summary = summarizeLap(trace.samples);
        return (
          <div
            key={trace.driver.driver_number}
            className={styles.card}
            style={{ borderTopColor: teamColor(trace.driver.team_colour) }}
          >
            <h3 className={styles.driver}>{trace.driver.name_acronym}</h3>
            <dl className={styles.stats}>
              <div className={styles.stat}>
                <dt>Vel. máxima</dt>
                <dd>{summary.topSpeed} km/h</dd>
              </div>
              <div className={styles.stat}>
                <dt>Vel. média</dt>
                <dd>{summary.avgSpeed} km/h</dd>
              </div>
              <div className={styles.stat}>
                <dt>Frenagens</dt>
                <dd>{summary.brakingEvents}</dd>
              </div>
              <div className={styles.stat}>
                <dt>Acelerador pleno</dt>
                <dd>{summary.fullThrottlePct}%</dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
