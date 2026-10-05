import { useRef, useState, type ReactNode } from 'react';
import { List, X } from 'lucide-react';

/** One navigation inside the active reader; never opens a nested dialog. */
export function DocumentContents({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <aside className={`document-contents${open ? ' is-open' : ''}`} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <button ref={trigger} className="contents-trigger" aria-expanded={open} onClick={() => setOpen(value => !value)}><List size={18}/>Contents</button>
    <div className="contents-navigation"><header><strong>Contents</strong><button aria-label="Close contents" onClick={close}><X size={20}/></button></header>
      <div onClick={event => { if ((event.target as HTMLElement).closest('a,button')) close(); }}>{children}</div>
    </div>
  </aside>;
}
