export const OPENF1_BASE = 'https://api.openf1.org/v1';

// Keys may carry OpenF1 filter operators, e.g. { 'date>': iso, 'date<': iso }.
export type QueryParams = Record<string, string | number | undefined>;

export class OpenF1Error extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'OpenF1Error';
    this.status = status;
  }
}

export function buildUrl(endpoint: string, params: QueryParams = {}): string {
  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${OPENF1_BASE}/${endpoint}${search ? `?${search}` : ''}`;
}

// Fixture mode (?mock=1): serves the synthetic reference dataset instead of
// the live API. Exists because the dev sandbox cannot reach api.openf1.org.
export function isMockMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === '1';
}

export async function openf1Fetch<T>(endpoint: string, params: QueryParams = {}): Promise<T[]> {
  if (isMockMode()) {
    const { mockFetch } = await import('./fixtures/mock');
    return mockFetch(endpoint, params) as Promise<T[]>;
  }
  const response = await fetch(buildUrl(endpoint, params));
  if (!response.ok) {
    throw new OpenF1Error(response.status, `OpenF1 request failed with status ${response.status}`);
  }
  return response.json() as Promise<T[]>;
}
