import { smooth } from "./virgoFlight";

// Narration is sampled from the same smoothed scroll position as the camera.
// The identical position renders the identical tear in either direction.
export type CosmicEffect = "rift" | "nebula" | "meteor" | "orbit" | "aurora";
export const NARRATIVE_BEATS = [
  { from: .68, to: 1.12, side: "middle", placement: "middle", effect: "nebula", vie: "Mình là zney.", eng: "I'm zney." },
  { from: 1.12, to: 1.40, side: "middle", placement: "upper-left", effect: "rift", vie: "Mình học bằng cách làm.", eng: "I learn by building." },
  { from: 1.40, to: 1.82, side: "middle", placement: "lower-right", effect: "aurora", vie: "Mình biến ý tưởng thành sản phẩm.", eng: "I turn ideas into useful tools." },
  { from: 1.92, to: 2.32, side: "right", placement: "upper-right", effect: "orbit", vie: "Mình tìm hiểu người dùng cần gì.", eng: "I start with what people need." },
  { from: 2.94, to: 3.52, side: "left", placement: "upper-left", effect: "meteor", vie: "Đây là những dự án mình đã làm.", eng: "Here are the projects I've built." },
  { from: 3.65, to: 4.25, side: "left", placement: "lower-left", effect: "nebula", vie: "Mình vẫn tiếp tục làm và học.", eng: "I keep building and learning." },
  { from: 4.80, to: 5.04, side: "right", placement: "upper-right", effect: "aurora", vie: "Mình làm web, ứng dụng và hệ thống.", eng: "I build websites, apps and systems." },
  { from: 5.04, to: 5.30, side: "right", placement: "lower-right", effect: "orbit", vie: "Mình nối các phần để sản phẩm chạy tốt.", eng: "I connect the parts so they work well." },
  { from: 5.82, to: 5.94, side: "right", placement: "top", effect: "rift", vie: "Bạn có ý tưởng?", eng: "Have an idea?" },
  { from: 5.94, to: 6.20, side: "right", placement: "lower-right", effect: "aurora", vie: "Mình cùng trao đổi nhé.", eng: "Let's talk." },
] as const;

export function narrativeEdges(index: number) {
  const beat = NARRATIVE_BEATS[index];
  const edge = Math.min(.07, (beat.to - beat.from) * .18);
  return { open: beat.from + edge, close: beat.to - edge };
}

export function narrativeSample(position: number, reduced = false) {
  const index = NARRATIVE_BEATS.findIndex(beat => position >= beat.from && position < beat.to);
  if (index < 0) return { index: -1, opacity: 0, reveal: 0 };
  const beat = NARRATIVE_BEATS[index];
  const edge = narrativeEdges(index);
  const reveal = reduced ? 1 : smooth(beat.from, edge.open, position) * (1 - smooth(edge.close, beat.to, position));
  return { index, opacity: reveal, reveal };
}

export function narrativeTextReveal(amount: number, reduced = false) {
  return reduced ? 1 : smooth(.40, .94, amount);
}
export function mobileNarrativeTop(height: number, starBottom: number, lineHeight: number, preferredTop = .50) {
  // Reserve the luminous bank and its outer wisps as well as the letters.
  const top = Math.max(height * preferredTop, starBottom + 62);
  return { top, controls: Math.max(height * .61, top + lineHeight + 44) };
}

/** Reading anchors for wheel gestures; continuous touch scrolling uses the same timeline. */
export const NARRATIVE_STOPS = [0, ...NARRATIVE_BEATS.map(beat => Math.min(6, (beat.from + beat.to) / 2))];
export function nextNarrativeStop(position: number, direction: number) {
  const current = NARRATIVE_BEATS.findIndex(beat => position >= beat.from && position < beat.to);
  if (current >= 0) return NARRATIVE_STOPS[Math.max(0, Math.min(NARRATIVE_STOPS.length - 1, current + 1 + Math.sign(direction)))];
  if (direction > 0) return NARRATIVE_STOPS.find(stop => stop > position + .045) ?? 6;
  return [...NARRATIVE_STOPS].reverse().find(stop => stop < position - .045) ?? 0;
}

export type StoryGesture = { direction: number; at: number; destination: number };
export function advanceStoryGesture(gesture: StoryGesture, position: number, direction: number, now: number) {
  const reversing = gesture.direction !== 0 && direction !== gesture.direction;
  const inBurst = now - gesture.at < 240;
  const arriving = gesture.destination >= 0 && Math.abs(position - gesture.destination) > .045;
  const accepted = reversing || !inBurst && !arriving;
  return { accepted, gesture: { direction: accepted ? direction : gesture.direction, at: now,
    destination: accepted ? nextNarrativeStop(position, direction) : gesture.destination } };
}
