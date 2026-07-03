import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUrl, openf1Fetch, OpenF1Error } from './client';

describe('buildUrl', () => {
  it('builds a plain filter URL', () => {
    expect(buildUrl('meetings', { year: 2026 })).toBe('https://api.openf1.org/v1/meetings?year=2026');
  });

  it('encodes OpenF1 date operators in the key', () => {
    const url = buildUrl('car_data', {
      session_key: 9901,
      driver_number: 11,
      'date>': '2026-06-14T17:03:00.000Z',
      'date<': '2026-06-14T17:04:28.000Z',
    });
    expect(url).toContain('date%3E=2026-06-14T17%3A03%3A00.000Z');
    expect(url).toContain('date%3C=2026-06-14T17%3A04%3A28.000Z');
  });

  it('drops undefined params', () => {
    expect(buildUrl('sessions', { meeting_key: 1, year: undefined })).toBe(
      'https://api.openf1.org/v1/sessions?meeting_key=1',
    );
  });
});

describe('openf1Fetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([{ meeting_key: 1 }]), { status: 200 })),
    );
    await expect(openf1Fetch('meetings', { year: 2026 })).resolves.toEqual([{ meeting_key: 1 }]);
  });

  it('throws OpenF1Error with the HTTP status on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    await expect(openf1Fetch('meetings', { year: 2026 })).rejects.toMatchObject({
      name: 'OpenF1Error',
      status: 503,
    });
    await expect(openf1Fetch('meetings', { year: 2026 })).rejects.toBeInstanceOf(OpenF1Error);
  });
});
