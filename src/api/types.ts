// Types mirror the OpenF1 API v1 schemas (https://openf1.org/docs).
// Fields not used by the app are omitted on purpose.

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  circuit_short_name: string;
  country_name: string;
  location: string;
  date_start: string;
  year: number;
}

export interface Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  year: number;
}

export interface Driver {
  driver_number: number;
  session_key: number;
  meeting_key: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string | null;
  team_colour: string | null;
}

export interface Lap {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean;
}

export interface Stint {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string | null;
  tyre_age_at_start: number | null;
}

export interface Pit {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  date: string;
  pit_duration: number | null;
}

export interface CarData {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  speed: number;
  n_gear: number;
  throttle: number;
  brake: number;
  drs: number;
  rpm: number;
}

export interface Weather {
  session_key: number;
  meeting_key: number;
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
}

export interface Location {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface RaceControl {
  session_key: number;
  meeting_key: number;
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driver_number: number | null;
  lap_number: number | null;
  message: string;
}
