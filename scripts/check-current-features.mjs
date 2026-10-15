import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import ts from 'typescript';

// Behavior and integration checks for the current build. Visual QA lives in check-ui.mjs.
export async function checkCurrentFeatures(server) {
  const { introFrame, INTRO_CAPTIONS, INTRO_DURATION, INTRO_ASSEMBLY_DURATION, introConstellationFrame, advanceIntroScroll } = await server.ssrLoadModule('/src/data/virgoIntro.ts');
  assert.equal(introConstellationFrame(0).stars[1], 1, 'The constellation starts from the central yellow star');
  assert.equal(introConstellationFrame(0).stars.filter(amount => amount > .1).length, 1, 'Only the central star is visible before connections spread');
  assert(introConstellationFrame(0).edges.every(([a, b]) => a + b === 0), 'Connections are drawn progressively instead of appearing fully connected');
  assert(introConstellationFrame(2.4).edges.some(([a, b]) => a + b > 0 && a + b < 1), 'A branching wave is visible before the constellation is complete');
  assert(introConstellationFrame(INTRO_ASSEMBLY_DURATION).stars.every(amount => amount === 1));
  assert(introConstellationFrame(INTRO_ASSEMBLY_DURATION).edges.every(([a, b]) => a + b === 1), 'Every original connection survives the restored intro');
  assert.equal(INTRO_DURATION, 7.8, 'The intro scroll coordinate spans opening, entry and wall reading; it is not an autoplay duration');
  assert.equal(introFrame(0).z, 1000);
  for (const caption of INTRO_CAPTIONS) assert.equal(introFrame(caption.pass).z, caption.z, 'Wall lettering has a fixed physical position along the flight');
  assert.equal(introFrame(INTRO_DURATION).z, -3000);
  assert.equal(introFrame(1).charge, 0, 'The constellation never contracts into the core');
  assert.equal(introFrame(2.75).z, 1000, 'The vortex opens before the next scroll enters it');
  assert.equal(introFrame(2.75).tear, 1);
  assert.equal(introFrame(4).streak, 0, 'The tunnel contains wall dust rather than star streaks');
  let previousIntroZ = 1000;
  let previousArrivalSpeed = Infinity;
  let previousVelocity = 0;
  for (let i = 0; i <= INTRO_DURATION * 1000; i++) {
    const frame = introFrame(i / 1000);
    assert(frame.z <= previousIntroZ + 1e-6, 'The camera always flies forward through the tear');
    assert.equal(frame.x, 0); assert.equal(frame.y, 0, 'The intro never swerves or reverses its heading');
    const velocity = (previousIntroZ - frame.z) * 1000;
    assert(velocity < 1500 && Math.abs(velocity - previousVelocity) < 1, 'Camera displacement changes smoothly along the scroll coordinate');
    previousVelocity = velocity;
    if (i > 7250) {
      const speed = previousIntroZ - frame.z;
      assert(speed <= previousArrivalSpeed + 1e-6, 'Camera displacement tapers continuously near the arrival endpoint');
      previousArrivalSpeed = speed;
    }
    previousIntroZ = frame.z;
  }
  for (const fps of [30, 60, 120]) {
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
  }
  const { showcaseProducts, showcaseIndexForHash } = await server.ssrLoadModule('/src/data/productShowcase.ts');
  const { projects } = await server.ssrLoadModule('/src/data/portfolio.ts');
  const { ProductShowcase } = await server.ssrLoadModule('/src/components/ProductShowcase.tsx');
  const { VirgoPortfolio } = await server.ssrLoadModule('/src/components/VirgoPortfolio.tsx');
  const { WavePageLoader } = await server.ssrLoadModule('/src/components/WavePageLoader.tsx');
  const { VirgoSceneBoundary } = await server.ssrLoadModule('/src/components/VirgoSceneFallback.tsx');
  const { advanceShowcaseMotion, showcaseChapterTransition, spatialGaze, narrativeOrbitPose } = await server.ssrLoadModule('/src/data/virgoExperienceMotion.ts');
  const { chapterReadingPosition, narrativeSample, NARRATIVE_BEATS } = await server.ssrLoadModule('/src/data/virgoNarrative.ts');
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
  try {
    for (const product of showcaseProducts) {
      window.location.hash = `#/showcase/${product.id}`;
      const markup = renderToStaticMarkup(React.createElement(VirgoPortfolio, { lang: 'eng', onEnterWorkspace() {} }));
      assert(markup.includes('class="screening-room"'), 'Public showcase routes mount the actual gallery');
      assert(markup.includes(`href="${product.url}"`));
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
  assert(Math.abs(spatialGaze(secondView).yaw - spatialGaze(firstView).yaw - Math.PI) < 1e-9, 'Successive project sentences span the full 180 degree half orbit');
  assert.equal(spatialGaze(2.94).yaw, 0);
  assert.equal(spatialGaze(4.25).yaw, Math.PI, 'The project camera completes a real 180 degree semicircle');
  const { VIRGO_STARS } = await server.ssrLoadModule('/src/data/virgoStations.ts');
  assert(new Set(VIRGO_STARS.map(star => star.position[0])).size >= 3, 'Neighboring stars are laterally staggered');
  for (const radius of [125, 180]) {
    for (const [from, to] of [[2.32, 2.94], [4.25, 4.80], [5.30, 5.82]]) {
      let previous = narrativeOrbitPose(from, radius, 480);
      for (let step = 1; step <= 200; step++) {
        const pose = narrativeOrbitPose(from + (to - from) * step / 200, radius, 480);
        assert(VIRGO_STARS.every(star => Math.hypot(pose.x - star.position[0], pose.y, pose.z - star.position[2]) > 45), 'The fly-by clears every stellar core instead of diving through it');
        assert(pose.z <= previous.z + 1e-9, 'Forward travel never retreats');
        const angularStep = Math.atan2(Math.sin(pose.angle - previous.angle), Math.cos(pose.angle - previous.angle));
        assert(angularStep >= -1e-9 && angularStep < .04, 'Transit continues the same turn smoothly, without a snapped heading reset');
        if (step < 200) assert(pose.z < previous.z, 'The transfer moves immediately instead of holding still for a heading reset');
        previous = pose;
      }
    }
    for (let p = 2.94; p <= 4.25; p += .01) {
      const pose = narrativeOrbitPose(p, radius, 480);
      assert(Math.abs(Math.hypot(pose.x - VIRGO_STARS[1].position[0], pose.z + 480) - radius) < 1e-9, 'The camera orbits at constant distance');
    }
    for (const edge of [2.32, 2.94, 4.25, 4.80, 5.30, 5.82]) {
      const before = narrativeOrbitPose(edge - 1e-6, radius, 480);
      const after = narrativeOrbitPose(edge + 1e-6, radius, 480);
      if (before && after) {
        assert(Math.hypot(before.x - after.x, before.z - after.z) < .01, 'Orbit and transit meet without a camera jump');
        assert(Math.abs(Math.atan2(Math.sin(after.angle - before.angle), Math.cos(after.angle - before.angle))) < .001, 'The view direction is continuous at each station boundary');
      }
    }
  }
  assert.notEqual(NARRATIVE_BEATS[4].placement, NARRATIVE_BEATS[5].placement, 'Successive project sentences change their layout');
  assert.equal(spatialGaze(firstView).station, 1);
  assert.deepEqual(spatialGaze(firstView, true), { yaw: 0, pitch: 0, roll: 0, station: -1 });

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
    ['src/components/VirgoPortfolio.tsx', ['ProductShowcase', 'VirgoSceneBoundary', 'VirgoScene']],
    ['src/components/VirgoScene.tsx', ['PortalGate', 'BlackHoleVortex']],
    ['src/components/BlackHoleVortex.tsx', ['BlackHoleAccretionMesh']],
  ]) {
    const { names, calls, attributes } = await jsxNames(path);
    for (const component of components) assert(names.has(component), `${path} must still render ${component}`);
    if (path.endsWith('VirgoScene.tsx')) assert(calls.has('narrativeOrbitPose'), 'The real orbit must remain connected to the rendered camera');
    if (path.endsWith('VirgoPortfolio.tsx')) {
      assert((calls.get('openFlowShowcase') ?? 0) >= 3, 'Wheel and native-scroll paths must still enter the showcase automatically');
      assert(attributes.get('ProductShowcase')?.has('onExit'), 'The gallery must still continue to the neighboring story chapter');
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

  console.log('PASS: nine product destinations/previews, bilingual showcase routes/actions, automatic gallery entry/exit wiring, a connected 180-degree camera orbit, invalid-route recovery, wave loader, WebGL recovery, black-hole wiring, and reversible/refresh-rate-independent gallery motion.');
}
