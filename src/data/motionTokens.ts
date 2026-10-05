export const motionTokens = {
  feedback: 100, fast: 180, panelEnter: 320, panelExit: 220,
  storyOpen: 500, storyClose: 360, focusCamera: 650,
  homeOpen: 400, homeClose: 280, distanceDesktop: 8, distanceMobile: 6,
  monitorEnter: 900, returnCamera: 600, stagger: 60,
  easeOut: 'cubic-bezier(.22,1,.36,1)',
  easeInOut: 'cubic-bezier(.4,0,.2,1)',
} as const;

/** Timelines measured from selecting an object, after releasing pointer lock. */
export function workspaceMotion(compact: boolean, reduced = false) {
  return reduced ? {
    focus: 0, readerAt: 0, readerEnter: 150, readerExit: 150,
    readerReturnAt: 0, readerReturn: 0, monitorFocus: 0, monitorAt: 0,
    monitorEnter: 150, monitorExit: 150, monitorReturn: 0,
  } : {
    focus: compact ? 350 : 650, readerAt: compact ? 260 : 450,
    readerEnter: compact ? 240 : 320, readerExit: 220,
    readerReturnAt: 100, readerReturn: 450,
    monitorFocus: compact ? 200 : 600, monitorAt: compact ? 200 : 500,
    monitorEnter: compact ? 300 : 400, monitorExit: 180, monitorReturn: 420,
  };
}

export const WORKSPACE_COMPACT_MEDIA = '(pointer:coarse), (max-width:767px), (max-height:600px)';

export const motionStyle = {
  '--motion-feedback': `${motionTokens.feedback}ms`, '--motion-fast': `${motionTokens.fast}ms`,
  '--motion-panel-enter': `${motionTokens.panelEnter}ms`, '--motion-panel-exit': `${motionTokens.panelExit}ms`,
  '--motion-stagger': `${motionTokens.stagger}ms`, '--motion-ease-out': motionTokens.easeOut,
} as import('react').CSSProperties;
