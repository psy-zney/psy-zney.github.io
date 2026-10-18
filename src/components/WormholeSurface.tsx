import { useEffect, useRef } from 'react';
import { addAfterEffect } from '@react-three/fiber';
import { singularitySample, SINGULARITY_DURATION, SINGULARITY_ORBIT_END, SINGULARITY_THROAT_END } from '../data/singularityMotion';
import { SingularityLens } from './SingularityLens';
import { nebulaDustParticle } from '../data/nebulaDust';
const random = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Perspective throat: projected rings shrink with depth, never a flat photo border. */
export function paintThroat(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, time: number, color: string, travel = 0) {
  ctx.save(); ctx.translate(x, y);
  const darkness = ctx.createRadialGradient(0, 0, radius * .1, 0, 0, radius);
  darkness.addColorStop(0, '#010208'); darkness.addColorStop(.58, '#070c19'); darkness.addColorStop(1, '#05060d00');
  ctx.fillStyle = darkness; ctx.fillRect(-radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
  ctx.globalCompositeOperation = 'screen';
  for (let layer = 109; layer >= 0; layer--) {
    const z = ((layer + time * 3 + travel * 100) % 110) / 110;
    const scale = 1 / (1 + z * 6.5), r = radius * scale;
    const centerX = Math.sin(z * 2.5) * radius * .18;
    const centerY = -z * radius * .12;
    ctx.beginPath();
    for (let j = 0; j <= 180; j++) {
      const a = j / 180 * Math.PI * 2;
      const fold = 1 + .055 * Math.sin(a * 3 + z * 12 - time * .3) + .018 * Math.sin(a * 11 - z * 19 + time * .7);
      const px = centerX + Math.cos(a) * r * fold, py = centerY + Math.sin(a) * r * fold;
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color; ctx.globalAlpha = (.025 + .10 * (1 - z)) * (.4 + random(layer) * .6);
    ctx.lineWidth = (1 - z) * radius * .028 + .8;
    ctx.shadowBlur = 0; ctx.stroke();
  }
  for (let i = 0; i < 210; i++) {
    const a = i * 2.39996 + time * .035;
    const z = (random(i + 27) + time * .08 + travel) % 1;
    const r = radius / (1 + z * 6.5);
    ctx.globalAlpha = .15 + .55 * (1 - z);
    ctx.fillStyle = i % 4 ? color : '#f4f3ff';
    ctx.beginPath(); ctx.arc(Math.cos(a) * r + Math.sin(z * 2.5) * radius * .18, Math.sin(a) * r - z * radius * .12, .4 + (1 - z) * .8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = .25; ctx.strokeStyle = '#e8e4ff'; ctx.lineWidth = 1.3;
  ctx.shadowBlur = 16; ctx.shadowColor = color;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function WormholeSurface({ color, reduced }: { color: string; reduced: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current, ctx = node?.getContext('2d'); if (!node || !ctx) return;
    let raf = 0, time = 0, last = performance.now(), painted = -Infinity;
    const draw = (now: number) => {
      const dt = Math.min(.04, (now - last) / 1000); last = now;
      if (!document.hidden && !reduced) time += dt;
      if (!document.hidden && now - painted >= 1000 / 24) {
        painted = now;
        const width = node.clientWidth, height = node.clientHeight, dpr = Math.min(devicePixelRatio, 2);
        if (node.width !== Math.round(width * dpr) || node.height !== Math.round(height * dpr)) { node.width = Math.round(width * dpr); node.height = Math.round(height * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
        paintThroat(ctx, width / 2, height / 2, Math.min(width, height) * .43, time, color);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [color, reduced]);
  return <canvas className="wormhole-surface" ref={canvas} aria-hidden="true"/>;
}

/** A continuous cinematic handoff: accretion, throat crossing, white-hole ejection. */
export function SingularityPassage({ onComplete, onHandoff, onReverse, direction = 1, initialTime }: { onComplete: () => void; onHandoff: () => void; onReverse: (time: number) => void; direction?: 1 | -1; initialTime?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current, ctx = node?.getContext('2d'); if (!node || !ctx) return;
    let raf = 0, elapsed = direction < 0 && initialTime !== undefined ? SINGULARITY_DURATION - initialTime : 0, last = performance.now(), handed = false;
    const snapshot = document.createElement('canvas'), copy = snapshot.getContext('2d');
    let lens: SingularityLens | null = null;
    try { lens = new SingularityLens(snapshot); } catch { /* Keep the original scene if WebGL recovery is needed. */ }
    let captured = false;
    // Copy the current scene after WebGL has drawn, before its drawing buffer clears.
    const stopCapture = addAfterEffect(() => {
      const scene = document.querySelector<HTMLCanvasElement>('.virgo-canvas canvas');
      if (!scene || !copy || document.hidden) return;
      const width = Math.min(1440, scene.width), height = Math.round(width * scene.height / scene.width);
      if (snapshot.width !== width || snapshot.height !== height) { snapshot.width = width; snapshot.height = height; }
      copy.drawImage(scene, 0, 0, width, height); captured = true;
    });
    const draw = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      elapsed += dt;
      const sample = singularitySample(elapsed, direction), time = sample.t;
      const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio, 2), unit = Math.min(w, h);
      if (node.width !== Math.round(w * dpr) || node.height !== Math.round(h * dpr)) { node.width = Math.round(w * dpr); node.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      node.dataset.phase = sample.phase;
      node.dataset.seconds = time.toFixed(3); node.dataset.direction = String(direction);
      node.dataset.lens = sample.lens.toFixed(3);
      node.dataset.sceneCaptured = String(captured);
      const page = node.closest<HTMLElement>('.virgo-page');
      if (page) page.dataset.singularityTime = String(time);
      if (page && direction < 0) page.dataset.singularityReturn = String(sample.returnDepth);
      if (sample.handoff && !handed) { handed = true; onHandoff(); }
      if (time < SINGULARITY_ORBIT_END) {
        // Keep the ray-traced disk as the sole material layer during approach.
        if (captured && sample.lens > 0) lens?.draw(ctx,w,h,sample.lens);
        // The live observer enters darkness; no detached circle masks the disk.
        const crossing=Math.max(0,Math.min(1,(time-2.45)/.75));
        if(crossing>0){ctx.fillStyle=`rgba(1,2,4,${crossing*crossing*(3-2*crossing)})`;ctx.fillRect(0,0,w,h);}
      } else if (time < SINGULARITY_THROAT_END) {
        const p = (time - SINGULARITY_ORBIT_END) / (SINGULARITY_THROAT_END-SINGULARITY_ORBIT_END);
        if(lens){if(p>.65)lens.drawExit(ctx,w,h,p-1,time);else lens.drawTunnel(ctx,w,h,p,time);}
        else {ctx.fillStyle='#03040b';ctx.fillRect(0,0,w,h);paintThroat(ctx,w/2,h/2,unit*(.65+p*.55),time,'#9caedc',p*2);}
        // Near/far dust follows the wall's helical flow, sampled backwards for trails.
        ctx.save();ctx.globalCompositeOperation='screen';
        for(let i=0;i<140;i++){
          const star=nebulaDustParticle(i,time),fade=Math.min(1,p/.12)*Math.max(0,Math.min(1,(.65-p)/.18));
          const cx=w/2+Math.sin(p*Math.PI)*.035*h,cy=h/2-Math.sin(p*Math.PI*2)*.018*h;
          ctx.globalAlpha=star.opacity*fade*(i%17===0?.30:.18);
          ctx.strokeStyle=i%19===0?'#e8e6e0':'#bbc5cf';ctx.lineWidth=star.size;
          ctx.beginPath();
          for(let j=0;j<=5;j++){
            const point=nebulaDustParticle(i,time-j/5*(i%17===0?.025:.009));
            // Do not bridge the depth wrap between a disappearing and a new particle.
            if(Math.abs(point.depth-star.depth)>.2)break;
            if(j===0)ctx.moveTo(cx+point.x*h,cy+point.y*h);else ctx.lineTo(cx+point.x*h,cy+point.y*h);
          }ctx.stroke();
          ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(cx+star.x*h-star.size/2,cy+star.y*h-star.size/2,star.size,star.size);
        }ctx.restore();
      } else {
        const p = Math.min(1, (time - SINGULARITY_THROAT_END) / (SINGULARITY_DURATION-SINGULARITY_THROAT_END));
        if(lens)lens.drawExit(ctx,w,h,p,time);
        else {ctx.fillStyle=`rgba(4,7,12,${(1-p)**3})`;ctx.fillRect(0,0,w,h);}

      }
      if (elapsed >= SINGULARITY_DURATION) { if (page) {delete page.dataset.singularityReturn;delete page.dataset.singularityTime;} onComplete(); return; }
      raf = requestAnimationFrame(draw);
    };
    const reverse = (event: KeyboardEvent | WheelEvent) => {
      if (event instanceof KeyboardEvent && !['Escape','ArrowUp','PageUp'].includes(event.key) || event instanceof WheelEvent && (event.ctrlKey || event.deltaY >= -15)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      // Run the same timeline backwards, keeping the already rendered point continuous.
      if (direction > 0) onReverse(singularitySample(elapsed, direction).t);
    };
    // Keyboard and wheel reversal is handled by the owning passage state.
    node.addEventListener('wheel', reverse, {passive:false}); window.addEventListener('keydown', reverse, true);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); stopCapture(); lens?.dispose(); const page=node.closest<HTMLElement>('.virgo-page');page?.removeAttribute('data-singularity-return');page?.removeAttribute('data-singularity-time'); node.removeEventListener('wheel', reverse); window.removeEventListener('keydown', reverse, true); };
  }, [onComplete, onHandoff, onReverse, direction, initialTime]);
  return <canvas className="singularity-dust singularity-passage" ref={canvas} aria-label="Accretion, wormhole passage and white-hole exit"/>;
}
