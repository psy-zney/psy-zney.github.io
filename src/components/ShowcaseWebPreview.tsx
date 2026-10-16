import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Language } from '../data/portfolio';

/** Only the focused website runs; the original capture remains underneath. */
export function ShowcaseWebPreview({ url, title, active, reducedMotion, hasImage, lang, controlsHost, curveId }: {
  url: string; title: string; active: boolean; reducedMotion: boolean; hasImage: boolean; lang: Language; controlsHost: HTMLDivElement | null; curveId: string;
}) {
  const vi = lang === 'vie';
  const viewport = useRef<HTMLDivElement>(null);
  const nativeViewport = useRef<HTMLDivElement>(null);
  const timeout = useRef(0);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [mode, setMode] = useState<'live' | 'image'>(reducedMotion ? 'image' : 'live');
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [attempt, setAttempt] = useState(0);
  const mounted = active && visible && mode === 'live' && (state === 'loading' || state === 'ready');
  useEffect(() => { if (reducedMotion) setMode('image'); }, [reducedMotion]);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  useEffect(() => {
    setState('idle');
    if (!active || !visible || mode !== 'live') return;
    const dwell = window.setTimeout(() => {
      setState('loading');
      timeout.current = window.setTimeout(() => setState('error'), 12000);
    }, 420);
    return () => { clearTimeout(dwell); clearTimeout(timeout.current); };
  }, [active, visible, mode, url, attempt]);
  useEffect(() => {
    if (!mounted || !controlsHost) return;
    let frame = 0, previous = '';
    const align = () => {
      const anchor = viewport.current, surface = nativeViewport.current;
      if (!anchor || !surface) return;
      // Keep the native frame outside the CSS3D/scale chain: Chromium otherwise
      // draws it correctly but sends clicks to different document coordinates.
      const box = anchor.getBoundingClientRect(), host = controlsHost.getBoundingClientRect();
      const geometry = [box.left - host.left, box.top - host.top, box.width, box.height];
      const key = geometry.map(value => value.toFixed(2)).join(',');
      if (key !== previous) {
        [surface.style.left, surface.style.top, surface.style.width, surface.style.height] = geometry.map(value => `${value}px`);
        previous = key;
      }
      frame = requestAnimationFrame(align);
    };
    align();
    return () => cancelAnimationFrame(frame);
  }, [mounted, controlsHost]);
  return <>
    <div ref={viewport} className={`screening-web-anchor${state === 'ready' && mounted ? ' is-ready' : ''}`} aria-hidden="true" />
    {mounted && controlsHost && createPortal(<div ref={nativeViewport} className={`screening-web-viewport${state === 'ready' ? ' is-ready' : ''}`} aria-hidden={state !== 'ready'} data-lenis-prevent
      style={!reducedMotion ? { clipPath: `url(#${curveId})` } : undefined}>
      <iframe src={url} title={`${title} — live preview`} tabIndex={state === 'ready' ? 0 : -1}
        sandbox="allow-scripts allow-same-origin" referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => { clearTimeout(timeout.current); setState('ready'); }}
        onError={() => { clearTimeout(timeout.current); setState('error'); }} />
    </div>, controlsHost)}
    {active && controlsHost && createPortal(<div className="screening-web-controls" data-live-state={state}>
      <span>{mode === 'image' ? vi ? 'Ảnh gốc' : 'Capture' : state === 'error' ? vi ? 'Ảnh dự phòng' : 'Capture fallback' : state === 'ready' ? 'Live web' : vi ? 'Đang tải web…' : 'Loading web…'}</span>
      {(hasImage || mode === 'image' || state === 'error') && <button type="button"
        title={vi ? 'Đổi giữa website live và ảnh gốc' : 'Switch between the live website and original capture'}
        onClick={() => {
          if (state === 'error') setAttempt(value => value + 1);
          setState('idle'); setMode(mode === 'image' || state === 'error' ? 'live' : 'image');
        }}>
        {mode === 'image' || state === 'error' ? 'Live' : vi ? 'Xem ảnh' : 'Image'}
      </button>}
    </div>, controlsHost)}
  </>;
}
