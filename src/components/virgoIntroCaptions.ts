import type { Language } from '../data/portfolio';
import { INTRO_CAPTIONS, introCaptionPoint, introFrame, introTunnelView } from '../data/virgoIntro';
import { smooth } from '../data/virgoFlight';

/** Rasterize only on language/font changes; the render loop just projects strips. */
export function createIntroCaptionTextures(lang: Language, compact = false) {
  return INTRO_CAPTIONS.map((_, index) => {
    const surface = document.createElement('canvas');
    surface.width = compact ? 1400 : 1600; surface.height = 112;
    const ctx = surface.getContext('2d')!;
    ctx.font = '400 66px Outfit, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = [INTRO_CAPTIONS[index][lang]];
    // Keep names together and fit both languages on the same physical patch.
    while (Math.max(...lines.map(line => ctx.measureText(line).width)) > surface.width * .82) {
      const fontSize = Number(ctx.font.match(/([\d.]+)px/)?.[1] ?? 52) - 1;
      ctx.font = `400 ${fontSize}px Outfit, sans-serif`;
    }
    // Glow is baked into this small texture, never blurred across the viewport.
    ctx.shadowColor = '#61d9ee'; ctx.shadowBlur = 8; ctx.fillStyle = '#f0fbff';
    lines.forEach((text, i) => ctx.fillText(text, surface.width / 2, surface.height / 2 + (i - (lines.length - 1) / 2) * 65));
    return surface;
  });
}

export function drawIntroCaptions(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, textures: HTMLCanvasElement[]) {
  const view = introTunnelView(width, height), frame = introFrame(seconds);
  return INTRO_CAPTIONS.map((caption, index) => {
    const depth = frame.z - caption.z;
    const opacity = depth > 80 ? .16 + .84 * (1 - smooth(1800, 7000, depth)) : 0;
    if (opacity < .001) return { opacity: 0, left: 0, top: 0, width: 0, height: 0 };
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    const texture = textures[index], strips = 24, rows = 2;
    for (let i = 0; i < strips; i++) {
      for (let row = 0; row < rows; row++) {
        const a = introCaptionPoint(view, frame, index, i / strips, row / rows);
        const b = introCaptionPoint(view, frame, index, (i + 1) / strips, row / rows);
        const c = introCaptionPoint(view, frame, index, i / strips, (row + 1) / rows);
        const d = introCaptionPoint(view, frame, index, (i + 1) / strips, (row + 1) / rows);
        if (Math.min(a.depth, b.depth, c.depth, d.depth) < 80) continue;
        left = Math.min(left, a.x, b.x, c.x, d.x); right = Math.max(right, a.x, b.x, c.x, d.x);
        top = Math.min(top, a.y, b.y, c.y, d.y); bottom = Math.max(bottom, a.y, b.y, c.y, d.y);
        if (opacity < .001 || !texture || Math.max(a.x, b.x, c.x) < 0 || Math.min(a.x, b.x, c.x) > width) continue;
        const sw = texture.width / strips, sh = texture.height / rows;
        // Two triangles keep the trapezoid edges joined; a CSS rotation or one
        // affine parallelogram per strip would slide glyphs off the curved wall.
        for (const lower of [false, true]) {
          ctx.save(); ctx.globalAlpha = opacity;
          if (!lower) ctx.transform((b.x - a.x) / sw, (b.y - a.y) / sw, (c.x - a.x) / sh, (c.y - a.y) / sh, a.x, a.y);
          else ctx.transform((d.x - c.x) / sw, (d.y - c.y) / sw, (d.x - b.x) / sh, (d.y - b.y) / sh, b.x + c.x - d.x, b.y + c.y - d.y);
          ctx.beginPath();
          if (!lower) { ctx.moveTo(-.2, -.2); ctx.lineTo(sw + .2, -.2); ctx.lineTo(-.2, sh + .2); }
          else { ctx.moveTo(sw + .2, sh + .2); ctx.lineTo(-.2, sh + .2); ctx.lineTo(sw + .2, -.2); }
          ctx.closePath(); ctx.clip();
          ctx.drawImage(texture, i * sw, row * sh, sw, sh, 0, 0, sw, sh);
          ctx.restore();
        }
      }
    }
    return Number.isFinite(left) ? { opacity, left, top, width: right - left, height: bottom - top } : { opacity: 0, left: 0, top: 0, width: 0, height: 0 };
  });
}
