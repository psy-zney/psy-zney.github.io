// Adapted from React Bits Magnet and SpotlightCard, Copyright (c) 2026 David Haz.
// Upstream sources, local changes and license: docs/react-bits.vi.md.
import { useEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import './PointerEffects.css';

/** Local pointer events only: no ambient animation or document-wide pointer tracking. */
function usePointerSurface<T extends HTMLElement>(effect: 'magnet' | 'spotlight') {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const focusTarget = node.closest('a') ?? node;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const reset = () => {
      delete node.dataset.pointerActive;
      for (const property of ['--rb-x', '--rb-y']) node.style.removeProperty(property);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || motion.matches || !pointer.matches || document.hidden
        || node.closest('[inert]') || focusTarget.matches(':focus-visible')) {
        reset();
        return;
      }
      const rect = node.getBoundingClientRect();
      let x = event.clientX - rect.left, y = event.clientY - rect.top;
      if (effect === 'magnet') {
        x = (x - rect.width / 2) / 6;
        y = (y - rect.height / 2) / 6;
        const length = Math.hypot(x, y);
        if (length > 6) { x *= 6 / length; y *= 6 / length; }
      }
      node.style.setProperty('--rb-x', `${x.toFixed(2)}px`);
      node.style.setProperty('--rb-y', `${y.toFixed(2)}px`);
      node.dataset.pointerActive = 'true';
    };
    node.addEventListener('pointermove', move, { passive: true });
    node.addEventListener('pointerleave', reset);
    node.addEventListener('pointercancel', reset);
    focusTarget.addEventListener('focusin', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('scroll', reset, { capture: true, passive: true });
    document.addEventListener('visibilitychange', reset);
    motion.addEventListener('change', reset);
    pointer.addEventListener('change', reset);
    return () => {
      reset();
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', reset);
      node.removeEventListener('pointercancel', reset);
      focusTarget.removeEventListener('focusin', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('scroll', reset, true);
      document.removeEventListener('visibilitychange', reset);
      motion.removeEventListener('change', reset);
      pointer.removeEventListener('change', reset);
    };
  }, [effect]);
  return ref;
}

/** Move the contents, keeping the native link and its hit area stationary. */
export function MagnetLink({ children, className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ref = usePointerSurface<HTMLAnchorElement>('magnet');
  return <a {...props} ref={ref} className={`rb-magnet ${className}`}>
    <span className="rb-magnet-content">{children}</span>
  </a>;
}

export function MagnetButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = usePointerSurface<HTMLButtonElement>('magnet');
  return <button {...props} ref={ref} className={`rb-magnet ${className}`}>
    <span className="rb-magnet-content">{children}</span>
  </button>;
}

/** Keep the caller's card geometry and native parent link semantics. */
export function SpotlightCard({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = usePointerSurface<HTMLDivElement>('spotlight');
  return <div {...props} ref={ref} className={`rb-spotlight ${className}`}/>;
}
