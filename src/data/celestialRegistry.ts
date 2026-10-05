import { projects, capabilities } from './portfolio';
export const PROJECT_RADII: Record<string, number> = { beatsync: 1.60, sentinellan: 1.90, 'study-cabin': 1.45, 'backup-data': 1.35, 'cloud-pos': 2.10, 'security-core': 1.70, 'mandy-crimson': 1.20, luckyfood: 1.55, 'chemistry-lab': 1.80, micro4nerds: 1.65 };
export const SKILL_RADII: Record<string, number> = { interfaces: 1.40, systems: 1.70, mobile: 1.50, simulation: 1.60, delivery: 1.80 };
export const CELESTIAL_PROJECTS = [
  { id: 'beatsync', orbit: 0, slot: 0, slots: 3, surface: 'ocean', satellite: 'architecture' },
  { id: 'sentinellan', orbit: 0, slot: 1, slots: 3, surface: 'crater', satellite: 'architecture' },
  { id: 'study-cabin', orbit: 0, slot: 2, slots: 3, surface: 'ice' },
  { id: 'backup-data', orbit: 1, slot: 0, slots: 4, surface: 'crater', satellite: 'decisions' },
  { id: 'cloud-pos', orbit: 1, slot: 1, slots: 4, surface: 'gas', ring: true },
  { id: 'security-core', orbit: 1, slot: 2, slots: 4, surface: 'rock', satellite: 'architecture' },
  { id: 'mandy-crimson', orbit: 1, slot: 3, slots: 4, surface: 'ocean' },
  { id: 'luckyfood', orbit: 2, slot: 0, slots: 3, surface: 'ocean', satellite: 'decisions' },
  { id: 'chemistry-lab', orbit: 2, slot: 1, slots: 3, surface: 'lava' },
  { id: 'micro4nerds', orbit: 2, slot: 2, slots: 3, surface: 'ice', ring: true },
] as const;
export const CELESTIAL_SKILLS = [
  { id: 'interfaces', orbit: 0, slot: 0, slots: 3 }, { id: 'systems', orbit: 0, slot: 1, slots: 3 },
  { id: 'mobile', orbit: 0, slot: 2, slots: 3 }, { id: 'simulation', orbit: 1, slot: 0, slots: 2 },
  { id: 'delivery', orbit: 1, slot: 1, slots: 2 },
] as const;
export function celestialSlot(index: number, count: number, skills = false) {
  if (skills) return CELESTIAL_SKILLS.find(item => item.id === capabilities[index].id)!;
  if (count === 4) return [
    { orbit: 0, slot: 0, slots: 2 }, { orbit: 0, slot: 1, slots: 2 },
    { orbit: 1, slot: 0, slots: 1 }, { orbit: 2, slot: 0, slots: 1 },
  ][index];
  return CELESTIAL_PROJECTS.find(item => item.id === projects[index].id)!;
}
