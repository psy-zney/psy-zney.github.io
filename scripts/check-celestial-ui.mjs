import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:5173/';
const output = 'artifacts/celestial-upgrade';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
try {
  for (const [name, width, height, reducedMotion] of [
    ['desktop',1440,900,'no-preference'], ['phone',390,844,'no-preference'], ['reduced',1440,900,'reduce'],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = [], assets = [];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/Shader Error|THREE.WebGLProgram/.test(message.text()))errors.push(message.text());});
    page.on('response',response=>{if(response.url().includes('/img/celestial/'))assets.push({url:response.url(),status:response.status()});});
    await page.goto(`${base}#/home`);
    await page.locator('[data-page-loader]').waitFor({ state:'detached' });
    await page.waitForFunction(()=>document.querySelector('.virgo-page')?.dataset.cameraPose);
    const seek = async position => {
      await page.evaluate(position=>{
        const root=document.querySelector('.virgo-page'),offsets=[...document.querySelector('.virgo-scroll-content').children].map(el=>el.offsetTop);
        const i=Math.min(5,Math.floor(position));root.dataset.introArrival=String(position);
        document.querySelector('.virgo-scroll').scrollTop=offsets[i]+(offsets[i+1]-offsets[i])*(position-i);
      },position);
      await page.waitForFunction(position=>Math.abs(Number(document.querySelector('.virgo-page').style.getPropertyValue('--flight-progress'))*6-position)<.003,position);
    };
    const sample=()=>page.locator('.virgo-page').evaluate(root=>({ time:Number(root.dataset.ambientTime),pose:root.dataset.cameraPose,orbit:root.dataset.orbitTimes }));
    await seek(3.23);
    await page.waitForTimeout(800);
    const before=await sample();
    await page.waitForTimeout(1500);
    const after=await sample();
    assert.equal(before.pose,after.pose,'Without scroll, ambient animation cannot move the camera');
    if(reducedMotion==='reduce')assert.equal(after.time,0,'Reduced motion stops the ambient clock');
    else assert(after.time>before.time+.2,'Celestial motion continues while input rests');
    assert(assets.some(asset=>asset.url.includes(`earth-${name==='phone'?1024:2048}.webp`)&&asset.status===200),'The local observed texture is actually requested successfully');
    assert(assets.every(asset=>asset.status===200),'Optional texture requests succeed');
    await page.screenshot({path:`${output}/${name}-projects.png`});
    await seek(4.96);
    await page.screenshot({path:`${output}/${name}-skills.png`});
    await page.goto(`${base}#/project/study-cabin`);
    await page.locator('dialog.virgo-dialog[open]').waitFor();
    await page.waitForFunction(()=>document.querySelector('.virgo-page')?.dataset.flightPaused==='true');
    const paused=await sample();
    await page.waitForTimeout(600);
    assert.equal((await sample()).time,paused.time,'Reading a case study pauses background work');
    assert.deepEqual(errors,[],'No runtime or shader errors');
    results.push({name,status:'passed',assets:assets.length,before,after});
    await page.close();
  }
  // Missing optional textures must recover through the generated maps, not a scene error.
  const fallback=await browser.newPage();
  await fallback.route('**/img/celestial/**',route=>route.abort());
  await fallback.goto(`${base}#/projects`);
  await fallback.locator('[data-page-loader]').waitFor({state:'detached'});
  await fallback.waitForFunction(()=>Number(document.querySelector('.virgo-page')?.dataset.ambientTime)>.2);
  assert.equal(await fallback.locator('.virgo-scene-recovery').count(),0,'Texture failure keeps the 3D scene usable');
  await fallback.screenshot({path:`${output}/texture-fallback.png`});
  results.push({name:'texture-fallback',status:'passed'});
  await writeFile(`${output}/report.json`,JSON.stringify({status:'passed',results},null,2));
} catch(error) {
  await writeFile(`${output}/report.json`,JSON.stringify({status:'failed',results,error:String(error)},null,2));
  throw error;
} finally { await browser.close(); }
