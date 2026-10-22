import { useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { projects, type Language } from '../../data/portfolio';
import './ProjectArchive.css';

export function ProjectArchive({ lang }: {lang: Language}) {
  const [expanded,setExpanded]=useState<string|null>(null);
  const pinned=useRef<string|null>(null);
  const vi=lang==='vie';
  return <article className="project-archive">
    <p className="archive-intro">{vi?'Những công cụ mình đã xây dựng, vấn đề chúng giải quyết và cách chúng hoạt động.':'The tools I have built, the problems they solve and how they work.'}</p>
    <div className="virgo-archive">{projects.map(project=><section key={project.id} className={`archive-project${expanded===project.id?' is-expanded':''}`}
      style={{'--project-color':project.color} as React.CSSProperties}
      onPointerMove={event=>{if(event.pointerType==='mouse'&&matchMedia('(pointer:fine)').matches){const r=event.currentTarget.getBoundingClientRect();event.currentTarget.style.setProperty('--rim-x',`${event.clientX-r.left}px`);event.currentTarget.style.setProperty('--rim-y',`${event.clientY-r.top}px`);}}}
      onPointerEnter={event=>{if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches&&!pinned.current)setExpanded(project.id);}}
      onPointerLeave={event=>{if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches&&!pinned.current&&!event.currentTarget.contains(document.activeElement))setExpanded(null);}}>
      <button className="archive-project-toggle" aria-expanded={expanded===project.id} aria-controls={`archive-${project.id}`} onClick={()=>{pinned.current=pinned.current===project.id?null:project.id;setExpanded(pinned.current);}}>
        <span className="archive-project-name"><i aria-hidden="true"/><strong>{project.name}</strong><ChevronDown size={17}/></span>
        <span className="archive-project-purpose">{project.headline[lang]}</span>
        <span className="archive-project-tools">{project.stack.slice(0,3).join(' · ')}</span>
      </button>
      <div id={`archive-${project.id}`} className="archive-project-details" hidden={expanded!==project.id}>
        <p className="archive-project-role">{project.role[lang]}</p><p>{project.problem[lang]}</p>
        <a href={`#/project/${project.id}`}>{vi?'Đọc chi tiết dự án':'Read case study'}<ArrowUpRight size={16}/></a>
      </div>
    </section>)}</div>
  </article>;
}
