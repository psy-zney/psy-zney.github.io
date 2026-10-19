/**
 * Portfolio Audio System: Cosmic Ambient Soundscape & High-Precision Procedural SFX
 * 
 * - Multi-layered Cosmic Ambient Generator (BGM) with deep sub-drone, lush chord pad & cosmic shimmer.
 * - Zero-latency, 0-byte download procedural Sound Effects Engine for all user interactions.
 * - Full compliance with browser autoplay policy, visibility changes, and mute preferences.
 * - Safe for Server-Side Rendering (SSR).
 */

export type PortfolioSfxType =
  | 'hover'
  | 'click'
  | 'warp'
  | 'drawerOpen'
  | 'drawerClose'
  | 'modalOpen'
  | 'modalClose'
  | 'singularityEnter'
  | 'singularityExit'
  | 'cardSlide'
  | 'muteOn'
  | 'muteOff'
  | 'loaderComplete';

class PortfolioAudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;

  // BGM Oscillators & Nodes
  private bgmVoices: AudioScheduledSourceNode[] = [];
  private bgmPlaying = false;

  // Active SFX source tracking
  private activeSfxSources = new Set<AudioScheduledSourceNode>();

  // State
  private muted = false;
  private isUnlocked = false;
  private lastHoverTime = 0;
  private customAudioElement: HTMLAudioElement | null = null;
  private scrollVoice: { oscillator: OscillatorNode; gain: GainNode } | null = null;

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.muted = document.documentElement.dataset.journeySound === 'off';

    const handleUnlock = () => {
      if (this.isUnlocked) return;
      this.unlockContext();
    };

    window.addEventListener('pointerdown', handleUnlock, { passive: true });
    window.addEventListener('wheel', handleUnlock, { passive: true });
    window.addEventListener('keydown', handleUnlock, { passive: true });
    window.addEventListener('touchstart', handleUnlock, { passive: true });

    window.addEventListener('journey-audio-muted', (e: Event) => {
      const isMuted = Boolean((e as CustomEvent<boolean>).detail);
      this.setMuted(isMuted);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseOnHidden();
      } else {
        this.resumeOnVisible();
      }
    });
  }

  private initContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.context && this.context.state !== 'closed') return true;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      this.context = new AudioCtx();
      const ctx = this.context;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      // SFX Bus
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM Bus with Low-pass Filter for cosmic immersion
      this.bgmFilter = ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.setValueAtTime(1400, ctx.currentTime);
      this.bgmFilter.Q.setValueAtTime(1.0, ctx.currentTime);

      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.10, ctx.currentTime);

      this.bgmGain.connect(this.bgmFilter);
      this.bgmFilter.connect(this.masterGain);

      return true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return false;
    }
  }

  public unlockContext(): void {
    if (!this.initContext() || !this.context) return;
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => {});
    }
    this.isUnlocked = true;

    // Start background cosmic pad if not muted
    if (!this.muted && !this.bgmPlaying && !document.hidden) {
      this.startCosmicAmbient();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.context && this.masterGain) {
      const now = this.context.currentTime;
      // Fast fade-out within 0.08s (strictly under 100ms per requirements)
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.65, now, 0.025);
    }
    if (this.customAudioElement) {
      this.customAudioElement.muted = muted;
    }
    if (!muted && !this.bgmPlaying && this.isUnlocked && !document.hidden) {
      this.startCosmicAmbient();
    }
  }

  private pauseOnHidden(): void {
    if (this.context && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.03);
    }
    if (this.customAudioElement && !this.customAudioElement.paused) {
      try { this.customAudioElement.pause(); } catch {}
    }
  }

  private resumeOnVisible(): void {
    if (this.context && this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(0.65, this.context.currentTime, 0.1);
      if (this.context.state === 'suspended') {
        void this.context.resume().catch(() => {});
      }
    }
    if (this.customAudioElement && !this.muted && this.isUnlocked) {
      try { void this.customAudioElement.play().catch(() => {}); } catch {}
    }
  }

  /**
   * Start Multi-Layered Cosmic Ambient Space Soundscape
   * Layer 1: Warm sub-bass drone (55Hz A1 & 110Hz A2)
   * Layer 2: Ethereal celestial pad (Fmaj9 / Am9 harmonies)
   * Layer 3: Filtered cosmic stardust shimmer
   */
  public startCosmicAmbient(): void {
    if (this.bgmPlaying || this.muted || typeof window === 'undefined') return;
    if (!this.initContext() || !this.context || !this.bgmGain) return;

    const ctx = this.context;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    try {
      this.stopCosmicAmbient();
      const now = ctx.currentTime;

      // 1. Warm Sub-Drone
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now); // A1
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.12, now + 3);
      subOsc.connect(subGain);
      subGain.connect(this.bgmGain);
      subOsc.start(now);
      this.bgmVoices.push(subOsc);

      // 2. Harmonious Celestial Chords (A2, E3, G3, B3 - soothing ethereal space chord)
      const frequencies = [110.0, 164.81, 196.0, 246.94];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Subtle detuning for lush chorusing width
        osc.detune.setValueAtTime((idx % 2 === 0 ? 3 : -3) * (idx + 1), now);

        const chordGain = ctx.createGain();
        chordGain.gain.setValueAtTime(0.001, now);
        chordGain.gain.linearRampToValueAtTime(0.035, now + 3.5 + idx * 0.5);

        osc.connect(chordGain);
        chordGain.connect(this.bgmGain!);
        osc.start(now);
        this.bgmVoices.push(osc);
      });

      // 3. Ambient Stardust Shimmer (filtered soft noise)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut * 0.94) + (white * 0.06);
        data[i] = lastOut * 1.8;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(480, now);
      noiseFilter.Q.setValueAtTime(1.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.022, now + 4);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.bgmGain);
      noise.start(now);
      this.bgmVoices.push(noise);

      this.bgmPlaying = true;
    } catch (e) {
      console.warn('Failed to start cosmic ambient generator:', e);
    }
  }

  public stopCosmicAmbient(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this.bgmVoices) {
      try {
        voice.stop(now + 0.1);
        voice.disconnect();
      } catch {}
    }
    this.bgmVoices = [];
    this.bgmPlaying = false;
  }

  /**
   * Adjust BGM space filter when entering the Black Hole / Singularity
   * @param normalizedDistance 0 = deep inside black hole, 1 = normal space
   */
  public setSpaceFilter(intensity: number): void {
    if (!this.context || !this.bgmFilter) return;
    const now = this.context.currentTime;
    // Map intensity (0 = normal space, 1 = deep black hole)
    const freq = Math.max(180, 1400 - intensity * 1150);
    this.bgmFilter.frequency.setTargetAtTime(freq, now, 0.15);
  }

  /** One reusable voice: trackpad packets renew a soft pulse instead of stacking sounds. */
  public playScroll(delta: number): void {
    if (!Number.isFinite(delta) || delta === 0 || this.muted || typeof document === 'undefined' || document.hidden) return;
    this.unlockContext();
    if (!this.context || !this.sfxGain) return;
    const ctx = this.context, now = ctx.currentTime;
    if (!this.scrollVoice) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = 'sine'; gain.gain.value = 0;
      oscillator.connect(gain).connect(this.sfxGain); oscillator.start();
      this.scrollVoice = { oscillator, gain };
    }
    const { oscillator, gain } = this.scrollVoice;
    const strength = Math.min(1, Math.abs(delta) / 120);
    oscillator.frequency.setTargetAtTime(delta > 0 ? 330 : 261.63, now, .025);
    // Hold the current envelope before retriggering, avoiding clicks on dense input.
    gain.gain.cancelAndHoldAtTime(now);
    gain.gain.linearRampToValueAtTime(.008 + strength * .016, now + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
  }

  /**
   * Play High-Precision Procedural Sound Effects
   */
  public playSfx(type: PortfolioSfxType): void {
    if (this.muted || typeof window === 'undefined' || document.hidden) return;
    if (!this.initContext() || !this.context || !this.sfxGain) return;

    const ctx = this.context;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    switch (type) {
      case 'hover': {
        // Throttle rapid hovers to prevent audio stutter (min 35ms between ticks)
        const perfNow = performance.now();
        if (perfNow - this.lastHoverTime < 35) return;
        this.lastHoverTime = perfNow;

        // Subtle crystal micro-tick (1750Hz, ultra-short 18ms decay)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1750, now);
        osc.frequency.exponentialRampToValueAtTime(1950, now + 0.016);

        gain.gain.setValueAtTime(0.024, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.02);
        break;
      }

      case 'click': {
        // High-tech tactile pop (620Hz -> 280Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.038);

        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.045);
        break;
      }

      case 'warp': {
        // Cosmic flight transit sweep
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.22);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(380, now);
        filter.frequency.exponentialRampToValueAtTime(950, now + 0.24);
        filter.Q.setValueAtTime(2.5, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }

      case 'drawerOpen': {
        // Pneumatic aero slide up
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      case 'drawerClose': {
        // Aero slide down
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(230, now + 0.11);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      case 'modalOpen': {
        // Holo-interface harmonic swell
        [340, 510].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.18);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.04 - idx * 0.01, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(now);
          osc.stop(now + 0.22);
        });
        break;
      }

      case 'modalClose': {
        // Holo snap close
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.075);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case 'singularityEnter': {
        // Deep sub-bass gravitational collapse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(26, now + 0.55);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.linearRampToValueAtTime(60, now + 0.55);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.62);
        break;
      }

      case 'singularityExit': {
        // White hole radiant burst
        [440, 660, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * 0.8, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.28);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.038 - idx * 0.008, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(now);
          osc.stop(now + 0.35);
        });
        break;
      }

      case 'cardSlide': {
        // Curved gallery optic slide
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.045);

        gain.gain.setValueAtTime(0.038, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.055);
        break;
      }

      case 'muteOn': {
        // Uplifting 2-tone chime (C5 -> G5)
        [523.25, 783.99].forEach((freq, idx) => {
          const startTime = now + idx * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.06, startTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(startTime);
          osc.stop(startTime + 0.18);
        });
        break;
      }

      case 'muteOff': {
        // Gentle descending tone (G4 -> C4)
        [392.0, 261.63].forEach((freq, idx) => {
          const startTime = now + idx * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.045, startTime + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);

          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(startTime);
          osc.stop(startTime + 0.14);
        });
        break;
      }

      case 'loaderComplete': {
        // Shimmering celestial completion chime
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const startTime = now + idx * 0.06;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.05 - idx * 0.008, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(startTime);
          osc.stop(startTime + 0.38);
        });
        break;
      }
    }
  }

  public dispose(): void {
    this.scrollVoice?.oscillator.stop();
    this.scrollVoice?.oscillator.disconnect();
    this.scrollVoice?.gain.disconnect();
    this.scrollVoice = null;
    this.stopCosmicAmbient();
    if (this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => {});
    }
    this.context = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.bgmFilter = null;
  }
}

// Global Singleton Instance (Safe for SSR)
export const portfolioAudio = new PortfolioAudioSystem();

export function playPortfolioSfx(type: PortfolioSfxType): void {
  portfolioAudio.playSfx(type);
}
