import { ArrowUpRight, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { projects, type Language } from '../../data/portfolio';
import { documentSections } from '../../data/projectDocuments';
import type { DocumentSection } from '../../utils/appRoutes';
import { DocumentContents } from './DocumentContents';
import { confirmFeedback } from '../../utils/uiFeedback';

export function ProjectDocument({ projectId, section = 'overview', lang, onSection }: {
  projectId: string; section?: DocumentSection; lang: Language;
  onSection: (section: DocumentSection) => void;
}) {
  const project = projects.find(item => item.id === projectId);
  const [copied, setCopied] = useState(''); const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!project) return <p role="alert">Project not found.</p>;
  return <article className="project-document" style={{ '--document-accent': project.color } as React.CSSProperties}>
    <header><p className="reader-kicker">{project.category} / {project.year}</p>
      <h1>{project.name}</h1><p className="document-headline">{project.headline[lang]}</p>
      <p className="document-role">{project.role[lang]}</p><p className="reader-note">Portfolio notes · Reviewed 4 October 2026{project.source && <> · <a href={project.source} target="_blank" rel="noopener noreferrer">Source <ArrowUpRight size={14}/></a></>}</p><button className="reader-primary" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied('Link copied'); confirmFeedback(); } catch { setCopied('Copy the address from your browser.'); } clearTimeout(timer.current); timer.current = window.setTimeout(() => setCopied(''), 1500); }}><Copy size={16}/> Copy link</button><span role="status">{copied}</span></header>
    <div className="document-layout"><DocumentContents><nav className="document-tabs" aria-label="Project contents">{documentSections.map(item =>
      <button key={item.id} aria-current={section === item.id ? 'page' : undefined} onClick={() => onSection(item.id)}>{item[lang]}</button>)}</nav></DocumentContents>
    <div className="document-section" key={section}>
      {section === 'overview' && <><h2>{lang === 'vie' ? 'Tổng quan' : 'Overview'}</h2><p>{project.summary[lang]}</p>
        <h2>{lang === 'vie' ? 'Bài toán' : 'The challenge'}</h2><p>{project.problem[lang]}</p></>}
      {section === 'architecture' && <><h2>{lang === 'vie' ? 'Các thành phần' : 'Connected parts'}</h2>
        <ol className="architecture-path">{project.path.map((part, i) => <li key={part}><span>{String(i + 1).padStart(2, '0')}</span><strong>{part}</strong></li>)}</ol>
        <h2>{lang === 'vie' ? 'Công nghệ' : 'Tools in the project'}</h2><div className="document-stack">{project.stack.map(tool => <span key={tool}>{tool}</span>)}</div>
        <p className="reader-note">{lang === 'vie' ? 'Sơ đồ tóm tắt các thành phần được ghi nhận trong portfolio; đọc mã nguồn để xem thiết kế đầy đủ.' : 'This outlines the components documented in the portfolio. The source repository provides the full implementation.'}</p></>}
      {section === 'decisions' && <><h2>{lang === 'vie' ? 'Đóng góp' : 'My contribution'}</h2><ul>{project.contributions.map((copy, i) => <li key={i}>{copy[lang]}</li>)}</ul>
        <h2>{lang === 'vie' ? 'Quyết định kỹ thuật' : 'Engineering decisions'}</h2><p>{project.decision[lang]}</p></>}
      {section === 'notes' && <><h2>{lang === 'vie' ? 'Điều học được' : 'What I learned'}</h2><p>{project.takeaway[lang]}</p>
        {project.note && <aside className="document-attribution">{project.note[lang]}</aside>}
        <p className="reader-note">{lang === 'vie' ? 'Nội dung được biên tập từ các nguồn đã ghi nhận trong portfolio.' : 'Editorial notes based on the sources recorded for this portfolio.'}</p></>}
      {project.note && section !== 'notes' && <aside className="document-attribution">{project.note[lang]}</aside>}
      <footer className="document-links">{project.source && <a href={project.source} target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={16}/></a>}
        {project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer">{project.id === 'chemistry-lab' ? 'Documentation viewer' : 'Live site'} <ArrowUpRight size={16}/></a>}
        <button onClick={() => onSection(documentSections[(documentSections.findIndex(item => item.id === section) + 1) % 4].id)}>Next section →</button></footer>
    </div></div>
  </article>;
}
