import manifest from './workspaceAssets.json';
export type WorkspaceItemId = 'paper' | 'lanyard' | 'bookshelf' | 'screen';
export const workspaceItems: { id: WorkspaceItemId; title: string; description: string; path: string; color: string }[] = [
  { id: 'paper', title: 'Resume', description: 'Web and mobile CVs', path: '#/workspace/resume/web', color: '#7dd3fc' },
  { id: 'bookshelf', title: 'Project library', description: 'Context, architecture and decisions', path: '#/workspace/library', color: '#a7f3d0' },
  { id: 'lanyard', title: 'Contact', description: 'Find me and get in touch', path: '#/workspace/contact', color: '#fde047' },
  { id: 'screen', title: 'Zney OS', description: 'Explore the desktop', path: '#/workspace/os/home', color: '#a8c8ff' },
];
export { manifest as workspaceAssets };
export function itemFromObject(object: { userData: Record<string, unknown>; parent?: unknown | null }): WorkspaceItemId | null {
  let node: typeof object | null = object;
  while (node) {
    const item = node.userData.workspaceItem;
    if (workspaceItems.some(entry => entry.id === item)) return item as WorkspaceItemId;
    node = node.parent as typeof object | null;
  }
  return null;
}
