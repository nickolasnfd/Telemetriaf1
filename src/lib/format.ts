export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(3).padStart(6, '0')}`;
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function teamColor(hex: string | null | undefined): string {
  return hex ? `#${hex.replace(/^#/, '')}` : '#888888';
}

const SESSION_NAMES_PT: Record<string, string> = {
  'Practice 1': 'Treino Livre 1',
  'Practice 2': 'Treino Livre 2',
  'Practice 3': 'Treino Livre 3',
  Qualifying: 'Classificação',
  'Sprint Qualifying': 'Classificação Sprint',
  'Sprint Shootout': 'Classificação Sprint',
  Sprint: 'Sprint',
  Race: 'Corrida',
};

export function sessionNamePt(name: string): string {
  return SESSION_NAMES_PT[name] ?? name;
}
