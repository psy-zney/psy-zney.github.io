import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = process.env.MOTION_OUTPUT || 'artifacts/showcase-motion';
await mkdir(output, { recursive: true });
const server = process.env.MOTION_URL ? null : await createServer({ server: { host: '127.0.0.1', port: 5187, strictPort: true } });
await server?.listen();
const url = process.env.MOTION_URL || 'http://127.0.0.1:5187';
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
const x = page => page.locator('.worlds-track').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
const settle = (page, index) => page.waitForFunction(index => {
  const el = document.querySelector('.worlds-track');
  return el && Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41 + index * el.clientWidth) < .2;
}, index);
// Sample in the next browser frame, independent of automation round-trip latency.
const release = async page => {
  await page.evaluate(() => {
    window.__railRelease = new Promise(resolve => document.addEventListener('pointerup', () => {
      const el=document.querySelector('.worlds-track');
      const read=()=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
      const before=read(); requestAnimationFrame(()=>resolve({before,after:read()}));
    }, {capture:true,once:true}));
  });
  await page.mouse.up();
  return page.evaluate(()=>window.__railRelease);
};
let page;
try {
  for (const [name, width, height, reducedMotion] of [['desktop',1440,900,'no-preference'],['tablet',762,715,'no-preference'],['phone',390,844,'no-preference'],['landscape',844,390,'no-preference'],['reduced',1440,900,'reduce']]) {
    if (process.env.UI_SCENARIOS && !process.env.UI_SCENARIOS.split(',').includes(name)) continue;
    page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}/#/showcase/security`);
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const worlds = page.locator('.worlds-showcase');
    await worlds.waitFor(); await settle(page,7);
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.worlds-stage')).opacity) > .999);
    await worlds.focus();
    await worlds.press('ArrowLeft');
    await page.waitForURL('**/#/showcase/sentinel');
    const frames = await page.evaluate(() => new Promise(resolve => {
      const samples=[], start=performance.now(), track=document.querySelector('.worlds-track');
      const tick=now=>{ samples.push({t:now-start,x:new DOMMatrixReadOnly(getComputedStyle(track).transform).m41}); if(now-start<1000)requestAnimationFrame(tick);else resolve(samples); };
      requestAnimationFrame(tick);
    }));
    assert(frames.every(frame=>Number.isFinite(frame.x)),'Every frame has a valid position');
    if (reducedMotion==='reduce') assert(frames.every(frame=>Math.abs(frame.x+6*width)<.2),'Reduced motion selects immediately');
    else {
      assert(frames.some(frame=>frame.x>-7*width+2&&frame.x<-6*width-2),'Navigation renders intermediate frames');
      assert(frames.every((frame,i)=>!i||frame.x>=frames[i-1].x-.5),'The rail decelerates without reversing or bouncing');
    }
    await settle(page,6);
    await page.screenshot({path:`${output}/${name}-settled.png`});

    // Hold before release so this checks position continuity independently of flick speed.
    const y=height*.45, start=width*.65, delta=Math.max(70,width*.18), base=await x(page);
    await page.mouse.move(start,y); await page.mouse.down(); await page.mouse.move(start-delta,y,{steps:8});
    await page.waitForTimeout(140);
    const held=await x(page);
    if(reducedMotion!=='reduce') assert(base-held>delta*.6&&base-held<=delta+2,'The slide follows the hand with bounded resistance');
    const releasedFrame=await release(page), released=releasedFrame.after;
    if(reducedMotion!=='reduce') assert(released<=releasedFrame.before+2&&releasedFrame.before-released<width*.1,`Release continues from the held position without snapping back: ${JSON.stringify(releasedFrame)}`);
    await page.waitForURL('**/#/showcase/security'); await settle(page,7);
    assert.equal(await page.locator('dialog.screening-room[open]').count(),0,'Releasing a drag does not open a project');

    // A small, slow drag returns continuously to the current world.
    await page.mouse.move(start,y); await page.mouse.down(); await page.mouse.move(start+24,y,{steps:4});
    await page.waitForTimeout(140); const partial=await x(page);
    const returnFrame=await release(page), returning=returnFrame.after;
    if(reducedMotion!=='reduce') assert(Math.abs(returning-returnFrame.before)<12,`A cancelled selection springs back without a jump: ${JSON.stringify(returnFrame)}`);
    await settle(page,7); assert(page.url().endsWith('/security'));
    await worlds.focus(); await worlds.press('ArrowLeft'); await page.waitForTimeout(90); await worlds.press('ArrowRight');
    await page.waitForURL('**/#/showcase/security'); await settle(page,7);
    if(reducedMotion!=='reduce') {
      // Entry cancellation must also resume a slide that was still moving.
      await worlds.press('ArrowLeft'); await page.waitForTimeout(90);
      await worlds.press('Enter'); await worlds.press('Escape');
      await settle(page,6);
      await worlds.press('ArrowRight'); await settle(page,7);
    }
    await page.setViewportSize({width:width-22,height}); await settle(page,7);
    assert.equal(await page.locator('.worlds-slide[inert]').count(),8,'Only the selected slide is interactive');
    await page.setViewportSize({width,height}); await settle(page,7);

    if(reducedMotion!=='reduce') {
      await worlds.focus(); await worlds.press('Enter'); await page.waitForTimeout(360);
      const fade=await page.locator('.worlds-stage').evaluate(el=>Number(getComputedStyle(el).opacity));
      assert(fade>0&&fade<1,'Entering a project fades through intermediate opacity');
      await worlds.press('Escape');
      await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.worlds-stage')).opacity)>.999);
      assert.equal(await page.locator('dialog.screening-room[open]').count(),0,'Escape cancels the entry');
    }
    await worlds.getByRole('button',{name:'Enter world',exact:true}).click();
    await page.locator('dialog.screening-room[open]').waitFor();
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('dialog.screening-room')).opacity)>.999);
    await page.locator('.screening-close').click(); await worlds.waitFor(); await settle(page,7);
    assert(page.url().endsWith('/security'),'Closing returns to the selected world');
    assert.deepEqual(errors,[],`${name}: no runtime errors`);
    results.push({name,passed:true,frames,held,released,partial,returning});
    console.log(`PASS: ${name}: intermediate frames, continuous release, interruption, resize, reduced motion and entry/return.`);
    await page.close();
  }
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,results},null,2));
} catch(error) {
  if(page&&!page.isClosed())await page.screenshot({path:`${output}/failure.png`});
  await writeFile(`${output}/report.json`,JSON.stringify({passed:false,error:String(error),results},null,2)); throw error;
} finally { await browser.close(); await server?.close(); }
