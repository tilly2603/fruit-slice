import React from 'react';
import { Play, Camera, MousePointer, Volume2, VolumeX, Sparkles, Trophy } from 'lucide-react';
import { FRUIT_CONFIGS } from '../game/types';
import { sounds } from '../game/sound';

interface StartScreenProps {
  bestScore: number;
  onPlay: (mode: 'touch' | 'camera') => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  bestScore,
  onPlay,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white select-none overflow-y-auto">
      {/* Top Bar: Mute & High Score */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <button
          id="sound-toggle-btn"
          onClick={() => {
            sounds.playClick();
            onToggleMute();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 transition text-sm font-semibold cursor-pointer backdrop-blur"
          title="Toggle Sound"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span className="text-slate-400">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Sound ON</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm sm:text-base">
          <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>BEST SCORE:</span>
          <span className="font-arcade text-amber-200 text-lg tracking-wider">{bestScore}</span>
        </div>
      </div>

      {/* Hero Title Section */}
      <div className="my-auto flex flex-col items-center text-center z-10 py-6">
        {/* Floating animated badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-bold tracking-widest uppercase mb-4 shadow-lg shadow-rose-500/10">
          <Sparkles className="w-3.5 h-3.5 animate-spin text-rose-400" />
          Arcade Fruit Slicing Game
        </div>

        {/* Main 3D Title */}
        <div className="relative">
          <h1 className="font-arcade text-5xl sm:text-6xl md:text-8xl tracking-wider text-yellow-300 drop-shadow-[0_8px_0_rgba(180,83,9,1)] text-glow-yellow">
            FRUIT SLICE
          </h1>
          <div className="absolute -top-3 -right-6 text-3xl sm:text-4xl animate-bounce">
            🍉
          </div>
          <div className="absolute -bottom-2 -left-6 text-3xl sm:text-4xl animate-bounce delay-150">
            🍍
          </div>
        </div>

        <p className="mt-4 text-lg sm:text-2xl font-bold text-slate-200 drop-shadow-md">
          &ldquo;Slice the fruit. Don't miss!&rdquo;
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
          {/* CAMERA MODE (Hero Button) */}
          <button
            id="start-camera-mode-btn"
            onClick={() => {
              sounds.playClick();
              onPlay('camera');
            }}
            className="group relative w-full sm:w-1/2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-lg sm:text-xl shadow-[0_6px_0_#0f766e] active:translate-y-1 active:shadow-[0_2px_0_#0f766e] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-emerald-300"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-6 h-6 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>CAMERA MODE</span>
            </div>
            <span className="text-xs font-semibold text-slate-900/80">
              Wave finger like a sword!
            </span>
          </button>

          {/* PLAY (Touch/Mouse Mode) */}
          <button
            id="start-play-btn"
            onClick={() => {
              sounds.playClick();
              onPlay('touch');
            }}
            className="group relative w-full sm:w-1/2 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-lg sm:text-xl shadow-[0_6px_0_#c2410c] active:translate-y-1 active:shadow-[0_2px_0_#c2410c] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border border-amber-200"
          >
            <div className="flex items-center gap-2">
              <Play className="w-6 h-6 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>PLAY</span>
            </div>
            <span className="text-xs font-semibold text-slate-900/80">
              Mouse / Touch Mode
            </span>
          </button>
        </div>

        {/* Controls Instructions Hint */}
        <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-300 max-w-md w-full flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
            <Camera className="w-4 h-4" />
            <span>Camera: Move your finger to slice</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <MousePointer className="w-4 h-4" />
            <span>Mouse/Touch: Swipe to slice</span>
          </div>
        </div>

        {/* Fruit Points Showcase */}
        <div className="mt-8 w-full max-w-2xl bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Target Fruit Points & Hazards (60s Blitz)
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
            {Object.values(FRUIT_CONFIGS).map((fruit) => {
              const icons: Record<string, string> = {
                apple: '🍎',
                orange: '🍊',
                banana: '🍌',
                watermelon: '🍉',
                pineapple: '🍍',
                starfruit: '⭐',
              };
              const isSpecial = fruit.type === 'starfruit';
              return (
                <div
                  key={fruit.type}
                  className={`flex flex-col items-center p-2 rounded-xl border ${
                    isSpecial
                      ? 'bg-yellow-500/15 border-yellow-500/40 shadow-sm shadow-yellow-500/20'
                      : 'bg-slate-800/50 border-slate-700/40'
                  }`}
                >
                  <span className={`text-2xl sm:text-3xl mb-1 ${isSpecial ? 'animate-pulse' : ''}`}>
                    {icons[fruit.type]}
                  </span>
                  <span className="text-xs font-bold text-slate-300 line-clamp-1">{fruit.name}</span>
                  <span
                    className={`text-xs font-extrabold ${
                      isSpecial ? 'text-yellow-300' : 'text-amber-400'
                    }`}
                  >
                    +{fruit.points} pts
                  </span>
                </div>
              );
            })}

            {/* Bomb Hazard Card */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-rose-950/40 border border-rose-600/40 shadow-sm shadow-rose-600/20">
              <span className="text-2xl sm:text-3xl mb-1">💣</span>
              <span className="text-xs font-bold text-rose-300">Bomb</span>
              <span className="text-xs font-extrabold text-rose-400">AVOID!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full text-center text-xs text-slate-500 z-10 pt-2">
        <span>Fruit Slice Arcade • Pure HTML5 Canvas & MediaPipe AI Tracking</span>
      </div>

      {/* Subtle Background Decorative Blobs */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
