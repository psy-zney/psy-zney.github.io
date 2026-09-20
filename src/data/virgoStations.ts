// Stylized positions for the portfolio flight; these are not astronomical coordinates.
export const VIRGO_STARS = [
  { name: "Spica", position: [-5.2, -2.5, 0] as const, color: "#acd6ff" },
  { name: "Porrima", position: [-0.6, 0.85, 0] as const, color: "#f8e1ba" },
  { name: "Vindemiatrix", position: [3.7, 3.1, 0] as const, color: "#c4c6ff" },
  { name: "Zavijava", position: [6.35, -2.05, 0] as const, color: "#ffd6c3" },
];

// Supporting points complete the opening silhouette. The four named stars
// above remain the camera stops and content anchors.
export const VIRGO_SUPPORT_STARS = [
  { position: [-8.65, 3.15, 0] as const, color: "#99b7e8" },
  { position: [-7.1, -4.8, 0] as const, color: "#b3c8ed" },
  { position: [-4.3, -5.2, 0] as const, color: "#93addc" },
  { position: [-2.95, -1.2, 0] as const, color: "#c2d4ec" },
  { position: [-1.55, 3.7, 0] as const, color: "#adc4ea" },
  { position: [1.4, 4.9, 0] as const, color: "#a8bee9" },
  { position: [5.4, 4.7, 0] as const, color: "#c2c5ed" },
  { position: [8.2, 1.5, 0] as const, color: "#b7c9ec" },
  { position: [8.65, -3.7, 0] as const, color: "#e4c8c0" },
  { position: [2.95, -4.15, 0] as const, color: "#bec8e7" },
];
