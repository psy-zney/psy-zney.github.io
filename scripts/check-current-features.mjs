import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import ts from 'typescript';

// Behavior and integration checks for the current build. Visual QA lives in check-ui.mjs.
export async function checkCurrentFeatures(server) {
  const {nebulaDustParticle}=await server.ssrLoadModule('/src/data/nebulaDust.ts');
  for(let i=0;i<30;i++)for(const time of [3.4,4.1,5.2]){
    const a=nebulaDustParticle(i,time),b=nebulaDustParticle(i,time+.015);
    assert(Object.values(a).every(Number.isFinite),'Every nebula particle stays finite at every depth');
    if(Math.abs(a.depth-b.depth)<.2)assert(Math.hypot(b.x,b.y)>Math.hypot(a.x,a.y),'Forward travel moves dust outward along the spiral');
    const rewind=nebulaDustParticle(i,(time+.25)-.25);
    assert(Math.hypot(rewind.x-a.x,rewind.y-a.y)<1e-10,'Backward samples restore the exact dust orbit');
  }
  const nebulaAsset=await sharp('public/img/fx/wormhole-nebula-v1.webp').metadata();
  assert(nebulaAsset.width>=1536&&nebulaAsset.height>=768,'The tunnel uses an authored, detailed nebula wall texture');
  const {worldPortalPose}=await server.ssrLoadModule('/src/data/worldsConstellation.ts');
  for(let selected=0;selected<9;selected++)for(let i=0;i<9;i++){
    const pose=worldPortalPose(i,selected);
    if(i===selected)assert.deepEqual([pose.x,pose.y,pose.z,pose.pitch,pose.yaw,pose.roll],[0,0,0,0,0,0],'Every chosen world advances to the same clear focal plane');
    else{
      assert(pose.z< -400&&pose.opacity<1,'Both visited and upcoming portals remain behind the selected world');
      const other=worldPortalPose(i,(selected+1)%9===i?(selected+2)%9:(selected+1)%9);
      assert.deepEqual([pose.x,pose.y,pose.z],[other.x,other.y,other.z],'Background worlds keep their spatial address across scroll steps');
    }
  }
  const {peripheralMask,cherenkovAngle,whiteHoleParticle}=await server.ssrLoadModule('/src/data/portalOptics.ts');
  for(const aspect of [.46,1,1.6,2.4])for(const u of [.45,.5,.55])for(const v of [.45,.5,.55])assert.equal(peripheralMask(u,v,aspect),0,'Central content has exactly zero optical displacement');
  assert(peripheralMask(.99,.99,1.6)>.99,'Optics concentrate at screen edges');
  assert.equal(cherenkovAngle(.5,1.3),0,'Cherenkov emission is absent below the medium threshold');
  assert(Math.abs(Math.cos(cherenkovAngle(.9,1.4))-1/(.9*1.4))<1e-12,'Cone angle obeys cos(theta)=1/(n beta)');
  for(let layer=0;layer<3;layer++)for(let i=0;i<20;i++){
    const early=whiteHoleParticle(i,.3,layer),late=whiteHoleParticle(i,.6,layer);
    assert(Math.hypot(late.x,late.y)>Math.hypot(early.x,early.y),'Forward ejection moves outward in every dust layer');
    const rewind=whiteHoleParticle(i,.6-.3,layer);
    assert(Math.hypot(rewind.x-early.x,rewind.y-early.y)<1e-12,'Rewinding time exactly restores dust positions');
  }
  const { accretionFilament, singularitySample, singularityView, SINGULARITY_DURATION, SINGULARITY_ORBIT_END } = await server.ssrLoadModule('/src/data/singularityMotion.ts');
  assert.deepEqual([singularityView(0).x,singularityView(0).y,singularityView(0).depth],[0,0,1], 'The local spiral starts at the Contact view');
  let previousDepth=1;const positions=[];
  for(let i=0;i<=100;i++){
    const view=singularityView(SINGULARITY_ORBIT_END*i/100);
    assert(view.depth<=previousDepth+1e-9,'The spiral continues inward without backing away from the hole');
    previousDepth=view.depth;positions.push(view);
  }
  assert(positions.at(-1).angle-positions[0].angle>Math.PI*2,'The observer completes a full orbit before entering');
  assert(Math.max(...positions.map(p=>p.x))>.08 && Math.min(...positions.map(p=>p.x))<-.08,'The camera moves to both sides of the hole');
  assert(Math.abs(positions.at(-1).x)<1e-8&&Math.abs(positions.at(-1).y)<1e-8&&positions.at(-1).bank===0,'The local orbit meets the throat without residual bank');
  for (let i = 0; i < 24; i++) {
    const early = accretionFilament(i, .3), late = accretionFilament(i, 1.5);
    assert(late.radius < early.radius * .12, 'Orbiting matter contracts towards the horizon');
    assert(late.angle - early.angle > Math.PI * 2, 'Matter completes an orbit before capture');
    assert(late.width < early.width * .3, 'Tidal stretch thins material towards the core');
    const head = accretionFilament(i, 1.4, 0), tail = accretionFilament(i, 1.4, 1);
    assert(tail.radius > head.radius * 1.5, 'The tail lags the plunging head to form a curved filament');
  }
  for (let t = 0; t <= SINGULARITY_DURATION; t += .025) {
    const forward = singularitySample(t, 1), backward = singularitySample(SINGULARITY_DURATION - t, -1);
    assert(Math.abs(forward.t - backward.t) < 1e-9, 'Rollback restores the same passage coordinate');
    assert.equal(forward.phase, backward.phase, 'Both directions share the same three visual phases');
  }
  const { renderPixelRatio, requestedPixelRatio, blackHoleResolution, RenderCadence } = await server.ssrLoadModule('/src/data/renderQuality.ts');
  assert.equal(requestedPixelRatio(1, true), 1.5, 'Manual High supersamples standard displays');
  assert.equal(requestedPixelRatio(1, false), 1, 'Opting out of preferred sharp sampling keeps native density');
  assert.equal(requestedPixelRatio(2, true), 2, 'Retina keeps its native sharpness');
  assert.equal(renderPixelRatio(1440, 900, requestedPixelRatio(1, true)), 1.5);
  assert(3840 * 2160 * renderPixelRatio(3840, 2160, requestedPixelRatio(1, true)) ** 2 <= 16_600_001, 'Supersampling still respects the pixel budget');
  assert.equal(renderPixelRatio(1440, 900, 2), 2, 'Retina scenes use native physical pixels');
  assert.equal(renderPixelRatio(390, 844, 3), 3, 'High-density phones retain their native sharpness');
  assert.equal(renderPixelRatio(3840, 2160, 1), 1, '4K screens are not downscaled');
  for (const [w, h, native] of [[3840, 2160, 2], [7680, 4320, 3], [390, 844, 4]]) {
    const density = renderPixelRatio(w, h, native);
    assert(density <= native && density <= 3 && w * h * density ** 2 <= 16_600_001, 'Native sharpness respects a bounded GPU allocation');
    assert(w * density <= 8192 && h * density <= 8192, 'Very wide buffers stay within dimension limits');
  }
  assert(renderPixelRatio(390, 844, 3, 'low') <= 1, 'Economy mode remains available');
  assert(renderPixelRatio(1440, 900, 2, 'high', 1, 1024) * 1440 <= 1024, 'Device texture limits take precedence');
  assert.equal(blackHoleResolution(1900, 'high', false), 2048, 'Large black holes retain detail beyond the old 1280 limit');
  assert.equal(blackHoleResolution(1900, 'high', true), 1280, 'Orbiting keeps a lighter ray cache until the view settles');
  assert(blackHoleResolution(1900, 'high', false, 1, 512) <= 512, 'Black-hole targets respect smaller GPU limits');
  let time = 0;
  const cadence = new RenderCadence();
  const frames = (count, ms, active = true) => { for (let i = 0; i < count; i++) cadence.sample(time += ms, active); };
  frames(120, 1000 / 60); assert.equal(cadence.scale, 1, 'Healthy frames preserve maximum detail');
  frames(20, 50); assert.equal(cadence.scale, 1, 'A brief loading stall cannot lower quality');
  frames(120, 50); assert(cadence.scale < 1 && cadence.scale >= .6, 'Sustained poor cadence lowers resolution');
  frames(2400, 1000 / 60); assert.equal(cadence.scale, 1, 'Sustained recovery restores full detail');
  frames(120, 100, false); frames(30, 1000 / 60); assert.equal(cadence.scale, 1, 'Paused and hidden time cannot penalize quality');
  frames(20, 1000); assert.equal(cadence.scale, 1, 'Background throttling is not treated as slow GPU frames');
  const { introFrame, INTRO_CAPTIONS, INTRO_DURATION, INTRO_ASSEMBLY_DURATION, introConstellationFrame, advanceIntroScroll, introInputTarget, introScrollResponse, introPortalFormation, introPortalShot, introCaptionInk, introCaptionPoint, introCaptionGlyphU, introTunnelView, introWarpPoint, introVortexAngle, INTRO_TUNNEL_GRID, INTRO_EXIT_Z } = await server.ssrLoadModule('/src/data/virgoIntro.ts');
  assert.equal(introConstellationFrame(0).stars[1], 1, 'The constellation starts from the central yellow star');
  assert.equal(introConstellationFrame(0).stars.filter(amount => amount > .1).length, 1, 'Only the central star is visible before connections spread');
  assert(introConstellationFrame(0).edges.every(([a, b]) => a + b === 0), 'Connections are drawn progressively instead of appearing fully connected');
  assert(introConstellationFrame(2.4).edges.some(([a, b]) => a + b > 0 && a + b < 1), 'A branching wave is visible before the constellation is complete');
  assert(introConstellationFrame(INTRO_ASSEMBLY_DURATION).stars.every(amount => amount === 1));
  assert(introConstellationFrame(INTRO_ASSEMBLY_DURATION).edges.every(([a, b]) => a + b === 1), 'Every original connection survives the restored intro');
  assert.equal(INTRO_DURATION, 7.8, 'The intro scroll coordinate spans opening, entry and wall reading; it is not an autoplay duration');
  assert.equal(introFrame(0).z, 1000);
  assert.equal(introPortalFormation(0).charge + introPortalFormation(0).seam + introPortalFormation(0).rim, 0, 'Standing still starts with the unbroken constellation');
  assert(introPortalFormation(.95).aspect < .15, 'Creating space begins with a tall plasma tear, not a miniature circular portal');
  assert(introPortalShot(.2).opacity > .9 && introPortalShot(.2).head < 1, 'One energy shot travels before the aperture opens');
  assert.equal(introPortalFormation(.2).rim, 0, 'The portal waits for the shot to hit');
  assert.equal(introPortalShot(.42).head, 1);
  assert.equal(introPortalShot(.42).impact, 1, 'The shot ignites a local impact at its endpoint');
  assert(introPortalFormation(.6).rim > 0, 'Plasma opens immediately after the hit');
  let previousShotHead = 0;
  const { introPortalShotProjection } = await server.ssrLoadModule('/src/data/virgoIntro.ts');
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    let previousHeadX = Infinity;
    for (let p = 0; p <= .6; p += .01) {
      const projection = introPortalShotProjection(width, height, { x: width * .48, y: height * .41 }, p);
      assert.equal(projection.x, width * .48);
      assert.equal(projection.y, height * .41);
      assert.equal(projection.headY, projection.y, 'The shot never rises from the bottom');
      assert.equal(projection.tailY, projection.y);
      assert(projection.headX <= previousHeadX && projection.tailX >= projection.headX && projection.headX >= projection.x, 'Perspective projects the single shaft toward the core as it travels along Z');
      assert(projection.headRadius <= 1.5 && projection.tailRadius <= 3 && projection.impactRadius <= 9, 'Neither the beam nor its impact can become a large glowing sphere');
      if (p >= .42) assert.equal(projection.headX, projection.x, 'The shot hits the core precisely');
      previousHeadX = projection.headX;
    }
  }
  for (let p = 0; p < 8; p += .01) {
    const shot = introPortalShot(p);
    assert(shot.head >= previousShotHead && shot.tail <= shot.head, 'A single projectile follows one forward path without repeating');
    assert(shot.opacity >= 0 && shot.opacity <= 1 && shot.impact >= 0 && shot.impact <= 1);
    if (p > .78 || p === 0) assert.equal(shot.opacity + shot.impact, 0, 'The shot is absent at rest, once the portal opens and throughout flight');
    assert.deepEqual(shot, introPortalShot(p), 'Reverse travel restores the same projectile position and impact');
    previousShotHead = shot.head;
  }
  assert(introPortalFormation(2.05).aspect > .6 && introPortalFormation(2.05).aspect < 1, 'The tear opens gradually under scroll');
  assert.equal(introPortalFormation(2.75).aspect, 1, 'The portal finishes opening before forward flight');
  let previousFormation = introPortalFormation(0);
  for (let p = .01; p <= 2.75; p += .01) {
    const formation = introPortalFormation(p);
    assert.equal(formation.charge + formation.seam + formation.crack, 0, 'Glass facets, lightning and the fracture front stay absent throughout opening and reverse');
    assert(formation.rim >= previousFormation.rim, 'The plasma fades in continuously from the first scroll');
    assert.equal(introFrame(p).z, 1000, 'The observer stands still while creating the portal');
    assert(formation.aspect >= previousFormation.aspect && formation.extent >= previousFormation.extent, 'The opening geometry grows continuously and reverses with scroll');
    assert.deepEqual(formation, introPortalFormation(p), 'Returning to a scroll position restores the exact tear geometry');
    previousFormation = formation;
  }
  for (const caption of INTRO_CAPTIONS) assert.equal(introFrame(caption.pass).z, caption.z, 'Wall lettering has a fixed physical position along the flight');
  assert.deepEqual(INTRO_CAPTIONS.map(caption => caption.side), [-1, 1], 'Read the left wall first, then the right wall');
  assert.equal(new Set(INTRO_CAPTIONS.map(caption => caption.effect)).size, 2, 'Wall ink has two different charging effects');
  for (let index = 0; index < 2; index++) for (const u of [0, .25, .5, .75, 1]) {
    const far = introCaptionInk(introFrame(3.9), index, u), near = introCaptionInk(introFrame(INTRO_CAPTIONS[index].pass), index, u);
    assert(far >= .48 && near <= 1 && near >= far, 'Ink already exists on the distant wall and gains light as it approaches');
    assert.equal(far, introCaptionInk(introFrame(3.9), index, u), 'Reversing restores the exact wall ink');
  }
  assert.equal(introFrame(INTRO_DURATION).z, -4401);
  assert(introFrame(INTRO_DURATION).exitDepth < 0, 'The camera crosses the exit plane before the overlay unmounts');
  assert.equal(INTRO_TUNNEL_GRID.visible, false, 'The cylinder grid is a placement guide, not a visible wireframe');
  for (const time of [0, 2, 30, 600]) {
    assert.equal(introVortexAngle(.4, time), introVortexAngle(.9, time), 'The lip and wall share one angular phase, including long idle');
    assert(Math.abs(introVortexAngle(1, time + 1) - introVortexAngle(1, time) - .1) < 1e-10, 'The common swirl stays gentle and constant');
  }
  const { liquidNoise, liquidPigment, liquidTextureData } = await server.ssrLoadModule('/src/components/liquidSurface.ts');
  assert.equal(liquidTextureData().byteLength, 128 * 128 * 4, 'Liquid detail is a single cached 64 KiB field');
  for (const x of [-2.3, 0, .7, 3.99, 15.98]) for (const y of [-.4, .3, 5.7]) {
    assert(Math.abs(liquidNoise(x, y) - liquidNoise(x + 16, y)) < 1e-12, 'The liquid field wraps continuously');
    assert(Math.abs(liquidNoise(x, y) - liquidNoise(x + .0001, y)) < .001, 'Liquid detail has smooth spatial derivatives');
    assert(Object.values(liquidPigment(x, y)).every(Number.isFinite), 'Canvas recovery material contains no invalid samples');
    const pigment = liquidPigment(x, y);
    assert(pigment.b > pigment.r && pigment.b > pigment.g, 'Canvas recovery keeps the violet/indigo nebula palette');
  }
  for (const opening of [0, .2, .6, 1]) for (const time of [0, 2, 40, 120]) {
    for (const [x, y] of [[100, 0], [621, 350], [-40, 800]]) {
      assert.deepEqual(introWarpPoint(x, y, { x: 621, y: 350 }, 500, opening, time), { x, y }, 'Stars and constellation connections stay fixed throughout opening, idle and reverse');
    }
  }
  const { introAperture, drawIntroExit } = await server.ssrLoadModule('/src/components/virgoIntroTunnel.ts');
  let distantExitPaints = 0;
  const closedExitContext = { save() {}, restore() {}, fillRect() { distantExitPaints++; }, createRadialGradient() { return { addColorStop() {} }; } };
  for (const p of [3.9, 4.7, 5.8, 6.9, 7.1]) drawIntroExit(closedExitContext, 1242, 715, p, 12);
  assert.equal(distantExitPaints, 0, 'The distant exit never paints a black cover over the liquid vanishing point');
  const maturePortal = introAperture(1242, 715, 2.75, { x: 600, y: 300 });
  const { quantumEdge, quantumAperturePath, drawQuantumCorona } = await server.ssrLoadModule('/src/components/introQuantumPortal.ts');
  for (const aspect of [.035, .15, .65, 1]) {
    const points = [];
    quantumAperturePath({ beginPath() {}, moveTo(x, y) { points.push([x, y]); }, lineTo(x, y) { points.push([x, y]); }, closePath() {} }, 621, 357.5, 140, aspect);
    assert(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), 'The slit and mature tear have finite projected edges');
    const width = Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]));
    const height = Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]));
    assert(Math.abs(width / height / aspect - 1 / .9) < .12, 'The opening widens in its front-facing plane without a perspective tilt');
  }
  for (let angle = -Math.PI; angle < Math.PI; angle += .04) {
    assert(Math.abs(quantumEdge(angle) - quantumEdge(angle + Math.PI * 2)) < 1e-10, 'The torn lip joins continuously around the aperture');
    assert(quantumEdge(angle) > .32 && quantumEdge(angle) < .38, 'Ragged edges leave a clear physical passage');
  }
  // Recovery must obey the same opening fade, including a fully closed lip.
  for (const opacity of [0, .15, 1]) {
    const alphas = [], stack = [];
    const recovery = { canvas: { width: 390 }, globalAlpha: opacity,
      beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, scale() {},
      save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop(); },
      stroke() { alphas.push(this.globalAlpha); } };
    drawQuantumCorona(recovery, 180, 12);
    assert(alphas.length > 100 && alphas.every(a => a >= 0 && a <= opacity), 'Canvas recovery respects the scroll-controlled opacity instead of flashing at full brightness');
  }
  assert.equal(maturePortal.x, 621); assert.equal(maturePortal.y, 357.5, 'The created opening settles directly ahead of the observer');
  const approachingPortal = introAperture(1242, 715, 3.1, { x: 600, y: 300 });
  assert.equal(maturePortal.worldRadius, approachingPortal.worldRadius, 'The mature entrance keeps its physical size while the camera advances');
  assert(approachingPortal.depth < maturePortal.depth);
  const view = introTunnelView(1242, 715), patchFrame = introFrame(4);
  for (let index = 0; index < INTRO_CAPTIONS.length; index++) {
    const first = introCaptionPoint(view, patchFrame, index, 0, .5), last = introCaptionPoint(view, patchFrame, index, 1, .5);
    assert(Math.abs(Math.abs(first.depth - last.depth) - 1500) < 1e-8, 'Every word baseline follows the flight direction, not a circumferential ring');
    assert(first.depth < last.depth, 'The first word is near the viewer and the sentence recedes on both walls');
    for (const [from, to] of [[0, .2], [.3, .5], [.8, 1]]) {
      const left = introCaptionPoint(view, patchFrame, index, introCaptionGlyphU(index, from, to, 0), .5);
      const right = introCaptionPoint(view, patchFrame, index, introCaptionGlyphU(index, from, to, 1), .5);
      assert(left.x < right.x, 'Each word keeps upright, left-to-right glyphs on either wall');
    }
  }
  assert.equal(introFrame(1).charge, 0, 'The constellation never contracts into the core');
  assert.equal(introFrame(2.75).z, 1000, 'The vortex opens before the next scroll enters it');
  assert.equal(introFrame(2.75).tear, 1);
  assert.equal(introFrame(4).streak, 0, 'The tunnel contains wall dust rather than star streaks');
  let previousIntroZ = 1000;
  let previousArrivalSpeed = 0;
  let previousVelocity = 0;
  for (let i = 0; i <= INTRO_DURATION * 1000; i++) {
    const frame = introFrame(i / 1000);
    assert(frame.z <= previousIntroZ + 1e-6, 'The camera always flies forward through the tear');
    assert.equal(frame.x, 0); assert.equal(frame.y, 0, 'The intro never swerves or reverses its heading');
    const velocity = (previousIntroZ - frame.z) * 1000;
    assert(velocity < 1200 && Math.abs(velocity - previousVelocity) < 5, 'Camera displacement changes smoothly along the scroll coordinate');
    previousVelocity = velocity;
    if (i > 7250) {
      const speed = previousIntroZ - frame.z;
      assert(speed * 1000 > 1000 && speed >= previousArrivalSpeed - 1e-6, 'The camera continues through the exit without stopping for a scene fade');
      assert.equal(frame.opacity, 1, 'Only the exit opening reveals Home; the full screen never fades');
      assert(frame.z - INTRO_EXIT_Z < 650, 'The exit plane is close during the final approach');
      previousArrivalSpeed = speed;
    }
    previousIntroZ = frame.z;
  }
  assert(introInputTarget(0, 0, 12 * .0045) > 0 && introInputTarget(0, 0, 12 * .0045) < .06, 'A light wheel still opens only a small amount');
  assert(introInputTarget(0, 0, 120 * .0045) > .30, 'One normal wheel gesture opens about twice the previous amount');
  assert(introInputTarget(0, .2, 100) <= .85, 'Wheel bursts keep a bounded lead rather than queue a full opening');
  assert(introInputTarget(1, 1.2, -.05) < 1, 'Reverse input drops the pending forward lead');
  assert(Math.abs((introInputTarget(1, 1, .05) - 1) + (introInputTarget(1, 1, -.05) - 1)) < 1e-9, 'Opening input has identical sensitivity in both directions');
  for (const p of [2.75, 4.4]) assert(Math.abs(introScrollResponse(p - .00001).speed - introScrollResponse(p + .00001).speed) < .00001, 'Opening and tunnel speeds blend without a sudden step');
  for (const fps of [30, 60, 120]) {
    let opening = { seconds: 0, velocity: 0 };
    for (let frame = 0; frame < fps; frame++) {
      const destination = introInputTarget(opening.seconds, opening.seconds, 100);
      opening = advanceIntroScroll(opening.seconds, opening.velocity, destination, 1 / fps);
      assert(opening.velocity <= 1.9 + 1e-9, 'The quicker opening retains its velocity limit');
    }
    assert(opening.seconds > 1.5 && opening.seconds < 1.9, 'The opening responds sooner while retaining a controlled pace');
    let playback = { seconds: 4, velocity: 0 };
    for (let i = 0; i < fps; i++) {
      const next = advanceIntroScroll(playback.seconds, playback.velocity, 3.6, 1 / fps);
      assert(Math.abs(next.seconds - playback.seconds) <= 2 / fps + 1e-9, 'Scroll input never jumps the tunnel position');
      assert(next.seconds >= 3.6 && next.seconds <= 4, 'A reverse gesture cannot overshoot its scroll destination');
      playback = next;
    }
    assert(Math.abs(playback.seconds - 3.6) < .002, 'The intro follows its scroll destination at every refresh rate');
    assert.equal(advanceIntroScroll(4, 0, 4, 1 / fps).seconds, 4, 'No scroll means no automatic flight');
    assert(advanceIntroScroll(4, 0, 4.4, 30).seconds <= 4.015, 'A background stall cannot skip the flight');
    assert(advanceIntroScroll(4, 1.5, 3.8, 1 / fps).seconds < 4, 'Reverse input cancels residual forward momentum on the first frame');
    assert(advanceIntroScroll(4, -1.5, 4.2, 1 / fps).seconds > 4, 'Forward reversal has the same immediate response');
  }
  for (const p of [3.9, 4.7, 5.8, 6.9, 7.1]) assert.equal(introFrame(p).exitReveal, 0, 'The liquid stays opaque while wall text passes; Home opens only near the exit');
  assert(introFrame(7.5).exitReveal > 0 && introFrame(7.5).exitReveal < 1, 'Only the near exit reveals the destination');
  assert.equal(introFrame(INTRO_DURATION).exitReveal, 1);
  const { showcaseProducts, showcaseIndexForHash } = await server.ssrLoadModule('/src/data/productShowcase.ts');
  const { projects } = await server.ssrLoadModule('/src/data/portfolio.ts');
  const { ProductShowcase } = await server.ssrLoadModule('/src/components/ProductShowcase.tsx');
  const { VirgoPortfolio } = await server.ssrLoadModule('/src/components/VirgoPortfolio.tsx');
  const { WavePageLoader } = await server.ssrLoadModule('/src/components/WavePageLoader.tsx');
  const { VirgoSceneBoundary } = await server.ssrLoadModule('/src/components/VirgoSceneFallback.tsx');
  const { advanceShowcaseMotion, showcaseWheelTarget, showcaseChapterTransition, readingOrbitAngle, readingOrbitPoint } = await server.ssrLoadModule('/src/data/virgoExperienceMotion.ts');
  for (const step of [300, 880, 1400]) for (const fps of [30, 60, 120]) {
    let state = { x: step, target: step, velocity: 0 };
    for (let frame = 0; frame < fps * 2; frame++) {
      const target = showcaseWheelTarget(1200, state.target, state.x, step, step * 8);
      assert(target - state.x <= step * .32 + 1e-8, 'Wheel bursts cannot queue multiple worlds');
      const next = advanceShowcaseMotion(state.x, target, state.velocity, 1 / fps, 0, step * 8, 'wheel', false, step);
      assert(Math.abs(next.velocity) <= step * .8 + 1e-8, 'Wheel travel has a viewport-independent world speed limit');
      assert(Math.abs(next.velocity - state.velocity) <= step * 3 / fps + 1e-8, 'Repeated rolls do not inject velocity spikes');
      state = next;
    }
    const reverse = showcaseWheelTarget(-120, state.target, state.x, step, step * 8);
    assert(reverse < state.x, 'Reversing drops queued forward wheel travel');
    const reversed = advanceShowcaseMotion(state.x, reverse, state.velocity, 1 / fps, 0, step * 8, 'wheel', false, step);
    assert(reversed.x < state.x, 'The first reverse frame brakes and travels back');
    for (let i = 0; i < fps * 3; i++) state = advanceShowcaseMotion(state.x, state.target, state.velocity, 1 / fps, 0, step * 8, 'wheel', false, step);
    assert.equal(state.x, state.target, 'Stopping input settles without automatic cruise');
    assert.equal(showcaseWheelTarget(120, step, step, step, step * 8), showcaseWheelTarget(12000, step, step, step, step * 8), 'An anomalous delta cannot skip a world');
  }
  assert.deepEqual(introScrollResponse(0), introScrollResponse(7), 'Entering the tunnel never increases wheel sensitivity or speed');
  const { straightFlightPose, TRANSIT_LEGS, TRANSIT_SCENARIOS, createTransitScenarios } = await server.ssrLoadModule('/src/data/virgoTransit.ts');
  const { solarPassageSample, cylinderRevealSample, showcaseRingTurn, showcaseAngularStep, SHOWCASE_TURN, SOLAR_PASSAGE } = await server.ssrLoadModule('/src/data/solarShowcaseMotion.ts');
  const { tunnelStation, tunnelVisibility, tunnelPortal, tunnelCrossing, tunnelWorldBlend, portalLightning, portalPreviewPresence } = await server.ssrLoadModule('/src/data/showcaseTunnel.ts');
  const { showcaseScreenPoint, SHOWCASE_SCREEN_STRIPS } = await server.ssrLoadModule('/src/data/showcaseScreen.ts');
  const { chapterReadingPosition, narrativeSample, narrativeRevealStyle, contactPresence, NARRATIVE_BEATS } = await server.ssrLoadModule('/src/data/virgoNarrative.ts');
  assert.deepEqual(NARRATIVE_BEATS.slice(3, 8).map(beat => beat.side), ['left', 'left', 'right', 'left', 'right'], 'Every reading pair starts on the left');
  assert.equal(new Set([3, 4, 5, 6, 7].map(narrativeRevealStyle)).size, 4, 'Narrative ink uses four scroll-driven reveal modes');
  for (const reduced of [false, true]) for (const p of [5.94, 5.98, 6]) assert.equal(contactPresence(p, reduced), 1, 'Contact stays visible through the endpoint');
  assert.equal(contactPresence(5.8), 0);
  const stellarEffects = await server.ssrLoadModule('/src/data/virgoStellarEffects.ts');
  const { stellarProminence, prominenceSample, prominenceTiming } = stellarEffects;
  assert(!('supernovaSample' in stellarEffects) && !('stellarEmission' in stellarEffects), 'The removed explosion must not dissolve the last star');
  for (let index = 0; index < 6; index++) {
    const arc = stellarProminence(index, 12);
    assert(arc.every(point => point.every(Number.isFinite)));
    assert(Math.abs(Math.hypot(...arc[0]) - 12 * 1.015) < 1e-8);
    assert(Math.hypot(...arc[16]) > 12 * 1.2, 'Prominence loops rise above the actual photosphere');
    assert(Math.abs(Math.hypot(...arc.at(-1)) - 12 * 1.015) < 1e-8);
    const { period } = prominenceTiming(index);
    const bursts = Array.from({ length: 1201 }, (_, i) => prominenceSample(index, i * period / 1200));
    assert(bursts.filter(frame => frame.strength === 0).length > 600, 'Each eruption spends more than half its cycle fully dark');
    assert(bursts.some(frame => frame.strength > .99 && frame.lift > .9), 'Plasma grows away from the surface before it dissipates');
    assert(bursts.every((frame, i) => !i || Math.abs(frame.strength - bursts[i - 1].strength) < .03), 'Eruptions fade continuously through cycle boundaries');
    assert.equal(prominenceSample(index, period * .3, true).strength, 0, 'Reduced motion omits the intermittent ejections');
  }
  const destinations = [
    ['mpoly', 'https://mpoly.zney295.id.vn/'],
    ['beatsync', 'https://beatsync.zney295.id.vn/'],
    ['boom', 'https://boom.zney295.id.vn/'],
    ['study', 'https://study.zney295.id.vn/'],
    ['manager', 'https://manager.zney295.id.vn/'],
    ['fashion', 'https://zney295.id.vn/-Fashion-Dress-up-Game/'],
    ['sentinel', 'https://zney295.id.vn/SentinelLAN/#downloads'],
    ['security', 'https://zney295.id.vn/Security/'],
    ['backup', 'https://zney295.id.vn/BackupData/#download'],
  ];
  assert.deepEqual(showcaseProducts.map(({ id, url }) => [id, url]), destinations, 'Keep all nine owner-supplied product destinations');
  assert.equal(projects.length, 10, 'Keep the ten-case-study archive');
  for (const cursor of ['arrow', 'hand']) {
    const metadata = await sharp(await readFile(`public/cursors/deep-space-${cursor}.png`)).metadata();
    assert.equal(metadata.width, 32);
    assert.equal(metadata.height, 32);
    assert(metadata.hasAlpha, 'Native cursor images keep their transparent background');
  }
  assert((await readFile('src/main.tsx', 'utf8')).includes("import './cursor.css'"), 'The selected cursor style stays connected to the application');
  assert.equal(showcaseProducts.filter(product => product.kind === 'website').length, 6);
  assert.equal(showcaseProducts.filter(product => product.kind === 'download').length, 3);
  for (const [index, product] of showcaseProducts.entries()) {
    assert.equal(showcaseIndexForHash(`#/showcase/${product.id}`), index);
    if (product.caseStudy) assert(projects.some(project => project.id === product.caseStudy), `${product.id} opens a real case study`);
    if (product.preview) {
      assert(product.preview.startsWith('./img/products/'), 'Previews remain bundled for offline rendering');
      const metadata = await sharp(await readFile(`public/${product.preview.slice(2)}`)).metadata();
      assert(metadata.width >= 960 && Math.abs(metadata.width / metadata.height - 16 / 9) < .01, `${product.id} retains its full 16:9 preview`);
    } else {
      assert.equal(product.id, 'manager', 'Only the known unavailable preview may be missing');
    }
    for (const lang of ['eng', 'vie']) {
      const markup = renderToStaticMarkup(React.createElement(ProductShowcase, { index, lang, reducedMotion: false, onSelect() {} }));
      assert(markup.includes(`href="${product.url}"`), `${product.id}: visit/download action survives`);
      assert(markup.includes(product.name) && markup.includes(product.description[lang]));
      if (product.scope) {
        assert(markup.includes(product.scope[lang].replaceAll('&', '&amp;')) && markup.includes(product.stack), 'CV contribution scope and technologies are visible in both languages');
        assert(markup.includes(`href="#/cv/${product.resume}"`), 'The product opens its matching CV');
      }
      assert(markup.includes('href="#/projects/all"'), 'The complete case-study archive stays reachable from the ring');
      assert(markup.includes('aria-roledescription="carousel"') && markup.includes('tabindex="0"'), 'Gallery stays keyboard accessible');
      if (product.kind === 'website') assert(markup.includes(lang === 'eng' ? 'Try it live' : 'Trải nghiệm trực tiếp'), 'Keep the optional live experience');
      else assert(markup.includes(lang === 'eng' ? 'Explore app' : 'Khám phá ứng dụng') && !markup.includes(' download='), 'Applications open their introduction/download landing pages');
      if (product.caseStudy) assert(markup.includes(`href="#/project/${product.caseStudy}"`));
      if (!product.preview) assert(markup.includes(lang === 'eng' ? 'Preview unavailable' : 'Preview chưa khả dụng'));
      assert(!markup.includes('screening-placeholder-overlay'), 'Keep the requested removal of the icon/title card inside empty screens');
    }
  }
  for (const hash of ['#/showcase', '#/showcase/']) assert.equal(showcaseIndexForHash(hash), 0);
  for (const hash of ['#/showcase/no', '#/showcase/beatsync/extra', '#/showcase/beatsync//', '#/showcase-fake', '#/project/beatsync']) assert.equal(showcaseIndexForHash(hash), null);
  const missing = renderToStaticMarkup(React.createElement(ProductShowcase, { index: null, lang: 'eng', reducedMotion: true, onSelect() {} }));
  const flowGallery = renderToStaticMarkup(React.createElement(ProductShowcase, { index: 0, lang: 'eng', reducedMotion: false, onSelect() {}, onExit() {} }));
  assert(!flowGallery.includes('screening-close'), 'The scroll-flow gallery has no X exit button');
  assert(missing.includes('This screen isn’t here.') && missing.includes('See products'), 'Invalid product routes offer recovery');

  const originalHash = window.location.hash;
  const { SHOWCASE_ENABLED, visiblePortfolioHash } = await server.ssrLoadModule('/src/data/productShowcase.ts');
  assert.equal(SHOWCASE_ENABLED, true, 'The upgraded showcase is part of the Porrima journey');
  assert.equal(visiblePortfolioHash('#/showcase'), '#/showcase');
  assert.equal(visiblePortfolioHash('#/showcase/mpoly'), '#/showcase/mpoly');
  assert.equal(visiblePortfolioHash('#/projects/all'), '#/projects/all');
  try {
    for (const product of showcaseProducts) {
      window.location.hash = `#/showcase/${product.id}`;
      const markup = renderToStaticMarkup(React.createElement(VirgoPortfolio, { lang: 'eng', onEnterWorkspace() {} }));
      assert.equal(markup.includes('worlds-showcase'), SHOWCASE_ENABLED, 'Public showcase routes mount the world selector');
      if (SHOWCASE_ENABLED) assert(markup.includes(`href="${product.url}"`));
      else assert(!markup.includes('href="#/showcase'), 'Public gallery entry links stay hidden');
    }
  } finally { window.location.hash = originalHash; }
  const loader = renderToStaticMarkup(React.createElement(WavePageLoader, { label: 'Opening workspace' }));
  assert(loader.includes('data-page-loader') && loader.includes('class="wave-loader"'));
  assert(loader.includes('role="progressbar"') && loader.includes('aria-label="Opening workspace"'));
  for (const lang of ['eng', 'vie']) {
    const boundary = new VirgoSceneBoundary({ lang, children: 'scene' });
    assert.equal(boundary.render(), 'scene');
    boundary.state = VirgoSceneBoundary.getDerivedStateFromError();
    const markup = renderToStaticMarkup(boundary.render());
    assert(markup.includes('href="#/projects/all"') && markup.includes(lang === 'eng' ? 'Try again' : 'Thử lại'), 'WebGL failure keeps archive/retry available');
  }

  // Protect the regression where the spring replaced an explicit destination
  // with the old, nearest screen. Verify both directions and frame rates.
  for (const fps of [30, 60, 120]) for (const [start, target] of [[0, 880], [880, 0], [0, 4400]]) {
    let state = { x: start, target, velocity: 0, settled: false };
    for (let frame = 0; frame < fps * 3 && !state.settled; frame++) {
      state = advanceShowcaseMotion(state.x, state.target, state.velocity, 1 / fps, 0, 4400, 'target');
      assert(state.x >= 0 && state.x <= 4400);
    }
    assert(state.settled && state.x === target, `Explicit navigation reaches its destination at ${fps}fps`);
  }
  const coast = fps => {
    let state = { x: 310, target: 310, velocity: 1000, settled: false };
    for (let frame = 0; frame < fps * 3 && !state.settled; frame++) state = advanceShowcaseMotion(state.x, state.target, state.velocity, 1 / fps, 0, 4400, 'inertia');
    assert(state.settled && state.x > 400 && state.x < 500, 'Momentum settles between screens without mandatory snapping');
    return state.x;
  };
  assert(Math.abs(coast(60) - coast(120)) < .1, 'Momentum is independent of refresh rate');
  assert.equal(advanceShowcaseMotion(10, 0, -2400, .04, 0, 4400, 'inertia').x, 0);
  assert.equal(advanceShowcaseMotion(4390, 4400, 2400, .04, 0, 4400, 'inertia').x, 4400);
  assert.deepEqual(advanceShowcaseMotion(310, 880, 2000, .02, 0, 4400, 'target', true), { x: 880, target: 880, velocity: 0, settled: true });
  assert.equal(showcaseChapterTransition(5), 0);
  assert.equal(showcaseChapterTransition(6), 0);
  assert(showcaseChapterTransition(5.5) > .99, 'A visible passage separates the two chapters in one continuous scroll');
  assert.equal(showcaseChapterTransition(5.5, true), 0);
  assert(Math.abs(showcaseChapterTransition(5.3) - showcaseChapterTransition(5.7)) < 1e-10, 'The chapter passage is reversible');
  const firstView = chapterReadingPosition(3), secondView = chapterReadingPosition(4);
  assert.equal(narrativeSample(firstView).index, 4);
  assert.equal(narrativeSample(secondView).index, 5);
  assert.equal(narrativeSample(firstView).reveal, 1);
  assert.equal(narrativeSample(secondView).reveal, 1);
  // Reading orbits are local; the interstellar camera never turns or resets.
  for (const [index, from, to] of [[0, 1.92, 2.32], [1, 2.94, 4.25], [2, 4.8, 5.3]]) {
    assert.equal(readingOrbitAngle(index, from), 0);
    assert.equal(readingOrbitAngle(index, to), Math.PI, 'The reading view completes a semicircle');
    assert.equal(readingOrbitAngle(index, to + .1), Math.PI, 'Departure keeps the outgoing view instead of unwinding it');
    assert.equal(readingOrbitAngle(index, from, true), 0);
    for (const edge of [from, to]) assert(Math.abs(readingOrbitAngle(index, edge + 1e-6) - readingOrbitAngle(index, edge - 1e-6)) / 2e-6 < .001, 'The reading orbit meets the straight departure with zero angular velocity');
    let previous = 0;
    for (let step = 1; step <= 100; step++) {
      const p = from + (to - from) * step / 100, angle = readingOrbitAngle(index, p);
      assert(angle > previous && angle - previous < .06, 'Every reading scroll increment rotates smoothly');
      const point = readingOrbitPoint([32, 4, 17], index, p);
      assert(Math.abs(Math.hypot(point[0], point[2]) - Math.hypot(32, 17)) < 1e-9, 'A local orbit retains its physical radius');
      assert.equal(point[1], 4);
      previous = angle;
    }
  }
  for (const mobile of [false, true]) {
    let previous = straightFlightPose(1.92, mobile);
    const forward = [];
    for (let step = 1920; step <= 6000; step++) {
      const pose = straightFlightPose(step / 1000, mobile);
      assert.equal(pose.x, 0); assert.equal(pose.y, 0, 'Reading and transit share one straight axis');
      assert(pose.z <= previous.z, 'Forward travel never retreats');
      forward.push(pose); previous = pose;
    }
    for (let step = 6000; step >= 1920; step--) assert.deepEqual(straightFlightPose(step / 1000, mobile), forward[step - 1920], 'Reverse scroll retraces the exact same path');
    for (const { from, to } of TRANSIT_LEGS) for (const edge of [from, to]) {
      assert(Math.abs(straightFlightPose(edge - 1e-6, mobile).z - straightFlightPose(edge + 1e-6, mobile).z) < .001, 'Reading and transit meet without a reset');
    }
  }
  for (let i = 0; i <= 400; i++) assert.equal(solarPassageSample(i / 100).roll, 0, 'Showcase entry keeps the straight heading too');
  assert(Math.abs(showcaseAngularStep(9) * 9 - Math.PI * 2) < 1e-10, 'Nine screens share one complete 360-degree cylinder');
  const worlds = showcaseProducts.map((product, i) => ({ id: product.id, ...tunnelStation(i, 1000, 1400) }));
  assert.equal(new Set(worlds.map(world => world.id)).size, 9, 'Every tunnel world has its own stable URL');
  for (let i = 1; i < worlds.length; i++) {
    assert(worlds[i].z < worlds[i - 1].z, 'Worlds advance through the tube along depth');
    assert(Math.hypot(worlds[i].x - worlds[i - 1].x, worlds[i].y - worlds[i - 1].y) > 100, 'The route explores different positions inside the tube');
  }
  assert.equal(tunnelVisibility(-1), 0, 'Past worlds clear the forward view');
  const leftEdge = showcaseScreenPoint(0), rightEdge = showcaseScreenPoint(1), middle = showcaseScreenPoint(.5);
  assert.equal(SHOWCASE_SCREEN_STRIPS, 21, 'Captures use one shared cylindrical curve with 21 native image strips');
  assert(Math.abs(leftEdge.x + .5) < 1e-10 && Math.abs(rightEdge.x - .5) < 1e-10);
  assert(leftEdge.z > .1 && leftEdge.z === rightEdge.z && middle.z === 0, 'The preview edges curve toward the viewer');
  assert(leftEdge.angle < 0 && rightEdge.angle > 0, 'The two sides bend continuously in opposite directions');
  assert(tunnelVisibility(-1, true) > 0, 'Looking back can reveal a previous world');
  for (let i = 0; i < 9; i++) {
    assert.equal(tunnelCrossing(i), 0);
    assert(Math.abs(tunnelCrossing(i + .5) - 1) < 1e-10, 'The portal opens between resting URL worlds');
    assert.equal(tunnelCrossing(i + .5, true), 0, 'Reduced motion skips the portal passage');
    assert.deepEqual(tunnelPortal(i), tunnelStation(i + .5, .72, 1), 'The portal lies on the actual spatial camera path');
    const before = tunnelStation(i + .4, .72, 1), after = tunnelStation(i + .6, .72, 1);
    assert(before.z > tunnelPortal(i).z && after.z < tunnelPortal(i).z, 'Forward and reverse travel really cross the gate plane');
  }
  assert.deepEqual(tunnelWorldBlend(1.5, 9), { from: 1, to: 2, blend: .5 });
  assert.deepEqual(tunnelWorldBlend(99, 9), { from: 8, to: 8, blend: 0 });
  assert.equal(portalPreviewPresence(0), 1);
  assert.equal(portalPreviewPresence(.8), 0, 'The aperture is unobstructed at the centre of a crossing');
  for (let i = 0; i < 400; i++) {
    const discharge = portalLightning(i / 40, 3);
    assert(discharge >= 0 && discharge <= 1, 'Rim lightning has a bounded, rounded discharge');
  }
  assert(Math.abs(SOLAR_PASSAGE.duration - SOLAR_PASSAGE.handoff - SHOWCASE_TURN.enter) < 1e-10);
  assert.equal(SHOWCASE_TURN.enter, 1.1, 'Entry no longer waits for a 1.8-second turn');
  for (let i = 0; i <= 100; i++) {
    const time = SHOWCASE_TURN.enter * i / 100;
    const reveal = cylinderRevealSample(time), turn = showcaseRingTurn(time);
    assert(Math.abs((reveal.cameraZ - SOLAR_PASSAGE.destinationZ) / 1000 - turn.yaw / (Math.PI * 2)) < 1e-10, 'Entry depth and rotation follow exactly the same easing');
  }
  for (const departing of [false, true]) for (const direction of [-1, 1]) {
    const duration = departing ? SHOWCASE_TURN.exit : SHOWCASE_TURN.enter;
    const begin = showcaseRingTurn(0, departing, direction), end = showcaseRingTurn(duration, departing, direction);
    assert(Math.abs(Math.abs(end.yaw - begin.yaw) - (departing ? 0 : Math.PI * 2)) < 1e-10, 'The ring turns only on entry; exit has no automatic rotation');
    assert.equal(end.depth, departing ? 1 : 0, 'Exit preserves its depth passage');
    assert.equal(end.roll, 0, 'The showcase rests upright');
    const dt = .0001;
    assert(Math.abs(showcaseRingTurn(dt, departing, direction).yaw - begin.yaw) / dt < .001);
    assert(Math.abs(end.yaw - showcaseRingTurn(duration - dt, departing, direction).yaw) / dt < .001, 'Both ends join with zero angular velocity');
    for (let i = 0; i <= 100; i++) {
      const sample = showcaseRingTurn(duration * i / 100, departing, direction);
      if (departing) {
        assert.equal(sample.yaw, 0, 'Neither exit direction adds a spin');
        assert.equal(sample.roll, 0, 'Neither exit direction adds a tilt');
      }
      assert(Math.abs(sample.roll) <= .080001, 'The shorter turn has a gentler secondary tilt');
      assert.deepEqual(showcaseRingTurn(duration * i / 100, departing, direction, true), { yaw: 0, roll: 0, depth: 0, complete: true });
    }
  }
  const a = createTransitScenarios(() => 0), b = createTransitScenarios(() => .99);
  assert.deepEqual([...TRANSIT_SCENARIOS].sort(), ['asteroids', 'meteors', 'stardust'], 'All transit scenery remains non-explosive');
  for (const scenes of [a, b]) assert.deepEqual([...scenes.slice(1)].sort(), [...TRANSIT_SCENARIOS].sort(), 'Each journey uses all three scenery variants without repeats');
  assert.notDeepEqual(a, b, 'New journeys can vary the scene order');
  assert.deepEqual(a, createTransitScenarios(() => 0), 'Scene selection is independent of frame timing');
  assert((await readFile('AGENTS.md', 'utf8')).includes('docs/straight-flight-contract.vi.md'), 'Future edits must read the owner-approved flight contract');
  assert((await readFile('docs/straight-flight-contract.vi.md', 'utf8')).includes('17-42-22.mp4'), 'Identify the exact reference video');
  assert.notEqual(NARRATIVE_BEATS[4].placement, NARRATIVE_BEATS[5].placement, 'Successive project sentences change their layout');

  // Wiring checks catch disconnected new components; geometry/style may evolve.
  const jsxNames = async path => {
    const source = ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const names = new Set();
    const calls = new Map();
    const attributes = new Map();
    const visit = node => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        names.add(tag);
        attributes.set(tag, new Set(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => attr.name.getText(source))));
      }
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source);
        calls.set(name, (calls.get(name) ?? 0) + 1);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return { names, calls, attributes };
  };
  for (const [path, components] of [
    ['src/App.tsx', ['WavePageLoader']],
    ['src/components/VirgoPortfolio.tsx', ['WorldsShowcase', 'SingularityDust', 'VirgoSceneBoundary', 'VirgoScene']],
    ['src/components/VirgoScene.tsx', ['PortalGate', 'BlackHoleVortex', 'StellarPlasma']],
    ['src/components/VirgoTransit.tsx', ['VirgoPlanet', 'points']],
    ['src/components/BlackHoleVortex.tsx', ['BlackHoleAccretionMesh']],
  ]) {
    const { names, calls, attributes } = await jsxNames(path);
    for (const component of components) assert(names.has(component), `${path} must still render ${component}`);
    if (path.endsWith('VirgoScene.tsx')) assert(!names.has('FlightTrails'), 'The camera speed-line overlay stays removed');
    if (path.endsWith('VirgoTransit.tsx')) assert(!names.has('lineSegments'), 'Transit uses soft particles instead of hard white meteor segments');
    if (path.endsWith('VirgoScene.tsx')) assert(!names.has('VirgoSupernova') && !calls.has('stellarEmission'), 'Neither the removed explosion nor its early stellar fade can be remounted');
    if (path.endsWith('VirgoScene.tsx')) {
      const source = ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const star = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'VirgoNode');
      let ownedMaterial = false, attachedMaterial = false, updatesOwnedUniforms = false, disposesMaterial = false;
      const inspect = node => {
        if (ts.isNewExpression(node) && node.expression.getText(source) === 'THREE.ShaderMaterial') ownedMaterial = true;
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'uniforms' && node.initializer?.getText(source) === 'photosphere.uniforms') updatesOwnedUniforms = true;
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'photosphere.dispose') disposesMaterial = true;
        if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'primitive') {
          attachedMaterial = node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'object' && attr.initializer?.getText(source) === '{photosphere}');
        }
        ts.forEachChild(node, inspect);
      };
      assert(star, 'The stellar surface remains part of VirgoNode'); inspect(star);
      assert(ownedMaterial && attachedMaterial && updatesOwnedUniforms && disposesMaterial, 'The stellar material owns its uniform containers, is attached as one object, and is disposed on replacement; hot updates must not leave cached opacity behind');
    }
    if (path.endsWith('VirgoScene.tsx')) assert(calls.has('straightFlightPose'), 'The straight path must remain connected to the rendered camera');
    if (path.endsWith('VirgoScene.tsx')) assert(calls.has('contactPresence'), 'The live Contact panel has independent persistent visibility');
    if (path.endsWith('VirgoScene.tsx')) assert(calls.has('readingOrbitAngle') && calls.has('readingOrbitPoint'), 'Both station meshes and labels use the local reading orbit');
    if (path.endsWith('VirgoPortfolio.tsx')) {
      assert(!calls.has('openFlowShowcase'), 'The gallery no longer interrupts wheel or native story scrolling');
      assert(attributes.get('WorldsShowcase')?.has('onClose'), 'The worlds retain an explicit return to Contact');
    }
  }

  const shaderSource = await readFile('src/components/blackHoleShader.ts', 'utf8');
  assert(shaderSource.includes('DISK_INNER = 1.18'), 'Black hole disk inner radius is calibrated to 1.18');
  assert(shaderSource.includes('HORIZON = .9'), 'Horizon radius is kept at 0.9');
  assert(shaderSource.includes('diskRadius > HORIZON'), 'Equatorial encounters strictly ordered above horizon');
  assert(shaderSource.includes('shadowMask'), '5-tap shadow mask smoothing is active');
  assert(shaderSource.includes('opticalDepth'), 'Slant optical depth prevents background ring ghosting');

  const renderingSource = await readFile('src/components/blackHoleRendering.ts', 'utf8');
  assert(renderingSource.includes('BLOOM_SIZES = [192, 96, 48]'), 'Fixed-size bloom pyramid is preserved');
  assert(renderingSource.includes('class BlackHoleRenderPipeline'), 'BlackHoleRenderPipeline is defined');

  const vortexSource = await readFile('src/components/BlackHoleVortex.tsx', 'utf8');
  assert(vortexSource.includes('rayResolution = resolution'), 'Ray resolution strictly matches shade resolution to prevent 2x2 artifacts');
  assert(vortexSource.includes('scale > .75'), 'Cadence scale preserves high minimum render quality');

  console.log('PASS: nine product destinations/previews, bilingual world routes/actions, explicit world-selector return wiring, connected straight flight and scenery variants, invalid-route recovery, wave loader, WebGL recovery, black-hole wiring, and reversible/refresh-rate-independent gallery motion.');
}
