import { useEffect, useState } from 'react';
export type QualityTier = 'low' | 'medium' | 'high';
export type QualityPreference = QualityTier | 'auto';
export const QUALITY = {
  low: { dpr: 1, shadows: false, fps: 30, frameBudget: 36, triangleBudget: 90000 },
  medium: { dpr: 2, shadows: false, fps: 45, frameBudget: 28, triangleBudget: 180000 },
  high: { dpr: 3, shadows: true, fps: 60, frameBudget: 20, triangleBudget: 350000 },
} as const;
export function initialQuality(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return 'low';
  return 'high';
}
// Keep the preference usable when browser storage is blocked, and sync mounted scenes.
let memoryPreference: QualityPreference = 'auto';
export function readQualityPreference(): QualityPreference {
  try { const saved = localStorage.getItem('zney-quality'); if (['auto', 'low', 'medium', 'high'].includes(saved ?? '')) return saved as QualityPreference; } catch { /* Storage optional. */ }
  return memoryPreference;
}
function saveQualityPreference(value: QualityPreference) {
  memoryPreference = value;
  try { localStorage.setItem('zney-quality', value); } catch { /* Storage optional. */ }
  window.dispatchEvent(new Event('zney-quality-change'));
}
export function useQualityTier(autoOnly = false) {
  const [preference, updatePreference] = useState<QualityPreference>(() => autoOnly ? 'auto' : readQualityPreference());
  const [autoTier, setAutoTier] = useState<QualityTier>(initialQuality);
  useEffect(() => {
    if (autoOnly) return;
    const sync = () => updatePreference(readQualityPreference());
    window.addEventListener('zney-quality-change', sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener('zney-quality-change', sync); window.removeEventListener('storage', sync); };
  }, [autoOnly]);
  const effectivePreference = autoOnly ? 'auto' : preference;
  return { preference: effectivePreference, setPreference: saveQualityPreference, tier: effectivePreference === 'auto' ? autoTier : effectivePreference, setAutoTier };
}
