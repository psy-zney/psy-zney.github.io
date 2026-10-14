import { journeySoundEnvelope } from '../data/virgoExperienceMotion';

/** Quiet movement layers follow the same position as the camera and screen ring. */
export class VirgoJourneyAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private air: GainNode | null = null;
  private tone: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private previous = Number.NaN;
  private screenSpeed = 0;
  private screenAt = 0;
  private muted = false;
  private disposed = false;
  private unlock = () => {
    if (this.disposed || this.muted || document.hidden) return;
    if (!this.context) this.create();
    if (this.context?.state === 'suspended') void this.context.resume().catch(() => {});
  };
  private preference = (event: Event) => {
    this.muted = Boolean((event as CustomEvent<boolean>).detail);
    if (this.muted) this.silence(); else this.unlock();
  };
  private movement = (event: Event) => {
    this.screenSpeed = (event as CustomEvent<number>).detail;
    this.screenAt = performance.now();
  };
  private visibility = () => { if (document.hidden) this.silence(); };
  constructor() {
    this.muted = document.documentElement.dataset.journeySound === 'off';
    document.addEventListener('pointerdown', this.unlock, { passive: true });
    document.addEventListener('wheel', this.unlock, { passive: true });
    document.addEventListener('keydown', this.unlock);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('journey-audio-muted', this.preference);
    window.addEventListener('journey-screen-motion', this.movement);
  }
  private create() {
    try {
      const context = new AudioContext();
      this.context = context;
      const master = context.createGain(); master.gain.value = .65; master.connect(context.destination); this.master = master;
      const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const samples = buffer.getChannelData(0); let soft = 0;
      for (let i = 0; i < samples.length; i++) { soft = .94 * soft + .06 * (Math.random() * 2 - 1); samples[i] = soft * 2; }
      const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 400; filter.Q.value = .45;
      const air = context.createGain(); air.gain.value = 0;
      noise.connect(filter).connect(air).connect(master); noise.start();
      this.air = air; this.filter = filter; this.sources.push(noise);
      const tone = context.createGain(); tone.gain.value = 0; tone.connect(master); this.tone = tone;
      // A soft fifth shares its envelope with the doorway; no abrupt impacts.
      [130.81, 196].forEach(frequency => {
        const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        const gain = context.createGain(); gain.gain.value = .4;
        oscillator.connect(gain).connect(tone); oscillator.start(); this.sources.push(oscillator);
      });
    } catch { /* Sound is optional on browsers without Web Audio. */ }
  }
  update(position: number, delta: number, paused: boolean, reduced: boolean, exit: number) {
    const speed = Number.isFinite(this.previous) ? (position - this.previous) / Math.max(delta, .008) : 0;
    this.previous = position;
    const screen = performance.now() - this.screenAt < 100 ? this.screenSpeed : 0;
    const envelope = journeySoundEnvelope(Math.max(Math.abs(speed), Math.abs(screen)), position, paused || reduced || this.muted || document.hidden, exit);
    if (!this.context || !this.air || !this.tone || !this.filter) return;
    const now = this.context.currentTime;
    this.air.gain.setTargetAtTime(envelope.air, now, .12);
    this.tone.gain.setTargetAtTime(envelope.tone, now, .22);
    this.filter.frequency.setTargetAtTime(envelope.frequency, now, .15);
  }
  private silence() {
    if (!this.context) return;
    [this.air, this.tone].forEach(bus => bus?.gain.setTargetAtTime(0, this.context!.currentTime, .025));
  }
  dispose() {
    this.disposed = true;
    document.removeEventListener('pointerdown', this.unlock);
    document.removeEventListener('wheel', this.unlock);
    document.removeEventListener('keydown', this.unlock);
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('journey-audio-muted', this.preference);
    window.removeEventListener('journey-screen-motion', this.movement);
    this.sources.forEach(source => { source.stop(); source.disconnect(); });
    void this.context?.close().catch(() => {});
  }
}
