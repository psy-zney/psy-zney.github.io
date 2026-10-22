import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = 'artifacts/info-panels';
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5185, strictPort: true, hmr: false } });
const report = [];
let browser;
try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
  for (const [name, width, height, reducedMotion] of [
    ['desktop', 1440, 900, 'no-preference'], ['tablet', 762, 715, 'no-preference'],
    ['phone', 390, 844, 'no-preference'], ['landscape', 844, 390, 'no-preference'], ['reduced', 1440, 900, 'reduce'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const fit = async (dialog, close) => {
      await dialog.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
      const box = await dialog.boundingBox(), button = await close.boundingBox();
      assert(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${name}: popup stays inside the viewport: ${JSON.stringify(box)}`);
      assert(button && button.width >= 44 && button.height >= 44 && button.x >= 0 && button.x + button.width <= width && button.y >= 0 && button.y + button.height <= height, `${name}: close is visible with a 44px hit target`);
      assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, 'Popup has no horizontal overflow');
      const glass = await dialog.evaluate(element => {
        const style = getComputedStyle(element), channels = style.backgroundColor.match(/[\d.]+/g);
        return { filter: style.backdropFilter, alpha: channels?.length === 4 ? Number(channels[3]) : 1 };
      });
      assert(glass.filter.includes('blur(') && glass.alpha <= .25, 'Liquid glass stays clear with a light tint and real backdrop blur');
    };
    await page.goto(base + '#/project/beatsync');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const dialog = page.locator('.virgo-dialog'), close = dialog.getByRole('button', { name: 'Close', exact: true });
    await dialog.waitFor({ state: 'visible' });
    await fit(dialog, close);
    assert.equal(await dialog.locator('.info-panel-bar').count(), 1);
    assert.equal(await dialog.locator('.project-document h1').innerText(), 'BeatSync');
    assert(await dialog.getByRole('link', { name: 'GitHub', exact: true }).isVisible());
    await page.screenshot({ path: `${output}/${name}-project.png` });
    const trigger = dialog.getByRole('button', { name: 'Contents', exact: true });
    if (await trigger.isVisible()) await trigger.click();
    await dialog.getByRole('button', { name: 'Architecture', exact: true }).click();
    await dialog.getByRole('heading', { name: 'Connected parts' }).waitFor();
    assert(await dialog.locator('.architecture-path li').count() > 1);
    await page.screenshot({ path: `${output}/${name}-architecture.png` });
    const before = await close.boundingBox();
    await dialog.locator('.virgo-dialog-inner').evaluate(element => { element.scrollTop = element.scrollHeight; });
    const after = await close.boundingBox();
    assert(Math.abs(before.y - after.y) <= 1, 'Popup header and close stay fixed while the document scrolls');
    await fit(dialog, close);
    await close.click();
    await dialog.waitFor({ state: 'hidden' });
    await page.goto(base + '#/projects/all');
    await dialog.waitFor({ state: 'visible' });
    await fit(dialog, close);
    assert.equal(await dialog.locator('.virgo-archive a').count(), 10);
    await page.screenshot({ path: `${output}/${name}-archive.png` });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await page.goto(base + '#/workspace/contact');
    const reader = page.locator('dialog.document-reader'), readerClose = reader.getByRole('button', { name: 'Close reader' });
    await reader.waitFor({ state: 'visible' });
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await fit(reader, readerClose);
    assert(await reader.getByRole('link', { name: /lequangkhanh295@gmail.com/ }).isVisible());
    await page.screenshot({ path: `${output}/${name}-contact.png` });
    await page.keyboard.press('Escape');
    await reader.waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    report.push({ name, status: 'passed' });
    await context.close();
    console.log(`PASS: ${name} project/architecture/archive/contact popup fit, close, scrolling and recovery.`);
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  await server.close();
}
