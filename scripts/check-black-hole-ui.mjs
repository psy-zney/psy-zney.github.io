import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
const output = 'artifacts/black-hole-layout'; await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
try {
  for (const [name, viewport] of [['desktop', { width: 1242, height: 715 }], ['phone', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
    const page = await browser.newPage({ viewport }); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.argv[2] || 'http://127.0.0.1:5182/') + '#/contact');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.dataset.blackHoleShadeCount) > 2);
    await page.locator('.virgo-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress')) * 6 >= 5.98);
    const control = page.locator('.virgo-black-hole-orbit');
    await control.waitFor({ state: 'visible' });
    assert.equal(await page.locator('.virgo-contact-narrative, .virgo-portal-hint').count(), 0, 'No narrative or instruction text is mounted over the black hole');
    assert.equal(await page.locator('.virgo-star-portal').count(),0,'The redundant arrow entry is removed');
    const screenshot = await page.screenshot({ path: output + '/' + name + '.png' });
    const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0, warm = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      if (data[i] > 150 && data[i + 1] > 60 && data[i] > data[i + 2] + 35) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); warm++; }
    }
    assert(warm > 500 && maxX - minX > viewport.width * .40, 'An enlarged luminous black hole is visible');
    await control.press('ArrowRight');
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.dataset.blackHoleRenderAzimuth) > .12);
    await control.press('Home');
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('.virgo-page')?.dataset.blackHoleRenderAzimuth)) < .01);
    assert.deepEqual(errors, []); results.push({ name, warmPixels: warm, luminousBounds: { minX, maxX, minY, maxY } });
    console.log('PASS black hole: ' + name); await page.close();
  }
} finally { await writeFile(output + '/report.json', JSON.stringify(results, null, 2)); await browser.close(); }
