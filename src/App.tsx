/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { GameStats, GameStatus, StuntNotification, CarCustomization } from './types/game';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { AboutJesseModal } from './components/AboutJesseModal';
import { GarageModal } from './components/GarageModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProminentFooter } from './components/ProminentFooter';
import { MobileControls } from './components/MobileControls';
import { soundManager } from './audio/soundManager';
import { Play, Sparkles, Instagram, Flame, Award, Shield, Palette, Trophy, User } from 'lucide-react';

const DEFAULT_CUSTOMIZATION: CarCustomization = {
  name: 'Sunset Cyber (Video Original)',
  paintColor: '#f06292',
  underglowColor: '#00f0ff',
  plateText: 'JESSE',
};

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    distance: 0,
    carsPassed: 0,
    stuntCount: 0,
    timeElapsed: 0,
    speedKmh: 160,
    boostFuel: 60,
    isBoosting: false,
    isGliding: false,
    isAirborne: false,
    streak: 0,
    maxStreak: 0,
    multiplier: 1,
    weather: 'sunset',
  });

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('highway_roadster_high_score');
      return saved ? parseInt(saved, 10) : 25681; // Jesse's original record from the video!
    } catch {
      return 25681;
    }
  });

  const [countdownText, setCountdownText] = useState<string | null>(null);
  const [currentStunt, setCurrentStunt] = useState<StuntNotification | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [customization, setCustomization] = useState<CarCustomization>(DEFAULT_CUSTOMIZATION);

  // Modals
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showGarage, setShowGarage] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Initialize Game Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, {
      paintColor: customization.paintColor,
      underglowColor: customization.underglowColor,
      plateText: customization.plateText,
      creatorHandle: '@jessej6228',
    });

    engine.onStatsUpdate = (newStats) => {
      setStats(newStats);
      if (engine.status === 'playing' && gameStatus !== 'playing') {
        setGameStatus('playing');
      }
      if (newStats.score > highScore) {
        setHighScore(newStats.score);
        try {
          localStorage.setItem('highway_roadster_high_score', newStats.score.toString());
        } catch {}
      }
    };

    engine.onCountdownUpdate = (text) => {
      setCountdownText(text);
      if (!text && engine.status === 'playing') {
        setGameStatus('playing');
      }
    };

    engine.onStuntNotify = (stunt) => {
      setCurrentStunt(stunt);
      setTimeout(() => {
        setCurrentStunt((prev) => (prev?.id === stunt.id ? null : prev));
      }, 1400);
    };

    engine.onGameOver = (finalStats) => {
      setGameStatus('crashed');
      setCountdownText(null);
      try {
        const savedLeaderboard = localStorage.getItem('highway_roadster_leaderboard');
        let list = savedLeaderboard ? JSON.parse(savedLeaderboard) : [];
        if (list.length === 0) {
          list = [
            { rank: 1, name: 'Jesse (Creator)', handle: '@jessej6228', score: 25681, distance: 1429, date: '2026-10-22', isCreator: true },
          ];
        }
        list.push({
          rank: list.length + 1,
          name: 'Player',
          score: finalStats.score,
          distance: finalStats.distance,
          date: new Date().toISOString().split('T')[0],
        });
        list.sort((a: any, b: any) => b.score - a.score);
        list.forEach((item: any, idx: number) => { item.rank = idx + 1; });
        localStorage.setItem('highway_roadster_leaderboard', JSON.stringify(list.slice(0, 10)));
      } catch {}
    };

    engineRef.current = engine;

    const handleResize = () => {
      if (containerRef.current && engineRef.current) {
        engineRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update car finish when customization changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateCarCustomization({
        paintColor: customization.paintColor,
        underglowColor: customization.underglowColor,
        plateText: customization.plateText,
        creatorHandle: '@jessej6228',
      });
    }
  }, [customization]);

  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startGame();
      setGameStatus('intro');
    }
  }, []);

  const handleRetryGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.restartGame();
      setGameStatus('intro');
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (gameStatus === 'playing') {
      engineRef.current?.stopLoop();
      setGameStatus('paused');
    } else if (gameStatus === 'paused') {
      engineRef.current?.startLoop();
      setGameStatus('playing');
    }
  }, [gameStatus]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0c16] font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Start / Idle Screen (Viral Hook matching video) */}
      {gameStatus === 'idle' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 bg-gradient-to-t from-[#0b0c16]/95 via-[#0b0c16]/60 to-[#0b0c16]/80 text-white select-none">
          {/* Top Brand Header */}
          <div className="flex flex-col items-center text-center mt-4 animate-fade-in">
            {/* Viral meme hook tag from the video */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-rajdhani font-bold mb-3 shadow-lg">
              <span className="text-red-400">Subway Surfers ❌</span>
              <span className="text-gray-400">|</span>
              <span className="text-emerald-400">Highway Roadster ✅</span>
            </div>

            <h1 className="font-orbitron font-black text-4xl sm:text-6xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 drop-shadow-[0_0_30px_rgba(244,63,94,0.4)]">
              HIGHWAY ROADSTER
            </h1>

            {/* Prominent creator banner */}
            <div className="flex items-center gap-2 mt-2 px-3.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs sm:text-sm font-rajdhani font-semibold">
              <span>Created by <strong className="text-white font-orbitron">Jesse</strong></span>
              <span>•</span>
              <a
                href="https://instagram.com/jessej6228"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 transition"
              >
                <Instagram className="w-3.5 h-3.5" />
                @jessej6228
              </a>
            </div>
          </div>

          {/* Center Play Button & Stunts Highlights */}
          <div className="flex flex-col items-center gap-6 my-auto">
            <button
              onClick={handleStartGame}
              className="group relative flex items-center gap-3 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 font-orbitron font-black text-lg sm:text-xl tracking-wider text-white shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:shadow-[0_0_45px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>LAUNCH TESLA CYBERTRUCK</span>
            </button>

            <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">
              Press <kbd className="text-cyan-300 px-2 py-0.5 rounded bg-white/10 border border-white/20">Space</kbd> or Tap to Play
            </span>

            {/* Quick feature pill cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl text-center text-xs">
              <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10">
                <span className="font-orbitron font-bold text-cyan-300 block">SWIPE & ROLL</span>
                <span className="text-gray-400 text-[11px]">Swipe left/right to dodge (+240)</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10">
                <span className="font-orbitron font-bold text-pink-400 block">DOUBLE-TAP FLIP</span>
                <span className="text-gray-400 text-[11px]">Double tap in air to flip (+360)</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10">
                <span className="font-orbitron font-bold text-amber-300 block">ROCKET SMASH</span>
                <span className="text-gray-400 text-[11px]">Invincible traffic smash</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10">
                <span className="font-orbitron font-bold text-purple-300 block">NEON WEATHER</span>
                <span className="text-gray-400 text-[11px]">Rain, fog & sunset cycles</span>
              </div>
            </div>
          </div>

          {/* Quick Menu Buttons */}
          <div className="flex items-center gap-3 mb-10">
            <button
              onClick={() => setShowAbout(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition cursor-pointer"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>About Jesse</span>
            </button>
            <button
              onClick={() => setShowGarage(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition cursor-pointer"
            >
              <Palette className="w-4 h-4 text-pink-400" />
              <span>Garage</span>
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Cinematic Intro Launch Countdown Overlay (As seen in video 00:00 - 00:04) */}
      {gameStatus === 'intro' && countdownText && (
        <div className="absolute inset-0 z-40 pointer-events-none flex flex-col items-center justify-center select-none animate-fade-in">
          <div className="font-orbitron font-black text-8xl sm:text-9xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 drop-shadow-[0_0_50px_rgba(244,63,94,0.9)] animate-bounce">
            {countdownText}
          </div>
          <div className="mt-4 px-4 py-1.5 rounded-full bg-black/60 border border-white/20 text-xs font-mono text-gray-300">
            Tap or Space to Skip Launch
          </div>
        </div>
      )}

      {/* Live Game HUD (when intro, playing or paused) */}
      {(gameStatus === 'intro' || gameStatus === 'playing' || gameStatus === 'paused') && (
        <GameHUD
          stats={stats}
          currentStunt={currentStunt}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenAbout={() => setShowAbout(true)}
          onOpenGarage={() => setShowGarage(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onPauseToggle={handlePauseToggle}
          isPaused={gameStatus === 'paused'}
          isGameActive={gameStatus === 'playing' || gameStatus === 'intro'}
        />
      )}

      {/* Mobile Touch Gesture Guidance */}
      {gameStatus === 'playing' && (
        <MobileControls isAirborne={stats.isAirborne} />
      )}

      {/* Game Over Modal (Matches video demo) */}
      {gameStatus === 'crashed' && (
        <GameOverModal
          stats={stats}
          highScore={highScore}
          onRetry={handleRetryGame}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenAbout={() => setShowAbout(true)}
        />
      )}

      {/* About Jesse Modal */}
      {showAbout && <AboutJesseModal onClose={() => setShowAbout(false)} />}

      {/* Garage Modal */}
      {showGarage && (
        <GarageModal
          currentCustomization={customization}
          onSelectCustomization={setCustomization}
          onClose={() => setShowGarage(false)}
        />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          onClose={() => setShowLeaderboard(false)}
          playerScore={stats.score}
        />
      )}

      {/* Prominent Footer (Always accessible) */}
      <ProminentFooter
        onOpenAbout={() => setShowAbout(true)}
        onOpenGarage={() => setShowGarage(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        isGameActive={gameStatus === 'playing'}
      />
    </div>
  );
}
