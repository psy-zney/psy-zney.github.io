import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { workspaceMotion, WORKSPACE_COMPACT_MEDIA } from '../../data/motionTokens';

const scrollPositions = new Map<string, number>();
const focusLinks = new Map<string, string>();
export function DocumentReader({ title, storageKey, onClose, onReturnStart, children }: {
  title: string; storageKey: string; onClose: () => void; onReturnStart?: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null), body = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const returnStart = useRef(onReturnStart); returnStart.current = onReturnStart;
  const timing = workspaceMotion(window.matchMedia(WORKSPACE_COMPACT_MEDIA).matches, window.matchMedia('(prefers-reduced-motion:reduce)').matches);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timer = useRef(0);
  const returnTimer = useRef(0);
  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (returnStart.current) returnTimer.current = window.setTimeout(() => returnStart.current?.(), timing.readerReturnAt);
    timer.current = window.setTimeout(() => close.current(), timing.readerExit);
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(returnTimer.current);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    closingRef.current = false; setClosing(false); window.clearTimeout(timer.current); window.clearTimeout(returnTimer.current);
    const element = body.current;
    if (element) element.scrollTop = scrollPositions.get(storageKey) ?? 0;
    const link = focusLinks.get(storageKey);
    const target = link ? element?.querySelector<HTMLElement>(`a[href="${CSS.escape(link)}"]`) : null;
    const heading = element?.querySelector<HTMLElement>('h1,h2');
    if (target) target.focus({ preventScroll: true });
    else if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, [storageKey]);
  return <dialog ref={dialog} style={{ '--motion-panel-enter': `${timing.readerEnter}ms`, '--motion-panel-exit': `${timing.readerExit}ms` } as CSSProperties} className={`document-reader${storageKey === 'contents' ? ' is-contents' : ''}${closing ? ' is-closing' : ''}`} aria-label={title}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); requestClose(); } }}
    onCancel={event => { event.preventDefault(); requestClose(); }}>
    <header className="reader-header"><span>WORKSPACE / {title}</span><button onClick={requestClose} aria-label="Close reader" autoFocus><X size={22}/></button></header>
    <div ref={body} className="reader-body" data-lenis-prevent onScroll={event => scrollPositions.set(storageKey, event.currentTarget.scrollTop)} onFocusCapture={event => { const link = (event.target as HTMLElement).closest('a[href]'); if (link) focusLinks.set(storageKey, link.getAttribute('href')!); }}>{children}</div>
  </dialog>;
}
