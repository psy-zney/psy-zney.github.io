import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';

const output = process.env.STELLAR_OUTPUT || 'artifacts/stellar-effects'; await mkdir(output, { recursive: true });
const selected = process.env.STELLAR_VIEWPORT;
const sourcePaths = ['src/components/VirgoStellarEffects.tsx', 'src/data/virgoStellarEffects.ts', 'src/components/VirgoScene.tsx', 'src/components/VirgoTransit.tsx', 'src/data/virgoTransit.ts', 'src/components/VirgoPortfolio.tsx', 'src/components/VirgoPortfolio.css', 'src/data/virgoNarrative.ts'];
const digest = async () => {
  const hash = createHash('sha256');
  for (const path of sourcePaths) hash.update(path).update(await readFile(path));
  return hash.digest('hex');
};
const sourceSha256 = await digest(), scenarios = [];
const blackHoleSources = {};
for (const file of ['BlackHoleVortex.tsx', 'blackHoleShader.ts', 'blackHoleRendering.ts', 'BlackHoleOrbitControls.tsx']) blackHoleSources[file] = createHash('sha256').update(await readFile(`src/components/${file}`)).digest('hex');
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
let status = 'failed', failure;
try {
  for (const [name, viewport, reducedMotion] of [
    ['desktop', { width: 1242, height: 715 }, 'no-preference'],
    ['phone', { width: 390, height: 844 }, 'no-preference'],
    ['landscape', { width: 844, height: 390 }, 'no-preference'],
    ['reduced', { width: 1242, height: 715 }, 'reduce'],
  ]) {
    if (selected && selected !== name) continue;
    const page = await browser.newPage({ viewport, reducedMotion });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /Shader Error|VALIDATE_STATUS|WebGL/.test(message.text())) errors.push(message.text()); });
    await page.clock.install();
    await page.goto((process.argv[2] || 'http://127.0.0.1:5182/') + '#/home');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.querySelector('.virgo-page')?.dataset.cameraPose);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const seek = async p => {
      await page.evaluate(p => {
        const root = document.querySelector('.virgo-page'), offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        const i = Math.min(5, Math.floor(p)); root.dataset.introArrival = String(p);
        document.querySelector('.virgo-scroll').scrollTop = offsets[i] + (offsets[i + 1] - offsets[i]) * (p - i);
      }, p);
      // Native scroll delivery can lag a demand-rendered reduced-motion frame.
      // Wait for the actual scene position before measuring pixels at rest.
      let reached = false;
      for (let attempt = 0; attempt < 15; attempt++) {
        await page.clock.runFor(120);
        reached = await page.locator('.virgo-page').evaluate((root, p) => Math.abs(Number(root.style.getPropertyValue('--flight-progress')) * 6 - p) < .002 && Math.abs(Number(root.dataset.flightTarget) - p) < .002, p);
        if (reached) break;
        await page.waitForTimeout(20);
      }
      assert(reached, `The rendered scene reaches ${p} before taking a screenshot`);
    };
    const root = page.locator('.virgo-page');
    await seek(3.23);
    const first = page.locator('[data-narrative-index="4"]');
    assert((await first.getAttribute('class')).includes('virgo-narrative-left'), 'The first reading sentence starts on the left');
    if (viewport.width >= 700) {
      const box = await first.boundingBox(); assert(box.x + box.width / 2 < viewport.width / 2, 'The first sentence is actually in the left half, including landscape');
      const action = await page.locator('.virgo-single-link a:visible').first().boundingBox();
      assert(action.x + action.width / 2 < viewport.width / 2, 'The matching action stays under the first sentence');
    }
    const shotA = await page.screenshot({ path: `${output}/${name}-plasma-a.png` });
    const pose = (await root.getAttribute('data-camera-pose')).split(',').map(Number);
    const framing = (await root.getAttribute('data-camera-framing')).split(',').map(Number);
    await page.clock.runFor(1400);
    const shotB = await page.screenshot({ path: `${output}/${name}-plasma-b.png` });
    const a = await sharp(shotA).removeAlpha().raw().toBuffer({ resolveWithObject: true }), b = await sharp(shotB).removeAlpha().raw().toBuffer();
    const cx = (1 + framing[0]) * viewport.width / 2, cy = (1 - framing[1]) * viewport.height / 2;
    const radius = 10.4 * viewport.height / (2 * Math.tan((viewport.width < 700 ? 49 : 46) * Math.PI / 360)) / (pose[2] + 480);
    let samples = 0, moved = 0, min = 255, max = 0;
    for (let y = Math.max(0, Math.ceil(cy - radius * .8)); y < Math.min(viewport.height, cy + radius * .8); y++) for (let x = Math.max(0, Math.ceil(cx - radius * .8)); x < Math.min(viewport.width, cx + radius * .8); x++) {
      if (Math.hypot(x - cx, y - cy) > radius * .8) continue;
      const i = (y * a.info.width + x) * 3; samples++;
      const light = Math.max(a.data[i], a.data[i + 1], a.data[i + 2]); min = Math.min(min, light); max = Math.max(max, light);
      if (Math.abs(a.data[i] - b[i]) + Math.abs(a.data[i + 1] - b[i + 1]) + Math.abs(a.data[i + 2] - b[i + 2]) > 18) moved++;
    }
    assert(samples > 100 && max - min > 50, `${name}: the stellar surface has crisp hot cells and dark channels`);
    assert(name === 'reduced' ? moved === 0 : moved / samples > .06, `${name}: plasma actually boils at rest (changed ${moved}/${samples})`);
    const eruptionFrames = [];
    let capturedPeak = false, capturedRest = false;
    for (let step = 0; step <= (name === 'reduced' ? 1 : 24); step++) {
      const strengths = (await root.getAttribute('data-plasma-bursts')).split(',').map(Number);
      eruptionFrames.push(strengths);
      if (!capturedPeak && strengths[0] > .85) { await page.screenshot({ path: `${output}/${name}-eruption-peak.png` }); capturedPeak = true; }
      if (!capturedRest && strengths[0] === 0) { await page.screenshot({ path: `${output}/${name}-eruption-rest.png` }); capturedRest = true; }
      await page.clock.runFor(500);
    }
    for (let i = 0; i < eruptionFrames[0].length; i++) {
      assert.equal(Math.min(...eruptionFrames.map(frame => frame[i])), 0, 'Every plasma loop fully disappears between eruptions');
      if (name !== 'reduced') assert(Math.max(...eruptionFrames.map(frame => frame[i])) > .8, 'Every loop has a visible, short eruption');
      else assert(eruptionFrames.every(frame => frame[i] === 0), 'Reduced motion never leaves static wires around the star');
    }
    await seek(3.95); assert((await page.locator('[data-narrative-index="5"]').getAttribute('class')).includes('virgo-narrative-right'), 'The following sentence moves to the right');
    if (viewport.width >= 700) {
      const box = await page.locator('[data-narrative-index="5"]').boundingBox(); assert(box.x + box.width / 2 > viewport.width / 2, 'The following sentence occupies the right half');
    }
    await page.screenshot({ path: `${output}/${name}-reading-right.png` });
    assert.equal(new Set(await page.locator('.virgo-narrative-line').evaluateAll(lines => lines.map(line => line.dataset.reveal))).size, 4, 'Four distinct scroll-driven ink reveals are mounted');
    const reveals = [];
    for (const [p, index] of [[1.96, 3], [2.98, 4], [3.69, 5], [4.83, 6]]) {
      await seek(p);
      const ink = await page.locator(`[data-narrative-index="${index}"]`).evaluate(line => {
        const style = getComputedStyle(line.firstElementChild), words = [...line.querySelectorAll('.virgo-story-word')];
        return { mode: line.dataset.reveal, clip: style.clipPath, filter: style.filter, transform: style.transform, words: words.map(word => Number(getComputedStyle(word).opacity)) };
      }); reveals.push(ink);
      if (name === 'reduced') assert(ink.clip === 'none' && ink.filter === 'none' && ink.transform === 'none', 'Reduced motion keeps ink immediately legible');
    }
    if (name !== 'reduced') {
      assert(reveals[0].clip !== 'none'); assert(reveals[1].filter !== 'none');
      assert(reveals[2].words[0] > reveals[2].words.at(-1), 'The word cascade advances from left to right');
      assert(reveals[3].transform !== 'none');
    }
    const samplePhotosphere = async (p, index, label) => {
      await seek(p);
      assert.equal(await root.getAttribute('data-supernova-frame'), null, 'The removed explosion stays absent');
      const shot = await page.screenshot({ path: `${output}/${name}-${label}.png` });
      const camera = (await root.getAttribute('data-camera-pose')).split(',').map(Number);
      const shift = (await root.getAttribute('data-camera-framing')).split(',').map(Number);
      const centerX = (1 + shift[0]) * viewport.width / 2, centerY = (1 - shift[1]) * viewport.height / 2;
      const diskRadius = [11.8, 10.4, 10.8][index] * viewport.height / (2 * Math.tan((viewport.width < 700 ? 49 : 46) * Math.PI / 360)) / (camera[2] + index * 480);
      const pixels = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let min = 255, max = 0, count = 0, detail = 0, blue = 0;
      for (let y = Math.max(1, Math.ceil(centerY - diskRadius * .65)); y < Math.min(viewport.height - 1, centerY + diskRadius * .65); y++) for (let x = Math.max(1, Math.ceil(centerX - diskRadius * .65)); x < Math.min(viewport.width - 1, centerX + diskRadius * .65); x++) {
        if (Math.hypot(x - centerX, y - centerY) > diskRadius * .65) continue;
        const i = (y * pixels.info.width + x) * 3, light = Math.max(...pixels.data.subarray(i, i + 3));
        min = Math.min(min, light); max = Math.max(max, light); count++;
        if (Math.abs(pixels.data[i + 2] - pixels.data[i + 5]) > 15) detail++;
        if (pixels.data[i + 2] > pixels.data[i] * 1.15) blue++;
      }
      const metrics = { p, index, contrast: max - min, detail: detail / count, blue: blue / count };
      assert(count > 100 && metrics.contrast > 50 && metrics.detail > .08, `${name}: photosphere ${index} keeps visible detail, not an empty halo: ${JSON.stringify(metrics)}`);
      if (index === 2) assert(metrics.blue > .8, `${name}: the last star keeps a blue plasma surface: ${JSON.stringify(metrics)}`);
      return metrics;
    };
    const lastStar = [];
    for (const p of [4.92, 5.17, 5.28, ...(name === 'reduced' ? [] : [5.34])]) {
      lastStar.push(await samplePhotosphere(p, 2, `last-star-${p}`));
    }
    const surfaceRecovery = [];
    for (const [step, [p, index]] of [[2.12, 0], [3.23, 1], [4.92, 2], [2.12, 0], [4.92, 2], [3.23, 1]].entries()) {
      surfaceRecovery.push(await samplePhotosphere(p, index, `surface-return-${step}-${index}`));
    }
    for (const p of [5.37, 5.60, 5.37]) { await seek(p); assert.equal(await root.getAttribute('data-supernova-frame'), null); }

    const contact = page.locator('[aria-labelledby="virgo-contact-title"]');
    for (const p of [5.94, 5.98, 6]) {
      await seek(p); await page.clock.runFor(500);
      assert.equal(await contact.getAttribute('aria-hidden'), 'false');
      assert.equal(await contact.evaluate(el => el.hasAttribute('inert')), false);
      assert(Number(await contact.evaluate(el => getComputedStyle(el).opacity)) > .99, 'Contact stays visible through the endpoint');
      const boxes = await contact.locator('a').evaluateAll(links => links.map(link => { const r = link.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, href: link.getAttribute('href') }; }));
      assert.equal(boxes.length, 5);
      for (const box of boxes) assert(box.x >= 0 && box.right <= viewport.width + 1 && box.y >= 0 && box.bottom <= viewport.height + 1, `${name}: all Contact links fit: ${JSON.stringify(box)}`);
      const entry = await page.locator('.virgo-portal-label').boundingBox();
      for (const box of boxes) assert(!entry || box.right <= entry.x || box.x >= entry.x + entry.width || box.bottom <= entry.y || box.y >= entry.y + entry.height, `${name}: Contact links leave room for workspace entry: ${JSON.stringify({ box, entry })}`);
      const mute = await page.locator('.virgo-sound-toggle').boundingBox();
      for (const box of boxes) assert(box.right <= mute.x || box.x >= mute.x + mute.width || box.bottom <= mute.y || box.y >= mute.y + mute.height, `${name}: Contact links never overlap mute: ${JSON.stringify({ box, mute })}`);
    }
    await page.screenshot({ path: `${output}/${name}-contact-final.png` });
    await contact.locator('.virgo-email').focus();
    assert.equal(await contact.locator('.virgo-email').evaluate(el => el === document.activeElement), true, 'The persistent email link remains keyboard accessible');
    assert.deepEqual(errors, []);
    scenarios.push({ name, changedPlasmaPixels: moved, stellarPixels: samples, surfaceContrast: max - min, eruptionFrames, reveals, lastStar, surfaceRecovery, persistentContact: true });
    console.log(`PASS stellar effects: ${name}`); await page.close();
  }
  assert.equal(await digest(), sourceSha256, 'The tested source stayed unchanged during visual QA'); status = 'passed';
} catch (error) { failure = String(error); throw error; }
finally { await writeFile(`${output}/report${selected ? '-' + selected : ''}.json`, JSON.stringify({ status, sourceSha256, blackHoleSources, scenarios, failure }, null, 2)); await browser.close(); }
