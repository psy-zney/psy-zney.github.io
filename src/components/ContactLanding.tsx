import { ArrowUpRight, Check, Copy, FileText, Github, Linkedin, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Language } from '../data/portfolio';
import { personalProfile } from '../data/personalProfile';
import { playPortfolioSfx } from '../utils/portfolioAudio';
import { MagnetLink } from './reactbits/PointerEffects';
import './ContactLanding.css';

export function ContactLanding({ lang }: { lang: Language }) {
  const vi=lang==='vie',root=useRef<HTMLElement>(null),timer=useRef(0);
  const [copyState,setCopyState]=useState<'idle'|'copied'|'error'>('idle');
  useEffect(()=>{
    const node=root.current;if(!node)return;
    const observer=new IntersectionObserver(([entry])=>{
      node.dataset.awake=String(entry.isIntersecting&&!document.hidden);
      if(entry.isIntersecting)node.dataset.revealed='true';
    },{threshold:.12});
    const visibility=()=>{node.dataset.awake=String(!document.hidden&&node.getBoundingClientRect().top<innerHeight&&node.getBoundingClientRect().bottom>0);};
    observer.observe(node);document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();clearTimeout(timer.current);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const copy=async()=>{
    playPortfolioSfx('click');
    try{await navigator.clipboard.writeText(personalProfile.email);setCopyState('copied');}catch{setCopyState('error');}
    clearTimeout(timer.current);timer.current=window.setTimeout(()=>setCopyState('idle'),3000);
  };
  return <section ref={root} className="contact-landing" data-revealed="false" aria-labelledby="contact-landing-title" onFocusCapture={()=>{if(root.current)root.current.dataset.revealed='true';}}>
    <div className="contact-signal" aria-hidden="true"><svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"><ellipse cx="730" cy="330" rx="300" ry="180"/><ellipse cx="730" cy="330" rx="410" ry="255"/><path d="M0 610 Q460 610 730 330 T1100 120"/><circle cx="730" cy="330" r="5"/><circle cx="454" cy="400" r="3"/><circle cx="940" cy="160" r="3"/></svg></div>
    <div className="contact-landing-content">
      <header className="contact-section-bar"><span>{vi?'Liên hệ':'Contact'}</span><span>{personalProfile.location[lang]}</span></header>
      <div className="contact-layout">
        <div className="contact-introduction">
          <h2 id="contact-landing-title">{vi?'Cùng xây điều hữu ích.':'Let’s build something useful.'}</h2>
          <p className="contact-invitation">{vi?'Bạn đang làm một sản phẩm, cần trao đổi về dự án hoặc muốn tìm hiểu cách mình làm việc? Gửi mình một lời nhắn.':'Working on a product, discussing a project, or curious about how I work? Send me a note.'}</p>
          <p className="contact-focus">{personalProfile.role[lang]}</p>
          <div className="contact-email-row">
            <MagnetLink className="contact-mail" href={`mailto:${personalProfile.email}`} onMouseEnter={()=>playPortfolioSfx('hover')} onClick={()=>playPortfolioSfx('click')}><Mail size={20}/><span>{personalProfile.email}</span><ArrowUpRight size={19}/></MagnetLink>
            <button className="contact-copy" onClick={copy} aria-label={vi?'Sao chép email':'Copy email'} title={vi?'Sao chép email':'Copy email'}>{copyState==='copied'?<Check size={18}/>:<Copy size={18}/>}</button>
          </div>
          <p className="contact-copy-status" role="status">{copyState==='copied'?(vi?'Đã sao chép địa chỉ email.':'Email address copied.'):copyState==='error'?(vi?'Bạn có thể chọn và sao chép địa chỉ ở trên.':'Select the email address above to copy it.'):(vi?'Email mở trong ứng dụng thư của bạn.':'Email opens in your mail app.')}</p>
        </div>
        <nav className="contact-channels" aria-label={vi?'Kết nối với Khánh':'Connect with Khánh'}>
          {[
            {href:personalProfile.github,title:'GitHub',description:vi?'Mã nguồn và cách mình triển khai dự án.':'Source code and the way I build projects.',icon:Github},
            {href:personalProfile.linkedin,title:'LinkedIn',description:vi?'Hồ sơ và kết nối nghề nghiệp.':'Professional profile and conversation.',icon:Linkedin},
            {href:'#/cv/web',title:vi?'Đọc CV':'Read CV',description:vi?'Học vấn, đóng góp và kinh nghiệm dự án.':'Education, contributions and project experience.',icon:FileText},
          ].map(({href,title,description,icon:Icon})=><a key={href} href={href} {...(href.startsWith('https')?{target:'_blank',rel:'noopener noreferrer'}:{})} onMouseEnter={()=>playPortfolioSfx('hover')} onClick={()=>playPortfolioSfx('click')}><Icon size={21}/><span><strong>{title}</strong><small>{description}</small></span><ArrowUpRight size={18}/></a>)}
        </nav>
      </div>
      <aside className="contact-brief" aria-label={vi?'Bắt đầu trao đổi':'A place to start'}><h3>{vi?'Một lời nhắn có thể bắt đầu từ…':'A good place to start…'}</h3><p>{vi?'Bạn đang xây gì, phần nào cần hỗ trợ và liên kết hoặc bối cảnh để mình hiểu thêm.':'What you’re building, the part you need help with, and a link or context so I can understand more.'}</p></aside>
      <footer><span>{personalProfile.name} / {personalProfile.alias}</span><a href="#/cosmos">{vi?'Trở lại vũ trụ':'Back to the universe'}<ArrowUpRight size={15}/></a></footer>
    </div>
  </section>;
}
