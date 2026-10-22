import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import sharp from 'sharp';

// A convex interior includes holes/stray gas inside each cap. It does not
// assume that the inclined foreground disk crosses the gate's screen centre.
const cross = (a, b, p) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function convexHull(points) {
  const sorted = points.slice().sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  const lower = [], upper = [];
  for (const point of sorted) {
    while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  for (const point of sorted.reverse()) {
    while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}

function luminousDiskBounds(data, info, isWarm) {
  const seen = new Uint8Array(info.width * info.height);
  let largest = { pixels: 0, bottom: 0 };
  for (let seed = 0; seed < seen.length; seed++) {
    if (seen[seed]) continue;
    seen[seed] = 1;
    if (data[seed*info.channels] <= 100 || !isWarm(data,seed*info.channels)) continue;
    const queue = [seed]; let bottom = 0;
    for (let head = 0; head < queue.length; head++) {
      const key=queue[head], x=key%info.width, y=Math.floor(key/info.width);
      bottom=Math.max(bottom,y);
      for (const next of [x>0?key-1:-1,x<info.width-1?key+1:-1,y>0?key-info.width:-1,y<info.height-1?key+info.width:-1]) {
        if (next<0 || seen[next]) continue;
        seen[next]=1;
        if(data[next*info.channels]>100 && isWarm(data,next*info.channels)) queue.push(next);
      }
    }
    if(queue.length>largest.pixels)largest={pixels:queue.length,bottom};
  }
  return largest;
}

// Optional URL reuses a running server; otherwise start an isolated local Vite server.
const output = process.env.UI_OUTPUT || 'artifacts/feature-preservation';
await mkdir(output, { recursive: true });
const server = process.argv[2] ? null : await createServer({ cacheDir: 'node_modules/.vite-ui', server: { host: '127.0.0.1', port: Number(process.env.UI_PORT) || 5181, strictPort: true, hmr: false } });
let browser;
const report = [];
const selectedScenarios = process.env.UI_SCENARIOS?.split(',');
const onlyBlackHole = process.env.UI_PHASE === 'black-hole';
const reportPath = `${output}/${selectedScenarios ? `report-${selectedScenarios.join('-')}` : 'report'}${onlyBlackHole?'-black-hole':''}.json`;
const startedAt = new Date().toISOString();
const fingerprintSource = async () => {
  const paths = ['package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'scripts/templates/deployment-gate.js', '.github/workflows/deploy.yml', 'scripts/check-ui.mjs', ...(await readdir('src', { recursive: true }))
    .filter(path => /\.(tsx?|jsx?|css|json)$/.test(path)).map(path => `src/${path.replaceAll('\\', '/')}`)].sort();
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
    if (process.env.UI_VIEWPORT_WIDTH || process.env.UI_VIEWPORT_HEIGHT) {
      assert.equal(selectedScenarios?.length,1,'Viewport overrides require one selected scenario');
      options.viewport={width:Number(process.env.UI_VIEWPORT_WIDTH)||options.viewport.width,height:Number(process.env.UI_VIEWPORT_HEIGHT)||options.viewport.height};
    }
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const waitForApp = async () => {
      await page.locator('#root > *').first().waitFor({ state: 'attached' });
      await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    };
    // Install before GSAP loads; its ticker retains the initial Date.now.
    await page.clock.install();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /Shader Error|VALIDATE_STATUS|Error creating WebGL/.test(message.text())) errors.push(message.text());
    });
    await page.route('**/track', route => route.fulfill({ status: 204 }));
    await page.route('**/api/track', route => route.fulfill({ status: 204 }));
    await page.route(/^https:\/\/(?:[^/]+\.)?zney295\.id\.vn(?:\/|$)/, route => route.fulfill({
      contentType: 'text/html', body: '<style>body{min-height:1800px;font:18px sans-serif;padding:20px}button,input{min-height:44px}</style><h1>Local live-preview fixture</h1><button onclick="this.textContent=\'Clicked in 3D\'">Test DOM click</button><input aria-label="Test DOM input" />',
    }));
    const gallery = page.locator('dialog.screening-room');
    const rail = gallery.locator('.screening-rail');
    const galleryDragPoint = () => rail.evaluate(rail => {
      const rect=rail.getBoundingClientRect(),x=rect.x+rect.width*.72;
      for(let y=rect.y+80;y<rect.bottom-48;y+=12)if(document.elementFromPoint(x,y)===rail)return{x,y};
      throw new Error('No exposed gallery background for a drag gesture');
    });
    const parkWheelOnGallery = async () => {
      // An actual visible chrome control stays outside every projected live iframe.
      await gallery.getByRole('button', { name: 'Web experiences', exact: true }).hover();
    };
    const wheelThroughGallery = async (x,y) => {
      // Each packet intentionally has bounded lead. A huge delta is not a jump
      // to the next product; exercise a real sequence of wheel packets instead.
      for(let packet=0;packet<8;packet++){await page.mouse.wheel(x,y);await page.waitForTimeout(150);}
    };
    const title = gallery.locator('.screening-title');
    const hashIs = async id => {
      try {
        await page.waitForFunction(expected => location.hash === expected, `#/showcase/${id}`);
      } catch (error) {
        await writeFile(`${output}/${name}-route-failure.json`, JSON.stringify(await page.evaluate(() => ({
          hash: location.hash, focus: document.activeElement?.outerHTML.slice(0, 300),
          gallery: document.querySelector('dialog.screening-room')?.outerHTML.slice(0, 800),
          title: document.querySelector('.screening-title')?.textContent,
        })), null, 2));
        await page.screenshot({ path: `${output}/${name}-route-failure.png` });
        throw error;
      }
      await page.waitForFunction(id => document.querySelector(`.screening-slide.is-active[data-product-id="${id}"]`), id);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.screening-caption-stack')).opacity === '1');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('dialog.screening-room')).opacity === '1');
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
        const hitboxes=selector=>Array.from(document.querySelectorAll(selector)).map(el=>el.getBoundingClientRect().toJSON());
        const footer={actions:hitboxes('.screening-actions-row a,.screening-actions-row button'),reading:hitboxes('.screening-reading-links a,.screening-reading-links button')};
        return { width: innerWidth, height: innerHeight, preview: rect('.screening-slide.is-active'), tabs: rect('.screening-kinds'), caption: rect('.screening-caption-stack'), dots: rect('.screening-pagination'), close: rect('.screening-close'), actions: rect('.screening-actions-row'), footer, hint: hintVisible ? rect('.screening-hint-badge') : null, controls: [...document.querySelectorAll('.screening-kinds button,.screening-dot,.screening-actions-row a,.screening-actions-row button,.screening-close')].map(el => ({ label: el.getAttribute('aria-label') || el.textContent.trim(), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })) };
      });
      try {
      for (const key of ['caption', 'dots', 'actions']) {
        const box = boxes[key];
        assert(box.x >= -1 && box.right <= boxes.width + 1 && box.y >= 0 && box.bottom <= boxes.height + 1, `${name}: ${key} fits the viewport`);
      }
      if (name === 'landscape') {
        assert(boxes.caption.right + 8 <= boxes.preview.x && boxes.caption.y > boxes.dots.bottom + 4,
          'Landscape captions sit beside the screen and below product controls');
        assert(boxes.dots.right+12<=boxes.close.x,'Landscape product controls keep clear of the close button');
        for(const a of boxes.footer.actions)for(const b of boxes.footer.reading)
          assert(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'Landscape actions and reading links do not cover each other');
      }
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

    let initialFit = null, contactFlight = [];
    if (!onlyBlackHole) {
    await page.goto(`${base}#/showcase/beatsync`, { waitUntil: 'domcontentloaded' });
    // The bootstrap checks deployment metadata before importing React's app.
    // Wait for its actual route before testing whether a world needs entering.
    await page.locator('.worlds-showcase, dialog.screening-room').first().waitFor();
    await waitForApp();
    if (await page.locator('.worlds-showcase').count()) await page.getByRole('button', { name: 'Enter world', exact: true }).click();
    const showcaseEnabled = await page.locator('.virgo-page').getAttribute('data-showcase-enabled') === 'true';
    if (name === 'desktop' || name === 'reduced') assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).cursor), 'default', 'Use the native system arrow from the current baseline');
    if (showcaseEnabled) {
    await gallery.waitFor({ state: 'visible' });
    await waitForApp();
    await gallery.locator('.screening-slide.is-active .screening-tv[data-state="ready"]').waitFor();
    await gallery.locator('.screening-css3d .screening-surface[data-space-pose]').first().waitFor({ state: 'attached' });
    await page.waitForFunction(() => Number(document.querySelector('.screening-room')?.style.getPropertyValue('--screen-focus')) > .999);
    await hashIs('beatsync');
    assert((await gallery.locator('.screening-title').evaluate(el => getComputedStyle(el).fontFamily)).includes('Outfit'), 'Gallery titles use the shared sans-serif face');
    assert.equal(await gallery.locator('.screening-rail').evaluate(el => getComputedStyle(el).scrollbarWidth), 'none', 'The spatial rail hides native scrollbars');
    const surfaces = await gallery.locator('.screening-surface').evaluateAll(elements => elements.slice(0, 3).map(el => ({ pose: el.dataset.spacePose.split(',').map(Number), matrix: el.style.transform })));
    assert(surfaces.every(surface => surface.matrix.includes('matrix3d(')), 'DOM screen projection comes from the CSS3D camera');
    if (name !== 'reduced') {
      const tunnelPose = (await gallery.getAttribute('data-tunnel-pose')).split(',').map(Number);
      assert(tunnelPose[2] < 0 && Math.abs(surfaces[1].pose[0]) > 1 && Math.abs(surfaces[1].pose[1]) > 1, 'The selected URL occupies a spatial station inside the tube');
      assert(surfaces[0].pose[2] > surfaces[1].pose[2] && surfaces[2].pose[2] < surfaces[1].pose[2] && new Set(surfaces.map(surface => Math.round(surface.pose[0]))).size === 3, 'Different worlds occupy distinct depths and wall positions');
      assert.equal(await gallery.locator('.screening-tunnel-canvas').count(), 1, 'The tube is shared WebGL geometry');
    }
    assert.equal(await title.textContent(), 'BeatSync');
    initialFit = await fit();
    if (name === 'desktop' || name === 'reduced') {
      assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).cursor), 'default', 'Use the native system arrow');
      assert.equal(await gallery.getByRole('button', { name: 'Web experiences', exact: true }).evaluate(el => getComputedStyle(el).cursor), 'pointer', 'Buttons use the native hand cursor');
    }
    assert.equal(await gallery.locator('.screening-close').count(), 1, 'Product detail has a return to the world selector');
    const previewWidth = await gallery.locator('.screening-slide.is-active').evaluate(el => el.offsetWidth);
    assert(previewWidth / options.viewport.width > (name === 'phone' ? .90 : name === 'landscape' ? .43 : .55), `${name}: the website stays readable while leaving space for the tunnel`);
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
    const croppedPreviews = [];
    // Measure each actual displayed plane. Inactive fallback captures have auto
    // widths while their CSS3D surface is detached, so their geometry is not a viewport.
    for (const [id, label] of [['sentinel','SentinelLAN'], ['security','Security Core'], ['backup','Zney Backup']]) {
      await gallery.getByRole('button', { name: label, exact: true }).click();
      await hashIs(id); await fit();
      croppedPreviews.push(await gallery.locator(`.screening-slide[data-product-id="${id}"] img`).evaluate(img => ({
        width: parseFloat(getComputedStyle(img).width), viewport: parseFloat(getComputedStyle(img.parentElement).width)
          - parseFloat(getComputedStyle(img.parentElement).borderLeftWidth) - parseFloat(getComputedStyle(img.parentElement).borderRightWidth),
        overflow: getComputedStyle(img.parentElement).overflow
      })));
    }
    await rail.focus();
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
    assert(await live.evaluate(el=>el.parentElement===document.body),'Native live modal stays outside transformed gallery ancestors');
    await live.locator('.screening-live-native[data-ready=true]').waitFor();
    assert.equal(await live.locator('iframe').getAttribute('src'), 'https://beatsync.zney295.id.vn/');
    assert.equal(await live.locator('.screening-live-native > iframe').count(),1,'Native live input stays outside the CSS3D transform chain');
    const liveDocument = live.frameLocator('iframe');
    const liveFrame = await (await live.locator('iframe').elementHandle()).contentFrame();
    await liveDocument.getByRole('button', { name: 'Test DOM click' }).waitFor();
    await liveFrame.evaluate(() => {
      window.__liveEvents = [];
      for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event =>
        window.__liveEvents.push({ type, tag: event.target.tagName, text: event.target.textContent, x: event.clientX, y: event.clientY }), true);
    });
    await liveDocument.getByRole('button', { name: 'Test DOM click' }).click();
    try {
      await liveDocument.getByRole('button', { name: 'Clicked in 3D', exact: true }).waitFor({ timeout: 3000 });
    } catch (error) {
      await page.screenshot({ path: `${output}/${name}-live-failure.png` });
      await writeFile(`${output}/${name}-live-failure.json`, JSON.stringify({
        frame: await liveFrame.evaluate(() => ({ events: window.__liveEvents, body: document.body.innerHTML, rect: document.querySelector('button').getBoundingClientRect().toJSON() })),
        iframe: await live.locator('iframe').boundingBox(),
        parent: await live.evaluate(el => ({ rect: el.getBoundingClientRect().toJSON(), html: el.outerHTML })),
      }, null, 2));
      throw error;
    }
    assert.equal(await liveDocument.getByRole('button').textContent(), 'Clicked in 3D', 'Click reaches the original DOM inside the CSS3D iframe');
    await liveDocument.getByRole('textbox').fill('CSS3D keyboard input');
    assert.equal(await liveDocument.getByRole('textbox').inputValue(), 'CSS3D keyboard input', 'Keyboard input stays native inside the CSS3D iframe');
    const iframeBounds = await live.locator('iframe').boundingBox();
    await page.mouse.move(iframeBounds.x + iframeBounds.width / 2, iframeBounds.y + 180);
    await page.mouse.wheel(0, 240);
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
    const dragStart=await galleryDragPoint();
    const startX = dragStart.x, endX = bounds.x + bounds.width * .20, y = dragStart.y;
    await page.waitForFunction(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.screening-rail'), { x: startX, y });
    await page.mouse.move(startX, y);
    await page.keyboard.down('Shift');
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 16 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await page.waitForTimeout(1500);
    assert.equal(await gallery.getAttribute('data-test-instance'), 'original', 'Product selection must not remount the gallery');
    assert.notEqual(await title.textContent(), 'BeatSync', `${name}: pointer dragging rotates the screens`);
    await rail.press('Home');
    await hashIs('mpoly');
    await page.waitForFunction(() => Number(document.querySelector('dialog.screening-room')?.style.getPropertyValue('--screen-focus')) > .995);
    // Native live frames deliberately own their wheel; rotate from gallery chrome.
    await parkWheelOnGallery();
    await wheelThroughGallery(120,0);
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
    await parkWheelOnGallery();
    await wheelThroughGallery(0,120);
    await page.waitForFunction(() => document.querySelector('.screening-kinds button:last-child')?.getAttribute('aria-pressed') === 'true');
    await page.waitForTimeout(1500);
    assert(await gallery.getByRole('link', { name: 'Explore app', exact: true }).isVisible(), `${name}: wheel automatically continues from web experiences to apps`);
    await parkWheelOnGallery();
    await wheelThroughGallery(0,-120);
    await page.waitForFunction(() => document.querySelector('.screening-kinds button:first-child')?.getAttribute('aria-pressed') === 'true');
    if (name === 'phone') {
      await page.goto(`${base}#/showcase/beatsync`, { waitUntil: 'domcontentloaded' });
      await hashIs('beatsync');
      const cdp = await context.newCDPSession(page);
      const touchPose = (await gallery.getAttribute('data-tunnel-pose')).split(',').map(Number);
      // Native iframes own gestures over their websites. Start on the actual
      // tunnel background, rather than replaying a point now covered by one.
      const touchStart = await galleryDragPoint();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchStart] });
      for (let step = 1; step <= 16; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchStart.x + (endX - touchStart.x) * step / 16, y:touchStart.y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(1500);
      const afterTouch = (await gallery.getAttribute('data-tunnel-pose')).split(',').map(Number);
      assert.equal(await title.textContent(), 'BeatSync', 'Horizontal touch looks around the same world');
      assert(Math.abs(afterTouch[3] - touchPose[3]) > .1, 'Horizontal touch changes the local view angle');
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
    if (await page.locator('.worlds-showcase').count()) await page.getByRole('button', { name: 'Enter world', exact: true }).click();
    await hashIs('mpoly');
    await page.route('**/img/products/beatsync.webp', route => route.abort());
    await page.goto(`${base}#/showcase/beatsync`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Enter world', exact: true }).click();
    await gallery.locator('.screening-slide.is-active .screening-tv[data-state="error"]').waitFor();
    assert.equal(await gallery.getByRole('link', { name: 'Visit website', exact: true }).getAttribute('href'), 'https://beatsync.zney295.id.vn/');
    await page.unroute('**/img/products/beatsync.webp');
    } else {
      assert(page.url().endsWith('#/projects'), 'Hidden showcase routes resolve to Projects');
      assert.equal(await page.locator('.screening-room, a[href^="#/showcase"]').count(), 0);
      await page.screenshot({ path: `${output}/${name}-showcase-hidden.png` });
    }

    // Main intro and portal remain functional after all gallery interactions.
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await waitForApp();
    await page.locator('.virgo-canvas canvas').waitFor();
    await page.screenshot({ path: `${output}/${name}-intro.png` });
    const sound = page.locator('.virgo-sound-toggle');
    await sound.click();
    assert.equal(await sound.getAttribute('aria-pressed'), 'false');
    await sound.click();
    assert.equal(await sound.getAttribute('aria-pressed'), 'true');

    // The owner-authored universe opens through the explicit Start button.
    const intro = page.locator('.universe-intro');
    await intro.waitFor();
    await page.clock.runFor(1000);
    assert.equal(Number(await intro.getAttribute('data-progress')),0,'Idle never advances the introduction');
    await intro.getByRole('button',{name:'Start',exact:true}).waitFor();
    await page.clock.runFor(8000);
    const identity = intro.locator('h1');
    assert((await identity.textContent()).includes('Lê Quang Khánh'));
    await page.mouse.move(200,200);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    await page.mouse.wheel(0,240);await page.clock.runFor(700);
    assert.equal(Number(await intro.getAttribute('data-progress')),0,'Scrolling cannot start the intro');
    await intro.getByRole('button',{name:'Start',exact:true}).click();
    await page.clock.runFor(100);
    if (name !== 'reduced') {
      assert.equal(await intro.getAttribute('data-entering'),'true','Start begins the visible entry before removing intro');
      await page.clock.runFor(1600);
    }
    else await page.clock.runFor(240);
    await intro.waitFor({ state: 'detached' });
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 - 1.92) < .001);
    assert.equal(await page.evaluate(() => location.hash), '#/home', 'Intro arrives on the home route without replaying the old opening');
    await page.screenshot({ path: `${output}/${name}-intro-arrival.png` });
    await page.clock.resume();
    if (name === 'desktop') {
      await page.goto(`${base}#/cosmos`);
      await intro.waitFor();
      await page.mouse.wheel(0,120);
      await page.waitForTimeout(250);
      await page.evaluate(() => { location.hash = '#/skills'; });
      await intro.waitFor({ state: 'detached' });
      await page.waitForTimeout(8000);
      assert.equal(await page.evaluate(() => location.hash), '#/skills', 'Route changes cancel the old intro and its arrival callback');
    }

    // Check the actual rendered camera and sentences, rather than unused helpers.
    await page.goto(`${base}#/projects`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp();
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
      const phrases = await page.locator('.virgo-narrative-line').evaluateAll(lines => {
        const line = lines.find(el => getComputedStyle(el).visibility === 'visible' && Number(getComputedStyle(el.querySelector('span')).opacity) > .1);
        return [...line.querySelectorAll('.virgo-story-phrase')].map(el => {
          const rect = el.getBoundingClientRect();
          return { text: el.textContent, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
        });
      });
      assert(phrases.length > 0, 'Reading copy contains visible phrases');
      assert.equal(phrases.map(phrase => phrase.text).join(' '), sentence, 'Line breaks preserve the complete sentence');
      const flow=await page.locator('.virgo-narrative-line[aria-hidden="false"] .virgo-story-phrase').first().evaluate(el=>getComputedStyle(el).display);
      if(flow==='inline'){
        const words=await page.locator('.virgo-narrative-line[aria-hidden="false"] .virgo-story-word').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,height:r.height};}));
        for(let i=1;i<words.length;i++){
          const previous=words[i-1],word=words[i];
          assert(word.top>=previous.top-2,'Naturally wrapped mobile words retain reading order');
          if(Math.abs(word.top-previous.top)<previous.height*.4)assert(word.left>=previous.right-1,'Words on the same mobile line do not overlap');
        }
      }else for(let i=1;i<phrases.length;i++)assert(phrases[i].top >= phrases[i-1].bottom, 'Desktop phrases occupy separate lines without overlap');
      assert(phrases.every(phrase => phrase.left >= 0 && phrase.right <= options.viewport.width && phrase.top >= 0 && phrase.bottom <= options.viewport.height), 'Reading copy fits the viewport');
      assert.equal(state.densePanels, false, `${name}: dense lists do not replace the single-sentence presentation`);
      assert(state.pose?.length === 7 && state.pose.every(Number.isFinite), 'Record the actual rendered camera position/quaternion');
      return state;
    };
    // Wheel no longer snaps to a reading anchor: supply only the distance needed.
    const wheelTo = async position => {
      let lastState;
      for (let attempt = 0; attempt < 400; attempt++) {
        const state = await page.evaluate(position => {
          const scroller = document.querySelector('.virgo-scroll');
          const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
          const index = Math.floor(position);
          let leg=offsets.length-2;
          while(leg>0&&offsets[leg]>scroller.scrollTop)leg--;
          return { rendered: Number(document.querySelector('.virgo-page').style.getPropertyValue('--flight-progress')) * 6,
            native: leg+(scroller.scrollTop-offsets[leg])/(offsets[leg+1]-offsets[leg]),
            remaining: offsets[index] + (offsets[index + 1] - offsets[index]) * (position - index) - scroller.scrollTop };
        }, position);
        lastState = state;
        if (Math.abs(state.rendered - position) < .0005 && Math.abs(state.remaining) < 1) return;
        // Reversing intentionally discards pending lead. Let the last packet
        // reach its rendered position before calculating the next correction,
        // otherwise this test's controller oscillates around the final pixel.
        if (Math.abs(state.rendered-state.native)>.00005) {
          await page.waitForFunction(()=>{
            const root=document.querySelector('.virgo-page'),scroller=document.querySelector('.virgo-scroll');
            const offsets=[...document.querySelector('.virgo-scroll-content').children].map(el=>el.offsetTop);
            let leg=offsets.length-2;while(leg>0&&offsets[leg]>scroller.scrollTop)leg--;
            const native=leg+(scroller.scrollTop-offsets[leg])/(offsets[leg+1]-offsets[leg]);
            return Math.abs(Number(root.style.getPropertyValue('--flight-progress'))*6-native)<=.00005;
          });
          continue;
        }
        if (Math.abs(state.remaining) >= .15) await page.mouse.wheel(0, Math.max(-120, Math.min(120, state.remaining / 1.25)));
        await page.waitForTimeout(50);
      }
      await writeFile(`${output}/${name}-wheel-failure.json`,JSON.stringify({position,...lastState,diagnostics:await page.locator('.virgo-page').evaluate(el=>({...el.dataset}))},null,2));
      assert.fail('Wheel must reach the requested reading position: ' + position + ' / ' + JSON.stringify(lastState));
    };
    const firstSentence = 'Each project solves a specific problem.';
    const secondSentence = 'From Windows tools to apps and simulations.';
    const firstStory = await storyAt(3.23, firstSentence);
    const firstOrbit = await page.locator('.virgo-page').getAttribute('data-reading-orbit');
    await page.screenshot({ path: `${output}/${name}-story-first.png` });
    await page.mouse.move(options.viewport.width / 2, options.viewport.height * .75);
    await wheelTo(3.95);
    const secondStory = await storyAt(3.95, secondSentence);
    const secondOrbit = await page.locator('.virgo-page').getAttribute('data-reading-orbit');
    await page.screenshot({ path: `${output}/${name}-story-second.png` });
    for (const index of [0, 1, 3, 4, 5, 6]) assert.equal(firstStory.pose[index], secondStory.pose[index], 'Reading preserves the straight axis and camera heading');
    assert(secondStory.pose[2] <= firstStory.pose[2], 'Reading continues forward');
    const orbitChange = Math.abs(Number(secondOrbit.split(',')[1]) - Number(firstOrbit.split(',')[1]));
    assert(name === 'reduced' ? orbitChange === 0 : orbitChange > 2, 'The local reading view rotates between sentences, except in reduced motion');
    await wheelTo(3.23);
    const reversedStory = await storyAt(3.23, firstSentence);
    const reversedOrbit = await page.locator('.virgo-page').getAttribute('data-reading-orbit');
    assert(Math.abs(Number(reversedOrbit.split(',')[1]) - Number(firstOrbit.split(',')[1])) < .02, 'Reverse restores the local reading angle');
    reversedStory.pose.forEach((value, i) => assert(Math.abs(value - firstStory.pose[i]) < .02, `Reverse scroll restores camera pose ${i}: ${value} versus ${firstStory.pose[i]}`));
    await wheelTo(3.95);
    await storyAt(3.95, secondSentence);
    await wheelTo(4.24);
    await page.waitForTimeout(260); // A separate gesture after the preceding reading stop.
    // Showcase moved after Contact: both directions now stay in the story.
    await wheelTo(4.92);
    await storyAt(4.92, 'The tools I use and how they connect.');
    assert.equal(await page.locator('.screening-room, .worlds-showcase').count(), 0, 'Forward scrolling no longer interrupts the story with a gallery');
    await wheelTo(3.95);
    await storyAt(3.95, secondSentence);
    assert.equal(await page.locator('.screening-room, .worlds-showcase').count(), 0, 'Reverse scrolling stays on the same story path');
    if (name !== 'reduced') {
      await page.goto(`${base}#/skills`, { waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForApp();
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
    }
    // Three standard rolls cover the final approach; the next intentional roll
    // still belongs to entry. Reverse input must remain on the reading journey.
    await page.goto(`${base}#/skills`, { waitUntil: 'domcontentloaded' });
    await page.reload({waitUntil:'domcontentloaded'});
    await waitForApp();
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 - 4.92) < .001);
    const approachFrom=await page.locator('.virgo-scroll').evaluate(el=>{const steps=[...document.querySelector('.virgo-scroll-content').children];el.scrollTop=steps[5].offsetTop+.31*(steps[6].offsetTop-steps[5].offsetTop);return 5+(el.scrollTop-steps[5].offsetTop)/(steps[6].offsetTop-steps[5].offsetTop);});
    await page.waitForFunction(expected=>Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6-expected)<.00005,approachFrom);
    await page.mouse.move(12,options.viewport.height/2);
    const approachRolls=[];
    const settledApproach=()=>page.waitForFunction(()=>{
      const el=document.querySelector('.virgo-scroll'),steps=[...document.querySelector('.virgo-scroll-content').children];
      const target=5+(el.scrollTop-steps[5].offsetTop)/(steps[6].offsetTop-steps[5].offsetTop);
      return Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6-target)<.001;
    });
    const rollApproach=async delta=>{
      const before=await page.locator('.virgo-scroll').evaluate(el=>el.scrollTop);
      await page.mouse.wheel(0,delta);
      try{await page.waitForFunction(({before,direction})=>direction*(document.querySelector('.virgo-scroll').scrollTop-before)>1,{before,direction:Math.sign(delta)});}
      catch(error){
        await page.screenshot({path:`${output}/${name}-roll-failure.png`});
        await writeFile(`${output}/${name}-roll-failure.json`,JSON.stringify({before,delta,approachRolls,state:await page.locator('.virgo-page').evaluate(el=>({hash:location.hash,progress:el.style.getPropertyValue('--flight-progress'),scroll:document.querySelector('.virgo-scroll').scrollTop}))},null,2));
        throw error;
      }
      await settledApproach();
    };
    for(let roll=0;roll<3;roll++){
      await rollApproach(120);
      approachRolls.push(await page.locator('.virgo-page').evaluate(el=>Number(el.style.getPropertyValue('--flight-progress'))*6));
    }
    assert(approachRolls[2]>=5.995,`${name}: three standard rolls reach the black hole: ${approachRolls}`);
    assert.equal(await page.locator('.page-passage,.worlds-showcase').count(),0,'Arrival does not consume the separate gesture to enter showcase');
    await page.screenshot({path:`${output}/${name}-three-roll-arrival.png`});
    await rollApproach(-120);
    assert(Number(await page.locator('.virgo-page').evaluate(el=>el.style.getPropertyValue('--flight-progress')))*6<5.995,'A reverse roll leaves Contact without entering showcase');
    await writeFile(`${output}/${name}-approach-rolls.json`,JSON.stringify({deltaY:120,from:approachFrom,positions:approachRolls},null,2));
    await page.goto(`${base}#/contact`, { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp();
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 > 5.8);
    const contactShot = await page.screenshot({ path: `${output}/${name}-contact-arrival.png` });
    const contactRaw = await sharp(contactShot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(await page.locator('.virgo-contact-narrative, .virgo-portal-hint').count(), 0, 'The black-hole view contains no narrative or instruction text');
    // Check actual links, not the empty centre column reserved for the gate.
    const contactBoxes = await page.locator('.virgo-overlay-panel[aria-labelledby="virgo-contact-title"] .virgo-bare a').evaluateAll(elements => elements.filter(el => getComputedStyle(el).display !== 'none').map(el => {
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }));
    assert.equal(contactBoxes.length,5,`${name}: all five Contact destinations remain visible`);
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
    assert.equal(await page.locator('.virgo-star-portal').count(),0,'The redundant arrow entry button stays removed');
    const orbitAnchor = page.locator('.virgo-black-hole-orbit');
    await orbitAnchor.waitFor({ state: 'visible' });
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page').style.getPropertyValue('--flight-progress')) * 6 > 5.99999);
    await page.mouse.move(12, options.viewport.height / 2);
    await page.waitForTimeout(500);
    // Measure emitted gas without mistaking cream UI text/icons for plasma.
    // UI geometry is still measured separately before/after each capture.
    const captureBlackHole = async suffix => {
      const mask=await page.addStyleTag({content:':root #root .virgo-page > :is(.virgo-overlay,.virgo-chapters,.virgo-sound-toggle,.virgo-star-portal,.virgo-orbit-labels){transition:none!important;animation:none!important;opacity:0!important}'});
      try {
        assert(await page.locator('.virgo-overlay').evaluate(el=>getComputedStyle(el).opacity==='0'),'The shader measurement actually excludes the UI, without a fading transition');
        return await page.screenshot({path:`${output}/${name}-black-hole${suffix}.png`});
      } finally { await mask.evaluate(el=>el.remove()); }
    };
    const holeImage = await captureBlackHole('');
    const portalBounds = await orbitAnchor.boundingBox();
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
    const seen = new Set(), queue = [], caps = [[], []];
    // Find the interior of each cap along its central column. A fixed seed
    // can land on the inclined foreground disk as projected size changes.
    for (const side of [-1, 1]) {
      const x = Math.round(centerX - radius * .04);
      let run = [], longest = [];
      for (let distance = Math.ceil(radius * .12); distance <= radius * .65; distance++) {
        const y = Math.round(centerY + side * distance), pixel = (y * imageInfo.width + x) * imageInfo.channels;
        if (pixels[pixel] + pixels[pixel + 1] + pixels[pixel + 2] <= 5) {
          run.push([x, y]);
          if (run.length > longest.length) longest = [...run];
        } else run = [];
      }
      assert(longest.length > 2, `${name}: both dark polar caps remain visible`);
      queue.push([...longest[Math.floor(longest.length / 2)], side === -1 ? 0 : 1]);
    }
    for (let head = 0; head < queue.length; head++) {
      const [x, y, cap] = queue[head], key = y * imageInfo.width + x;
      if (x < 0 || x >= imageInfo.width || y < 0 || y >= imageInfo.height
        || Math.abs(x - centerX) > radius || Math.abs(y - centerY) > radius || seen.has(key)) continue;
      seen.add(key);
      const pixel = key * imageInfo.channels;
      if (pixels[pixel] + pixels[pixel + 1] + pixels[pixel + 2] > 5) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y); shadowPixels++;
      caps[cap].push([x,y]);
      queue.push([x - 1, y, cap], [x + 1, y, cap], [x, y - 1, cap], [x, y + 1, cap]);
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
    for (const points of caps) {
      const hull = convexHull(points);
      let capInterior = 0;
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        // Exclude only the two-pixel antialiased boundary. A bright patch
        // enclosed by the cap is still inside its hull and must fail darkness.
        if (!hull.every((a,i) => {
          const b=hull[(i+1)%hull.length];
          return cross(a,b,[x,y]) >= 2*Math.hypot(b[0]-a[0],b[1]-a[1]);
        })) continue;
        innerPixels++; capInterior++;
        const pixel=(y*imageInfo.width+x)*imageInfo.channels;
        if (pixels[pixel]+pixels[pixel+1]+pixels[pixel+2] <= 8) darkInnerPixels++;
      }
      assert(capInterior > halfCore ** 2 * .05, `${name}: both polar caps have substantial testable interiors`);
    }
    for (let y = Math.ceil(shadowY - coreRadius); y <= Math.floor(shadowY + coreRadius); y++) {
      for (let x = Math.ceil(shadowX - coreRadius); x <= Math.floor(shadowX + coreRadius); x++) {
        if ((x - shadowX) ** 2 + (y - shadowY) ** 2 > coreRadius ** 2) continue;
        const pixel = (y * imageInfo.width + x) * imageInfo.channels;
        const planeY = y - centerY + Math.tan(.1) * (x - centerX);
        // Measure foreground emission separately; this approximate equatorial
        // band is not the mask for the physically unoccluded polar caps.
        if (Math.abs(planeY) < halfCore * .6 + 2) {
          if (pixels[pixel] > 120) foregroundPixels++;
        }
      }
    }
    assert(innerPixels > halfCore ** 2 * .1 && darkInnerPixels / innerPixels > .985, `${name}: the unoccluded polar shadow stays dark with no stray gas patches`);
    assert(foregroundPixels > halfCore ** 2 * .10, `${name}: the bright foreground disk crosses the shadow instead of being hidden behind a painted black circle`);
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
    const laterImage = await captureBlackHole('-motion');
    assert.equal(afterMotion.traces, beforeMotion.traces, `${name}: gas animation reuses the stationary ray geometry`);
    if (name !== 'reduced') {
      assert(afterMotion.shades - beforeMotion.shades >= 10, `${name}: continuous gas movement updates at least ten frames in the motion window`);
      assert(afterMotion.frameMs > 0 && afterMotion.frameMs < 50, `${name}: steady scene cadence stays above 20fps (${afterMotion.frameMs}ms)`);
      assert(realGasFps >= 20, `${name}: gas updates stay above 20fps in real elapsed time (${realGasFps.toFixed(1)}fps over ${realMotionDurationMs.toFixed(0)}ms)`);
    } else assert.equal(afterMotion.shades, beforeMotion.shades, 'Reduced motion keeps the gas frozen');
    const laterPixels = await sharp(laterImage).removeAlpha().raw().toBuffer();
    for (let y = 0; y < imageInfo.height; y++) {
      // The full-width chapter progress line is UI, not orbiting gas.
      if (y >= imageInfo.height - 4) continue;
      for (let x = 0; x < imageInfo.width; x++) {
        const pixel = (y * imageInfo.width + x) * imageInfo.channels;
        if (!isWarm(pixels, pixel) && !isWarm(laterPixels, pixel)) continue;
        effects.warm++;
        const dx = x - centerX, dy = y - centerY;
        // Kerr's shadow is slightly flattened: normalize each projected axis
        // to its own diameter, rather than using the smaller axis for both.
        if (Math.abs(dx) > shadow.width / 2 * 4.6 || Math.abs(dy) > shadow.height / 2 * 2.5) effects.outside++;
        if (pixels[pixel] > 220) effects.highlights++;
        else if (pixels[pixel] < 205) effects.midtones++;
        if (dx < -halfCore * 1.15) effects.left++;
        if (dx > halfCore * 1.15) effects.right++;
        if (dy < -halfCore * 1.15) effects.arch++;
        if (Math.max(...[0, 1, 2].map(channel => Math.abs(pixels[pixel + channel] - laterPixels[pixel + channel]))) > 20) effects.moved++;
      }
    }
    assert(effects.warm > halfCore ** 2, `${name}: the accretion disk is visible`);
    // Measure the stable shadow diameter; bright outer gas changes with time.
    if (name === 'desktop' || name === 'reduced') assert(shadow.width > Math.min(imageInfo.width, imageInfo.height) * .25, 'The enlarged desktop shadow spans over a quarter of the viewport short edge');
    await writeFile(`${output}/${name}-gas-metrics.json`,JSON.stringify({centerX,centerY,halfCore,shadow,effects},null,2));
    assert(effects.outside / effects.warm < .005, `${name}: spiral light stays around the black-hole belt, with no stray warm trails across the screen`);
    assert(effects.midtones / effects.warm > .15 && effects.highlights / effects.warm > .001, `${name}: the gas has dark lanes and hot highlights rather than one flat yellow surface`);
    for (const part of ['left', 'right', 'arch']) assert(effects[part] > halfCore ** 2 * .04, `${name}: ${part} of the disk remains visible`);
    // Warm stars in the authentic sky are separate from the connected disk.
    const disk = luminousDiskBounds(pixels,imageInfo,isWarm);
    assert(disk.pixels > halfCore ** 2, `${name}: identify a substantial connected accretion disk`);
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
      const tiltedImage = await captureBlackHole('-orbit');
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
      const belowImage = await captureBlackHole('-orbit-below');
      const belowPixels = await sharp(belowImage).removeAlpha().raw().toBuffer();
      const belowControl = await orbitAnchor.boundingBox();
      const belowDisk = luminousDiskBounds(belowPixels,imageInfo,isWarm);
      await writeFile(`${output}/${name}-below-metrics.json`,JSON.stringify({belowControl,belowDisk,orbit:await angle()},null,2));
      assert(belowDisk.pixels > halfCore ** 2, `${name}: identify the connected disk when viewed from underneath`);
      assert(belowControl.x>=0&&belowControl.y>=0&&belowControl.x+belowControl.width<=imageInfo.width&&belowControl.y+belowControl.height<=imageInfo.height,`${name}: the orbit control remains within the viewport when viewed from underneath`);
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
      window.__showcaseSlideFrames = [];
      const record = () => {
        const root = document.querySelector('.virgo-page');
        if (!root) return;
        const passage = document.querySelector('.page-passage');
        if (passage?.hasAttribute('data-progress') && Number.isFinite(parseFloat(root.style.getPropertyValue('--scene-page-offset')))) {
          window.__showcaseSlideFrames.push({
            pose: root.dataset.cameraPose.split(',').map(Number),
            orbit: document.querySelector('.virgo-black-hole-orbit')?.dataset.azimuth,
            renderedOrbit: Number(root.dataset.blackHoleRenderAzimuth),
            progress: passage ? Number(passage.dataset.progress) : null,
            offset: parseFloat(root.style.getPropertyValue('--scene-page-offset')),
          });
        }
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    await page.mouse.move(12,options.viewport.height/2);await page.mouse.wheel(0,120);
    await page.waitForURL('**/#/showcase/mpoly');
    await page.locator('.page-passage').waitFor({state:'detached'});
    if (name !== 'reduced') {
      const entryFrames = await page.evaluate(() => window.__showcaseSlideFrames);
      await writeFile(`${output}/${name}-page-slide.json`,JSON.stringify(entryFrames,null,2));
      const sliding = entryFrames.filter(frame => frame.progress !== null);
      assert(sliding.length > 3 && sliding.at(-1).offset < sliding[0].offset - 50, 'Contact slides upward into the showcase');
      assert(sliding[0].progress < .1 && sliding.at(-1).progress > .9,'The recorded page slide covers its beginning and end');
      entryFrames.forEach(({ pose, orbit, renderedOrbit }) => {
        assert(pose.every(Number.isFinite), 'The parked journey camera keeps a valid pose');
        assert.deepEqual(pose, entryFrames[0].pose, 'The journey camera stays fixed during the DOM page transition');
        assert.equal(orbit, entryView, 'The local black-hole view remains selected during transition');
        assert(Math.abs(renderedOrbit-Number(entryView))<.00001, 'The rendered black-hole view stays fixed for the full page slide');
      });
      sliding.forEach((frame, i) => {
        assert(Number.isFinite(frame.offset) && frame.progress >= 0 && frame.progress <= 1, 'The page slide stays within its timeline');
        if (i) assert(frame.progress >= sliding[i-1].progress && frame.offset <= sliding[i-1].offset, 'Forward page translation never reverses');
      });
    }
    try {
      await page.getByRole('button', { name: 'Enter world', exact: true }).waitFor({ timeout: 15000 });
    } catch (error) {
      await page.screenshot({ path: `${output}/${name}-failure.png` });
      await writeFile(`${output}/${name}-failure.json`, JSON.stringify({ url: page.url(), errors, body: await page.locator('body').innerText() }, null, 2));
      throw error;
    }
    assert.deepEqual(errors, [], `${name}: no runtime or shader errors`);
    report.push({ name, phase: onlyBlackHole?'black-hole':'full', viewport: options.viewport, fit: initialFit, shadow, blackHoleEffects: effects, renderStats: { beforeMotion, afterMotion, realMotionDurationMs, realGasFps }, contactBoxes, contactFlight, approachFrames, passed: true });
    await writeReport('running');
    await context.close();
    console.log(onlyBlackHole ? `PASS: ${name} black-hole visuals, motion, orbit and page transition.` : `PASS: ${name} layout, gallery inputs/routes, Manager removal, sequential sentences, straight camera/reverse scroll, mute and world entry.`);
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
