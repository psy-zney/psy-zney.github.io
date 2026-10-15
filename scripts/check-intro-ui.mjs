import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
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
        if (Math.abs(current - target) < .002) {
          // The displayed coordinate is rounded; a final physical gesture hits
          // the real zero clamp instead of leaving a tiny positive destination.
          if (target === 0) { await page.mouse.wheel(0, -12); await page.clock.runFor(1000); }
          return;
        }
        const gain = Number(await intro.getAttribute('data-input-gain'));
        assert(gain > 0, 'The rendered input gain is available');
        await page.mouse.wheel(0, (target - current) / gain);
        await page.clock.runFor(900);
      }
      assert.fail('Scroll must reach intro position ' + target);
    };
    if (name !== 'reduced') {
      await page.mouse.wheel(0, 12); await page.clock.runFor(1000);
      const light = Number(await intro.getAttribute('data-seconds'));
      assert(light > .001 && light < .025, 'A light wheel barely opens the portal');
      await page.clock.runFor(1500);
      assert(Math.abs(Number(await intro.getAttribute('data-seconds')) - light) < .001, 'A light wheel does not trigger automatic opening');
      await page.mouse.wheel(0, -12); await page.clock.runFor(1000);
      for (let pulse = 0; pulse < 8; pulse++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(20); await page.clock.runFor(50); }
      await page.clock.runFor(1000);
      assert(Number(await intro.getAttribute('data-seconds')) < .7, 'A quick wheel burst cannot throw the viewer straight into the tunnel');
      await page.screenshot({ path: output + '/' + name + '-gentle-opening.png' });
      await scrollTo(0);
      await scrollTo(1);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
      await page.screenshot({ path: output + '/' + name + '-vortex-small.png' });
      await scrollTo(2.75);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
      const beforeRotation = await page.screenshot({ path: output + '/' + name + '-vortex-open.png' });
      const matureWorldRadius = await intro.getAttribute('data-entrance-world-radius');
      const paused = Number(await intro.getAttribute('data-seconds'));
      await page.clock.runFor(3000);
      assert(Math.abs(Number(await intro.getAttribute('data-seconds')) - paused) < .002, 'Opening waits for more scroll before entry');
      const afterRotation = await page.screenshot({ path: output + '/' + name + '-vortex-rotating.png' });
      const beforePixels = await sharp(beforeRotation).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const afterPixels = await sharp(afterRotation).removeAlpha().raw().toBuffer();
      const [cx, cy] = (await intro.getAttribute('data-entrance-center')).split(',').map(Number);
      const radius = Number(await intro.getAttribute('data-entrance-radius'));
      let ringPixels = 0, changedPixels = 0;
      for (let y = 0; y < viewport.height; y += 2) for (let x = 0; x < viewport.width; x += 2) {
        const r = Math.hypot((x - cx) / radius, (y - cy) / (radius * .9));
        if (r < .45 || r > .85) continue;
        const offset = (y * beforePixels.info.width + x) * 3;
        ringPixels++;
        if (Math.abs(beforePixels.data[offset] - afterPixels[offset]) + Math.abs(beforePixels.data[offset + 1] - afterPixels[offset + 1]) + Math.abs(beforePixels.data[offset + 2] - afterPixels[offset + 2]) > 20) changedPixels++;
      }
      assert(changedPixels > ringPixels * .08, 'The portal gas actually rotates while scroll position is held');
      await scrollTo(3.9);
      assert.equal(await intro.getAttribute('data-entrance-world-radius'), matureWorldRadius, 'Entry translates the camera through a fixed-size portal');
      assert(Number(await intro.getAttribute('data-entrance-depth')) < 0, 'The camera crosses the entrance plane');
      assert.equal(await intro.getAttribute('data-virtual-grid'), 'hidden');
      const centerPixel = () => intro.locator('canvas').evaluate(canvas => {
        const ctx = canvas.getContext('2d');
        return [...ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data];
      });
      assert.deepEqual(await centerPixel(), [0, 0, 0, 255], 'The tunnel centre is opaque black after entry; Home is not visible');
      const lines = intro.locator('.virgo-intro-captions p');
      assert.deepEqual(await lines.evaluateAll(nodes => nodes.map(node => node.dataset.effect)), ['ion-scan', 'wave-light']);
      for (let i = 0; i < 2; i++) {
        assert.equal(await lines.nth(i).getAttribute('data-lines'), '1', 'Each fixed wall sentence is a single line');
        assert(Number(await lines.nth(i).evaluate(el => el.style.opacity)) > .2, 'Both sentences already exist ahead in the tunnel');
      }
      const far = (await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number);
      assert(far[0] + far[2] / 2 < viewport.width / 2, 'The greeting starts on the left tunnel wall');
      await page.screenshot({ path: output + '/' + name + '-tunnel-entry.png' });
      await scrollTo(4.7);
      const near = (await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number);
      assert(near[2] > far[2], 'Fixed wall text grows by perspective as the camera approaches');
      await page.screenshot({ path: output + '/' + name + '-greeting-1.png' });
      await scrollTo(5.8);
      assert.deepEqual(await centerPixel(), [0, 0, 0, 255], 'The distant exit stays dark throughout wall reading');
      await page.screenshot({ path: output + '/' + name + '-greeting-2.png' });
      await scrollTo(4.7);
      assert.deepEqual((await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number), near, 'Reversing restores the same physical wall patch');
      const farExit = Number(await intro.getAttribute('data-exit-radius'));
      const farHomePose = (await page.locator('.virgo-page').getAttribute('data-camera-pose')).split(',').map(Number);
      await scrollTo(7.1);
      assert.deepEqual(await centerPixel(), [0, 0, 0, 255], 'The exit remains black until the final approach');
      const blackArea = await intro.locator('canvas').evaluate(canvas => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let black = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0 && pixels[i + 3] === 255) black++;
        return black / (canvas.width * canvas.height);
      });
      assert(blackArea < .04, 'The late tunnel has depth haze, not a large flat black disk');
      await page.screenshot({ path: output + '/' + name + '-exit-closed.png' });
      await scrollTo(7.5);
      const nearHomePose = (await page.locator('.virgo-page').getAttribute('data-camera-pose')).split(',').map(Number);
      assert(nearHomePose[2] < farHomePose[2] - 100, 'The real Home camera also advances behind the exit opening');
      assert(Number(await intro.getAttribute('data-exit-radius')) > farExit, 'A visible exit grows as the camera approaches it');
      assert.equal(await intro.evaluate(el => el.style.opacity), '1', 'There is no full-screen scene fade');
      const openingAlpha = await intro.locator('canvas').evaluate(canvas => {
        const ctx = canvas.getContext('2d');
        return ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3];
      });
      assert.equal(openingAlpha, 0, 'The exit is a real opening onto Home, not painted black');
      await page.screenshot({ path: output + '/' + name + '-exit-opening.png' });
      // The last input reaches the endpoint and unmounts the intro.
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
