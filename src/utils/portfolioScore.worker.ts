import { synthesizePortfolioScore } from './portfolioSoundDesign';

// Long synthesis never blocks a pointer gesture, scrolling or the Three.js scene.
self.onmessage = () => {
  const score = synthesizePortfolioScore();
  self.postMessage(score, { transfer: [...score.bed, ...score.pulse].map(channel => channel.buffer as ArrayBuffer) });
};
