import { dbGain, renderPortfolioCue, renderPortfolioScore, scoreFromSamples, SCENE_MIX } from './portfolioSoundDesign';
import type { PortfolioScene, PortfolioScoreSamples, PortfolioSfxType } from './portfolioSoundDesign';
export type { PortfolioSfxType } from './portfolioSoundDesign';

const SOUND_PREFERENCE = 'portfolio-sound';
const MASTER_LEVEL = .65;
const MAX_SFX_VOICES = 12;

/** Firefox may lack cancelAndHoldAtTime; preserve today's value before rescheduling. */
function holdAudioParam(param: AudioParam, now: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else { const value = param.value; param.cancelScheduledValues(now); param.setValueAtTime(value, now); }
}

/** One gesture-owned mixer. Music uses two cached stems, never a JS note scheduler. */
export class PortfolioAudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private pulseGain: GainNode | null = null;
  private scoreGate: GainNode | null = null;
  private score: ReturnType<typeof renderPortfolioScore> | null = null;
  private scoreWorker: Worker | null = null;
  private scoreLoading = false;
  private bgmVoices: AudioBufferSourceNode[] = [];
  private scoreOffset = 0;
  private scoreStartedAt = 0;
  private scene: PortfolioScene = 'journey';
  private cueBuffers = new Map<PortfolioSfxType | 'typing', AudioBuffer>();
  private activeSfxSources = new Map<AudioBufferSourceNode, GainNode>();
  private lastCueAt = new Map<string, number>();
  private cueVariation = 0;
  private scrollVoice: { oscillator: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private muted = false;
  private isUnlocked = false;
  private resuming = false;
  private disposed = false;
  private active = true;
  private handleUnlock = () => { this.unlockContext(); };
  private handleMute = (event: Event) => { this.setMuted(Boolean((event as CustomEvent<boolean>).detail)); };
  private handleVisibility = () => { if (document.hidden) this.pause(); else this.resume(); };

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    this.muted = document.documentElement.dataset.journeySound === 'off';
    try {
      const saved = window.localStorage.getItem(SOUND_PREFERENCE);
      if (saved === 'off' || saved === 'on') this.muted = saved === 'off';
    } catch { /* Persistence is optional. */ }
    document.documentElement.dataset.journeySound = this.muted ? 'off' : 'on';
    for (const event of ['pointerdown', 'wheel', 'keydown', 'touchstart']) window.addEventListener(event, this.handleUnlock, { passive: true });
    window.addEventListener('journey-audio-muted', this.handleMute);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  private initContext(): boolean {
    if (this.disposed || typeof window === 'undefined') return false;
    if (this.context && this.context.state !== 'closed') return true;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      const ctx = this.context = new AudioCtx();
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : MASTER_LEVEL, ctx.currentTime);
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12; this.compressor.knee.value = 8;
      this.compressor.ratio.value = 3; this.compressor.attack.value = .008; this.compressor.release.value = .24;
      this.masterGain.connect(this.compressor); this.compressor.connect(ctx.destination);
      this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = dbGain(-1);
      this.sfxGain.connect(this.masterGain);
      this.bgmGain = ctx.createGain(); this.bgmGain.gain.value = dbGain(SCENE_MIX[this.scene].music);
      this.bgmFilter = ctx.createBiquadFilter(); this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.value = 3200; this.bgmFilter.Q.value = .55;
      this.bgmGain.connect(this.bgmFilter); this.bgmFilter.connect(this.masterGain);
      return true;
    } catch (error) { console.warn('Portfolio audio unavailable:', error); return false; }
  }

  public unlockContext(): void {
    if (!this.active || this.disposed || typeof document === 'undefined' || document.hidden || this.muted) return;
    if (!this.initContext() || !this.context) return;
    const ctx = this.context;
    if (ctx.state !== 'running') {
      if (this.resuming) return;
      this.resuming = true;
      void ctx.resume().then(() => {
        this.resuming = false;
        if (this.context === ctx && !this.disposed && ctx.state === 'running') this.unlockContext();
      }).catch(() => { this.resuming = false; });
      return;
    }
    this.isUnlocked = true;
    this.startCosmicAmbient();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof document !== 'undefined') document.documentElement.dataset.journeySound = muted ? 'off' : 'on';
    try { window.localStorage.setItem(SOUND_PREFERENCE, muted ? 'off' : 'on'); } catch { /* Optional persistence. */ }
    if (muted) this.pause(); else this.resume();
  }

  /** Workspace keeps its own opt-in audio and volume. */
  public setActive(active: boolean): void {
    this.active = active;
    if (active) this.resume(); else this.pause();
  }

  private fadeMaster(level: number, seconds: number): void {
    if (!this.context || !this.masterGain) return;
    const now = this.context.currentTime;
    holdAudioParam(this.masterGain.gain, now);
    this.masterGain.gain.linearRampToValueAtTime(level, now + seconds);
  }

  private pause(): void {
    this.fadeMaster(0, .03);
    this.stopCosmicAmbient();
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const [source, gain] of this.activeSfxSources) {
      holdAudioParam(gain.gain, now); gain.gain.linearRampToValueAtTime(0, now + .025);
      try { source.stop(now + .03); } catch { /* Already ended. */ }
    }
    this.activeSfxSources.clear(); this.lastCueAt.clear();
    if (this.scrollVoice) {
      holdAudioParam(this.scrollVoice.gain.gain, now);
      this.scrollVoice.gain.gain.linearRampToValueAtTime(0, now + .025);
    }
  }

  private resume(): void {
    if (!this.active || this.muted || typeof document === 'undefined' || document.hidden || !this.isUnlocked) return;
    this.fadeMaster(MASTER_LEVEL, .1); this.unlockContext();
  }

  private prepareScore(ctx: AudioContext): boolean {
    if (this.score) return true;
    if (this.scoreLoading) return false;
    if (typeof Worker === 'undefined') { this.score = renderPortfolioScore(ctx); return true; }
    try {
      const worker = this.scoreWorker = new Worker(new URL('./portfolioScore.worker.ts', import.meta.url), { type: 'module' });
      this.scoreLoading = true;
      const finish = () => { worker.terminate(); this.scoreWorker = null; this.scoreLoading = false; };
      worker.onmessage = (event: MessageEvent<PortfolioScoreSamples>) => {
        finish();
        if (this.disposed || this.context !== ctx) return;
        this.score = scoreFromSamples(ctx, event.data); this.startCosmicAmbient();
      };
      worker.onerror = event => {
        event.preventDefault(); finish();
        if (this.disposed || this.context !== ctx) return;
        this.score = renderPortfolioScore(ctx); this.startCosmicAmbient();
      };
      worker.postMessage(null);
      return false;
    } catch { this.scoreLoading = false; this.scoreWorker?.terminate(); this.scoreWorker = null; this.score = renderPortfolioScore(ctx); return true; }
  }

  public startCosmicAmbient(): void {
    const ctx = this.context;
    if (!this.active || this.bgmVoices.length || this.muted || !this.isUnlocked || !ctx || ctx.state !== 'running' || !this.bgmGain || document.hidden) return;
    if (!this.prepareScore(ctx) || !this.score) return;
    const now = ctx.currentTime;
    const gate = this.scoreGate = ctx.createGain(); gate.gain.setValueAtTime(0, now);
    gate.gain.linearRampToValueAtTime(1, now + .8); gate.connect(this.bgmGain);
    const pulseGain = this.pulseGain = ctx.createGain();
    pulseGain.gain.value = dbGain(SCENE_MIX[this.scene].pulse); pulseGain.connect(gate);
    this.scoreStartedAt = now;
    for (const [buffer, output] of [[this.score.bed, gate], [this.score.pulse, pulseGain]] as const) {
      const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true; source.connect(output);
      source.onended = () => { source.disconnect(); if (output === gate) gate.disconnect(); else pulseGain.disconnect(); };
      source.start(now, this.scoreOffset); this.bgmVoices.push(source);
    }
  }

  public stopCosmicAmbient(): void {
    if (!this.context || !this.bgmVoices.length) return;
    const now = this.context.currentTime;
    this.scoreOffset = (this.scoreOffset + now - this.scoreStartedAt) % (this.score?.bed.duration ?? 51.2);
    if (this.scoreGate) {
      holdAudioParam(this.scoreGate.gain, now); this.scoreGate.gain.linearRampToValueAtTime(0, now + .06);
    }
    for (const source of this.bgmVoices) { try { source.stop(now + .065); } catch { /* Already ended. */ } }
    this.bgmVoices = []; this.scoreGate = null; this.pulseGain = null;
  }

  public setSpaceFilter(intensity: number): void {
    if (!this.context || !this.bgmFilter || !Number.isFinite(intensity)) return;
    this.bgmFilter.frequency.setTargetAtTime(3200 - Math.max(0, Math.min(1, intensity)) * 2850, this.context.currentTime, .15);
  }

  public setScene(scene: PortfolioScene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    if (!this.context) return;
    const now = this.context.currentTime;
    if (this.bgmGain) {
      holdAudioParam(this.bgmGain.gain, now);
      this.bgmGain.gain.setTargetAtTime(dbGain(SCENE_MIX[scene].music), now, .6);
    }
    this.pulseGain?.gain.setTargetAtTime(dbGain(SCENE_MIX[scene].pulse), now, .7);
  }

  private duckMusic(transition: boolean): void {
    if (!this.context || !this.bgmGain) return;
    const now = this.context.currentTime, gain = this.bgmGain.gain, level = dbGain(SCENE_MIX[this.scene].music);
    holdAudioParam(gain, now);
    gain.setTargetAtTime(level * dbGain(transition ? -5 : -2), now, .012);
    gain.setTargetAtTime(level, now + (transition ? .65 : .08), transition ? .35 : .14);
  }

  private playCue(cue: PortfolioSfxType | 'typing'): void {
    const ctx = this.context;
    if (!this.active || this.muted || !this.isUnlocked || !ctx || ctx.state !== 'running' || !this.sfxGain || document.hidden || this.disposed) return;
    const now = ctx.currentTime, previous = this.lastCueAt.get(cue) ?? -Infinity;
    if (now - previous < (cue === 'hover' ? .08 : cue === 'typing' ? .025 : .045) || this.activeSfxSources.size >= MAX_SFX_VOICES) return;
    this.lastCueAt.set(cue, now);
    const transition = cue === 'warp' || cue === 'singularityEnter' || cue === 'singularityExit' || cue === 'loaderComplete';
    if (cue !== 'hover' && cue !== 'typing') this.duckMusic(transition);
    let buffer = this.cueBuffers.get(cue);
    if (!buffer) { buffer = renderPortfolioCue(ctx, cue); this.cueBuffers.set(cue, buffer); }
    const source = ctx.createBufferSource(), gain = ctx.createGain(); source.buffer = buffer; gain.gain.value = 1;
    if (cue === 'typing' || cue === 'hover' || cue === 'click') source.playbackRate.value = .98 + this.cueVariation++ % 5 * .01;
    source.connect(gain); gain.connect(this.sfxGain); this.activeSfxSources.set(source, gain);
    source.onended = () => { this.activeSfxSources.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(now);
  }

  public playTypingTick(): void { this.playCue('typing'); }
  public playSfx(type: PortfolioSfxType): void { this.playCue(type); }

  /** Dense trackpad packets shape one breath of motion instead of stacking beeps. */
  public playScroll(delta: number): void {
    if (!this.active || !Number.isFinite(delta) || delta === 0 || this.muted || typeof document === 'undefined' || document.hidden) return;
    this.unlockContext();
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.sfxGain) return;
    const now = ctx.currentTime;
    if (!this.scrollVoice) {
      const oscillator = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      oscillator.type = 'triangle'; filter.type = 'lowpass'; filter.frequency.value = 1200; filter.Q.value = .5; gain.gain.value = 0;
      oscillator.connect(filter); filter.connect(gain); gain.connect(this.sfxGain); oscillator.start();
      this.scrollVoice = { oscillator, filter, gain };
    }
    const { oscillator, gain } = this.scrollVoice, strength = Math.min(1, Math.abs(delta) / 120);
    oscillator.frequency.setTargetAtTime(delta > 0 ? 329.628 : 261.626, now, .04);
    holdAudioParam(gain.gain, now); gain.gain.linearRampToValueAtTime(.018 + strength * .035, now + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .18);
  }

  public dispose(): void {
    this.disposed = true; this.pause();
    this.scoreWorker?.terminate(); this.scoreWorker = null; this.scoreLoading = false;
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      for (const event of ['pointerdown', 'wheel', 'keydown', 'touchstart']) window.removeEventListener(event, this.handleUnlock);
      window.removeEventListener('journey-audio-muted', this.handleMute); document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    this.scrollVoice?.oscillator.stop(); this.scrollVoice?.oscillator.disconnect();
    this.scrollVoice?.filter.disconnect(); this.scrollVoice?.gain.disconnect(); this.scrollVoice = null;
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.context = null; this.masterGain = null; this.sfxGain = null; this.bgmGain = null;
    this.bgmFilter = null; this.compressor = null; this.score = null; this.cueBuffers.clear();
  }
}

export const portfolioAudio = new PortfolioAudioSystem();
export function playPortfolioSfx(type: PortfolioSfxType): void { portfolioAudio.playSfx(type); }
