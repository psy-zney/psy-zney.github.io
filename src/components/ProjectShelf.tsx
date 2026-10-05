import type { Language } from '../data/portfolio';
import { DocumentReader } from './documents/DocumentReader';
import { ProjectLibrary } from './documents/ProjectLibrary';
import './documents/Documents.css';

/** Compatibility entry: all shelves use the shared workspace library. */
export function ProjectShelf({ onClose, lang }: { onClose: () => void; lang: Language }) {
  return <DocumentReader title="Project library" storageKey="library" onClose={onClose}><ProjectLibrary lang={lang}/></DocumentReader>;
}
