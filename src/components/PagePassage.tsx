import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, ImageOff, Loader2 as LoaderCircle } from 'lucide-react';
import { SHOWCASE_HANDOFF, SHOWCASE_PASSAGE_DURATION, showcaseSlideFrame, showcaseArrivalFrame } from '../data/universeTransition';
import { showcaseProducts } from '../data/productShowcase';
import type { Language } from '../data/portfolio';
import './UniverseTransition.css';
import './ShowcaseArrival.css';

const arrivalProducts = showcaseProducts.filter(product=>product.preview).slice(0,3);

export function ShowcasePassage({ direction = 1, initialTime, lang = 'eng', onComplete, onHandoff, onReverse }: {
  lang?: Language;
  direction?: 1 | -1; initialTime?: number; onComplete: () => void; onHandoff: () => void; onReverse: (progress: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [previews,setPreviews] = useState<Record<string,'ready'|'error'>>({});
  const vi=lang==='vie', ready=Object.values(previews).filter(state=>state==='ready').length;
  const pending=Object.keys(previews).length<arrivalProducts.length;
  useEffect(() => {
    const node = root.current, page = node?.closest<HTMLElement>('.virgo-page');
    if (!node || !page) return;
    let raf = 0, last = performance.now(), progress = initialTime ?? (direction > 0 ? 0 : 1), handed = false, touchY = 0;
    page.dataset.pagePassage = String(direction);
    const apply = () => {
      const frame = showcaseSlideFrame(progress);
      const arrival = showcaseArrivalFrame(progress);
      node.dataset.progress = progress.toFixed(4); node.dataset.phase = 'page-slide'; node.dataset.direction = String(direction);
      node.style.setProperty('--arrival-opacity',String(arrival.opacity));
      node.style.setProperty('--arrival-open',String(arrival.open));
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
  return <div ref={root} className="page-passage">
    <section className="showcase-arrival" aria-label={vi?'Chuyển vào không gian dự án':'Entering the project showcase'}>
      <div className="showcase-arrival-copy"><h2>{direction>0?(vi?'Đang mở không gian dự án':'Opening the showcase'):(vi?'Trở về hành trình':'Back to the journey')}</h2><p>{vi?'Trò chơi, ứng dụng web và công cụ hệ thống.':'Games, web apps and system tools.'}</p></div>
      <div className="arrival-previews" aria-label={vi?'Bản xem trước dự án':'Project previews'}>
        {arrivalProducts.map((product,index)=><article key={product.id} className="arrival-preview" data-state={previews[product.id]??'loading'} style={{'--preview-side':index===0?0:index===1?-1:1,'--preview-depth':index===0?0:1,zIndex:index===0?2:1} as CSSProperties}>
          <div className="arrival-preview-chrome"><span className="arrival-window-dots" aria-hidden="true"><i/><i/><i/></span><span>{new URL(product.url).hostname}</span></div>
          <div className="arrival-preview-image"><span>{new URL(product.url).hostname}</span><img src={product.preview} alt="" onLoad={()=>setPreviews(current=>({...current,[product.id]:'ready'}))} onError={()=>setPreviews(current=>({...current,[product.id]:'error'}))}/></div>
          <footer><strong>{product.name}</strong><span>{previews[product.id]==='ready'?<Check size={13} aria-label={vi?'Preview đã sẵn sàng':'Preview ready'}/>:previews[product.id]==='error'?(vi?'Chưa có preview':'Preview unavailable'):<LoaderCircle size={13} aria-label={vi?'Đang tải preview':'Loading preview'}/>}</span></footer>
        </article>)}
      </div>
      <p className="showcase-arrival-status" role="status" aria-atomic="true">{pending?<LoaderCircle size={14}/>:ready===arrivalProducts.length?<Check size={14}/>:<ImageOff size={14}/>}<span>{pending?(vi?'Đang chuẩn bị bản xem trước…':'Preparing project previews…'):(ready===arrivalProducts.length?(vi?`${ready} bản xem trước đã sẵn sàng`:`${ready} previews ready`):(vi?`${ready}/${arrivalProducts.length} bản xem trước khả dụng`:`${ready}/${arrivalProducts.length} previews available`))}</span></p>
    </section>
  </div>;
}
