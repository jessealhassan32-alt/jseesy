import React from 'react';
import { GameStats, StuntNotification } from '../types/game';
import { Volume2, VolumeX, Pause, Play, Sparkles, Flame, User, Palette, Trophy } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface GameHUDProps {
  stats: GameStats;
  currentStunt: StuntNotification | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenAbout: () => void;
  onOpenGarage: () => void;
  onOpenLeaderboard: () => void;
  onPauseToggle: () => void;
  isPaused: boolean;
  isGameActive: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  currentStunt,
  isMuted,
  onToggleMute,
  onOpenAbout,
  onOpenGarage,
  onOpenLeaderboard,
  onPauseToggle,
  isPaused,
  isGameActive,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none z-10">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between">
        {/* Left Controls & Creator Quick Badge */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="p-2.5 rounded-xl bg-[#121526]/80 border border-white/10 hover:border-cyan-400/50 text-white transition cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
            </button>
            <button
              onClick={onPauseToggle}
              className="p-2.5 rounded-xl bg-[#121526]/80 border border-white/10 hover:border-cyan-400/50 text-white transition cursor-pointer"
              title={isPaused ? 'Resume Game' : 'Pause Game'}
            >
              {isPaused ? <Play className="w-5 h-5 text-yellow-400" /> : <Pause className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={onOpenGarage}
              className="p-2.5 rounded-xl bg-[#121526]/80 border border-white/10 hover:border-pink-500/50 text-white transition cursor-pointer flex items-center gap-1.5"
              title="Garage / Car Customizer"
            >
              <Palette className="w-5 h-5 text-pink-400" />
            </button>
            <button
              onClick={onOpenLeaderboard}
              className="p-2.5 rounded-xl bg-[#121526]/80 border border-white/10 hover:border-amber-400/50 text-white transition cursor-pointer"
              title="Leaderboard Rankings"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
            </button>
          </div>

          {/* Quick Creator Attribution Badge */}
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#15192c]/90 border border-cyan-500/30 hover:border-cyan-400 text-xs font-semibold text-cyan-300 transition cursor-pointer shadow-lg w-fit"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Dev: Jesse</span>
            <span className="text-pink-400 font-mono">@jessej6228</span>
          </button>
        </div>

        {/* Center: Main Score, Streak & Combo Feed (Exact match with video) */}
        <div className="flex flex-col items-center">
          {/* Main Score Display */}
          <div className="text-center">
            <div className="font-orbitron font-black text-4xl sm:text-5xl tracking-wider text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              {stats.score.toLocaleString()}
            </div>

            {/* Streak & Multiplier Banner */}
            {stats.multiplier > 1 && (
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-pink-500/20 border border-pink-500/50 text-pink-400 font-rajdhani font-bold text-sm tracking-widest uppercase">
                  Streak x{stats.multiplier} Active
                </span>
                <span className="text-amber-300 font-orbitron font-bold text-sm">
                  +{Math.round(stats.streak * 50)}
                </span>
              </div>
            )}
          </div>

          {/* Live Stunt Pop-up Alert Banner */}
          {currentStunt && (
            <div className="mt-2 flex flex-col items-center animate-bounce">
              <div
                className={`px-4 py-1.5 rounded-lg font-orbitron font-bold text-sm tracking-wide shadow-xl border ${
                  currentStunt.type === 'smash'
                    ? 'bg-red-500/30 border-red-400 text-yellow-300'
                    : currentStunt.type === 'barrel_roll'
                    ? 'bg-purple-600/40 border-purple-400 text-purple-200'
                    : currentStunt.type === 'perfect_landing'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                    : 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                }`}
              >
                {currentStunt.text}
              </div>
            </div>
          )}

          {/* Rocket Mode Active Alert */}
          {stats.isBoosting && (
            <div className="mt-2 px-3 py-1 rounded bg-amber-500/30 border border-amber-400/80 text-amber-300 font-orbitron font-bold text-xs tracking-wider flex items-center gap-1.5 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>ROCKET MODE INVINCIBLE</span>
            </div>
          )}
        </div>

        {/* Right: Distance & About Creator Button */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600/30 to-purple-600/30 border border-pink-500/40 hover:border-pink-400 text-white text-xs font-semibold tracking-wider transition cursor-pointer shadow-lg"
          >
            <User className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">About</span>
            <span className="text-pink-300 font-bold">Jesse</span>
          </button>

          {/* Dynamic Weather Badge */}
          <div className="px-3 py-1 rounded-xl bg-[#121526]/80 border border-white/10 flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full animate-pulse bg-cyan-400" />
            <span className="font-orbitron font-bold text-[11px] text-gray-200 uppercase tracking-wider">
              {stats.weather === 'neon_rain' ? '⛈️ Neon Rain' : stats.weather === 'synthwave_fog' ? '🌫️ Synth Fog' : stats.weather === 'cyber_aurora' ? '🌌 Cyber Aurora' : '🌅 Sunset Glow'}
            </span>
          </div>

          {/* Mini Distance readout */}
          <div className="px-3 py-1.5 rounded-xl bg-[#121526]/80 border border-white/10 text-right">
            <span className="text-[10px] text-gray-400 font-mono uppercase block">Distance</span>
            <span className="font-orbitron font-bold text-sm text-cyan-300">{stats.distance.toLocaleString()} m</span>
          </div>
        </div>
      </div>

      {/* Bottom HUD: Boost Meter, Speedometer & Controls Hint */}
      <div className="flex flex-col items-center gap-2.5 pb-6">
        {/* Speedometer & Boost Bar Container */}
        <div className="w-full max-w-xl pointer-events-auto flex flex-col gap-2">
          {/* Upper stats row: Speed, Air State, Time */}
          <div className="flex items-center justify-between text-xs font-rajdhani font-semibold text-gray-300 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 uppercase">Speed:</span>
              <span className={`font-orbitron font-bold text-sm ${stats.isBoosting ? 'text-amber-400' : 'text-cyan-400'}`}>
                {stats.speedKmh} km/h
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 uppercase">Status:</span>
              <span className="font-orbitron font-bold text-xs text-purple-300">
                {stats.isAirborne ? (stats.isGliding ? 'GLIDING WINGS' : 'AIRBORNE') : 'ROAD'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 uppercase">Time:</span>
              <span className="font-mono text-xs text-white">{formatTime(stats.timeElapsed)}</span>
            </div>
          </div>

          {/* Nitro Boost Gauge */}
          <div className="relative w-full h-3.5 bg-[#0f1220] rounded-full border border-white/15 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                stats.isBoosting
                  ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-cyan-400 shadow-[0_0_12px_rgba(255,100,200,0.8)]'
                  : 'bg-gradient-to-r from-cyan-500 to-pink-500'
              }`}
              style={{ width: `${stats.boostFuel}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-orbitron font-bold text-white tracking-widest drop-shadow">
              BOOST {Math.round(stats.boostFuel)}%
            </div>
          </div>
        </div>

        {/* Dynamic Controls Hint (Swipe Gestures & Keyboard) */}
        <div className="pointer-events-auto flex items-center flex-wrap justify-center gap-2 sm:gap-3 px-4 py-1.5 rounded-full bg-[#0f1220]/90 border border-white/10 text-[11px] font-rajdhani font-bold text-gray-300 shadow-xl">
          <div className="flex items-center gap-1 text-cyan-300">
            <span>Swipe / [A][D]: Dodge & Roll</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1 text-yellow-300">
            <span>Swipe Up / [Space]: Jump</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1 text-pink-400">
            <span>Double-Tap in Air: Acrobatic Flip</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1 text-amber-300">
            <span>Hold: Glide • [Shift]: Boost</span>
          </div>
        </div>
      </div>
    </div>
  );
};
