import { GifReader } from 'omggif';

/** Composite only the current frame. The original GIF uses retained-frame disposal. */
export class ScreenGifFrames {
  readonly reader: GifReader;
  readonly pixels: Uint8Array;
  readonly duration: number;
  private ends: number[];
  private frame = -1;
  constructor(bytes: Uint8Array) {
    this.reader = new GifReader(bytes);
    if (this.reader.width * this.reader.height > 1024 * 1024 || !this.reader.numFrames()) throw new Error('Invalid screen GIF');
    this.pixels = new Uint8Array(this.reader.width * this.reader.height * 4);
    let duration = 0;
    this.ends = Array.from({ length: this.reader.numFrames() }, (_, i) => {
      if (this.reader.frameInfo(i).disposal > 1) throw new Error('Unsupported screen GIF disposal');
      duration += Math.max(20, this.reader.frameInfo(i).delay * 10); return duration;
    });
    this.duration = duration;
  }
  sample(elapsed: number) {
    const at = ((elapsed % this.duration) + this.duration) % this.duration;
    const next = this.ends.findIndex(end => at < end);
    if (next === this.frame) return false;
    if (next < this.frame) { this.pixels.fill(0); this.frame = -1; }
    while (this.frame < next) this.reader.decodeAndBlitFrameRGBA(++this.frame, this.pixels);
    return true;
  }
}
