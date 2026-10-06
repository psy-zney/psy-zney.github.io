import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent } from 'react';
import { Move } from 'lucide-react';
import type { MoveInput } from './workspaceNavigation';

export function MovementPad({ drive, onActive }: { drive: MutableRefObject<MoveInput>; onActive: (active: boolean) => void }) {
  const element = useRef<HTMLDivElement>(null), pointer = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const stop = () => {
    if (pointer.current !== null && element.current?.hasPointerCapture(pointer.current)) element.current.releasePointerCapture(pointer.current);
    pointer.current = null; drive.current = { x: 0, y: 0 }; onActive(false); setThumb({ x: 0, y: 0 });
  };
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop(); };
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', hidden);
    return () => { drive.current = { x: 0, y: 0 }; onActive(false); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', hidden); };
  }, [drive,onActive]);
  const update = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width/2, y = event.clientY - rect.top - rect.height/2;
    const scale = Math.max(1, Math.hypot(x,y)/34), dx = x/scale, dy = y/scale;
    setThumb({ x: dx, y: dy }); drive.current = Math.hypot(dx,dy)<5 ? { x:0,y:0 } : { x:dx/34,y:-dy/34 };
    onActive(Math.hypot(drive.current.x,drive.current.y)>.01);
  };
  return <div className="room-move-control"><div ref={element} className="room-move-pad" aria-label="Drag to move through the room" onPointerDown={event => {
    if (pointer.current !== null) return;
    pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event);
  }} onPointerMove={update} onPointerUp={event => { if (pointer.current === event.pointerId) stop(); }} onPointerCancel={stop} onLostPointerCapture={stop}>
    <span className="room-move-axis" aria-hidden="true">＋</span><span className="room-move-thumb" style={{ transform: `translate(${thumb.x}px,${thumb.y}px)` }}><Move size={20}/></span>
  </div><span>Move</span></div>;
}
