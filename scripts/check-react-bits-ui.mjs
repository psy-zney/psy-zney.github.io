import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = 'output/playwright/react-bits';
await mkdir(output, { recursive: true });
const server = process.argv[2] ? null : await createServer({
  cacheDir: 'node_modules/.vite-react-bits',
  server: { host: '127.0.0.1', port: 5186, strictPort: true, hmr: false },
});
let browser;
const results = [];
let current = 'setup';
const transform = node => {
  const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
  return Math.hypot(matrix.m41, matrix.m42);
};
const active = node => node.dataset.pointerActive === 'true';
try {
  if (server) await server.listen();
  const base = process.argv[2] || server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
  for (const [name, width, height, touch, reduced] of [
    ['desktop', 1440, 900, false, false], ['tablet', 762, 715, false, false],
    ['phone', 390, 844, true, false], ['landscape', 844, 390, true, false],
    ['reduced', 1440, 900, false, true],
  ]) {
    current = name;
    console.log(`Checking React Bits: ${name}`);
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch,
      isMobile: touch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}#/showcase/beatsync`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const mail = page.locator('.contact-mail');
    await mail.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.contact-landing')?.dataset.revealed === 'true');
    await page.waitForTimeout(1300); // Finish the preserved Contact arrival before measuring the link.
    assert.equal(await mail.getAttribute('href'), 'mailto:lequangkhanh295@gmail.com');
    const destinations = await page.locator('.contact-landing a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    for (const href of ['https://github.com/psy-zney', 'https://www.linkedin.com/in/psy-zney295', '#/cv/web', '#/cosmos']) assert(destinations.includes(href));
    const box = await mail.boundingBox();
    assert(box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width,
      `${name}: the native email link retains a visible, usable hit area`);
    const content = mail.locator('.rb-magnet-content');
    if (!touch && !reduced) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(350);
      const restingBox = await mail.boundingBox();
      await page.mouse.move(restingBox.x + restingBox.width * .78, restingBox.y + restingBox.height * .5);
      await page.waitForFunction(() => {
        const node = document.querySelector('.rb-magnet-content');
        return new DOMMatrixReadOnly(getComputedStyle(node).transform).m41 > .5;
      });
      await page.waitForTimeout(300);
      const pull = await content.evaluate(transform), movingBox = await mail.boundingBox();
      assert(pull > .5 && pull <= 6.05, `${name}: the pull is visible and capped at 6px`);
      assert(Math.abs(restingBox.x - movingBox.x) < .1 && Math.abs(restingBox.y - movingBox.y) < .1,
        `${name}: moving the contents keeps the hovered link stationary`);
      await page.screenshot({ path: `${output}/${name}-contact.png` });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await content.evaluate(transform), 0, 'Changing reduced motion immediately stops the pull');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForTimeout(1300); // Restoring motion replays the existing Contact arrival.
      const restoredBox = await mail.boundingBox();
      await page.mouse.move(restoredBox.x + restoredBox.width * .72, restoredBox.y + restoredBox.height * .5);
      await page.waitForFunction(() => document.querySelector('.contact-mail').dataset.pointerActive === 'true');
      await page.locator('.worlds-showcase').evaluate(node => { node.scrollTop -= 16; });
      await page.waitForFunction(() => !document.querySelector('.contact-mail').dataset.pointerActive);
    } else {
      await mail.dispatchEvent('pointermove', { pointerType: touch ? 'touch' : 'mouse', clientX: box.x + box.width * .8, clientY: box.y + box.height / 2 });
      assert.equal(await content.evaluate(transform), 0, `${name}: no magnetic movement`);
      assert.equal(await mail.evaluate(active), false);
      await page.screenshot({ path: `${output}/${name}-contact.png` });
    }
    await page.mouse.move(0, 0);
    await mail.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert(await mail.evaluate(node => node.matches(':focus-visible') && parseFloat(getComputedStyle(node).outlineWidth) >= 2),
      `${name}: the email link keeps keyboard focus feedback`);

    await page.goto(`${base}#/workspace/library`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const books = page.locator('.library-book');
    await books.first().waitFor();
    assert.equal(await books.count(), 10, 'All ten original case studies remain');
    const cover = books.first().locator('.rb-spotlight');
    await cover.scrollIntoViewIfNeeded();
    const coverBox = await cover.boundingBox();
    if (!touch && !reduced) {
      await page.mouse.move(coverBox.x + coverBox.width * .7, coverBox.y + coverBox.height * .35);
      await page.waitForFunction(() => document.querySelector('.rb-spotlight').dataset.pointerActive === 'true');
      await page.waitForTimeout(300);
      assert.equal(await cover.evaluate(node => getComputedStyle(node, '::after').opacity), '1');
    } else {
      await cover.dispatchEvent('pointermove', { pointerType: touch ? 'touch' : 'mouse', clientX: coverBox.x + 20, clientY: coverBox.y + 20 });
      assert.equal(await cover.evaluate(active), false);
    }
    assert.equal(await cover.evaluate(node => getComputedStyle(node, '::after').pointerEvents), 'none');
    await page.screenshot({ path: `${output}/${name}-library.png` });
    await page.mouse.move(0, 0);
    await books.first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert(await books.first().evaluate(node => node.matches(':focus-visible')));
    assert.equal(await cover.evaluate(node => getComputedStyle(node, '::after').opacity), '1',
      'Keyboard focus lights the cover even with reduced motion or a touch pointer');
    assert(await cover.evaluate(node => {
      const style = getComputedStyle(node, '::after');
      // Chromium may omit the default center from the serialized radial-gradient.
      return style.getPropertyValue('--rb-x').trim() === '50%' && style.getPropertyValue('--rb-y').trim() === '50%';
    }),
      'Keyboard light is centered instead of using a stale pointer position');
    const destination = await books.first().getAttribute('href');
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.hash === destination);
    await page.goBack();
    await books.first().waitFor();
    await page.getByRole('searchbox', { name: 'Search projects' }).fill('zz-no-such-project');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    assert.equal(await books.count(), 10);
    await page.getByRole('button', { name: 'List view', exact: true }).click();
    assert(await page.locator('.library-books').evaluate(node => node.classList.contains('is-list')));
    await page.screenshot({ path: `${output}/${name}-library-list.png` });
    await page.getByRole('button', { name: 'Grid view', exact: true }).click();
    await page.getByRole('combobox', { name: 'Sort projects' }).selectOption('name');
    assert.equal(await books.count(), 10);
    assert.deepEqual(errors, [], `${name}: no browser runtime errors`);
    results.push({ name, passed: true, destinations, caseStudies: 10 });
    await page.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify({ status: 'passed', results,
    limitations: ['Touch, audio and performance on physical devices are not verified.'] }, null, 2));
  console.log('PASS: React Bits pointer/keyboard/reduced-motion behavior, native destinations, ten case studies, library controls and five viewport screenshots.');
} catch (error) {
  for (const context of browser?.contexts() ?? []) for (const page of context.pages()) {
    await page.screenshot({ path: `${output}/${current}-failure.png` }).catch(() => {});
  }
  await writeFile(`${output}/report.json`, JSON.stringify({ status: 'failed', current, results, error: error.stack }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await server?.close();
}
