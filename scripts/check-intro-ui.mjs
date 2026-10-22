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
    await page.clock.install();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'#/cosmos');
    await page.locator('[data-page-loader]').waitFor({state:'detached'});
    const intro=page.locator('.universe-intro');await intro.waitFor();
    await page.waitForFunction(()=>!!document.querySelector('.universe-intro')?.dataset.progress);
    assert.equal(Number(await intro.getAttribute('data-progress')),0);
    await page.waitForFunction(()=>document.querySelector('.virgo-page')?.dataset.universeSky==='main.glb');
    await page.waitForFunction(()=>document.querySelector('.universe-identity h1')?.textContent==='Lê Quang Khánh');
    await page.waitForFunction(()=>{
      const tagline=document.querySelector('.universe-tagline');
      return tagline?.textContent===tagline?.getAttribute('aria-label');
    });
    const start=intro.getByRole('button',{name:'Start',exact:true});await start.waitFor();
    assert.equal(await intro.locator('video').count(),0,'An unavailable original never falls back to a screen recording');
    const heading=await intro.locator('h1').boundingBox();
    assert(heading.x>=0&&heading.x+heading.width<=width,'The identity fits every viewport');
    assert.equal(await intro.locator('.universe-name h1').count(),1,'Greeting and identity share a group');
    assert.equal(await intro.locator('.universe-invitation .universe-start').count(),1,'Start stays with its invitation');
    const invitation=await intro.locator('.universe-invitation').boundingBox();
    assert(invitation.y>=heading.y+heading.height&&invitation.y+invitation.height<=height-12,'The invitation follows the name and stays on screen');
    await page.mouse.wheel(0,240);await page.waitForTimeout(400);
    assert.equal(Number(await intro.getAttribute('data-progress')),0,'The page never advances without input');
    assert.equal(await intro.locator('.main-universe-backdrop canvas').count(),1,'The original sky remains mounted');
    assert.equal(await intro.locator('.universe-galaxy-backdrop .galaxy-canvas').count(),1,'Galaxy fills the intro behind the identity');
    const galaxy = await intro.locator('.galaxy-canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const program = gl?.getParameter(gl.CURRENT_PROGRAM);
      return {
        ready: !!program && gl.getProgramParameter(program, gl.LINK_STATUS),
        density: program && gl.getUniform(program, gl.getUniformLocation(program, 'uDensity')),
        flare: program && gl.getUniform(program, gl.getUniformLocation(program, 'uFlareGain')),
        width: canvas.width, height: canvas.height,
      };
    });
    assert(galaxy.ready && galaxy.width >= width && galaxy.height >= height,`Galaxy compiles and covers the viewport: ${JSON.stringify(galaxy)}`);
    assert.equal(galaxy.density,1);
    assert(Math.abs(galaxy.flare-.3)<.0001,'Galaxy uses the requested glow and flare');
    await page.screenshot({path:`${output}/${name}-universe.png`});
    // A full pointer turn changes the sky, never the intro scroll coordinate.
    const beforeYaw=Number(await intro.getAttribute('data-yaw'));
    const beforePitch=Number(await intro.getAttribute('data-pitch'));
    assert.equal(beforeYaw,0.53979,'Intro starts at the pinned dark-sky view');
    assert.equal(beforePitch,-.01338);
    await page.mouse.move(width*.9,height*.25);
    if(reducedMotion==='reduce'){
      await page.waitForTimeout(250);
      assert.equal(Number(await intro.getAttribute('data-hover-yaw')),0,'Reduced motion disables mouse parallax');
    }else{
      await page.waitForFunction(()=>Number(document.querySelector('.universe-intro').dataset.hoverYaw)<-.015);
      const offset=Number(await intro.getAttribute('data-hover-yaw'));
      assert(Math.abs(offset)<=.045,'Mouse movement stays within a subtle bounded angle');
      assert.equal(Number(await intro.getAttribute('data-yaw')),beforeYaw,'Hover never overwrites the pinned orientation');
      await page.screenshot({path:`${output}/${name}-mouse-parallax.png`});
    }
    await page.mouse.move(-10,-10);
    await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.universe-intro').dataset.hoverYaw))<.0002);
    for(let turn=0;turn<2;turn++) {
      await page.mouse.move(width*.75,height*.12);await page.mouse.down();
      await page.mouse.move(width*.25,height*.12,{steps:12});
      await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.universe-intro').dataset.yaw)-Number(document.querySelector('.universe-intro').dataset.targetYaw))<.00001);
      await page.waitForTimeout(120);await page.mouse.up();
    }
    await page.waitForTimeout(80);
    assert(Math.abs(Number(await intro.getAttribute('data-yaw'))-beforeYaw-Math.PI*2)<.001,'Dragging supports a full 360-degree turn');
    assert.equal(Number(await intro.getAttribute('data-progress')),0,'Orbit gestures cannot enter the tunnel');
    await page.keyboard.press('Home');
    await page.waitForFunction(yaw=>Number(document.querySelector('.universe-intro').dataset.yaw)===yaw,beforeYaw);
    assert.equal(Number(await intro.getAttribute('data-yaw')),beforeYaw,'Home restores the pinned sky orientation');
    assert.equal(Number(await intro.getAttribute('data-pitch')),beforePitch);
    // A quick release glides only a short distance, while cancel freezes the visible pose.
    await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
    await page.mouse.move(width*.7,height*.12);await page.mouse.down();
    await page.clock.runFor(16);await page.mouse.move(width*.6,height*.12);
    await page.clock.runFor(16);
    const targetBeforeRelease=Number(await intro.getAttribute('data-target-yaw'));
    await page.mouse.up();await page.clock.runFor(16);
    const targetAfterRelease=Number(await intro.getAttribute('data-target-yaw'));
    if(reducedMotion==='reduce')assert.equal(targetAfterRelease,targetBeforeRelease,'Reduced motion has no release inertia');
    else assert(targetAfterRelease>targetBeforeRelease&&targetAfterRelease-targetBeforeRelease<=.16001,'A flick adds a short bounded glide');
    await page.clock.runFor(800);
    assert(Math.abs(Number(await intro.getAttribute('data-yaw'))-targetAfterRelease)<.00001,'The sky comes to rest after release');
    await page.mouse.down();await page.mouse.move(width*.5,height*.12);await page.clock.runFor(16);
    await intro.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();await page.clock.runFor(16);
    const cancelled=Number(await intro.getAttribute('data-yaw'));
    await page.clock.runFor(400);
    assert.equal(Number(await intro.getAttribute('data-yaw')),cancelled,'Cancellation does not replay pending drag input');
    assert.equal(await intro.getAttribute('data-dragging'),null,'Capture is cleared after cancellation');
    await page.keyboard.press('Home');await page.clock.runFor(32);await page.clock.resume();
    await page.mouse.move(width/2,height/2);
    await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
    await start.click();
    if(reducedMotion!=='reduce') {
      await page.waitForFunction(()=>document.querySelector('.universe-intro')?.dataset.entering==='true');
      await page.keyboard.press('Escape');
      assert.equal(await start.evaluate(el=>el===document.activeElement),true,'Escape cancels entry and restores Start focus');
      assert.equal(await intro.getAttribute('data-entering'),null);
      await start.click();
      await page.clock.runFor(680);
      const entry=await intro.evaluate(el=>({
        scale:new DOMMatrix(getComputedStyle(el.querySelector('.main-universe-backdrop')).transform).a,
        galaxyScale:new DOMMatrix(getComputedStyle(el.querySelector('.universe-galaxy-backdrop')).transform).a,
        light:Number(getComputedStyle(el.querySelector('.universe-entry-light')).opacity),
        identity:Number(getComputedStyle(el.querySelector('.universe-identity')).opacity),
      }));
      assert(entry.scale>1.2&&entry.light>.1,'Start visibly advances the original sky with a light pulse');
      assert.equal(entry.galaxyScale,entry.scale,'Galaxy follows the existing Start transition');
      assert(entry.identity<.1,'The introduction clears before the spatial transition');
      await page.screenshot({path:`${output}/${name}-entry-advance.png`});
      await page.clock.runFor(480);
      const opacity=await intro.evaluate(el=>Number(getComputedStyle(el).opacity));
      assert(opacity>0&&opacity<1,'Start visibly crossfades the original universe into Home');
      await page.screenshot({path:`${output}/${name}-entry.png`});
      await page.clock.runFor(600);await page.clock.resume();
    }
    else {
      // Reduced motion still acknowledges Start, without zoom or a light pulse.
      await page.clock.runFor(80);
      await intro.waitFor({state:'visible'});
      const opacity=await intro.evaluate(el=>Number(getComputedStyle(el).opacity));
      assert(opacity>0&&opacity<1,'Reduced motion keeps a brief fade after Start');
      assert.equal(await intro.locator('.main-universe-backdrop').evaluate(el=>getComputedStyle(el).transform),'none');
      assert.equal(await intro.locator('.universe-entry-light').evaluate(el=>getComputedStyle(el).display),'none');
      await page.clock.runFor(300);await page.clock.resume();
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
    {
      await page.goto(base+'#/story');await page.reload();
      await page.locator('[data-page-loader]').waitFor({state:'detached'});
      const about=page.locator('.journey-station-card.has-overview:visible');
      await about.locator('.portfolio-introduction').waitFor({state:'visible'});
      assert.equal(await about.getByRole('heading',{name:'Lê Quang Khánh',exact:true}).count(),1);
      assert((await about.locator('.portfolio-introduction-bio').innerText()).length>100,'About presents a detailed biography after a direct reload');
      assert.equal(await about.locator('.portfolio-experience>li').count(),3,'Personal, freelance and team experience remain available');
      const box=await about.boundingBox();
      assert(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,'The profile reading surface fits the viewport');
      assert(await about.locator('.journey-station-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'The profile has no horizontal overflow');
      await page.screenshot({path:`${output}/${name}-about.png`});
    }
    assert.deepEqual(errors,[]);results.push({name,status:'passed'});await context.close();
  }
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify(results,null,2));await browser?.close();await server?.close();
}
