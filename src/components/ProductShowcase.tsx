import { useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from 'react';
import { ArrowRight, ArrowUpRight, Download, Monitor, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ShowcaseSpace } from './ShowcaseSpace';
import { ShowcaseLiveFrame } from './ShowcaseLiveFrame';
import { showcaseProducts, type ShowcaseProduct } from '../data/productShowcase';
import { advanceShowcaseMotion, showcaseSkyStar, showcaseChapterTransition, type ShowcaseMotionMode } from '../data/virgoExperienceMotion';
import type { Language } from '../data/portfolio';
import './ProductShowcase.css';

const useBrowserLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

function ProductScreen({ product, lang, eager }: { product: ShowcaseProduct; lang: Language; eager: boolean }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(product.preview ? 'loading' : 'error');
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!product.preview) {
      setState('error');
      return;
    }
    const img = imageRef.current;
    if (img?.complete) {
      setState(img.naturalWidth > 0 ? 'ready' : 'error');
    } else {
      setState('loading');
    }
  }, [product.preview]);
  return (
    <div className="screening-tv" data-state={state} style={{ '--product-color': product.color } as CSSProperties}>
      <div className="screening-display">
        {state !== 'ready' && <div className="screening-media-status" role="status"><Monitor size={26} strokeWidth={1}/>
          <span>{state === 'loading' ? (lang === 'vie' ? 'Đang tải preview…' : 'Loading preview…') : (lang === 'vie' ? 'Preview chưa khả dụng' : 'Preview unavailable')}</span>
        </div>}
        {product.preview && state !== 'error' && (
          <img
            ref={imageRef}
            src={product.preview}
            alt={lang === 'vie' ? `Preview website ${product.name}` : `${product.name} website preview`}
            width="1280"
            height="720"
            loading={eager ? 'eager' : 'lazy'}
            draggable={false}
            // These three authentic captures include a 16px browser scrollbar.
            style={['sentinel', 'security', 'backup'].includes(product.id) ? { width: `${1280 / 1264 * 100}%` } : undefined}
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
          />
        )}
        <div className="screening-glare" aria-hidden="true" />
      </div>
    </div>
  );
}

type Props = {
  index: number | null; lang: Language; reducedMotion: boolean;
  onSelect: (id: string) => void; onClose?: () => void;
  onExit?: (direction: number) => void; embedded?: boolean; enabled?: boolean;
  coreArrival?: boolean;
};

