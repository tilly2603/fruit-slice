/**
 * Web Audio API synthesizer for Fruit Slice
 * No external asset downloads required - zero latency & works offline
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sliceNoiseBuffer: AudioBuffer | null = null;
  private bombNoiseBuffer: AudioBuffer | null = null;
  private lastSliceSoundTime: number = 0;

  constructor() {
    // Lazy initialize upon first user interaction
    const savedMute = localStorage.getItem('fruit_slice_muted');
    if (savedMute) {
      this.isMuted = savedMute === 'true';
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.sliceNoiseBuffer) {
      try {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.sliceNoiseBuffer = buffer;
      } catch {
        // Fallback
      }
    }
    if (this.ctx && !this.bombNoiseBuffer) {
      try {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        this.bombNoiseBuffer = buffer;
      } catch {
        // Fallback
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('fruit_slice_muted', String(this.isMuted));
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Sword blade whoosh / slice sound
   */
  public playSlice() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Prevent audio node stacking if multiple fruits are sliced in the exact same millisecond
      if (now - this.lastSliceSoundTime < 0.035) {
        return;
      }
      this.lastSliceSoundTime = now;

      if (this.sliceNoiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.sliceNoiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        filter.Q.setValueAtTime(3.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.12);
      }

      // Add a metallic blade chime tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);

      oscGain.gain.setValueAtTime(0.18, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Juicy fruit splat
   */
  public playSplat() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.14);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Ascending combo celebration chime
   */
  public playCombo(comboCount: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Musical pentatonic scale base notes
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
      const noteIdx = Math.min(comboCount - 2, notes.length - 1);
      const freq = notes[Math.max(0, noteIdx)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.18);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Game start arcade jingle
   */
  public playStart() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const startTime = this.ctx.currentTime + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.12);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Game over retro chime
   */
  public playGameOver() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [587.33, 523.25, 466.16, 392.0];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const startTime = this.ctx.currentTime + idx * 0.15;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Button click sound
   */
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Catastrophic bomb explosion: sub-bass rumble + fiery white-noise blast
   */
  public playBombExplode() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Deep sub-bass drop rumble
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(150, now);
      bassOsc.frequency.exponentialRampToValueAtTime(25, now + 0.7);

      bassGain.gain.setValueAtTime(0.6, now);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.75);

      // 2. Heavy explosive noise blast
      if (this.bombNoiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.bombNoiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.6);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.65);
      }
    } catch {
      // Audio fallback
    }
  }

  /**
   * Magical radiant star fruit slice sound: glittering sparkle chime arpeggio
   */
  public playStarFruitSlice() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // High harmonic twinkling crystalline notes
      const notes = [880, 1174.66, 1396.91, 1760, 2093, 2637];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const startTime = now + idx * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.18);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
    } catch {
      // Audio fallback
    }
  }
}

export const sounds = new SoundEffects();
