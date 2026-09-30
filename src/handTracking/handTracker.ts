import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export type CameraStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'permission_denied'
  | 'unavailable'
  | 'unsupported'
  | 'off'
  | 'error';

export interface FingertipState {
  rawX: number; // normalized [0, 1]
  rawY: number; // normalized [0, 1]
  canvasX: number;
  canvasY: number;
  speed: number;
  isSlashing: boolean;
  detected: boolean;
  timestamp: number;
}

export class HandTrackerManager {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private status: CameraStatus = 'idle';
  private errorMessage: string = '';
  private onStatusChange?: (status: CameraStatus, errorMsg?: string) => void;

  // Smoothing and tracking state (strictly maintains only latest positions to prevent memory buildup)
  private latestRawHandPosition: { x: number; y: number; time: number } | null = null;
  private smoothedX: number = 0;
  private smoothedY: number = 0;
  private prevRawCanvasX: number | null = null;
  private prevRawCanvasY: number | null = null;
  private rawVelocityX: number = 0;
  private rawVelocityY: number = 0;
  private lastProcessedSampleTime: number = 0;
  private hasSmoothedInit: boolean = false;
  private prevX: number | null = null;
  private prevY: number | null = null;
  private prevTimestamp: number = 0;
  private lastFingertipState: FingertipState | null = null;
  private minSlashSpeed: number = 200; // px/sec to count as an arcade slash

  // Asynchronous inference loop state (runs independently from 60fps canvas)
  private isTrackingRunning: boolean = false;
  private isInferring: boolean = false;
  private pendingFrames: number = 0;
  private isDetected: boolean = false;
  private lastInferenceTimestamp: number = 0;
  private lastDetectTime: number = 0;
  private trackingRafId: number | null = null;
  private rvfcHandle: number | null = null;

  // Tracking performance and latency metrics
  private cameraFrameCount: number = 0;
  private detectionCount: number = 0;
  private cameraFps: number = 0;
  private detectionFps: number = 0;
  private lastFpsCalcTime: number = performance.now();
  private lastInferenceLatency: number = 0;

  constructor(onStatusChange?: (status: CameraStatus, errorMsg?: string) => void) {
    this.onStatusChange = onStatusChange;
  }

  public getStatus(): CameraStatus {
    return this.status;
  }

  public getErrorMessage(): string {
    return this.errorMessage;
  }

  public getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getCameraFps(): number {
    return this.cameraFps;
  }

  public getDetectionFps(): number {
    return this.detectionFps;
  }

  public isHandDetected(): boolean {
    return this.isDetected;
  }

  public isDetectionBusy(): boolean {
    return this.isInferring;
  }

  public getPendingFrames(): number {
    return this.pendingFrames;
  }

  public getInferenceLatency(): number {
    return this.lastInferenceLatency;
  }

  public attachVideoElement(video: HTMLVideoElement) {
    this.video = video;
  }

  private setStatus(status: CameraStatus, errorMsg: string = '') {
    this.status = status;
    this.errorMessage = errorMsg;
    if (this.onStatusChange) {
      this.onStatusChange(status, errorMsg);
    }
  }

  /**
   * Start camera and load MediaPipe Hand Landmarker model
   */
  public async startCamera(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus('unsupported', 'Camera is not supported in this browser environment.');
      return false;
    }

    // Clean up any existing stream/loop before re-acquiring
    this.stopCamera();
    this.setStatus('loading');

    try {
      // 1. Get user media camera stream with reasonable 640x480 resolution (prevents heavy processing)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        });
      } catch (constraintErr: unknown) {
        const cErr = constraintErr as Error;
        const cName = cErr?.name || '';
        const cMsg = cErr?.message || String(constraintErr || '');
        // If permission was explicitly denied, do not attempt second getUserMedia call
        if (
          cName === 'NotAllowedError' ||
          cName === 'PermissionDeniedError' ||
          cName === 'SecurityError' ||
          /permission|denied|not allowed/i.test(cMsg) ||
          /permission|denied|not allowed/i.test(cName)
        ) {
          throw constraintErr;
        }

        // Try minimal video constraint fallback with 640x480 ideal
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      }

      this.stream = stream;

      // 2. Setup video element for MediaPipe consumption
      if (!this.video) {
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.muted = true;
      }
      this.video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        if (!this.video) return reject(new Error('Video element lost'));

        const cleanup = () => {
          if (this.video) {
            this.video.onloadedmetadata = null;
            this.video.onerror = null;
          }
        };

