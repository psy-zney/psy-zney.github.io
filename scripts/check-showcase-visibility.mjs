import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// The owner reintroduced the showcase on 16 October; verify its public flow.
const output = process.env.SHOWCASE_OUTPUT || 'artifacts/portal-open-flow/showcase';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
const base = (process.argv[2] || 'http://127.0.0.1:5182/').split('#')[0];
const selected = process.env.UI_SCENARIOS?.split(',');
const reportPath = `${output}/report${selected ? '-' + selected.join('-') : ''}.json`;
try {
  for (const [name, viewport, reducedMotion] of [
    ['desktop', { width: 1440, height: 900 }, 'no-preference'],
    ['tablet', { width: 762, height: 715 }, 'no-preference'],
    ['phone', { width: 390, height: 844 }, 'no-preference'],
    ['landscape', { width: 844, height: 390 }, 'no-preference'],
    ['reduced', { width: 1440, height: 900 }, 'reduce'],
  ]) {
    if (selected && !selected.includes(name)) continue;
    const page = await browser.newPage({ viewport, reducedMotion });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /THREE.WebGLProgram|VALIDATE_STATUS|shader error/i.test(message.text())) errors.push(message.text()); });
    // Offline fixture proves that actual HTML updates on the curved surface.
    // These screenshots are labelled as fixtures, not real product captures.
    await page.route(/^https:\/\/(?:[^/]+\.)?zney295\.id\.vn(?:\/|$)/, route => route.fulfill({
      contentType: 'text/html', body: '<style>html,body{margin:0;background:#103e51;color:#fff;font:32px sans-serif}main{padding:48px;min-height:1800px}button,input{min-height:44px}</style><main><h1>Live preview fixture</h1><p id="tick">0</p><button onclick="this.textContent=\'Clicked in 3D\'">Test DOM click</button><input aria-label="Test DOM input" /></main><script>setInterval(()=>document.querySelector("#tick").textContent=String(Number(document.querySelector("#tick").textContent)+1),200)</script>',
    }));
    await page.clock.install();
    await page.goto(base + '#/showcase/beatsync');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.querySelector('.virgo-page')?.dataset.cameraPose);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const room = page.locator('dialog.screening-room');
    const rail = room.locator('.screening-rail');
    const wheel = async delta => {
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(40);
      await page.clock.runFor(4800);
    };
    const settle = async id => {
      await page.clock.runFor(1800);
      // A route commit can mount React's next scene at the end of runFor.
      // Advance its arrival too, rather than wait on a paused animation clock.
      for (let frame = 0; frame < 10; frame++) {
        const ready = await page.evaluate(id => {
          const room = document.querySelector('.screening-room');
          const target = [...room.querySelectorAll('.screening-slide')].findIndex(el => el.dataset.productId === id);
          return location.hash === '#/showcase/' + id && document.querySelector('.screening-slide.is-active')?.dataset.productId === id &&
            !room.hasAttribute('aria-busy') && Math.abs(Number(room.dataset.worldDepth) - target) < .00001 &&
            Number(room.dataset.portalCrossing || 0) === 0;
        }, id);
        if (ready) return;
        await page.waitForTimeout(20); await page.clock.runFor(400);
      }
      assert.fail(`${name}: ${id} did not finish arriving`);
    };
    const fit = async () => {
      const layout = await room.evaluate(el => {
        const box = selector => {
          const r = el.querySelector(selector).getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
        };
        return { preview: box('.screening-slide.is-active'), caption: box('.screening-caption-stack'),
          dots: box('.screening-pagination'), actions: box('.screening-actions-row'),
          reading: box('.screening-reading-links'), tabs: box('.screening-kinds'),
          controls: [...el.querySelectorAll('a,button')].filter(e => e.getBoundingClientRect().width > 0)
            .map(e => ({ text: e.textContent.trim(), width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })) };
      });
      for (const key of ['caption', 'dots', 'actions', 'reading', 'tabs']) {
        const b = layout[key];
        assert(b.x >= -1 && b.y >= 0 && b.right <= viewport.width + 1 && b.bottom <= viewport.height + 1, `${name}: ${key} fits: ${JSON.stringify(layout)}`);
      }
      assert(layout.tabs.bottom + 4 <= layout.preview.y, `${name}: selector clears preview`);
      if (name === 'landscape') {
        assert(layout.caption.right + 8 <= layout.preview.x, 'Landscape caption clears preview');
        assert(layout.reading.x >= layout.actions.right + 4, 'Landscape reading links clear actions');
      } else {
        assert(layout.caption.bottom + 4 <= layout.dots.y, `${name}: CV context clears product selectors: ${JSON.stringify(layout)}`);
        assert(layout.reading.bottom + 4 <= layout.tabs.y || layout.reading.y >= layout.tabs.bottom + 4 ||
          layout.reading.x >= layout.tabs.right + 4, `${name}: reading links clear tabs`);
      }
      assert(layout.dots.bottom <= layout.actions.y, `${name}: selectors clear actions`);
      for (const control of layout.controls) assert(control.width >= 44 && control.height >= 44, `${name}: 44px target: ${JSON.stringify(control)}`);
      return layout;
    };
    const contexts = [];
    for (const [id, scope, cv] of [
      ['beatsync', 'Open-source fork & extensions', 'fullstack'],
      ['fashion', 'GameDressUp · Delivered freelance work', 'fullstack'],
      ['sentinel', 'Personal project · Endpoint management', 'software'],
      ['backup', 'Personal project · Windows migration', 'software'],
    ]) {
      if (id !== 'beatsync') { await page.goto(base + '#/showcase/' + id); await page.clock.runFor(400); }
      await settle(id);
      await room.locator('.screening-slide.is-active .screening-tv[data-state="ready"]').waitFor();
      assert.equal(await room.locator('.screening-category-tag').textContent(), scope);
      assert.equal(await room.locator('.screening-reading-links a').last().getAttribute('href'), '#/cv/' + cv);
      assert((await room.locator('.screening-stack').textContent()).length > 10);
      const surface = room.locator('.screening-slide.is-active');
      assert.equal(await room.locator('feDisplacementMap').count(), 0, 'The tube uses real geometry and undistorted website DOM');
      assert.equal(await room.locator('.screening-tunnel-canvas').count(), 1, 'One shared 3D tube contains the website worlds');
      assert.equal(await room.locator('.screening-tunnel-canvas').isVisible(), name !== 'reduced', 'Reduced motion keeps the flat recovery view');
      assert.equal(await room.getAttribute('data-tunnel-connections'), '18', 'Every world has two physical links to the tunnel');
      assert.equal(await room.getAttribute('data-tunnel-detail'), 'liquid,caustics,nebula,dust,curved-mounts');
      assert.equal(await room.getAttribute('data-portal-count'), '9');
      assert.equal(await room.getAttribute('data-portal-effects'), 'vortex,waves,lightning,world-crossing');
      assert.equal(await surface.locator('.screening-capture-strip').count(), name === 'reduced' ? 0 : 21, 'Authentic captures wrap around the curved surface');
      if (name !== 'reduced') {
        const wrapper = await surface.evaluate(el => ({ style: getComputedStyle(el.parentElement).transformStyle, filter: getComputedStyle(el.parentElement).filter }));
        assert.deepEqual(wrapper, { style: 'preserve-3d', filter: 'none' }, 'The wrapper must not flatten its curved children');
        const time = Number(await room.getAttribute('data-tunnel-time'));
        await page.clock.runFor(600);
        assert(Number(await room.getAttribute('data-tunnel-time')) > time + .4, 'The tunnel stays alive while the camera rests');
        assert.equal(await room.getAttribute('data-tunnel-ambient'), 'running');
      } else assert.equal(await room.getAttribute('data-tunnel-ambient'), 'paused');
      assert.equal(await room.locator('.screening-content').getAttribute('data-world-route'), '#/showcase/' + id);
      const worldPose = await room.getAttribute('data-tunnel-pose');
      assert(worldPose.split(',').map(Number).every(Number.isFinite), 'The world exposes a valid spatial camera pose');
      const previewSwitch = room.locator('.screening-web-controls button');
      if (name === 'reduced') {
        assert.equal(await room.locator('.screening-web-viewport iframe').count(), 0, 'Reduced motion defaults to a capture');
        await previewSwitch.click(); await page.clock.runFor(700);
      }
      await room.locator('.screening-web-viewport iframe').waitFor();
      const frame = room.locator('.screening-web-viewport').frameLocator('iframe');
      await frame.getByRole('heading', { name: 'Live preview fixture', exact: true }).waitFor();
      await page.clock.runFor(450);
      const tick = await frame.locator('#tick').textContent();
      await page.clock.runFor(500);
      assert.notEqual(await frame.locator('#tick').textContent(), tick, 'The live surface updates real HTML, not a screenshot');
      assert.equal(await room.locator('.screening-web-viewport iframe').count(), 1, 'Only the focused website runs');
      if (id === 'beatsync') {
        const restingDepth = Number(await room.getAttribute('data-world-depth'));
        await frame.getByRole('button', { name: 'Test DOM click', exact: true }).click();
        assert.equal(await frame.getByRole('button', { name: 'Clicked in 3D', exact: true }).count(), 1, 'The inline live preview receives native clicks');
        await frame.getByRole('textbox', { name: 'Test DOM input', exact: true }).fill('Inline preview');
        assert.equal(await frame.getByRole('textbox', { name: 'Test DOM input', exact: true }).inputValue(), 'Inline preview');
        await frame.getByRole('heading', { name: 'Live preview fixture', exact: true }).hover();
        const beforeScroll = await frame.locator('body').evaluate(el => el.ownerDocument.scrollingElement.scrollTop);
        await page.mouse.wheel(0, 360); await page.waitForTimeout(100); await page.clock.runFor(700);
        const downScroll = await frame.locator('body').evaluate(el => el.ownerDocument.scrollingElement.scrollTop);
        assert(downScroll > beforeScroll + 20, 'Wheel over the inline preview scrolls the website down');
        assert(Math.abs(Number(await room.getAttribute('data-world-depth')) - restingDepth) < .001, 'Website scrolling does not move the gallery');
        await page.mouse.wheel(0, -360); await page.waitForTimeout(100); await page.clock.runFor(700);
        assert(await frame.locator('body').evaluate(el => el.ownerDocument.scrollingElement.scrollTop) < downScroll - 20, 'Website scrolling works upwards too');
        await page.screenshot({ path: `${output}/${name}-live-fixture.png` });
        if (name !== 'reduced') {
          await page.evaluate(() => {
            const room = document.querySelector('.screening-room');
            window.portalFrames = [];
            window.portalObserver = new MutationObserver(() => window.portalFrames.push({
              slot: Number(room.dataset.worldDepth), crossing: Number(room.dataset.portalCrossing),
              plane: room.dataset.portalPlane?.split(',').map(Number),
              opacity: Number(document.querySelector('.screening-slide.is-active')?.parentElement.style.opacity),
              frames: room.querySelectorAll('.screening-web-viewport iframe').length,
            }));
            window.portalObserver.observe(room, { attributes: true, attributeFilter: ['data-world-depth', 'data-portal-crossing'] });
          });
          await rail.press('ArrowRight');
          let crossingSeen = false;
          for (let i = 0; i < 24; i++) {
            await page.clock.runFor(25);
            if (Number(await room.getAttribute('data-portal-crossing')) > .8) {
              crossingSeen = true;
              await page.screenshot({ path: `${output}/${name}-portal-crossing.png` });
              break;
            }
          }
          assert(crossingSeen, 'Changing worlds exposes the vortex corridor');
          await settle('boom');
          const portalFrames = await page.evaluate(() => { window.portalObserver.disconnect(); return window.portalFrames; });
          assert(portalFrames.some(frame => frame.crossing > .8 && frame.opacity < .25 && frame.frames === 0), 'The native preview yields while crossing the portal');
          const gate = portalFrames.filter(frame => frame.plane?.[0] === 1);
          assert(gate.some(frame => frame.plane[1] > .02) && gate.some(frame => frame.plane[1] < -.02), 'The camera crosses a real aperture plane');
          assert.equal(await room.locator('.screening-world-marker b').textContent(), '03');
          await rail.press('ArrowLeft'); await settle('beatsync');
          assert.equal(await room.locator('.screening-world-marker b').textContent(), '02');
          const pose = () => room.evaluate(el => el.dataset.tunnelPose.split(',').map(Number));
          const before = await pose();
          await page.mouse.move(viewport.width * .94, viewport.height * .62); await page.mouse.down();
          await page.mouse.move(viewport.width * .76, viewport.height * .76, { steps: 12 }); await page.mouse.up();
          await page.clock.runFor(1800);
          const looked = await pose();
          assert(Math.abs(looked[3] - before[3]) > .1 && Math.abs(looked[4] - before[4]) > .05, 'Dragging looks around the world in two dimensions');
          assert(page.url().endsWith('#/showcase/beatsync'), 'Looking around retains the world URL');
          await rail.press('w'); await page.clock.runFor(1000);
          assert(Math.hypot(...(await pose()).slice(0, 3).map((v, i) => v - before[i])) > 10, 'WASD moves within the spatial world');
          await page.screenshot({ path: `${output}/${name}-look-around.png` });
          await room.getByRole('button', { name: 'Recenter view (F)', exact: true }).click(); await page.clock.runFor(1800);
          const reset = await pose();
          assert(reset.every((v, i) => Math.abs(v - before[i]) < .02), 'Recenter restores the current world and its readable screen');
          await page.mouse.move(viewport.width * .95, viewport.height * .58);
          await page.mouse.wheel(0, 900); await page.waitForTimeout(40); await page.clock.runFor(3200);
          const stopped = Number(await room.getAttribute('data-world-depth'));
          assert(stopped > 1.13 && stopped < 1.15, 'Even a large wheel delta travels only 0.14 world and stops without snapping');
          assert.equal(Number(await room.getAttribute('data-portal-crossing')), 0, 'Stopping inside the passage restores the reading view');
          assert.equal(await room.locator('.screening-web-viewport iframe').count(), 1, 'The live website resumes after a fractional stop');
          await room.getByRole('button', { name: 'BeatSync', exact: true }).click(); await settle('beatsync');
        }
      }
      await previewSwitch.click(); await page.clock.runFor(100);
      assert.equal(await room.locator('.screening-web-viewport iframe').count(), 0, 'Capture mode disposes the external frame');
      if (id === 'beatsync') {
        await room.getByRole('button', { name: 'Try it live', exact: true }).click(); await page.clock.runFor(400);
        assert.equal(await room.getAttribute('data-tunnel-ambient'), 'paused', 'Ambient detail pauses behind the interactive reader');
        const frozen = await room.getAttribute('data-tunnel-time'); await page.clock.runFor(800);
        assert.equal(await room.getAttribute('data-tunnel-time'), frozen, 'The hidden tube does not keep drawing');
        const reader = room.locator('.screening-live[open]');
        const nativeButton = reader.frameLocator('iframe').getByRole('button', { name: 'Test DOM click', exact: true });
        await nativeButton.click();
        assert.equal(await reader.frameLocator('iframe').getByRole('button').textContent(), 'Clicked in 3D', 'Curved decoration does not break native pointer hit-testing');
        const input = reader.frameLocator('iframe').getByRole('textbox', { name: 'Test DOM input' });
        await input.fill('Native input stays interactive');
        assert.equal(await input.inputValue(), 'Native input stays interactive');
        await reader.getByRole('button', { name: 'Close live preview', exact: true }).click(); await page.clock.runFor(500);
        assert.equal(await room.getAttribute('data-tunnel-ambient'), name === 'reduced' ? 'paused' : 'running');
      }
      contexts.push({ id, cv, layout: await fit() });
      await page.screenshot({ path: `${output}/${name}-${id}.png` });
    }
    // Reading the CV and archive must return to the same product.
    await room.locator('.screening-reading-links a').last().click();
    await page.clock.runFor(500);
    await page.locator('.virgo-dialog[open] .resume-html-document').waitFor();
    await page.locator('.virgo-close').click();
    await settle('backup');
    // Measure the actual ring transform throughout entry and exit. Camera
    // heading comes from the rendered journey pose, independently of the ring.
    const turnTrace = async (mode, action) => {
      const trace = page.evaluate(mode => new Promise(resolve => {
        const root = document.querySelector('.virgo-page'), frames = [];
        let seen = false;
        const finish = () => { observer.disconnect(); resolve(frames); };
        const observer = new MutationObserver(() => {
          const gallery = document.querySelector('.screening-room');
          if (!gallery) { if (seen && mode === 'exit') finish(); return; }
          const moving = mode === 'exit' ? gallery.dataset.flowPhase === 'departing' : gallery.hasAttribute('aria-busy');
          if (moving && gallery.dataset.showcaseTurn) {
            seen = true; frames.push({ at: performance.now(), tunnel: gallery.dataset.tunnelPose.split(',').map(Number), ring: gallery.dataset.showcaseTurn.split(',').map(Number),
              camera: root.dataset.cameraPose.split(',').map(Number) });
          }
          if (seen && mode === 'enter' && !moving) finish();
        });
        observer.observe(root, { subtree: true, childList: true, attributes: true,
          attributeFilter: ['data-showcase-turn', 'aria-busy', 'data-flow-phase'] });
        root.dataset.qaTurnReady = mode;
      }), mode);
      await page.waitForFunction(mode => document.querySelector('.virgo-page')?.dataset.qaTurnReady === mode, mode);
      await action();
      if (name === 'reduced') return [];
      let timer;
      const frames = await Promise.race([trace, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Missing ring motion trace')), 15000); })]);
      clearTimeout(timer);
      assert(frames.length > 8, `${name}: real rendered ring motion is sampled`);
      const turns = frames.map(frame => frame.ring[0]);
      if (mode === 'exit') {
        assert(frames.every(frame => Math.abs(frame.ring[0]) < .00001 && Math.abs(frame.ring[1]) < .00001), `${name}: exit has no automatic spin or tilt`);
        const depths = frames.map(frame => frame.ring[2]);
        assert(Math.max(...depths) - Math.min(...depths) > .98, `${name}: exit keeps its depth passage`);
      } else {
        assert(Math.max(...turns) - Math.min(...turns) > 6.20, `${name}: entry completes a 360-degree turn`);
        assert(frames.at(-1).at - frames[0].at < 1250, `${name}: entry no longer keeps spinning for 1.8 seconds`);
        assert(frames.every(frame => Math.abs(Math.abs(frame.ring[0]) / (Math.PI * 2) - frame.tunnel[2] / 400) < .001), `${name}: entry depth and turn stay synchronized in rendered frames`);
      }
      for (const frame of frames) {
        for (const axis of [0, 1, 3, 4, 5]) assert(Math.abs(frame.camera[axis]) < .00001, 'The full turn belongs only to the showcase, not the journey camera');
        assert(Math.abs(frame.camera[6] - 1) < .00001);
      }
      return frames;
    };
    await room.locator('.screening-reading-links a').first().click();
    await page.clock.runFor(500);
    assert.equal(await page.locator('.virgo-archive a').count(), 10);
    await page.locator('.virgo-close').click();
    await settle('backup');
    // A deliberate next gesture leaves the last screen for Skills.
    await page.mouse.move(viewport.width * .96, viewport.height * .60);
    const exitMotion = name === 'reduced' ? (await wheel(120), []) : await turnTrace('exit', () => wheel(120));
    await room.waitFor({ state: 'detached' });
    assert(page.url().endsWith('#/skills'));
    const seek = async p => {
      await page.evaluate(p => {
        const root = document.querySelector('.virgo-page'), scroll = document.querySelector('.virgo-scroll');
        const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        const i = Math.min(5, Math.floor(p)); root.dataset.introArrival = String(p);
        scroll.scrollTop = offsets[i] + (offsets[i + 1] - offsets[i]) * (p - i);
        // Reduced motion renders on demand; notify it before advancing the
        // paused clock instead of racing the browser's deferred scroll event.
        scroll.dispatchEvent(new Event('scroll'));
      }, p);
      await page.clock.runFor(400);
      const position = await page.locator('.virgo-page').evaluate(el => Number(el.style.getPropertyValue('--flight-progress')) * 6);
      assert(Math.abs(position - p) < .01, `${name}: seek ${p} reached ${position}`);
    };
    // Reverse entry chooses the final product and reverse exit restores Porrima.
    await seek(4.805);
    await wheel(-120);
    await settle('backup');
    await rail.press('Home'); await settle('mpoly');
    await wheel(-120);
    await room.waitFor({ state: 'detached' });
    assert(page.url().endsWith('#/projects-more'));
    // Forward entry follows the completed Porrima sentence, including reduced motion.
    await seek(4.245);
    await page.screenshot({ path: `${output}/${name}-before-entry.png` });
    const entryMotion = name === 'reduced' ? (await wheel(120), []) : await turnTrace('enter', () => wheel(120));
    await settle('mpoly');
    await page.screenshot({ path: `${output}/${name}-arrival.png` });
    await rail.press('End'); await settle('backup');
    // Missing assets and invalid routes retain accessible recovery.
    await page.goto(base + '#/showcase/manager'); await settle('manager');
    assert.equal(await room.locator('.screening-placeholder-overlay').count(), 0);
    assert.equal(await room.locator('.screening-slide.is-active [role="status"]').textContent(), 'Preview unavailable');
    assert.equal(await room.locator('.screening-actions-row a').first().getAttribute('href'), 'https://manager.zney295.id.vn/');
    await page.goto(base + '#/showcase/missing'); await page.clock.runFor(500);
    await room.getByRole('button', { name: 'See products', exact: true }).click(); await settle('mpoly');
    assert.deepEqual(errors, []);
    results.push({ name, status: 'passed', contexts, archiveProjects: 10, bidirectionalFlow: true, recovery: true, liveHtmlFixture: true,
      curveStrips: name === 'reduced' ? 0 : 21, wallConnections: 18, ambientClock: name !== 'reduced', nativeReaderInput: true,
      quantumPortals: name !== 'reduced', portalCount: 9, exitMotion, entryMotion });
    console.log('PASS upgraded showcase: ' + name);
    await page.close();
  }
} catch (error) {
  results.push({ status: 'failed', error: error.stack });
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
    const state = await page.evaluate(() => {
      const tube = document.querySelector('.screening-tunnel-canvas');
      return { hash: location.hash, root: { ...document.querySelector('.virgo-page')?.dataset },
        tube: tube && { element: tube.outerHTML, display: getComputedStyle(tube).display },
        room: document.querySelector('.screening-room')?.outerHTML.slice(0, 700), focus: document.activeElement?.className };
    }).catch(() => null);
    await writeFile(`${output}/failure.json`, JSON.stringify(state, null, 2));
  }
  throw error;
} finally {
  await writeFile(reportPath, JSON.stringify(results, null, 2));
  await browser.close();
}
