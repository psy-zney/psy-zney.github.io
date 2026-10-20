import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output=process.env.INTRO_OUTPUT||'artifacts/universe-intro';
await mkdir(output,{recursive:true});
const selected=process.env.INTRO_VIEWPORT?.split(',');
const server=process.argv[2]?null:await createServer({server:{host:'127.0.0.1',port:5182,strictPort:true,hmr:false}});
let browser;const results=[];
try {
  if(server)await server.listen();
  const base=(process.argv[2]||server.resolvedUrls.local[0]).split('#')[0];
  browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});
  for(const [name,width,height,reducedMotion] of [['desktop',1440,900,'no-preference'],['tablet',762,715,'no-preference'],['phone',390,844,'no-preference'],['landscape',844,390,'no-preference'],['reduced',1440,900,'reduce']]) {
    if(selected&&!selected.includes(name))continue;
    const context=await browser.newContext({viewport:{width,height},reducedMotion});
    if(process.env.INTRO_LEGACY_AUDIO==='1')await context.addInitScript(()=>{
      delete AudioParam.prototype.cancelAndHoldAtTime;
      localStorage.setItem('portfolio-sound','on');
    });
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'#/cosmos');
    await page.locator('[data-page-loader]').waitFor({state:'detached'});
    const intro=page.locator('.universe-intro');await intro.waitFor();
    await page.waitForFunction(()=>!!document.querySelector('.universe-intro')?.dataset.progress);
    assert.equal(Number(await intro.getAttribute('data-progress')),0);
    await page.waitForFunction(()=>document.querySelector('.virgo-page')?.dataset.universeSky==='main.glb');
    await page.waitForFunction(()=>document.querySelector('.universe-identity h1')?.textContent==='Lê Quang Khánh');
    const start=intro.getByRole('button',{name:'Start',exact:true});await start.waitFor();
    assert.equal(await intro.locator('video').count(),0,'An unavailable original never falls back to a screen recording');
    const heading=await intro.locator('h1').boundingBox();
    assert(heading.x>=0&&heading.x+heading.width<=width,'The identity fits every viewport');
    await page.mouse.wheel(0,240);await page.waitForTimeout(400);
    assert.equal(Number(await intro.getAttribute('data-progress')),0,'The page never advances without input');
    assert.equal(await intro.locator('canvas').count(),1,'One WebGL canvas draws the original sky');
    await page.screenshot({path:`${output}/${name}-universe.png`});
    // A full pointer turn changes the sky, never the intro scroll coordinate.
    const beforeYaw=Number(await intro.getAttribute('data-yaw'));
    const beforePitch=Number(await intro.getAttribute('data-pitch'));
    assert.equal(beforeYaw,0.53979,'Intro starts at the pinned dark-sky view');
    assert.equal(beforePitch,-.01338);
    for(let turn=0;turn<2;turn++) {
      await page.mouse.move(width*.75,height*.12);await page.mouse.down();
      await page.mouse.move(width*.25,height*.12,{steps:12});await page.mouse.up();
    }
    await page.waitForTimeout(80);
    assert(Math.abs(Number(await intro.getAttribute('data-yaw'))-beforeYaw-Math.PI*2)<.001,'Dragging supports a full 360-degree turn');
    assert.equal(Number(await intro.getAttribute('data-progress')),0,'Orbit gestures cannot enter the tunnel');
    await page.keyboard.press('Home');await page.waitForTimeout(80);
    assert.equal(Number(await intro.getAttribute('data-yaw')),beforeYaw,'Home restores the pinned sky orientation');
    assert.equal(Number(await intro.getAttribute('data-pitch')),beforePitch);
    await page.mouse.move(width/2,height/2);
    await start.click();
    if(reducedMotion!=='reduce') {
      await page.waitForFunction(()=>document.querySelector('.universe-intro')?.dataset.entering==='true');
      await page.keyboard.press('Escape');
      assert.equal(await start.evaluate(el=>el===document.activeElement),true,'Escape cancels entry and restores Start focus');
      assert.equal(await intro.getAttribute('data-entering'),null);
      await start.click();
      await page.waitForFunction(()=>Number(document.querySelector('.universe-intro')?.style.getPropertyValue('--universe-entry'))>.15);
      const opacity=await intro.evaluate(el=>Number(getComputedStyle(el).opacity));
      assert(opacity>0&&opacity<1,'Start visibly crossfades the original universe into Home');
      await page.screenshot({path:`${output}/${name}-entry.png`});
    }
    await intro.waitFor({state:'detached'});
    await page.waitForURL('**/#/home');
    await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6-1.92)<.001);
    await page.screenshot({path:`${output}/${name}-home.png`});
    await page.mouse.wheel(0,-120);await intro.waitFor();
    if(reducedMotion!=='reduce')for(let i=0;i<10&&await page.evaluate(()=>location.hash)!=='#/cosmos';i++){await page.mouse.wheel(0,-280);await page.waitForTimeout(650);}
    await page.waitForURL('**/#/cosmos');
    assert.equal(Number(await intro.getAttribute('data-progress')),0,'Reverse returns all the way to the universe');
    await page.evaluate(()=>{location.hash='#/skills';});await intro.waitFor({state:'detached'});
    await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>location.hash),'#/skills','Unmounted intro cannot steal a later route');
    assert.deepEqual(errors,[]);results.push({name,status:'passed'});await context.close();
  }
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify(results,null,2));await browser?.close();await server?.close();
}
