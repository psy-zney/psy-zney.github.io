import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const output = 'artifacts/transit-motion';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
try {
  for (const [name, viewport] of [['desktop', { width: 1242, height: 715 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.argv[2] || 'http://127.0.0.1:5182/') + '#/home');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.querySelector('.virgo-page')?.dataset.cameraPose);
    await page.clock.install();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    assert.equal(await page.locator('.virgo-transit-veil').count(), 0, 'No opaque blue transition layer');
    for (const [from, to] of [[2.32, 2.94], [4.25, 4.8], [5.3, 5.82]]) {
      const seek = async (position, snap) => page.evaluate(({ position, snap }) => {
        const root = document.querySelector('.virgo-page');
        const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        const index = Math.floor(position);
        if (snap) root.dataset.introArrival = String(position);
        document.querySelector('.virgo-scroll').scrollTop = offsets[index] + (offsets[index + 1] - offsets[index]) * (position - index);
      }, { position, snap });
      await seek(from, true); await page.clock.runFor(100);
      const recording = page.evaluate(() => new Promise(resolve => {
        const frames = []; const start = performance.now();
        const sample = now => {
          const root = document.querySelector('.virgo-page');
          frames.push({ p: Number(root.style.getPropertyValue('--flight-progress')) * 6, pose: root.dataset.cameraPose.split(',').map(Number), projection: root.dataset.cameraFraming?.split(',').map(Number) });
          if (now - start >= 11900) resolve(frames); else requestAnimationFrame(sample);
        }; requestAnimationFrame(sample);
      }));
      await seek(to, false);
      await page.clock.runFor(2000);
      await page.screenshot({ path: output + '/' + name + '-' + from + '-moving.png' });
      await page.clock.runFor(10000);
      const frames = await recording;
      const moving = frames.filter(frame => frame.p > from + .001 && frame.p < to - .001);
      assert(moving.length > 10, 'Sample the mounted camera throughout the transfer');
      assert(Math.max(...moving.map(frame => frame.pose[0])) - Math.min(...moving.map(frame => frame.pose[0])) > 20, 'The flight sweeps beside the systems instead of following a line of cores');
      let maxTurn = 0;
      for (let i = 1; i < moving.length; i++) {
        const a = moving[i - 1].pose.slice(3), b = moving[i].pose.slice(3);
        const dot = Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0));
        const angle = 2 * Math.acos(Math.min(1, dot));
        maxTurn = Math.max(maxTurn, angle);
        assert(angle < .15, 'Camera orientation never snaps between frames');
        assert(Math.abs(moving[i].projection[0] - moving[i - 1].projection[0]) < .08, 'Projection does not jump between left and right framing');
        assert(moving[i].pose[2] <= moving[i - 1].pose[2] + .001, 'Flight never retreats');
      }
      assert(Math.abs(frames.at(-1).p - to) < .002, 'The transfer reaches its destination');
      for (let i = 1; i < frames.length; i++) assert(Math.abs(frames[i].projection[0] - frames[i - 1].projection[0]) < .08, 'Framing remains continuous at both transfer boundaries');
      results.push({ name, from, to, samples: moving.length, maxTurnRadians: maxTurn });
    }
    assert.deepEqual(errors, []); console.log('PASS transit: ' + name); await page.close();
  }
} finally { await writeFile(output + '/report.json', JSON.stringify(results, null, 2)); await browser.close(); }
