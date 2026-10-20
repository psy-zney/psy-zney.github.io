import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { showcaseProducts } from '../data/productShowcase';
import type { Language } from '../data/portfolio';
import { ProductShowcase } from './ProductShowcase';
import './WorldsShowcase.css';
import { CosmicPortalField } from './CosmicPortalField';
import { ContactLanding } from './ContactLanding';
import { clampWorldIndex, worldDragDirection, WORLD_FIELD_FOCAL } from '../data/worldsConstellation';
import { playPortfolioSfx } from '../utils/portfolioAudio';

export { SingularityPassage as SingularityDust } from './WormholeSurface';

/** One intentional gesture selects one destination; momentum cannot skip worlds. */
export function WorldsShowcase({ index, lang, reducedMotion, onSelect, onClose, inside, onInsideChange }: {
  index: number | null; lang: Language; reducedMotion: boolean;
  onSelect: (id: string) => void; onClose: () => void;
  inside: boolean; onInsideChange: (inside: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; dx: number; dy: number; active: boolean } | null>(null);
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
  const state = useRef({ selected, onSelect });
  state.current = { selected, onSelect };
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
    const node = root.current;
    if (gesture && node?.hasPointerCapture(gesture.id)) node.releasePointerCapture(gesture.id);
    if (node) { delete node.dataset.dragging; node.style.removeProperty('--showcase-drag-x'); }
    if (!gesture?.active) return;
    suppressClickUntil.current = performance.now() + 350;
    const direction = worldDragDirection(gesture.dx, gesture.dy);
    if (!cancelled && direction) select(selected + direction);
  };
  useEffect(() => { drag.current = null; root.current?.style.removeProperty('--showcase-drag-x'); if (root.current) delete root.current.dataset.dragging; }, [index, inside]);
  if (inside || index === null) return <ProductShowcase index={index} lang={lang} reducedMotion={reducedMotion}
    onSelect={onSelect} onClose={() => index === null ? onClose() : onInsideChange(false)} />;
  return <div ref={root} className={`worlds-showcase${reducedMotion ? ' is-reduced' : ''}${diving ? ' is-diving' : ''}`} role="region" aria-label={vi ? 'Các thế giới sản phẩm' : 'Product worlds'} tabIndex={-1}
    style={{ '--world-color': product.color, '--world-focal': `${WORLD_FIELD_FOCAL}px` } as CSSProperties}
    onPointerDown={event => {
      if (diving || event.button !== 0 || !event.isPrimary) return;
      const target = event.target as Element;
      if (!target.closest('.worlds-stage')) return;
      if (target.closest('a,input,textarea,select') || target.closest('button') && !target.closest('.worlds-gate')) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, active: false };
    }}
    onPointerMove={event => {
      const gesture = drag.current;
      if (gesture && event.pointerId === gesture.id) {
        gesture.dx = event.clientX - gesture.x; gesture.dy = event.clientY - gesture.y;
        if (!gesture.active && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15) {
          gesture.active = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragging = 'true';
        }
        if (gesture.active) {
          event.preventDefault();
          event.currentTarget.style.setProperty('--showcase-drag-x', `${Math.max(-100, Math.min(100, gesture.dx * .22))}px`);
        }
      }
      if (event.pointerType !== 'mouse' || reducedMotion) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty('--glass-x', `${(event.clientX - bounds.left) / bounds.width * 100}%`);
      event.currentTarget.style.setProperty('--glass-y', `${(event.clientY - bounds.top) / bounds.height * 100}%`);
    }}
    onPointerUp={() => finishDrag()}
    onPointerCancel={() => finishDrag(true)}
    onLostPointerCapture={() => finishDrag(true)}
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
    <div className="worlds-stage">
    <CosmicPortalField host={root} reduced={reducedMotion} entering={diving} selected={selected} linear/>
    
    <header className="worlds-header"><button aria-label={vi ? 'Về Virgo' : 'Back to Virgo'} title={vi ? 'Về Virgo' : 'Back to Virgo'} onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => { playPortfolioSfx('click'); onClose(); }}><ArrowLeft size={20} aria-hidden="true"/></button><span>ZNEY / OTHER WORLDS</span></header>
    <div className="worlds-track" aria-label={vi ? 'Chọn thế giới' : 'Choose a world'} aria-roledescription="carousel" style={{'--world-index':selected} as CSSProperties}>
      {showcaseProducts.map((product,i)=>{
        const active=i===selected;
        return <article key={product.id} className="worlds-slide" aria-hidden={!active} {...(!active?{inert:''}:{})} style={{'--world-color':product.color} as CSSProperties}>
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
    <section className="worlds-caption" aria-live={active ? "polite" : "off"} aria-atomic="true">
      <div className="worlds-meta-row"><p className="worlds-category">{product.category[lang]}</p></div>
      <h2>{product.name}</h2><p>{product.description[lang]}</p>
      {product.stack && <p className="worlds-stack">{product.stack}</p>}
      <div className="worlds-actions"><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={enter}>{vi ? 'Đi vào thế giới' : 'Enter world'}</button><a onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => playPortfolioSfx('click')} href={product.url} target="_blank" rel="noreferrer">{vi ? 'Mở website' : 'Open website'}<ArrowUpRight size={16}/></a>{product.caseStudy && <a onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => playPortfolioSfx('click')} href={`#/project/${product.caseStudy}`}>Case study</a>}</div>
    </section>
    </div>
        </article>;
      })}
    </div>
    <footer className="worlds-footer"><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => select(selected - 1)} disabled={selected === 0} aria-label={vi ? 'Thế giới trước' : 'Previous world'}><ArrowLeft/></button><div><span>{String(selected + 1).padStart(2, '0')} / 09</span><p>{vi ? 'Cuộn / kéo ngang · Enter khám phá' : 'Scroll / drag · Enter to explore'}</p></div><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => select(selected + 1)} disabled={selected === showcaseProducts.length - 1} aria-label={vi ? 'Thế giới tiếp' : 'Next world'}><ArrowRight/></button></footer>
    <a className="worlds-image-credit" href="https://cloud.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">{vi ? 'Texture thiên thể' : 'Celestial textures'}: Solar System Scope · CC BY 4.0</a>
    <button className="worlds-contact-hint" onClick={() => {
      playPortfolioSfx('click');
      const node=root.current,contact=node?.querySelector<HTMLElement>('.contact-landing');
      if(node&&contact)node.scrollTo({top:contact.offsetTop,behavior:reducedMotion?'auto':'smooth'});
    }}>{vi?'Đi tới liên hệ':'Let’s connect'} ↓</button>
    </div>
    <ContactLanding lang={lang}/>
  </div>;
}
