import type { Driver } from '../api/types';
import type { DeltaConfidence } from '../lib/delta';
import type { SectorDelta, SegmentInsight } from '../lib/insights';
import { teamColor } from '../lib/format';
import styles from './InsightsPanel.module.css';

interface Props {
  driverA: Driver; // reference
  driverB: Driver; // compared against reference
  sectorDeltas: SectorDelta[];
  segments: SegmentInsight[];
  confidence: DeltaConfidence;
}

function signed(deltaS: number): string {
  return `${deltaS > 0 ? '+' : ''}${deltaS.toFixed(3)}s`;
}

export function InsightsPanel({ driverA, driverB, sectorDeltas, segments, confidence }: Props) {
  // deltaS = timeB - timeA: negative means B is faster in that segment/sector.
  const fasterDriver = (deltaS: number): Driver => (deltaS < 0 ? driverB : driverA);

  return (
    <section className={styles.panel} aria-label="Insights">
      <div className={styles.header}>
        <h2 className={styles.title}>Insights</h2>
        <span className={styles.subtitle}>
          {driverB.name_acronym} em relação a {driverA.name_acronym}
        </span>
      </div>

      {confidence === 'low' && (
        <p className={styles.caveat}>
          ⚠ Alinhamento com confiança baixa (voltas com distância total muito diferente) — trate os
          insights abaixo como aproximados.
        </p>
      )}

      {sectorDeltas.length > 0 && (
        <div className={styles.sectors} aria-label="Diferença por setor">
          {sectorDeltas.map((s) => {
            const faster = fasterDriver(s.deltaS);
            return (
              <div key={s.sector} className={styles.sectorCard} style={{ borderTopColor: teamColor(faster.team_colour) }}>
                <span className={styles.sectorName}>Setor {s.sector}</span>
                <span className={styles.sectorDelta} style={{ color: teamColor(faster.team_colour) }}>
                  {signed(s.deltaS)}
                </span>
                <span className={styles.sectorFaster}>{faster.name_acronym} mais rápido</span>
              </div>
            );
          })}
        </div>
      )}

      {segments.length > 0 ? (
        <ul className={styles.segments} aria-label="Trechos com maior diferença">
          {segments.map((seg) => (
            <li key={seg.label} className={styles.segment}>
              <span className={styles.segmentLabel}>{seg.label}</span>
              <span className={styles.segmentPhrase}>{seg.phrase}</span>
              <span
                className={styles.segmentDelta}
                style={{ color: teamColor(fasterDriver(seg.deltaS).team_colour) }}
              >
                {signed(seg.deltaS)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.equal}>
          Sem diferenças relevantes entre {driverA.name_acronym} e {driverB.name_acronym} nesta volta —
          ritmo equivalente.
        </p>
      )}
    </section>
  );
}
