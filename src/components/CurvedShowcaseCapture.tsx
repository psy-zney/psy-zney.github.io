import type { CSSProperties } from 'react';
import { showcaseScreenPoint, SHOWCASE_SCREEN_ARC, SHOWCASE_SCREEN_STRIPS } from '../data/showcaseScreen';

const strips = Array.from({ length: SHOWCASE_SCREEN_STRIPS }, (_, i) => ({
  ...showcaseScreenPoint((i + .5) / SHOWCASE_SCREEN_STRIPS),
  width: SHOWCASE_SCREEN_ARC / (2 * Math.sin(SHOWCASE_SCREEN_ARC / 2)) / SHOWCASE_SCREEN_STRIPS,
  offset: i * SHOWCASE_SCREEN_ARC / (2 * Math.sin(SHOWCASE_SCREEN_ARC / 2)) / SHOWCASE_SCREEN_STRIPS,
}));

/** Reuse the supplied capture; never clone the live iframe into strips. */
export function CurvedShowcaseCapture({ src, cropScrollbar }: { src: string; cropScrollbar: boolean }) {
  return <div className="screening-curved-capture" aria-hidden="true" data-curved-strips={strips.length}>
    {strips.map((strip, i) => <div key={i} className="screening-capture-strip" style={{
      left: `${(strip.x + .5) * 100}%`, width: `calc(${strip.width * 100}% + 1.2px)`,
      transform: `translateX(-50%) translateZ(calc(var(--screen-width) * ${strip.z})) rotateY(${-strip.angle}rad)`,
      backgroundImage: `url("${src}")`,
      backgroundSize: `calc(var(--screen-width) * ${strip.width * SHOWCASE_SCREEN_STRIPS * (cropScrollbar ? 1280 / 1264 : 1)}) 100%`,
      backgroundPosition: `calc(var(--screen-width) * ${-strip.offset} + .6px) 0`,
    } as CSSProperties} />)}
  </div>;
}
