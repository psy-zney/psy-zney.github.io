import { useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ChevronDown } from 'lucide-react';

/** Hover reveals on a pointer; touch and keyboard use the same explicit disclosure. */
export function JourneyStationCard({ title, detailLabel, nextLabel, onContinue, overview, children }: {
  title: string; detailLabel: string; nextLabel: string; onContinue: () => void; overview?: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pinned=useRef(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const details = <div ref={detailsRef} className="journey-station-body" hidden={!open} data-lenis-prevent>{children}</div>;
  return <div className={`journey-station-card${overview ? ' has-overview' : ''}${open ? ' is-open' : ''}`}
    onPointerEnter={event => { if(event.pointerType==='mouse'&&matchMedia('(hover:hover)').matches)setOpen(true); }}
    onPointerLeave={event => { if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches&&!pinned.current&&!event.currentTarget.contains(document.activeElement))setOpen(false); }}>
    {overview && <div className="journey-station-content" data-lenis-prevent>{overview}{details}</div>}
    <div className="journey-station-actions">
      <button className="journey-detail-toggle" aria-expanded={open} aria-label={detailLabel} onClick={() => {
        pinned.current=!pinned.current;setOpen(pinned.current);
        if(overview&&pinned.current)requestAnimationFrame(()=>detailsRef.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}));
      }}>{title}<ChevronDown size={16}/></button>
      <button className="journey-continue" onClick={()=>{pinned.current=false;setOpen(false);onContinue();}}>{nextLabel}<ArrowDown size={16}/></button>
    </div>
    {!overview && details}
  </div>;
}
