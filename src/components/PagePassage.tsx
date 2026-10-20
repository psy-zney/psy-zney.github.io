import { useEffect, useRef } from 'react';
import { SHOWCASE_HANDOFF, SHOWCASE_PASSAGE_DURATION, showcaseSlideFrame } from '../data/universeTransition';
import './UniverseTransition.css';

export function ShowcasePassage({ direction = 1, initialTime, onComplete, onHandoff, onReverse }: {
  direction?: 1 | -1; initialTime?: number; onComplete: () => void; onHandoff: () => void; onReverse: (progress: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current, page = node?.closest<HTMLElement>('.virgo-page');
    if (!node || !page) return;
    let raf = 0, last = performance.now(), progress = initialTime ?? (direction > 0 ? 0 : 1), handed = false, touchY = 0;
    page.dataset.pagePassage = String(direction);
    const apply = () => {
      const frame = showcaseSlideFrame(progress);
      node.dataset.progress = progress.toFixed(4); node.dataset.phase = 'page-slide'; node.dataset.direction = String(direction);
      page.style.setProperty('--scene-page-offset', `${-frame.slide * page.clientHeight}px`);
      page.style.setProperty('--world-page-offset', `${(1 - frame.slide) * 100}%`);
    };
    apply();
    const cancel = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); if (direction > 0) onReverse(progress); };
    const key = (event: KeyboardEvent) => {
      if (['Escape', 'ArrowUp', 'PageUp'].includes(event.key)) cancel(event);
      else if (['ArrowDown', 'PageDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.deltaY < -15 && direction > 0) onReverse(progress);
    };
    const start = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const move = (event: TouchEvent) => {
      event.preventDefault(); event.stopImmediatePropagation();
      if ((event.touches[0]?.clientY ?? touchY) - touchY > 45 && direction > 0) onReverse(progress);
    };
    const draw = (now: number) => {
      const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      progress = Math.max(0, Math.min(1, progress + direction * dt / SHOWCASE_PASSAGE_DURATION));
      apply();
      if (!handed && (direction > 0 ? progress >= SHOWCASE_HANDOFF : progress <= SHOWCASE_HANDOFF)) { handed = true; onHandoff(); }
      if (direction > 0 ? progress >= 1 : progress <= 0) { onComplete(); return; }
      raf = requestAnimationFrame(draw);
    };
    page.addEventListener('wheel', wheel, { capture: true, passive: false }); page.addEventListener('keydown', key, true);
    page.addEventListener('touchstart', start, { passive: true }); page.addEventListener('touchmove', move, { capture: true, passive: false });
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      page.removeEventListener('wheel', wheel, true); page.removeEventListener('keydown', key, true);
      page.removeEventListener('touchstart', start); page.removeEventListener('touchmove', move, true);
      delete page.dataset.pagePassage; page.style.removeProperty('--scene-page-offset'); page.style.removeProperty('--world-page-offset');
    };
  }, [direction, initialTime, onComplete, onHandoff, onReverse]);
  return <div ref={root} className="page-passage" aria-hidden="true"/>;
}
