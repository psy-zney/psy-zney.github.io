import { projects } from './portfolio';
import type { DocumentSection } from '../utils/appRoutes';

export const documentSections: { id: DocumentSection; eng: string; vie: string }[] = [
  { id: 'overview', eng: 'Overview', vie: 'Tổng quan' },
  { id: 'architecture', eng: 'Architecture', vie: 'Kiến trúc' },
  { id: 'decisions', eng: 'Decisions', vie: 'Quyết định' },
  { id: 'notes', eng: 'Notes & links', vie: 'Ghi chú & liên kết' },
];
// These documents are projections of the reviewed portfolio records. No live
// README fetch or invented architecture is needed to read a project offline.
export const projectDocuments = projects.flatMap(project => documentSections.map(section => ({
  id: `${project.id}/${section.id}`, projectId: project.id, section: section.id,
  source: 'portfolio' as const, reviewedAt: '2026-10-04',
})));
