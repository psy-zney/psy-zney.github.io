import { ArrowUpRight, Github, Linkedin, Mail } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import type { Language } from '../data/portfolio';
import { personalProfile } from '../data/personalProfile';
import { playPortfolioSfx } from '../utils/portfolioAudio';
import './ContactLanding.css';

/** An original horizon illustration carries the universe into the last section. */
export function ContactLanding({ lang }: { lang: Language }) {
  const vi=lang==='vie';
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{
    const node=root.current;if(!node)return;
    let visible=false;
    const sync=()=>{node.dataset.awake=String(visible&&!document.hidden);};
    const observer=new IntersectionObserver(([entry])=>{
      visible=entry.isIntersecting&&entry.intersectionRatio>0;sync();
      if(!visible)node.dataset.revealed='false';
      else if(entry.intersectionRatio>=.18)node.dataset.revealed='true';
    },{threshold:[0,.18]});
    observer.observe(node);document.addEventListener('visibilitychange',sync);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);};
  },[]);
  return <section ref={root} className="contact-landing" data-revealed="false" aria-labelledby="contact-landing-title" onFocusCapture={()=>{
    // Keyboard navigation never lands on an invisible link before the scroll reveal.
    if(root.current)root.current.dataset.revealed='true';
  }}>
    <div className="contact-horizon" aria-hidden="true">
      <div className="contact-aurora"><i/><i/><i/></div>
      <span className="contact-shooting-star"/><span className="contact-shooting-star is-second"/>
      <div className="contact-fireflies">{Array.from({length:16},(_,i)=><i key={i} style={{'--spark-x':`${(i*37+11)%100}%`,'--spark-y':`${48+(i*17)%45}%`,'--spark-delay':`${-i*1.3}s`,'--spark-color':i%2?'#f6abff':'#73f4e0'} as CSSProperties}/>)}</div>
      <span className="contact-moon"/>
      <svg viewBox="0 0 1440 460" preserveAspectRatio="none">
        <path className="horizon-far" d="M0 220 Q160 145 300 200 T610 175 T960 195 T1440 155 V460 H0Z"/>
        <path className="horizon-near" d="M0 315 Q220 230 410 295 T850 280 T1440 260 V460 H0Z"/>
        <g className="horizon-trees"><g className="horizon-tree-track">{[0,1].map(copy=><g key={copy} transform={`translate(${copy*1472} 0)`}>{Array.from({length:32},(_,i)=>{
          const x=i*46-20,h=32+(Math.sin(i*4.7)+1)*28,y=330+Math.sin(i*.6)*24;
          return <path key={i} style={{'--tree-delay':`${-i*.7}s`,'--tree-duration':`${5+i%4}s`} as CSSProperties} d={`M${x} ${y}l14 -${h} 14 ${h}h-11v16h-6v-16Z`}/>;
        })}</g>)}</g></g>
      </svg>
      <div className="contact-forest-walker">
        <svg className="contact-cat-art" viewBox="0 0 104 66">
          <ellipse className="cat-shadow" cx="53" cy="59" rx="34" ry="3"/>
          <g className="cat-body">
            <path className="cat-tail" d="M33 36C16 34 18 21 12 15C5 8 2 15 7 20" fill="none" stroke="#e69a63" strokeWidth="7" strokeLinecap="round"/>
            <g className="cat-leg is-far"><path d="M40 37L46 38L42 53L47 55L46 58H37L36 54Z"/></g>
            <g className="cat-leg is-front is-far"><path d="M65 37L71 37L71 53L77 55L76 58H66L64 53Z"/></g>
            <ellipse cx="51" cy="36" rx="25" ry="11" fill="#e69a63"/>
            <path d="M34 40Q51 48 71 38Q63 49 43 46Z" fill="#ffe1bd"/>
            <path d="M43 26L46 34M52 25L55 33M61 27L64 34" fill="none" stroke="#b56845" strokeWidth="3" strokeLinecap="round"/>
            <g className="cat-leg"><path d="M35 37L42 38L44 53L50 55L49 58H39L36 53Z"/></g>
            <g className="cat-leg is-front"><path d="M64 37L71 37L69 53L75 55L74 58H64L62 53Z"/></g>
            <path d="M68 26L68 11L79 19L87 12L91 28Z" fill="#e69a63"/>
            <path d="M71 16L72 24L77 21Z M86 17L81 23L88 25Z" fill="#e8a0a1"/>
            <ellipse cx="80" cy="30" rx="13" ry="12" fill="#efac73"/>
            <path d="M75 19L77 25M81 18L82 24" stroke="#b56845" strokeWidth="2" strokeLinecap="round"/>
            <ellipse cx="86" cy="35" rx="8" ry="5" fill="#ffedcf"/>
            <ellipse cx="85" cy="28" rx="1.5" ry="2" fill="#25223c"/>
            <path d="M91 32L95 33L92 36Z" fill="#9b5769"/>
            <path d="M88 35L99 31M88 37L100 38M89 36L100 35" fill="none" stroke="#ffe1bd" strokeWidth=".9" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
    </div>
    <div className="contact-landing-content">
      <p className="contact-eyebrow">{vi?'TRẠM TIẾP THEO / CÙNG XÂY DỰNG':'NEXT DESTINATION / LET’S BUILD'}</p>
      <h2 id="contact-landing-title">{vi?'Một ý tưởng mới.':'A new idea.'}<br/><em>{vi?'Một lời chào.':'A simple hello.'}</em></h2>
      <p className="contact-invitation">{personalProfile.invitation[lang]}</p>
      <a className="contact-mail" href={`mailto:${personalProfile.email}`} onMouseEnter={()=>playPortfolioSfx('hover')} onClick={()=>playPortfolioSfx('click')}><Mail size={18}/>{personalProfile.email}<ArrowUpRight size={20}/></a>
      <nav aria-label={vi?'Kết nối với Khánh':'Connect with Khánh'}>
        <a href={personalProfile.github} target="_blank" rel="noreferrer" onClick={()=>playPortfolioSfx('click')}><Github size={16}/>GitHub<ArrowUpRight size={14}/></a>
        <a href={personalProfile.linkedin} target="_blank" rel="noreferrer" onClick={()=>playPortfolioSfx('click')}><Linkedin size={16}/>LinkedIn<ArrowUpRight size={14}/></a>
        <a href="#/cv/web" onClick={()=>playPortfolioSfx('click')}>{vi?'Đọc CV':'Read CV'}<ArrowUpRight size={14}/></a>
      </nav>
      <footer><span>{personalProfile.name} / {personalProfile.alias}</span><a href="#/cosmos">{vi?'Trở lại vũ trụ':'Back to the universe'} ↑</a></footer>
    </div>
  </section>;
}
