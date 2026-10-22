import React, { useEffect, useState } from 'react';
import { GameStats } from '../types/game';
import confetti from 'canvas-confetti';
import { RotateCcw, Trophy, Share2, Instagram, Check, Home } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  highScore: number;
  onRetry: () => void;
  onOpenLeaderboard: () => void;
  onOpenAbout: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  onRetry,
  onOpenLeaderboard,
  onOpenAbout,
}) => {
  const [copied, setCopied] = useState(false);
  const isNewRecord = stats.score >= highScore && stats.score > 0;

  useEffect(() => {
    if (isNewRecord) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff007f', '#ffe600', '#a855f7'],
      });
    }
  }, [isNewRecord]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleShare = () => {
    const shareText = `🏎️ I scored ${stats.score.toLocaleString()} pts in Jesse's Highway Roadster! Can you beat my distance of ${stats.distance}m? Follow creator Jesse on Instagram @jessej6228!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Rank calculation based on score
  const calculateRank = (score: number) => {
    if (score > 30000) return { rank: 12, topPct: '4.2%' };
    if (score > 25000) return { rank: 35, topPct: '15.8%' };
    if (score > 15000) return { rank: 82, topPct: '28.4%' };
    if (score > 8000) return { rank: 145, topPct: '44.1%' };
    return { rank: 280, topPct: '68.0%' };
  };

  const rankInfo = calculateRank(stats.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0f1220]/95 border border-white/15 text-white text-center shadow-2xl flex flex-col items-center">
        {/* Glow halo */}
        <div className="absolute -top-12 w-48 h-48 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Creator top badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 mb-4">
          <span>Highway Roadster by</span>
          <span className="font-bold text-cyan-400">Jesse</span>
          <a
            href="https://instagram.com/jessej6228"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 font-mono flex items-center gap-0.5 ml-1 transition"
          >
            <Instagram className="w-3 h-3" />
            @jessej6228
          </a>
        </div>

        {/* New Record Banner (Exact styling from video) */}
        {isNewRecord ? (
          <div className="px-5 py-1 rounded border border-amber-400/90 text-amber-300 font-orbitron font-bold text-xs tracking-widest uppercase mb-3 bg-amber-400/10">
            ★ NEW RECORD ★
          </div>
        ) : (
          <div className="px-5 py-1 rounded border border-white/20 text-gray-400 font-orbitron font-semibold text-xs tracking-widest uppercase mb-3">
            GAME OVER
          </div>
        )}

        {/* Big Score (Exact layout from video) */}
        <div className="font-orbitron font-black text-5xl sm:text-6xl text-white tracking-wider my-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          {stats.score.toLocaleString()}
        </div>

        {/* Three Stats Columns: Distance | Max Combo | Time */}
        <div className="grid grid-cols-3 w-full my-6 py-4 px-3 rounded-2xl bg-white/[0.04] border border-white/10">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-rajdhani font-bold tracking-widest uppercase text-gray-400">
              DISTANCE
            </span>
            <span className="font-orbitron font-bold text-base sm:text-lg text-white mt-1">
              {stats.distance.toLocaleString()} <span className="text-xs text-cyan-400 font-normal">m</span>
            </span>
          </div>

          <div className="flex flex-col items-center border-x border-white/10">
            <span className="text-[10px] font-rajdhani font-bold tracking-widest uppercase text-gray-400">
              STUNTS
            </span>
            <span className="font-orbitron font-bold text-base sm:text-lg text-white mt-1">
              {stats.stuntCount}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-rajdhani font-bold tracking-widest uppercase text-gray-400">
              TIME
            </span>
            <span className="font-orbitron font-bold text-base sm:text-lg text-white mt-1 font-mono">
              {formatTime(stats.timeElapsed)}
            </span>
          </div>
        </div>

        {/* Rank & Standing (Matches video layout) */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="font-orbitron font-bold text-base text-amber-400">
              Rank #{rankInfo.rank}
            </span>
            <span className="text-xs font-rajdhani font-semibold text-gray-400">
              Top {rankInfo.topPct}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-mono mt-0.5">
            Leaderboard standing updated
          </span>
        </div>

        {/* Primary Action Buttons: Retry | Ranking */}
        <div className="grid grid-cols-2 gap-3 w-full mb-3">
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white text-black font-orbitron font-bold text-sm hover:bg-gray-200 transition cursor-pointer shadow-lg active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry <span className="text-xs font-mono opacity-60">[Space]</span></span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-orbitron font-semibold text-sm transition cursor-pointer active:scale-95"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Ranking</span>
          </button>
        </div>

        {/* Share Button (Exact styling from video) */}
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600/30 to-purple-600/30 border border-pink-500/40 hover:border-pink-400 text-pink-200 font-rajdhani font-bold text-sm tracking-wider uppercase transition cursor-pointer mb-4"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'Score Copied to Clipboard!' : 'Share Score & Tag @jessej6228'}</span>
        </button>

        {/* Prominent Footer Credit inside modal */}
        <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between text-xs text-gray-400">
          <span>Game by Jesse</span>
          <button
            onClick={onOpenAbout}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition cursor-pointer"
          >
            Meet the Creator
          </button>
        </div>
      </div>
    </div>
  );
};
