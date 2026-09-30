import React, { useState } from 'react';
import { Activity, EyeOff } from 'lucide-react';

interface DebugIndicatorProps {
  gameFps: number;
  cameraFps: number;
  handDetectionFps: number;
  detectionBusy: boolean;
  pendingFrames: number;
  trackingStatus: 'DETECTED' | 'LOST' | 'OFF';
  latencyMs: number;
}

export const DebugIndicator: React.FC<DebugIndicatorProps> = ({
  gameFps,
  cameraFps,
  handDetectionFps,
  detectionBusy,
  pendingFrames,
  trackingStatus,
  latencyMs,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  if (!isVisible) {
    return (
      <button
        id="show-debug-btn"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-3 right-3 z-30 pointer-events-auto flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 rounded-lg text-[11px] font-mono shadow-md backdrop-blur transition cursor-pointer"
        title="Show Performance & Latency Monitor"
      >
        <Activity className="w-3 h-3 text-emerald-400" />
        <span>DEBUG</span>
      </button>
    );
  }

  return (
    <div
      id="debug-fps-indicator"
      className="fixed bottom-3 right-3 z-30 pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl text-[10.5px] font-mono text-slate-200 shadow-xl shadow-black/50 select-none overflow-x-auto max-w-[96vw]"
    >
      {/* Game FPS */}
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Game FPS:</span>
        <span
          className={`font-bold ${
            gameFps >= 50
              ? 'text-emerald-400'
              : gameFps >= 30
              ? 'text-amber-400'
              : 'text-rose-400'
          }`}
        >
          {gameFps}
        </span>
      </div>

      <span className="text-slate-700 font-sans">|</span>

      {/* Camera FPS */}
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Camera FPS:</span>
        <span
          className={`font-bold ${
            trackingStatus === 'OFF'
              ? 'text-slate-500'
              : cameraFps >= 24
              ? 'text-sky-400'
              : 'text-amber-400'
          }`}
        >
          {trackingStatus === 'OFF' ? 'OFF' : `${cameraFps}`}
        </span>
      </div>

      <span className="text-slate-700 font-sans">|</span>

      {/* Hand Detection FPS */}
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Hand Detection FPS:</span>
        <span
          className={`font-bold ${
            trackingStatus === 'OFF'
              ? 'text-slate-500'
              : handDetectionFps >= 22
              ? 'text-cyan-400'
              : 'text-amber-400'
          }`}
        >
          {trackingStatus === 'OFF' ? 'OFF' : `${handDetectionFps}`}
        </span>
      </div>

      <span className="text-slate-700 font-sans">|</span>

      {/* Detection Busy: YES/NO */}
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Detection Busy:</span>
        <span
          className={`font-bold ${
            detectionBusy ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          {detectionBusy ? 'YES' : 'NO'}
        </span>
      </div>

      <span className="text-slate-700 font-sans">|</span>

      {/* Pending Frames: 0/1 (Crucial: Should never continuously increase) */}
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Pending Frames:</span>
        <span
          className={`font-bold ${
            pendingFrames <= 1 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
          }`}
        >
          {pendingFrames}
        </span>
      </div>

      <span className="text-slate-700 font-sans">|</span>

      {/* Hand: DETECTED/LOST */}
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Hand:</span>
        <span
          className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
            trackingStatus === 'DETECTED'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
              : trackingStatus === 'LOST'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
              : 'bg-slate-900 text-slate-500 border border-slate-800'
          }`}
        >
          {trackingStatus}
        </span>
      </div>

      {trackingStatus !== 'OFF' && (
        <>
          <span className="text-slate-700 font-sans">|</span>
          {/* Latency approx */}
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Latency:</span>
            <span
              className={`font-bold ${
                latencyMs <= 25 ? 'text-emerald-400' : latencyMs <= 40 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              ~{latencyMs}ms
            </span>
          </div>
        </>
      )}

      {/* Hide Button */}
      <button
        id="hide-debug-btn"
        onClick={() => setIsVisible(false)}
        className="ml-1 text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer transition shrink-0"
        title="Hide Debug Monitor"
      >
        <EyeOff className="w-3 h-3" />
      </button>
    </div>
  );
};

