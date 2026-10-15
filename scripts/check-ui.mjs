import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import sharp from 'sharp';

// Optional URL reuses a running server; otherwise start an isolated local Vite server.
const output = process.env.UI_OUTPUT || 'artifacts/feature-preservation';
await mkdir(output, { recursive: true });
const server = process.argv[2] ? null : await createServer({ cacheDir: 'node_modules/.vite-ui', server: { host: '127.0.0.1', port: 5181, strictPort: true, hmr: false } });
let browser;
const report = [];
const selectedScenarios = process.env.UI_SCENARIOS?.split(',');
const reportPath = `${output}/${selectedScenarios ? `report-${selectedScenarios.join('-')}` : 'report'}.json`;
const startedAt = new Date().toISOString();
const fingerprintSource = async () => {
  const paths = ['package.json', 'pnpm-lock.yaml', 'scripts/check-ui.mjs', ...(await readdir('src', { recursive: true }))
    .filter(path => /\.(tsx?|css|json)$/.test(path)).map(path => `src/${path.replaceAll('\\', '/')}`)].sort();
  const hash = createHash('sha256');
  for (const path of paths) hash.update(path).update('\0').update(await readFile(path)).update('\0');
  return hash.digest('hex');
};
const sourceSha256 = await fingerprintSource();
const limitations = ['Touch hardware and perceived audio quality are not verified by browser emulation.', 'Live iframe lifecycle uses a local fixture; third-party frame embedding is not guaranteed.'];
const writeReport = (status, error) => writeFile(reportPath, JSON.stringify({ status, startedAt, updatedAt: new Date().toISOString(), sourceSha256, scenarios: report, limitations, ...(error ? { error } : {}) }, null, 2) + '\n');
await writeReport('running');
try {
  if (server) await server.listen();
  const base = process.argv[2] || server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true, ...(process.env.UI_CHROME_PATH ? { executablePath: process.env.UI_CHROME_PATH } : {}) });
  const scenarios = [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'tablet', viewport: { width: 762, height: 715 } },
    { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { name: 'landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
    { name: 'reduced', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  ];
  if (selectedScenarios) assert(selectedScenarios.every(name => scenarios.some(scenario => scenario.name === name)), 'UI_SCENARIOS must name existing scenarios');
  for (const { name, ...options } of scenarios.filter(scenario => !selectedScenarios || selectedScenarios.includes(scenario.name))) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    // Install before GSAP loads; its ticker retains the initial Date.now.
    await page.clock.install();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /Shader Error|VALIDATE_STATUS|Error creating WebGL/.test(message.text())) errors.push(message.text());
    });
    await page.route('**/track', route => route.fulfill({ status: 204 }));
    await page.route('**/api/track', route => route.fulfill({ status: 204 }));
    const gallery = page.locator('dialog.screening-room');
    const rail = gallery.locator('.screening-rail');
    const title = gallery.locator('.screening-title');
    const hashIs = async id => {
      await page.waitForFunction(expected => location.hash === expected, `#/showcase/${id}`);
      await page.waitForFunction(id => document.querySelector(`.screening-slide.is-active[data-product-id="${id}"]`), id);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.screening-caption-stack')).opacity === '1');
      await page.waitForFunction(() => Number(document.querySelector('.screening-room')?.style.getPropertyValue('--screen-focus')) > .999);
    };
    const fit = async () => {
      const boxes = await page.evaluate(() => {
        const rect = selector => {
          const bounds = document.querySelector(selector).getBoundingClientRect();
          return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom };
        };
        const hint = document.querySelector('.screening-hint-badge');
        const hintVisible = getComputedStyle(hint).display !== 'none' && !hint.classList.contains('is-hidden');
        return { width: innerWidth, height: innerHeight, preview: rect('.screening-slide.is-active'), tabs: rect('.screening-kinds'), caption: rect('.screening-caption-stack'), dots: rect('.screening-pagination'), actions: rect('.screening-actions-row'), hint: hintVisible ? rect('.screening-hint-badge') : null, controls: [...document.querySelectorAll('.screening-kinds button,.screening-dot,.screening-actions-row a,.screening-actions-row button,.screening-close')].map(el => ({ label: el.getAttribute('aria-label') || el.textContent.trim(), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })) };
      });
      try {
      for (const key of ['caption', 'dots', 'actions']) {
        const box = boxes[key];
        assert(box.x >= -1 && box.right <= boxes.width + 1 && box.y >= 0 && box.bottom <= boxes.height + 1, `${name}: ${key} fits the viewport`);
      }
      if (name === 'landscape') assert(boxes.caption.right + 8 <= boxes.preview.x && boxes.caption.y > boxes.dots.bottom + 4,
        'Landscape captions sit beside the screen and below product controls');
      else assert(boxes.caption.bottom + 4 <= boxes.dots.y, `${name}: captions do not collide with product controls`);
      assert(boxes.tabs.bottom + 4 <= boxes.preview.y, `${name}: the chapter selector stays above the active screen`);
      if (boxes.hint) assert(boxes.hint.bottom + 4 <= boxes.caption.y, `${name}: the scroll hint does not overlap the caption`);
      assert(boxes.dots.bottom <= boxes.actions.y, `${name}: product controls do not collide with actions`);
      for (const control of boxes.controls) assert(control.width >= 43.5 && control.height >= 43.5, `${name}: ${control.label} has a 44px hit area`);
      return boxes;
      } catch (error) {
        await writeFile(`${output}/${name}-gallery-fit-failure.json`, JSON.stringify({ error: error.message, ...boxes }, null, 2));
        await page.screenshot({ path: `${output}/${name}-gallery-fit-failure.png` });
        throw error;
      }
    };

    await page.goto(`${base}#/showcase/beatsync`, { waitUntil: 'domcontentloaded' });
    await gallery.waitFor({ state: 'visible' });
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await gallery.locator('.screening-slide.is-active .screening-tv[data-state="ready"]').waitFor();
    await gallery.locator('.screening-css3d .screening-surface[data-space-pose]').first().waitFor({ state: 'attached' });
    await page.waitForFunction(() => Number(document.querySelector('.screening-room')?.style.getPropertyValue('--screen-focus')) > .999);
    assert((await gallery.locator('.screening-title').evaluate(el => getComputedStyle(el).fontFamily)).includes('Outfit'), 'Gallery titles use the shared sans-serif face');
    assert.equal(await gallery.locator('.screening-rail').evaluate(el => getComputedStyle(el).scrollbarWidth), 'none', 'The spatial rail hides native scrollbars');
    const surfaces = await gallery.locator('.screening-surface').evaluateAll(elements => elements.slice(0, 3).map(el => ({ pose: el.dataset.spacePose.split(',').map(Number), matrix: el.style.transform })));
    assert(surfaces.every(surface => surface.matrix.includes('matrix3d(')), 'DOM screen projection comes from the CSS3D camera');
    if (name !== 'reduced') {
      const radius = await gallery.locator('.screening-slide.is-active').evaluate(el => el.offsetWidth / (2 * Math.tan(.78 / 2)) * 1.025);
      assert(Math.abs(surfaces[1].pose[0]) < .1 && Math.abs(surfaces[1].pose[2] + 2500 + radius) < 1 && Math.abs(surfaces[1].pose[3]) < .001, 'The selected DOM screen faces the camera at the cylinder front');
      assert(surfaces[0].pose[0] < 0 && surfaces[2].pose[0] > 0 && surfaces[0].pose[2] > surfaces[1].pose[2] + 1 && surfaces[2].pose[2] > surfaces[1].pose[2] + 1, 'Neighbor screens share a true cylindrical scene');
    }
    assert.equal(await title.textContent(), 'BeatSync');
    const initialFit = await fit();
    if (name === 'desktop' || name === 'reduced') {
      assert((await page.locator('body').evaluate(el => getComputedStyle(el).cursor)).includes('deep-space-arrow.png'), 'The default native cursor uses the selected arrow');
      assert((await gallery.getByRole('button', { name: 'Web experiences', exact: true }).evaluate(el => getComputedStyle(el).cursor)).includes('deep-space-hand.png'), 'Buttons use the selected hand cursor');
    }
    assert.equal(await gallery.locator('.screening-close').count(), 0, 'The journey showcase has no X exit control');
    const previewWidth = await gallery.locator('.screening-slide.is-active').evaluate(el => el.offsetWidth);
    assert(previewWidth / options.viewport.width > (name === 'phone' ? .90 : name === 'landscape' ? .43 : .72), `${name}: the showcase preview uses the larger layout`);
    await page.screenshot({ path: `${output}/${name}-gallery.png` });
    await rail.focus();
    await rail.press('ArrowRight');
    await hashIs('boom');
    assert.equal(await title.textContent(), 'Mèo Nổ', `${name}: keyboard actually changes the selected product`);
    await gallery.getByRole('button', { name: 'Apps & tools', exact: true }).click();
    await hashIs('sentinel');
    assert.equal(await gallery.getByRole('link', { name: 'Explore app', exact: true }).getAttribute('href'), 'https://zney295.id.vn/SentinelLAN/#downloads');
    await fit();
    await rail.focus();
    await rail.press('End');
    await hashIs('backup');
    const croppedPreviews = await gallery.locator('.screening-slide[data-product-id="sentinel"] img, .screening-slide[data-product-id="security"] img, .screening-slide[data-product-id="backup"] img').evaluateAll(images => images.map(img => ({
      width: parseFloat(getComputedStyle(img).width), viewport: parseFloat(getComputedStyle(img.parentElement).width)
        - parseFloat(getComputedStyle(img.parentElement).borderLeftWidth) - parseFloat(getComputedStyle(img.parentElement).borderRightWidth),
      overflow: getComputedStyle(img.parentElement).overflow
    })));
    assert(croppedPreviews.length === 3 && croppedPreviews.every(img => img.width > img.viewport * 1.012 && img.overflow === 'hidden'), `All three authentic app captures conceal the baked-in scrollbar at the display edge: ${JSON.stringify(croppedPreviews)}`);
    await rail.press('Home');
    await hashIs('mpoly');
    await gallery.getByRole('button', { name: 'BeatSync', exact: true }).click();
    await hashIs('beatsync');
    await gallery.getByRole('link', { name: 'Story', exact: true }).click();
    await page.locator('.virgo-dialog[open] .project-document').waitFor();
    await page.locator('.virgo-dialog[open]').getByRole('button', { name: 'Close', exact: true }).click();
    await gallery.waitFor({ state: 'visible' });
    await hashIs('beatsync');
    assert.equal(await title.textContent(), 'BeatSync', 'Closing a case study restores the product route');
    await page.route('https://beatsync.zney295.id.vn/**', route => route.fulfill({ contentType: 'text/html', body: '<style>body{min-height:1800px;font:18px sans-serif;padding:20px}button,input{min-height:44px}</style><h1>Local live-preview fixture</h1><button onclick="this.textContent=\'Clicked in 3D\'">Test DOM click</button><input aria-label="Test DOM input" />' }));
    await gallery.getByRole('button', { name: 'Try it live', exact: true }).click();
    const live = page.locator('.screening-live[open]');
    await live.waitFor();
    assert.equal(await live.locator('iframe').getAttribute('src'), 'https://beatsync.zney295.id.vn/');
    const liveDocument = live.frameLocator('iframe');
    await liveDocument.getByRole('button', { name: 'Test DOM click' }).click();
    assert.equal(await liveDocument.getByRole('button').textContent(), 'Clicked in 3D', 'Click reaches the original DOM inside the CSS3D iframe');
    await liveDocument.getByRole('textbox').fill('CSS3D keyboard input');
    assert.equal(await liveDocument.getByRole('textbox').inputValue(), 'CSS3D keyboard input', 'Keyboard input stays native inside the CSS3D iframe');
    const iframeBounds = await live.locator('iframe').boundingBox();
    await page.mouse.move(iframeBounds.x + iframeBounds.width / 2, iframeBounds.y + 180);
    await page.mouse.wheel(0, 240);
    const liveFrame = await (await live.locator('iframe').elementHandle()).contentFrame();
    await liveFrame.waitForFunction(() => document.scrollingElement.scrollTop > 0);
    assert.equal(await live.locator('.screening-css3d .screening-surface').count(), 1, 'Live HTML is mounted on one CSS3D scene surface');
    await live.getByRole('button', { name: 'Close live preview', exact: true }).click();
    await live.waitFor({ state: 'hidden' });
    assert.equal(await gallery.getByRole('button', { name: 'Try it live', exact: true }).evaluate(el => el === document.activeElement), true, 'Closing live preview restores focus');

    // Pointer and wheel paths stay in the same mounted gallery, preserving focus.
    await gallery.evaluate(el => { el.dataset.testInstance = 'original'; });
    await rail.focus();
    // The product title changes as soon as its screen becomes nearest. Start
    // the drag only once that screen is centered after the return/live routes.
    await page.waitForFunction(() => Number(document.querySelector('dialog.screening-room')?.style.getPropertyValue('--screen-focus')) > .995);
    const bounds = await rail.boundingBox();
    const startX = bounds.x + bounds.width * .72, endX = bounds.x + bounds.width * .20, y = bounds.y + bounds.height * .35;
    await page.waitForFunction(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.screening-rail'), { x: startX, y });
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 16 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    assert.equal(await gallery.getAttribute('data-test-instance'), 'original', 'Product selection must not remount the gallery');
    assert.notEqual(await title.textContent(), 'BeatSync', `${name}: pointer dragging rotates the screens`);
    await rail.press('Home');
    await hashIs('mpoly');
    await page.mouse.move(bounds.width / 2, y);
    await page.mouse.wheel(1200, 0);
    await page.waitForTimeout(1500);
    assert.notEqual(await title.textContent(), 'Cờ Tỷ Phú Mèo', `${name}: horizontal wheel rotates the screens`);
    if (name === 'reduced') {
      const flat = await gallery.locator('.screening-surface').evaluateAll(segments => segments.length === 9 && segments.every(el => {
        if (el.style.display === 'none') return el.dataset.spacePose.split(',').map(Number).slice(2).every(value => Math.abs(value) < 1e-9);
        const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return Math.abs(matrix.m13) < 1e-9 && Math.abs(matrix.m31) < 1e-9 && Math.abs(matrix.m43) < 1e-9 && Math.abs(matrix.m33 - 1) < 1e-9;
      }));
      assert(flat, 'Reduced motion uses flat screens');
    }

    // Cross the two sections and return using the wheel alone, without a tab click.
    await page.goto(`${base}#/showcase/fashion`, { waitUntil: 'domcontentloaded' });
    await hashIs('fashion');
    await page.mouse.move(bounds.width / 2, y);
    await page.mouse.wheel(0, 1200);
    await page.waitForFunction(() => document.querySelector('.screening-kinds button:last-child')?.getAttribute('aria-pressed') === 'true');
    await page.waitForTimeout(1500);
    assert(await gallery.getByRole('link', { name: 'Explore app', exact: true }).isVisible(), `${name}: wheel automatically continues from web experiences to apps`);
    await page.mouse.wheel(0, -1200);
    await page.waitForFunction(() => document.querySelector('.screening-kinds button:first-child')?.getAttribute('aria-pressed') === 'true');
    if (name === 'phone') {
      await page.goto(`${base}#/showcase/beatsync`, { waitUntil: 'domcontentloaded' });
      await hashIs('beatsync');
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
      for (let step = 1; step <= 16; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX + (endX - startX) * step / 16, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(1500);
      assert.notEqual(await title.textContent(), 'BeatSync', 'Emulated touch swipe changes the product');
      await cdp.detach();
    }

    await page.goto(`${base}#/showcase/manager`, { waitUntil: 'domcontentloaded' });
    await gallery.waitFor({ state: 'visible' });
    await hashIs('manager');
    assert.equal(await gallery.locator('.screening-placeholder-overlay').count(), 0, 'Manager has no central icon/title placeholder');
    await page.screenshot({ path: `${output}/${name}-manager.png` });
    assert.equal(await gallery.getByRole('link', { name: 'Visit website', exact: true }).getAttribute('href'), 'https://manager.zney295.id.vn/');
    await page.goto(`${base}#/showcase/no-such-product`, { waitUntil: 'domcontentloaded' });
    await gallery.getByRole('button', { name: 'See products' }).click();
    await hashIs('mpoly');
    await page.route('**/img/products/beatsync.webp', route => route.abort());
    await page.goto(`${base}#/showcase/beatsync`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await gallery.locator('.screening-slide.is-active .screening-tv[data-state="error"]').waitFor();
    assert.equal(await gallery.getByRole('link', { name: 'Visit website', exact: true }).getAttribute('href'), 'https://beatsync.zney295.id.vn/');
    await page.unroute('**/img/products/beatsync.webp');

    // Main intro and portal remain functional after all gallery interactions.
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.locator('.virgo-canvas canvas').waitFor();
    await page.screenshot({ path: `${output}/${name}-intro.png` });
    const sound = page.locator('.virgo-sound-toggle');
    await sound.click();
    assert.equal(await sound.getAttribute('aria-pressed'), 'false');
    await sound.click();
    assert.equal(await sound.getAttribute('aria-pressed'), 'true');

    // Connections assemble first; the camera stays fixed until one gesture.
    const intro = page.locator('.virgo-intro-flight');
    await intro.waitFor();
    await page.clock.runFor(5100);
    await page.waitForFunction(() => document.querySelector('.virgo-intro-flight')?.dataset.phase === 'idle');
    assert.equal(await intro.getAttribute('data-constellation-edges'), '16');
    assert.equal(await intro.getAttribute('data-phase'), 'idle');
    assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
    assert.equal(await intro.getByRole('button').count(), 0, 'The opening has no visible start cue');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    if (name === 'desktop') {
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, 120);
    } else await intro.click({ position: { x: 40, y: 40 } });
    if (name !== 'reduced') {
      const introScrollTo = async target => {
        for (let attempt = 0; attempt < 40; attempt++) {
          const current = Number(await intro.getAttribute('data-seconds'));
          if (Math.abs(current - target) < .002) return;
          await page.mouse.wheel(0, (target - current) / .0045);
          await page.clock.runFor(900);
        }
        assert.fail('Intro must follow scroll target ' + target);
      };
      await introScrollTo(2.75);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000', 'The vortex opens before entry');
      await page.screenshot({ path: output + '/' + name + '-intro-tear.png' });
      for (const [index, target] of [[0, 4.7], [1, 5.8]]) {
        await introScrollTo(target);
        const line = intro.locator('.virgo-intro-captions p').nth(index);
        assert.equal(await line.getAttribute('data-lines'), '1');
        assert(Number(await line.evaluate(el => el.style.opacity)) > .5, 'World-space greeting is already present on the wall');
        assert((await line.textContent()).includes(index ? 'creative universe' : 'Lê Quang Khánh'));
        await page.screenshot({ path: output + '/' + name + '-intro-greeting-' + (index + 1) + '.png' });
      }
      await introScrollTo(7.1);
      assert.equal(await intro.getAttribute('data-virtual-grid'), 'hidden');
      assert(Number(await intro.getAttribute('data-exit-radius')) > 100, 'An exit is visible before arrival');
      assert.equal(await intro.evaluate(el => el.style.opacity), '1', 'The scene is revealed through the exit, not a full-screen fade');
      await page.mouse.wheel(0, 120); await page.clock.runFor(900);
      await page.mouse.wheel(0, 120); await page.clock.runFor(1200);
    } else await page.clock.runFor(100);
    await intro.waitFor({ state: 'detached' });
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 - 1.92) < .001);
    assert.equal(await page.evaluate(() => location.hash), '#/home', 'Intro arrives on the home route without replaying the old opening');
    await page.screenshot({ path: `${output}/${name}-intro-arrival.png` });
    await page.clock.resume();
    if (name === 'desktop') {
      await page.goto(`${base}#/cosmos`);
      await intro.waitFor();
      await intro.click({ position: { x: 40, y: 40 } });
      await page.waitForTimeout(250);
      await page.evaluate(() => { location.hash = '#/skills'; });
      await intro.waitFor({ state: 'detached' });
      await page.waitForTimeout(8000);
      assert.equal(await page.evaluate(() => location.hash), '#/skills', 'Route changes cancel the old intro and its arrival callback');
    }

    // Check the actual rendered camera and sentences, rather than unused helpers.
    await page.goto(`${base}#/projects`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const storyAt = async (position, sentence) => {
      const saveFailure = async error => {
        const state = await page.evaluate(() => {
          const root = document.querySelector('.virgo-page');
          const scroller = document.querySelector('.virgo-scroll');
          return { hash: location.hash, top: scroller?.scrollTop, height: scroller?.clientHeight,
            offsets: [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop),
            progress: root?.style.getPropertyValue('--flight-progress'), pose: root?.dataset.cameraPose, diagnostics: { ...root?.dataset },
            focus: document.activeElement?.outerHTML.slice(0, 1000),
            focusedReading: !!document.querySelector('.virgo-overlay .virgo-bare :focus-visible'),
            gallery: !!document.querySelector('.screening-room'), passage: document.querySelector('.virgo-showcase-passage')?.outerHTML.slice(0, 1000),
            lines: [...document.querySelectorAll('.virgo-narrative-line')].map(el => ({ text: el.textContent, visibility: getComputedStyle(el).visibility, opacity: getComputedStyle(el.querySelector('span')).opacity })) };
        });
        await page.screenshot({ path: `${output}/${name}-story-failure.png` });
        await writeFile(`${output}/${name}-story-failure.json`, JSON.stringify({ expected: { position, sentence }, error: error.message, ...state }, null, 2));
      };
      try {
      await page.waitForFunction(expected => {
        const root = document.querySelector('.virgo-page');
        const top = document.querySelector('.virgo-scroll').scrollTop;
        const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        let leg = offsets.length - 2;
        while (leg > 0 && offsets[leg] > top) leg--;
        const nativePosition = leg + (top - offsets[leg]) / (offsets[leg + 1] - offsets[leg]);
        const rendered = Number(root.style.getPropertyValue('--flight-progress')) * 6;
        return Math.abs(rendered - expected) < .001 && Math.abs(rendered - nativePosition) < .000001;
      }, position);
      await page.waitForFunction(sentence => {
        const lines = [...document.querySelectorAll('.virgo-narrative-line')].filter(el => getComputedStyle(el).visibility === 'visible' && Number(getComputedStyle(el.querySelector('span')).opacity) > .1);
        return lines.length === 1 && lines[0].textContent === sentence;
      }, sentence);
      } catch (error) {
        await saveFailure(error);
        throw error;
      }
      const state = await page.evaluate(() => {
        const root = document.querySelector('.virgo-page');
        const visible = [...document.querySelectorAll('.virgo-narrative-line')].filter(el => getComputedStyle(el).visibility === 'visible' && Number(getComputedStyle(el.querySelector('span')).opacity) > .1);
        return { sentences: visible.map(el => el.textContent), pose: root.dataset.cameraPose?.split(',').map(Number), densePanels: [...document.querySelectorAll('.virgo-bare-chapter > .virgo-bare')].some(el => getComputedStyle(el).display !== 'none'), lines: [...document.querySelectorAll('.virgo-narrative-line')].map(el => ({ text: el.textContent, inline: el.getAttribute('style'), visibility: getComputedStyle(el).visibility, opacity: getComputedStyle(el.querySelector('span')).opacity })) };
      });
      if (state.sentences.length !== 1 || state.sentences[0] !== sentence) {
        await page.screenshot({ path: `${output}/${name}-story-failure.png` });
        await writeFile(`${output}/${name}-story-failure.json`, JSON.stringify(state, null, 2));
      }
      assert.deepEqual(state.sentences, [sentence], `${name}: only the current sentence is visible`);
      assert.equal(state.densePanels, false, `${name}: dense lists do not replace the single-sentence presentation`);
      assert(state.pose?.length === 7 && state.pose.every(Number.isFinite), 'Record the actual rendered camera position/quaternion');
      return state;
    };
    // Wheel no longer snaps to a reading anchor: supply only the distance needed.
    const wheelTo = async position => {
      for (let attempt = 0; attempt < 400; attempt++) {
        const state = await page.evaluate(position => {
          const scroller = document.querySelector('.virgo-scroll');
          const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
          const index = Math.floor(position);
          return { rendered: Number(document.querySelector('.virgo-page').style.getPropertyValue('--flight-progress')) * 6,
            remaining: offsets[index] + (offsets[index + 1] - offsets[index]) * (position - index) - scroller.scrollTop };
        }, position);
        if (Math.abs(state.rendered - position) < .0005 && Math.abs(state.remaining) < 1) return;
        if (Math.abs(state.remaining) >= 1) await page.mouse.wheel(0, Math.max(-120, Math.min(120, state.remaining / 1.25)));
        await page.waitForTimeout(50);
      }
      assert.fail('Wheel must reach the requested reading position: ' + position);
    };
    const firstSentence = 'Each project gives me something new to learn.';
    const secondSentence = 'Here is how I turn those needs into projects.';
    const firstStory = await storyAt(3.23, firstSentence);
    await page.screenshot({ path: `${output}/${name}-story-first.png` });
    await page.mouse.move(options.viewport.width / 2, options.viewport.height * .75);
    await wheelTo(3.95);
    const secondStory = await storyAt(3.95, secondSentence);
    await page.screenshot({ path: `${output}/${name}-story-second.png` });
    for (const index of [0, 1, 3, 4, 5, 6]) assert.equal(firstStory.pose[index], secondStory.pose[index], 'Reading preserves the straight axis and camera heading');
    assert(secondStory.pose[2] <= firstStory.pose[2], 'Reading continues forward');
    await wheelTo(3.23);
    const reversedStory = await storyAt(3.23, firstSentence);
    reversedStory.pose.forEach((value, i) => assert(Math.abs(value - firstStory.pose[i]) < .02, `Reverse scroll restores camera pose ${i}: ${value} versus ${firstStory.pose[i]}`));
    await wheelTo(3.95);
    await storyAt(3.95, secondSentence);
    await wheelTo(4.24);
    await page.waitForTimeout(260); // A separate gesture after the preceding reading stop.
    const cylinderArrivalFrame = page.evaluate(() => new Promise(resolve => {
      const timeout = setTimeout(() => { observer.disconnect(); resolve({ missing: true }); }, 10000);
      const observer = new MutationObserver(() => {
        const room = document.querySelector('.screening-room');
        const pose = room?.dataset.cylinderPose?.split(',').map(Number);
        if (!pose || pose.length !== 4 || !pose.every(Number.isFinite)) return;
        observer.disconnect(); clearTimeout(timeout);
        resolve({ pose, busy: room.getAttribute('aria-busy'), phase: room.dataset.flowPhase,
          flash: Number(getComputedStyle(room.querySelector('.screening-core-flash')).opacity),
          tabs: room.querySelector('.screening-kinds').getAnimations().map(animation => animation.animationName) });
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cylinder-pose'] });
      document.querySelector('.virgo-page').setAttribute('data-qa-cylinder-ready', 'true');
    }));
    void cylinderArrivalFrame.catch(() => {}); // Preserve the primary error if the page closes before this observation finishes.
    await page.waitForFunction(() => document.querySelector('.virgo-page')?.hasAttribute('data-qa-cylinder-ready'));
    // Hold the browser clock while taking screenshots: a slow screenshot RPC
    // must not consume the short core flash or cylinder reveal being checked.
    if (name !== 'reduced') await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const approachFrame = name === 'reduced' ? null : page.evaluate(() => new Promise(resolve => {
      const root = document.querySelector('.virgo-page');
      const timeout = setTimeout(() => { observer.disconnect(); resolve({ missing: true, hash: location.hash,
        seconds: root.style.getPropertyValue('--showcase-approach'), solar: root.dataset.solarPassage,
        passage: document.querySelector('.virgo-showcase-passage')?.dataset.phase,
        galleryPresent: !!document.querySelector('.screening-room') }); }, 6000);
      const observer = new MutationObserver(() => {
        const solar = root.dataset.solarPassage?.split(',').map(Number);
        const p = solar?.[0];
        const pose = root.dataset.cameraPose?.split(',').map(Number);
        const passage = document.querySelector('.virgo-showcase-passage[data-phase="approaching"]');
        if (!passage || p === undefined || p < 2.56 || !pose || pose[2] >= -480) return;
        observer.disconnect(); clearTimeout(timeout);
        resolve({ hash: location.hash, galleryPresent: !!document.querySelector('.screening-room'),
          opacity: Number(getComputedStyle(passage.querySelector('.virgo-solar-flash')).opacity),
          rectangularFrames: document.querySelectorAll('.virgo-showcase-aperture,.screening-flow-portal').length,
          solar,
          pose });
      });
      observer.observe(root, { attributes: true, attributeFilter: ['style', 'data-solar-passage'] });
      root.setAttribute('data-qa-approach-ready', 'true');
    }));
    if (name !== 'reduced') await page.waitForFunction(() => document.querySelector('.virgo-page')?.hasAttribute('data-qa-approach-ready'));
    await page.mouse.wheel(0, 120);
    if (name !== 'reduced') await page.clock.runFor(2580);
    if (name !== 'reduced') {
      const frame = await approachFrame;
      if (frame.missing) {
        await page.screenshot({ path: `${output}/${name}-showcase-entry-failure.png` });
        await writeFile(`${output}/${name}-showcase-entry-failure.json`, JSON.stringify(frame, null, 2));
      }
      assert.equal(frame.galleryPresent, false, 'The lead-in is visible before the gallery mounts');
      assert(!frame.hash.startsWith('#/showcase'), 'The lead-in precedes the showcase route change');
      assert.equal(frame.rectangularFrames, 0, 'Core entry removes every rectangular transition frame');
      assert(frame.opacity > .5, 'The stellar flash lights the full viewport before opening the gallery');
      assert(frame.solar[1] > 3.99 && frame.solar[2] === 0, 'Planet orbits accelerate while the camera keeps zero roll');
      const initialRadius = Math.hypot(secondStory.pose[0], secondStory.pose[1], secondStory.pose[2] + 480);
      assert(frame.solar[3] < initialRadius * .25, 'The actual camera dives into the core rather than stopping at 30 percent');
      assert(frame.pose[2] < -480 && secondStory.pose[2] > -480, 'The rendered camera crosses the solar centre along -Z');
      for (const index of [0, 1, 3, 4, 5, 6]) assert.equal(frame.pose[index], secondStory.pose[index], 'Showcase entry preserves the straight heading');
      assert(Math.hypot(...frame.pose.slice(0, 3).map((value, i) => value - secondStory.pose[i])) > 2, 'The real camera moves forward during the lead-in');
      await page.screenshot({ path: `${output}/${name}-showcase-before-entry.png` });
      await page.clock.runFor(200);
    }
    await page.waitForFunction(() => location.hash === '#/showcase/mpoly');
    await gallery.waitFor({ state: 'visible' });
    if (name === 'reduced') await page.waitForTimeout(180);
    const cylinderStart = await cylinderArrivalFrame;
    await writeFile(`${output}/${name}-cylinder-arrival.json`, JSON.stringify(cylinderStart, null, 2));
    if (cylinderStart.missing) {
      await page.screenshot({ path: `${output}/${name}-cylinder-arrival-failure.png` });
      await writeFile(`${output}/${name}-cylinder-arrival-failure.json`, JSON.stringify(cylinderStart, null, 2));
    }
    if (name === 'reduced') assert.deepEqual(cylinderStart.pose, [-2500, 0, 0, 0], 'Reduced motion skips cylinder movement and roll');
    else {
      assert(cylinderStart.pose[0] > -2500 && cylinderStart.pose[1] < -1 && cylinderStart.pose[2] > .001, 'Screens rise from below and stand upright as the camera decelerates');
      assert.equal(cylinderStart.busy, 'true', 'Gallery controls wait until the four-second landing finishes');
      assert(cylinderStart.tabs.includes('screening-tabs-rise'), 'Chapter tabs enter from above after the cylinder reveal');
    }
    await page.screenshot({ path: `${output}/${name}-showcase-arrival.png` });
    if (name !== 'reduced') await page.clock.runFor(1400);
    await page.waitForFunction(() => !document.querySelector('.screening-room')?.hasAttribute('aria-busy'));
    await hashIs('mpoly');
    assert.deepEqual(await gallery.evaluate(el => el.dataset.cylinderPose.split(',').map(Number)), [-2500, 0, 0, 0], 'The cylinder lands at the requested camera coordinates');
    assert.equal(await gallery.locator('.screening-core-flash').evaluate(el => getComputedStyle(el).opacity), '0', 'The core flash clears completely after arrival');
    await page.screenshot({ path: `${output}/${name}-automatic-showcase.png` });
    if (name !== 'reduced') await page.clock.resume();
    await gallery.press('End');
    await hashIs('backup');
    const departureFrame = name === 'reduced' ? null : gallery.evaluate(el => new Promise(resolve => {
      const timeout = setTimeout(() => { observer.disconnect(); resolve({ phase: el.getAttribute('data-flow-phase'), connected: el.isConnected }); }, 5000);
      const observer = new MutationObserver(() => {
        if (el.getAttribute('data-flow-phase') !== 'departing') return;
        observer.disconnect();
        clearTimeout(timeout);
        resolve({ phase: el.getAttribute('data-flow-phase'), portal: getComputedStyle(el.querySelector('.screening-core-flash')).animationName });
      });
      observer.observe(el, { attributes: true, attributeFilter: ['data-flow-phase'] });
      el.setAttribute('data-qa-departure-ready', 'true');
    }));
    if (name !== 'reduced') await page.waitForFunction(() => document.querySelector('.screening-room')?.hasAttribute('data-qa-departure-ready'));
    await page.mouse.wheel(0, 120);
    if (name !== 'reduced') {
      assert.deepEqual(await departureFrame, { phase: 'departing', portal: 'screening-core-return' }, 'Exit plays the stellar light passage before unmounting');
      await page.screenshot({ path: `${output}/${name}-showcase-departure.png` });
    }
    await gallery.waitFor({ state: 'detached' });
    await storyAt(4.92, 'Those projects shape the way I build.');
    await page.waitForTimeout(260);
    await wheelTo(4.81);
    await page.mouse.wheel(0, -120);
    await hashIs('backup');
    await gallery.press('Home');
    await hashIs('mpoly');
    await page.waitForTimeout(560);
    await page.mouse.wheel(0, -120);
    await gallery.waitFor({ state: 'detached' });
    await storyAt(3.95, secondSentence);
    if (name === 'phone') {
      const touch = await context.newCDPSession(page);
      const swipe = async (from, to) => {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: from }] });
        for (let step = 1; step <= 16; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: from + (to - from) * step / 16 }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(700);
      };
      for (let attempt = 0; attempt < 3 && !await gallery.isVisible(); attempt++) await swipe(650, 130);
      await hashIs('mpoly');
      await swipe(160, 510);
      await gallery.waitFor({ state: 'detached' });
      await storyAt(3.95, secondSentence);
      await touch.detach();
    }
    let contactFlight = [];
    if (name !== 'reduced') {
      await page.goto(`${base}#/skills`, { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
      await page.waitForFunction(() => Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 - 4.92) < .001);
      const wholeFlight = page.evaluate(() => new Promise(resolve => {
        const frames = [], start = performance.now();
        const record = () => {
          const root = document.querySelector('.virgo-page');
          const p = Number(root?.style.getPropertyValue('--flight-progress')) * 6;
          if (p >= 5.30 && p <= 5.82) frames.push({ p, pose: root.dataset.cameraPose.split(',').map(Number) });
          if (p > 5.83 || performance.now() - start > 20000) resolve(frames);
          else requestAnimationFrame(record);
        };
        requestAnimationFrame(record);
      }));
      await page.locator('.virgo-scroll').press('End');
      contactFlight = await wholeFlight;
      if (contactFlight.length <= 20) await writeFile(`${output}/${name}-flight-failure.json`, JSON.stringify({ contactFlight,
        current: await page.locator('.virgo-page').evaluate(el => ({ dataset: { ...el.dataset }, style: el.getAttribute('style'), top: document.querySelector('.virgo-scroll').scrollTop, focus: document.activeElement.className }))
      }, null, 2));
      assert(contactFlight.length > 20, `${name}: the actual keyboard journey includes a sustained approach`);
      for (let i = 1; i < contactFlight.length; i++) {
        const previous = contactFlight[i - 1].pose, pose = contactFlight[i].pose;
        assert(pose[2] <= previous[2] + .001, 'The forward fly-by never retreats');
        assert.equal(pose[0], 0); assert.equal(pose[1], 0, 'The camera keeps its straight axis');
        assert.deepEqual(pose.slice(3), [0, 0, 0, 1], 'The camera never turns during the approach');
      }
    }
    await page.goto(`${base}#/contact`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 > 5.8);
    const contactShot = await page.screenshot({ path: `${output}/${name}-contact-arrival.png` });
    const contactRaw = await sharp(contactShot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(await page.locator('.virgo-contact-narrative, .virgo-portal-hint').count(), 0, 'The black-hole view contains no narrative or instruction text');
    const contactBoxes = await page.locator('.virgo-overlay-panel[aria-labelledby="virgo-contact-title"] .virgo-bare').evaluateAll(elements => elements.filter(el => getComputedStyle(el).display !== 'none').map(el => {
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }));
    for (const box of contactBoxes) {
      assert(box.x >= 0 && box.right <= options.viewport.width + 1 && box.y >= 0 && box.bottom <= options.viewport.height,
        `${name}: Contact reading and links fit (${JSON.stringify({ box, viewport: options.viewport })})`);
      let plasma = 0;
      for (let y = Math.ceil(box.y); y < box.bottom; y++) for (let x = Math.ceil(box.x); x < box.right; x++) {
        const i = (y * contactRaw.info.width + x) * 3;
        if (contactRaw.data[i] > 120 && contactRaw.data[i + 1] > 65 && contactRaw.data[i + 1] >= contactRaw.data[i + 2] + 10) plasma++;
      }
      assert(plasma < (box.right - box.x) * (box.bottom - box.y) * .01, `${name}: Contact text and links stay out of the luminous disk`);
    }
    const scroller = page.locator('.virgo-scroll');
    const approachFrames = [];
    for (const p of [5.42, 5.68]) {
      await scroller.evaluate((el, p) => {
        const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        el.scrollTop = offsets[5] + (offsets[6] - offsets[5]) * (p - 5);
      }, p);
      await page.waitForFunction(p => Math.abs(Number(document.querySelector('.virgo-page').style.getPropertyValue('--flight-progress')) * 6 - p) < .001, p);
      await page.waitForTimeout(160);
      const shot = await page.screenshot({ path: `${output}/${name}-approach-${p}.png` });
      const raw = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let warm = 0;
      for (let y = Math.floor(raw.info.height * .25); y < raw.info.height * .70; y++) for (let x = Math.floor(raw.info.width * .1); x < raw.info.width * .9; x++) {
        const i = (y * raw.info.width + x) * 3;
        if (raw.data[i] > 140 && raw.data[i + 1] > 90 && raw.data[i + 1] >= raw.data[i + 2] + 8) warm++;
      }
      approachFrames.push({ p, warm, pose: await page.locator('.virgo-page').evaluate(el => el.dataset.cameraPose.split(',').map(Number)) });
    }
    if (name !== 'reduced') {
      assert(approachFrames[1].warm > 30 && approachFrames[1].warm > approachFrames[0].warm, `${name}: the luminous black hole is visible from afar and grows during approach`);
      assert(approachFrames[1].pose[2] < approachFrames[0].pose[2], 'The actual camera advances towards the gate');
      assert(approachFrames.every(frame => frame.pose[0] === 0 && frame.pose[1] === 0 && frame.pose.slice(3).every((value, i) => value === [0, 0, 0, 1][i])), 'The approach keeps its axis and forward heading');
    }
    await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const portal = page.getByRole('button', { name: 'Open workspace through Zavijava', exact: true });
    await portal.waitFor({ state: 'visible' });
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page').style.getPropertyValue('--flight-progress')) * 6 > 5.99999);
    await page.mouse.move(12, options.viewport.height / 2);
    await page.waitForTimeout(500);
    const holeImage = await page.screenshot({ path: `${output}/${name}-black-hole.png` });
    const portalBounds = await portal.boundingBox();
    const centerX = portalBounds.x + portalBounds.width / 2, centerY = portalBounds.y + portalBounds.height / 2;
    if (name !== 'phone') {
      assert(Math.abs(centerX - options.viewport.width / 2) < 2, 'The desktop black-hole gate is centered horizontally');
      assert(Math.abs(centerY - options.viewport.height / 2) < 2, 'The desktop black-hole gate is centered vertically');
    }
    const radius = Math.min(options.viewport.width, options.viewport.height) * .3;
    const { data: pixels, info: imageInfo } = await sharp(holeImage).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, shadowPixels = 0;
    // Select the two connected polar caps, rather than unrelated black sky in
    // the square around a small phone view. The foreground separates the caps.
    const seen = new Set(), queue = [];
    for (const side of [-1, 1]) queue.push([Math.round(centerX - radius * .04), Math.round(centerY + side * radius * .28)]);
    for (let head = 0; head < queue.length; head++) {
      const [x, y] = queue[head], key = y * imageInfo.width + x;
      if (x < 0 || x >= imageInfo.width || y < 0 || y >= imageInfo.height
        || Math.abs(x - centerX) > radius || Math.abs(y - centerY) > radius || seen.has(key)) continue;
      seen.add(key);
      const pixel = key * imageInfo.channels;
      if (pixels[pixel] + pixels[pixel + 1] + pixels[pixel + 2] > 5) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y); shadowPixels++;
      queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }
    const shadow = { width: maxX - minX + 1, height: maxY - minY + 1, pixels: shadowPixels };
    assert(shadowPixels > 60 && shadow.width > 8 && shadow.height > 8, `${name}: a visible black-hole core must remain`);
    // A spinning Kerr shadow is slightly flattened and displaced. Gargantua's
    // foreground disk physically occludes its equator, as requested on 14/10.
    assert(Math.abs(shadow.width / shadow.height - 1) < .14, `${name}: the Kerr shadow retains a near-circular silhouette (${shadow.width}×${shadow.height})`);
    assert(shadowPixels / (Math.PI * shadow.width * shadow.height / 4) > .55, `${name}: a substantial dark shadow survives the foreground disk`);
    let innerPixels = 0, darkInnerPixels = 0, foregroundPixels = 0;
    const halfCore = Math.min(shadow.width, shadow.height) / 2;
    const coreRadius = halfCore * .86;
    const shadowX = (minX + maxX) / 2, shadowY = (minY + maxY) / 2;
    for (let y = Math.ceil(shadowY - coreRadius); y <= Math.floor(shadowY + coreRadius); y++) {
      for (let x = Math.ceil(shadowX - coreRadius); x <= Math.floor(shadowX + coreRadius); x++) {
        if ((x - shadowX) ** 2 + (y - shadowY) ** 2 > coreRadius ** 2) continue;
        const pixel = (y * imageInfo.width + x) * imageInfo.channels;
        const planeY = y - centerY + Math.tan(.1) * (x - centerX);
        // Two screen pixels cover the filtered foreground edge on small views;
        // the polar caps beyond that edge retain the strict darkness check.
        if (Math.abs(planeY) < halfCore * .6 + 2) {
          if (pixels[pixel] > 120) foregroundPixels++;
          continue;
        }
        innerPixels++;
        if (pixels[pixel] + pixels[pixel + 1] + pixels[pixel + 2] <= 8) darkInnerPixels++;
      }
    }
    assert(innerPixels > halfCore ** 2 * .1 && darkInnerPixels / innerPixels > .985, `${name}: the unoccluded polar shadow stays dark with no stray gas patches`);
    assert(foregroundPixels > halfCore ** 2 * .10, `${name}: the bright foreground disk crosses the shadow instead of being hidden behind a painted black circle`);
    const labelBounds = await portal.locator('.virgo-portal-label').boundingBox();
    assert(labelBounds.height >= 44 && labelBounds.y + labelBounds.height <= imageInfo.height, `${name}: the visible workspace entry is reachable and fits the viewport`);
    const effects = { warm: 0, outside: 0, midtones: 0, highlights: 0, left: 0, right: 0, arch: 0, moved: 0 };
    const renderStats = () => page.locator('.virgo-page').evaluate(el => ({
      traces: Number(el.dataset.blackHoleTraceCount),
      shades: Number(el.dataset.blackHoleShadeCount),
      frameMs: Number(el.dataset.blackHoleFrameMs),
      resolution: Number(el.dataset.blackHoleResolution),
      rayResolution: Number(el.dataset.blackHoleRayResolution),
    }));
    const beforeMotion = await renderStats();
    assert(beforeMotion.resolution > 0, `${name}: black hole resolution is positive`);
    assert.equal(beforeMotion.resolution, beforeMotion.rayResolution, `${name}: ray resolution matches shade resolution before motion`);
    const motionStartedAt = performance.now(); // Node clock stays real when Playwright controls the page clock.
    const isWarm = (data, pixel) => data[pixel] > 70 && data[pixel] >= data[pixel + 1]
      && data[pixel + 1] >= data[pixel + 2] + 2 && data[pixel] >= data[pixel + 2] + 4;
    await page.waitForTimeout(1100);
    const afterMotion = await renderStats();
    assert.equal(afterMotion.resolution, afterMotion.rayResolution, `${name}: ray resolution matches shade resolution after motion`);
    const realMotionDurationMs = performance.now() - motionStartedAt;
    const realGasFps = (afterMotion.shades - beforeMotion.shades) * 1000 / realMotionDurationMs;
    const laterImage = await page.screenshot({ path: `${output}/${name}-black-hole-motion.png` });
    assert.equal(afterMotion.traces, beforeMotion.traces, `${name}: gas animation reuses the stationary ray geometry`);
    if (name !== 'reduced') {
      assert(afterMotion.shades - beforeMotion.shades >= 10, `${name}: continuous gas movement updates at least ten frames in the motion window`);
      assert(afterMotion.frameMs > 0 && afterMotion.frameMs < 50, `${name}: steady scene cadence stays above 20fps (${afterMotion.frameMs}ms)`);
      assert(realGasFps >= 20, `${name}: gas updates stay above 20fps in real elapsed time (${realGasFps.toFixed(1)}fps over ${realMotionDurationMs.toFixed(0)}ms)`);
    } else assert.equal(afterMotion.shades, beforeMotion.shades, 'Reduced motion keeps the gas frozen');
    const laterPixels = await sharp(laterImage).removeAlpha().raw().toBuffer();
    let diskBottom = 0;
    for (let y = 0; y < imageInfo.height; y++) {
      // The full-width chapter progress line is UI, not orbiting gas.
      if (y >= imageInfo.height - 4) continue;
      for (let x = 0; x < imageInfo.width; x++) {
        if (x >= labelBounds.x - 32 && x <= labelBounds.x + labelBounds.width + 32 && y >= labelBounds.y - 32) continue;
        const pixel = (y * imageInfo.width + x) * imageInfo.channels;
        if (!isWarm(pixels, pixel) && !isWarm(laterPixels, pixel)) continue;
        effects.warm++;
        const dx = x - centerX, dy = y - centerY;
        if (Math.abs(dx) > halfCore * 4.6 || Math.abs(dy) > halfCore * 2.5) effects.outside++;
        if (pixels[pixel] > 220) effects.highlights++;
        else if (pixels[pixel] < 205) effects.midtones++;
        if (dx < -halfCore * 1.15) effects.left++;
        if (dx > halfCore * 1.15) effects.right++;
        if (dy < -halfCore * 1.15) effects.arch++;
        if (pixels[pixel] > 100) diskBottom = Math.max(diskBottom, y);
        if (Math.max(...[0, 1, 2].map(channel => Math.abs(pixels[pixel + channel] - laterPixels[pixel + channel]))) > 20) effects.moved++;
      }
    }
    assert(effects.warm > halfCore ** 2, `${name}: the accretion disk is visible`);
    // Measure the stable shadow diameter; bright outer gas changes with time.
    if (name === 'desktop' || name === 'reduced') assert(shadow.width > Math.min(imageInfo.width, imageInfo.height) * .25, 'The enlarged desktop shadow spans over a quarter of the viewport short edge');
    assert(effects.outside / effects.warm < .005, `${name}: spiral light stays around the black-hole belt, with no stray warm trails across the screen`);
    assert(effects.midtones / effects.warm > .15 && effects.highlights / effects.warm > .001, `${name}: the gas has dark lanes and hot highlights rather than one flat yellow surface`);
    for (const part of ['left', 'right', 'arch']) assert(effects[part] > halfCore ** 2 * .04, `${name}: ${part} of the disk remains visible`);
    assert(labelBounds.y >= diskBottom + 8, `${name}: the workspace label does not cover the lensed lower disk`);
    if (options.reducedMotion === 'reduce') assert(effects.moved / effects.warm < .02, `${name}: reduced motion freezes the disk and trails`);
    else assert(effects.moved / effects.warm > .06, `${name}: real gas and spiral trails animate around the belt`);
    if (name === 'desktop' || name === 'reduced') {
      const orbitControl = page.locator('.virgo-black-hole-orbit');
      await orbitControl.waitFor({ state: 'visible' });
      const angle = () => orbitControl.evaluate(el => ({ azimuth: Number(el.dataset.azimuth), elevation: Number(el.dataset.elevation), dragging: el.dataset.dragging === 'true' }));
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 200, centerY + 70, { steps: 12 });
      const dragged = await angle();
      assert(Math.abs(dragged.azimuth) > .5 && dragged.elevation > .35 && dragged.dragging, `${name}: dragging changes both orbit angles`);
      assert(page.url().endsWith('#/contact'), `${name}: dragging over the core must not open the workspace`);
      await page.waitForTimeout(450);
      const tiltedImage = await page.screenshot({ path: `${output}/${name}-black-hole-orbit.png` });
      const tiltedPixels = await sharp(tiltedImage).removeAlpha().raw().toBuffer();
      let viewChanges = 0;
      for (let y = Math.floor(centerY - halfCore * 2.3); y < Math.ceil(centerY + halfCore * 2.3); y++) {
        for (let x = Math.floor(centerX - halfCore * 4); x < Math.ceil(centerX + halfCore * 4); x++) {
          const pixel = (y * imageInfo.width + x) * imageInfo.channels;
          if (Math.abs(pixels[pixel] - tiltedPixels[pixel]) > 40) viewChanges++;
        }
      }
      assert(viewChanges > halfCore ** 2 * .2, `${name}: the rendered disk really changes view, including with its animation clock frozen`);
      await page.mouse.move(options.viewport.width - 5, centerY + 70, { steps: 8 });
      await page.mouse.up();
      const released = await angle();
      assert(!released.dragging && Math.abs(released.azimuth) > Math.abs(dragged.azimuth), `${name}: pointer capture keeps the orbit controllable outside its region and releases cleanly`);
      await page.mouse.move(centerX - 160, centerY - 50);
      assert.deepEqual(await angle(), released, `${name}: moving the mouse after release keeps the chosen view`);
      await page.mouse.dblclick(centerX, centerY);
      assert.deepEqual(await angle(), { azimuth: 0, elevation: .13, dragging: false }, `${name}: double click resets the view without entering the workspace`);
      await page.mouse.down();
      await page.mouse.move(centerX + 120, centerY - 200, { steps: 12 });
      await page.mouse.up();
      assert.equal((await angle()).elevation, -.55, `${name}: looking below the disk remains bounded`);
      await page.waitForTimeout(450);
      const belowImage = await page.screenshot({ path: `${output}/${name}-black-hole-orbit-below.png` });
      const belowPixels = await sharp(belowImage).removeAlpha().raw().toBuffer();
      const belowLabel = await portal.locator('.virgo-portal-label').boundingBox();
      let belowDiskBottom = 0;
      for (let y = 0; y < Math.floor(belowLabel.y - 8); y++) {
        for (let x = Math.floor(centerX - halfCore * 4); x < Math.ceil(centerX + halfCore * 4); x++) {
          const pixel = (y * imageInfo.width + x) * imageInfo.channels;
          if (belowPixels[pixel] > 100 && isWarm(belowPixels, pixel)) belowDiskBottom = Math.max(belowDiskBottom, y);
        }
      }
      assert(belowLabel.y >= belowDiskBottom + 12 && belowLabel.y + belowLabel.height <= imageInfo.height, `${name}: the workspace entry fits below the disk even when viewed from underneath`);
      await page.mouse.dblclick(centerX, centerY);
      await orbitControl.press('ArrowRight');
      await orbitControl.press('ArrowUp');
      const keyed = await angle();
      assert(keyed.azimuth > .1 && keyed.elevation > .13, `${name}: keyboard arrows also orbit the black hole`);
      await orbitControl.press('Home');
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await orbitControl.dispatchEvent('pointercancel');
      await page.mouse.up();
      assert.deepEqual(await angle(), { azimuth: 0, elevation: .13, dragging: false }, `${name}: canceled gestures do not leave the orbit stuck`);
      assert(page.url().endsWith('#/contact'), `${name}: orbit interaction stays on Contact`);
    }
    await page.locator('.virgo-black-hole-orbit').press('ArrowRight');
    const entryView = await page.locator('.virgo-black-hole-orbit').evaluate(el => el.dataset.azimuth);
    await page.waitForFunction(expected => {
      const root = document.querySelector('.virgo-page');
      return root.dataset.blackHoleViewSettled === 'true' && Math.abs(Number(root.dataset.blackHoleRenderAzimuth) - Number(expected)) < .00001;
    }, entryView);
    await page.evaluate(() => {
      window.__workspaceFlightFrames = [];
      window.__workspaceOrbitFrames = [];
      window.__workspaceCacheFrames = [];
      const record = () => {
        const root = document.querySelector('.virgo-page');
        if (!root) return;
        if (root.classList.contains('virgo-is-entering')) {
          window.__workspaceFlightFrames.push(root.dataset.cameraPose.split(',').map(Number));
          window.__workspaceOrbitFrames.push(document.querySelector('.virgo-black-hole-orbit')?.dataset.azimuth);
          window.__workspaceCacheFrames.push(root.dataset.blackHoleTraceCount);
        }
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    await portal.locator('.virgo-portal-label').click();
    await page.waitForURL('**/#/workspace');
    if (name !== 'reduced') {
      const entryFrames = await page.evaluate(() => window.__workspaceFlightFrames);
      assert(entryFrames.length > 3 && entryFrames.at(-1)[2] < entryFrames[0][2] - 50, 'Workspace entry retains the visible forward flight');
      entryFrames.forEach((pose, i) => {
        assert(Math.abs(pose[0]) < .001 && Math.abs(pose[1]) < .001, 'Entry stays on the same straight axis');
        if (i) assert(pose[2] <= entryFrames[i - 1][2] + .001, 'Entry does not pull back before advancing');
      });
      assert((await page.evaluate(() => window.__workspaceOrbitFrames)).every(view => view === entryView), 'Entry keeps the mouse-selected black-hole view instead of resetting it during flight');
      const entryCaches = await page.evaluate(() => window.__workspaceCacheFrames);
      assert(entryCaches.every(count => count === entryCaches[0]), 'Entry reuses ray geometry without a resolution rebuild inside the transition');
    }
    try {
      await page.getByRole('button', { name: 'Contents', exact: true }).waitFor({ timeout: 15000 });
    } catch (error) {
      await page.screenshot({ path: `${output}/${name}-failure.png` });
      await writeFile(`${output}/${name}-failure.json`, JSON.stringify({ url: page.url(), errors, body: await page.locator('body').innerText() }, null, 2));
      throw error;
    }
    assert.deepEqual(errors, [], `${name}: no runtime or shader errors`);
    report.push({ name, viewport: options.viewport, fit: initialFit, shadow, blackHoleEffects: effects, renderStats: { beforeMotion, afterMotion, realMotionDurationMs, realGasFps }, contactBoxes, contactFlight, approachFrames, passed: true });
    await writeReport('running');
    await context.close();
    console.log(`PASS: ${name} layout, gallery inputs/routes, Manager removal, sequential sentences, straight camera/reverse scroll, mute and workspace entry.`);
  }
  assert.equal(await fingerprintSource(), sourceSha256, 'Source changed during UI verification; rerun against one stable version');
  await writeReport('passed');
} catch (error) {
  await writeReport('failed', error.message);
  throw error;
} finally {
  await browser?.close();
  await server?.close();
}
