import { useEffect, useRef, useState } from 'react';
import type { Language } from '../data/portfolio';
import type { QualityPreference } from './workspace/useQualityTier';
import './QualityGauge.css';

const choices=['low','auto','high'] as const;
const colors={low:'#58aaff',auto:'#f5f7ff',high:'#ff5964'};
const angles={low:-80,auto:0,high:80};
const point=(radius:number,degrees:number)=>{
  const a=degrees*Math.PI/180;return `${72+Math.cos(a)*radius},${70+Math.sin(a)*radius}`;
};
function segment(start:number,end:number,inner:number) {
  return `M${point(58,start)} A58,58 0 0 1 ${point(58,end)} L${point(inner,end)} A${inner},${inner} 0 0 0 ${point(inner,start)} Z`;
}

/** Three direct SVG choices, with native radiogroup keyboard behavior. */
export function QualityGauge({value,onChange,lang}:{value:QualityPreference;onChange:(value:QualityPreference)=>void;lang:Language}) {
  const selected=value==='medium'?'auto':value;
  const refs=useRef<Array<SVGGElement|null>>([]);
  const previous=useRef(value),[feedback,setFeedback]=useState(false);
  useEffect(()=>{
    if(previous.current===value)return;
    previous.current=value;setFeedback(true);
    const timer=window.setTimeout(()=>setFeedback(false),1600);
    return()=>window.clearTimeout(timer);
  },[value]);
  // The public control has three modes; retain medium as an internal/legacy OS tier.
  useEffect(()=>{if(value==='medium')onChange('auto');},[value,onChange]);
  const description=lang==='vie'?{low:'Nhẹ hơn',auto:'Tự cân bằng',high:'Nét hơn'}[selected]:
    {low:'Less GPU use',auto:'Adapts to performance',high:'Sharper'}[selected];
  return <div className="virgo-quality-gauge" data-lenis-prevent data-quality={selected} data-feedback={feedback}>
    <svg viewBox="0 0 144 116" role="radiogroup" aria-label={lang==='vie'?'Độ nét hình ảnh':'Image quality'}
      onKeyDown={event=>{
        const current=choices.indexOf(selected);
        const next=event.key==='Home'?0:event.key==='End'?2:
          ['ArrowRight','ArrowUp'].includes(event.key)?(current+1)%3:
          ['ArrowLeft','ArrowDown'].includes(event.key)?(current+2)%3:-1;
        if(next<0)return;
        event.preventDefault();event.stopPropagation();onChange(choices[next]);refs.current[next]?.focus();
      }}>
      {choices.map((choice,i)=>{
        const start=135+i*90,end=start+90;
        const label=lang==='vie'?{low:'Thấp',auto:'Tự động',high:'Cao'}[choice]:{low:'Low',auto:'Auto',high:'High'}[choice];
        return <g key={choice} ref={node=>{refs.current[i]=node;}} className="quality-choice" role="radio"
          aria-label={label} aria-checked={selected===choice} tabIndex={selected===choice?0:-1}
          data-quality={choice} style={{color:colors[choice]}}
          onClick={()=>onChange(choice)} onKeyDown={event=>{
            if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();onChange(choice);}
          }}>
          <title>{label}</title>
          <path className="quality-hit" d={`M72,70 L${point(104,start)} A104,104 0 0 1 ${point(104,end)} Z`}/>
          <path className="quality-segment" d={segment(start+4,end-4,39)}/>
        </g>;
      })}
      <g className="quality-needle" aria-hidden="true" style={{transform:`rotate(${angles[selected]}deg)`,color:colors[selected]}}>
        <path d="M67 72 Q66 67 69 62 L71 28 Q72 22 74 28 L78 65 Q81 73 75 76 Q70 79 67 72Z"/>
        <circle cx="72" cy="70" r="6"/>
      </g>
      <text className="quality-state" x="72" y="108" textAnchor="middle" fill={colors[selected]} aria-hidden="true">
        {selected==='auto'?'Auto':selected==='high'?'High':'Low'}
      </text>
    </svg>
    <span className="quality-feedback" role="status" style={{color:colors[selected]}}>
      {selected==='auto'?'Auto':selected==='high'?'High':'Low'} · {description}
    </span>
  </div>;
}
