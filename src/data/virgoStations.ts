import { SPACE_LAYOUT } from "./virgoSpace";

// Stylized positions for the portfolio flight; these are not astronomical coordinates.
const world = (x: number, y: number) => [x * SPACE_LAYOUT.interstellar, y * SPACE_LAYOUT.interstellar, 0] as const;
// The journey is a straight corridor; Virgo's original shape lives in virgoOpening.
export const STAR_ROUTE_GAP = 480;
const station = (index: number) => [0, 0, -index * STAR_ROUTE_GAP] as const;
export const VIRGO_STARS = [
  { name: "Spica", position: station(0), color: "#acd6ff", radius: 11.8 },
  { name: "Porrima", position: station(1), color: "#f8e1ba", radius: 10.4 },
  { name: "Vindemiatrix", position: station(2), color: "#c4c6ff", radius: 10.8 },
  { name: "Zavijava", position: station(3), color: "#ffd6c3", radius: 11.2 },
];

// Supporting points complete the opening silhouette. The four named stars
// above remain the camera stops and content anchors.
export const VIRGO_SUPPORT_STARS = [
  { position: world(-8.65, 3.15), color: "#99b7e8" },
  { position: world(-7.1, -4.8), color: "#b3c8ed" },
  { position: world(-4.3, -5.2), color: "#93addc" },
  { position: world(-2.95, -1.2), color: "#c2d4ec" },
  { position: world(-1.55, 3.7), color: "#adc4ea" },
  { position: world(1.4, 4.9), color: "#a8bee9" },
  { position: world(5.4, 4.7), color: "#c2c5ed" },
  { position: world(8.2, 1.5), color: "#b7c9ec" },
  { position: world(8.65, -3.7), color: "#e4c8c0" },
  { position: world(2.95, -4.15), color: "#bec8e7" },
];
