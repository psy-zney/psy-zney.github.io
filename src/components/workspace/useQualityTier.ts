import { useEffect, useState } from 'react';
export type QualityTier = 'low' | 'medium' | 'high';
export type QualityPreference = QualityTier | 'auto';
export const QUALITY = {
  low: { dpr: 1, shadows: false, fps: 30, frameBudget: 36, triangleBudget: 90000 },
  medium: { dpr: 1.25, shadows: false, fps: 45, frameBudget: 28, triangleBudget: 180000 },
  high: { dpr: 1.75, shadows: true, fps: 60, frameBudget: 20, triangleBudget: 350000 },
} as const;
export function initialQuality(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return 'low';
  return window.matchMedia('(pointer:coarse)').matches ? 'medium' : 'high';
}
export function useQualityTier() {
  const [preference, setPreference] = useState<QualityPreference>(() => {
    try { const saved = localStorage.getItem('zney-quality'); return ['auto', 'low', 'medium', 'high'].includes(saved ?? '') ? saved as QualityPreference : 'auto'; } catch { return 'auto'; }
  });
  const [autoTier, setAutoTier] = useState<QualityTier>(initialQuality);
  useEffect(() => { try { localStorage.setItem('zney-quality', preference); } catch { /* Preferences remain usable without storage. */ } }, [preference]);
  return { preference, setPreference, tier: preference === 'auto' ? autoTier : preference, setAutoTier };
}