        if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          this.video.play().then(() => {
            cleanup();
            resolve();
          }).catch((e) => {
            cleanup();
            reject(e);
          });
          return;
        }

        this.video.onloadedmetadata = () => {
          this.video?.play().then(() => {
            cleanup();
            resolve();
          }).catch((e) => {
            cleanup();
            reject(e);
          });
        };
        this.video.onerror = () => {
          cleanup();
          reject(new Error('Video stream play error'));
        };
      });

      // 3. Initialize MediaPipe HandLandmarker Tasks Vision with GPU delegate and CPU fallback
      if (!this.handLandmarker) {
        try {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );

          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        } catch (modelErr) {
          console.warn('GPU delegate failed, trying CPU fallback:', modelErr);
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
          });
        }
      }

      this.setStatus('ready');
      // Start exactly ONE background inference loop as soon as camera is ready
      this.startTrackingLoop();
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      const errName = error?.name || '';
      const errMsg = error?.message || String(err || '');

      const isPermissionDenied =
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError' ||
        /permission|denied|not allowed/i.test(errMsg) ||
        /permission|denied|not allowed/i.test(errName);

      const isNotFound =
        errName === 'NotFoundError' ||
        errName === 'DevicesNotFoundError' ||
        /not found|no device/i.test(errMsg);

      if (isPermissionDenied) {
        console.warn('Camera access denied by user or browser policy:', errMsg);
        this.setStatus(
          'permission_denied',
          'Camera permission was denied. You can allow camera access in browser settings, or play in Mouse/Touch mode.'
        );
      } else if (isNotFound) {
        console.warn('Camera hardware not found on device:', errMsg);
        this.setStatus('unavailable', 'No camera hardware found on your device.');
      } else {
        console.warn('Camera or HandLandmarker initialization issue:', errMsg);
        this.setStatus('error', errMsg || 'Failed to initialize camera or hand tracking.');
      }
      this.stopCamera();
      return false;
    }
  }

  /**
   * Independent background inference loop.
   * Uses requestVideoFrameCallback when available to process freshly presented camera frames.
   * - ZERO QUEUE: If detection is busy, incoming frames are discarded immediately.
   * - Maximum pending detections is strictly 1 (active) or 0 (idle).
   * - Targets ~28-30 hand detections per second to ensure smooth CPU/GPU headroom.
   */
  private startTrackingLoop() {
    this.stopTrackingLoop();

    this.isTrackingRunning = true;
    this.isInferring = false;
    this.pendingFrames = 0;
    this.lastDetectTime = 0;
    this.lastFpsCalcTime = performance.now();
    this.cameraFrameCount = 0;
    this.detectionCount = 0;

    const video = this.video;
    if (!video) return;

    // Check for native requestVideoFrameCallback support
    const hasRvfc =
      'requestVideoFrameCallback' in HTMLVideoElement.prototype &&
      typeof (video as any).requestVideoFrameCallback === 'function';

    if (hasRvfc) {
      const onVideoFrame = (_now: DOMHighResTimeStamp, metadata: any) => {
        if (!this.isTrackingRunning || !this.video) return;

        this.cameraFrameCount++;
        const currentNow = performance.now();

        // Update rolling FPS metrics every 400ms
        if (currentNow - this.lastFpsCalcTime >= 400) {
          const dt = currentNow - this.lastFpsCalcTime;
          this.cameraFps = Math.round((this.cameraFrameCount * 1000) / dt);
          this.detectionFps = Math.round((this.detectionCount * 1000) / dt);
          this.cameraFrameCount = 0;
          this.detectionCount = 0;
          this.lastFpsCalcTime = currentNow;
        }

        // If detection is already processing, DISCARD this frame immediately (zero backlog)
        if (this.isInferring) {
          this.pendingFrames = 1;
          if (this.isTrackingRunning && this.video && 'requestVideoFrameCallback' in this.video) {
            this.rvfcHandle = (this.video as any).requestVideoFrameCallback(onVideoFrame);
          }
          return;
        }

        // Target ~28-30 FPS for MediaPipe detection (interval >= 26ms permits ~30-35 FPS without skipping jittered frames)
        const elapsedSinceLastDetect = currentNow - this.lastDetectTime;
        if (elapsedSinceLastDetect < 26) {
          if (this.isTrackingRunning && this.video && 'requestVideoFrameCallback' in this.video) {
            this.rvfcHandle = (this.video as any).requestVideoFrameCallback(onVideoFrame);
          }
          return;
        }

        if (this.handLandmarker && this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          this.isInferring = true;
          this.pendingFrames = 1;
          this.lastDetectTime = currentNow;
          const inferenceStart = performance.now();

          // Monotonically increasing timestamp in ms
          let timestampMs = Math.round(metadata?.presentationTime || currentNow);
          if (timestampMs <= this.lastInferenceTimestamp) {
            timestampMs = this.lastInferenceTimestamp + 1;
          }
          this.lastInferenceTimestamp = timestampMs;

          try {
            const results = this.handLandmarker.detectForVideo(this.video, timestampMs);
            this.detectionCount++;
            this.lastInferenceLatency = Math.round(performance.now() - inferenceStart);

            if (results && results.landmarks && results.landmarks.length > 0) {
              const hand = results.landmarks[0];
              const tip = hand[8]; // INDEX_FINGER_TIP
              if (tip) {
                this.latestRawHandPosition = {
                  x: 1 - tip.x, // Mirrored horizontally for natural selfie cam interaction
                  y: tip.y,
                  time: currentNow,
                };
                this.isDetected = true;
              }
            } else {
              this.latestRawHandPosition = null;
              this.isDetected = false;
            }
          } catch {
            // Drop gracefully
          } finally {
            this.isInferring = false;
            this.pendingFrames = 0;
          }
        }

        if (this.isTrackingRunning && this.video && 'requestVideoFrameCallback' in this.video) {
          this.rvfcHandle = (this.video as any).requestVideoFrameCallback(onVideoFrame);
        }
      };

      this.rvfcHandle = (video as any).requestVideoFrameCallback(onVideoFrame);
    } else {
      // Safe fallback loop using requestAnimationFrame when requestVideoFrameCallback is unsupported
      const runFallback = () => {
        if (!this.isTrackingRunning || !this.video) return;

        const currentNow = performance.now();
        const elapsedSinceLastDetect = currentNow - this.lastDetectTime;

        // Roll FPS every 400ms
        if (currentNow - this.lastFpsCalcTime >= 400) {
          const dt = currentNow - this.lastFpsCalcTime;
          this.cameraFps = Math.round((this.cameraFrameCount * 1000) / dt);
          this.detectionFps = Math.round((this.detectionCount * 1000) / dt);
          this.cameraFrameCount = 0;
          this.detectionCount = 0;
          this.lastFpsCalcTime = currentNow;
        }

        // Throttle to ~28-30 FPS (interval >= 26ms)
        if (
          elapsedSinceLastDetect >= 26 &&
          !this.isInferring &&
          this.handLandmarker &&
          this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          this.cameraFrameCount++;
          this.isInferring = true;
          this.pendingFrames = 1;
          this.lastDetectTime = currentNow;
          const inferenceStart = performance.now();

          let timestampMs = Math.round(currentNow);
          if (timestampMs <= this.lastInferenceTimestamp) {
            timestampMs = this.lastInferenceTimestamp + 1;
          }
          this.lastInferenceTimestamp = timestampMs;

          try {
            const results = this.handLandmarker.detectForVideo(this.video, timestampMs);
            this.detectionCount++;
            this.lastInferenceLatency = Math.round(performance.now() - inferenceStart);

            if (results && results.landmarks && results.landmarks.length > 0) {
              const hand = results.landmarks[0];
              const tip = hand[8];
              if (tip) {
                this.latestRawHandPosition = {
                  x: 1 - tip.x,
                  y: tip.y,
                  time: currentNow,
                };
                this.isDetected = true;
              }
            } else {
              this.latestRawHandPosition = null;
              this.isDetected = false;
            }
          } catch {
          } finally {
            this.isInferring = false;
            this.pendingFrames = 0;
          }
        }

        if (this.isTrackingRunning) {
          this.trackingRafId = requestAnimationFrame(runFallback);
        }
      };

      this.trackingRafId = requestAnimationFrame(runFallback);
    }
  }

  private stopTrackingLoop() {
    this.isTrackingRunning = false;
    this.isInferring = false;
    this.pendingFrames = 0;

    if (this.trackingRafId !== null) {
      cancelAnimationFrame(this.trackingRafId);
      this.trackingRafId = null;
    }

    if (this.rvfcHandle !== null && this.video && 'cancelVideoFrameCallback' in this.video) {
      try {
        (this.video as any).cancelVideoFrameCallback(this.rvfcHandle);
      } catch {}
      this.rvfcHandle = null;
    }
  }

  /**
   * Stop camera tracks and cleanly cancel background detection loop
   */
  public stopCamera() {
    this.stopTrackingLoop();
    this.isDetected = false;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video.onloadedmetadata = null;
      this.video.onerror = null;
    }

    // Reset tracking coordinates to avoid stale state accumulation
    this.latestRawHandPosition = null;
    this.smoothedX = 0;
    this.smoothedY = 0;
    this.prevRawCanvasX = null;
    this.prevRawCanvasY = null;
    this.rawVelocityX = 0;
    this.rawVelocityY = 0;
    this.lastProcessedSampleTime = 0;
    this.hasSmoothedInit = false;
    this.prevX = null;
    this.prevY = null;
    this.prevTimestamp = 0;
    this.lastFingertipState = null;
    this.lastInferenceTimestamp = 0;
    this.cameraFps = 0;
    this.detectionFps = 0;
    this.lastInferenceLatency = 0;
    this.setStatus('off');
  }

  /**
   * Destroy all MediaPipe and video instances
   */
  public destroy() {
    this.stopCamera();
    if (this.handLandmarker) {
      try {
        this.handLandmarker.close();
      } catch {}
      this.handLandmarker = null;
    }
    this.video = null;
  }

  /**
   * Process current video frame and calculate index fingertip position mapped to canvas.
   * Runs non-blocking at full display refresh rate (< 0.01ms) by consuming latest inference state.
   * Uses light smoothing:
   *   smoothedX = previousX * 0.10 + rawX * 0.90
   *   smoothedY = previousY * 0.10 + rawY * 0.90
   * and a small velocity-based prediction to achieve immediate real-time responsiveness.
   */
  public processFrame(canvasWidth: number, canvasHeight: number, nowMs: number): FingertipState | null {
    if (this.status !== 'ready') {
      return null;
    }

    // If hand hasn't been observed in the last 250ms, mark as lost
    if (!this.latestRawHandPosition || nowMs - this.latestRawHandPosition.time > 250) {
      this.isDetected = false;
      this.hasSmoothedInit = false;
      this.prevRawCanvasX = null;
      this.prevRawCanvasY = null;
      this.rawVelocityX = 0;
      this.rawVelocityY = 0;
      this.prevX = null;
      this.prevY = null;
      this.lastFingertipState = null;

      return {
        rawX: 0,
        rawY: 0,
        canvasX: 0,
        canvasY: 0,
        speed: 0,
        isSlashing: false,
        detected: false,
        timestamp: nowMs,
      };
    }

    // Map normalized camera coordinates to canvas dimensions taking object-cover into account
    const videoW = this.video?.videoWidth || 640;
    const videoH = this.video?.videoHeight || 480;
    const scale = Math.max(canvasWidth / videoW, canvasHeight / videoH);
    const renderedW = videoW * scale;
    const renderedH = videoH * scale;
    const offsetX = (canvasWidth - renderedW) / 2;
    const offsetY = (canvasHeight - renderedH) / 2;

    const rawCanvasX = offsetX + this.latestRawHandPosition.x * renderedW;
    const rawCanvasY = offsetY + this.latestRawHandPosition.y * renderedH;

    // Check if a new camera inference detection sample has arrived
    const isNewSample = this.latestRawHandPosition.time !== this.lastProcessedSampleTime;
    if (isNewSample) {
      this.lastProcessedSampleTime = this.latestRawHandPosition.time;

      if (this.hasSmoothedInit && this.prevRawCanvasX !== null && this.prevRawCanvasY !== null) {
        // Inter-frame velocity calculated from recent detection coordinates
        this.rawVelocityX = rawCanvasX - this.prevRawCanvasX;
        this.rawVelocityY = rawCanvasY - this.prevRawCanvasY;

        // Ultra-light smoothing: 10% previous smoothed, 90% new raw (preserves high responsiveness)
        this.smoothedX = this.smoothedX * 0.10 + rawCanvasX * 0.90;
        this.smoothedY = this.smoothedY * 0.10 + rawCanvasY * 0.90;
      } else {
        this.smoothedX = rawCanvasX;
        this.smoothedY = rawCanvasY;
        this.rawVelocityX = 0;
        this.rawVelocityY = 0;
        this.hasSmoothedInit = true;
      }

      this.prevRawCanvasX = rawCanvasX;
      this.prevRawCanvasY = rawCanvasY;
    }

    // Small velocity prediction to compensate for sensor/inference pipeline latency:
    // predicted = smoothed + velocity * predictionFactor
    const predictionFactor = 0.20;
    const predictedX = Math.max(0, Math.min(canvasWidth, this.smoothedX + this.rawVelocityX * predictionFactor));
    const predictedY = Math.max(0, Math.min(canvasHeight, this.smoothedY + this.rawVelocityY * predictionFactor));

    // Calculate speed & slashing state
    let speed = 0;
    let isSlashing = false;

    if (this.prevX !== null && this.prevY !== null && this.prevTimestamp > 0) {
      const dt = Math.max(1, nowMs - this.prevTimestamp);
      const dist = Math.hypot(predictedX - this.prevX, predictedY - this.prevY);
      speed = (dist / dt) * 1000;
      // Instant slash trigger: fast speed or movement displacement
      isSlashing = speed >= this.minSlashSpeed || dist >= 8;
    }

    this.prevX = predictedX;
    this.prevY = predictedY;
    this.prevTimestamp = nowMs;

    const state: FingertipState = {
      rawX: this.latestRawHandPosition.x,
      rawY: this.latestRawHandPosition.y,
      canvasX: predictedX,
      canvasY: predictedY,
      speed,
      isSlashing,
      detected: true,
      timestamp: nowMs,
    };

    this.lastFingertipState = state;
    return state;
  }
}
