import React from 'react';
import { Instagram, ExternalLink, Heart, Sparkles, User, Palette, Trophy } from 'lucide-react';

interface ProminentFooterProps {
  onOpenAbout: () => void;
  onOpenGarage: () => void;
  onOpenLeaderboard: () => void;
  isGameActive: boolean;
}

export const ProminentFooter: React.FC<ProminentFooterProps> = ({
  onOpenAbout,
  onOpenGarage,
  onOpenLeaderboard,
  isGameActive,
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none select-none">
      <div className="max-w-5xl mx-auto px-4 pb-2 pt-1 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Creator attribution pill (Prominent as requested) */}
        <div className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d101c]/90 border border-pink-500/30 text-xs text-white shadow-xl backdrop-blur-sm">
          <span className="flex items-center gap-1 text-gray-300">
            Created by <strong className="text-white font-orbitron">Jesse</strong>
          </span>
          <span className="text-gray-500">•</span>
          <a
            href="https://instagram.com/jessej6228"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono font-bold text-pink-400 hover:text-pink-300 transition"
            title="Follow Jesse on Instagram"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>@jessej6228</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>

        {/* Quick Menu Links */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-3 py-1 rounded-full bg-[#0d101c]/80 border border-white/10 text-xs text-gray-300 shadow-lg">
          <button
            onClick={onOpenAbout}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 hover:text-cyan-400 transition cursor-pointer flex items-center gap-1"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>About Jesse</span>
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={onOpenGarage}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 hover:text-pink-400 transition cursor-pointer flex items-center gap-1"
          >
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span>Garage</span>
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={onOpenLeaderboard}
            className="px-2.5 py-1 rounded-lg hover:bg-white/10 hover:text-amber-400 transition cursor-pointer flex items-center gap-1"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Rankings</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