export function ProductShowcase({ index, lang, reducedMotion, onSelect, onClose, onExit, embedded = false, enabled = true, coreArrival = false }: Props) {
  const vi = lang === 'vie', titleId = `${useId()}-product`;
  const [live, setLive] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const liveRef = useRef<HTMLDialogElement>(null);
  const rootRef = useRef<HTMLDivElement | HTMLDialogElement | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState<ShowcaseSpace | null>(null);
  const coreStarted = useRef(coreArrival);
  if (coreArrival) coreStarted.current = true;
  const arriving = useRef(coreArrival && !reducedMotion);
  useBrowserLayoutEffect(() => {
    if (!railRef.current) return;
    const next = new ShowcaseSpace(railRef.current, showcaseProducts.length, coreStarted.current && !reducedMotion);
    setSpace(next);
    return () => next.dispose();
  }, [index === null]);
  const cardsRef = useRef<HTMLElement[]>([]);
  const starsRef = useRef<SVGSVGElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [active, setActive] = useState(index ?? 0);
  const [kind, setKind] = useState(showcaseProducts[index ?? 0].kind);
  const leaving = useRef(false);
  const exitTimer = useRef(0);
  const activeRef = useRef(index ?? 0);
  const requested = useRef(index ?? 0);
  const reported = useRef<number | null>(null);
  const config = useRef({ onSelect, onClose, onExit, reducedMotion, enabled, kind, index });
  config.current = { onSelect, onClose, onExit, reducedMotion, enabled, kind, index };
  const motion = useRef({ x: 0, target: 0, velocity: 0, frame: 0, time: 0, step: 1, width: 1, min: 0, max: 0, lastInput: 0, mode: 'target' as ShowcaseMotionMode });
  const commitTimer = useRef(0);
  const suppressClick = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number; origin: number; axis: 'x' | 'y' | null; last: number; time: number; velocity: number; moved: boolean } | null>(null);
  const product = showcaseProducts[active] ?? showcaseProducts[0];
  const clamp = (value: number) => Math.max(motion.current.min, Math.min(motion.current.max, value));

  const exit = (direction: number) => {
    if (leaving.current) return;
    leaving.current = true;
    clearTimeout(commitTimer.current);
    cancelAnimationFrame(motion.current.frame);
    motion.current.frame = 0;
    const root = rootRef.current;
    root?.setAttribute('data-flow-direction', direction > 0 ? 'forward' : 'backward');
    root?.setAttribute('data-flow-phase', 'departing');
    root?.setAttribute('aria-busy', 'true');
    const complete = () => config.current.onExit?.(direction);
    if (config.current.reducedMotion) complete();
    else exitTimer.current = window.setTimeout(complete, 520);
  };

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  const commit = () => {
    if (leaving.current || !config.current.enabled) return;
    if (motion.current.frame || drag.current) { scheduleCommit(); return; }
    const selected = Math.max(0, Math.min(showcaseProducts.length - 1, Math.round(motion.current.x / motion.current.step)));
    if (config.current.index === selected) return;
    requested.current = selected;
    reported.current = selected;
    config.current.onSelect(showcaseProducts[selected].id);
  };

  const scheduleCommit = () => {
    clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(commit, 240);
  };

  const paint = () => {
    const state = motion.current;
    const slot = state.x / state.step;
    const sky = starsRef.current;
    if (sky) Array.from(sky.children).forEach((star, i) => {
      const projection = showcaseSkyStar(i, slot);
      star.setAttribute('visibility', projection.visible ? 'visible' : 'hidden');
      if (projection.visible) {
        star.setAttribute('cx', String(projection.x));
        star.setAttribute('cy', String(projection.y));
      }
    });
    const closest = Math.max(0, Math.min(showcaseProducts.length - 1, Math.round(slot)));
    const captionX = space?.render(slot, config.current.reducedMotion) ?? 0;
    rootRef.current?.style.setProperty('--caption-x', `${captionX}px`);
    if (closest !== activeRef.current) {
      activeRef.current = closest;
      setActive(closest);
      setKind(showcaseProducts[closest].kind);
    }
    rootRef.current?.style.setProperty('--chapter-transition', String(showcaseChapterTransition(slot, config.current.reducedMotion)));
    rootRef.current?.style.setProperty('--screen-focus', String(Math.max(.62, 1 - Math.abs(slot - closest) * .6)));
  };

  useBrowserLayoutEffect(() => {
    if (!space || !coreStarted.current) return;
    space.startArrival();
    arriving.current = !reducedMotion && !space.arrivalComplete;
    const root = rootRef.current;
    const content = root?.querySelector('.screening-content');
    content?.setAttribute('inert', '');
    root?.setAttribute('aria-busy', 'true');
    let frame = 0;
    const tick = () => {
      paint();
      if (space.arrivalComplete || reducedMotion) {
        arriving.current = false;
        content?.removeAttribute('inert');
        root?.removeAttribute('aria-busy');
        railRef.current?.focus({ preventScroll: true });
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); content?.removeAttribute('inert'); root?.removeAttribute('aria-busy'); };
  }, [space, reducedMotion, coreArrival]);

  const wake = () => {
    const state = motion.current;
    if (state.frame) return;
    state.time = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - state.time) / 1000, .04);
      state.time = now;
      const isWheeling = now - state.lastInput < 140;
      const isDragging = drag.current !== null;

      const next = advanceShowcaseMotion(state.x, state.target, state.velocity, dt, state.min, state.max, state.mode, config.current.reducedMotion);
      if (!isDragging) Object.assign(state, next);
      const settled = !isWheeling && !isDragging && next.settled;
      paint();
      window.dispatchEvent(new CustomEvent('journey-screen-motion', { detail: state.velocity / state.step }));
      state.frame = settled ? 0 : requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  };

  const move = (target: number, instant = false) => {
    const state = motion.current;
    state.target = clamp(target);
    state.mode = 'target';
    state.velocity = 0;
    if (instant || config.current.reducedMotion) {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.x = state.target;
      state.velocity = 0;
      paint();
    } else {
      wake();
    }
  };

  const choose = (destination: number) => {
    if (arriving.current) return;
    setHasInteracted(true);
    requested.current = Math.max(Math.round(motion.current.min / motion.current.step), Math.min(Math.round(motion.current.max / motion.current.step), destination));
    move(requested.current * motion.current.step);
    if (index === null) {
      commit();
      requestAnimationFrame(() => railRef.current?.focus());
    } else {
      scheduleCommit();
    }
  };

  useBrowserLayoutEffect(() => {
    const root = rootRef.current;
    if (!embedded && root instanceof HTMLDialogElement && !root.open) {
      root.showModal();
      railRef.current?.focus({ preventScroll: true });
    }
    let firstMeasure = true;
    const measure = () => {
      const rail = railRef.current;
      if (!rail) return;
      const state = motion.current;
      const slot = firstMeasure ? requested.current : state.x / state.step;
      const targetSlot = firstMeasure ? requested.current : state.target / state.step;
      firstMeasure = false;
      cardsRef.current = Array.from(rail.querySelectorAll<HTMLElement>('.screening-slide'));
      // CSS3D hides distant surfaces. offsetWidth of the first product then
      // becomes zero; measuring its computed CSS width keeps every chapter
      // on the same camera scale instead of jumping to a viewport fallback.
      state.width = cardsRef.current[0] ? parseFloat(getComputedStyle(cardsRef.current[0]).width) : rail.clientWidth * .75;
      const center = cardsRef.current[0]?.offsetTop || parseFloat(getComputedStyle(rail).getPropertyValue('--screen-center')) || rail.clientHeight * .4;
      // The fallback element resolves CSS calc()/viewport units for the camera.
      const centerProbe = document.createElement('div');
      centerProbe.style.cssText = 'position:absolute;top:var(--screen-center);height:0;pointer-events:none';
      rail.appendChild(centerProbe);
      space?.resize(state.width, centerProbe.offsetTop || center);
      centerProbe.remove();
      state.step = Math.max(220, state.width * .88);
      state.min = 0;
      state.max = (showcaseProducts.length - 1) * state.step;
      move(slot * state.step, true);
      if (Math.abs(targetSlot - slot) > .001) move(targetSlot * state.step);
    };
    measure();
    const resize = new ResizeObserver(measure);
    if (railRef.current) resize.observe(railRef.current);
    if (cardsRef.current[0]) resize.observe(cardsRef.current[0]);

    const wheel = (event: WheelEvent) => {
      if (arriving.current || leaving.current || !config.current.enabled || event.ctrlKey || root?.closest('[inert]') || index === null || drag.current) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      setHasInteracted(true);
      const state = motion.current;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? state.step : 1;
      const now = performance.now();
      const atEnd = delta > 0 ? (state.target >= state.max - 2 && state.x >= state.max - 6) : (state.target <= state.min + 2 && state.x <= state.min + 6);
      if (config.current.onExit && atEnd && Math.abs(state.x - state.target) < 3 && now - state.lastInput > 550) {
        state.lastInput = now;
        exit(delta > 0 ? 1 : -1);
        return;
      }
      state.lastInput = now;
      if (config.current.reducedMotion) {
        move(state.x + delta * unit * .72, true);
        scheduleCommit();
        return;
      }
      // Convert wheel delta into momentum for smooth horizontal glide
      const impulse = delta * unit * 0.72;
      state.velocity += impulse * 4;
      const velocityLimit = state.step * 5;
      state.velocity = Math.max(-velocityLimit, Math.min(velocityLimit, state.velocity));
      state.target = clamp(state.target + impulse * 0.85);
      state.mode = 'inertia';
      wake();
      scheduleCommit();
    };
    root?.addEventListener('wheel', wheel as EventListener, { passive: false });

    const hide = () => {
      if (!document.hidden) return;
      cancelAnimationFrame(motion.current.frame);
      motion.current.frame = 0;
      motion.current.x = motion.current.target;
      motion.current.velocity = 0;
      paint();
    };
    document.addEventListener('visibilitychange', hide);

    return () => {
      resize.disconnect();
      root?.removeEventListener('wheel', wheel as EventListener);
      document.removeEventListener('visibilitychange', hide);
      cancelAnimationFrame(motion.current.frame);
      motion.current.frame = 0;
      clearTimeout(commitTimer.current);
      if (!embedded && root instanceof HTMLDialogElement) root.close();
    };
  }, [embedded, index === null, space]);

  useEffect(() => {
    if (index === null) return;
    if (reported.current === index) { reported.current = null; return; }
    setKind(showcaseProducts[index].kind);
    requested.current = index;
    move(index * motion.current.step);
  }, [index]);

  useEffect(() => {
    leaving.current = !enabled;
    if (!enabled) {
      clearTimeout(commitTimer.current);
      cancelAnimationFrame(motion.current.frame);
      motion.current.frame = 0;
    }
  }, [enabled]);

  useEffect(() => { move(motion.current.target, reducedMotion); }, [reducedMotion]);

  // Stage 3D tilt tracking for mouse hover
  const onStagePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const stage = railRef.current;
    if (!stage || config.current.reducedMotion || e.pointerType !== 'mouse' || drag.current) return;
    const rect = stage.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    stage.style.setProperty('--mouse-tilt-y', `${(normX * 2.2).toFixed(2)}deg`);
    stage.style.setProperty('--mouse-tilt-x', `${(-normY * 1.6).toFixed(2)}deg`);
    stage.style.setProperty('--mouse-glare-x', `${((normX * 0.5 + 0.5) * 100).toFixed(1)}%`);
    stage.style.setProperty('--mouse-glare-y', `${((normY * 0.5 + 0.5) * 100).toFixed(1)}%`);
  };

  const onStagePointerLeave = () => {
    const stage = railRef.current;
    if (!stage) return;
    stage.style.setProperty('--mouse-tilt-y', '0deg');
    stage.style.setProperty('--mouse-tilt-x', '0deg');
    stage.style.setProperty('--mouse-glare-x', '50%');
    stage.style.setProperty('--mouse-glare-y', '50%');
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (arriving.current || leaving.current || !config.current.enabled || event.button !== 0 || (event.target as Element).closest('a,button')) return;
    clearTimeout(commitTimer.current);
    suppressClick.current = false;
    setHasInteracted(true);
    const state = motion.current;
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.velocity = 0;
    onStagePointerLeave();
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: state.x, axis: null, last: 0, time: performance.now(), velocity: 0, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Ignore */ }
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    onStagePointerMove(event);
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 5) gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (!gesture.axis) return;
    gesture.moved = true;
    event.preventDefault();
    const delta = gesture.axis === 'x' ? dx : dy;
    const now = performance.now();
    gesture.velocity = .6 * gesture.velocity + .4 * (gesture.last - delta) / Math.max(.008, (now - gesture.time) / 1000);
    gesture.last = delta;
    gesture.time = now;
    move(gesture.origin - delta, true);
    motion.current.lastInput = now;
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.id) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!gesture.moved) return;
    suppressClick.current = true;
    if (config.current.onExit && Math.abs(gesture.last) > 70 &&
      (gesture.origin >= motion.current.max - 6 && gesture.last < 0 || gesture.origin <= motion.current.min + 6 && gesture.last > 0)) {
      exit(gesture.last < 0 ? 1 : -1);
      return;
    }
    const velocity = event.type === 'pointerup' && performance.now() - gesture.time < 120 ? Math.max(-2400, Math.min(2400, gesture.velocity)) : 0;
    motion.current.velocity = reducedMotion ? 0 : velocity * 1.15;
    motion.current.mode = 'inertia';
    if (!reducedMotion) wake();
    scheduleCommit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (arriving.current || leaving.current) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const destination = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
      ? activeRef.current - 1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? activeRef.current + 1
      : event.key === 'Home'
      ? Math.round(motion.current.min / motion.current.step)
      : event.key === 'End'
      ? Math.round(motion.current.max / motion.current.step)
      : null;
    if (destination !== null) {
      event.preventDefault();
      event.stopPropagation();
      setHasInteracted(true);
      if (onExit && (destination * motion.current.step < motion.current.min || destination * motion.current.step > motion.current.max)) {
        exit(destination * motion.current.step < motion.current.min ? -1 : 1);
      } else {
        choose(destination);
      }
    }
  };

  useEffect(() => {
    const dialog = liveRef.current;
    if (live && dialog && !dialog.open) dialog.showModal();
    else if (!live && dialog?.open) dialog.close();
  }, [live]);

  useEffect(() => { setLive(false); }, [active, enabled]);

  // Current products for pagination dots
  const currentKindProducts = showcaseProducts
    .map((item, globalIndex) => ({ ...item, globalIndex }))
    .filter(item => item.kind === kind);

  const content = (
    <div className="screening-content" style={{ '--product-color': product.color } as CSSProperties}>
      <div className="screening-core-flash" aria-hidden="true" />
      <div className="screening-atmosphere" aria-hidden="true">
        <svg ref={starsRef} className="screening-stars" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 211 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 479 + i * i * 37) % 1600}
              cy={(i * 293 + i * i * 19) % 1000}
              r={i % 13 === 0 ? 1.6 : .6 + (i % 3) * .25}
              fill={i % 5 === 0 ? '#b3cef4' : '#e2e8ee'}
              opacity={.2 + (i % 7) * .065}
            />
          ))}
        </svg>
        <div className="screening-glass-floor">
          <div className="screening-floor-reflection" style={{ backgroundImage: product.preview ? `url(${product.preview})` : undefined }} />
        </div>
      </div>

      {!embedded && !onExit && (
        <button className="screening-close" autoFocus onClick={onClose} aria-label={vi ? 'Đóng' : 'Close'}>
          <X size={20} />
        </button>
      )}

      {index === null ? (
        <div className="screening-not-found">
          <Monitor size={30} />
          <h2 id={titleId}>{vi ? 'Màn hình này chưa có.' : 'This screen isn’t here.'}</h2>
          <button onClick={() => choose(0)}>
            {vi ? 'Xem sản phẩm' : 'See products'}<ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <>
          <nav className="screening-kinds" aria-label={vi ? 'Loại sản phẩm' : 'Product type'}>
            {(['website', 'download'] as const).map(type => (
              <button
                key={type}
                aria-pressed={kind === type}
                onClick={() => {
                  const first = showcaseProducts.findIndex(item => item.kind === type);
                  choose(first);
                }}
              >
                {type === 'website' ? vi ? 'Trải nghiệm web' : 'Web experiences' : vi ? 'Ứng dụng & công cụ' : 'Apps & tools'}
              </button>
            ))}
          </nav>

          <div className="screening-chapter-passage" aria-hidden="true" />
          <div className="screening-stage">
            <div
              ref={railRef}
              className="screening-rail"
              role="region"
              aria-roledescription="carousel"
              aria-label={vi ? 'Cuộn hoặc vuốt để xoay các màn hình sản phẩm' : 'Scroll or swipe to rotate product screens'}
              tabIndex={0}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
              onPointerLeave={onStagePointerLeave}
              onClickCapture={event => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
            >
              {showcaseProducts.map((item, i) => {
                const slide = (
                <article
                  className={`screening-slide${i === active ? ' is-active' : ''}`}
                  key={item.id}
                  data-product-id={item.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={item.name}
                  aria-hidden={i !== active}
                >
                  <ProductScreen product={item} lang={lang} eager={Math.abs(i - active) <= 1} />
                </article>
                );
                return space ? createPortal(slide, space.elements[i], item.id) : slide;
              })}
            </div>
          </div>

          <div className={`screening-hint-badge${hasInteracted ? ' is-hidden' : ''}`} aria-hidden="true">
            <span>{vi ? '← Kéo hoặc cuộn ngang để khám phá →' : '← Drag or scroll horizontally to explore →'}</span>
          </div>

          <section className="screening-info-panel" aria-labelledby={titleId}>
            <div className="screening-caption-stack">
              <span className="screening-category-tag" style={{ color: product.color }}>
                {product.category[lang]}
              </span>
              <h2 ref={titleRef} id={titleId} className="screening-title" aria-live="polite" aria-atomic="true">
                {product.name}
              </h2>
              <p className="screening-description">
                {product.description[lang]}
              </p>
            </div>

            <nav className="screening-pagination" aria-label={vi ? 'Danh sách sản phẩm' : 'Product items'}>
              {currentKindProducts.map(item => (
                <button
                  key={item.id}
                  aria-current={item.globalIndex === active ? 'true' : undefined}
                  aria-label={item.name}
                  className={`screening-dot${item.globalIndex === active ? ' is-active' : ''}`}
                  onClick={() => choose(item.globalIndex)}
                  style={{ '--product-color': item.color } as CSSProperties}
                >
                  <span className="screening-dot-pill" />
                  <span className="screening-dot-tooltip">{item.name}</span>
                </button>
              ))}
            </nav>

            <div className="screening-actions-row">
              <a className="screening-btn-primary" href={product.url} target="_blank" rel="noopener noreferrer">
                {product.kind === 'download' ? vi ? 'Khám phá ứng dụng' : 'Explore app' : vi ? 'Mở website' : 'Visit website'}
                {product.kind === 'download' ? <Download size={16} /> : <ArrowUpRight size={16} />}
              </a>
              {product.kind === 'website' && (
                <button className="screening-btn-secondary" onClick={() => setLive(true)}>
                  {vi ? 'Trải nghiệm trực tiếp' : 'Try it live'}
                  <Monitor size={15} />
                </button>
              )}
              {product.caseStudy && (
                <a className="screening-btn-secondary" href={`#/project/${product.caseStudy}`}>
                  {vi ? 'Câu chuyện' : 'Story'}
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          </section>
        </>
      )}

      <dialog
        ref={liveRef}
        className="screening-live"
        aria-label={vi ? `Trải nghiệm ${product.name}` : `Try ${product.name}`}
        onCancel={event => { event.stopPropagation(); setLive(false); }}
        onKeyDown={event => event.stopPropagation()}
      >
        {live && (
          <>
            <header>
              <span>{product.name}</span>
              <button onClick={() => setLive(false)} aria-label={vi ? 'Đóng trải nghiệm' : 'Close live preview'}>
                <X size={20} />
              </button>
            </header>
            <ShowcaseLiveFrame url={product.url} title={product.name} />
            <footer>
              <a href={product.url} target="_blank" rel="noopener noreferrer">
                {vi ? 'Mở toàn màn hình ở tab mới' : 'Open in a new tab'}
                <ArrowUpRight size={15} />
              </a>
            </footer>
          </>
        )}
      </dialog>
    </div>
  );

  if (embedded) {
    return (
      <div
        ref={node => { rootRef.current = node; }}
        className="screening-room is-embedded"
        role="region"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        data-reduced-motion={reducedMotion || undefined}
      >
        {content}
      </div>
    );
  }

  return (
    <dialog
      ref={node => { rootRef.current = node; }}
      className={`screening-room${coreStarted.current ? ' is-core-arrival' : ''}`}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onCancel={event => { event.preventDefault(); onClose?.(); }}
      data-reduced-motion={reducedMotion || undefined}
    >
      {content}
    </dialog>
  );
}
