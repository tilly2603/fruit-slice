import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Home, Trophy, Download, Flame, Sparkles, Bomb as BombIcon } from 'lucide-react';
import { sounds } from '../game/sound';
import { GameMode, GameOverReason } from '../game/types';

interface GameOverScreenProps {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  gameMode: GameMode;
  recordingUrl: string | null;
  reason?: GameOverReason;
  onPlayAgain: () => void;
  onHome: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  bestScore,
  isNewBest,
  gameMode,
  recordingUrl,
  reason = 'time',
  onPlayAgain,
  onHome,
}) => {
  useEffect(() => {
    sounds.playGameOver();
    if (isNewBest && score > 0) {
      // Trigger festive arcade confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#facc15', '#f43f5e', '#38bdf8', '#4ade80', '#fb923c'],
        });
      } catch {}
    }
  }, [isNewBest, score]);

  const isBomb = reason === 'bomb';

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white select-none z-30">
      {/* Background radial glow */}
      <div
        className={`absolute w-[32rem] h-[32rem] ${
          isBomb ? 'bg-rose-600/15' : 'bg-amber-500/10'
        } rounded-full blur-3xl pointer-events-none`}
      />

      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl shadow-black/80">
        {/* NEW BEST BANNER */}
        {isNewBest && score > 0 && (
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-arcade text-xs sm:text-sm tracking-wider shadow-lg shadow-amber-500/30 animate-bounce">
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>NEW BEST!</span>
            <Sparkles className="w-4 h-4 fill-slate-950" />
          </div>
        )}

        {/* Bomb Defeat Badge */}
        {isBomb && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <BombIcon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Hazard Bomb Sliced</span>
          </div>
        )}

        {/* Title */}
        <h1 className="font-arcade text-4xl sm:text-5xl text-rose-500 text-glow-red tracking-wider">
          {isBomb ? '💥 BOOM! 💥' : 'GAME OVER'}
        </h1>
        <p className="text-sm text-slate-300 mt-1 font-semibold">
          {isBomb
            ? 'A hazard bomb detonated! Dodge the bombs next round.'
            : 'Time expired! Great slicing session.'}
        </p>

        {/* Score Card Box */}
        <div className="w-full my-6 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>FINAL SCORE</span>
            </div>
            <span className="font-arcade text-3xl sm:text-4xl text-yellow-400">
              {score}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>BEST SCORE</span>
            </div>
            <span className="font-arcade text-2xl text-amber-300">
              {bestScore}
            </span>
          </div>
        </div>

        {/* Download Recording if available */}
        {recordingUrl && (
          <div className="w-full mb-5">
            <a
              id="gameover-download-btn"
              href={recordingUrl}
              download="fruit-slice-gameplay.webm"
              onClick={() => sounds.playClick()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition cursor-pointer border border-emerald-400"
            >
              <Download className="w-4 h-4" />
              <span>SAVE / DOWNLOAD RECORDING</span>
            </a>
          </div>
        )}

        {/* Buttons: PLAY AGAIN & HOME */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button
            id="gameover-play-again-btn"
            onClick={() => {
              sounds.playClick();
              onPlayAgain();
            }}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-base shadow-[0_4px_0_#c2410c] active:translate-y-1 active:shadow-none transition flex items-center justify-center gap-2 cursor-pointer border border-amber-300"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            id="gameover-home-btn"
            onClick={() => {
              sounds.playClick();
              onHome();
            }}
            className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <Home className="w-5 h-5" />
            <span>HOME</span>
          </button>
        </div>

        {/* Mode reminder */}
        <span className="text-xs text-slate-500 mt-4 font-semibold">
          Mode played: {gameMode === 'camera' ? 'Camera (Finger Sword)' : 'Mouse / Touch'}
        </span>
      </div>
    </div>
  );
};
