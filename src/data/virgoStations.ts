// Stylized positions for the portfolio flight; these are not astronomical coordinates.
export const VIRGO_STARS = [
  { name: "Spica", position: [-4.3, -2.1, 0] as const, color: "#acd6ff" },
  { name: "Porrima", position: [-0.5, 0.7, 0] as const, color: "#f8e1ba" },
  { name: "Vindemiatrix", position: [3.0, 2.6, 0] as const, color: "#c4c6ff" },
  { name: "Zavijava", position: [5.2, -1.7, 0] as const, color: "#ffd6c3" },
];

// Supporting points complete the opening silhouette. The four named stars
// above remain the camera stops and content anchors.
export const VIRGO_SUPPORT_STARS = [
  { position: [-7.1, 2.7, 0] as const, color: "#99b7e8" },
  { position: [-5.8, -4.1, 0] as const, color: "#b3c8ed" },
  { position: [-3.5, -4.45, 0] as const, color: "#93addc" },
  { position: [-2.4, -1.0, 0] as const, color: "#c2d4ec" },
  { position: [-1.25, 3.15, 0] as const, color: "#adc4ea" },
  { position: [1.15, 4.2, 0] as const, color: "#a8bee9" },
  { position: [4.45, 4.0, 0] as const, color: "#c2c5ed" },
  { position: [6.75, 1.25, 0] as const, color: "#b7c9ec" },
  { position: [7.1, -3.15, 0] as const, color: "#e4c8c0" },
  { position: [2.4, -3.55, 0] as const, color: "#bec8e7" },
];
