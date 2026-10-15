import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const output = 'artifacts/transit-motion';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
const entryOnly = process.env.TRANSIT_CHECK === 'entry';
try {
  for (const [name, viewport] of [['desktop', { width: 1242, height: 715 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    // GSAP captures its initial clock when the app loads.
    await page.clock.install();
    await page.goto((process.argv[2] || 'http://127.0.0.1:5182/') + '#/home');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.querySelector('.virgo-page')?.dataset.cameraPose);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    assert.equal(await page.locator('.virgo-transit-veil').count(), 0, 'No opaque blue transition layer');
    const visitedScenes = new Set();
    const seek = async (position, snap) => page.evaluate(({ position, snap }) => {
        const root = document.querySelector('.virgo-page');
        const offsets = [...document.querySelector('.virgo-scroll-content').children].map(el => el.offsetTop);
        const index = Math.min(5, Math.floor(position));
        if (snap) root.dataset.introArrival = String(position);
        document.querySelector('.virgo-scroll').scrollTop = offsets[index] + (offsets[index + 1] - offsets[index]) * (position - index);
    }, { position, snap });
    if (!entryOnly) {
      // The rendered reading poses must share the transit's heading as well.
      for (const position of [1.92, 2.22, 3.23, 3.95, 4.92, 5.17, 6]) {
        await seek(position, true); await page.clock.runFor(100);
        const pose = await page.locator('.virgo-page').evaluate(el => el.dataset.cameraPose.split(',').map(Number));
        assert(pose.every(Number.isFinite));
        for (const index of [0, 1, 3, 4, 5]) assert(Math.abs(pose[index]) < .00001, 'Reading cannot reintroduce a camera orbit before a straight transition');
        assert(Math.abs(pose[6] - 1) < .00001);
        if (position === 3.23 || position === 3.95) await page.screenshot({ path: `${output}/${name}-reading-${position}.png` });
      }
      for (const [from, to] of [[2.32, 2.94], [4.25, 4.8], [5.3, 5.82]]) {
        let outwardScene;
        for (const reverse of [false, true]) {
          const start = reverse ? to : from, end = reverse ? from : to;
          await seek(start, true); await page.clock.runFor(100);
          const recording = page.evaluate(() => new Promise(resolve => {
            const frames = []; const start = performance.now();
            const sample = now => {
              const root = document.querySelector('.virgo-page');
              frames.push({ p: Number(root.style.getPropertyValue('--flight-progress')) * 6, pose: root.dataset.cameraPose.split(',').map(Number), projection: root.dataset.cameraFraming?.split(',').map(Number), scenario: root.dataset.transitScenario });
              if (now - start >= 11900) resolve(frames); else requestAnimationFrame(sample);
            }; requestAnimationFrame(sample);
          }));
          await seek(end, false);
          await page.clock.runFor(2000);
          await page.screenshot({ path: output + '/' + name + '-' + from + (reverse ? '-reverse' : '-moving') + '.png' });
          await page.clock.runFor(10000);
          const frames = await recording;
          const moving = frames.filter(frame => frame.p > from + .001 && frame.p < to - .001);
          assert(moving.length > 10, 'Sample the mounted camera throughout the transfer');
          const scenes = new Set(moving.map(frame => frame.scenario));
          assert.equal(scenes.size, 1, 'The chosen scenery stays fixed throughout the leg');
          const scenario = [...scenes][0];
          assert(['asteroids', 'meteors', 'supernova'].includes(scenario));
          if (reverse) assert.equal(scenario, outwardScene, 'Reversing must not reroll the scenery');
          else { outwardScene = scenario; visitedScenes.add(scenario); }
          for (const frame of frames) {
            assert(frame.pose.every(Number.isFinite));
            for (const index of [0, 1, 3, 4, 5]) assert(Math.abs(frame.pose[index]) < .00001, 'The real camera keeps X/Y fixed and has zero yaw/pitch/roll, including the boundaries');
            assert(Math.abs(frame.pose[6] - 1) < .00001, 'The camera always faces -Z');
          }
          let maxTurn = 0;
          for (let i = 1; i < moving.length; i++) {
            const a = moving[i - 1].pose.slice(3), b = moving[i].pose.slice(3);
            const dot = Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0));
            const angle = 2 * Math.acos(Math.min(1, dot));
            maxTurn = Math.max(maxTurn, angle);
            assert(angle < .00001, 'Camera orientation never rotates between frames');
            assert(Math.abs(moving[i].projection[0] - moving[i - 1].projection[0]) < .08, 'Projection does not jump between left and right framing');
            assert((moving[i].pose[2] - moving[i - 1].pose[2]) * (reverse ? -1 : 1) <= .001, 'Depth follows the scroll direction without a turn');
          }
          assert(Math.abs(frames.at(-1).p - end) < .002, 'The transfer reaches its destination');
          for (let i = 1; i < frames.length; i++) assert(Math.abs(frames[i].projection[0] - frames[i - 1].projection[0]) < .08, 'Framing remains continuous at both transfer boundaries');
          results.push({ name, from, to, reverse, scenario, samples: moving.length, maxTurnRadians: maxTurn });
        }
      }
      assert.equal(visitedScenes.size, 3, 'All three scenery variants render during the same straight journey');
      for (const [from, to] of [[2.32, 2.94], [4.25, 4.8], [5.3, 5.82]]) {
        await seek(from + (to - from) * .25, true); await page.clock.runFor(100);
        const scenario = await page.locator('.virgo-page').getAttribute('data-transit-scenario');
        await page.screenshot({ path: `${output}/${name}-scene-${scenario}.png` });
      }
    }
    // Exercise the actual gallery trigger: its old camera arc/roll must not survive.
    await seek(4.25, true); await page.clock.runFor(100);
    const entryRecording = page.evaluate(() => new Promise(resolve => {
      const poses = [], start = performance.now();
      const record = now => {
        poses.push(document.querySelector('.virgo-page').dataset.cameraPose.split(',').map(Number));
        if (now - start >= 2550) resolve(poses); else requestAnimationFrame(record);
      }; requestAnimationFrame(record);
    }));
    await page.mouse.move(viewport.width / 2, viewport.height * .75);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(50); // Wheel dispatch is asynchronous even with a paused animation clock.
    await page.clock.runFor(2580);
    const entry = await page.locator('.virgo-page').evaluate(el => ({ pose: el.dataset.cameraPose.split(',').map(Number), solar: el.dataset.solarPassage?.split(',').map(Number), dataset: { ...el.dataset }, style: el.getAttribute('style'), hash: location.hash }));
    await writeFile(`${output}/${name}-showcase-entry.json`, JSON.stringify(entry, null, 2));
    assert(entry.solar?.[0] > 2.5, 'The mounted camera performs the core handoff: ' + JSON.stringify(entry));
    assert(entry.pose[2] < -480, 'The camera crosses the core in the forward direction');
    for (const index of [0, 1, 3, 4, 5]) assert(Math.abs(entry.pose[index]) < .00001, 'Showcase entry keeps the straight axis and heading');
    assert(Math.abs(entry.pose[6] - 1) < .00001);
    const entryPoses = await entryRecording;
    assert(entryPoses.length > 100, 'Record the entire core handoff');
    for (const [i, pose] of entryPoses.entries()) {
      for (const index of [0, 1, 3, 4, 5]) assert(Math.abs(pose[index]) < .00001, 'No temporary arc or roll during the handoff');
      assert(Math.abs(pose[6] - 1) < .00001);
      if (i) assert(pose[2] <= entryPoses[i - 1][2] + .001, 'The core handoff only travels forward');
    }
    await page.screenshot({ path: `${output}/${name}-showcase-straight-entry.png` });
    await page.clock.runFor(1700);
    await page.locator('.screening-room').waitFor({ state: 'visible' });
    assert(page.url().endsWith('#/showcase/mpoly'), 'The unchanged gallery handoff reaches the first product');
    results.push({ name, showcaseStraightEntry: { pose: entry.pose, solar: entry.solar, samples: entryPoses.length } });
    assert.deepEqual(errors, []); console.log('PASS transit: ' + name); await page.close();
  }
} finally { await writeFile(`${output}/report${entryOnly ? '-entry' : ''}.json`, JSON.stringify(results, null, 2)); await browser.close(); }
