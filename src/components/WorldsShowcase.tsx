import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { showcaseProducts } from '../data/productShowcase';
import type { Language } from '../data/portfolio';
import { ProductShowcase } from './ProductShowcase';
import './WorldsShowcase.css';
import { CosmicPortalField } from './CosmicPortalField';
import { worldPortalPose, WORLD_FIELD_FOCAL } from '../data/worldsConstellation';
import { playPortfolioSfx } from '../utils/portfolioAudio';

export { SingularityPassage as SingularityDust } from './WormholeSurface';

/** One intentional gesture selects one destination; momentum cannot skip worlds. */
export function WorldsShowcase({ index, lang, reducedMotion, onSelect, onClose, inside, onInsideChange }: {
  index: number | null; lang: Language; reducedMotion: boolean;
  onSelect: (id: string) => void; onClose: () => void;
  inside: boolean; onInsideChange: (inside: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
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
  const state = useRef({ selected, onSelect, onClose });
  state.current = { selected, onSelect, onClose };
  const vi = lang === 'vie';
  const select = (next: number) => {
    const target = Math.max(0, Math.min(showcaseProducts.length - 1, next));
    if (target !== selected) playPortfolioSfx('cardSlide');
    onSelect(showcaseProducts[target].id);
  };
  useEffect(() => {
    if (inside || diving) return;
    const node = root.current;
    node?.focus({ preventScroll: true });
    let last = -Infinity, amount = 0, consumed = false, direction = 0;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault(); event.stopPropagation();
      const delta = (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node!.clientHeight : 1);
      if (!delta) return;
      const now = performance.now(), sign = Math.sign(delta);
      if (now - last > 180 || sign !== direction) { amount = 0; consumed = false; }
      last = now; direction = sign; amount += delta;
      if (!consumed && Math.abs(amount) >= 45) {
        consumed = true;
        if (state.current.selected === 0 && sign < 0) { state.current.onClose(); return; }
        const next = Math.max(0, Math.min(8, state.current.selected + sign));
        state.current.onSelect(showcaseProducts[next].id);
      }
    };
    node?.addEventListener('wheel', wheel, { passive: false });
    return () => node?.removeEventListener('wheel', wheel);
  }, [inside, diving]);
  const touch = useRef<number | null>(null);
  if (inside || index === null) return <ProductShowcase index={index} lang={lang} reducedMotion={reducedMotion}
    onSelect={onSelect} onClose={() => index === null ? onClose() : onInsideChange(false)} />;
  return <div ref={root} className={`worlds-showcase${reducedMotion ? ' is-reduced' : ''}${diving ? ' is-diving' : ''}`} role="region" aria-label={vi ? 'Các thế giới sản phẩm' : 'Product worlds'} tabIndex={-1}
    style={{ '--world-color': product.color, '--world-focal': `${WORLD_FIELD_FOCAL}px` } as CSSProperties}
    onTouchStart={event => { touch.current = event.touches[0]?.clientY ?? null; }}
    onTouchEnd={event => { if (touch.current !== null && !diving) { const delta = touch.current - event.changedTouches[0].clientY; if (delta < -45 && selected === 0) onClose(); else if (Math.abs(delta) > 45) select(selected + Math.sign(delta)); } touch.current = null; }}
    onTouchCancel={() => { touch.current = null; }}
    onKeyDown={event => {
      if (diving) { if (event.key === 'Escape') { event.preventDefault(); setDiving(false); } return; }
      if ((event.target as HTMLElement).closest('button,a')) return;
      if (['ArrowDown', 'ArrowRight', 'PageDown', 'ArrowUp', 'ArrowLeft', 'PageUp', 'Home', 'End', 'Enter', 'Escape'].includes(event.key)) event.preventDefault();
      if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) select(selected + 1);
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) select(selected - 1);
      if (event.key === 'Home') select(0);
      if (event.key === 'End') select(8);
      if (event.key === 'Enter') enter();
      if (event.key === 'Escape') onClose();
    }}>
    <CosmicPortalField host={root} reduced={reducedMotion} entering={diving} selected={selected}/>
    
    <header className="worlds-header"><span>ZNEY / OTHER WORLDS</span><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => { playPortfolioSfx('click'); onClose(); }}><X size={16}/>{vi ? 'Về Virgo' : 'Back to Virgo'}</button></header>
    <div className="worlds-heading"><p>{vi ? 'BỘ SƯU TẬP / 09 THẾ GIỚI' : 'SELECTED WORK / 09 WORLDS'}</p><h1>{vi ? 'Phía bên kia chân trời.' : 'Beyond the horizon.'}</h1></div>
    <div className="worlds-orbits" aria-label={vi ? 'Chọn thế giới' : 'Choose a world'}>
      {showcaseProducts.map((item, i) => {
        const pose=worldPortalPose(i,selected),active=i===selected;
        return <button key={item.id} className={`worlds-gate${active ? ' is-selected' : ''}`} aria-label={`${vi ? 'Khám phá' : 'Explore'} ${item.name}`} aria-current={active ? 'true' : undefined}
          tabIndex={0} aria-hidden={false} data-world-index={i}
          style={{ '--world-x':pose.x,'--world-y':pose.y,'--world-z':`${pose.z}px`,
            '--world-pitch':`${pose.pitch}deg`,'--world-yaw':`${pose.yaw}deg`,'--world-roll':`${pose.roll}deg`,
            '--world-opacity':pose.opacity,'--accent': item.color } as CSSProperties}
          onMouseEnter={() => playPortfolioSfx('hover')}
          onClick={() => { playPortfolioSfx('click'); if (active) enter(); else select(i); }}>
          <span className="worlds-window"><span className="worlds-unpictured">{new URL(item.url).hostname}<ArrowUpRight/></span>{item.preview && <img src={item.preview} alt="" draggable={false} onError={event => { event.currentTarget.style.visibility = 'hidden'; }}/>}</span>
          <span className="worlds-gate-label">{String(i + 1).padStart(2, '0')} / {item.name}</span>
        </button>;
      })}
    </div>
    <section className="worlds-caption" aria-live="polite" aria-atomic="true">
      <div className="worlds-meta-row"><p className="worlds-category">{product.category[lang]}</p><span className="worlds-coordinate" aria-hidden="true">FIELD {String(selected + 1).padStart(2, '0')} / 09 · FOCUS 1.00</span></div>
      <h2>{product.name}</h2><p>{product.description[lang]}</p>
      <div className="worlds-actions"><button onMouseEnter={() => playPortfolioSfx('hover')} onClick={enter}>{vi ? 'Đi vào thế giới' : 'Enter world'}<ArrowRight size={17}/></button><a onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => playPortfolioSfx('click')} href={product.url} target="_blank" rel="noreferrer">{vi ? 'Mở website' : 'Open website'}<ArrowUpRight size={16}/></a>{product.caseStudy && <a onMouseEnter={() => playPortfolioSfx('hover')} onClick={() => playPortfolioSfx('click')} href={`#/project/${product.caseStudy}`}>Case study</a>}</div>
    </section>
    <footer className="worlds-footer"><button onMouseEnter={() => playPortfolioSfx('hover')} disabled={selected === 0} onClick={() => select(selected - 1)} aria-label={vi ? 'Thế giới trước' : 'Previous world'}><ArrowLeft/></button><div><span>{String(selected + 1).padStart(2, '0')} / 09</span><p>{vi ? 'Cuộn để chọn · Enter để khám phá' : 'Scroll to choose · Enter to explore'}</p></div><button onMouseEnter={() => playPortfolioSfx('hover')} disabled={selected === 8} onClick={() => select(selected + 1)} aria-label={vi ? 'Thế giới tiếp' : 'Next world'}><ArrowRight/></button></footer>
  </div>;
}
