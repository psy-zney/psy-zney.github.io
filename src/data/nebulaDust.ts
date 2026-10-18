import { singularitySeed } from './singularityMotion';

/** Absolute-time helical dust. Previous samples form curved motion trails. */
export function nebulaDustParticle(index: number, seconds: number) {
  const seed=singularitySeed(index+401),layer=index%3;
  const raw=seed-seconds*(.19+layer*.022),depth=raw-Math.floor(raw);
  const radius=.65/(.35+depth*5.5);
  const angle=index*2.399963+Math.log(radius+.012)*1.35+seconds*.20;
  return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,depth,
    opacity:Math.sin(depth*Math.PI)**1.4/(1+layer*.45),
    size:(.35+singularitySeed(index+71)*.9)/(1+layer*.35)};
}
