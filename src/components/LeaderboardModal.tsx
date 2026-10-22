import React, { useState, useEffect } from 'react';
import { X, Trophy, Medal, Instagram, ExternalLink } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardModalProps {
  onClose: () => void;
  playerScore?: number;
}

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Jesse (Creator)',
    handle: '@jessej6228',
    score: 25681,
    distance: 1429,
    date: '2026-10-22',
    isCreator: true,
  },
  {
    rank: 2,
    name: 'Cyber_Pilot_99',
    score: 22480,
    distance: 1250,
    date: '2026-10-21',
  },
  {
    rank: 3,
    name: 'NeonRider_X',
    score: 18991,
    distance: 1045,
    date: '2026-10-20',
  },
  {
    rank: 4,
    name: 'OutrunGhost',
    score: 13835,
    distance: 783,
    date: '2026-10-19',
  },
  {
    rank: 5,
    name: 'VaporDrifter',
    score: 9817,
    distance: 540,
    date: '2026-10-18',
  },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, playerScore }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem('highway_roadster_leaderboard');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_LEADERBOARD;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0e111d] border border-white/15 text-white shadow-2xl p-6 sm:p-8 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-orbitron font-black text-2xl text-white">Hall of Fame</h2>
            <p className="text-xs text-gray-400 font-rajdhani font-semibold">Highway Roadster Global Top Records</p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                entry.isCreator
                  ? 'bg-gradient-to-r from-pink-500/15 to-purple-500/15 border-pink-500/40 shadow-lg'
                  : 'bg-white/[0.04] border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-orbitron font-bold text-xs ${
                    entry.rank === 1
                      ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                      : entry.rank === 2
                      ? 'bg-gray-300 text-black'
                      : entry.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  #{entry.rank}
                </span>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-orbitron font-bold text-sm text-white">
                      {entry.name}
                    </span>
                    {entry.isCreator && (
                      <span className="px-1.5 py-0.2 rounded bg-pink-500/30 text-pink-300 text-[10px] font-mono">
                        DEV
                      </span>
                    )}
                  </div>
                  {entry.handle && (
                    <a
                      href="https://instagram.com/jessej6228"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-pink-400 hover:text-pink-300 font-mono flex items-center gap-1"
                    >
                      <Instagram className="w-3 h-3" />
                      {entry.handle}
                    </a>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="font-orbitron font-black text-sm sm:text-base text-cyan-300">
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  {entry.distance.toLocaleString()} m
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>Think you can beat Jesse?</span>
          <a
            href="https://instagram.com/jessej6228"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 font-semibold"
          >
            DM your score to @jessej6228 &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};
