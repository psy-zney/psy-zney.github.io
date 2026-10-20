const timings = [75, 110, 55] as const;
export const INTRO_PINNED_VIEW = { yaw: 0.53979, pitch: -.01338 } as const;
const pauses = [350, 220, 280] as const;

/** Unicode-aware reveal; text layout reserves its full line height. */
export function introTypingFrame(elapsed: number, texts: readonly string[], reduced = false) {
  let remaining = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0), active = -1;
  const counts = texts.map((text, index) => {
    const length = Array.from(text.normalize('NFC')).length;
    if (reduced) return length;
    remaining -= pauses[index] ?? 200;
    const count = Math.max(0, Math.min(length, Math.floor(remaining / (timings[index] ?? 75))));
    if (active < 0 && count < length) active = index;
    remaining -= length * (timings[index] ?? 75);
    return count;
  });
  return { counts, active, finished: active < 0 };
}

/** Finishing fade only; camera movement belongs to the verified original media. */
export function introVideoOpacity(time: number, duration: number) {
  if (!(duration > 0) || !Number.isFinite(duration)) return 1;
  return Math.max(0, Math.min(1, (duration - time) / .35));
}
