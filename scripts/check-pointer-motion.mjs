import assert from 'node:assert/strict';

export async function checkPointerMotion(server) {
  const { DragRotation } = await server.ssrLoadModule('/src/utils/dragRotation.ts');
  const { worldDragDirection, worldDragOffset } = await server.ssrLoadModule('/src/data/worldsConstellation.ts');
  const results = [];
  for (const fps of [30, 60, 120]) {
    const motion = new DragRotation(0, 0);
    motion.begin(0); motion.drag(1, .2, 16, false);
    for (let frame = 0; frame < fps / 5; frame++) motion.step(1 / fps, false);
    assert(motion.x > .99 && motion.x < 1, `${fps}Hz: follows the hand without jumping to its target`);
    results.push(motion.x);
    const beforeRelease = motion.targetX;
    motion.release(32, false);
    assert(motion.targetX > beforeRelease && motion.targetX <= beforeRelease + .16, 'Fresh release has bounded inertia');
    for (let frame = 0; frame < fps; frame++) motion.step(1 / fps, false);
    assert.equal(motion.x, motion.targetX, 'Release settles at a finite angle');
    motion.stop(); const stopped = motion.x;
    motion.step(.05, false); assert.equal(motion.x, stopped, 'Cancellation drops all pending motion');
    motion.snap(.53979, -.01338);
    assert.equal(motion.x, .53979, 'Home restores the exact pinned orientation');
    motion.begin(50); motion.drag(1, 100, 66, true); motion.release(70, true);
    assert.equal(motion.x, motion.targetX, 'Reduced motion follows input immediately');
    assert.equal(motion.y, 1.25, 'Pitch remains bounded at the upper pole');
    motion.drag(0, -100, 82, true); assert.equal(motion.y, -1.25);
    motion.snap(0, 0); motion.begin(0); motion.drag(.4, 0, 16, false);
    motion.release(200, false); assert.equal(motion.targetX, .4, 'Holding before release does not create a stale fling');
  }
  assert(Math.max(...results) - Math.min(...results) < 1e-10, 'Smoothing uses seconds, independent of refresh rate');
  assert.equal(worldDragDirection(-54, 0), 1); assert.equal(worldDragDirection(54, 0), -1);
  assert.equal(worldDragDirection(-30, 1, -.8), 1, 'A short intentional flick advances one world');
  for (const args of [[19, 0, 10], [30, 28, 10], [30, 0, 0], [30, 0, -2], [NaN, 0, 1]]) {
    assert.equal(worldDragDirection(...args), 0, `Reject accidental, vertical, paused or invalid gestures: ${args}`);
  }
  const inside = worldDragOffset(240, 1440, 3), edge = worldDragOffset(240, 1440, 0);
  assert(inside > 180 && inside < 240, 'The rail follows a substantial portion of the hand movement');
  assert(edge > 0 && edge < inside * .6, 'Both ends resist instead of feeling like an empty slide');
  assert.equal(worldDragOffset(-240, 1440, 8), -edge);
  assert(Math.abs(worldDragOffset(1e9, 390, 0)) <= 39, 'Edge stretch stays bounded on a phone');
  assert.equal(worldDragOffset(1, 0, 0), 0);
  console.log('PASS: 30/60/120Hz drag damping, bounded/stale release, cancellation, exact reset, reduced motion, flick intent and rail edge resistance.');
}
