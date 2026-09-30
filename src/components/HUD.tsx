import React from 'react';
import { Camera, CameraOff, Video, Download, Volume2, VolumeX, Flame, Clock, Trophy, Zap } from 'lucide-react';
import { GameMode } from '../game/types';
import { CameraStatus } from '../handTracking/handTracker';
import { sounds } from '../game/sound';
import { PacingConfig } from '../game/fruit';

interface HUDProps {
  score: number;
  combo: number;
  timeLeft: number;
  bestScore: number;
  gameMode: GameMode;
  cameraStatus: CameraStatus;
  cameraError: string;
  isRecording: boolean;
  recordingUrl: string | null;
  pacing?: PacingConfig;
  onToggleCamera: () => void;
  onToggleRecording: () => void;
  onClearRecording: () => void;
  onSwitchMode: (mode: GameMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onQuit: () => void;
  onRetryCamera?: () => void;
}

const HUDComponent: React.FC<HUDProps> = ({
  score,
  combo,
  timeLeft,
  bestScore,
  gameMode,
  cameraStatus,
  cameraError,
  isRecording,
  recordingUrl,
  pacing,
  onToggleCamera,
  onToggleRecording,
  onClearRecording,
  onSwitchMode,
  isMuted,
  onToggleMute,
  onQuit,
  onRetryCamera,
}) => {
  const isTimeCritical = timeLeft <= 10;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar: Stats, Timer, and Mode Status */}
      <div className="w-full flex items-start justify-between gap-3">
        {/* Left: Score & Combo */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Score Box */}
          <div className="flex items-baseline gap-2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/60 shadow-lg shadow-black/40">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</span>
            <span className="font-arcade text-2xl sm:text-4xl text-amber-300 tracking-wider">
              {score}
            </span>
          </div>

