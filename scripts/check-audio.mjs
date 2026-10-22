import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = 'artifacts/audio';
const offline = process.argv.includes('--offline');
await mkdir(output, { recursive: true });
const server = offline ? null : await createServer({ server: { host: '127.0.0.1', port: 5184, strictPort: true, hmr: false } });
let browser;
try {
  await server?.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.UI_CHROME_PATH ? { executablePath: process.env.UI_CHROME_PATH } : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (offline) {
    // Run the same signal/lifecycle assertions without an HTTP connection.
    // Worker and mixer still use the real browser APIs; only module loading differs.
    const { build } = createRequire(import.meta.resolve('vite'))('esbuild');
    const worker = await build({ entryPoints: ['src/utils/portfolioScore.worker.ts'], bundle: true, write: false, format: 'esm' });
    const html = await readFile('scripts/check-audio-browser.html', 'utf8');
    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
    const main = await build({
      stdin: { contents: script.replaceAll("'/src/", "'./src/"), resolveDir: process.cwd() },
      bundle: true, write: false, format: 'esm', define: { 'import.meta.url': JSON.stringify('https://offline.invalid/src/utils/portfolioAudio.ts') },
    });
    await page.setContent(html.replace(/<script type="module">[\s\S]*?<\/script>/, ''));
    await page.evaluate(source => {
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker { constructor(_url, options) { super(url, options); } };
    }, worker.outputFiles[0].text);
    await page.addScriptTag({ type: 'module', content: main.outputFiles[0].text });
  } else await page.goto(`${server.resolvedUrls.local[0]}scripts/check-audio-browser.html`);
  await page.getByRole('button', { name: 'Chạy kiểm tra âm thanh' }).click();
  let timeout;
  try { await page.waitForFunction(() => ['pass', 'fail'].includes(document.documentElement.dataset.result), null, { timeout: 90000 }); }
  catch (error) { timeout = error.message; }
  const status = await page.locator('pre').innerText();
  await page.screenshot({ path: `${output}/sound-direction${offline ? '-offline' : ''}.png`, fullPage: true });
  const result = await page.evaluate(() => ({ result: document.documentElement.dataset.result, measurements: window.audioMeasurements }));
  await writeFile(`${output}/${offline ? 'offline-report' : 'report'}.json`, JSON.stringify({ ...result, errors, status, timeout, offline, limitations: ['Signal and browser lifecycle checks do not verify perceived quality on physical speakers or headphones.', ...(offline ? ['Offline mode replaces HTTP module loading; portfolio UI and production worker URL loading are not verified.'] : [])] }, null, 2) + '\n');
  console.log(status);
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(result.result, 'pass', status);
  if (offline) console.log('PASS offline signal/lifecycle check; portfolio UI requires a separate HTTP check.');
  const uiChecks = [];
  for (const [name, options] of offline ? [] : [
    ['desktop', { viewport: { width: 1440, height: 900 } }],
    ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) {
    // Audio controls remain available with reduced motion; avoid rendering a
    // continuous 3D flight while checking this independent keyboard/touch flow.
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce' }), ui = await context.newPage();
    await ui.goto(`${server.resolvedUrls.local[0]}#/home`);
    await ui.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const menu = ui.locator('.virgo-chapters > button');
    await menu.waitFor();
    await ui.evaluate(async () => {
      const { portfolioAudio } = await import('/src/utils/portfolioAudio.ts');
      const original = portfolioAudio.playSfx.bind(portfolioAudio);
      window.audioUiCues = [];
      portfolioAudio.playSfx = cue => { window.audioUiCues.push(cue); original(cue); };
    });
    await menu.click();
    await ui.waitForFunction(() => window.audioUiCues.includes('drawerOpen'));
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await ui.screenshot({ path: `${output}/${name}-audio-menu.png` });
    await ui.keyboard.press('Escape');
    await ui.waitForFunction(() => window.audioUiCues.includes('drawerClose'));
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    const toggle = ui.locator('.virgo-sound-toggle');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(await ui.locator('html').getAttribute('data-journey-sound'), 'off');
    await toggle.click();
    await ui.waitForFunction(() => window.audioUiCues.includes('muteOn'));
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    console.log(`PASS ${name}: menu open/Escape/close cues and mute/unmute in the portfolio`);
    uiChecks.push({ name, reducedMotion: true, result: 'pass' });
    await context.close();
  }
  if (!offline) await writeFile(`${output}/report.json`, JSON.stringify({ ...result, errors, status, uiChecks, limitations: ['UI checks use reduced motion. Physical touch and perceived audio quality on speakers/headphones are not verified.'] }, null, 2) + '\n');
} finally { await browser?.close(); await server?.close(); }
