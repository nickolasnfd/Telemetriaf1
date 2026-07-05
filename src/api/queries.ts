import { QueryClient, useQuery } from '@tanstack/react-query';
import { openf1Fetch } from './client';
import type {
  CarData,
  Driver,
  Lap,
  Location,
  Meeting,
  Pit,
  RaceControl,
  Session,
  Stint,
  Weather,
} from './types';

// Historical OpenF1 data is immutable, so cache aggressively (spec §5).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function useMeetings(year: number | null) {
  return useQuery({
    queryKey: ['meetings', year],
    queryFn: async () => {
      const meetings = await openf1Fetch<Meeting>('meetings', { year: year! });
      return meetings.sort((a, b) => a.date_start.localeCompare(b.date_start));
    },
    enabled: year != null,
  });
}

export function useSessions(meetingKey: number | null) {
  return useQuery({
    queryKey: ['sessions', meetingKey],
    queryFn: async () => {
      const sessions = await openf1Fetch<Session>('sessions', { meeting_key: meetingKey! });
      return sessions.sort((a, b) => a.date_start.localeCompare(b.date_start));
    },
    enabled: meetingKey != null,
  });
}

export function useDrivers(sessionKey: number | null) {
  return useQuery({
    queryKey: ['drivers', sessionKey],
    queryFn: async () => {
      const drivers = await openf1Fetch<Driver>('drivers', { session_key: sessionKey! });
      return drivers.sort((a, b) => a.driver_number - b.driver_number);
    },
    enabled: sessionKey != null,
  });
}

export function useLaps(sessionKey: number | null) {
  return useQuery({
    queryKey: ['laps', sessionKey],
    queryFn: async () => {
      const laps = await openf1Fetch<Lap>('laps', { session_key: sessionKey! });
      return laps.sort((a, b) => a.lap_number - b.lap_number);
    },
    enabled: sessionKey != null,
  });
}

export function useStints(sessionKey: number | null) {
  return useQuery({
    queryKey: ['stints', sessionKey],
    queryFn: () => openf1Fetch<Stint>('stints', { session_key: sessionKey! }),
    enabled: sessionKey != null,
  });
}

export function usePits(sessionKey: number | null) {
  return useQuery({
    queryKey: ['pit', sessionKey],
    queryFn: () => openf1Fetch<Pit>('pit', { session_key: sessionKey! }),
    enabled: sessionKey != null,
  });
}

export function useWeather(sessionKey: number | null) {
  return useQuery({
    queryKey: ['weather', sessionKey],
    queryFn: async () => {
      const samples = await openf1Fetch<Weather>('weather', { session_key: sessionKey! });
      return samples.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: sessionKey != null,
  });
}

export function useRaceControl(sessionKey: number | null) {
  return useQuery({
    queryKey: ['race_control', sessionKey],
    queryFn: async () => {
      const messages = await openf1Fetch<RaceControl>('race_control', { session_key: sessionKey! });
      return messages.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: sessionKey != null,
  });
}

export function useCarData(
  sessionKey: number | null,
  driverNumber: number | null,
  window: { start: string; end: string } | null,
) {
  return useQuery({
    queryKey: ['car_data', sessionKey, driverNumber, window?.start, window?.end],
    queryFn: async () => {
      const samples = await openf1Fetch<CarData>('car_data', {
        session_key: sessionKey!,
        driver_number: driverNumber!,
        'date>': window!.start,
        'date<': window!.end,
      });
      return samples.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: sessionKey != null && driverNumber != null && window != null,
  });
}

export function useLocation(
  sessionKey: number | null,
  driverNumber: number | null,
  window: { start: string; end: string } | null,
) {
  return useQuery({
    queryKey: ['location', sessionKey, driverNumber, window?.start, window?.end],
    queryFn: async () => {
      const samples = await openf1Fetch<Location>('location', {
        session_key: sessionKey!,
        driver_number: driverNumber!,
        'date>': window!.start,
        'date<': window!.end,
      });
      return samples.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: sessionKey != null && driverNumber != null && window != null,
  });
}
