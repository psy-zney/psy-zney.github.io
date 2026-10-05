import { WorkspaceController } from './workspace/WorkspaceController';
import type { Language } from '../data/portfolio';

// Keep the original public entry point while the room, controls and readers
// have explicit ownership in the workspace controller.
export function ModelAnalyzer({ onBackToIntro, lang = 'eng' }: {
  onBackToIntro?: () => void; lang?: Language; loadingAudioBlocked?: boolean;
}) {
  return <WorkspaceController onBackToIntro={onBackToIntro} lang={lang}/>;
}
