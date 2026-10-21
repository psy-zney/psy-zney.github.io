import { smooth } from "./virgoFlight";

// Narration is sampled from the same smoothed scroll position as the camera.
// The identical position renders the identical tear in either direction.
export type CosmicEffect = "rift" | "nebula" | "meteor" | "orbit" | "aurora";
// Break at complete phrases while keeping one sentence per reading stop.
const readingCopy = (vie: string, eng: string) => ({
  vie: vie.split('\n').join(' '), eng: eng.split('\n').join(' '),
  phrases: { vie: vie.split('\n'), eng: eng.split('\n') },
});
export const NARRATIVE_BEATS = [
  { from: .68, to: 1.12, side: "middle", placement: "middle", effect: "rift", vie: "Mình là zney.", eng: "I'm zney." },
  { from: 1.12, to: 1.40, side: "middle", placement: "upper-left", effect: "rift", vie: "Mình học bằng cách làm.", eng: "I learn by building." },
  { from: 1.40, to: 1.82, side: "middle", placement: "lower-right", effect: "aurora", vie: "Mình biến ý tưởng thành sản phẩm.", eng: "I turn ideas into useful tools." },
  { from: 1.92, to: 2.32, side: "left", placement: "upper-left", effect: "orbit", ...readingCopy("Mình xây dựng ứng dụng web\nvà công cụ hệ thống.", "I build web applications\nand system tools.") },
  { from: 2.94, to: 3.52, side: "left", placement: "upper-left", effect: "nebula", ...readingCopy("Mỗi dự án cho mình\nthêm điều để học.", "Each project gives me\nsomething new to learn.") },
  { from: 3.65, to: 4.25, side: "right", placement: "lower-right", effect: "meteor", ...readingCopy("Mời bạn ghé qua những sản phẩm\nmình góp phần xây dựng.", "Step into the products\nI have helped build.") },
  { from: 4.80, to: 5.04, side: "left", placement: "upper-left", effect: "aurora", ...readingCopy("Những dự án ấy định hình\ncách mình xây dựng.", "Those projects shape\nthe way I build.") },
  { from: 5.04, to: 5.30, side: "right", placement: "lower-right", effect: "orbit", ...readingCopy("Giao diện, ứng dụng và hệ thống\nđược kết nối cẩn thận.", "Interfaces, apps and\nsystems—connected with care.") },
  { from: 5.82, to: 5.94, side: "right", placement: "upper-right", effect: "aurora", vie: "Bên kia hố đen, mỗi ý tưởng mở ra một thế giới.", eng: "Beyond the black hole, every idea becomes a world." },
] as const;

export const narrativeRevealStyle = (index: number) => (['scan', 'focus', 'stagger', 'rise', 'scan'] as const)[Math.max(0, index - 3) % 5];
/** Quiet links belong to the destination, independently of the final sentence. */
export const contactPresence = (position: number, reduced = false) => reduced ? Number(position >= 5.82) : smooth(5.82, 5.94, position);

export function narrativeEdges(index: number) {
  const beat = NARRATIVE_BEATS[index];
  const edge = Math.min(.07, (beat.to - beat.from) * .18);
  return { open: beat.from + edge, close: beat.to - edge };
}

export function narrativeSample(position: number, reduced = false) {
  const index = NARRATIVE_BEATS.findIndex(beat => position >= beat.from && position < beat.to);
  if (index < 0) return { index: -1, opacity: 0, reveal: 0, controls: 0, interactive: false };
  const beat = NARRATIVE_BEATS[index];
  const edge = narrativeEdges(index);
  const enter = reduced ? 1 : smooth(beat.from, edge.open, position);
  const exit = smooth(edge.close, beat.to, position);
  const reveal = enter * (1 - exit);
  return { index, opacity: reveal, reveal, controls: smooth(.5, 1, enter) * (1 - smooth(0, .55, exit)), interactive: enter >= .85 && exit === 0 };
}

export function narrativeTextReveal(amount: number, reduced = false, home = false) {
  return reduced ? 1 : home ? smooth(.40, .94, amount) : smooth(.20, .85, amount);
}
export function mobileNarrativeTop(height: number, starBottom: number, lineHeight: number, preferredTop = .44) {
  const top = Math.max(height * preferredTop, starBottom + 24);
  return { top, controls: top + lineHeight + 20 };
}

/** Reading anchors for wheel gestures; continuous touch scrolling uses the same timeline. */
export const NARRATIVE_STOPS = [0, ...NARRATIVE_BEATS.map(beat => Math.min(6, (beat.from + beat.to) / 2)), 6];
/** Public chapter links land on a complete sentence and its matching view. */
export function chapterReadingPosition(chapter: number) {
  // Contact is a destination with actionable links, beyond the preceding fade-in.
  const entries = [0, 1.92, ...[3, 4, 5, 6].map(index => (NARRATIVE_BEATS[index].from + NARRATIVE_BEATS[index].to) / 2), 6];
  return entries[chapter] ?? 0;
}
export function nextNarrativeStop(position: number, direction: number) {
  if (direction > 0 && position >= 6) return 6;
  if (direction < 0 && position <= 0) return 0;

  // A project deep link (at position 3) advances to a different sentence on its first gesture
  if (direction > 0 && Math.abs(position - 3) < 0.05) return NARRATIVE_STOPS[6];

  // If at or very close to an established narrative reading stop
  const stopIndex = NARRATIVE_STOPS.findIndex(stop => Math.abs(position - stop) <= 0.045);
  if (stopIndex >= 0) {
    const nextIndex = Math.max(0, Math.min(NARRATIVE_STOPS.length - 1, stopIndex + Math.sign(direction)));
    return NARRATIVE_STOPS[nextIndex];
  }

  // If in transit between stops, smoothly select the next anchor in the gesture direction
  if (direction > 0) return NARRATIVE_STOPS.find(stop => stop > position + 0.045) ?? 6;
  return [...NARRATIVE_STOPS].reverse().find(stop => stop < position - 0.045) ?? 0;
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
