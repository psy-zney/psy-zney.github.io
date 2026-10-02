import { clamp } from "./virgoFlight";

export const FRACTURE_SOUND = {
  start: .70, finish: 1.34,
  clipStart: 1, clipEnd: 9.3,
  sound: "./effects/fracture-impact.m4a",
} as const;

export function fractureSoundSample(position: number) {
  const progress = clamp((position - FRACTURE_SOUND.start) / (FRACTURE_SOUND.finish - FRACTURE_SOUND.start));
  return {
    time: FRACTURE_SOUND.clipStart + progress * (FRACTURE_SOUND.clipEnd - FRACTURE_SOUND.clipStart),
    active: position >= FRACTURE_SOUND.start && position < 1.38,
  };
}

/** The original sound is independent of the native, scroll-driven glass renderer. */
export class VirgoFractureAudio {
  private previousPosition = 0;
  private soundPlayed = false;
  private pendingSound = false;
  private wasPaused = false;
  private soundEnabled = false;
  private disposed = false;
  private blocked = false;
  private reduced = false;
  private paused = false;
  private retryFromGesture = () => {
    if (!this.blocked || !this.soundEnabled || this.paused || this.reduced || this.disposed) return;
    this.blocked = false;
    this.update(this.previousPosition, false, false, true);
  };

  constructor(private audio: HTMLAudioElement) {
    audio.volume = .48;
    audio.ownerDocument?.addEventListener("pointerdown", this.retryFromGesture);
    audio.ownerDocument?.addEventListener("keydown", this.retryFromGesture);
  }

  update(position: number, paused: boolean, reduced: boolean, soundEnabled: boolean) {
    if (this.disposed) return;
    this.paused = paused;
    this.reduced = reduced;
    const sample = fractureSoundSample(position);
    const forward = position > this.previousPosition + .00001;
    this.previousPosition = position;
    if (soundEnabled && !this.soundEnabled) { this.soundPlayed = false; this.blocked = false; }
    this.soundEnabled = soundEnabled;

    if (position < .65) { this.soundPlayed = false; this.blocked = false; this.audio.pause(); }
    if (paused || reduced || !soundEnabled || position >= 1.60 || position < .65) {
      this.audio.pause();
      this.wasPaused = paused;
      return;
    }
    if (this.soundPlayed && this.wasPaused && sample.active && !this.audio.ended) this.audio.play().catch(() => {});
    this.wasPaused = false;
    if (!this.soundPlayed && !this.pendingSound && !this.blocked && sample.active && (forward || soundEnabled)) {
      this.pendingSound = true;
      if (!this.audio.src) this.audio.src = FRACTURE_SOUND.sound;
      this.audio.currentTime = sample.time;
      this.audio.play().then(() => { this.soundPlayed = true; }).catch(() => {
        // Retry on an ordinary page gesture, without a dedicated sound button
        // or a new play promise on every render frame.
        this.blocked = true;
      }).finally(() => {
        this.pendingSound = false;
        if (this.disposed) this.audio.pause();
      });
    }
  }

  dispose() {
    this.disposed = true;
    this.audio.ownerDocument?.removeEventListener("pointerdown", this.retryFromGesture);
    this.audio.ownerDocument?.removeEventListener("keydown", this.retryFromGesture);
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
  }
}
