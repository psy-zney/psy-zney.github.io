import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import React from "react";
import { PerspectiveCamera, Vector3, Matrix4, Quaternion, Euler } from "three";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Render smoke checks, not a replacement for real-browser layout/interaction QA.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
globalThis.window = {
  location: { hash: "" },
  matchMedia: () => ({ matches: false }),
};
try {
  const { projects, capabilities } = await server.ssrLoadModule(
    "/src/data/portfolio.ts",
  );
  const {
    journey,
    chapterForHash,
    flightGeometry,
    signalSequence,
    advanceSignal,
  } = await server.ssrLoadModule("/src/data/journey.ts");
  for (const chapter of journey) {
    assert.equal(chapterForHash(`#/${chapter.id}`)?.id, chapter.id);
    const { path, stops } = flightGeometry(chapter.points);
    assert(path.startsWith("M"));
    assert.equal(stops[0], 0);
    assert(Math.abs(stops.at(-1) - 1) < 1e-9);
    assert(stops.every((stop, i) => !i || stop >= stops[i - 1]));
  }
  assert.equal(chapterForHash("#/skills/systems")?.id, "skills");
  assert.equal(chapterForHash("#/unmapped"), undefined);
  for (let note = 0; note < 6; note++) {
    let step = 0;
    for (const star of signalSequence(note))
      step = advanceSignal(step, star, note);
    assert.equal(step, 4, "Correct signal must unlock the note");
    assert.equal(
      advanceSignal(2, (signalSequence(note)[2] + 1) % 4, note),
      0,
      "Wrong signal must reset",
    );
  }
  const { IntroPage } = await server.ssrLoadModule(
    "/src/components/IntroPage.tsx",
  );
  const { ScrollPortfolio } = await server.ssrLoadModule(
    "/src/components/ScrollPortfolio.tsx",
  );
  const { VirgoPortfolio } = await server.ssrLoadModule(
    "/src/components/VirgoPortfolio.tsx",
  );
  const { VIRGO_STARS, VIRGO_SUPPORT_STARS, CAMERA_STOPS, createFlightPaths, createCameraComposition } = await server.ssrLoadModule(
    "/src/components/VirgoScene.tsx",
  );
  assert.deepEqual(VIRGO_STARS.map(star => star.name), ["Spica", "Porrima", "Vindemiatrix", "Zavijava"]);
  assert.equal(VIRGO_SUPPORT_STARS.length, 10, "The opening view should include the full supporting constellation");
  assert.equal(new Set([...VIRGO_STARS, ...VIRGO_SUPPORT_STARS].map(star => star.position.join(","))).size, 14);
  assert.equal(CAMERA_STOPS.length, 6);
  const { advanceFlightPosition, flightEase, flightFieldOfView, flightPositionForScroll, flightSample, FLIGHT_MOTION, focusedStarForPosition, navigationDuration, orbitPosition, panelVisibility, scrollOffsetForPosition } = await server.ssrLoadModule("/src/data/virgoFlight.ts");
  const { asteroidLayout, FLIGHT_TRACK_VH, ORBIT_PLANE, orbitRadii, planetRadius, SPACE_LAYOUT } = await server.ssrLoadModule("/src/data/virgoSpace.ts");
  const { TRANSIT_LEGS, transitSample, systemPresence, journeyCameraZ, transitPlanets } = await server.ssrLoadModule("/src/data/virgoTransit.ts");
  const originalStars = [[-5.2, -2.5, 0], [-.6, .85, 0], [3.7, 3.1, 0], [6.35, -2.05, 0]];
  const { OPENING_STARS, OPENING_EDGES, OPENING_HANDOFF, OPENING_CONNECTIONS, openingEdgeProgress, openingStarAppearance, openingScreenPlane, openingPresentation, openingTransition, protectOpeningHandoff } = await server.ssrLoadModule("/src/data/virgoOpening.ts");
  const { FRACTURE_SOUND, fractureSoundSample, VirgoFractureAudio } = await server.ssrLoadModule("/src/data/virgoFractureMedia.ts");
  const { spaceRiftContour, spaceRiftFrame, readingRiftSize } = await server.ssrLoadModule("/src/data/virgoSpaceRift.ts");
  assert.equal(spaceRiftFrame(.5).active, false);
  assert.equal(spaceRiftFrame(1.9).active, false);
  assert.equal(spaceRiftFrame(1.2, true).glow, 0);
  for (const width of [296, 366, 1000]) {
    let previousSpan = 0;
    for (let i = 0; i <= 100; i++) {
      const tear = spaceRiftContour(width, 50, i / 100, 218);
      assert.deepEqual(tear, spaceRiftContour(width, 50, i / 100, 218), "Reversing the tear must retain its ragged contour");
      assert(tear.polygon.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
      const span = tear.top.at(-1).x - tear.top[0].x;
      assert(span >= previousSpan, "The horizontal fissure must grow outward before opening");
      previousSpan = span;
      tear.top.forEach((p, j) => assert(tear.bottom[j].y >= p.y, "The banks must open apart without intersecting"));
      if (i === 100) assert(tear.bottom[96].y - tear.top[96].y > 80, "The opened center must contain the sentence");
    }
  }
  assert.equal(fractureSoundSample(0).active, false);
  assert.equal(fractureSoundSample(2).active, false);
  for (let i = 0; i < 100; i++) {
    const a = fractureSoundSample(.65 + i / 100);
    const b = fractureSoundSample(.65 + (i + 1) / 100);
    assert(b.time >= a.time && Number.isFinite(a.time), "Audio starts must stay within the original clip");
    assert(a.time >= FRACTURE_SOUND.clipStart && a.time <= FRACTURE_SOUND.clipEnd);
  }
  class MediaStub {
    src = ""; currentTime = 0; readyState = 4; seeking = false; error = null;
    style = {}; paused = true; ended = false; playCalls = 0; loadCalls = 0;
    addEventListener() {} removeEventListener() {}
    load() { this.loadCalls++; }
    play() { this.paused = false; this.playCalls++; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute(name) { if (name === "src") this.src = ""; }
  }
  const sound = new MediaStub();
  const fracturePlayer = new VirgoFractureAudio(sound);
  fracturePlayer.update(.2, false, false, false);
  assert.equal(sound.src, "", "Sound must remain unloaded until explicitly enabled");
  fracturePlayer.update(.9, false, false, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sound.playCalls, 1);
  fracturePlayer.update(.92, false, false, true);
  fracturePlayer.update(.91, false, false, true);
  assert.equal(sound.playCalls, 1, "Stopping or reversing inside the fracture must not overlap repeated sound effects");
  fracturePlayer.update(.91, false, false, false);
  assert(sound.paused, "Mute must stop sound immediately");
  fracturePlayer.update(.92, false, false, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sound.playCalls, 2, "An explicit sound toggle must be able to restart the effect");
  fracturePlayer.update(.92, false, true, true);
  assert(sound.paused, "Reduced motion must stop audio while retaining the independent cover");
  fracturePlayer.dispose();
  assert(sound.paused && sound.src === "", "Leaving the page must release media and stop audio");
  const blockedSound = new MediaStub();
  blockedSound.ownerDocument = new EventTarget();
  let allowAudio = false;
  blockedSound.play = function() { this.playCalls++; return allowAudio ? Promise.resolve() : Promise.reject(new Error("NotAllowedError")); };
  const blockedPlayer = new VirgoFractureAudio(blockedSound);
  blockedPlayer.update(.9,false,false,true);
  await new Promise(resolve => setImmediate(resolve));
  blockedPlayer.update(.91,false,false,true);
  assert.equal(blockedSound.playCalls,1,"Blocked autoplay must wait for interaction rather than retry every frame");
  allowAudio = true;
  blockedSound.ownerDocument.dispatchEvent(new Event("pointerdown"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(blockedSound.playCalls,2,"An ordinary page gesture must enable blocked audio without a sound switch");
  blockedPlayer.dispose();
  blockedSound.ownerDocument.dispatchEvent(new Event("pointerdown"));
  assert.equal(blockedSound.playCalls,2,"Leaving the scene must remove its audio gesture listener");
  const { NARRATIVE_BEATS, narrativeEdges, narrativeSample, narrativeTextReveal, mobileNarrativeTop } = await server.ssrLoadModule("/src/data/virgoNarrative.ts");
  assert.equal(narrativeTextReveal(.3), 0, "Text cannot appear before the slit has opened");
  assert.equal(narrativeTextReveal(1), 1);
  for (const [width, height] of [[320, 568], [390, 844], [430, 932], [1280, 720]]) {
    const fit = readingRiftSize(width * .7, 54, width);
    assert(fit.span <= width - 16 && fit.span <= width * .7 + 76, "The tear must fit its text instead of spanning the viewport");
    assert.equal(fit.halfGap, 41);
    for (let seed = 0; seed < 11; seed++) {
      const opening = spaceRiftContour(fit.span, fit.halfGap, 1, seed * 109, fit.tip);
      opening.top.forEach((point, i) => {
        if (Math.abs(point.x) > width * .35) return;
        assert(point.y <= -27 && opening.bottom[i].y >= 27, "The whole wrapped text rectangle must fit inside the opened banks, including letters near the tapered tips");
      });
    }
    for (const bottom of [height * .32, height * .44, height * .50]) {
      const placement = mobileNarrativeTop(height, bottom, 78);
      assert(placement.top >= bottom + 24, "Mobile text must clear the projected star and halo");
      assert(placement.controls >= placement.top + 78 + 22, "Mobile controls must not cover the story sentence");
    }
  }
  const { createRockGeometry, planetType } = await server.ssrLoadModule("/src/data/virgoCelestial.ts");
  assert.deepEqual(OPENING_STARS.slice(0, 4).map(star => star.position), originalStars, "Increasing flight distances must not alter the original opening composition");
  assert.equal(OPENING_STARS.length, 14);
  assert.equal(OPENING_EDGES.length, 16);
  assert(OPENING_EDGES.flat().every(i => i >= 0 && i < OPENING_STARS.length));
  assert(OPENING_CONNECTIONS.arrivals.every(Number.isFinite), "The opening wave must reach every star");
  assert.equal(openingStarAppearance(4, .04), 1);
  assert(OPENING_STARS.every((_, i) => i === 4 || openingStarAppearance(i, .04) === 0), "Only the source star can light up before its wave travels");
  const revealAtWaveTime = time => .04 + .96 * time / OPENING_CONNECTIONS.duration;
  const branchingStar = 1;
  const branchReveal = revealAtWaveTime(OPENING_CONNECTIONS.arrivals[branchingStar] + .2);
  let activeBranches = 0;
  OPENING_EDGES.forEach(([a, b], i) => {
    const neighbor = a === branchingStar ? b : b === branchingStar ? a : -1;
    if (neighbor >= 0 && OPENING_CONNECTIONS.arrivals[neighbor] > OPENING_CONNECTIONS.arrivals[branchingStar]) {
      const fractions = openingEdgeProgress(i, branchReveal);
      const departing = fractions[a === branchingStar ? 0 : 1];
      assert(departing > 0 && departing < 1, "Every outgoing branch must start together when its shared star is reached");
      activeBranches++;
    }
  });
  assert.equal(activeBranches, 4, "Porrima must fan out into four simultaneous branches, including its cross-connections");
  const loopEdge = 7;
  const loopArrival = Math.max(...OPENING_EDGES[loopEdge].map(i => OPENING_CONNECTIONS.arrivals[i]));
  const meeting = openingEdgeProgress(loopEdge, revealAtWaveTime(loopArrival + .1));
  assert(meeting.every(fraction => fraction > 0) && meeting[0] + meeting[1] < 1, "A loop must allow two approaching wave fronts before they meet");
  const previousCoverage = OPENING_EDGES.map(() => 0);
  for (let step = 0; step <= 500; step++) {
    const reveal = .04 + .96 * step / 500;
    OPENING_EDGES.forEach((_, i) => {
      const fractions = openingEdgeProgress(i, reveal);
      const coverage = fractions[0] + fractions[1];
      assert(coverage >= previousCoverage[i] - 1e-9 && coverage <= 1, "Branches must grow without overlapping or retracting");
      previousCoverage[i] = coverage;
      assert.deepEqual(openingEdgeProgress(i, reveal), fractions, "Paused or reversed input must restore deterministic branch positions");
    });
  }
  OPENING_EDGES.forEach((_, i) => assert.deepEqual(openingEdgeProgress(i, 1), [1, 0], "The completed opening draws each edge exactly once"));
  OPENING_STARS.forEach((_, i) => assert.equal(openingStarAppearance(i, 1), 1));
  for (let i = 0; i <= 3000; i++) {
    const layers = openingPresentation(i / 500);
    assert.equal(Number(layers.opening) + Number(layers.journey), 1, "Opening and journey must never draw duplicate constellations during the handoff");
    const transition = openingTransition(i / 500);
    assert(transition.cover >= 0 && transition.cover <= 1);
    if (i / 500 >= OPENING_HANDOFF.covered && i / 500 <= OPENING_HANDOFF.release) assert.equal(transition.cover, 1, "The scene change must stay behind an opaque fracture");
  }
  assert.equal(openingTransition(OPENING_HANDOFF.end).cover, 1);
  assert.equal(openingTransition(0).active, false);
  assert.equal(openingTransition(2).active, false);
  assert.equal(openingTransition(OPENING_HANDOFF.end, true).flare, 0);
  for (const [from, to] of [[0, 6], [6, 0]]) {
    assert.equal(protectOpeningHandoff(from, to), OPENING_HANDOFF.end, "Fast forward and reverse scroll must render the fully concealed swap");
    assert.equal(protectOpeningHandoff(OPENING_HANDOFF.end, to), to, "The concealed swap must not trap scrolling");
  }
  for (const mobile of [false, true]) {
    const paths = createFlightPaths(mobile);
    let previousZ = Infinity;
    for (let step = 0; step <= 1200; step++) {
      const position = step / 200;
      const sample = flightSample(position);
      const cameraPoint = paths[sample.leg].getPointAt(sample.travel);
      assert(cameraPoint.z <= previousZ + 1e-9, "Every chapter must continue along the forward corridor without a backward detour");
      assert.equal(cameraPoint.x, 0); assert.equal(cameraPoint.y, 0);
      assert.equal(flightFieldOfView(position, mobile), mobile ? 49 : 46, "The lens must remain fixed throughout the journey");
      assert.equal(flightFieldOfView(position, mobile, false, .8), mobile ? 49 : 46, "Entering the classroom preserves the lens");
      const focused = focusedStarForPosition(position);
      if (focused !== null) assert(cameraPoint.z > VIRGO_STARS[focused].position[2], "A reading system must stay ahead of the camera while its panel is visible");
      previousZ = cameraPoint.z;
    }
    VIRGO_STARS.forEach(star => { assert.equal(star.position[0],0);assert.equal(star.position[1],0);assert(star.radius>=10); });
    const { targets, framing, direction } = createCameraComposition(mobile);
    for (let step = 0; step <= 1200; step++) {
      const p = step / 200;
      const sample = flightSample(p), cameraPoint = paths[sample.leg].getPointAt(sample.travel);
      const camera = new PerspectiveCamera();
      camera.position.copy(cameraPoint); camera.lookAt(cameraPoint.clone().add(direction));
      const heading = camera.getWorldDirection(new Vector3());
      assert(heading.distanceTo(new Vector3(0,0,-1)) < 1e-9, "The camera must never flip or turn back between reading stations");
    }
    const width = mobile ? 390 : 1280, height = mobile ? 844 : 720;
    let originalProjection;
    for (let step = 0; step <= 100; step++) {
      const position = OPENING_HANDOFF.end * step / 100;
      const sample = flightSample(position);
      const camera = new PerspectiveCamera(flightFieldOfView(position, mobile), width / height, .1, SPACE_LAYOUT.far);
      camera.position.copy(paths[sample.leg].getPointAt(sample.travel));
      camera.lookAt(camera.position.clone().add(direction));
      const offset = framing[sample.leg].clone().lerp(framing[sample.leg + 1], sample.travel);
      camera.setViewOffset(width, height, -offset.x * width / 2, offset.y * height / 2, width, height);
      camera.updateMatrixWorld();
      const plane = openingScreenPlane(camera.fov, mobile, camera.projectionMatrix.elements);
      const projection = OPENING_STARS.map(star => new Vector3(star.position[0] + plane.x, star.position[1] + plane.y, plane.z).applyMatrix4(camera.matrixWorld).project(camera));
      if (!originalProjection) originalProjection = projection;
      projection.forEach((point, i) => assert(Math.hypot(point.x - originalProjection[i].x, point.y - originalProjection[i].y) < 1e-9, "The intro constellation must keep its original screen size and position until the concealed swap"));
    }
    let previousApproach = Infinity;
    for (let step = 0; step <= 100; step++) {
      const position = OPENING_HANDOFF.release + (2 - OPENING_HANDOFF.release) * step / 100;
      const sample = flightSample(position);
      const distance = paths[sample.leg].getPointAt(sample.travel).distanceTo(new Vector3(...VIRGO_STARS[0].position));
      assert(distance <= previousApproach + 1e-9, "The opening handoff must reveal the forward approach");
      previousApproach = distance;
    }
  }
  for (let i = 0; i <= 3000; i++) {
    const position = i / 500;
    const owners = NARRATIVE_BEATS.filter(beat => position >= beat.from && position < beat.to);
    assert(owners.length <= 1, "Scroll narration must never show two sentences at once");
    const sample = narrativeSample(position);
    assert(sample.opacity >= 0 && sample.opacity <= 1 && sample.reveal >= 0 && sample.reveal <= 1);
    assert.equal(sample.index >= 0, owners.length === 1);
    narrativeSample(6 - position);
    assert.deepEqual(narrativeSample(position), sample, "Reverse scrolling must restore the same sentence and rift reveal");
  }
  for (const [index, beat] of NARRATIVE_BEATS.entries()) {
    const midpoint = (beat.from + beat.to) / 2;
    assert.equal(narrativeSample(midpoint).reveal, 1, "A settled reading position must show the complete sentence");
    assert.equal(narrativeSample(beat.from).reveal, 0, "A new sentence starts at a closed aperture");
    assert.equal(narrativeSample(beat.from, true).reveal, 1, "Reduced motion displays the full sentence");
    const samples = Array.from({length: 501}, (_, i) => narrativeSample(beat.from + (beat.to - beat.from) * i / 500));
    for (let i = 499; i >= 0; i--) {
      assert.deepEqual(narrativeSample(beat.from + (beat.to - beat.from) * i / 500), samples[i], "Reverse must retrace the exact opening, without restarting or a queued sentence");
      assert(Math.abs(samples[i + 1].reveal - samples[i].reveal) < .08, "Forward and reverse reveals must remain continuous through sentence boundaries");
    }
    assert.equal(narrativeSample(midpoint).index, index);
    assert.deepEqual(narrativeSample(midpoint), narrativeSample(midpoint), "A stopped wheel must preserve its exact reading state");
  }
  const { NARRATIVE_STOPS, nextNarrativeStop, advanceStoryGesture } = await server.ssrLoadModule("/src/data/virgoNarrative.ts");
  assert.equal(new Set(NARRATIVE_BEATS.map(beat=>beat.effect)).size,5, "Narration must include five distinct cosmic events");
  for (let i=0;i<NARRATIVE_STOPS.length-1;i++) {
    assert.equal(nextNarrativeStop(NARRATIVE_STOPS[i],1),NARRATIVE_STOPS[i+1], "A gentle forward gesture selects exactly one sentence");
    assert.equal(nextNarrativeStop(NARRATIVE_STOPS[i+1],-1),NARRATIVE_STOPS[i], "A reverse gesture selects the preceding sentence");
  }
  assert.equal(nextNarrativeStop(3,1), NARRATIVE_STOPS[6], "A project deep link must advance to a different sentence on its first gesture");
  const firstGesture=advanceStoryGesture({direction:0,at:-Infinity,destination:-1},0,1,0);
  assert(firstGesture.accepted);
  const burst=advanceStoryGesture(firstGesture.gesture,.1,1,80);
  assert(!burst.accepted && burst.gesture.destination===firstGesture.gesture.destination, "A wheel burst cannot queue extra sentences");
  assert(!advanceStoryGesture(burst.gesture,.1,1,900).accepted, "New input waits softly for the reading anchor");
  const reverse=advanceStoryGesture(burst.gesture,.1,-1,100);
  assert(reverse.accepted && reverse.gesture.destination===0, "Reversal must respond during a forward entrance without waiting");
  assert(advanceStoryGesture(firstGesture.gesture,firstGesture.gesture.destination,1,1000).accepted, "The next gentle gesture must advance after arrival");
  assert.equal(nextNarrativeStop(6,1),6);assert.equal(nextNarrativeStop(0,-1),0);
  assert(NARRATIVE_BEATS.every(beat => (beat.eng.match(/[.!?]/g)||[]).length===1), "Each narrative stop must contain one sentence");
  assert(NARRATIVE_BEATS.filter(beat => beat.from >= .68 && beat.to <= 1.82).every(beat => beat.side === "middle"), "Page two narration must be centered");
  assert.equal(new Set(Array.from({ length: 10 }, (_, i) => planetType(i))).size, 6, "The project system must include six distinct planet surfaces");
  const fragment = createRockGeometry(2);
  assert(fragment.boundingSphere.radius > .5 && fragment.boundingSphere.radius < 1.5);
  for (const attribute of ["position", "normal", "color"]) assert([...fragment.getAttribute(attribute).array].every(Number.isFinite), "Asteroid deformation must preserve valid geometry and normals");
  fragment.dispose();
  const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  for (let i = 0; i < originalStars.length; i++) for (let j = i + 1; j < originalStars.length; j++) {
    const gap = distance(VIRGO_STARS[i].position, VIRGO_STARS[j].position);
    assert(gap >= 10 * distance(originalStars[i], originalStars[j]), "Interstellar distances must be at least ten times the previous scene");
    assert(gap > SPACE_LAYOUT.projectOrbits.at(-1) * 2.3, "Expanded systems need empty space between their outer orbits");
  }
  assert(FLIGHT_TRACK_VH[1] <= 300, "The second page must not consume a long interstellar track");
  assert(FLIGHT_TRACK_VH.every(height => height >= 160 && height <= 300), "No section should demand an excessively long scroll track");
  const offsets = FLIGHT_TRACK_VH.reduce((values, height, i) => { if (i < 6) values.push(values.at(-1) + height * 10); return values; }, [0]);
  for (let i = 0; i <= 600; i++) {
    const position = i / 100;
    assert(Math.abs(flightPositionForScroll(scrollOffsetForPosition(position, offsets), offsets) - position) < 1e-9, "Unequal chapter lengths must preserve exact camera progress");
  }
  assert.equal(flightPositionForScroll(-100, offsets), 0);
  assert.equal(flightPositionForScroll(offsets.at(-1) + 10000, offsets), 6);
  for (const rock of asteroidLayout(480)) {
    const radius = Math.hypot(rock.position[0], rock.position[1] / .55);
    assert(radius >= SPACE_LAYOUT.asteroidInner - 1e-9 && radius <= SPACE_LAYOUT.asteroidOuter + 1e-9, "Asteroids must stay inside their belt");
    assert(rock.position.every(Number.isFinite) && rock.scale > 0);
  }
  for (const fps of [30, 60, 120]) {
    let position = 0;
    for (let frame = 0; frame < fps / 2; frame++) position = advanceFlightPosition(position, 3, 1 / fps);
    assert(Math.abs(position - 3 * (1 - Math.exp(-4))) < 1e-9, "Camera follow must not change speed with frame rate");
    let previous = position;
    for (let frame = 0; frame < fps; frame++) {
      position = advanceFlightPosition(position, 1, 1 / fps);
      assert(position <= previous && position >= 1, "Reverse scroll must settle without overshoot");
      previous = position;
    }
  }
  assert(advanceFlightPosition(0, 3, 30) < 1, "Resuming after a long idle frame must not jump to the target");
  const { STORY_PACING, narrativePacing, storyTimeAt, storyPositionAt, advancePacedFlightPosition, storyWheelDelta } = await server.ssrLoadModule("/src/data/virgoPacing.ts");
  for (let i = 0; i <= 600; i++) {
    const p = i / 100;
    assert(Math.abs(storyPositionAt(storyTimeAt(p)) - p) < 1e-9, "Pacing must preserve exact scroll positions in both directions");
  }
  for (let chapter = 0; chapter < 6; chapter++) {
    const duration = storyTimeAt(chapter + 1) - storyTimeAt(chapter);
    assert(duration >= 2 && duration < 9, "Each chapter must retain visible motion without an extended forced wait");
  }
  for (const [index, beat] of NARRATIVE_BEATS.entries()) {
    const {open, close} = narrativeEdges(index);
    const pace = narrativePacing(index);
    assert(storyTimeAt(open) - storyTimeAt(beat.from) >= pace.openSeconds - 1e-9, "A fast wheel burst must leave time to see the aperture open");
    if (beat.to <= 6) {
      assert(storyTimeAt(close) - storyTimeAt(open) >= pace.readSeconds - 1e-9, "A fast wheel burst must leave a readable sentence plateau");
      assert(storyTimeAt(beat.to) - storyTimeAt(close) >= pace.closeSeconds - 1e-9);
    }
  }
  for (const fps of [30, 60, 120]) {
    let position = 0;
    for (let frame = 0; frame < fps * 2; frame++) {
      const next = advancePacedFlightPosition(position, 6, 1 / fps);
      assert(next >= position && storyTimeAt(next) - storyTimeAt(position) <= 1 / fps + 1e-9, "A large input must not skip paced animation phases");
      position = next;
    }
    assert(Math.abs(storyTimeAt(position) - 2) < .001, "Soft pacing must be stable across frame rates");
    const reversed = advancePacedFlightPosition(position, 0, 1 / fps);
    assert(reversed < position, "Reversing input must respond on the first frame, without a timed lock");
  }
  for (const height of [568, 720, 932]) {
    assert.equal(storyWheelDelta(125, 0, 0, height), 125, "Ordinary wheel input must preserve its 1.25 speed");
    assert.equal(storyWheelDelta(1e6, 0, 0, height), height * STORY_PACING.wheelStepVh);
    const fullLead = height * STORY_PACING.wheelLeadVh;
    assert.equal(storyWheelDelta(100, fullLead, 0, height), 0, "A burst must not build an unbounded scroll queue");
    assert(storyWheelDelta(-100, fullLead, 0, height) < 0, "A full forward queue must never block reversing");
    assert(storyWheelDelta(100, fullLead - 20, 0, height) <= 20 + 1e-9);
  }
  const epsilon = .0001;
  assert(flightEase(epsilon) / epsilon < 1e-6 && (1 - flightEase(1 - epsilon)) / epsilon < 1e-6, "Flight starts and ends with a gentle velocity");
  assert(navigationDuration(1) >= 2.5 && navigationDuration(6) > navigationDuration(1));
  for (const mobile of [false, true]) {
    const paths = createFlightPaths(mobile);
    const { targets, framing, direction } = createCameraComposition(mobile);
    const width = mobile ? 390 : 1280, height = mobile ? 844 : 720;
    const stationOwners = [0, 1, 1, 2, 3];
    for (let chapter = 2; chapter <= 6; chapter++) {
      const center = new Vector3(...VIRGO_STARS[stationOwners[chapter - 2]].position);
      assert(center.distanceTo(targets[chapter]) < 1e-9, "Station framing must keep the optical axis on the star");
      const camera = new PerspectiveCamera(mobile ? 49 : 46, width / height, .1, SPACE_LAYOUT.far);
      camera.position.copy(paths[chapter - 1].getPointAt(1));
      camera.lookAt(targets[chapter]);
      camera.setViewOffset(width, height, -framing[chapter].x * width / 2, framing[chapter].y * height / 2, width, height);
      camera.updateMatrixWorld();
      const projected = center.clone().project(camera);
      const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const horizontal = center.clone().add(right).project(camera).distanceTo(new Vector3(projected.x, projected.y, projected.z)) * width;
      const vertical = Math.abs(center.clone().add(up).project(camera).y - projected.y) * height;
      assert(Math.abs(horizontal / vertical - 1) < 1e-8, "A face-on circular ring must keep equal horizontal and vertical pixel radii on both layouts");
      assert(Math.abs(projected.x - framing[chapter].x) < 1e-8 && Math.abs(projected.y - framing[chapter].y) < 1e-8, "Projection shift must place the star beside the reading panel without aiming beside it");
    }
    for (let leg = 0; leg < paths.length; leg++) {
      const wheelStep = 100 / (offsets[leg + 1] - offsets[leg]);
      const departing = flightSample(leg + wheelStep);
      const arriving = flightSample(leg + 1 - wheelStep);
      assert(paths[leg].getPointAt(departing.travel).distanceTo(paths[leg].getPointAt(0)) > 1e-7, "The first wheel increment must advance the fixed camera without a dead range");
      assert(paths[leg].getPointAt(arriving.travel).distanceTo(paths[leg].getPointAt(1)) > 1e-7, "Reverse wheel input must retrace the fixed camera near arrival");
    }
    for (let chapter = 1; chapter < 6; chapter++) {
      const before = flightSample(chapter - epsilon);
      const after = flightSample(chapter + epsilon);
      assert(paths[before.leg].getPointAt(1).distanceTo(paths[after.leg].getPointAt(0)) < 1e-6, "Camera paths must meet exactly at each chapter");
      const nearbyDistance = paths[before.leg].getPointAt(before.travel).distanceTo(paths[after.leg].getPointAt(after.travel));
      assert(nearbyDistance <= epsilon * 1.5 * (paths[before.leg].getLength() + paths[after.leg].getLength()), "Camera movement must remain continuous across chapters");
    }
  }
  for (const mobile of [false, true]) {
    for (const [index, leg] of TRANSIT_LEGS.entries()) {
      assert(journeyCameraZ(leg.from, mobile) - journeyCameraZ(leg.to, mobile) >= (leg.origin < 0 ? 300 : 450), "Each passage must cross the actual corridor rather than animate the lens");
      assert(storyTimeAt(leg.to) - storyTimeAt(leg.from) >= (leg.origin < 0 ? STORY_PACING.approachSeconds : STORY_PACING.transitSeconds) - 1e-9, "Travel must have time to show the passing planets");
      const planets = transitPlanets(index, mobile);
      assert.equal(planets.length, mobile ? 4 : 6);
      assert.deepEqual(planets, transitPlanets(index, mobile), "Passing planets must retain their world coordinates on reversal");
      for (const planet of planets) {
        assert(Math.abs(planet.position[0]) > planet.radius * 2, "Passing planets must leave the flight axis clear");
        assert(planet.position[2] < journeyCameraZ(leg.from, mobile) && planet.position[2] > journeyCameraZ(leg.to, mobile), "Camera must physically pass every transit planet");
      }
      const samples = Array.from({length: 101}, (_, i) => transitSample(leg.from + (leg.to-leg.from)*i/100));
      for (let i = 1; i < 100; i++) {
        const p = leg.from + (leg.to-leg.from)*i/100;
        assert.deepEqual(transitSample(p), samples[i], "Reverse input must retrace the same transit envelope");
        assert.equal(narrativeSample(p).index, -1, "Travel must not compete with a reading sentence");
        assert(systemPresence(leg.origin,p) + systemPresence(leg.destination,p) <= 1.000001, "A departing system must fade before the next system appears");
      }
      assert.equal(transitSample((leg.from+leg.to)/2).envelope, 1);
      for (const p of [leg.from, leg.to]) {
        const derivative = (journeyCameraZ(p+1e-5,mobile)-journeyCameraZ(p-1e-5,mobile))/2e-5;
        assert(Math.abs(derivative) < .001, "The camera must settle gently at both ends of transit");
      }
    }
  }
  // Scroll choreography is reversible; ambient orbit phase is an independent input.
  const forward = Array.from({ length: 601 }, (_, i) => flightSample(i / 100));
  for (let i = 600; i >= 0; i--) {
    assert.deepEqual(flightSample(i / 100), forward[i]);
    for (const key of ["travel", "reveal", "origin", "projects", "outer", "skills", "assembly", "contact", "thrust"]) {
      assert(forward[i][key] >= 0 && forward[i][key] <= 1, `${key} must stay bounded`);
    }
    const visibility = Array.from({ length: 7 }, (_, chapter) => panelVisibility(chapter, i / 100));
    for (let chapter = 2; chapter <= 6; chapter++) {
      if (visibility[chapter] > .02) assert.equal(focusedStarForPosition(i / 100), [0, 1, 1, 2, 3][chapter - 2], "Reading a station must isolate its star and hide neighboring systems");
    }
    assert(visibility.reduce((a, b) => a + b, 0) <= 1.001, "Reading panels must not overlap");
    assert.equal(flightSample(i / 100, true).thrust, 0, "Reduced motion disables speed effects");
    assert.equal(Array.from({ length: 7 }, (_, chapter) => panelVisibility(chapter, i / 100, true)).filter(Boolean).length, 1);
  }
  for (let chapter = 0; chapter <= 6; chapter++) {
    assert.equal(flightSample(chapter).chapter, chapter, "Deep links must land on their chapter");
    assert.equal(panelVisibility(chapter, chapter), 1, "A chapter stop must be readable");
  }
  assert.equal(focusedStarForPosition(0), null, "The opening must retain the complete constellation");
  assert.equal(focusedStarForPosition(1), null);
  assert.equal(flightSample(-1).position, 0);
  assert.equal(flightSample(7).position, 6);
  assert.equal(flightSample(0).reveal < flightSample(.7).reveal, true);
  const { reveal: initialReveal, ...stationaryOpening } = flightSample(0);
  let previousReveal = initialReveal;
  for (const elapsed of [1, 2, 4, 6, FLIGHT_MOTION.openingDuration, 12]) {
    const { reveal, ...sample } = flightSample(0, false, elapsed);
    assert(reveal > initialReveal && reveal >= previousReveal && reveal <= 1, "The constellation must connect automatically while scroll stays at zero");
    assert.deepEqual(sample, stationaryOpening, "Opening assembly must not move the camera or advance the reading chapter");
    previousReveal = reveal;
  }
  assert.equal(previousReveal, 1, "The automatic opening must finish and stay assembled");
  assert.equal(flightSample(0, true).reveal, 1, "Reduced motion shows the completed constellation immediately");
  assert(flightSample(.5, false, 1).reveal >= flightSample(.5).reveal, "Scrolling can still advance assembly ahead of the timer");
  for (let i = 0; i < capabilities.length; i++) {
    for (const assembly of [0, .5, 1]) assert(orbitPosition(i, capabilities.length, 5, true, assembly).every(Number.isFinite));
  }
  for (const mobile of [false,true]) {
    for (const [count,skills,starIndex] of [[4,false,0],[projects.length,false,1],[capabilities.length,true,2]]) {
      for (let i = 0; i < count; i++) {
        const radius = orbitRadii(skills,mobile)[i % (skills ? 2 : 3)];
        for (let elapsed = 0; elapsed <= 80; elapsed++) {
          const point = orbitPosition(i,count,starIndex+2,skills,0,elapsed,mobile);
          const scale = mobile ? .72 : 1.06;
          assert(Math.abs(Math.hypot(point[0],point[1]/ORBIT_PLANE.vertical)-radius)<1e-8,"Phone planets and guides must share the same orbit radius");
          assert(Math.hypot(...point)*scale > VIRGO_STARS[starIndex].radius + planetRadius(i,skills)*scale,"Planet surfaces must clear the star throughout their full orbit on desktop and phones");
        }
      }
    }
  }
  // Verify real complete orbits, including the formerly displaced skills state.
  for (const skills of [false, true]) {
    const count = skills ? capabilities.length : projects.length;
    for (let index = 0; index < count; index++) {
      const radius = (skills ? SPACE_LAYOUT.skillOrbits : SPACE_LAYOUT.projectOrbits)[index % (skills ? 2 : 3)];
      const guide = new Matrix4().compose(new Vector3(), new Quaternion().setFromEuler(new Euler(Math.atan2(ORBIT_PLANE.depth, ORBIT_PLANE.vertical), 0, 0)), new Vector3(1, Math.hypot(ORBIT_PLANE.vertical, ORBIT_PLANE.depth), 1));
      const quadrants = new Set();
      for (const position of skills ? [4.8, 5, 5.17, 5.3] : [2.94, 3, 4.25]) {
        for (let time = 0; time <= 120; time++) {
          const point = new Vector3(...orbitPosition(index, count, position, skills, 0, time));
          const angle = Math.atan2(point.y / ORBIT_PLANE.vertical, point.x);
          const ringPoint = new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0).applyMatrix4(guide);
          assert(point.distanceTo(ringPoint) < 1e-8, "Every planet must stay on its displayed orbit around the star, including first arrival and reverse scroll");
          assert.deepEqual(orbitPosition(index,count,position,skills,0,time), orbitPosition(index,count,position,skills,1,time), "Assembly must not pull a planet away from its orbit");
          assert(Math.hypot(point.x,point.y,point.z) > (skills ? VIRGO_STARS[2] : VIRGO_STARS[1]).radius + 2, "An orbit must clear the stellar surface");
          quadrants.add((point.x >= 0 ? 1 : 0) + (point.y >= 0 ? 2 : 0));
        }
      }
      assert.equal(quadrants.size,4,"Every planet must revolve through all four quadrants while scroll is stopped");
    }
  }
  for (const skills of [false, true]) {
    const count = skills ? capabilities.length : projects.length;
    const position = skills ? 5 : 3;
    const before = orbitPosition(0, count, position, skills, 1, 0);
    const after = orbitPosition(0, count, position, skills, 1, 4);
    assert.notDeepEqual(before, after, "Planets must keep orbiting when scroll is stationary");
    assert(Math.abs(Math.hypot(before[0], before[1] / .55) - Math.hypot(after[0], after[1] / .55)) < 1e-9, "Ambient motion must stay on the displayed orbit");
    assert.deepEqual(orbitPosition(0, count, position, skills, 1, 0), before, "A frozen ambient phase must not drift");
  }
  for (const lang of ["vie", "eng"]) {
    for (const hash of ["", "#/cosmos", "#/home", "#/story", "#/projects", "#/projects-more", "#/skills", "#/contact", "#/project/beatsync", "#/projects/all", "#/cv/web"]) {
      window.location.hash = hash;
      const html = renderToStaticMarkup(React.createElement(VirgoPortfolio, {
        lang, onToggleLang() {}, onEnterWorkspace() {},
      }));
      assert.equal((html.match(/class="virgo-scroll-step"/g) || []).length, 7);
      assert.equal((html.match(/class="virgo-overlay-panel/g) || []).length, 7);
      assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
      assert(html.includes('class="virgo-overlay-panel virgo-cosmos"'));
      assert(!html.includes('<header') && !html.includes('virgo-scroll-rail'), "The top bar and vertical dot rail must be removed");
      assert(html.includes('virgo-constellation-map') && html.includes('aria-label="Virgo"'), "Navigation must use the original Virgo map");
      assert.equal((html.match(/class="virgo-map-star"/g) || []).length,4);
      assert(html.includes('<canvas class="virgo-space-rift"'), "The fracture must be rendered directly on the web");
      assert(!html.includes('<video') && !html.includes('fracture-transition.webm'), "Fracture visuals must never use the reference film");
      assert(html.includes('Open the classroom through Zavijava') || html.includes('Mở phòng học qua sao Zavijava'));
      assert(html.includes("SPICA") && html.includes("PORRIMA") && html.includes("VINDEMIATRIX") && html.includes("ZAVIJAVA"));
      assert.equal((html.match(/class="virgo-project-link"/g) || []).length, 3);
      assert.equal((html.match(/class="virgo-row-star"/g) || []).length >= projects.length, true);
      assert.equal((html.match(/aria-pressed="(?:true|false)"/g) || []).length, capabilities.length);
      assert(!html.includes('virgo-utilities') && !html.includes('virgo-language') && !html.includes('virgo-motion'), "Portfolio must not expose sound, motion or language switches");
      assert(html.includes('data-sound="on"'), "The fracture audio is enabled without a separate switch");
      assert(html.includes(`${projects.length} projects in orbit`) || html.includes(`${projects.length} vệ tinh dự án đang quay`));
      if (hash === "#/project/beatsync") assert(html.includes(projects[0].problem[lang]));
      if (hash === "#/projects/all") {
        assert.equal((html.match(/class="virgo-archive"/g) || []).length, 1);
        for (const item of projects) assert(html.includes(`href="#/project/${item.id}"`));
      }
      assert(!html.includes("undefined") && !html.includes("\ufffd"));
    }
  }
  for (const lang of ["vie", "eng"]) {
    for (const hash of ["", ...projects.map(p => `#/project/${p.id}`), "#/cv/web", "#/cv/mobile"]) {
      window.location.hash = hash;
      const html = renderToStaticMarkup(React.createElement(ScrollPortfolio, {
        lang, onToggleLang() {}, onEnterWorkspace() {},
      }));
      assert.equal((html.match(/<section /g) || []).length, projects.length + 4,
        "Each project needs its own scroll panel, alongside home, story, skills and contact");
      assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
      for (const project of projects) {
        assert(html.includes(`id="work-${project.id}"`));
        assert(html.includes(`href="#/project/${project.id}"`));
      }
      if (hash.startsWith("#/project/")) {
        const project = projects.find(p => hash.endsWith(`/${p.id}`));
        assert(html.includes(project.problem[lang]), "Deep links must render project details");
      }
      assert(!html.includes("undefined") && !html.includes("\ufffd"));
    }
  }
  const { ResumeContent } = await server.ssrLoadModule(
    "/src/components/ResumePage.tsx",
  );
  const { ProjectShelf } = await server.ssrLoadModule(
    "/src/components/ProjectShelf.tsx",
  );
  const ids = new Set(projects.map((p) => p.id));
  assert.equal(ids.size, projects.length, "Project IDs must be unique");
  for (const skill of capabilities) {
    for (const id of skill.projects)
      assert(ids.has(id), `Missing project ${id}`);
  }
  for (const project of projects) {
    assert(
      capabilities.some((skill) => skill.projects.includes(project.id)),
      `${project.id} needs a skill connection`,
    );
    for (const field of [
      "role",
      "headline",
      "summary",
      "problem",
      "decision",
      "takeaway",
    ]) {
      for (const lang of ["vie", "eng"])
        assert(
          project[field][lang].trim(),
          `${project.id}.${field}.${lang} is empty`,
        );
    }
  }
  let rendered = 0;
  for (const lang of ["vie", "eng"]) {
    for (const hash of [
      "",
      ...journey.map((chapter) => `#/${chapter.id}`),
      "#/skills/systems",
      "#/unmapped",
      ...projects.map((p) => `#/project/${p.id}`),
      "#/project/unknown",
      "#/cv/web",
      "#/cv/mobile",
    ]) {
      window.location.hash = hash;
      const html = renderToStaticMarkup(
        React.createElement(IntroPage, {
          lang,
          onToggleLang() {},
          onEnterWorkspace() {},
        }),
      );
      for (const [, id] of html.matchAll(/href="#\/project\/([^"]+)"/g))
        assert(ids.has(id), `Broken project link: ${id}`);
      for (const [, id] of html.matchAll(/href="#\/skills\/([^"]+)"/g))
        assert(
          capabilities.some((skill) => skill.id === id),
          `Broken skill link: ${id}`,
        );
      assert(!html.includes("undefined"), `Undefined content at ${hash}`);
      assert(!html.includes("\ufffd"), `Encoding issue at ${hash}`);
      if (!hash.startsWith("#/cv/"))
        assert.equal(
          (html.match(/<h1[ >]/g) || []).length,
          1,
          `Expected one main heading: ${hash}`,
        );
      if (hash === "") {
        assert.equal(
          (html.match(/class="project-card reveal"/g) || []).length,
          0,
          "Home must remain a separate page, not the full project list",
        );
        for (const chapter of journey.slice(1))
          assert(html.includes(`href="#/${chapter.id}"`));
        assert(
          html.includes('href="#/cv/web"') &&
            html.includes('href="#/cv/mobile"'),
        );
      }
      if (hash === "#/projects") {
        assert.equal(
          (html.match(/class="project-card reveal"/g) || []).length,
          projects.length,
        );
        for (const repo of ["chemistryLAB", "Security", "LuckyFood"]) {
          assert(
            html.includes(`href="https://github.com/psy-zney/${repo}"`),
            `${repo} needs a visible GitHub link`,
          );
        }
      }
      if (chapterForHash(hash)) {
        const page = chapterForHash(hash);
        for (const other of journey.filter((item) => item.id !== page.id)) {
          assert(
            !html.includes(`id="${other.id}"`),
            `Other chapter ${other.id} leaked into ${page.id}`,
          );
        }
        assert(
          html.includes("signal-dialog"),
          "Discovery interaction must be available",
        );
        assert(
          !html.includes("Một cậu bé may mắn") && !html.includes("A lucky boy"),
          "Personal note must remain concealed until discovery",
        );
      }
      if (hash === "#/project/unknown" || hash === "#/unmapped")
        assert(html.includes("404 / LOST IN SPACE"));
      rendered++;
    }
    const shelf = renderToStaticMarkup(
      React.createElement(ProjectShelf, { lang, onClose() {} }),
    );
    assert.equal(
      (shelf.match(/href="#\/project\//g) || []).length,
      projects.length,
    );
  }
  const roomModel = await readFile(new URL("../public/model/main.glb", import.meta.url));
  assert.equal(roomModel.toString("ascii", 0, 4), "glTF", "The restored room must have its original model available");
  assert.equal(roomModel.readUInt32LE(4), 2);
  assert.equal(roomModel.readUInt32LE(8), roomModel.length, "The complete GLB must be retained");
  const roomScene = JSON.parse(roomModel.toString("utf8", 20, 20 + roomModel.readUInt32LE(12)));
  assert(roomScene.nodes.length > 100 && roomScene.meshes.length > 100, "Retain the original furnished room geometry");
  assert(
    (await stat(new URL("../public/img/chemistry-lab-3d.png", import.meta.url)))
      .size > 100_000,
  );
  for (const file of [
    "Le_Quang_Khanh_CV_Web_FullStack.md",
    "Le_Quang_Khanh_CV_Mobile.md",
  ]) {
    const content = await readFile(
      new URL(`../public/file/${file}`, import.meta.url),
      "utf8",
    );
    const html = renderToStaticMarkup(
      React.createElement(ResumeContent, { content }),
    );
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert(
      html.includes("<table>") &&
        html.includes("<ul>") &&
        html.includes("mailto:lequangkhanh295@gmail.com"),
    );
  }
  const unsafe = renderToStaticMarkup(
    React.createElement(ResumeContent, {
      content: "# CV\n[bad](javascript:alert)\n<script>alert(1)</script>",
    }),
  );
  assert(!unsafe.includes('href="javascript:') && !unsafe.includes("<script>"));
  console.log(
    `PASS: 20 Virgo scrollytelling renders, 26 scroll portfolio renders, ${rendered} legacy bilingual route renders, ${projects.length} projects, both CVs, original GLB workspace, and safe Markdown rendering.`,
  );
} finally {
  await server.close();
  delete globalThis.window;
}
