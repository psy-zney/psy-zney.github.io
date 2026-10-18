export type RenderTier = 'low' | 'medium' | 'high';

const LIMITS = {
  low: { dpr: 1, pixels: 2_100_000 },
  medium: { dpr: 2, pixels: 8_300_000 },
  high: { dpr: 3, pixels: 16_600_000 },
};

/** Prefer sharp sampling on 1x displays; renderPixelRatio still enforces GPU limits. */
export function requestedPixelRatio(native=1,preferHigh=false) {
  return preferHigh?Math.max(native||1,1.5):(native||1);
}

/** Match physical pixels without allocating an unbounded Retina/ultrawide buffer. */
export function renderPixelRatio(width: number, height: number, native = 1, tier: RenderTier = 'high', scale = 1, maxDimension = 8192) {
  const w = Math.max(1, width), h = Math.max(1, height), limit = LIMITS[tier];
  return Math.min(Math.max(.1, native || 1), limit.dpr, Math.sqrt(limit.pixels / (w * h)), maxDimension / w, maxDimension / h)
    * Math.max(.6, Math.min(1, scale));
}

/** A few stable LODs avoid reallocating four HDR ray targets every flight frame. */
export function blackHoleResolution(projected: number, tier: RenderTier, moving: boolean, scale = 1, maxDimension = 8192) {
  const maximum = Math.min(maxDimension, tier === 'low' ? 768 : tier === 'medium' ? 1536 : 2048, moving ? 1280 : Infinity);
  const lod = [640, 768, 1024, 1280, 1536, 2048].find(size => size >= projected) ?? 2048;
  return Math.max(1, Math.min(maximum, Math.max(640, Math.round(Math.min(maximum, lod) * scale / 64) * 64)));
}

/** Measure whole frames, with sustained slow/healthy windows and no hidden-tab penalty. */
export class RenderCadence {
  scale = 1;
  private previous = 0;
  private start = 0;
  private frames = 0;
  private slow = 0;
  private healthy = 0;
  private cooldown = 0;
  sample(now: number, active = true) {
    const gap = now - this.previous;
    this.previous = now;
    if (!active || gap > 250 || !this.start) {
      this.start = now; this.frames = this.slow = this.healthy = 0;
      return false;
    }
    this.frames++;
    if (now - this.start < 1000) return false;
    const ms = (now - this.start) / this.frames;
    this.slow = ms > 36 ? this.slow + 1 : 0;
    this.healthy = ms < 21 ? this.healthy + 1 : 0;
    this.start = now; this.frames = 0;
    const before = this.scale;
    if (now >= this.cooldown && this.slow >= 3) this.scale = Math.max(.6, this.scale - .15);
    else if (now >= this.cooldown && this.healthy >= 12) this.scale = Math.min(1, this.scale + .15);
    if (before === this.scale) return false;
    this.cooldown = now + 15000; this.slow = this.healthy = 0;
    return true;
  }
}
