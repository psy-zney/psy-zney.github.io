import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowDown } from 'lucide-react';
import type { Language } from '../data/portfolio';
import { INTRO_CAPTIONS, INTRO_DURATION, introFrame } from '../data/virgoIntro';
import { smooth } from '../data/virgoFlight';
import { drawIntro } from './virgoIntroRenderer';
import './VirgoIntroFlight.css';

export function VirgoIntroFlight({ lang, pageRef, reducedMotion, onArrive, onFinish }: {
  lang: Language; pageRef: RefObject<HTMLDivElement>; reducedMotion: boolean;
  onArrive: () => void; onFinish: () => void;
}) {
  const layer = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const captions = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const started = useRef(false), arrived = useRef(false);
  const nudgeRef = useRef(0);
  const callbacks = useRef({ onArrive, onFinish });
  callbacks.current = { onArrive, onFinish };
  const start = () => {
    if (started.current) return;
    started.current = true;
    if (reducedMotion) { callbacks.current.onArrive(); callbacks.current.onFinish(); }
    else setRunning(true);
  };
  const startRef = useRef(start); startRef.current = start;

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const blockedTarget = (event: Event) => event.target instanceof Element && !!event.target.closest('a,button,input,textarea,select,[contenteditable="true"]');
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]'))) return;
      if (!started.current && (Math.abs(event.deltaY) > 0 || Math.abs(event.deltaX) > 0)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        startRef.current();
      } else if (started.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        nudgeRef.current += event.deltaY > 0 ? 0.35 : -0.35;
      }
    };
    const key = (event: KeyboardEvent) => {
      if (blockedTarget(event) || !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Enter', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!started.current) startRef.current();
      else nudgeRef.current += ['ArrowDown', 'PageDown', ' '].includes(event.key) ? 0.5 : -0.5;
    };
    let touchY = 0;
    const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const touchMove = (event: TouchEvent) => {
      if (blockedTarget(event)) return;
      if (!started.current && Math.abs(touchY - (event.touches[0]?.clientY ?? touchY)) < 8) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!started.current) startRef.current();
    };
    page.addEventListener('wheel', wheel, { capture: true, passive: false });
    page.addEventListener('keydown', key, true);
    page.addEventListener('touchstart', touchStart, { passive: true });
    page.addEventListener('touchmove', touchMove, { capture: true, passive: false });
    return () => {
      page.removeEventListener('wheel', wheel, true);
      page.removeEventListener('keydown', key, true);
      page.removeEventListener('touchstart', touchStart);
      page.removeEventListener('touchmove', touchMove, true);
    };
  }, [pageRef]);

  useEffect(() => {
    const surface = canvas.current, root = layer.current, page = pageRef.current;
    const ctx = surface?.getContext('2d');
    if (!surface || !root || !ctx || !page) return;
    let width = 1, height = 1, raf = 0, elapsed = 0, idleTime = 0, previous = performance.now();
    page.dataset.openingFlight = running ? 'running' : 'idle';
    const render = () => {
      const frame = introFrame(elapsed);
      drawIntro(ctx, width, height, elapsed, idleTime);
      root.dataset.phase = running ? frame.phase : 'idle';
      root.dataset.seconds = elapsed.toFixed(3);
      root.dataset.camera = [frame.x, frame.y, frame.z].map(v => v.toFixed(3)).join(',');
      root.style.opacity = String(frame.opacity);
      INTRO_CAPTIONS.forEach((caption, i) => {
        const el = captions.current?.children[i] as HTMLElement | undefined;
        if (!el) return;
        const amount = smooth(caption.from, caption.from + .18, elapsed) * (1 - smooth(caption.pass - .2, caption.pass, elapsed));
        const distance = Math.max(60, frame.z - caption.z);
        // Keep a readable angular size until the final quarter-second fly-by.
        const scale = Math.min(1.05, 460 / distance) + smooth(caption.pass - .25, caption.pass, elapsed) * 1.55;
        // Perspective carries each text plane outward and past the camera with cylindrical curvature
        const lateral = caption.side * Math.min(width * .38, width * (width < 600 ? .08 : .18) * scale) - frame.x * .12;
        const rotY = caption.side * -26;
        const rotX = 5;
        const rotZ = caption.side * 2.5;
        el.style.opacity = String(amount);
        el.style.filter = `blur(${(1 - amount) * 10}px)`;
        el.style.transform = `perspective(900px) translate3d(${lateral}px,${-frame.y * .15}px,0) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${scale})`;
        el.setAttribute('aria-hidden', String(amount < .1));
      });
    };
    const resize = new ResizeObserver(() => {
      width = root.clientWidth;
      height = root.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    });
    resize.observe(root);
    const visibility = () => { previous = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    const tick = (now: number) => {
      const delta = Math.max(0, now - previous) / 1000;
      previous = now;
      // Pause timeline advancement in hidden tabs
      if (!document.hidden) {
        idleTime += delta;
        if (running) {
          if (nudgeRef.current !== 0) {
            elapsed = Math.max(0, Math.min(INTRO_DURATION, elapsed + nudgeRef.current));
            nudgeRef.current = 0;
            if (elapsed <= 0.05) {
              started.current = false;
              setRunning(false);
            }
          } else {
            elapsed = Math.min(INTRO_DURATION, elapsed + delta);
          }
        }
      }
      if (running && (elapsed >= 5 || reducedMotion) && !arrived.current) {
        arrived.current = true;
        callbacks.current.onArrive();
      }
      render();
      if (running && (elapsed >= INTRO_DURATION || reducedMotion)) {
        callbacks.current.onFinish();
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      delete page.dataset.openingFlight;
    };
  }, [running, reducedMotion, pageRef]);

  return (
    <div
      ref={layer}
      className="virgo-intro-flight"
      data-running={running}
      aria-label={lang === 'vie' ? 'Mở đầu hành trình vũ trụ' : 'Cosmic opening journey'}
      onClick={() => {
        if (!started.current) start();
      }}
    >
      <canvas ref={canvas} aria-hidden="true" />
      <div ref={captions} className="virgo-intro-captions" aria-live="off">
        {INTRO_CAPTIONS.map((caption, i) => (
          <p key={i} data-z={caption.z} data-side={caption.side > 0 ? 'right' : 'left'} aria-hidden="true">
            {caption[lang]}
          </p>
        ))}
      </div>
      <button
        className="virgo-intro-arrow"
        type="button"
        disabled={running}
        onClick={(e) => {
          e.stopPropagation();
          start();
        }}
        aria-label={lang === 'vie' ? 'Cuộn để bắt đầu hành trình' : 'Begin the journey'}
      >
        <ArrowDown size={20} />
        <span className="virgo-intro-cue-text">{lang === 'vie' ? 'Cuộn hoặc chạm để bắt đầu' : 'Scroll or tap to begin'}</span>
      </button>
    </div>
  );
}
