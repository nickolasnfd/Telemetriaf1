import styles from './Feedback.module.css';

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={styles.box} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBox({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div className={`${styles.box} ${styles.error}`} role="alert">
      <p>{message ?? 'Não foi possível carregar os dados da OpenF1.'}</p>
      <button type="button" className={styles.retry} onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}

export function EmptyBox({ message }: { message: string }) {
  return <div className={styles.box}>{message}</div>;
}
