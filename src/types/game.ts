export type GameStatus = 'idle' | 'intro' | 'playing' | 'paused' | 'crashed';

export type StuntType = 
  | 'barrel_roll' 
  | 'front_flip' 
  | 'back_flip' 
  | 'air_glide' 
  | 'perfect_landing' 
  | 'clean_landing' 
  | 'close_call' 
  | 'smash'
  | 'flyby';

export interface StuntNotification {
  id: string;
  text: string;
  points: number;
  type: StuntType;
  timestamp: number;
}

export type WeatherType = 'sunset' | 'neon_rain' | 'synthwave_fog' | 'cyber_aurora';

export interface GameStats {
  score: number;
  distance: number; // in meters
  carsPassed: number;
  stuntCount: number;
  timeElapsed: number; // in seconds
  speedKmh: number;
  boostFuel: number; // 0 to 100
  isBoosting: boolean;
  isGliding: boolean;
  isAirborne: boolean;
  streak: number;
  maxStreak: number;
  multiplier: number;
  weather: WeatherType;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  handle?: string;
  score: number;
  distance: number;
  date: string;
  isCreator?: boolean;
}

export interface CarCustomization {
  paintColor: string;
  underglowColor: string;
  plateText: string;
  name: string;
}
