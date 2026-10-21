import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Language } from '../data/portfolio';
import { INTRO_PINNED_VIEW, introTypingFrame, introVideoOpacity } from '../data/introPresentation';
import { IntroUniverseBackdrop } from './MainUniverse';
import { originalIntroMedia, type IntroMedia } from '../data/introMedia';
import { portfolioAudio } from '../utils/portfolioAudio';
import './UniverseTransition.css';

export function UniverseIntro({ lang, pageRef, reducedMotion, initialDirection = 1, onArrive, onFinish, onReturn }: {
  lang: Language; pageRef: RefObject<HTMLDivElement>; reducedMotion: boolean; initialDirection?: 1 | -1;
  onArrive: () => void; onFinish: () => void; onReturn: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const view = useRef<{yaw:number;pitch:number}>({...INTRO_PINNED_VIEW});
  const [hidden,setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [media,setMedia] = useState<IntroMedia>({url:null,poster:null});
  useEffect(()=>{let active=true;void fetch('./media/intro-source.json').then(r=>r.json()).then(data=>{if(active)setMedia(originalIntroMedia(data));}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{const sync=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync);},[]);
  const video = useRef<HTMLVideoElement>(null), start = useRef<() => void>(() => {});
  const playingRef = useRef(false), requestId = useRef(0);
  const [playing, setPlaying] = useState(false), [playbackError, setPlaybackError] = useState(false);
  useEffect(() => {
    const sync=()=>{
      const element=video.current;if(!element||!playingRef.current)return;
      if(document.hidden)element.pause();
      else void element.play().catch(()=>{playingRef.current=false;setPlaying(false);setPlaybackError(true);});
    };
    document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[]);
  const lines = [lang === 'vie' ? 'Xin chào, tôi là' : "Hello, I'm", 'Lê Quang Khánh', lang === 'vie' ? 'Chào mừng đến với vũ trụ sáng tạo của tôi.' : 'Welcome to my creative universe.'];
  const [typing, setTyping] = useState(() => introTypingFrame(0, lines, reducedMotion));
  useEffect(() => {
    let raf = 0, elapsed = 0, last = performance.now(), previous = 0;
    const texts = [lang === 'vie' ? 'Xin chào, tôi là' : "Hello, I'm", 'Lê Quang Khánh', lang === 'vie' ? 'Chào mừng đến với vũ trụ sáng tạo của tôi.' : 'Welcome to my creative universe.'];
    const tick = (now: number) => {
      if (!document.hidden && !playingRef.current) elapsed += Math.max(0, Math.min(100, now - last));
      last = now;
      const frame = introTypingFrame(elapsed, texts, reducedMotion), total = frame.counts.reduce((a,b) => a+b,0);
      if (total !== previous) {
        const visible = texts.map((text,i) => Array.from(text.normalize('NFC')).slice(0,frame.counts[i]).join('')).join('');
        if (total > previous && !reducedMotion && /\S$/.test(visible)) portfolioAudio.playTypingTick();
        previous = total;
      }
      setTyping(old => old.active === frame.active && old.counts.every((n,i) => n===frame.counts[i]) ? old : frame);
      if (!frame.finished) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lang,reducedMotion]);
  useEffect(() => {
    const hero = root.current, page = pageRef.current, element = video.current;
    if (!hero || !page) return;
    hero.focus({ preventScroll: true });
    if (initialDirection < 0) { onReturn(); return; }
    let raf = 0, last = performance.now(), ambient = 0;
    let active = true;
    let entryElapsed: number | null = null;
    let yaw: number = INTRO_PINNED_VIEW.yaw, pitch: number = INTRO_PINNED_VIEW.pitch, dragging = false, previousX = 0, previousY = 0, touchX = 0;
    let hoverYaw = 0, hoverPitch = 0, targetHoverYaw = 0, targetHoverPitch = 0;
    const clearHover = () => { targetHoverYaw = 0; targetHoverPitch = 0; };
    let touchIntent: 'orbit' | 'scroll' | null = null;
    let touchY = 0, dirty = true;
    // Prepare Home behind the page without changing its established reading pose.
    onArrive(); page.dispatchEvent(new Event('virgo-intro-preview'));
    const cancelVideo = () => {
      requestId.current++; playingRef.current = false; video.current?.pause(); setPlaying(false);
    };
    start.current = () => {
      if (playingRef.current || entryElapsed !== null) return;
      portfolioAudio.unlockContext(); setPlaybackError(false); onArrive();
      if (reducedMotion) { portfolioAudio.playSfx('warp'); onFinish(); return; }
      if (!media.url) {
        portfolioAudio.playSfx('warp');
        entryElapsed = 0;
        hero.dataset.entering = 'true'; hero.setAttribute('aria-busy', 'true');
        hero.querySelector('.universe-identity')?.setAttribute('inert', '');
        hero.focus({ preventScroll: true });
        return;
      }
      const element = video.current; if (!element) return;
      const id = ++requestId.current;
      playingRef.current = true; setPlaying(true); if (element.error) element.load(); element.currentTime = 0;
      void element.play().catch(() => {
        if (!active || id !== requestId.current) return;
        playingRef.current = false; setPlaying(false); setPlaybackError(true);
      });
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault(); event.stopPropagation();
    };
    const key = (event: KeyboardEvent) => {
      if (entryElapsed !== null) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.key === 'Escape') {
          entryElapsed = null; delete hero.dataset.entering; hero.removeAttribute('aria-busy');
          hero.style.removeProperty('--universe-entry');
          hero.querySelector('.universe-identity')?.removeAttribute('inert');
          hero.querySelector<HTMLButtonElement>('.universe-start')?.focus({ preventScroll: true });
        }
        return;
      }
      if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select')) return;
      if (['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        clearHover();
        if (event.key === 'Home') { yaw = INTRO_PINNED_VIEW.yaw; pitch = INTRO_PINNED_VIEW.pitch; hoverYaw = hoverPitch = 0; }
        else yaw += (event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 8;
        dirty = true; return;
      }
      if (event.key === 'Escape' && playingRef.current) { event.preventDefault(); cancelVideo(); return; }
      if (['ArrowDown','PageDown','ArrowUp','PageUp',' '].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const touchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0; touchX = event.touches[0]?.clientX ?? 0; touchIntent = null;
    };
    const touchMove = (event: TouchEvent) => {
      if (entryElapsed !== null) { event.preventDefault(); return; }
      const next = event.touches[0]?.clientY ?? touchY, nx = event.touches[0]?.clientX ?? touchX;
      const dx = nx - touchX, dy = next - touchY;
      if (!touchIntent && Math.hypot(dx, dy) > 5) touchIntent = Math.abs(dx) > Math.abs(dy) ? 'orbit' : 'scroll';
      event.preventDefault(); event.stopImmediatePropagation();
      if (touchIntent === 'orbit') { yaw -= dx / hero.clientWidth * Math.PI * 2; dirty = true; }

      touchY = next; touchX = nx;
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || playingRef.current || entryElapsed !== null) return;
      if (dragging) {
        yaw -= (event.clientX - previousX) / hero.clientWidth * Math.PI * 2;
        pitch = Math.max(-1.25, Math.min(1.25, pitch + (event.clientY - previousY) / hero.clientHeight * Math.PI));
        previousX = event.clientX; previousY = event.clientY;
      } else if (!reducedMotion && event.pointerType === 'mouse' && event.buttons === 0 && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
        const bounds = hero.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
        targetHoverYaw = -x * .045; targetHoverPitch = -y * .025;
      }
      dirty = true;
    };
    const pointerDown = (event: PointerEvent) => {
      if (playingRef.current || entryElapsed !== null || event.pointerType === 'touch' || event.button !== 0 || event.target instanceof Element && event.target.closest('button,a')) return;
      dragging = true; previousX = event.clientX; previousY = event.clientY;
      clearHover();
      hero.setPointerCapture(event.pointerId); hero.dataset.dragging = 'true'; event.preventDefault();
    };
    const pointerUp = () => { dragging = false; delete hero.dataset.dragging; clearHover(); };
    const reset = () => { yaw = INTRO_PINNED_VIEW.yaw; pitch = INTRO_PINNED_VIEW.pitch; clearHover(); hoverYaw = hoverPitch = 0; dirty = true; };
    const resize = () => { dirty = true; };
    const draw = (now: number) => {
      const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      if (entryElapsed !== null) {
        entryElapsed += dt;
        const progress = Math.min(1, entryElapsed / .95);
        hero.style.setProperty('--universe-entry', String(progress * progress * (3 - 2 * progress)));
        if (progress >= 1) { onFinish(); return; }
      }
      if (!reducedMotion) ambient += dt;
      if (entryElapsed === null && !playingRef.current) {
        const blend = 1 - Math.exp(-dt * 7);
        const nextYaw = hoverYaw + (targetHoverYaw - hoverYaw) * blend;
        const nextPitch = hoverPitch + (targetHoverPitch - hoverPitch) * blend;
        if (Math.abs(nextYaw - hoverYaw) + Math.abs(nextPitch - hoverPitch) > .000001) dirty = true;
        hoverYaw = Math.abs(nextYaw - targetHoverYaw) < .00001 ? targetHoverYaw : nextYaw;
        hoverPitch = Math.abs(nextPitch - targetHoverPitch) < .00001 ? targetHoverPitch : nextPitch;
      }
      const element = video.current;
      const progress = playingRef.current && element && element.duration > 0 ? element.currentTime / element.duration : 0;
      hero.style.setProperty('--universe-video-opacity', String(element ? introVideoOpacity(element.currentTime, element.duration) : 1));
      hero.dataset.progress = progress.toFixed(4); hero.dataset.ambientTime = ambient.toFixed(3);
      hero.dataset.phase = playingRef.current ? 'video' : 'universe';
      hero.dataset.yaw = yaw.toFixed(5); hero.dataset.pitch = pitch.toFixed(5);
      hero.dataset.hoverYaw = hoverYaw.toFixed(5); hero.dataset.hoverPitch = hoverPitch.toFixed(5);
      view.current.yaw = yaw + hoverYaw; view.current.pitch = Math.max(-1.25, Math.min(1.25, pitch + hoverPitch));
      if(dirty) { hero.dispatchEvent(new Event('universe-view-change')); dirty=false; }
      raf = requestAnimationFrame(draw);
    };
    page.addEventListener('wheel', wheel, { capture: true, passive: false });
    page.addEventListener('keydown', key, true);
    page.addEventListener('touchstart', touchStart, { passive: true });
    page.addEventListener('touchmove', touchMove, { capture: true, passive: false });
    hero.addEventListener('pointermove', pointer); hero.addEventListener('pointerdown', pointerDown);
    hero.addEventListener('pointerup', pointerUp); hero.addEventListener('pointercancel', pointerUp);
    hero.addEventListener('lostpointercapture', pointerUp); hero.addEventListener('dblclick', reset);
    hero.addEventListener('pointerleave', clearHover); window.addEventListener('blur', clearHover);
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      active = false; requestId.current++; playingRef.current = false; start.current = () => {};
      element?.pause();
      page.removeEventListener('wheel', wheel, true); page.removeEventListener('keydown', key, true);
      page.removeEventListener('touchstart', touchStart); page.removeEventListener('touchmove', touchMove, true);
      hero.removeEventListener('pointermove', pointer); hero.removeEventListener('pointerdown', pointerDown);
      hero.removeEventListener('pointerup', pointerUp); hero.removeEventListener('pointercancel', pointerUp);
      hero.removeEventListener('lostpointercapture', pointerUp); hero.removeEventListener('dblclick', reset);
      hero.removeEventListener('pointerleave', clearHover); window.removeEventListener('blur', clearHover);
      window.removeEventListener('resize', resize);
    };
  }, [initialDirection, reducedMotion, pageRef, onArrive, onFinish, onReturn, media.url]);
  return <section ref={root} tabIndex={-1} className={`virgo-intro-flight universe-intro${playing ? ' is-playing' : ''}`} aria-label={lang === 'vie' ? 'Vũ trụ sáng tạo của Lê Quang Khánh' : 'The creative universe of Lê Quang Khánh'}
    aria-description={lang === 'vie' ? 'Di chuột để nhìn nhẹ quanh nền. Kéo hoặc vuốt ngang để nhìn 360 độ. Chọn Start để bắt đầu.' : 'Move your mouse to gently look around. Drag or swipe horizontally for a full turn. Choose Start to begin.'}>
    <IntroUniverseBackdrop view={view} reduced={reducedMotion} hidden={hidden || playing}/>
    {media.url&&<video ref={video} className="universe-tunnel-video" src={media.url??undefined} poster={media.poster??undefined} preload="metadata" playsInline muted
      aria-hidden="true" onEnded={() => { onArrive(); onFinish(); }}
      onError={() => { requestId.current++; playingRef.current=false; setPlaying(false); setPlaybackError(true); }}/>}
    <div className="universe-identity">
      <header className="universe-name">
      <p aria-label={lines[0]}><span aria-hidden="true">{Array.from(lines[0]).slice(0,typing.counts[0]).join('')}{typing.active===0&&<i className="universe-caret"/>}</span></p>
      <h1 aria-label={lines[1]}><span aria-hidden="true">{Array.from(lines[1]).slice(0,typing.counts[1]).join('')}{typing.active===1&&<i className="universe-caret"/>}</span></h1>
      </header>
      <div className="universe-invitation">
      <p className="universe-tagline" aria-label={lines[2]}><span aria-hidden="true">{Array.from(lines[2]).slice(0,typing.counts[2]).join('')}{typing.active===2&&<i className="universe-caret"/>}</span></p>
      <button className="universe-start" onPointerEnter={() => portfolioAudio.playSfx('hover')} onFocus={() => portfolioAudio.playSfx('hover')} onClick={() => start.current()}>{playbackError ? (lang==='vie'?'Thử phát lại video':'Retry video') : 'Start'}</button>
      {playbackError&&<p className="universe-video-error" role="status">{lang==='vie'?'Không phát được video.':'The video could not play.'} <button onClick={() => {onArrive();onFinish();}}>{lang==='vie'?'Đi tới Home':'Continue to Home'}</button></p>}
      </div>
    </div>
    {playing&&<button className="universe-video-skip" onClick={() => {onArrive();onFinish();}}>{lang==='vie'?'Bỏ qua':'Skip'}</button>}
  </section>;
}
