/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GameMode, GameState, GameOverReason } from './game/types';
import { StartScreen } from './components/StartScreen';
import { GameCanvas } from './components/GameCanvas';
import { GameOverScreen } from './components/GameOverScreen';
import { sounds } from './game/sound';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [gameMode, setGameMode] = useState<GameMode>('touch');
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [isNewBest, setIsNewBest] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('time');

  // Load persisted best score & audio preferences on mount
  useEffect(() => {
    try {
      const savedBest = localStorage.getItem('fruit_slice_best_score');
      if (savedBest) {
        setBestScore(parseInt(savedBest, 10) || 0);
      }
      setIsMuted(sounds.getMuted());
    } catch {
      // Ignore local storage error in private mode
    }
  }, []);

  const handleStartPlay = (mode: GameMode) => {
    setGameMode(mode);
    setCurrentScore(0);
    setIsNewBest(false);
    setRecordingUrl(null);
    setGameState('playing');
    sounds.playStart();
  };

  const handleGameOver = (finalScore: number, reason: GameOverReason = 'time') => {
    setCurrentScore(finalScore);
    setGameOverReason(reason);

    if (finalScore > bestScore) {
      setBestScore(finalScore);
      setIsNewBest(true);
      try {
        localStorage.setItem('fruit_slice_best_score', String(finalScore));
      } catch {}
    } else {
      setIsNewBest(false);
    }

    setGameState('gameover');
  };

  const handlePlayAgain = () => {
    setCurrentScore(0);
    setIsNewBest(false);
    setGameState('playing');
    sounds.playStart();
  };

  const handleHome = () => {
    setGameState('start');
  };

  const handleToggleMute = () => {
    const nextMute = sounds.toggleMute();
    setIsMuted(nextMute);
  };

  return (
    <main className="w-full h-screen overflow-hidden bg-slate-950 font-display">
      {gameState === 'start' && (
        <StartScreen
          bestScore={bestScore}
          onPlay={handleStartPlay}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === 'playing' && (
        <GameCanvas
          gameMode={gameMode}
          bestScore={bestScore}
          onGameOver={handleGameOver}
          onQuit={handleHome}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onSwitchMode={(mode) => setGameMode(mode)}
          onRecordingChange={(url) => setRecordingUrl(url)}
        />
      )}

      {gameState === 'gameover' && (
        <GameOverScreen
          score={currentScore}
          bestScore={bestScore}
          isNewBest={isNewBest}
          gameMode={gameMode}
          recordingUrl={recordingUrl}
          reason={gameOverReason}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )}
    </main>
  );
}
