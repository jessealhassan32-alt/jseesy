import React, { useState, useEffect } from 'react';
import { Sparkles, MoveHorizontal, ArrowUp, Zap } from 'lucide-react';

interface MobileControlsProps {
  isAirborne: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ isAirborne }) => {
  const [hintVisible, setHintVisible] = useState(true);

  // Auto-fade the gesture tip after 6 seconds of playing
  useEffect(() => {
    const timer = setTimeout(() => {
      setHintVisible(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!hintVisible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 pointer-events-none flex justify-center px-4 animate-fade-in transition-opacity duration-1000">
      <div className="px-4 py-2 rounded-2xl bg-[#0f1220]/80 border border-cyan-500/30 backdrop-blur-sm text-center shadow-xl">
        <div className="flex items-center justify-center gap-3 text-xs font-rajdhani font-bold text-gray-200">
          <span className="flex items-center gap-1 text-cyan-300">
            <MoveHorizontal className="w-3.5 h-3.5" /> Swipe to Dodge / Roll
          </span>
          <span className="text-gray-500">•</span>
          <span className="flex items-center gap-1 text-amber-300">
            <ArrowUp className="w-3.5 h-3.5" /> Swipe Up: Jump
          </span>
          <span className="text-gray-500">•</span>
          <span className="flex items-center gap-1 text-pink-400">
            <Sparkles className="w-3.5 h-3.5" /> Double-Tap in Air: Flip!
          </span>
        </div>
      </div>
    </div>
  );
};
