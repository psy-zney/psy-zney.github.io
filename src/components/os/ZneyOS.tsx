import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, FileText, Home, Mail, Settings, Gamepad2, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { OS_APPS, navigateHash, closeWorkspaceView, type WorkspaceRoute } from '../../utils/appRoutes';
import { ProjectLibrary } from '../documents/ProjectLibrary';
import { ProjectDocument } from '../documents/ProjectDocument';
import { ContactCard } from '../documents/ContactCard';
import { ResumePage } from '../ResumePage';
import type { Language } from '../../data/portfolio';
import type { ReactNode, CSSProperties } from 'react';
import '../WorkspaceHUD.css';
import './ZneyOS.css';
const Playground = lazy(() => import('../DesktopOverlay').then(module => ({ default: module.DesktopOverlay })));
const icons = { home: Home, projects: BookOpen, documents: FileText, contact: Mail, playground: Gamepad2, settings: Settings };
const osScroll = new Map<string, number>();
const osFocus = new Map<string, string>();
let recentDocument: { label: string; path: string } | null = null;
export function ZneyOS({ route, lang, onExit, settings, sound, onSoundChange, onKeySound, surface, onReady, enterDuration = 300 }: {
  enterDuration?: number;
  surface: { x: number; y: number; width: number; height: number } | null; onReady: () => void;
  route: Extract<WorkspaceRoute, { kind: 'os' }>; lang: Language; onExit: () => void; settings: ReactNode; sound: boolean; onSoundChange: () => void; onKeySound: (code: string) => void;
}) {
  const app = route.app;
  const dialog = useRef<HTMLDialogElement>(null), main = useRef<HTMLElement>(null), timer = useRef(0);
  const [closing, setClosing] = useState(false); const closeRef = useRef(onExit); closeRef.current = onExit;
  const [more, setMore] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const key = `${app}/${route.projectId ?? route.track ?? ''}/${route.section}`;
  const exit = () => { if (timer.current) return; setClosing(true); timer.current = window.setTimeout(() => closeRef.current(), window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 150 : 180); };
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => { clearTimeout(timer.current); if (previous?.isConnected) previous.focus(); }; }, []);
  useEffect(() => { onReady(); }, []);
  useEffect(() => setMore(false), [app]);
  useEffect(() => { if (route.projectId || route.track) recentDocument = { label: route.track ? `${route.track === 'web' ? 'Web' : 'Mobile'} resume` : `${route.projectId} / ${route.section}`, path: window.location.hash }; }, [key]);
  useEffect(() => { const node = main.current; if (node) { node.scrollTop = osScroll.get(key) ?? 0; const href = osFocus.get(key), link = href ? node.querySelector<HTMLElement>(`a[href="${CSS.escape(href)}"]`) : null; const heading = node.querySelector<HTMLElement>('h1,h2'); if (link) link.focus({ preventScroll: true }); else if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } } }, [key]);
  return <dialog ref={dialog} style={{ '--os-enter-duration': `${enterDuration}ms`, ...(surface ? { '--screen-x': `${surface.x}px`, '--screen-y': `${surface.y}px`, '--screen-sx': surface.width / window.innerWidth, '--screen-sy': surface.height / window.innerHeight } : {}) } as CSSProperties} className={`zney-os${surface ? ' is-from-screen' : ''}${closing ? ' is-closing' : ''}`} aria-label="Zney OS" onCancel={event => { event.preventDefault(); if (more) { setMore(false); moreButton.current?.focus(); } else if (route.projectId) closeWorkspaceView('#/workspace/os/projects'); else if (route.track) closeWorkspaceView('#/workspace/os/documents'); else exit(); }}><header className="os-topbar"><a href="#/workspace/os/home" className="os-brand">✦ <strong>ZNEY OS</strong></a>
    <span className="os-status">A place to build.</span><button onClick={exit}><ArrowLeft size={18}/> Back to room</button></header>
    <div className="os-workspace"><nav className="os-nav" aria-label="Zney OS apps">{OS_APPS.map(id => { const Icon = icons[id]; return <a key={id} title={id === 'documents' ? 'Documents' : id} className={['contact','playground','settings'].includes(id) ? 'os-secondary-app' : undefined} href={`#/workspace/os/${id}`} aria-current={app === id ? 'page' : undefined}><Icon size={20}/><span>{id === 'documents' ? 'Docs' : id[0].toUpperCase() + id.slice(1)}</span></a>; })}<button ref={moreButton} className="os-more" aria-expanded={more} aria-controls="os-more-apps" onClick={() => setMore(value => !value)}><MoreHorizontal size={20}/><span>More</span></button></nav>
      {more && <div id="os-more-apps" className="os-more-apps" aria-label="More apps"><a href="#/workspace/os/contact"><Mail size={20}/>Contact</a><a href="#/workspace/os/playground"><Gamepad2 size={20}/>Playground</a><a href="#/workspace/os/settings"><Settings size={20}/>Settings</a></div>}
      <main ref={main} className="os-main" key={app} data-lenis-prevent onScroll={event => osScroll.set(key, event.currentTarget.scrollTop)} onFocusCapture={event => { const link = (event.target as HTMLElement).closest('a[href]'); if (link) osFocus.set(key, link.getAttribute('href')!); }}>
        {app === 'home' && <section className="os-home"><p className="reader-kicker">LÊ QUANG KHÁNH / ZNEY</p><h1>A place to build.</h1><p>Projects, notes, and the things I learn along the way.</p>
          <div className="os-home-cards"><a href="#/workspace/os/projects"><BookOpen/><h2>Projects</h2><p>Explore the context and decisions behind ten projects.</p><ArrowUpRight size={18}/></a>
            <a href="#/workspace/os/documents/resume/web"><FileText/><h2>Resume</h2><p>Web and mobile experience, in a readable document.</p><ArrowUpRight size={18}/></a>
            <a href="#/workspace/os/contact"><Mail/><h2>Contact</h2><p>Have something in mind? Let's talk.</p><ArrowUpRight size={18}/></a></div>
          {recentDocument && <p className="os-recent">Recently read: <a href={recentDocument.path}>{recentDocument.label} →</a></p>}<a className="os-playground-link" href="#/workspace/os/playground"><Gamepad2 size={18}/> Take a break in the playground →</a></section>}
        {app === 'projects' && (route.projectId ? <><a className="os-back" href="#/workspace/os/projects" onClick={event => { event.preventDefault(); closeWorkspaceView("#/workspace/os/projects"); }}>← Project library</a><ProjectDocument projectId={route.projectId} section={route.section} lang={lang} onSection={section => navigateHash(`#/workspace/os/projects/${route.projectId}/${section}`, true)}/></> : <ProjectLibrary lang={lang} basePath="#/workspace/os/projects"/>)}
        {app === 'documents' && (route.track ? <ResumePage track={route.track} lang={lang} basePath="#/workspace/os/documents/resume" backPath="#/workspace/os/documents"/> : <section><p className="reader-kicker">DOCUMENTS</p><h1>Resume & project notes</h1><div className="os-document-list"><a href="#/workspace/os/documents/resume/web"><FileText/> Full-stack Web CV <ArrowUpRight/></a><a href="#/workspace/os/documents/resume/mobile"><FileText/> Mobile CV <ArrowUpRight/></a><a href="#/workspace/os/projects"><BookOpen/> Project documentation <ArrowUpRight/></a></div></section>)}
        {app === 'contact' && <ContactCard/>}{app === 'settings' && settings}
        {app === 'playground' && <Suspense fallback={<p role="status">Opening the playground…</p>}><Playground onExit={() => navigateHash('#/workspace/os/home')} lang={lang} embedded initialSound={sound} onSoundChange={onSoundChange} onKeySound={onKeySound}/></Suspense>}
      </main>
    </div>
  </dialog>;
}
