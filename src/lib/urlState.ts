import { useCallback, useEffect, useState } from 'react';

export type View = 'laps' | 'telemetry' | 'session' | 'track' | 'radio';

export interface AppState {
  year: number | null;
  meeting: number | null;
  session: number | null;
  drivers: number[]; // up to 2 driver numbers, first is the reference
  lap: number | null;
  view: View;
}

const VIEWS: View[] = ['laps', 'telemetry', 'session', 'track', 'radio'];

function toInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseState(search: string): AppState {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  return {
    year: toInt(params.get('year')),
    meeting: toInt(params.get('meeting')),
    session: toInt(params.get('session')),
    drivers: (params.get('drivers') ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 2),
    lap: toInt(params.get('lap')),
    view: VIEWS.includes(view as View) ? (view as View) : 'laps',
  };
}

// Writes app state into the query string, preserving unrelated params (?mock=1).
export function serializeState(state: AppState, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  const setOrDelete = (key: string, value: string | null) => {
    if (value == null) params.delete(key);
    else params.set(key, value);
  };
  setOrDelete('year', state.year != null ? String(state.year) : null);
  setOrDelete('meeting', state.meeting != null ? String(state.meeting) : null);
  setOrDelete('session', state.session != null ? String(state.session) : null);
  setOrDelete('drivers', state.drivers.length ? state.drivers.join(',') : null);
  setOrDelete('lap', state.lap != null ? String(state.lap) : null);
  setOrDelete('view', state.view !== 'laps' ? state.view : null);
  return params.toString();
}

export function useAppState(): [AppState, (patch: Partial<AppState>) => void] {
  const [state, setState] = useState<AppState>(() => parseState(window.location.search));

  useEffect(() => {
    const onPopState = () => setState(parseState(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const update = useCallback((patch: Partial<AppState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const query = serializeState(next, window.location.search);
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
      return next;
    });
  }, []);

  return [state, update];
}
