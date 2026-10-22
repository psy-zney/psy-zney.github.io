import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { animate, motion, useMotionValue, useTransform, type MotionStyle, type Variants } from 'motion/react';
import { showcaseProducts } from '../data/productShowcase';
import type { Language } from '../data/portfolio';
import { ProductShowcase } from './ProductShowcase';
import './WorldsShowcase.css';
import { CosmicPortalField } from './CosmicPortalField';
import { ContactLanding } from './ContactLanding';
import { clampWorldIndex, worldDragDirection, worldDragOffset, WORLD_FIELD_FOCAL } from '../data/worldsConstellation';
import { playPortfolioSfx } from '../utils/portfolioAudio';

export { SingularityPassage as SingularityDust } from './WormholeSurface';

const railSpring = { type: 'spring', stiffness: 210, damping: 32, mass: 1, restDelta: .00005, restSpeed: .0005 } as const;
const captionMotion: Variants = {
  shown: { opacity: 1, transition: { duration: .24, delayChildren: .08, staggerChildren: .045 } },
  hidden: { opacity: 0, transition: { duration: .12 } },
};
const copyMotion: Variants = {
  shown: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 30 } },
  hidden: { opacity: 0, y: 12, transition: { duration: .12 } },
};
const stillCaption: Variants = { shown: { opacity: 1, transition: { duration: 0 } }, hidden: { opacity: 0, transition: { duration: 0 } } };
const stillCopy: Variants = { shown: { opacity: 1, y: 0, transition: { duration: 0 } }, hidden: { opacity: 0, y: 0, transition: { duration: 0 } } };

