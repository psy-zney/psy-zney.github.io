import { clamp, smooth } from './virgoFlight';

export const INTRO_DURATION = 5.5;
export const INTRO_PALETTE = { sky: '#030308', gold: '#FFD166', violet: '#C7B8EA', rim: '#E0FBFC' } as const;
export const INTRO_CAPTIONS = [
  { z: -800, from: 2.5, pass: 3.5, side: 1, vie: 'Xin chào, tôi là Lê Quang Khánh', eng: "Hello, I'm Lê Quang Khánh" },
  { z: -1800, from: 3.8, pass: 4.8, side: -1, vie: 'Chào mừng đến với vũ trụ sáng tạo của tôi', eng: 'Welcome to my creative universe' },
] as const;

/** One gesture starts a time-based flight. No idle animation or scroll scrubbing. */
export function introFrame(seconds: number) {
  const t = clamp(seconds, 0, INTRO_DURATION);
  const charge = smooth(0, 1, t);
  const tear = smooth(1, 2.2, t);
  // Smooth monotonic Hermite curve through the two physical text planes.
  const stops = [[0, 1000, 0], [1, 1000, 0], [2.2, 0, -500], [2.5, -420, -700], [3.5, -800, -600], [3.8, -1100, -800], [4.8, -1800, -950], [5, -2250, -3000], [5.5, -3000, 0]];
  const index = Math.min(stops.length - 2, Math.max(0, stops.findIndex((stop, i) => i < stops.length - 1 && t <= stops[i + 1][0])));
  const [start, z0, v0] = stops[index], [end, z1, v1] = stops[index + 1];
  const span = end - start, u = clamp((t - start) / span);
  const z = (2 * u ** 3 - 3 * u ** 2 + 1) * z0 + (u ** 3 - 2 * u ** 2 + u) * span * v0
    + (-2 * u ** 3 + 3 * u ** 2) * z1 + (u ** 3 - u ** 2) * span * v1;
  const flight = smooth(2.2, 5.5, t);
  return { t, charge, tear, z, x: Math.sin(flight * Math.PI * 2) * 85,
    y: Math.sin(flight * Math.PI) * 26, streak: smooth(2.2, 2.65, t) * (1 - smooth(5, 5.5, t)),
    opacity: 1 - smooth(5, 5.5, t), phase: t < 1 ? 'charging' : t < 2.2 ? 'tearing' : t < 5 ? 'flying' : 'arriving' };
}
