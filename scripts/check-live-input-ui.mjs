import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
const output='artifacts/live-input';await mkdir(output,{recursive:true});
const server=await createServer({cacheDir:'node_modules/.vite-live-input',server:{host:'127.0.0.1',port:5187,strictPort:true,hmr:false}});
let browser;const checks=[];let loadingVisualVerified=false;
try{
  await server.listen();browser=await chromium.launch({headless:true,...(process.env.UI_CHROME_PATH?{executablePath:process.env.UI_CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:Number(process.env.UI_LIVE_WIDTH)||1440,height:Number(process.env.UI_LIVE_HEIGHT)||900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let holdFirst=true,releaseFirst,firstRequested;
  const heldFrame=new Promise(resolve=>{releaseFirst=resolve;});
  const firstFrameRequested=new Promise(resolve=>{firstRequested=resolve;});
  await page.addInitScript(()=>{window.parentEvents=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,event=>window.parentEvents.push({type,tag:event.target.tagName,x:event.clientX,y:event.clientY}),true);});
  await page.route(/^https:\/\/(?:[^/]+\.)?zney295\.id\.vn(?:\/|$)/,async route=>{
    if(holdFirst&&route.request().frame().parentFrame()){
      const owner=await route.request().frame().frameElement();
      if(await owner.evaluate(el=>!!el.closest('.screening-live'))){holdFirst=false;firstRequested();await heldFrame;}
    }
    return route.fulfill({contentType:'text/html',body:'<style>body{min-height:1800px;padding:24px;font:18px sans-serif}button,input{min-height:44px}</style><button onclick="this.textContent=String(++window.clicks)">0</button><input aria-label="Live input"><script>window.clicks=0;window.events=[];for(const type of ["pointerdown","pointerup","click"])document.addEventListener(type,e=>window.events.push({type,tag:e.target.tagName,x:e.clientX,y:e.clientY}),true)<\/script>'});
  });
  await page.goto(server.resolvedUrls.local[0]+'#/showcase/beatsync');
  await page.locator('[data-page-loader]').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Enter world',exact:true}).click();
  const gallery=page.locator('dialog.screening-room');await gallery.waitFor();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.screening-room')).opacity==='1');
  for(const kind of ['Apps & tools','Web experiences']){
    await gallery.getByRole('button',{name:kind,exact:true}).click();
    const dots=gallery.locator('.screening-dot');
    for(let index=0;index<await dots.count();index++){
      const label=await dots.nth(index).getAttribute('aria-label');
      await dots.nth(index).click();
      await page.waitForFunction(label=>Array.from(document.querySelectorAll('.screening-dot')).some(el=>el.getAttribute('aria-label')===label&&el.classList.contains('is-active')),label);
      assert((await dots.nth(index).getAttribute('class')).includes('is-active'),'Every product control remains clickable');
    }
  }
  await gallery.getByRole('button',{name:'BeatSync',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.screening-title')?.textContent==='BeatSync'&&Number(document.querySelector('.screening-room')?.style.getPropertyValue('--screen-focus'))>.999);
  await page.screenshot({path:`${output}/gallery-controls.png`});
  const footerControls=await page.evaluate(()=>{
    const boxes=selector=>Array.from(document.querySelectorAll(selector)).map(el=>({label:el.textContent.trim()||el.getAttribute('aria-label'),...el.getBoundingClientRect().toJSON()}));
    return {actions:boxes('.screening-actions-row a,.screening-actions-row button'),reading:boxes('.screening-reading-links a,.screening-reading-links button')};
  });
  await writeFile(`${output}/footer-controls.json`,JSON.stringify(footerControls,null,2));
  for(const a of footerControls.actions)for(const b of footerControls.reading)
    assert(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,`${a.label} and ${b.label} must not cover each other`);
  for(let pass=0;pass<20;pass++){
    await gallery.getByRole('button',{name:'Try it live',exact:true}).click();
    const live=page.locator('.screening-live[open]'),iframe=live.locator('iframe');await live.waitFor();
    if(pass===0){
      await Promise.race([firstFrameRequested,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Native live frame did not request its document')),5000))]);
      assert.equal(await live.locator('.screening-live-viewport').getAttribute('aria-busy'),'true');
      await live.getByRole('status').waitFor();await page.screenshot({path:`${output}/loading.png`});
      loadingVisualVerified=true;releaseFirst();
    }
    await live.locator('.screening-live-native[data-ready=true]').waitFor();
    const frame=live.frameLocator('iframe'),button=frame.getByRole('button');await button.waitFor();
    await button.click();
    const native=await(await iframe.elementHandle()).contentFrame();
    const outer=await iframe.boundingBox(),inner=await button.evaluate(el=>el.getBoundingClientRect().toJSON()),reported=await button.boundingBox();
    const expected={x:outer.x+inner.x+inner.width/2,y:outer.y+inner.y+inner.height/2};
    try{await frame.getByRole('button',{name:'1',exact:true}).waitFor({timeout:3000});}
    catch(error){
      const before={events:await native.evaluate(()=>window.events),parentEvents:await page.evaluate(()=>window.parentEvents),parentHit:await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.outerHTML.slice(0,300),expected)};
      await page.screenshot({path:`${output}/failure.png`});
      // Independent diagnostic click; this never changes the failed result.
      await page.mouse.click(expected.x,expected.y);
      let manualClickDelivered=false;try{await frame.getByRole('button',{name:'1',exact:true}).waitFor({timeout:1000});manualClickDelivered=true;}catch{}
      await writeFile(`${output}/failure.json`,JSON.stringify({pass,outer,inner,reported,expected,before,manualClickDelivered,afterEvents:await native.evaluate(()=>window.events)},null,2));
      throw error;
    }
    await frame.getByRole('textbox').fill('Native input');assert.equal(await frame.getByRole('textbox').inputValue(),'Native input');
    if(pass===0)await page.screenshot({path:`${output}/ready.png`});
    await live.getByRole('button',{name:'Close live preview',exact:true}).click();await live.waitFor({state:'hidden'});
    assert(await gallery.getByRole('button',{name:'Try it live',exact:true}).evaluate(el=>el===document.activeElement),'Restore focus after closing');
    assert.equal(await live.locator('iframe').count(),0,'Closing removes the browsing context');
    checks.push({pass:pass+1,outer,reported,expected});console.log(`PASS live input ${pass+1}/20`);
  }
  assert.deepEqual(errors,[],'No runtime errors while mounting and disposing live frames');
}finally{await writeFile(`${output}/report.json`,JSON.stringify({passed:checks.length===20,loadingVisualVerified,checks},null,2));await browser?.close();await server.close();}
