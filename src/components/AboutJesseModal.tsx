import React, { useState } from 'react';
import { X, Instagram, ExternalLink, Check, Copy, Sparkles, Flame, Shield, Award, Car, Heart } from 'lucide-react';

interface AboutJesseModalProps {
  onClose: () => void;
}

export const AboutJesseModal: React.FC<AboutJesseModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('@jessej6228');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0e111d] border border-cyan-500/30 text-white shadow-2xl p-6 sm:p-8 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Creator Hero Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-white/10">
          {/* Avatar / Monogram */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-cyan-400 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.4)]">
              <div className="w-full h-full rounded-xl bg-[#0e111d] flex flex-col items-center justify-center">
                <span className="font-orbitron font-black text-3xl bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  JJ
                </span>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-0.5">DEV</span>
              </div>
            </div>
            {/* Verified badge */}
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-500 text-black shadow-md" title="Verified Creator">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          {/* Name & Handle Details */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-orbitron font-black text-2xl sm:text-3xl text-white tracking-wide">
                Jesse
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-semibold">
                Creator
              </span>
            </div>

            <p className="text-sm text-gray-300 mt-1 font-rajdhani font-semibold">
              Game Designer & 3D Interactive Engineer
            </p>

            {/* Prominent Instagram Badge & Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              <a
                href="https://instagram.com/jessej6228"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 font-bold text-xs tracking-wider uppercase text-white shadow-lg transition active:scale-95"
              >
                <Instagram className="w-4 h-4" />
                <span>Follow @jessej6228</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-mono text-gray-200 transition cursor-pointer"
                title="Copy Handle"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : '@jessej6228'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="py-6 space-y-4">
          <div>
            <h3 className="font-orbitron font-bold text-lg text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              About Jesse's Highway Roadster
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed mt-2 font-sans">
              Welcome to <strong className="text-white">Highway Roadster</strong>, created by <strong className="text-pink-400">Jesse</strong>! Inspired by endless arcade runners and classic 80s synthwave aesthetics, this game reimagines highway driving with full 3D physics, aerial stunt acrobatics, and high-velocity rocket smashing.
            </p>
            <p className="text-sm text-gray-300 leading-relaxed mt-2">
              Every detail—from the retro-futuristic Cyber Roadster featuring Jesse's custom <code className="text-cyan-300 bg-white/5 px-1.5 py-0.5 rounded">JESSE</code> license plate to the overhead neon highway gantries and procedural audio synthesis—was crafted to deliver an adrenaline rush right in your browser.
            </p>
          </div>

          {/* Stunt Mechanics Guide */}
          <div className="pt-2">
            <h4 className="font-orbitron font-bold text-sm text-pink-400 uppercase tracking-wider mb-3">
              Master Jesse's Stunt System
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-orbitron font-bold text-white">Barrel Roll (+240)</div>
                  <div className="text-gray-400 mt-0.5">Press <kbd className="text-cyan-300 font-mono">A</kbd> or <kbd className="text-cyan-300 font-mono">D</kbd> while airborne to spin laterally 360°.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-orbitron font-bold text-white">Double-Tap Acrobatics (+360)</div>
                  <div className="text-gray-400 mt-0.5">Double tap anywhere on the screen in mid-air to unleash an aerial corkscrew flip!</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-orbitron font-bold text-white">Rocket Mode Invincible</div>
                  <div className="text-gray-400 mt-0.5">Hold <kbd className="text-amber-300 font-mono">Shift</kbd> (or 2-finger touch) to blaze past 340 km/h and smash traffic!</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-orbitron font-bold text-white">Air Gliding (Hold Finger / Space)</div>
                  <div className="text-gray-400 mt-0.5">Deploy the cyber aerofoil wings to soar over traffic and highway signs!</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info & Instagram plug */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            <span>Built by <strong>Jesse</strong> with Three.js & WebGL</span>
          </div>

          <a
            href="https://instagram.com/jessej6228"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 font-bold transition flex items-center gap-1"
          >
            Follow @jessej6228 on Instagram &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};
