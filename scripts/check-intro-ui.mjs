import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
const output = process.env.INTRO_OUTPUT || 'artifacts/portal-open-flow/intro'; await mkdir(output, { recursive: true });
const selected = process.env.INTRO_VIEWPORT?.split(',');
const reportPath = `${output}/report${selected ? '-' + selected.join('-') : ''}.json`;
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
    if (selected && !selected.includes(name)) continue;
    const context = await browser.newContext({ viewport, reducedMotion }); const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /THREE.WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text())) errors.push(message.text()); });
    await page.goto((process.argv[2] || 'http://127.0.0.1:5182/').split('#')[0] + '#/');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const intro = page.locator('.virgo-intro-flight');
    const wallSamples = [];
    const formationSamples = [];
    let tearGeometry;
    const visibleWall = async stage => {
      const sample = await intro.locator('canvas').evaluate(canvas => {
        const { width, height } = canvas, pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
        let lit = 0, total = 0;
        for (let y = 0; y < height; y += 6) for (let x = 0; x < width; x += 6) {
          const radius = Math.hypot((x - width / 2) / (width / 2), (y - height / 2) / (height / 2));
          if (radius < .45 || radius > .95) continue;
          const i = (y * width + x) * 4;
          if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 45) lit++;
          total++;
        }
        let central = 0, black = 0, opaque = 0;
        const reach = Math.min(width, height) * .1;
        for (let y = Math.ceil(height / 2 - reach); y < height / 2 + reach; y += 3) for (let x = Math.ceil(width / 2 - reach); x < width / 2 + reach; x += 3) {
          if (Math.hypot(x - width / 2, y - height / 2) > reach) continue;
          const i = (y * width + x) * 4; central++;
          if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0) black++;
          if (pixels[i + 3] === 255) opaque++;
        }
        return { litRatio: lit / total, centralBlackRatio: black / central, centralOpaqueRatio: opaque / central };
      });
      wallSamples.push({ stage, ...sample });
      assert(sample.litRatio > .06, `${name}: liquid walls remain visible at ${stage}: ${JSON.stringify(sample)}`);
      assert(sample.centralBlackRatio < .01, `${name}: no black cap covers the vanishing point at ${stage}: ${JSON.stringify(sample)}`);
      assert(sample.centralOpaqueRatio > .99, `${name}: liquid still hides Home before the exit opens at ${stage}`);
    };
    const canvasFingerprint = () => intro.locator('canvas').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2166136261;
      for (let i = 0; i < pixels.length; i += 52) hash = Math.imul(hash ^ pixels[i], 16777619) >>> 0;
      return hash;
    });
    assert.equal(await intro.getAttribute('data-surface'), 'liquid-caustics-nebula');
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
        await intro.evaluate((el, delta) => {
          const touch = y => new Touch({ identifier: 1, target: el, clientY: y });
          const start = touch(500), end = touch(500 - delta);
          el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
          el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [end], targetTouches: [end], changedTouches: [end] }));
          el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], targetTouches: [], changedTouches: [end] }));
        }, (target - current) / gain);
        await page.clock.runFor(900);
      }
      assert.fail('Scroll must reach intro position ' + target);
    };
    if (name !== 'reduced') {
      await page.mouse.wheel(0, 120); await page.waitForTimeout(40);
      await page.clock.runFor(300);
      const crackStart = Number(await intro.getAttribute('data-rift-growth'));
      assert(crackStart > 0 && crackStart < .25, 'The fracture starts as a small local crack');
      await page.screenshot({ path: output + '/' + name + '-fracture-seed.png' });
      await page.clock.runFor(300);
      assert(Number(await intro.getAttribute('data-rift-growth')) > crackStart + .3, 'The crack spreads outward before the portal opens');
      const cracking = Number(await intro.getAttribute('data-seconds'));
      assert(cracking > .3 && cracking < 1, 'One roll first reveals the space fracture');
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
      await page.screenshot({ path: output + '/' + name + '-one-roll-fracture.png' });
      await page.clock.runFor(350);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000', 'Detailed fractures remain local while the aperture grows');
      assert(Number(await intro.getAttribute('data-rift-fracture')) > .2, 'The glass fracture persists before the portal');
      assert.equal(Number(await intro.getAttribute('data-rift-portal')), 0, 'The fracture and lightning exist before any portal rim');
      await page.screenshot({ path: output + '/' + name + '-fracture-detail.png' });
      await page.clock.runFor(3000);
      assert.equal(Number(await intro.getAttribute('data-seconds')), 2.75, 'One roll opens the complete portal');
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000', 'Opening never flies through the doorway');
      await page.screenshot({ path: output + '/' + name + '-one-roll-open.png' });
      await page.clock.runFor(1500);
      assert.equal(Number(await intro.getAttribute('data-seconds')), 2.75, 'The open portal waits for the next gesture');
      await page.mouse.wheel(0, 120); await page.waitForTimeout(40); await page.clock.runFor(1200);
      assert(Number(await intro.getAttribute('data-seconds')) > 2.75, 'The next wheel gesture starts entry');
      await scrollTo(0);
      await scrollTo(.35);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000', 'The observer remains still while charging the tear');
      await page.screenshot({ path: output + '/' + name + '-rift-charge.png' });
      await scrollTo(1.45);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
      tearGeometry = await intro.evaluate(el => [el.dataset.entranceAspect, el.dataset.entranceWorldRadius, el.dataset.entranceCenter]);
      assert(Number(tearGeometry[0]) < .15, 'The portal begins as a vertical seam');
      const tearShot = await page.screenshot({ path: output + '/' + name + '-vortex-small.png' });
      const tearPixels = await sharp(tearShot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const [tearX, tearY] = (await intro.getAttribute('data-entrance-center')).split(',').map(Number), tearRadius = Number(await intro.getAttribute('data-entrance-radius'));
      const columns = new Uint32Array(viewport.width), rows = new Uint32Array(viewport.height);
      let colored = 0;
      const tearHalfWidth = Math.max(6, tearRadius * Number(tearGeometry[0]) * 1.3);
      for (let y = Math.max(0, Math.floor(tearY - tearRadius * 1.1)); y < Math.min(viewport.height, tearY + tearRadius * 1.1); y++) for (let x = Math.max(0, Math.floor(tearX - tearHalfWidth)); x < Math.min(viewport.width, tearX + tearHalfWidth); x++) {
        const i = (y * viewport.width + x) * 3, [red, green, blue] = tearPixels.data.subarray(i, i + 3);
        if (!(blue > 35 && blue > green * 1.25 && blue > red * 1.05)) continue;
        colored++; columns[x]++; rows[y]++;
      }
      // Sample the nascent slit, excluding stars outside its horizontal span.
      // Violet appears dimmer during rim fade-in than the old copper streams.
      const coloredSpan = counts => {
        let sum = 0, start = 0;
        for (let i = 0; i < counts.length; i++) {
          sum += counts[i];
          if (sum < colored * .05) start = i;
          if (sum >= colored * .95) return i - start;
        }
        return 0;
      };
      const tearRatio = coloredSpan(columns) / coloredSpan(rows);
      assert(colored > 80 && tearRatio < .6, `The visible opening after the glass is a tall liquid tear, not a round icon: ${JSON.stringify({ colored, tearRatio })}`);
      formationSamples.push({ stage: 'tear', p: 1.45, aspect: Number(tearGeometry[0]), tearRatio, colored });
      await scrollTo(2.05);
      assert.equal(await intro.getAttribute('data-camera'), '0.000,0.000,1000.000');
      const expandingAspect = Number(await intro.getAttribute('data-entrance-aspect'));
      assert(expandingAspect > .6 && expandingAspect < 1, 'Scroll pulls the seam open while the camera still waits');
      assert.equal(Number(await intro.getAttribute('data-rift-fracture')), 0, 'The open portal has no glass or lightning overlay');
      formationSamples.push({ stage: 'opening', p: 2.05, aspect: expandingAspect });
      await page.screenshot({ path: output + '/' + name + '-rift-expanding.png' });
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
      let ringPixels = 0, changedPixels = 0, violetPixels = 0, coolPixels = 0;
      for (let y = 0; y < viewport.height; y += 2) for (let x = 0; x < viewport.width; x += 2) {
        const r = Math.hypot((x - cx) / radius, (y - cy) / (radius * .9));
        if (r < .45 || r > .85) continue;
        const offset = (y * beforePixels.info.width + x) * 3;
        ringPixels++;
        const [red, green, blue] = beforePixels.data.subarray(offset, offset + 3);
        if (blue > 45 && red > green * 1.3 && blue > red * 1.1) violetPixels++;
        if (blue > 45 && blue > red * 1.5) coolPixels++;
        if (Math.abs(beforePixels.data[offset] - afterPixels[offset]) + Math.abs(beforePixels.data[offset + 1] - afterPixels[offset + 1]) + Math.abs(beforePixels.data[offset + 2] - afterPixels[offset + 2]) > 20) changedPixels++;
      }
      assert(changedPixels > ringPixels * .08, 'The portal gas actually rotates while scroll position is held');
      assert(violetPixels > ringPixels * .01 && coolPixels > ringPixels * .02, 'The rendered liquid contains both violet nebula and cool starlight streams');
      await scrollTo(3.9);
      assert.equal(await intro.getAttribute('data-entrance-world-radius'), matureWorldRadius, 'Entry translates the camera through a fixed-size portal');
      assert(Number(await intro.getAttribute('data-entrance-depth')) < 0, 'The camera crosses the entrance plane');
      assert.equal(await intro.getAttribute('data-virtual-grid'), 'hidden');
      const centerPixel = () => intro.locator('canvas').evaluate(canvas => {
        const ctx = canvas.getContext('2d');
        return [...ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data];
      });
      assert.equal((await centerPixel())[3], 255, 'The liquid tunnel remains opaque after entry; Home is not visible');
      const lines = intro.locator('.virgo-intro-captions p');
      assert.deepEqual(await lines.evaluateAll(nodes => nodes.map(node => node.dataset.effect)), ['ion-scan', 'wave-light']);
      for (let i = 0; i < 2; i++) {
        assert.equal(await lines.nth(i).getAttribute('data-lines'), '1', 'Each fixed wall sentence is a single line');
        assert(Number(await lines.nth(i).evaluate(el => el.style.opacity)) > .2, 'Both sentences already exist ahead in the tunnel');
        const readingDepths = (await lines.nth(i).getAttribute('data-reading-depths')).split(',').map(Number);
        assert(readingDepths[0] < readingDepths[1], 'Both sentences start near the viewer and end deeper in the tunnel');
      }
      const far = (await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number);
      assert(far[0] + far[2] / 2 < viewport.width / 2, 'The greeting starts on the left tunnel wall');
      await page.screenshot({ path: output + '/' + name + '-tunnel-entry.png' });
      await visibleWall('inside entrance');
      await scrollTo(4.7);
      const near = (await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number);
      assert(near[2] > far[2], 'Fixed wall text grows by perspective as the camera approaches');
      await page.screenshot({ path: output + '/' + name + '-greeting-1.png' });
      await visibleWall('fully inside');
      const retainedFrame = await canvasFingerprint();
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.clock.runFor(400);
      await page.screenshot({ path: output + '/' + name + '-paused.png' });
      assert.equal(await canvasFingerprint(), retainedFrame, 'Pausing rendering retains the visible tunnel instead of clearing it black');
      await page.setViewportSize({ width: viewport.width - 10, height: viewport.height });
      await page.clock.runFor(100);
      assert.equal(await canvasFingerprint(), retainedFrame, 'A resize while hidden also preserves the last visible frame');
      await page.setViewportSize(viewport); await page.clock.runFor(100);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.runFor(200);
      await visibleWall('resumed');
      await page.clock.runFor(2400);
      await visibleWall('held inside');
      await page.screenshot({ path: output + '/' + name + '-held-inside.png' });
      await scrollTo(5.8);
      assert.equal((await centerPixel())[3], 255, 'The liquid remains opaque while wall text passes');
      await page.screenshot({ path: output + '/' + name + '-greeting-2.png' });
      await visibleWall('second wall');
      await scrollTo(4.7);
      assert.deepEqual((await lines.nth(0).getAttribute('data-projected-bounds')).split(',').map(Number), near, 'Reversing restores the same physical wall patch');
      const farExit = Number(await intro.getAttribute('data-exit-radius'));
      const farHomePose = (await page.locator('.virgo-page').getAttribute('data-camera-pose')).split(',').map(Number);
      await scrollTo(7.1);
      assert.equal((await centerPixel())[3], 255, 'Home remains hidden until the final approach');
      const blackArea = await intro.locator('canvas').evaluate(canvas => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let black = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 0 && pixels[i + 3] === 255) black++;
        return black / (canvas.width * canvas.height);
      });
      assert(blackArea < .005, 'The late tunnel has no painted black disk');
      await page.screenshot({ path: output + '/' + name + '-exit-closed.png' });
      await visibleWall('before exit');
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
      await scrollTo(1.45);
      const returnedTear = await intro.evaluate(el => [el.dataset.entranceAspect, el.dataset.entranceWorldRadius, el.dataset.entranceCenter]);
      assert(Math.abs(Number(returnedTear[0]) - Number(tearGeometry[0])) < .003 && Math.abs(Number(returnedTear[1]) - Number(tearGeometry[1])) < 1, 'Reverse travel restores the creation seam within the scroll settling tolerance');
      for (const [i, value] of returnedTear[2].split(',').map(Number).entries()) assert(Math.abs(value - Number(tearGeometry[2].split(',')[i])) < 1, 'The seam centre returns to the same position');
      await page.screenshot({ path: output + '/' + name + '-rift-return.png' });
      await scrollTo(0);
    }
    assert.equal(await page.evaluate(() => location.hash), '#/cosmos', 'Reverse scroll can return all the way to the constellation');
    assert.equal(await intro.getAttribute('data-seconds'), '0.000');
    await page.screenshot({ path: output + '/' + name + '-return-cosmos.png' });
    assert.deepEqual(errors, []);
    results.push({ name, scrollDriven: true, persistentSingleLineCaptions: true, formationSamples, wallSamples, status: 'passed' });
    console.log('PASS intro: ' + name); await context.close();
  }
} finally { await writeFile(reportPath, JSON.stringify(results, null, 2)); await browser.close(); }
