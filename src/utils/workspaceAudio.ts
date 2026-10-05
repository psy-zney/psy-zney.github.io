import { CODE_TO_SCAN_CODE, KEYBOARD_SOUND_BASE } from '../data/keyboardSound';
type Cue = 'focus' | 'select' | 'paper' | 'book' | 'book-close' | 'monitor' | 'confirm' | 'keyboard';
const cues: Record<Cue, { frequency: number; seconds: number; gain: number }> = {
  focus: { frequency: 720, seconds: .055, gain: .045 }, select: { frequency: 420, seconds: .09, gain: .12 },
  paper: { frequency: 260, seconds: .16, gain: .08 }, book: { frequency: 320, seconds: .15, gain: .08 },
  monitor: { frequency: 560, seconds: .24, gain: .10 }, confirm: { frequency: 800, seconds: .06, gain: .06 },
  keyboard: { frequency: 160, seconds: .035, gain: .10 },
  'book-close': { frequency: 300, seconds: .10, gain: .05 },
};
/** One opt-in context; short synthesized cues need no asset download. */
export class WorkspaceAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private voiceGains = new Map<AudioScheduledSourceNode, GainNode>();
  private keyboardBuffer: AudioBuffer | null = null;
  private keyboardDefinitions: Record<string, [number, number]> = {};
  private keyboardFetch: AbortController | null = null;
  private keyboardAt = 0;
  private keyboardVoices = 0;
  private lastAt = 0;
  enabled = false; volume = .5;
  async enable(value: boolean) {
    if (value && this.enabled && this.context?.state === 'running') return;
    this.enabled = value;
    if (!value) { this.stop(); return; }
    if (typeof AudioContext === 'undefined') return;
    this.context ??= new AudioContext();
    this.master ??= this.context.createGain(); this.master.gain.value = this.volume ** 2;
    this.master.disconnect(); this.master.connect(this.context.destination);
    try { await this.context.resume(); } catch { /* UI works in silence. */ }
  }
  setVolume(volume: number) { this.volume = volume; if (this.master && this.context) this.master.gain.setTargetAtTime(volume ** 2, this.context.currentTime, .02); }
  private async loadKeyboard() {
    if (this.keyboardFetch || !this.context) return;
    const controller = new AbortController(), context = this.context; this.keyboardFetch = controller;
    try {
      const configResponse = await fetch(`${KEYBOARD_SOUND_BASE}/config.json`, { signal: controller.signal });
      if (!configResponse.ok) return;
      const config = await configResponse.json() as { sound: string; defines: Record<string, [number, number]> };
      const response = await fetch(`${KEYBOARD_SOUND_BASE}/${config.sound}`, { signal: controller.signal });
      if (!response.ok) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (!controller.signal.aborted && context === this.context) { this.keyboardBuffer = buffer; this.keyboardDefinitions = config.defines; }
    } catch { /* Synthesized feedback remains available; never retry per key. */ }
  }
  playKeyboard(code: string) {
    const context = this.context, now = performance.now();
    if (!this.enabled || !context || context.state !== 'running' || document.hidden || this.voices.size >= 6 || this.keyboardVoices >= 4 || now - this.keyboardAt < 30) return;
    this.keyboardAt = now;
    if (!this.keyboardBuffer) { void this.loadKeyboard(); this.play('keyboard'); return; }
    const definition = this.keyboardDefinitions[CODE_TO_SCAN_CODE[code]]; if (!definition) return;
    const source = context.createBufferSource(), gain = context.createGain(); source.buffer = this.keyboardBuffer;
    const [offsetMs, durationMs] = definition, duration = Math.min(.24, durationMs / 1000), at = context.currentTime;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.08, at + .003); gain.gain.setValueAtTime(.08, at + Math.max(.004, duration - .008)); gain.gain.linearRampToValueAtTime(0, at + duration);
    source.connect(gain); gain.connect(this.master!); this.voices.add(source); this.voiceGains.set(source, gain); this.keyboardVoices++;
    source.onended = () => { source.disconnect(); gain.disconnect(); this.voices.delete(source); this.voiceGains.delete(source); if (this.context === context) this.keyboardVoices = Math.max(0,this.keyboardVoices-1); };
    source.start(at, offsetMs / 1000, duration);
  }
  play(cue: Cue) {
    const context = this.context;
    if (!this.enabled || !context || context.state !== 'running' || document.hidden || this.voices.size >= 6) return;
    if (cue === 'focus' && performance.now() - this.lastAt < 300) return;
    this.lastAt = performance.now();
    const spec = cues[cue], oscillator = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(spec.frequency, now); oscillator.frequency.exponentialRampToValueAtTime(spec.frequency * .75, now + spec.seconds);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(spec.gain, now + .01); gain.gain.exponentialRampToValueAtTime(.0001, now + spec.seconds);
    oscillator.connect(gain); gain.connect(this.master!); this.voices.add(oscillator); this.voiceGains.set(oscillator, gain);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); this.voiceGains.delete(oscillator); };
    oscillator.start(now); oscillator.stop(now + spec.seconds + .01);
  }
  stop() { const now = this.context?.currentTime ?? 0; this.voices.forEach(voice => { try { const gain = this.voiceGains.get(voice); gain?.gain.cancelScheduledValues(now); gain?.gain.setTargetAtTime(0, now, .012); voice.stop(now + .08); } catch { /* Already stopped. */ } }); }
  dispose() { this.stop(); this.keyboardFetch?.abort(); this.keyboardFetch = null; this.keyboardBuffer = null; this.master?.disconnect(); if (this.context && this.context.state !== 'closed') void this.context.close(); this.context = null; this.master = null; this.voices.clear(); this.voiceGains.clear(); }
}
