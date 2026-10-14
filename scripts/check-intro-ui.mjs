import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = 'artifacts/intro-flight';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
try {
  for (const [name, viewport, reducedMotion] of [
    ['desktop', { width: 1440, height: 900 }, 'no-preference'],
    ['tablet', { width: 762, height: 715 }, 'no-preference'],
    ['phone', { width: 390, height: 844 }, 'no-preference'],
    ['landscape', { width: 844, height: 390 }, 'no-preference'],
    ['reduced', { width: 1440, height: 900 }, 'reduce'],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.argv[2] || 'http://127.0.0.1:5183/');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const intro = page.locator('.virgo-intro-flight');
    await page.waitForFunction(() => document.querySelector('.virgo-intro-flight')?.dataset.phase === 'idle');
    const idleCamera = await intro.getAttribute('data-camera');
    await page.waitForTimeout(200);
    assert.equal(await intro.getAttribute('data-camera'), idleCamera, 'The opening remains still');
    await page.screenshot({ path: `${output}/${name}-idle.png` });
    await page.clock.install();
    await page.clock.pauseAt(Date.now() + 50);
    if (name === 'desktop') await page.mouse.wheel(0, 120);
    else if (name === 'tablet') { await page.locator('.virgo-scroll').focus(); await page.keyboard.press('ArrowDown'); }
    else await intro.getByRole('button').click();
    if (name !== 'reduced') {
      let previous = 0;
      for (const [label, time, index] of [['charge', .7], ['tear', 1.65], ['greeting-1', 2.8, 0], ['greeting-2', 4.1, 1]]) {
        await page.clock.runFor((time - previous) * 1000 + (previous === 0 ? 32 : 0)); previous = time;
        await page.waitForFunction(time => Number(document.querySelector('.virgo-intro-flight')?.dataset.seconds) >= time, time);
        if (index !== undefined) {
          const line = intro.locator('.virgo-intro-captions p').nth(index);
          assert(Number(await line.evaluate(el => el.style.opacity)) > .5);
          const bounds = await line.boundingBox();
          assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, 'Each greeting fits in the viewport while being read');
          assert.equal(await intro.locator('.virgo-intro-captions p').evaluateAll(nodes => nodes.filter(el => Number(el.style.opacity) > .1).length), 1);
        }
        await page.screenshot({ path: `${output}/${name}-${label}.png` });
      }
      await page.clock.runFor(1600);
    }
    else await page.clock.runFor(64);
    await intro.waitFor({ state: 'detached' });
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 - 1.92) < .001);
    await page.screenshot({ path: `${output}/${name}-arrival.png` });
    assert.deepEqual(errors, []);
    if (name === 'desktop') {
      await page.evaluate(() => { location.hash = '#/cosmos'; });
      await intro.waitFor();
      await intro.getByRole('button').click();
      await page.clock.runFor(300);
      await page.evaluate(() => { location.hash = '#/skills'; });
      await intro.waitFor({ state: 'detached' });
      await page.clock.runFor(6000);
      assert.equal(await page.evaluate(() => location.hash), '#/skills', 'Cancelling intro cannot navigate back later');
    }
    results.push({ name, timelineSeconds: name === 'reduced' ? 0 : 5.5, idleCamera, status: 'passed' });
    console.log(`PASS intro: ${name}`);
    await context.close();
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
