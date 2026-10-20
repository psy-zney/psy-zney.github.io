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

const MUSIC_LEVELS = { intro: .28, journey: .34, showcase: .28, contact: .22 };
const SOUND_PREFERENCE = 'portfolio-sound';

/** Firefox may lack cancelAndHoldAtTime; preserve today's value before rescheduling. */
function holdAudioParam(param: AudioParam, now: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else {
    const value = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(value, now);
  }
}

export class PortfolioAudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;

  // BGM Oscillators & Nodes
  private bgmVoices: AudioScheduledSourceNode[] = [];
  private bgmPlaying = false;
  private melodyBuffer: AudioBuffer | null = null;
  private musicLevel = MUSIC_LEVELS.journey;

  // Active SFX source tracking
  private activeSfxSources = new Set<AudioScheduledSourceNode>();

  // State
  private muted = false;
  private isUnlocked = false;
  private lastHoverTime = 0;
  private customAudioElement: HTMLAudioElement | null = null;
  private scrollVoice: { oscillator: OscillatorNode; gain: GainNode } | null = null;
  private typingBuffer: AudioBuffer | null = null;
  private typingTick = 0;
  private disposed = false;
  private active = true;
  private handleUnlock = () => { this.unlockContext(); };
  private handleMute = (event: Event) => { this.setMuted(Boolean((event as CustomEvent<boolean>).detail)); };
  private handleVisibility = () => {
    if (document.hidden) this.pauseOnHidden();
    else this.resumeOnVisible();
  };

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.muted = document.documentElement.dataset.journeySound === 'off';
    try {
      const saved = window.localStorage.getItem(SOUND_PREFERENCE);
      if (saved === 'off' || saved === 'on') this.muted = saved === 'off';
    } catch { /* Storage may be unavailable in private or embedded contexts. */ }
    document.documentElement.dataset.journeySound = this.muted ? 'off' : 'on';

    for (const event of ['pointerdown', 'wheel', 'keydown', 'touchstart']) {
      window.addEventListener(event, this.handleUnlock, { passive: true });
    }
    window.addEventListener('journey-audio-muted', this.handleMute);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  private initContext(): boolean {
    if (this.disposed || typeof window === 'undefined') return false;
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
      this.sfxGain.gain.setValueAtTime(0.85, ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM Bus with Low-pass Filter for cosmic immersion
      this.bgmFilter = ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.setValueAtTime(1400, ctx.currentTime);
      this.bgmFilter.Q.setValueAtTime(1.0, ctx.currentTime);

      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.musicLevel, ctx.currentTime);

      this.bgmGain.connect(this.bgmFilter);
      this.bgmFilter.connect(this.masterGain);

      return true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return false;
    }
  }

  public unlockContext(): void {
    if (!this.active || typeof document === 'undefined' || document.hidden || this.muted) return;
    if (!this.initContext() || !this.context) return;
    const ctx = this.context;
    if (ctx.state !== 'running') {
      // A failed or pending resume is not an unlock. A later gesture can retry.
      void ctx.resume().then(() => {
        if (this.context === ctx && !this.disposed && ctx.state === 'running') this.unlockContext();
      }).catch(() => {});
      return;
    }
    this.isUnlocked = true;

    // Start background cosmic pad if not muted
    if (!this.muted && !this.bgmPlaying && !document.hidden) {
      this.startCosmicAmbient();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof document !== 'undefined') document.documentElement.dataset.journeySound = muted ? 'off' : 'on';
    try { window.localStorage.setItem(SOUND_PREFERENCE, muted ? 'off' : 'on'); } catch { /* Optional persistence. */ }
    if (this.context && this.masterGain) {
      const now = this.context.currentTime;
      // Fast fade-out within 0.08s (strictly under 100ms per requirements)
      holdAudioParam(this.masterGain.gain, now);
      this.masterGain.gain.linearRampToValueAtTime(muted || document.hidden || !this.active ? 0 : 0.65, now + .08);
    }
    if (this.customAudioElement) {
      this.customAudioElement.muted = muted;
    }
    if (!muted && !this.bgmPlaying && this.isUnlocked && !document.hidden) {
      this.startCosmicAmbient();
    }
  }

  /** Portfolio and workspace own separate soundscapes; changing view is not a mute preference. */
  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.pauseOnHidden();
      this.stopCosmicAmbient();
    } else if (this.isUnlocked) this.resumeOnVisible();
  }

  private pauseOnHidden(): void {
    if (this.context && this.masterGain) {
      const now = this.context.currentTime;
      holdAudioParam(this.masterGain.gain, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + .03);
    }
    if (this.customAudioElement && !this.customAudioElement.paused) {
      try { this.customAudioElement.pause(); } catch {}
    }
  }

  private resumeOnVisible(): void {
    if (this.context && this.masterGain && !this.muted && this.active && !document.hidden) {
      const now = this.context.currentTime;
      holdAudioParam(this.masterGain.gain, now);
      this.masterGain.gain.linearRampToValueAtTime(0.65, now + .1);
      this.unlockContext();
    }
    if (this.customAudioElement && !this.muted && this.active && !document.hidden && this.isUnlocked) {
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
    if (!this.active || this.bgmPlaying || this.muted || !this.isUnlocked || typeof window === 'undefined' || document.hidden) return;
    if (!this.context || this.context.state !== 'running' || !this.bgmGain) return;

    const ctx = this.context;

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

      // An original, quiet A-minor motif. A single looping buffer has no timer,
      // accumulating voices or catch-up notes when a hidden tab resumes.
      if (!this.melodyBuffer) {
        const rate=12000, beat=1.6, notes=[440,523.251,659.255,493.883,440,391.995,329.628,391.995];
        this.melodyBuffer=ctx.createBuffer(1,Math.round(rate*beat*notes.length),rate);
        const samples=this.melodyBuffer.getChannelData(0);
        for(let i=0;i<samples.length;i++) {
          const seconds=i/rate, note=Math.floor(seconds/beat), t=seconds%beat;
          const frequency=notes[note], phase=2*Math.PI*frequency*t;
          const envelope=Math.min(1,t/.09)*Math.exp(-t*2.5)*Math.min(1,(beat-t)/.15);
          samples[i]=.17*envelope*(Math.sin(phase)+.14*Math.sin(phase*2)+.05*Math.sin(phase*3));
        }
      }
      const melody=ctx.createBufferSource();melody.buffer=this.melodyBuffer;melody.loop=true;
      melody.connect(this.bgmGain);melody.start(now);this.bgmVoices.push(melody);

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

  public setScene(scene: 'intro' | 'journey' | 'showcase' | 'contact'): void {
    this.musicLevel = MUSIC_LEVELS[scene];
    if(this.context && this.bgmGain) this.bgmGain.gain.setTargetAtTime(this.musicLevel,this.context.currentTime,.6);
  }

  private duckMusic(): void {
    if(!this.context || !this.bgmGain)return;
    const now=this.context.currentTime, gain=this.bgmGain.gain;
    holdAudioParam(gain, now);gain.setTargetAtTime(this.musicLevel*.6,now,.025);
    gain.setTargetAtTime(this.musicLevel,now+.22,.24);
  }

  /** One reusable voice: trackpad packets renew a soft pulse instead of stacking sounds. */
  /** Mechanical key tap. No autoplay attempts, hidden-tab backlog or sound while muted. */
  public playTypingTick(): void {
    const ctx = this.context;
    if (!this.active || this.muted || !this.isUnlocked || !ctx || ctx.state !== 'running' || !this.sfxGain || document.hidden) return;
    this.duckMusic();
    if (!this.typingBuffer) {
      this.typingBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .032), ctx.sampleRate);
      const samples = this.typingBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        const t = i / ctx.sampleRate, second = t > .012 ? Math.exp(-(t - .012) * 450) * .28 : 0;
        samples[i] = (Math.random() * 2 - 1) * (Math.exp(-t * 300) + second);
      }
    }
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.typingBuffer; source.playbackRate.value = .94 + (this.typingTick++ % 5) * .03;
    filter.type = 'bandpass'; filter.frequency.value = 1650; filter.Q.value = .7;
    gain.gain.setValueAtTime(.028, ctx.currentTime);
    source.connect(filter); filter.connect(gain); gain.connect(this.sfxGain);
    this.activeSfxSources.add(source);
    source.onended = () => { this.activeSfxSources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start();
  }

  public playScroll(delta: number): void {
    if (!this.active || !Number.isFinite(delta) || delta === 0 || this.muted || typeof document === 'undefined' || document.hidden) return;
    this.unlockContext();
    if (!this.context || this.context.state !== 'running' || !this.sfxGain) return;
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
    holdAudioParam(gain.gain, now);
    gain.gain.linearRampToValueAtTime(.014 + strength * .024, now + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
  }

  /**
   * Play High-Precision Procedural Sound Effects
   */
  public playSfx(type: PortfolioSfxType): void {
    if (!this.active || this.muted || !this.isUnlocked || typeof window === 'undefined' || document.hidden) return;
    if (!this.initContext() || !this.context || !this.sfxGain) return;
    if (this.context.state !== 'running') return;
    if(type !== 'hover') this.duckMusic();

    const ctx = this.context;

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
    this.disposed = true;
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      for (const event of ['pointerdown', 'wheel', 'keydown', 'touchstart']) window.removeEventListener(event, this.handleUnlock);
      window.removeEventListener('journey-audio-muted', this.handleMute);
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    for (const source of this.activeSfxSources) { try { source.stop(); } catch { /* Already ended. */ } }
    this.activeSfxSources.clear(); this.typingBuffer = null; this.melodyBuffer=null;
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
