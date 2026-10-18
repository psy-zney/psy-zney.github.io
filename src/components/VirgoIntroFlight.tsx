import { useEffect, useRef, type RefObject } from 'react';
import type { Language } from '../data/portfolio';
import { OPENING_STARS } from '../data/virgoOpening';
import { INTRO_ARRIVAL, INTRO_ASSEMBLY_DURATION, INTRO_CONSTELLATION_COMPLETE, INTRO_CAPTIONS, INTRO_DURATION, advanceIntroScroll, introInputTarget, introScrollResponse, introPortalFormation, introPortalShot, introPortalShotProjection, introConstellationFrame, introFrame } from '../data/virgoIntro';
import { drawIntro } from './virgoIntroRenderer';
import { createIntroCaptionTextures, drawIntroCaptions } from './virgoIntroCaptions';
import { drawIntroExit, introAperture } from './virgoIntroTunnel';
import { disposeIntroLiquid } from './IntroLiquidSurface';
import { RenderCadence, renderPixelRatio, requestedPixelRatio } from '../data/renderQuality';
import { useQualityTier } from './workspace/useQualityTier';
import './VirgoIntroFlight.css';

export function VirgoIntroFlight({ lang, pageRef, reducedMotion, onArrive, onFinish, onReturn, initialDirection = 1, initialAssemblyComplete = false }: {
  lang: Language; pageRef: RefObject<HTMLDivElement>; reducedMotion: boolean;
  onArrive: () => void; onFinish: () => void; onReturn: () => void;
  initialDirection?: 1 | -1; initialAssemblyComplete?: boolean;
}) {
  const quality = useQualityTier(true), qualityRef = useRef(quality);
  qualityRef.current = quality;
  const layer = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), captions = useRef<HTMLDivElement>(null);
  const playback = useRef({ seconds: initialDirection < 0 ? INTRO_DURATION : 0, velocity: 0 });
  const target = useRef(initialDirection < 0 ? INTRO_DURATION - .35 : 0), started = useRef(initialDirection < 0);
  const arrived = useRef(initialDirection < 0);
  const assembly = useRef(initialAssemblyComplete || initialDirection < 0 || reducedMotion ? INTRO_ASSEMBLY_DURATION : 0);
  const callbacks = useRef({ onArrive, onFinish, onReturn }); callbacks.current = { onArrive, onFinish, onReturn };
  const input = useRef<(amount: number, openPortal?: boolean) => void>(() => {});
  input.current = (amount, openPortal = false) => {
    if (!amount) return;
    if (reducedMotion) {
      if (amount > 0) { callbacks.current.onArrive(); callbacks.current.onFinish(); }
      return;
    }
    started.current = true;
    target.current = openPortal ? 2.75 : introInputTarget(playback.current.seconds, target.current, amount);
  };

  useEffect(() => {
    const page = pageRef.current; if (!page) return;
    const blocked = (event: Event) => event.target instanceof Element && !!event.target.closest('a,button,input,textarea,select,[contenteditable="true"],[data-lenis-prevent]');
    let lastWheel = -Infinity, openingGesture = false;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || blocked(event)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page.clientHeight : 1;
      const amount = (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * unit * .0045;
      if (!amount) return;
      const now = performance.now(), fresh = now - lastWheel > 180;
      lastWheel = now;
      if (amount < 0) openingGesture = false;
      else if (fresh) openingGesture = playback.current.seconds < 2.749;
      // The first gesture creates the doorway. Its trackpad tail cannot carry
      // the observer through it; another gesture starts forward flight.
      if (amount > 0 && openingGesture) { input.current(amount, true); return; }
      input.current(amount);
    };
    const key = (event: KeyboardEvent) => {
      if (blocked(event) || !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Enter', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      input.current(['ArrowUp', 'PageUp', 'Home'].includes(event.key) ? -.35 : .35);
    };
    let touchY = 0;
    const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const touchMove = (event: TouchEvent) => {
      if (blocked(event)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const next = event.touches[0]?.clientY ?? touchY;
      input.current((touchY - next) * .0045); touchY = next;
    };
    page.addEventListener('wheel', wheel, { capture: true, passive: false });
    window.addEventListener('keydown', key, true);
    page.addEventListener('touchstart', touchStart, { passive: true });
    page.addEventListener('touchmove', touchMove, { capture: true, passive: false });
    return () => {
      page.removeEventListener('wheel', wheel, true); window.removeEventListener('keydown', key, true);
      page.removeEventListener('touchstart', touchStart); page.removeEventListener('touchmove', touchMove, true);
    };
  }, [pageRef]);

  useEffect(() => {
    const surface = canvas.current, root = layer.current, page = pageRef.current;
    const ctx = surface?.getContext('2d'); if (!surface || !root || !ctx || !page) return;
    let width = 1, height = 1, density = 0, raf = 0, idleTime = 0, previous = performance.now(), disposed = false, lastPreview = -1;
    const cadence = new RenderCadence();
    const currentDensity = () => renderPixelRatio(width, height, requestedPixelRatio(window.devicePixelRatio,true), qualityRef.current.tier,
      qualityRef.current.preference === 'auto' ? cadence.scale : 1);
    let textures = createIntroCaptionTextures(lang), loaderActive = !!document.querySelector('[data-page-loader]');
    const loader = new MutationObserver(() => {
      if (!document.querySelector('[data-page-loader]')) { loaderActive = false; loader.disconnect(); }
    });
    if (loaderActive) loader.observe(document.documentElement, { childList: true, subtree: true });
    void document.fonts.ready.then(() => { if (!disposed) textures = createIntroCaptionTextures(lang); });
    const render = () => {
      // Pause the whole composition together so its last lit frame stays intact.
      if (document.hidden) return;
      const elapsed = playback.current.seconds, frame = introFrame(elapsed);
      const constellation = assembly.current >= INTRO_ASSEMBLY_DURATION ? INTRO_CONSTELLATION_COMPLETE : introConstellationFrame(assembly.current);
      drawIntro(ctx, width, height, elapsed, idleTime, constellation);
      const scale = Math.min(width / 26, height / 20);
      const core = { x: width * .5 + OPENING_STARS[1].position[0] * scale, y: height * .45 - OPENING_STARS[1].position[1] * scale };
      const aperture = introAperture(width, height, elapsed, core);
      ctx.save(); ctx.beginPath(); ctx.ellipse(aperture.x, aperture.y, aperture.radius * aperture.aspect, aperture.radius * .90, 0, 0, Math.PI * 2); ctx.clip();
      const surfaces = drawIntroCaptions(ctx, width, height, elapsed, textures);
      const exit = drawIntroExit(ctx, width, height, elapsed, idleTime); ctx.restore();
      root.dataset.phase = constellation.reveal < 1 ? 'connecting' : elapsed === 0 ? 'idle' : frame.phase;
      root.dataset.running = String(started.current);
      root.dataset.constellationStars = String(constellation.stars.filter(amount => amount > .1).length);
      root.dataset.constellationEdges = String(constellation.edges.filter(([a, b]) => a + b >= 1 - 1e-9).length);
      root.dataset.seconds = elapsed.toFixed(3); root.dataset.scrollTarget = target.current.toFixed(3);
      root.dataset.inputGain = (introScrollResponse(elapsed).gain * .0045).toFixed(7);
      root.dataset.velocity = playback.current.velocity.toFixed(3);
      const formation = introPortalFormation(elapsed);
      const shot = introPortalShot(elapsed);
      const shotProjection = introPortalShotProjection(width, height, core, elapsed);
      root.dataset.portalShotCenter = [shotProjection.x, shotProjection.y].map(v => v.toFixed(3)).join(',');
      root.dataset.portalShotRadius = shotProjection.headRadius.toFixed(3);
      root.dataset.portalShotTip = [shotProjection.headX, shotProjection.headY].map(v => v.toFixed(3)).join(',');
      root.dataset.portalShotTail = [shotProjection.tailX, shotProjection.tailY].map(v => v.toFixed(3)).join(',');
      root.dataset.portalShot = shot.opacity.toFixed(4);
      root.dataset.portalShotHead = shot.head.toFixed(4);
      root.dataset.portalImpact = shot.impact.toFixed(4);
      root.dataset.riftFracture = formation.seam.toFixed(4);
      root.dataset.riftGrowth = formation.crack.toFixed(4);
      root.dataset.riftPortal = formation.rim.toFixed(4);
      root.dataset.virtualGrid = 'hidden';
      root.dataset.entranceWorldRadius = aperture.worldRadius.toFixed(3);
      root.dataset.entranceAspect = aperture.aspect.toFixed(4);
      root.dataset.entranceDepth = aperture.depth.toFixed(3);
      root.dataset.exitRadius = exit.radius.toFixed(3);
      root.dataset.exitReveal = exit.reveal.toFixed(4);
      root.dataset.exitDepth = frame.exitDepth.toFixed(3);
      root.dataset.vortexTime = idleTime.toFixed(3);
      root.dataset.entranceRadius = aperture.outerRadius.toFixed(3);
      root.dataset.entranceCenter = [aperture.x, aperture.y].map(v => v.toFixed(3)).join(',');
      root.dataset.camera = [frame.x, frame.y, frame.z].map(v => v.toFixed(3)).join(',');
      root.style.opacity = '1'; root.style.background = 'transparent';
      page.dataset.introExitDepth = frame.exitDepth.toFixed(3);
      if (elapsed >= INTRO_ARRIVAL && elapsed !== lastPreview) {
        lastPreview = elapsed; page.dispatchEvent(new Event('virgo-intro-preview'));
      }
      page.dataset.openingFlight = started.current ? 'running' : 'idle';
      surfaces.forEach((patch, i) => {
        const el = captions.current?.children[i] as HTMLElement | undefined; if (!el) return;
        el.style.opacity = String(patch.opacity); el.dataset.lines = '1'; el.dataset.effect = INTRO_CAPTIONS[i].effect;
        el.dataset.projectedBounds = [patch.left, patch.top, patch.width, patch.height].map(v => v.toFixed(2)).join(',');
        el.dataset.readingDepths = patch.readingDepths.map(v => v.toFixed(2)).join(',');
        el.setAttribute('aria-hidden', String(patch.opacity < .1 || elapsed < 2.75));
      });
    };
    const resizeSurface = () => {
      if (document.hidden || root.clientWidth < 2 || root.clientHeight < 2) return;
      width = root.clientWidth; height = root.clientHeight;
      const dpr = density = currentDensity();
      const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
      if (surface.width !== pixelWidth || surface.height !== pixelHeight) { surface.width = pixelWidth; surface.height = pixelHeight; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingQuality = 'high';
      root.dataset.renderDpr = dpr.toFixed(3); render();
    };
    const resize = new ResizeObserver(resizeSurface); resize.observe(root);
    const visibility = () => { previous = performance.now(); if (!document.hidden) resizeSurface(); };
    document.addEventListener('visibilitychange', visibility);
    const tick = (now: number) => {
      const delta = Math.max(0, now - previous) / 1000; previous = now;
      if (!document.hidden) {
        cadence.sample(now, qualityRef.current.preference === 'auto' && !loaderActive && !reducedMotion);
        if (Math.abs(currentDensity() - density) > .001) resizeSurface();
        idleTime += Math.min(delta, .05);
        if (!loaderActive) assembly.current = Math.min(INTRO_ASSEMBLY_DURATION, assembly.current + Math.min(delta, .05));
        if (assembly.current >= INTRO_ASSEMBLY_DURATION) playback.current = advanceIntroScroll(playback.current.seconds, playback.current.velocity, target.current, delta);
      }
      render();
      if (playback.current.seconds >= INTRO_ARRIVAL && !arrived.current) { arrived.current = true; callbacks.current.onArrive(); }
      if (target.current >= INTRO_DURATION && playback.current.seconds >= INTRO_DURATION) { callbacks.current.onFinish(); return; }
      if (started.current && target.current === 0 && playback.current.seconds === 0) { started.current = false; arrived.current = false; callbacks.current.onReturn(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); disposed = true; resize.disconnect(); loader.disconnect();
      disposeIntroLiquid();
      document.removeEventListener('visibilitychange', visibility); delete page.dataset.openingFlight; delete page.dataset.introExitDepth;
    };
  }, [reducedMotion, pageRef, lang]);

  return <div ref={layer} className="virgo-intro-flight" data-surface="liquid-caustics-nebula" data-portal="quantum-violet-frontal" aria-label={lang === 'vie' ? 'Mở đầu hành trình vũ trụ' : 'Cosmic opening journey'} onClick={() => input.current(.35)}>
    <canvas ref={canvas} aria-hidden="true" />
    <div ref={captions} className="virgo-intro-captions" aria-live="off">
      {INTRO_CAPTIONS.map((caption, i) => <p key={i} data-z={caption.z} aria-hidden="true">{caption[lang]}</p>)}
    </div>
  </div>;
}
