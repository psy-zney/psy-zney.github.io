export type WorkspacePhase = 'loading' | 'overview' | 'exploring' | 'focusing' | 'monitorEntering' | 'reading' | 'osActive' | 'returning' | 'errorFallback';
export type WorkspaceAction = { type: 'ready' | 'error' | 'retry' | 'returned' } | { type: 'lock'; value: boolean } | { type: 'focus'; monitor: boolean } | { type: 'route'; kind: string; ready: boolean; returning: boolean };
/** A single phase gates camera input, quality swaps and content presentation. */
export function workspaceReducer(phase: WorkspacePhase, action: WorkspaceAction): WorkspacePhase {
  switch (action.type) {
    case 'ready': return phase === 'loading' ? 'overview' : phase;
    case 'error': return 'errorFallback';
    case 'retry': return 'loading';
    case 'returned': return phase === 'returning' ? 'overview' : phase;
    case 'lock': return phase === 'overview' || phase === 'exploring' ? action.value ? 'exploring' : 'overview' : phase;
    case 'focus': return action.monitor ? 'monitorEntering' : 'focusing';
    case 'route': return action.kind === 'os' ? 'osActive' : action.kind !== 'room' ? 'reading' : action.returning ? 'returning' : action.ready ? 'overview' : 'loading';
  }
}
