import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Fruit,
  Bomb,
  SlicedHalf,
  Particle,
  SplatDecal,
  ComboBanner,
  TrailPoint,
  GameMode,
  GameOverReason,
} from '../game/types';
import {
  spawnFruit,
  createSlicedHalves,
  drawFruit,
  drawSlicedHalf,
  getPacingForScore,
  PacingConfig,
} from '../game/fruit';
import { spawnBomb, drawBomb, generateFuseParticles } from '../game/bomb';
import { checkSegmentCircleCollision } from '../game/collision';
import {
  createSliceJuiceParticles,
  createExplosionParticles,
  createSplatDecal,
  drawParticles,
  drawSplats,
  drawComboBanners,
} from '../game/particles';
import { drawSlashTrail, drawFingertipMarker } from '../game/slashTrail';
import { sounds } from '../game/sound';
import { HandTrackerManager, CameraStatus, FingertipState } from '../handTracking/handTracker';
import { GameRecorder } from '../game/recorder';
import { HUD } from './HUD';
import { DebugIndicator } from './DebugIndicator';

interface GameCanvasProps {
  gameMode: GameMode;
  bestScore: number;
  onGameOver: (finalScore: number, reason: GameOverReason) => void;
  onQuit: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onSwitchMode: (mode: GameMode) => void;
  onRecordingChange?: (url: string | null) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameMode,
  bestScore,
  onGameOver,
  onQuit,
  isMuted,
  onToggleMute,
  onSwitchMode,
  onRecordingChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // HUD & Game State
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [pacing, setPacing] = useState<PacingConfig>(() => getPacingForScore(0));

  // Performance & Debug Monitor State
  const [debugFps, setDebugFps] = useState<number>(60);
  const [debugCameraFps, setDebugCameraFps] = useState<number>(0);
  const [debugDetectionFps, setDebugDetectionFps] = useState<number>(0);
  const [debugDetectionBusy, setDebugDetectionBusy] = useState<boolean>(false);
  const [debugTrackingStatus, setDebugTrackingStatus] = useState<'DETECTED' | 'LOST' | 'OFF'>('OFF');
  const [debugPendingFrames, setDebugPendingFrames] = useState<number>(0);
  const [debugLatencyMs, setDebugLatencyMs] = useState<number>(0);

  // Mutable Game Engine Refs (to avoid re-renders inside 60fps loop)
  const engineRef = useRef({
    score: 0,
    combo: 0,
    comboTimer: 0,
    timeLeft: 60,
    isGameOver: false,
    bombExploded: false,
    bombExplodeTime: 0,
    screenShake: 0,
    flashAlpha: 0,
    fruits: [] as Fruit[],
    bombs: [] as Bomb[],
    slicedHalves: [] as SlicedHalf[],
    particles: [] as Particle[],
    splats: [] as SplatDecal[],
    comboBanners: [] as ComboBanner[],
    trail: [] as TrailPoint[],
    lastMousePos: null as { x: number; y: number } | null,
    isPointerDown: false,
    lastSpawnTime: 0,
    spawnInterval: 2500,
    fingertip: null as FingertipState | null,
    prevFingerPos: null as { x: number; y: number } | null,
    width: 1024,
    height: 768,
    hudDirty: false,
    lastHudSyncTime: 0,
    isLowPerf: false,
  });

