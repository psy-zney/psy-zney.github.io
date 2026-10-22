import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = process.env.CV_OUTPUT || 'artifacts/cv-update';
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5184, strictPort: true, hmr: false } });
const report = [];
let browser;
const tracks = {
  backend: ['Backend', 'Backend Developer', 'Le_Quang_Khanh_CV_Backend_Developer'],
  fullstack: ['Full Stack', 'Full Stack Developer', 'Le_Quang_Khanh_CV_Full_Stack_Developer'],
  software: ['Software Engineer', 'Software Engineer', 'Le_Quang_Khanh_CV_Software_Engineer'],
};
try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
  for (const [name, width, height, reducedMotion] of [
    ['desktop', 1440, 900, 'no-preference'], ['tablet', 762, 715, 'no-preference'],
    ['phone', 390, 844, 'no-preference'], ['landscape', 844, 390, 'no-preference'], ['reduced', 1440, 900, 'reduce'],
  ]) {
    if(process.env.CV_SCOPE==='workspace')break;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/cv/backend');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const article = page.locator('.resume-page');
    for (const [track, [label, role, filename]] of Object.entries(tracks)) {
      await article.getByRole('navigation', { name: 'Resume track' }).getByRole('link', { name: label, exact: true }).click();
      const frame = article.frameLocator('iframe');
      await frame.locator('.cv-role').filter({ hasText: role }).waitFor();
      const print = article.getByRole('button', { name: 'Print / Save PDF' });
      await print.waitFor();
      await page.waitForFunction(() => document.querySelector('.resume-paper')?.getAttribute('aria-busy') === 'false');
      assert.equal(await article.getByRole('navigation', { name: 'Resume track' }).getByRole('link').count(), 3);
      assert.equal(await frame.locator('h1').innerText(), 'LE QUANG KHANH');
      assert.equal(await article.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)', 'The CV workspace, including its controls, has a white background');
      assert.equal(await frame.locator('h2').count(), 4);
      assert.equal(await frame.locator('li').count(), 6);
      assert.equal(await frame.locator('.cv-project').count(), 3);
      const style = await frame.locator('body').evaluate(element => ({
        font: getComputedStyle(element).fontFamily, background: getComputedStyle(element).backgroundColor,
        color: getComputedStyle(element).color, overflow: element.scrollWidth > innerWidth + 1,
      }));
      assert(style.font.includes('Times New Roman') && style.background === 'rgb(255, 255, 255)' && style.color === 'rgb(0, 0, 0)', 'CV keeps the source PDF typography, paper and ink');
      assert(!style.overflow, `${name}: document reflows or fits without horizontal overflow`);
      const more=article.getByLabel('More CV actions');
      const printBox=await print.boundingBox(),moreBox=await more.boundingBox();
      assert(Math.abs(printBox.y-moreBox.y)<3&&moreBox.x>=printBox.x+printBox.width-1,'Print and More share one compact toolbar row');
      assert.equal(await article.getByRole('link',{name:'Download HTML'}).count(),0,'Secondary downloads start inside the collapsed menu');
      await more.click();
      const original = article.getByRole('link', { name: 'Download original' });
      assert((await original.getAttribute('href')).endsWith(track === 'software' ? '.pdf' : '.docx'));
      assert.equal(await article.getByRole('link', { name: 'Download HTML' }).getAttribute('href'), `./file/${filename}.html`);
      await more.click();
      await article.locator('iframe').evaluate(element => { element.contentWindow.print = () => { element.dataset.printed = 'true'; }; });
      await print.click();
      assert.equal(await article.locator('iframe').getAttribute('data-printed'), 'true', 'Print targets the CV document rather than the surrounding app');
      await page.screenshot({ path: `${output}/${name}-${track}.png`, fullPage: true });
    }
    const contents = article.getByRole('button', { name: 'Contents', exact: true });
    if (await contents.isVisible()) await contents.click();
    await article.getByRole('button', { name: 'SKILLS', exact: true }).click();
    await page.waitForTimeout(100);
    assert(await article.frameLocator('iframe').locator('#resume-skills').isVisible());
    // Escape must also work when keyboard focus is inside the HTML document.
    await article.frameLocator('iframe').locator('h1').focus();
    await page.keyboard.press('Escape');
    await article.waitFor({ state: 'detached' });
    // Old saved routes remain useful after the retired source files are removed.
    await page.goto(base + '#/cv/mobile');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    await page.frameLocator('.resume-document iframe').locator('.cv-role').filter({ hasText: 'Software Engineer' }).waitFor();
    assert.equal(await page.locator('[aria-label="Resume track"] [aria-current]').innerText(), 'Software Engineer');
    assert.deepEqual(errors, []);
    report.push({ name, status: 'passed' });
    await context.close();
    console.log(`PASS: ${name} three HTML CVs, isolated layout, downloads, print target, contents, Escape and legacy route.`);
  }
  const context = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await context.newPage();
  for (const [track, [, , filename]] of Object.entries(tracks)) {
    await page.goto(`${base}file/${filename}.html`);
    await page.screenshot({ path: `${output}/html-${track}.png`, fullPage: true });
    await page.pdf({ path: `${output}/print-${track}.pdf`, preferCSSPageSize: true, printBackground: true });
  }
  await page.route('**/file/Le_Quang_Khanh_CV_Backend_Developer.html', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto(base + '#/cv/backend');
  await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
  await page.getByRole('alert').filter({ hasText: 'could not be loaded' }).waitFor();
  await page.unroute('**/file/Le_Quang_Khanh_CV_Backend_Developer.html');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.frameLocator('.resume-document iframe').locator('.cv-role').filter({ hasText: 'Backend Developer' }).waitFor();
  // Workspace uses the same document and lists only the three current CVs.
  await page.goto(base + '#/workspace/os/documents');
  await page.locator('.os-document-list').waitFor();
  assert.equal(await page.locator('.os-document-list a[href*="/resume/"]').count(), 3);
  for(const [track,label] of [['backend','Backend'],['fullstack','Full Stack'],['software','Software Engineer'],['web','Full Stack'],['game','Full Stack'],['mobile','Software Engineer']]){
    await page.goto(base+'#/workspace/os/documents/resume/'+track,{waitUntil:'domcontentloaded'});
    await page.frameLocator('.resume-document iframe').locator('.cv-role').waitFor();
    await page.locator('.os-nav a[href="#/workspace/os/home"]').click();
    await page.locator('.os-recent a').waitFor();assert.equal(await page.locator('.os-recent a').innerText(),label+' resume →','Recent document identifies the actual CV, including saved aliases');
    await page.locator('.os-recent a').click();await page.frameLocator('.resume-document iframe').locator('.cv-role').waitFor();assert(page.url().endsWith('/'+track));
  }
  await context.close();
  report.push({ name: 'print-files-error-recovery-workspace', status: 'passed' });
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  await server.close();
}
