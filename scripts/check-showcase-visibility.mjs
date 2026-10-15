import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = 'artifacts/showcase-hidden';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
try {
  for (const [name, viewport, reducedMotion] of [
    ['desktop', { width: 1242, height: 715 }, 'no-preference'],
    ['phone', { width: 390, height: 844 }, 'no-preference'],
    ['reduced', { width: 1242, height: 715 }, 'reduce'],
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    const base = (process.argv[2] || 'http://127.0.0.1:5182/').split('#')[0];
    await page.goto(base + '#/showcase/mpoly');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.querySelector('.virgo-page')?.dataset.cameraPose);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const hidden = async () => {
      assert.equal(await page.locator('.screening-room, .virgo-showcase-passage, a[href^="#/showcase"]').count(), 0, 'No gallery, entry link or transition is exposed');
    };
    assert(page.url().endsWith('#/projects'), 'Direct showcase links replace the route with Projects');
    await hidden();
    for (const route of ['#/showcase', '#/showcase/sentinel', '#/showcase/missing']) {
      await page.goto(base + route); await page.clock.runFor(300);
      assert(page.url().endsWith('#/projects')); await hidden();
    }
    const root = page.locator('.virgo-page');
    const position = async () => Number(await root.evaluate(el => el.style.getPropertyValue('--flight-progress'))) * 6;
    const seek = async p => {
      await page.evaluate(p => {
        const root = document.querySelector('.virgo-page'), scroll = document.querySelector('.virgo-scroll');
        const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        const index = Math.min(5, Math.floor(p)); root.dataset.introArrival = String(p);
        scroll.scrollTop = offsets[index] + (offsets[index + 1] - offsets[index]) * (p - index);
      }, p);
      await page.clock.runFor(300);
    };
    await seek(3.23);
    const archive = page.locator('.virgo-single-link a[href="#/projects/all"]').first();
    await archive.click(); await page.clock.runFor(400);
    await page.locator('dialog[open]').waitFor();
    assert.equal(await page.locator('.virgo-archive a').count(), 10, 'All case studies remain accessible');
    await page.getByRole('button', { name: 'Close', exact: true }).click(); await page.clock.runFor(400);
    await seek(4.24); await page.mouse.move(viewport.width / 2, viewport.height * .8);
    for (let step = 0; step < 24 && await position() < 4.86; step++) {
      await page.mouse.wheel(0, 120); await page.waitForTimeout(20); await page.clock.runFor(400); await hidden();
    }
    assert(await position() >= 4.8, 'Forward wheel reaches Skills without entering showcase');
    await page.screenshot({ path: `${output}/${name}-forward.png` });
    for (let step = 0; step < 24 && await position() > 4.20; step++) {
      await page.mouse.wheel(0, -120); await page.waitForTimeout(20); await page.clock.runFor(400); await hidden();
    }
    assert(await position() <= 4.25, 'Reverse wheel returns to Projects without a gallery detour');
    await page.screenshot({ path: `${output}/${name}-reverse.png` });
    // Keyboard/native scrolling used to trigger a second automatic entry path.
    await page.locator('.virgo-scroll').focus(); await page.keyboard.press('End'); await page.waitForTimeout(80); await page.clock.runFor(8000); await hidden();
    assert(await position() > 5, 'Keyboard scrolling can continue beyond the hidden showcase: ' + JSON.stringify(await root.evaluate(el => ({ dataset: { ...el.dataset }, top: document.querySelector('.virgo-scroll').scrollTop, focus: document.activeElement.className }))));
    assert.deepEqual(errors, []);
    results.push({ name, status: 'passed', archiveProjects: 10, bidirectionalBypass: true });
    console.log('PASS hidden showcase: ' + name); await page.close();
  }
} finally { await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2)); await browser.close(); }