  const handTrackerRef = useRef<HandTrackerManager | null>(null);
  const recorderRef = useRef<GameRecorder | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Synchronization refs to preserve single game loop across renders
  const gameModeRef = useRef(gameMode);
  const cameraStatusRef = useRef(cameraStatus);
  const isRecordingRef = useRef(isRecording);
  const handleSliceRef = useRef<(x1: number, y1: number, x2: number, y2: number, isFinger: boolean) => void>(() => {});
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    gameModeRef.current = gameMode;
    cameraStatusRef.current = cameraStatus;
    isRecordingRef.current = isRecording;
    onGameOverRef.current = onGameOver;
  });

  // Initialize HandTracker & Recorder
  useEffect(() => {
    handTrackerRef.current = new HandTrackerManager((status, err) => {
      setCameraStatus(status);
      if (err) setCameraError(err);
    });

    if (videoRef.current && handTrackerRef.current) {
      handTrackerRef.current.attachVideoElement(videoRef.current);
    }

    recorderRef.current = new GameRecorder((recording, url) => {
      setIsRecording(recording);
      setRecordingUrl(url);
      onRecordingChange?.(url);
    });

    return () => {
      if (handTrackerRef.current) {
        handTrackerRef.current.destroy();
      }
      if (recorderRef.current) {
        recorderRef.current.clearRecording();
      }
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  // Handle Camera Mode startup & shutdown
  useEffect(() => {
    if (videoRef.current && handTrackerRef.current) {
      handTrackerRef.current.attachVideoElement(videoRef.current);
    }
    if (gameMode === 'camera') {
      handTrackerRef.current?.startCamera();
    } else {
      handTrackerRef.current?.stopCamera();
    }
  }, [gameMode]);

  // Handle 60s countdown timer
  useEffect(() => {
    engineRef.current.timeLeft = 60;
    setTimeLeft(60);

    const timer = setInterval(() => {
      engineRef.current.timeLeft -= 1;
      const currentRemaining = engineRef.current.timeLeft;
      setTimeLeft(currentRemaining);

      if (currentRemaining <= 0) {
        clearInterval(timer);
        engineRef.current.isGameOver = true;
        // Stop recording if active
        if (recorderRef.current?.getIsRecording()) {
          recorderRef.current.stopRecording();
        }
        // Stop camera tracks
        handTrackerRef.current?.stopCamera();
        onGameOver(engineRef.current.score, 'time');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onGameOver]);

  // Slicing Hit Handler
  const handleSlice = useCallback(
    (x1: number, y1: number, x2: number, y2: number, isFingerSword: boolean) => {
      const state = engineRef.current;
      if (state.isGameOver || state.bombExploded) return;

      const now = performance.now();

      // 1. Check Collision Against Bombs (DANGER: Slicing a bomb detonates it!)
      for (const bomb of state.bombs) {
        if (bomb.sliced) continue;

        const hit = checkSegmentCircleCollision(x1, y1, x2, y2, bomb.x, bomb.y, bomb.radius);
        if (hit.hit) {
          bomb.sliced = true;
          state.bombExploded = true;
          state.bombExplodeTime = now;
          state.screenShake = 35;
          state.flashAlpha = 1.0;

          // Catastrophic explosion audio
          sounds.playBombExplode();

          // Huge fiery blast and shockwaves
          const explosions = createExplosionParticles(hit.hitX, hit.hitY);
          state.particles.push(...explosions);

          // Explosive banner
          state.comboBanners.push({
            id: `boom_${now}`,
            text: '💥 BOOM! 💥',
            subtext: 'BOMB DETONATED!',
            x: state.width * 0.5,
            y: state.height * 0.42,
            color: '#ef4444',
            life: 80,
            maxLife: 80,
          });

          // Stop recording & camera
          if (recorderRef.current?.getIsRecording()) {
            recorderRef.current.stopRecording();
          }
          handTrackerRef.current?.stopCamera();

          return;
        }
      }

      let slicedAny = false;
      let pointsEarned = 0;

      // 2. Check collision against all unsliced fruits
      for (const fruit of state.fruits) {
        if (fruit.sliced) continue;

        const hit = checkSegmentCircleCollision(x1, y1, x2, y2, fruit.x, fruit.y, fruit.radius);

        if (hit.hit) {
          fruit.sliced = true;
          slicedAny = true;

          // Sound effects: special glittering chime for glowing starfruit!
          if (fruit.type === 'starfruit') {
            sounds.playStarFruitSlice();
          } else {
            sounds.playSlice();
          }
          sounds.playSplat();

          // Spawn sliced halves
          const [leftHalf, rightHalf] = createSlicedHalves(fruit, hit.sliceAngle);
          state.slicedHalves.push(leftHalf, rightHalf);

          // Juice and sparks (and stars for starfruit)
          const newParticles = createSliceJuiceParticles(
            hit.hitX,
            hit.hitY,
            fruit.type,
            hit.sliceAngle
          );
          state.particles.push(...newParticles);

          // Background splat decal (cap max splats to 4 to maintain clean canvas and 60fps)
          if (state.splats.length > 4) {
            state.splats.shift();
          }
          state.splats.push(createSplatDecal(hit.hitX, hit.hitY, fruit.type));

          // Bonus feedback banner for Special Star Fruit
          if (fruit.type === 'starfruit') {
            state.comboBanners.push({
              id: `star_${now}`,
              text: '★ STAR FRUIT! ★',
              subtext: '+60 BONUS PTS!',
              x: Math.max(140, Math.min(state.width - 140, hit.hitX)),
              y: Math.max(100, Math.min(state.height - 100, hit.hitY - 30)),
              color: '#facc15',
              life: 45,
              maxLife: 45,
            });
          }

          pointsEarned += fruit.points;
        }
      }

      if (slicedAny) {
        // Update combo system
        state.combo += 1;
        state.comboTimer = now + 420; // 420ms window for multi-slice combos

        let comboBonus = 0;
        if (state.combo >= 2) {
          comboBonus = state.combo * 10;
          sounds.playCombo(state.combo);

          // Add pop combo banner
          state.comboBanners.push({
            id: `combo_${now}`,
            text: `COMBO x${state.combo}!`,
            subtext: `+${comboBonus} BONUS`,
            x: Math.max(120, Math.min(state.width - 120, (x1 + x2) / 2)),
            y: Math.max(120, Math.min(state.height - 120, (y1 + y2) / 2 - 30)),
            color: state.combo >= 4 ? '#f43f5e' : state.combo >= 3 ? '#fbbf24' : '#38bdf8',
            life: 40,
            maxLife: 40,
          });
        }

        const totalEarned = pointsEarned + comboBonus;
        state.score += totalEarned;
        state.hudDirty = true;
      }
    },
    []
  );

  // Synchronize handleSlice with ref
  useEffect(() => {
    handleSliceRef.current = handleSlice;
  }, [handleSlice]);

  // Main Game Loop (single requestAnimationFrame loop, frame-rate independent physics)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let renderFrameCount = 0;
    let lastFpsCalcTime = performance.now();

    const renderLoop = (time: number) => {
      // Clamped delta time in milliseconds (prevents large jumps after background tab inactive)
      const dt = Math.max(1, Math.min(50, time - lastTime));
      lastTime = time;
      // Normalized time scale (1.0 = 16.667ms / 60 FPS)
      const timeScale = dt / 16.667;

      const state = engineRef.current;
      const width = state.width;
      const height = state.height;

      // 1. Process Hand Tracker in Camera Mode
      const currentGameMode = gameModeRef.current;
      const currentCameraStatus = cameraStatusRef.current;
      if (currentGameMode === 'camera' && handTrackerRef.current) {
        const finger = handTrackerRef.current.processFrame(width, height, time);
        state.fingertip = finger;

        if (finger && finger.detected) {
          state.trail.push({ x: finger.canvasX, y: finger.canvasY, time });
          // Strictly cap fingertip trail history to 10 points to prevent memory buildup
          if (state.trail.length > 10) {
            state.trail.splice(0, state.trail.length - 10);
          }

          if (state.prevFingerPos && finger.isSlashing) {
            handleSliceRef.current(
              state.prevFingerPos.x,
              state.prevFingerPos.y,
              finger.canvasX,
              finger.canvasY,
              true
            );
          }

          state.prevFingerPos = { x: finger.canvasX, y: finger.canvasY };
        } else {
          state.prevFingerPos = null;
        }
      }

      // 2. Measure real-time Render FPS, Hand Tracking FPS, and Latency Metrics
      renderFrameCount++;
      if (time - lastFpsCalcTime >= 400) {
        const elapsed = time - lastFpsCalcTime;
        const currentFps = Math.round((renderFrameCount * 1000) / elapsed);
        renderFrameCount = 0;
        lastFpsCalcTime = time;

        setDebugFps(currentFps);
        const tracker = handTrackerRef.current;
        if (tracker && currentGameMode === 'camera' && currentCameraStatus === 'ready') {
          setDebugCameraFps(tracker.getCameraFps());
          setDebugDetectionFps(tracker.getDetectionFps());
          setDebugDetectionBusy(tracker.isDetectionBusy());
          setDebugTrackingStatus(tracker.isHandDetected() ? 'DETECTED' : 'LOST');
          setDebugPendingFrames(tracker.getPendingFrames());
          setDebugLatencyMs(tracker.getInferenceLatency());
        } else {
          setDebugCameraFps(0);
          setDebugDetectionFps(0);
          setDebugDetectionBusy(false);
          setDebugTrackingStatus('OFF');
          setDebugPendingFrames(0);
          setDebugLatencyMs(0);
        }

        // Automatic performance safeguard
        if (currentFps < 35) {
          state.isLowPerf = true;
        } else if (currentFps > 45) {
          state.isLowPerf = false;
        }
      }

      // 3. Combo Timer Decay & Throttled HUD State Synchronization
      if (state.combo > 0 && time > state.comboTimer) {
        state.combo = 0;
        state.hudDirty = true;
      }

      // Smooth throttled HUD sync to React (bypasses React reconciliation jank during slices)
      if (state.hudDirty && time - state.lastHudSyncTime > 60) {
        state.hudDirty = false;
        state.lastHudSyncTime = time;
        setScore(state.score);
        setCombo(state.combo);
        setPacing(getPacingForScore(state.score));
      }

      // 4. Clear Screen & Draw Background
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      // Apply screen shake (e.g. when bomb explodes)
      if (state.screenShake > 0) {
        const sx = (Math.random() - 0.5) * state.screenShake;
        const sy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(sx, sy);
        state.screenShake = Math.max(0, state.screenShake * Math.pow(0.88, timeScale));
        if (state.screenShake < 0.5) state.screenShake = 0;
      }

      const video = handTrackerRef.current?.getVideo();
      const isCameraActive =
        currentGameMode === 'camera' &&
        currentCameraStatus === 'ready' &&
        video &&
        video.readyState >= 2;

      if (isCameraActive) {
        // When recording is active, draw camera onto canvas for the MediaRecorder stream
        if (isRecordingRef.current) {
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, width, height);
          ctx.restore();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
          ctx.fillRect(0, 0, width, height);
        }
        // Note: When not recording, the HTML5 <video> element rendered underneath
        // transparent canvas displays the camera stream in hardware with ZERO GPU/canvas copy cost!
      } else {
        // Polished arcade dojo dark gradient
        const bgGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.4,
          50,
          width * 0.5,
          height * 0.5,
          Math.max(width, height) * 0.8
        );
        bgGrad.addColorStop(0, '#1e1b4b'); // indigo deep core
        bgGrad.addColorStop(0.5, '#0f172a');
        bgGrad.addColorStop(1, '#020617'); // slate pitch black
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Subtle arcade grid lines
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridSize = 48;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5. Draw Background Splats
      drawSplats(ctx, state.splats);
      // Fade out splats gently and prune completely faded splats to prevent GPU memory leak
      for (let i = state.splats.length - 1; i >= 0; i--) {
        const s = state.splats[i];
        s.alpha -= 0.008 * timeScale;
        if (s.alpha <= 0.01) {
          state.splats.splice(i, 1);
        }
      }
      if (state.splats.length > (state.isLowPerf ? 2 : 4)) {
        state.splats.splice(0, state.splats.length - (state.isLowPerf ? 2 : 4));
      }

      // 6. Dynamic Score-Based Spawning & Pacing
      const currentPacing = getPacingForScore(state.score);
      state.spawnInterval = currentPacing.spawnInterval;

      // Count active unsliced fruits currently on canvas
      const activeUncutFruits = state.fruits.filter((f) => !f.sliced).length;

      if (!state.isGameOver && !state.bombExploded && time - state.lastSpawnTime > state.spawnInterval) {
        // Enforce maxSimultaneousFruits so the player isn't overwhelmed (prevents crowding)
        if (activeUncutFruits < currentPacing.maxSimultaneousFruits) {
          state.lastSpawnTime = time;
          const slotsAvailable = currentPacing.maxSimultaneousFruits - activeUncutFruits;
          const toSpawn = Math.min(currentPacing.count, slotsAvailable);

          for (let i = 0; i < toSpawn; i++) {
            // First spawn wave has a high chance to show the glowing starfruit so it's readily discovered
            const forceStar = state.score === 0 && activeUncutFruits === 0 && Math.random() < 0.4;
            state.fruits.push(
              spawnFruit(
                width,
                height,
                currentPacing.gravity,
                forceStar ? 'starfruit' : undefined,
                i,
                toSpawn
              )
            );
          }

          // Spawn hazard bomb with burning fuse (score-based probability, max 1 active bomb on screen)
          const activeBombs = state.bombs.filter((b) => !b.sliced).length;
          if (
            currentPacing.bombProbability > 0 &&
            activeBombs === 0 &&
            Math.random() < currentPacing.bombProbability
          ) {
            state.bombs.push(spawnBomb(width, height, currentPacing.gravity * 0.95));
          }
        }
      }

      // 7. Update and Draw Whole Fruits (Delta Time Independent Physics)
      for (let i = state.fruits.length - 1; i >= 0; i--) {
        const fruit = state.fruits[i];
        if (fruit.sliced) {
          state.fruits.splice(i, 1);
          continue;
        }

        // Apply physics using fruit's launch gravity scaled by timeScale
        const fruitGravity = fruit.gravity ?? currentPacing.gravity;
        fruit.x += fruit.vx * timeScale;
        fruit.y += fruit.vy * timeScale;
        fruit.vy += fruitGravity * timeScale;
        fruit.rotation += fruit.vRot * timeScale;

        drawFruit(ctx, fruit, time);

        // Remove if fallen below canvas or far sideways offscreen
        if ((fruit.y > height + 100 || fruit.x < -150 || fruit.x > width + 150) && fruit.vy > 0) {
          state.fruits.splice(i, 1);
        }
      }

      // 8. Update and Draw Hazard Bombs
      for (let i = state.bombs.length - 1; i >= 0; i--) {
        const bomb = state.bombs[i];
        if (bomb.sliced) {
          state.bombs.splice(i, 1);
          continue;
        }

        // Apply physics
        const bombGravity = (bomb.gravity ?? currentPacing.gravity) * 0.95;
        bomb.x += bomb.vx * timeScale;
        bomb.y += bomb.vy * timeScale;
        bomb.vy += bombGravity * timeScale;
        bomb.rotation += bomb.vRot * timeScale;

        // Generate sizzling burning fuse sparks & smoke
        const fuseSparks = generateFuseParticles(bomb);
        if (fuseSparks.length > 0) {
          state.particles.push(...fuseSparks);
        }

        drawBomb(ctx, bomb, time);

        // Remove if fallen below canvas or far sideways
        if ((bomb.y > height + 120 || bomb.x < -150 || bomb.x > width + 150) && bomb.vy > 0) {
          state.bombs.splice(i, 1);
        }
      }

      // 9. Update and Draw Sliced Halves
      if (state.slicedHalves.length > 6) {
        state.slicedHalves.splice(0, state.slicedHalves.length - 6);
      }
      for (let i = state.slicedHalves.length - 1; i >= 0; i--) {
        const half = state.slicedHalves[i];
        const halfGravity = half.gravity ?? currentPacing.gravity;
        half.x += half.vx * timeScale;
        half.y += half.vy * timeScale;
        half.vy += halfGravity * timeScale;
        half.rotation += half.vRot * timeScale;
        half.alpha -= 0.024 * timeScale; // clean snappy fade

        drawSlicedHalf(ctx, half);

        if (half.alpha <= 0 || half.y > height + 80) {
          state.slicedHalves.splice(i, 1);
        }
      }

      // 10. Update and Draw Particles
      const maxParticles = state.isLowPerf ? 24 : 40;
      if (state.particles.length > maxParticles) {
        state.particles.splice(0, state.particles.length - maxParticles);
      }
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        if (p.type === 'juice') {
          p.vy += 0.25 * timeScale; // juice gravity
        }
        p.life -= 1 * timeScale;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }
      drawParticles(ctx, state.particles);

      // 11. Update and Draw Combo Pop Banners
      for (let i = state.comboBanners.length - 1; i >= 0; i--) {
        const b = state.comboBanners[i];
        b.y -= 0.8 * timeScale;
        b.life -= 1 * timeScale;
        if (b.life <= 0) {
          state.comboBanners.splice(i, 1);
        }
      }
      drawComboBanners(ctx, state.comboBanners);

      // 12. Draw Slash Trail
      // Prune old trail points (>140ms) and cap history to max 10 points (prevents memory buildup)
      if (state.trail.length > 10) {
        state.trail.splice(0, state.trail.length - 10);
      }
      state.trail = state.trail.filter((pt) => time - pt.time < 140);
      drawSlashTrail(
        ctx,
        state.trail,
        time,
        140,
        currentGameMode === 'camera' ? '#38bdf8' : '#f59e0b'
      );

      // 13. Draw Fingertip Sword Marker (In Camera Mode)
      if (currentGameMode === 'camera' && state.fingertip && state.fingertip.detected) {
        drawFingertipMarker(
          ctx,
          state.fingertip.canvasX,
          state.fingertip.canvasY,
          state.fingertip.isSlashing,
          time
        );
      }

      // 14. Screen Flash (from bomb explosion) and Context Restore
      if (state.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${state.flashAlpha})`;
        ctx.fillRect(-50, -50, width + 100, height + 100);
        state.flashAlpha = Math.max(0, state.flashAlpha - 0.035 * timeScale);
      }
      ctx.restore(); // Restore context from screen shake

      // 15. Bomb Detonation GameOver trigger
      if (state.bombExploded && !state.isGameOver) {
        if (time - state.bombExplodeTime > 850) {
          state.isGameOver = true;
          handTrackerRef.current?.stopCamera();
          onGameOverRef.current(state.score, 'bomb');
        }
      }

      // Always cancel previous frame before scheduling next to prevent duplicate loops
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (!state.isGameOver) {
        animationFrameIdRef.current = requestAnimationFrame(renderLoop);
      }
    };

    // Cancel any previous loop before starting new one
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  // Handle Resize using ResizeObserver with DPR capping and dirty check
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      if (canvas.width === w * dpr && canvas.height === h * dpr) {
        return; // Avoid unnecessary resize and context resets if dimensions are unchanged
      }

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
      }

      engineRef.current.width = w;
      engineRef.current.height = h;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    return () => ro.disconnect();
  }, []);

  // Pointer / Touch Slicing Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const now = performance.now();
    engineRef.current.isPointerDown = true;
    engineRef.current.lastMousePos = { x, y };
    engineRef.current.trail.push({ x, y, time: now });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();

    const state = engineRef.current;
    state.trail.push({ x, y, time: now });

    // Allow slicing both on pointer drag or active fast move
    if (state.lastMousePos) {
      handleSlice(state.lastMousePos.x, state.lastMousePos.y, x, y, false);
    }
    state.lastMousePos = { x, y };
  };

  const handlePointerUp = () => {
    engineRef.current.isPointerDown = false;
    engineRef.current.lastMousePos = null;
  };

  // Toggle Camera Mode
  const handleToggleCamera = () => {
    if (gameMode === 'camera') {
      onSwitchMode('touch');
    } else {
      onSwitchMode('camera');
    }
  };

  // Toggle Media Recording
  const handleToggleRecording = () => {
    const recorder = recorderRef.current;
    const canvas = canvasRef.current;
    if (!recorder || !canvas) return;

    if (recorder.getIsRecording()) {
      recorder.stopRecording();
    } else {
      recorder.startRecording(canvas);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-screen overflow-hidden bg-slate-950 select-none touch-none"
    >
      {/* Zero-overhead hardware video element for camera feed directly behind canvas */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none transition-opacity duration-300 ${
          gameMode === 'camera' && cameraStatus === 'ready' ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
        }`}
      />
      {gameMode === 'camera' && cameraStatus === 'ready' && (
        <div className="absolute inset-0 bg-slate-950/40 pointer-events-none z-0" />
      )}

      {/* HUD Layer */}
      <HUD
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        bestScore={bestScore}
        gameMode={gameMode}
        cameraStatus={cameraStatus}
        cameraError={cameraError}
        isRecording={isRecording}
        recordingUrl={recordingUrl}
        pacing={pacing}
        onToggleCamera={handleToggleCamera}
        onToggleRecording={handleToggleRecording}
        onClearRecording={() => recorderRef.current?.clearRecording()}
        onSwitchMode={onSwitchMode}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onQuit={onQuit}
        onRetryCamera={() => {
          handTrackerRef.current?.startCamera();
        }}
      />

      {/* Main Game & Camera Canvas */}
      <canvas
        id="fruit-slice-canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 w-full h-full block cursor-crosshair touch-none z-10"
      />

      {/* Small Performance & Latency Monitor */}
      <DebugIndicator
        gameFps={debugFps}
        cameraFps={debugCameraFps}
        handDetectionFps={debugDetectionFps}
        detectionBusy={debugDetectionBusy}
        trackingStatus={debugTrackingStatus}
        pendingFrames={debugPendingFrames}
        latencyMs={debugLatencyMs}
      />
    </div>
  );
};
