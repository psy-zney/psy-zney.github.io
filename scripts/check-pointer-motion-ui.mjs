import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = 'artifacts/pointer-motion';
await mkdir(output, { recursive: true });
const server = await createServer({ cacheDir: 'node_modules/.vite-pointer-ui', server: { host: '127.0.0.1', port: 5189, strictPort: true, hmr: false } });
const results = [];
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
  for (const [name, width, height, reducedMotion] of [
    ['desktop', 1440, 900, 'no-preference'], ['tablet', 762, 715, 'no-preference'],
    ['phone', 390, 844, 'no-preference'], ['landscape', 844, 390, 'no-preference'], ['reduced', 1440, 900, 'reduce'],
  ]) {
    if (process.env.UI_SCENARIOS && !process.env.UI_SCENARIOS.split(',').includes(name)) continue;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(`${server.resolvedUrls.local[0]}#/showcase/mpoly`);
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const worlds = page.locator('.worlds-showcase'); await worlds.waitFor();
    const settled = async index => {
      try {
        await page.waitForFunction(({ index, width }) => {
          const track = document.querySelector('.worlds-track');
          return track && Number(track.style.getPropertyValue('--world-index')) === index
            && Math.abs(new DOMMatrixReadOnly(getComputedStyle(track).transform).m41 + index * width) < .5;
        }, { index, width });
      } catch (error) {
        console.log(await page.evaluate(() => ({ url: location.href, errors: document.querySelector('vite-error-overlay')?.textContent, track: document.querySelector('.worlds-track')?.outerHTML.slice(0, 650), transform: document.querySelector('.worlds-track') && getComputedStyle(document.querySelector('.worlds-track')).transform })));
        await page.screenshot({ path: `${output}/${name}-failure.png` }); throw error;
      }
    };
    await settled(0);
    const y = height * .2;
    await page.mouse.move(width * .35, y); await page.mouse.down();
    await page.mouse.move(width * .65, y, { steps: 10 });
    assert.equal(await worlds.getAttribute('data-dragging'), 'true');
    const stretch = await worlds.evaluate(el => parseFloat(el.style.getPropertyValue('--showcase-drag-x')));
    if (name === 'reduced') assert.equal(stretch, 0, 'Reduced motion suppresses stretching');
    else assert(stretch > 0 && stretch < width * .1, 'The first world resists outward dragging');
    await page.screenshot({ path: `${output}/${name}-edge-drag.png` });
    await page.mouse.up(); await settled(0);
    assert.equal(await worlds.getAttribute('data-dragging'), null);
    await page.mouse.move(width * .72, y); await page.mouse.down();
    await page.mouse.move(width * .32, y, { steps: 12 });
    if (name !== 'reduced') assert(await worlds.evaluate(el => Math.abs(parseFloat(el.style.getPropertyValue('--showcase-drag-x')))) > width * .2, 'The rail visibly follows the hand');
    await page.mouse.up(); await settled(1);
    assert.equal(await worlds.locator('.worlds-slide[aria-hidden=false]').count(), 1);
    assert.equal(await worlds.locator('.worlds-slide[inert]').count(), 8);
    assert.equal(await page.locator('dialog.screening-room[open]').count(), 0, 'Release never clicks through into a product');
    await page.mouse.move(width * .72, y); await page.mouse.down();
    await page.mouse.move(width * .4, y, { steps: 8 });
    await worlds.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up(); await settled(1);
    assert.equal(await worlds.getAttribute('data-dragging'), null, 'Cancellation releases capture and returns to the selected world');
    await page.mouse.move(width * .72, y); await page.mouse.down();
    await page.mouse.move(width * .4, y, { steps: 8 });
    await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.mouse.up(); await settled(1);
    assert.equal(await worlds.getAttribute('data-dragging'), null, 'Losing focus cancels the drag');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    await page.mouse.move(width * .7, y); await page.mouse.down(); await page.clock.runFor(16);
    await page.mouse.move(width * .7 - 32, y); await page.clock.runFor(16); await page.mouse.up();
    await page.clock.runFor(1500); await settled(2); await page.clock.resume();
    await page.screenshot({ path: `${output}/${name}-after-flick.png` });
    await worlds.press('End'); await settled(8);
    await page.mouse.move(width * .7, y); await page.mouse.down();
    await page.mouse.move(width * .3, y, { steps: 8 }); await page.mouse.up(); await settled(8);
    assert.deepEqual(errors, []);
    results.push({ name, status: 'passed' }); console.log(`PASS: ${name} rail drag, both edges, cancellation, blur, one-world flick and click suppression.`);
    await context.close();
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify({ scenarios: results, limitations: ['Mouse input is automated; physical touch, audio and device FPS are not measured.'] }, null, 2));
  await browser?.close(); await server.close();
}
