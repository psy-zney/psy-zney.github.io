import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const output = 'artifacts/intro-flight'; await mkdir(output, { recursive: true });
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
    if (process.env.INTRO_VIEWPORT && name !== process.env.INTRO_VIEWPORT) continue;
    const context = await browser.newContext({ viewport, reducedMotion }); const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.argv[2] || 'http://127.0.0.1:5182/').split('#')[0] + '#/');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const intro = page.locator('.virgo-intro-flight');
    assert.equal(await page.locator('.virgo-intro-fracture, .virgo-space-rift, [data-narrative-index="0"]').count(), 0, 'Reload at root mounts no legacy black screen or opening text');
    await page.clock.install(); await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    if (name !== 'reduced') {
      assert.equal(await intro.getAttribute('data-phase'), 'connecting');
      await page.screenshot({ path: output + '/' + name + '-constellation-start.png' });
      await page.clock.runFor(2400);
      assert(Number(await intro.getAttribute('data-constellation-edges')) < 16);
      await page.screenshot({ path: output + '/' + name + '-constellation-connecting.png' });
      await page.clock.runFor(2700);
    }
    assert.equal(await intro.getAttribute('data-constellation-edges'), '16');
    assert.equal(await intro.getByRole('button').count(), 0);
    await page.screenshot({ path: output + '/' + name + '-idle.png' });
    const scrollTo = async target => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const current = Number(await intro.getAttribute('data-seconds'));
        if (Math.abs(current - target) < .002) return;
        await page.mouse.wheel(0, (target - current) / .0045);
        await page.clock.runFor(900);
      }
      assert.fail('Scroll must reach intro position ' + target);
    };
    if (name !== 'reduced') {
      await scrollTo(1);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
      await page.screenshot({ path: output + '/' + name + '-vortex-small.png' });
      await scrollTo(2.75);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
      await page.screenshot({ path: output + '/' + name + '-vortex-open.png' });
      const paused = Number(await intro.getAttribute('data-seconds'));
      await page.clock.runFor(3000);
      assert(Math.abs(Number(await intro.getAttribute('data-seconds')) - paused) < .002, 'Opening waits for more scroll before entry');
      await scrollTo(3.9);
      const lines = intro.locator('.virgo-intro-captions p');
      for (let i = 0; i < 2; i++) {
        assert.equal(await lines.nth(i).getAttribute('data-lines'), '1', 'Each fixed wall sentence is a single line');
        assert(Number(await lines.nth(i).evaluate(el => el.style.opacity)) > .2, 'Both sentences already exist ahead in the tunnel');
      }
      const far = (await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number);
      await page.screenshot({ path: output + '/' + name + '-tunnel-entry.png' });
      await scrollTo(4.7);
      const near = (await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number);
      assert(near[2] > far[2], 'Fixed wall text grows by perspective as the camera approaches');
      await page.screenshot({ path: output + '/' + name + '-greeting-1.png' });
      await scrollTo(5.8);
      await page.screenshot({ path: output + '/' + name + '-greeting-2.png' });
      await scrollTo(4.7);
      assert.deepEqual((await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number), near, 'Reversing restores the same physical wall patch');
      await scrollTo(7.1);
      // The last input reaches the endpoint and unmounts the intro.
      await page.mouse.wheel(0, 120); await page.clock.runFor(900);
      await page.mouse.wheel(0, 120); await page.clock.runFor(1200);
    } else { await intro.click({ position: { x: 40, y: 40 } }); await page.clock.runFor(100); }
    await intro.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => location.hash), '#/home');
    await page.mouse.wheel(0, -10); await page.clock.runFor(500);
    assert.equal(await intro.count(), 0, 'A small bounce at Home does not reopen the portal');
    await page.mouse.wheel(0, -120); await page.clock.runFor(1200);
    await intro.waitFor();
    if (name !== 'reduced') {
      const paused = Number(await intro.getAttribute('data-seconds'));
      assert(paused < 7.8 && paused > 7, 'An intentional reverse gesture re-enters from the arrival endpoint');
      await page.clock.runFor(2000);
      assert(Math.abs(Number(await intro.getAttribute('data-seconds')) - paused) < .002, 'Reverse travel also stops when scrolling stops');
      await scrollTo(4.7);
      await page.screenshot({ path: output + '/' + name + '-return-tunnel.png' });
      await scrollTo(0);
    }
    assert.equal(await page.evaluate(() => location.hash), '#/cosmos', 'Reverse scroll can return all the way to the constellation');
    assert.equal(await intro.getAttribute('data-seconds'), '0.000');
    await page.screenshot({ path: output + '/' + name + '-return-cosmos.png' });
    assert.deepEqual(errors, []);
    results.push({ name, scrollDriven: true, persistentSingleLineCaptions: true, status: 'passed' });
    console.log('PASS intro: ' + name); await context.close();
  }
} finally { await writeFile(output + '/report.json', JSON.stringify(results, null, 2)); await browser.close(); }
