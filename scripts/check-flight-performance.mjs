import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Diagnostic only: use real time, with no page.clock or invented 120 Hz result.
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const output = 'artifacts/intro-flight';
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(process.argv[2] || 'http://127.0.0.1:5182/');
  await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.querySelector('.virgo-intro-flight')?.dataset.phase === 'idle');
  const record = page.evaluate(() => new Promise(resolve => {
    const frames = [], started = performance.now();
    const sample = now => {
      const intro = document.querySelector('.virgo-intro-flight');
      if (!intro || now - started > 20000) { resolve(frames); return; }
      if (intro.dataset.running === 'true') frames.push({ now, position: Number(intro.dataset.seconds), z: Number(intro.dataset.camera.split(',')[2]) });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  for (let i = 0; i < 40 && await page.locator('.virgo-intro-flight').count(); i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(350);
  }
  const frames = await record;
  const tunnel = frames.filter(frame => frame.position >= 2.75 && frame.position <= 7.20);
  assert(tunnel.length > 20, 'Measure the actual mounted tunnel through a complete flight');
  const intervals = tunnel.slice(1).map((frame, i) => frame.now - tunnel[i].now).sort((a, b) => a - b);
  const report = {
    measuredAt: new Date().toISOString(), motionModel: 'scroll-driven', viewport: { width: 1440, height: 900 },
    samples: tunnel.length, realFps: 1000 * (tunnel.length - 1) / (tunnel.at(-1).now - tunnel[0].now),
    medianFrameMs: intervals[Math.floor(intervals.length * .50)], p95FrameMs: intervals[Math.floor(intervals.length * .95)],
    maxFrameMs: intervals.at(-1), framesOver25ms: intervals.filter(ms => ms > 25).length,
    limitations: ['Headless Chrome on this computer; display refresh and other running processes affect cadence.',
      'This is a real-time sample, not evidence of 120 FPS on other hardware.'],
  };
  await writeFile(`${output}/performance.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
