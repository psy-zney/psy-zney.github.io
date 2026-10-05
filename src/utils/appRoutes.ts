import { projects, capabilities } from '../data/portfolio';

export const OS_APPS = ['home', 'projects', 'documents', 'contact', 'playground', 'settings'] as const;
export type OSApp = typeof OS_APPS[number];
export const DOCUMENT_SECTIONS = ['overview', 'architecture', 'decisions', 'notes'] as const;
export type DocumentSection = typeof DOCUMENT_SECTIONS[number];
export type ResumeTrack = 'web' | 'mobile';
export type PublicDocumentRoute =
  | { kind: 'project'; projectId: string; section?: DocumentSection }
  | { kind: 'resume'; track: ResumeTrack }
  | { kind: 'capability'; index: number }
  | { kind: 'archive' } | { kind: 'missing' } | null;
export function parsePublicDocumentRoute(hash: string): PublicDocumentRoute {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'project') {
    if (parts.length < 2 || parts.length > 3 || !projects.some(project => project.id === parts[1]) || (parts.length === 3 && !DOCUMENT_SECTIONS.includes(parts[2] as DocumentSection))) return { kind: 'missing' };
    return { kind: 'project', projectId: parts[1], section: parts[2] as DocumentSection | undefined };
  }
  if (parts[0] === 'cv') return parts.length === 2 && (parts[1] === 'web' || parts[1] === 'mobile') ? { kind: 'resume', track: parts[1] } : { kind: 'missing' };
  if (parts[0] === 'skills' && parts.length > 1) { const index = capabilities.findIndex(item => item.id === parts[1]); return parts.length === 2 && index >= 0 ? { kind: 'capability', index } : { kind: 'missing' }; }
  if (hash === '#/projects/all') return { kind: 'archive' };
  return null;
}
export type WorkspaceRoute =
  | { kind: 'room' }
  | { kind: 'resume'; track: ResumeTrack }
  | { kind: 'library'; projectId?: string; section: DocumentSection }
  | { kind: 'contact' }
  | { kind: 'os'; app: OSApp; track?: ResumeTrack; projectId?: string; section: DocumentSection }
  | { kind: 'missing' };

export function isWorkspaceHash(hash: string) {
  return hash.replace(/^#\/?/, '').split('/')[0] === 'workspace';
}
export function parseWorkspaceRoute(hash: string): WorkspaceRoute {
  const parts = hash.replace(/^#\/?/, '').split('/');
  const [root, page, id, section, extra, trailing] = parts;
  const validProject = (value?: string) => projects.some(project => project.id === value);
  const validSection = (value?: string): value is DocumentSection => DOCUMENT_SECTIONS.includes(value as DocumentSection);
  const validTrack = (value?: string): value is ResumeTrack => value === 'web' || value === 'mobile';
  if (root !== 'workspace') return { kind: 'missing' };
  if (!page && parts.length <= 2) return { kind: 'room' };
  if (page === 'resume' && validTrack(id) && parts.length === 3) return { kind: 'resume', track: id };
  if (page === 'contact' && parts.length === 2) return { kind: 'contact' };
  if (page === 'library' && parts.length === 2) return { kind: 'library', section: 'overview' };
  if (page === 'library' && validProject(id) && (!section || validSection(section)) && parts.length <= 4)
    return { kind: 'library', projectId: id, section: (section ?? 'overview') as DocumentSection };
  if (page === 'os' && OS_APPS.includes(id as OSApp)) {
    if (!section && parts.length === 3) return { kind: 'os', app: id as OSApp, section: 'overview' };
    if (id === 'documents' && section === 'resume' && validTrack(extra) && parts.length === 5)
      return { kind: 'os', app: 'documents', track: extra, section: 'overview' };
    if (id === 'projects' && validProject(section) && (!extra || validSection(extra)) && parts.length <= 5)
      return { kind: 'os', app: 'projects', projectId: section, section: (extra ?? 'overview') as DocumentSection };
  }
  return { kind: 'missing' };
}

export function navigateHash(hash: string, replace = false) {
  if (window.location.hash === hash) return;
  const state = replace ? { ...window.history.state } : { workspaceOrigin: window.location.hash };
  window.history[replace ? 'replaceState' : 'pushState'](state, '', `${window.location.pathname}${window.location.search}${hash}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Close a pushed view through history; direct links use a deterministic parent. */
export function closeWorkspaceView(parent = '#/workspace') {
  const origin = window.history.state?.workspaceOrigin;
  if (typeof origin === 'string' && isWorkspaceHash(origin)) window.history.back();
  else { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${parent}`); window.dispatchEvent(new HashChangeEvent('hashchange')); }
}