/** One intentional gesture selects one destination; momentum cannot skip worlds. */
export function WorldsShowcase({ index, lang, reducedMotion, onSelect, onClose, inside, onInsideChange }: {
  index: number | null; lang: Language; reducedMotion: boolean;
  onSelect: (id: string) => void; onClose: () => void;
  inside: boolean; onInsideChange: (inside: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Normalized slides keep their position when the viewport changes size.
  const railPosition = useMotionValue(-(index ?? 0));
  const handOffset = useMotionValue(0);
  const railTransform = useTransform([railPosition, handOffset], ([position, offset]: number[]) => `translate3d(calc(${position * 100}% + ${offset}px),0,0)`);
  const releaseVelocity = useRef<number | undefined>(undefined);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; dy: number; active: boolean; velocity: number; sampledAt: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const [diving, setDiving] = useState(false);
  const enter = () => {
    if (diving) return;
    playPortfolioSfx('singularityEnter');
    reducedMotion ? onInsideChange(true) : setDiving(true);
  };
  useEffect(() => {
    if (!diving) return;
    const timer = window.setTimeout(() => { setDiving(false); onInsideChange(true); }, 680);
    return () => clearTimeout(timer);
  }, [diving, onInsideChange]);
  const selected = index ?? 0, product = showcaseProducts[selected];
  const textMotion = reducedMotion ? stillCopy : copyMotion;
  useEffect(() => {
    const node=root.current;
    if(!node||inside)return;
    const slide=node.querySelector<HTMLElement>(`.worlds-slide[data-project-id="${product.id}"]`);
    if(!slide)return;
    const measure=()=>node.style.setProperty('--world-reader-height',`${Math.ceil(slide.getBoundingClientRect().height)}px`);
    const observer=new ResizeObserver(measure);observer.observe(slide);measure();
    return()=>{observer.disconnect();node.style.removeProperty('--world-reader-height');};
  },[selected,inside,product.id]);
  useEffect(() => {
    if (reducedMotion || inside) { railPosition.jump(-selected); return; }
    const velocity = releaseVelocity.current;
    releaseVelocity.current = undefined;
    const playback = animate(railPosition, -selected, { ...railSpring, ...(velocity === undefined ? {} : { velocity }) });
    return () => playback.stop();
  }, [selected, inside, diving, reducedMotion, railPosition]);
  // Absorb the live hand offset before releasing it, so no frame snaps back.
  const absorbDrag = (node: HTMLDivElement) => {
    const offset = handOffset.get();
    if (offset && node.clientWidth) { railPosition.stop(); railPosition.set(railPosition.get() + offset / node.clientWidth); }
    handOffset.set(0);
    node.style.removeProperty('--showcase-drag-x');
  };
  const state = useRef({ selected, onSelect, onClose });
  state.current = { selected, onSelect, onClose };
  const vi = lang === 'vie';
  const select = (next: number) => {
    const target = clampWorldIndex(next);
    if (target === selected) return;
    playPortfolioSfx('cardSlide');
    onSelect(showcaseProducts[target].id);
  };
  useEffect(() => {
    if (inside || diving) return;
    const node = root.current;
    node?.focus({ preventScroll: true });
    let last = -Infinity, amount = 0, consumed = false, direction = 0;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || !(event.target instanceof Element) || !event.target.closest('.worlds-stage')) return;
      const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
      // A narrow layout reads vertically; horizontal gestures select projects.
      if(vertical&&node&&node.clientWidth<1000)return;
      // Once the visitor is reading below the stage, keep native vertical scrolling.
      if (vertical && node!.scrollTop > 2) return;
      if (drag.current?.active) return;
      const delta = (vertical ? event.deltaY : event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (vertical ? node!.clientHeight : node!.clientWidth) : 1);
      if (!delta) return;
      const now = performance.now(), sign = Math.sign(delta);
      if (now - last > 180 || sign !== direction) { amount = 0; consumed = false; }
      last = now; direction = sign;
      // A fresh downward gesture after 9/9 belongs to the Contact section.
      // Keep the burst that selected 9/9 consumed, so momentum cannot skip it.
      if (vertical && sign > 0 && state.current.selected === showcaseProducts.length - 1 && !consumed) return;
      event.preventDefault(); event.stopPropagation();
      amount += delta;
      if (!consumed && Math.abs(amount) >= 45) {
        consumed = true;
        if (vertical && sign < 0 && state.current.selected === 0) {
          state.current.onClose();
          return;
        }
        const next = clampWorldIndex(state.current.selected + sign);
        if (next === state.current.selected) return;
        playPortfolioSfx('cardSlide');
        state.current.onSelect(showcaseProducts[next].id);
      }
    };
    node?.addEventListener('wheel', wheel, { passive: false });
    return () => node?.removeEventListener('wheel', wheel);
  }, [inside, diving]);
  const finishDrag = (cancelled = false) => {
    const gesture = drag.current; drag.current = null;
    if (!gesture) return;
    const node = root.current;
    if (gesture && node?.hasPointerCapture(gesture.id)) node.releasePointerCapture(gesture.id);
    if (node) { delete node.dataset.dragging; absorbDrag(node); }
    if (!gesture?.active) return;
    suppressClickUntil.current = performance.now() + 350;
    const recentVelocity = performance.now() - gesture.sampledAt < 80 ? gesture.velocity : 0;
    const direction = worldDragDirection(gesture.dx, gesture.dy, recentVelocity);
    const target = cancelled ? selected : clampWorldIndex(selected + direction);
    if (target !== selected) {
      const velocity = Math.max(-2, Math.min(2, recentVelocity * 1000 / (node?.clientWidth || 1)));
      releaseVelocity.current = Math.sign(velocity) === Math.sign(-target - railPosition.get()) ? velocity : 0;
      select(target);
    } else if (reducedMotion) railPosition.jump(-selected);
    else animate(railPosition, -selected, railSpring);
  };
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let raf = 0, last = 0, x = 18, y = 8, targetX = 18, targetY = 8;
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)');
    const draw = (now: number) => {
      const blend = 1 - Math.exp(-Math.min(.05, (now - last) / 1000) * 12); last = now;
      x += (targetX - x) * blend; y += (targetY - y) * blend;
      const settled = Math.abs(targetX - x) + Math.abs(targetY - y) < .05;
      if (settled) { x = targetX; y = targetY; }
      node.style.setProperty('--glass-x', `${x.toFixed(2)}%`);
      node.style.setProperty('--glass-y', `${y.toFixed(2)}%`);
      raf = settled ? 0 : requestAnimationFrame(draw);
    };
    const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(draw); } };
    const reset = () => { targetX = 18; targetY = 8; if (!reducedMotion && !document.hidden) wake(); };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion || !fine.matches || document.hidden) return;
      const bounds = node.getBoundingClientRect();
      targetX = (event.clientX - bounds.left) / bounds.width * 100;
      targetY = (event.clientY - bounds.top) / bounds.height * 100;
      wake();
    };
    const cancel = () => {
      const gesture = drag.current; drag.current = null;
      if (gesture?.active) suppressClickUntil.current = performance.now() + 350;
      delete node.dataset.dragging;
      if (gesture?.active) {
        absorbDrag(node);
        if (document.hidden || reducedMotion) railPosition.jump(-selected);
        else animate(railPosition, -selected, railSpring);
      } else { handOffset.set(0); node.style.removeProperty('--showcase-drag-x'); }
      if (gesture && node.hasPointerCapture(gesture.id)) node.releasePointerCapture(gesture.id);
      cancelAnimationFrame(raf); raf = 0; x = targetX = 18; y = targetY = 8;
      node.style.removeProperty('--glass-x'); node.style.removeProperty('--glass-y');
    };
    cancel();
    const visibility = () => { if (document.hidden) cancel(); };
    node.addEventListener('pointermove', move, { passive: true }); node.addEventListener('pointerleave', reset);
    node.addEventListener('scroll', cancel, { passive: true }); window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility); fine.addEventListener('change', cancel);
    return () => {
      cancel(); node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', reset);
      node.removeEventListener('scroll', cancel); window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility); fine.removeEventListener('change', cancel);
      railPosition.stop();
    };
  }, [index, inside, diving, reducedMotion]);
  if (inside || index === null) return <ProductShowcase index={index} lang={lang} reducedMotion={reducedMotion}
    onSelect={onSelect} onClose={() => index === null ? onClose() : onInsideChange(false)} />;
  return <div ref={root} className={`worlds-showcase${reducedMotion ? ' is-reduced' : ''}${diving ? ' is-diving' : ''}`} role="region" aria-label={vi ? 'Các thế giới sản phẩm' : 'Product worlds'} tabIndex={-1}
    style={{ '--world-color': product.color, '--world-focal': `${WORLD_FIELD_FOCAL}px` } as CSSProperties}
    onPointerDown={event => {
      if (diving || event.button !== 0 || !event.isPrimary) return;
      const target = event.target as Element;
      if (!target.closest('.worlds-stage')) return;
      if (target.closest('a,input,textarea,select') || target.closest('button') && !target.closest('.worlds-gate')) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, active: false, velocity: 0, sampledAt: performance.now() };
    }}
    onPointerMove={event => {
      const gesture = drag.current;
      if (gesture && event.pointerId === gesture.id) {
        const now = performance.now(), dx = event.clientX - gesture.x;
        const dt = Math.max(8, Math.min(80, now - gesture.sampledAt));
        gesture.velocity += ((dx - gesture.dx) / dt - gesture.velocity) * (1 - Math.exp(-dt * .03));
        gesture.sampledAt = now;
        gesture.dx = event.clientX - gesture.x; gesture.dy = event.clientY - gesture.y;
        if (!gesture.active && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15) {
          railPosition.stop();
          gesture.active = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragging = 'true';
        }
        if (gesture.active) {
          event.preventDefault();
          const offset = reducedMotion ? 0 : worldDragOffset(gesture.dx, event.currentTarget.clientWidth, selected);
          handOffset.set(offset);
          event.currentTarget.style.setProperty('--showcase-drag-x', `${offset}px`);
        }
      }
    }}
    onPointerUp={event => { if (event.pointerId === drag.current?.id) finishDrag(); }}
    onPointerCancel={event => { if (event.pointerId === drag.current?.id) finishDrag(true); }}
    onLostPointerCapture={event => { if (event.target === event.currentTarget && event.pointerId === drag.current?.id) finishDrag(true); }}
    onClickCapture={event => {
      const target = event.target as Element;
      if (performance.now() < suppressClickUntil.current && (!target.closest('a,button') || target.closest('.worlds-gate'))) { event.preventDefault(); event.stopPropagation(); }
    }}
    onKeyDown={event => {
      if (diving) { if (event.key === 'Escape') { event.preventDefault(); setDiving(false); } return; }
      if ((event.target as HTMLElement).closest('button,a')) return;
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', 'Escape'].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowRight') select(selected + 1);
      if (event.key === 'ArrowLeft') select(selected - 1);
      if (event.key === 'Home') select(0);
      if (event.key === 'End') select(8);
      if (event.key === 'Enter') enter();
      if (event.key === 'Escape') onClose();
    }}>
    <motion.div className="worlds-stage" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: diving ? 0 : 1 }}
      transition={{ duration: reducedMotion ? 0 : diving ? .42 : .3, delay: diving ? .25 : 0 }}>
    <CosmicPortalField host={root} reduced={reducedMotion} entering={diving} selected={selected} linear/>
    
    <header className="worlds-header"><button aria-label={vi ? 'Về Virgo' : 'Back to Virgo'} title={vi ? 'Về Virgo' : 'Back to Virgo'} onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => { playPortfolioSfx('click'); onClose(); }}><ArrowLeft size={20} aria-hidden="true"/></button><span><span className="worlds-desktop-label">ZNEY / OTHER WORLDS</span><span className="worlds-mobile-label">{vi ? 'Dự án của Khánh' : 'Projects by Khánh'}</span></span></header>
    <div className="worlds-rail-viewport">
    <motion.div className="worlds-track" aria-label={vi ? 'Chọn thế giới' : 'Choose a world'} aria-roledescription="carousel" style={{ transform: railTransform, '--world-index':selected } as MotionStyle}>
      {showcaseProducts.map((product,i)=>{
        const active=i===selected;
        return <article key={product.id} data-project-id={product.id} className="worlds-slide" aria-hidden={!active} {...(!active?{inert:''}:{})} style={{'--world-color':product.color} as CSSProperties}>
          <div className="worlds-orbits">
            <button className={`worlds-gate is-featured${active?' is-selected':''}`} aria-label={`${vi?'Khám phá':'Explore'} ${product.name}`} aria-current={active?'true':undefined} tabIndex={active?0:-1} data-world-index={i}
              style={{'--accent':product.color} as CSSProperties} onMouseEnter={()=>playPortfolioSfx('hover')} onClick={()=>{if(active){playPortfolioSfx('click');enter();}}}>
              <span className="worlds-window"><span className="worlds-unpictured">{new URL(product.url).hostname}<ArrowUpRight/></span>{product.preview&&<img src={product.preview} alt="" draggable={false} onError={event=>{event.currentTarget.style.visibility='hidden';}}/>}</span>
            </button>
          </div>
    <div className="worlds-preview-notes" key={product.id}>
      <span>{(product.scope ?? product.category)[lang]}</span>
      <span>{new URL(product.url).hostname}</span>
    </div>
    <div className="worlds-details">
    <div className="worlds-heading"><p>{vi ? 'Chín sản phẩm để khám phá' : 'Nine worlds to discover'}</p><h1>{vi ? 'Phía bên kia chân trời.' : 'Beyond the horizon.'}</h1></div>
    <motion.section className="worlds-caption" initial={false} animate={active ? 'shown' : 'hidden'} variants={reducedMotion ? stillCaption : captionMotion} aria-live={active ? "polite" : "off"} aria-atomic="true">
      <motion.div className="worlds-meta-row" variants={textMotion}><p className="worlds-category">{product.category[lang]}</p></motion.div>
      <motion.h2 variants={textMotion}>{product.name}</motion.h2><motion.p variants={textMotion}>{product.description[lang]}</motion.p>
      {product.stack && <motion.p className="worlds-stack" variants={textMotion}>{product.stack}</motion.p>}
      <motion.div className="worlds-actions" variants={textMotion}><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={enter}>{vi ? 'Đi vào thế giới' : 'Enter world'}</button><a onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => playPortfolioSfx('click')} href={product.url} target="_blank" rel="noreferrer">{vi ? 'Mở website' : 'Open website'}<ArrowUpRight size={16}/></a>{product.caseStudy && <a onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => playPortfolioSfx('click')} href={`#/project/${product.caseStudy}`}>Case study</a>}</motion.div>
    </motion.section>
    </div>
        </article>;
      })}
    </motion.div>
    </div>
    <footer className="worlds-footer"><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => select(selected - 1)} disabled={selected === 0} aria-label={vi ? 'Thế giới trước' : 'Previous world'}><ArrowLeft/></button><div><span>{String(selected + 1).padStart(2, '0')} / 09</span><p><span className="worlds-desktop-label">{vi ? 'Cuộn / kéo ngang · Enter khám phá' : 'Scroll / drag · Enter to explore'}</span><span className="worlds-mobile-label">{vi ? 'Vuốt ngang để đổi dự án' : 'Swipe to change project'}</span></p></div><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => select(selected + 1)} disabled={selected === showcaseProducts.length - 1} aria-label={vi ? 'Thế giới tiếp' : 'Next world'}><ArrowRight/></button></footer>
    <a className="worlds-image-credit" href="https://cloud.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">{vi ? 'Texture thiên thể' : 'Celestial textures'}: Solar System Scope · CC BY 4.0</a>
    <button className="worlds-contact-hint" onClick={() => {
      playPortfolioSfx('click');
      const node=root.current,contact=node?.querySelector<HTMLElement>('.contact-landing');
      if(node&&contact)node.scrollTo({top:contact.offsetTop,behavior:reducedMotion?'auto':'smooth'});
    }}>{vi?'Đi tới liên hệ':'Let’s connect'} ↓</button>
    </motion.div>
    <ContactLanding lang={lang}/>
  </div>;
}
