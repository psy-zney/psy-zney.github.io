import { useEffect, useState } from 'react';
import type { WorkspaceInput } from './workspaceNavigation';

/** Actual pointer events take precedence on laptops/tablets with both inputs. */
export function useWorkspaceInput(preference: 'auto' | WorkspaceInput = 'auto') {
  const [input, setInput] = useState<WorkspaceInput>(() => window.matchMedia('(pointer:coarse)').matches ? 'touch' : 'mouse');
  useEffect(() => {
    const pointer = (event: PointerEvent) => setInput(event.pointerType === 'mouse' ? 'mouse' : 'touch');
    const keyboard = (event: KeyboardEvent) => { if (event.code === 'Tab') setInput('mouse'); };
    window.addEventListener('pointerdown', pointer, { passive: true });
    window.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('pointerdown', pointer); window.removeEventListener('keydown', keyboard); };
  }, []);
  return preference === 'auto' ? input : preference;
}
