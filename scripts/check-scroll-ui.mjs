import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = 'artifacts/scroll-response';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const report = [];
try {
  for (const [name, viewport, reducedMotion] of [
    ['desktop', { width: 1242, height: 715 }, 'no-preference'],
    ['phone', { width: 390, height: 844 }, 'no-preference'],
    ['reduced', { width: 1242, height: 715 }, 'reduce'],
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto((process.argv[2] || 'http://127.0.0.1:5182/') + '#/home');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.querySelector('.virgo-page')?.dataset.cameraPose);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    await page.mouse.move(viewport.width * .5, viewport.height * .85);
    const read = () => page.locator('.virgo-page').evaluate(el => {
      const scroll = document.querySelector('.virgo-scroll');
      return { p: Number(el.style.getPropertyValue('--flight-progress')) * 6,
        pose: el.dataset.cameraPose.split(',').map(Number), orbit: el.dataset.readingOrbit?.split(',').map(Number),
        limit: scroll.scrollHeight - scroll.clientHeight, top: scroll.scrollTop,
        contactTop: document.querySelector('.virgo-scroll-content').lastElementChild.offsetTop };
    });
    const seek = async p => {
      await page.evaluate(p => {
        const page = document.querySelector('.virgo-page'), scroll = document.querySelector('.virgo-scroll');
        const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        const index = Math.min(5, Math.floor(p));
        page.dataset.introArrival = String(p);
        scroll.scrollTop = offsets[index] + (offsets[index + 1] - offsets[index]) * (p - index);
      }, p);
      await page.clock.runFor(100);
    };
    const wheel = async (delta, milliseconds = 160) => {
      await page.mouse.wheel(0, delta); await page.waitForTimeout(40);
      await page.clock.runFor(milliseconds);
    };
    const gestures = [];
    for (const p of [2.02, 2.20, 2.32, 2.60, 2.94, 3.23, 3.60, 3.95, 4.92, 5.10, 5.30, 5.56, 5.82, 5.96]) {
      for (const direction of [1, -1]) {
        await seek(p); const before = await read();
        await wheel(direction * 36); const after = await read();
        assert((after.p - before.p) * direction > .00001, `${name}: each small wheel gesture changes position at ${p}, direction ${direction}: ${JSON.stringify({ before, after })}`);
        const depth = (before.pose[2] - after.pose[2]) * direction;
        assert(depth > .01, `${name}: even reading/boundary/final gestures move in depth at ${p}: ${depth}`);
        assert(after.pose.slice(3).every((v, i) => Math.abs(v - [0, 0, 0, 1][i]) < .00001), 'Wheel never bends the interstellar camera heading');
        gestures.push({ p, direction, depth });
      }
    }
    // Reverse before the pending forward lead has settled.
    await seek(2.6); await wheel(80, 64); const outward = await read();
    await wheel(-36, 32); const backward = await read();
    assert(backward.p < outward.p && backward.pose[2] > outward.pose[2], 'A reverse gesture moves backward on the first rendered frames');
    await wheel(36, 32); const forwardAgain = await read();
    assert(forwardAgain.p > backward.p && forwardAgain.pose[2] < backward.pose[2], 'Forward reversal has the same immediate response');

    await seek(2.94); const first = await read();
    await seek(4.25); const last = await read();
    assert.equal(first.orbit[0], 1); assert.equal(last.orbit[0], 1);
    assert(Math.abs(last.orbit[1] - first.orbit[1] + (name === 'reduced' ? 0 : Math.PI)) < .001, 'The mounted station completes the reading half-orbit');
    await seek(4.27); const departed = await read();
    assert(Math.abs(departed.orbit[1] - last.orbit[1]) < .001, 'Departure keeps the final reading angle without an unwind');
    await seek(3.23); const reading = await read();
    await page.screenshot({ path: `${output}/${name}-reading-first.png` });
    await seek(3.95); await page.screenshot({ path: `${output}/${name}-reading-second.png` });
    await seek(3.23); const restored = await read();
    assert(Math.abs(restored.orbit[1] - reading.orbit[1]) < .001, 'Reverse restores the same local orbit');
    await wheel(36); await page.clock.runFor(1200); const settled = await read();
    await page.clock.runFor(500); const idle = await read();
    assert(Math.abs(idle.p - settled.p) < .0001, 'No wheel means no continuing flight');

    await seek(6); const contact = await read();
    assert(Math.abs(contact.limit - contact.contactTop) <= 1, 'Contact is exactly the native scroll limit, with no blank tail');
    assert(Math.abs(contact.p - 6) < .002);
    await wheel(-36); const returnFromContact = await read();
    assert(returnFromContact.p < contact.p && returnFromContact.pose[2] > contact.pose[2], 'The very first reverse wheel at Contact leaves the endpoint');
    await page.screenshot({ path: `${output}/${name}-contact-reverse.png` });
    assert.deepEqual(errors, []);
    report.push({ name, status: 'passed', gestures, readingAngle: last.orbit[1] - first.orbit[1], contactTailPixels: contact.limit - contact.contactTop });
    console.log(`PASS scroll response: ${name}`); await page.close();
  }
} finally { await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); await browser.close(); }
