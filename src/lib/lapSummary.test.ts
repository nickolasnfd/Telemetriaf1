import { describe, expect, it } from 'vitest';
import type { CarData } from '../api/types';
import { summarizeLap } from './lapSummary';

function sample(overrides: Partial<CarData>): CarData {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: 11,
    date: '2026-06-14T17:03:00.000Z',
    speed: 200,
    n_gear: 6,
    throttle: 0,
    brake: 0,
    drs: 0,
    rpm: 10000,
    ...overrides,
  };
}

describe('summarizeLap', () => {
  it('returns zeroed summary for empty input', () => {
    expect(summarizeLap([])).toEqual({
      topSpeed: 0,
      avgSpeed: 0,
      brakingEvents: 0,
      fullThrottlePct: 0,
    });
  });

  it('computes top speed and average speed', () => {
    const summary = summarizeLap([
      sample({ speed: 100 }),
      sample({ speed: 300 }),
      sample({ speed: 200 }),
    ]);
    expect(summary.topSpeed).toBe(300);
    expect(summary.avgSpeed).toBe(200);
  });

  it('counts braking as distinct off->on events, not samples', () => {
    const summary = summarizeLap([
      sample({ brake: 0 }),
      sample({ brake: 100 }),
      sample({ brake: 100 }), // same event, must not double-count
      sample({ brake: 0 }),
      sample({ brake: 100 }), // second event
    ]);
    expect(summary.brakingEvents).toBe(2);
  });

  it('counts a braking event that starts on the first sample', () => {
    const summary = summarizeLap([sample({ brake: 100 }), sample({ brake: 0 })]);
    expect(summary.brakingEvents).toBe(1);
  });

  it('computes percentage of samples at full throttle', () => {
    const summary = summarizeLap([
      sample({ throttle: 100 }),
      sample({ throttle: 100 }),
      sample({ throttle: 60 }),
      sample({ throttle: 0 }),
    ]);
    expect(summary.fullThrottlePct).toBe(50);
  });
});
