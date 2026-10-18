import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const output = process.env.QUALITY_OUTPUT || 'artifacts/render-sharpness';
const base = (process.argv[2] || 'http://127.0.0.1:5182/').split('#')[0];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
const selected = process.env.UI_SCENARIOS?.split(',');
// Automatic quality starts with High sampling, within the public GPU budget.
const highDensity = (w, h, native) => Math.min(Math.max(native, 1.5), 3, Math.sqrt(16_600_000 / (w * h)), 8192 / w, 8192 / h);
try {
  for (const [name, width, height, deviceScaleFactor, reducedMotion] of [
    ['desktop', 1440, 900, 1, 'no-preference'],
    ['retina', 1440, 900, 2, 'no-preference'],
    ['phone', 390, 844, 3, 'no-preference'],
    ['4k', 3840, 2160, 1, 'no-preference'],
    ['reduced', 1440, 900, 2, 'reduce'],
  ]) {
    if (selected && !selected.includes(name)) continue;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor, reducedMotion });
    await context.addInitScript(() => localStorage.setItem('zney-quality', 'low'));
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /Shader Error|VALIDATE_STATUS|Error creating WebGL/.test(message.text())) errors.push(message.text()); });
    await page.clock.install();
    const advance = async (ms = 400) => { await page.clock.runFor(ms); await page.waitForTimeout(50); };
    const navigate = async hash => {
      const url = new URL(base); url.searchParams.set('render-qa', hash); url.hash = hash;
      await page.goto(url.href);
      await page.waitForFunction(() => document.querySelectorAll('[data-page-loader]').length === 0);
      await advance(1000);
    };
    const buffer = async selector => {
      const canvas = page.locator(selector);
      await canvas.waitFor();
      await page.waitForFunction(selector => Number(document.querySelector(selector)?.dataset.renderDpr) > 0, selector);
      const sample = await canvas.evaluate(canvas => {
        const rect = canvas.getBoundingClientRect(), gl = canvas.getContext('webgl2');
        return { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height,
          dpr: Number(canvas.dataset.renderDpr), antialias: gl?.getContextAttributes()?.antialias };
      });
      const density = highDensity(sample.cssWidth, sample.cssHeight, deviceScaleFactor);
      assert(Math.abs(sample.width - sample.cssWidth * density) <= 2, `${name}: High width: ${JSON.stringify(sample)}`);
      assert(Math.abs(sample.height - sample.cssHeight * density) <= 2, `${name}: High height: ${JSON.stringify(sample)}`);
      assert.equal(sample.antialias, true, `${name}: geometry uses MSAA`);
      return sample;
    };
    await navigate('#/'); await advance(5500);
    assert.equal(await page.locator('.virgo-quality-gauge,.virgo-quality-select').count(),0,'Public quality has no selector');
    const intro = page.locator('.virgo-intro-flight');
    const introBuffer = await intro.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    const highDpr = highDensity(width, height, deviceScaleFactor);
    assert(Math.abs(introBuffer.width - width * highDpr) <= 1);
    assert(Math.abs(introBuffer.height - height * highDpr) <= 1);
    const atRest = await intro.getAttribute('data-seconds');
    await page.evaluate(()=>{localStorage.setItem('zney-quality','low');window.dispatchEvent(new Event('zney-quality-change'));});
    await advance();
    assert(Math.abs(Number(await intro.getAttribute('data-render-dpr'))-highDpr)<.001,'Auto prioritizes High and ignores saved manual settings');
    assert.equal(await intro.getAttribute('data-seconds'),atRest,'Quality events cannot advance the journey');
    let liquid = null;
    if (reducedMotion !== 'reduce') {
      await page.mouse.move(width / 2, height / 2); await page.mouse.wheel(0, 120); await advance(3000);
      liquid = await intro.locator('canvas').getAttribute('data-liquid-resolution');
      assert(liquid, 'The real liquid renderer was used');
      assert.deepEqual(liquid.split(',').map(Number), [Math.round(width * highDpr), Math.round(height * highDpr)], 'Liquid shades the full High composition, without an upscale');
    }
    await page.screenshot({ path: `${output}/${name}-intro.png` });

    await navigate('#/story');
    const scene = await buffer('.virgo-canvas canvas');
    await page.screenshot({ path: `${output}/${name}-story.png` });
    const newWidth = Math.round(width * .8), newHeight = Math.round(height * .8);
    await page.setViewportSize({ width: newWidth, height: newHeight }); await advance();
    await buffer('.virgo-canvas canvas');
    await page.setViewportSize({ width, height }); await advance();
    if (name === 'reduced') {
      // Moving a demand-rendered scene between displays must update its buffer too.
      const session = await context.newCDPSession(page);
      await session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 3, mobile: false });
      for (let attempt = 0; attempt < 8; attempt++) {
        await advance(250);
        if (await page.locator('.virgo-canvas canvas').evaluate(canvas => canvas.width) === width * 3) break;
      }
      const switched = await page.locator('.virgo-canvas canvas').evaluate(canvas => ({ width: canvas.width, dpr: devicePixelRatio, renderDpr: canvas.dataset.renderDpr }));
      assert.equal(switched.width, width * 3, JSON.stringify(switched));
      await session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false });
      await advance(); await session.detach();
    }

    await navigate('#/contact'); await advance(1800);
    await page.locator('.virgo-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await advance(2400);
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 >= 5.98);
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.dataset.blackHoleResolution) >= 640);
    const blackHole = Number(await page.locator('.virgo-page').getAttribute('data-black-hole-resolution'));
    assert(blackHole <= 2048 && blackHole >= 640);
    if (deviceScaleFactor >= 2) assert(blackHole > 1280, `${name}: high-density black hole exceeds the old ceiling`);
    await page.screenshot({ path: `${output}/${name}-contact.png` });

    if (name !== 'reduced') {
      await navigate('#/showcase/beatsync'); await advance(2400);
      if(await page.locator('.worlds-showcase').count()){
        await page.getByRole('button',{name:'Enter world',exact:true}).click();await advance(1800);
      }
      await buffer('.screening-tunnel-canvas');
      await page.screenshot({ path: `${output}/${name}-gallery.png` });
    }
    if (name === 'retina') {
      await page.evaluate(()=>localStorage.setItem('zney-quality','high'));
      await context.addInitScript(()=>localStorage.setItem('zney-quality','high'));
      await navigate('#/workspace');
      await page.waitForFunction(() => document.querySelector('.room-canvas canvas')?.dataset.renderDpr, null, { timeout: 120000 });
      await advance(1200);
      await buffer('.room-canvas canvas');
      await page.screenshot({ path: `${output}/${name}-workspace.png` });
    }
    assert.deepEqual(errors, [], `${name}: no runtime or shader errors`);
    results.push({ name, viewport: { width, height }, deviceScaleFactor, highDpr, introBuffer, liquid, scene, blackHole, status: 'passed' });
    console.log(`PASS render quality: ${name} (${deviceScaleFactor}x, black hole ${blackHole})`);
    await context.close();
  }
} catch (error) {
  results.push({ status: 'failed', error: error.stack }); throw error;
} finally {
  await writeFile(`${output}/report${selected ? '-' + selected.join('-') : ''}.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