          {/* Dynamic Speed / Pace Indicator */}
          {pacing && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow text-xs">
              <Zap className="w-3.5 h-3.5" style={{ color: pacing.paceColor }} />
              <span className="text-slate-400 font-medium">Speed:</span>
              <span className="font-bold tracking-wide" style={{ color: pacing.paceColor }}>
                {pacing.paceLabel}
              </span>
              <div className="w-10 sm:w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-1 border border-slate-700/50">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.max(10, pacing.progressPercent)}%`,
                    backgroundColor: pacing.paceColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* Active Combo Badge */}
          {combo > 1 && (
            <div className="animate-bounce flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 text-white font-arcade text-xs sm:text-sm tracking-wider shadow-md shadow-rose-600/40 border border-rose-400">
              <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              <span>COMBO x{combo}</span>
              <span className="text-yellow-200 font-bold ml-1">+{combo * 10}</span>
            </div>
          )}
        </div>

        {/* Center: Timer Countdown */}
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-2 px-5 py-2 rounded-2xl backdrop-blur-md border shadow-xl transition-all ${
              isTimeCritical
                ? 'bg-rose-950/90 border-rose-500/80 text-rose-300 animate-pulse scale-105'
                : 'bg-slate-900/85 border-slate-700/60 text-slate-100'
            }`}
          >
            <Clock className={`w-5 h-5 ${isTimeCritical ? 'text-rose-400 animate-spin' : 'text-cyan-400'}`} />
            <div className="flex items-baseline gap-1">
              <span className="font-arcade text-2xl sm:text-4xl tracking-wider">{timeLeft}</span>
              <span className="text-xs font-bold text-slate-400">SEC</span>
            </div>
          </div>
          {/* Timer progress mini bar */}
          <div className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-slate-700/50">
            <div
              className={`h-full transition-all duration-300 ${
                isTimeCritical ? 'bg-rose-500' : 'bg-cyan-400'
              }`}
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* Right: Best Score & Quick Controls */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Best Score Pill */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs sm:text-sm font-semibold text-amber-300 shadow">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Best:</span>
            <span className="font-arcade text-amber-300">{bestScore}</span>
          </div>

          {/* Sound & Quit buttons */}
          <div className="flex items-center gap-2">
            <button
              id="hud-sound-toggle-btn"
              onClick={() => {
                sounds.playClick();
                onToggleMute();
              }}
              className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              title="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              id="hud-quit-btn"
              onClick={() => {
                sounds.playClick();
                onQuit();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 hover:bg-rose-900/50 hover:border-rose-700 text-slate-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer"
            >
              QUIT
            </button>
          </div>
        </div>
      </div>

      {/* Middle Alerts / Notifications: Camera Loading / Errors */}
      {gameMode === 'camera' && cameraStatus !== 'ready' && (
        <div className="mx-auto max-w-md w-full pointer-events-auto">
          {cameraStatus === 'loading' && (
            <div className="p-3 bg-indigo-950/90 border border-indigo-500/50 rounded-2xl backdrop-blur-md text-center text-sm font-semibold text-indigo-200 flex items-center justify-center gap-2 shadow-2xl animate-pulse">
              <Camera className="w-5 h-5 text-indigo-400 animate-spin" />
              <span>Starting camera & loading AI hand-tracker...</span>
            </div>
          )}

          {(cameraStatus === 'permission_denied' ||
            cameraStatus === 'unavailable' ||
            cameraStatus === 'unsupported' ||
            cameraStatus === 'error') && (
            <div className="p-4 bg-rose-950/90 border border-rose-500 rounded-2xl backdrop-blur-md text-center text-sm text-rose-200 shadow-2xl flex flex-col gap-2">
              <div className="font-bold flex items-center justify-center gap-1.5 text-rose-300">
                <CameraOff className="w-5 h-5" />
                <span>Camera Notice</span>
              </div>
              <p className="text-xs text-rose-300/90">
                {cameraError || 'Camera could not be accessed in this browser.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {onRetryCamera && (
                  <button
                    id="hud-retry-camera-btn"
                    onClick={() => {
                      sounds.playClick();
                      onRetryCamera();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Try Camera Again</span>
                  </button>
                )}
                <button
                  id="hud-fallback-touch-btn"
                  onClick={() => {
                    sounds.playClick();
                    onSwitchMode('touch');
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer transition"
                >
                  Play in Mouse / Touch Mode
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar: Mode Indicator, Camera Toggle & Recording Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Mode Status Badge */}
        <div className="flex items-center gap-2">
          {gameMode === 'camera' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold backdrop-blur">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Camera: {cameraStatus === 'ready' ? 'ON (Finger Sword)' : 'Loading...'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold backdrop-blur">
              <span>Mouse / Touch Mode</span>
            </div>
          )}

          {/* Switch Mode / Toggle Camera Button */}
          {gameMode === 'camera' ? (
            <button
              id="hud-turn-camera-off-btn"
              onClick={() => {
                sounds.playClick();
                onToggleCamera();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer backdrop-blur"
            >
              <CameraOff className="w-3.5 h-3.5 text-rose-400" />
              <span>TURN CAMERA OFF</span>
            </button>
          ) : (
            <button
              id="hud-switch-to-camera-btn"
              onClick={() => {
                sounds.playClick();
                onSwitchMode('camera');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-emerald-300 text-xs font-bold transition cursor-pointer backdrop-blur"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>SWITCH TO CAMERA</span>
            </button>
          )}
        </div>

        {/* Right side: Recording Controls (Record / Recording / Download) */}
        <div className="flex items-center gap-2">
          {/* Active Recording or Toggle Record */}
          {gameMode === 'camera' && (
            <button
              id="hud-record-toggle-btn"
              onClick={() => {
                sounds.playClick();
                onToggleRecording();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer backdrop-blur shadow-lg ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse border border-rose-300'
                  : 'bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRecording ? 'bg-white animate-ping' : 'bg-rose-500'
                }`}
              />
              <Video className="w-3.5 h-3.5" />
              <span>{isRecording ? '● RECORDING (Click to Stop)' : 'RECORD'}</span>
            </button>
          )}

          {/* Download Recording Button when available */}
          {recordingUrl && (
            <a
              id="hud-download-recording-btn"
              href={recordingUrl}
              download="fruit-slice-gameplay.webm"
              onClick={() => {
                sounds.playClick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow cursor-pointer border border-emerald-300 animate-bounce"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SAVE RECORDING</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export const HUD = React.memo(HUDComponent);
