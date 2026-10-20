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
        <g className="horizon-trees">{Array.from({length:35},(_,i)=>{
          const x=i*46-20,h=32+(Math.sin(i*4.7)+1)*28,y=330+Math.sin(i*.6)*24;
          return <path key={i} style={{'--tree-delay':`${-i*.7}s`,'--tree-duration':`${5+i%4}s`} as CSSProperties} d={`M${x} ${y}l14 -${h} 14 ${h}h-11v16h-6v-16Z`}/>;
        })}</g>
      </svg>
      <div className="contact-forest-walker">
        <svg className="contact-fox-art" viewBox="0 0 104 66">
          <ellipse className="fox-shadow" cx="53" cy="59" rx="34" ry="3"/>
          <g className="fox-body">
            <path className="fox-tail" fill="#d47a57" d="M40 32C25 27 19 9 4 15C6 34 19 46 40 42Z"/>
            <path className="fox-tail fox-tail-tip" fill="#ffe1bd" d="M4 15C9 13 14 14 18 18L15 28L11 25L10 30C7 26 5 20 4 15Z"/>
            <g className="fox-leg is-far"><path d="M40 37L46 38L42 53L47 55L46 58H37L36 54Z"/></g>
            <g className="fox-leg is-front is-far"><path d="M65 37L71 37L71 53L77 55L76 58H66L64 53Z"/></g>
            <ellipse cx="51" cy="35" rx="25" ry="12" fill="#e69a63"/>
            <path d="M33 38Q52 49 73 35Q64 49 43 46Z" fill="#ffe1bd"/>
            <g className="fox-leg"><path d="M35 37L42 38L44 53L50 55L49 58H39L36 53Z"/></g>
            <g className="fox-leg is-front"><path d="M64 37L71 37L69 53L75 55L74 58H64L62 53Z"/></g>
            <path d="M65 30L70 16L70 6L81 17L87 9L90 27L100 33L88 41L73 39Z" fill="#efac73"/>
            <path d="M72 12L73 22L78 18Z M86 15L82 23L88 26Z" fill="#754155"/>
            <path d="M85 28L100 33L88 40L79 35Z" fill="#ffedcf"/>
            <circle cx="85" cy="26" r="1.4" fill="#25223c"/>
            <path d="M96 31L101 33L97 36Z" fill="#25223c"/>
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
