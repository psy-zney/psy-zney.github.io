import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowLeft, Download, MoreHorizontal, Printer } from 'lucide-react';
import type { Language } from '../data/portfolio';
import { DocumentContents } from './documents/DocumentContents';
import './ResumePage.css';

export const resumeFiles = {
  backend: './file/Le_Quang_Khanh_CV_Backend_Developer.html',
  fullstack: './file/Le_Quang_Khanh_CV_Full_Stack_Developer.html',
  software: './file/Le_Quang_Khanh_CV_Software_Engineer.html',
  // Preserve saved routes while retiring the old Game/Mobile documents.
  game: './file/Le_Quang_Khanh_CV_Full_Stack_Developer.html',
  mobile: './file/Le_Quang_Khanh_CV_Software_Engineer.html',
  web: './file/Le_Quang_Khanh_CV_Full_Stack_Developer.html',
};
export const DISPLAY_TRACKS = ['backend', 'fullstack', 'software'] as const;
export const TRACK_LABELS = { backend: 'Backend', fullstack: 'Full Stack', software: 'Software Engineer' };
const originalFiles = {
  backend: './file/source/Le_Quang_Khanh_CV_Backend_Developer.docx',
  fullstack: './file/source/Le_Quang_Khanh_CV_Full_Stack_Developer.docx',
  software: './file/source/Le_Quang_Khanh_CV_Software_Engineer.pdf',
};
const sections = ['SUMMARY', 'EDUCATION', 'TECHNICAL PROJECTS', 'SKILLS'];
const headingId = (title: string) => `resume-${title.toLowerCase().replace(/ /g, '-')}`;

/** Keep the complete document's head/print CSS isolated from site typography. */
export function ResumeContent({ content, frameRef, title = 'CV', onReady }: {
  content: string; frameRef?: RefObject<HTMLIFrameElement>; title?: string; onReady?: () => void;
}) {
  const localFrame = useRef<HTMLIFrameElement>(null);
  const frame = frameRef ?? localFrame;
  const wrapper = useRef<HTMLDivElement>(null);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), [content]);
  return <div className="resume-document" ref={wrapper}>
    <iframe ref={frame} title={title} srcDoc={content}
      sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox"
      onLoad={() => {
        cleanup.current();
        const element = frame.current, host = wrapper.current, doc = element?.contentDocument;
        if (!element || !host || !doc?.querySelector('.cv-sheet')) return;
        const sync = () => {
          const width = host.clientWidth;
          if (!width) return;
          const pageWidth = width > 600 ? 794 : width;
          const scale = Math.min(1, width / pageWidth);
          element.style.width = `${pageWidth}px`;
          element.style.transform = `scale(${scale})`;
          const height = Math.ceil(doc.querySelector('.cv-sheet')!.getBoundingClientRect().height);
          element.style.height = `${height}px`;
          host.style.height = `${height * scale}px`;
        };
        // Keyboard events inside a document do not bubble into the reader.
        const key = (event: KeyboardEvent) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          const dialog = element.closest('dialog');
          if (dialog) dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
          else element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        };
        const observer = new ResizeObserver(sync);
        observer.observe(host);
        observer.observe(doc.body);
        doc.addEventListener('keydown', key);
        cleanup.current = () => { observer.disconnect(); doc.removeEventListener('keydown', key); };
        sync();
        onReady?.();
      }}/>
  </div>;
}

export function ResumePage({ track, lang, basePath = '#/cv', backPath = '#/contact' }: {
  track: keyof typeof resumeFiles; lang: Language; basePath?: string; backPath?: string;
}) {
  const [content, setContent] = useState('');
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const targetTrack = track === 'web' || track === 'game' ? 'fullstack' : track === 'mobile' ? 'software' : track in TRACK_LABELS ? track as keyof typeof TRACK_LABELS : 'fullstack';
  const t = (vi: string, en: string) => lang === 'vie' ? vi : en;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setContent(''); setError(false); setReady(false);
    fetch(resumeFiles[targetTrack], { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('CV unavailable'); return response.text(); })
      .then(text => { if (active) setContent(text); })
      .catch(err => { if (active && err.name !== 'AbortError') setError(true); });
    return () => { active = false; controller.abort(); };
  }, [targetTrack, retry]);

  return <article className="resume-page page-enter" data-cv-document>
    <div className="resume-toolbar">
      <div>
        <button className="primary-link" disabled={!ready} onClick={() => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }}>
          <Printer size={15}/>{t('In / Lưu PDF', 'Print / Save PDF')}
        </button>
        <details className="resume-more"><summary aria-label={t('Thao tác CV khác', 'More CV actions')}><MoreHorizontal size={20}/></summary><div>
          <a className="text-link" href={resumeFiles[targetTrack]} download><Download size={15}/>{t('Tải HTML', 'Download HTML')}</a>
          <a className="text-link" href={originalFiles[targetTrack]} download>{t('Tải bản gốc', 'Download original')}</a>
          <a className="text-link" href={backPath}><ArrowLeft size={16}/>{t('Quay lại', 'Back')}</a>
        </div></details>
      </div>
    </div>
    <nav className="resume-tracks" aria-label="Resume track">
      {DISPLAY_TRACKS.map(value => <a key={value} className="text-link" href={`${basePath}/${value}`}
        aria-current={targetTrack === value ? 'page' : undefined}>{TRACK_LABELS[value]}</a>)}
    </nav>
    <p className="resume-language-note">{t('CV tiếng Anh. In hoặc lưu PDF khổ A4.', 'CV in English. Print or save as A4 PDF.')}</p>
    <div className="document-layout">
      <DocumentContents>
        <nav className="document-tabs" aria-label="Resume contents">
          {sections.map(title => <button key={title} disabled={!ready} onClick={() => {
            const heading = frame.current?.contentDocument?.getElementById(headingId(title));
            heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
            queueMicrotask(() => heading?.focus({ preventScroll: true }));
          }}>{title}</button>)}
        </nav>
      </DocumentContents>
      <div className="resume-paper" key={targetTrack} lang="en" aria-busy={!error && !ready}>
        {error ? <p role="alert">{t('Không tải được CV.', 'The CV could not be loaded.')} <a href={resumeFiles[targetTrack]}>{t('Mở CV', 'Open CV')}</a> <button onClick={() => setRetry(value => value + 1)}>{t('Thử lại', 'Retry')}</button></p>
          : content ? <ResumeContent content={content} frameRef={frame} title={`${TRACK_LABELS[targetTrack]} CV`} onReady={() => setReady(true)}/>
          : <p role="status">{t('Đang tải CV…', 'Loading CV…')}</p>}
      </div>
    </div>
  </article>;
}
