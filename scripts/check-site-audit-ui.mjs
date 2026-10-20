import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output='artifacts/site-audit';
await mkdir(output,{recursive:true});
const fingerprint=async()=>{
  const paths=['package.json','pnpm-lock.yaml','scripts/check-site-audit-ui.mjs',...(await readdir('src',{recursive:true})).filter(path=>/\.(tsx?|css|json)$/.test(path)).map(path=>`src/${path.replaceAll('\\','/')}`)].sort();
  const hash=createHash('sha256');
  for(const path of paths)hash.update(path).update('\0').update(await readFile(path)).update('\0');
  return hash.digest('hex');
};
const startedAt=new Date().toISOString(),sourceSha256=await fingerprint();
const server=process.argv[2]?null:await createServer({server:{host:'127.0.0.1',port:5186,strictPort:true}});
let browser;
const report=[];
let activePage;
const writeReport=(status,error)=>writeFile(`${output}/report.json`,JSON.stringify({status,startedAt,updatedAt:new Date().toISOString(),sourceSha256,coverage:'journey + all worlds + native live iframe input',scenarios:report,limitations:['Emulation does not verify touch hardware, perceived audio quality or device FPS.','Live iframe uses a local fixture; third-party embedding depends on the destination.'],...(error?{error}: {})},null,2));
const scenarios=[
  {name:'desktop',viewport:{width:1440,height:900}},
  {name:'tablet',viewport:{width:762,height:715}},
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'compact',viewport:{width:320,height:568},isMobile:true,hasTouch:true},
  {name:'landscape',viewport:{width:844,height:390},isMobile:true,hasTouch:true},
  {name:'reduced',viewport:{width:1440,height:900},reducedMotion:'reduce'},
].filter(s=>!process.env.UI_SCENARIOS||process.env.UI_SCENARIOS.split(',').includes(s.name));
try{
  await writeReport('running');
  if(server)await server.listen();
  const base=process.argv[2]??server.resolvedUrls.local[0];
  browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});
  for(const {name,...options} of scenarios){
    const context=await browser.newContext(options),page=await context.newPage();activePage=page;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route(/^https:\/\/(?:[^/]+\.)?zney295\.id\.vn(?:\/|$)/,route=>route.fulfill({contentType:'text/html',body:'<style>body{min-height:1800px;padding:24px;font:18px sans-serif}button,input{min-height:44px}</style><button onclick="this.textContent=String(++window.clicks)">0</button><input aria-label="Live input"><script>window.clicks=0;window.events=[];for(const type of ["pointerdown","pointerup","click"])document.addEventListener(type,e=>window.events.push({type,tag:e.target.tagName,x:e.clientX,y:e.clientY}),true)<\/script>'}));
    const capture=label=>page.screenshot({path:`${output}/${name}-${label}.png`});
    const load=async path=>{await page.goto(`${base}${path}`);await page.locator('[data-page-loader]').waitFor({state:'detached'});};
    await load('');
    const start=page.getByRole('button',{name:'Start',exact:true});
    await start.waitFor();
    const entry=await start.boundingBox();
    assert(entry.x>=0&&entry.x+entry.width<=options.viewport.width&&entry.y>=0&&entry.y+entry.height<=options.viewport.height,`${name}: Start fits`);
    await capture('intro');await start.click();
    await page.locator('.virgo-home-guide').waitFor({state:'visible'});
    const destinations=page.getByRole('button',{name:'Destinations',exact:true});
    await destinations.click();
    await page.getByRole('button',{name:'Open workspace',exact:true}).waitFor();
    await destinations.press('Escape');
    assert.equal(await destinations.getAttribute('aria-expanded'),'false','Escape closes destinations');
    await destinations.click();await page.mouse.click(8,options.viewport.height*.55);
    assert.equal(await destinations.getAttribute('aria-expanded'),'false','Outside click closes destinations');
    await capture('home');
    for(const [label,id] of [['About','virgo-about-title'],['Projects','virgo-projects-title'],['Skills','virgo-skills-title'],['Contact','virgo-contact-title']]){
      await destinations.click();await page.locator('#virgo-destinations').getByRole('link',{name:label,exact:true}).click();
      await page.waitForFunction(id=>{
        const el=document.querySelector(`[aria-labelledby="${id}"]`);
        return el&&!el.inert&&getComputedStyle(el).visibility==='visible'&&Number(getComputedStyle(el).opacity)>.49;
      },id,{timeout:30000});
      if(label==='Contact'){
        await page.waitForFunction(()=>Number(document.querySelector('.virgo-page').style.getPropertyValue('--flight-progress'))>.999);
        assert(await page.getByRole('link',{name:'lequangkhanh295@gmail.com',exact:false}).isVisible(),'Contact email is usable');
      }
      const pose=(await page.locator('.virgo-page').getAttribute('data-camera-pose')).split(',').map(Number);
      assert(Math.abs(pose[0])+Math.abs(pose[1])+Math.abs(pose[3])+Math.abs(pose[4])+Math.abs(pose[5])<.0001,'Journey camera stays straight');
      await capture(label.toLowerCase());
    }
    // The selector exposes only its own controls; global sound remains reachable.
    await load('#/showcase/beatsync');
    const worlds=page.locator('.worlds-showcase');await worlds.waitFor();
    assert.equal(await destinations.count(),0,'Background navigation is not exposed under showcase');
    assert(await page.locator('.virgo-overlay').evaluate(el=>el.inert&&el.getAttribute('aria-hidden')==='true'),'Underlying story is inert and hidden');
    const sound=page.locator('.virgo-sound-toggle');await sound.click();
    assert.equal(await sound.getAttribute('aria-pressed'),'false','Sound can be muted above the showcase');
    await sound.click();assert.equal(await sound.getAttribute('aria-pressed'),'true');
    await worlds.getByRole('button',{name:'Enter world',exact:true}).click();
    const gallery=page.locator('dialog.screening-room');await gallery.waitFor({state:'visible'});
    await gallery.getByRole('button',{name:'Try it live',exact:true}).click();
    const live=page.locator('dialog.screening-live[open]');await live.waitFor();
    assert(await live.evaluate(el=>el.parentElement===document.body),'The native modal stays outside transformed gallery ancestors');
    await live.locator('.screening-live-native[data-ready=true]').waitFor();
    assert.equal(await live.locator('[role=status]').count(),0,'Loading feedback ends only after the native frame is ready');
    const frame=live.frameLocator('iframe');
    for(let click=1;click<=3;click++){
      await frame.getByRole('button').click();
      try{
        // Cross-frame input can be delivered after the click protocol returns.
        // Await this click's DOM result, without sending a replacement click.
        await frame.getByRole('button',{name:String(click),exact:true}).waitFor({timeout:3000});
      }catch(error){
        await page.screenshot({path:`${output}/${name}-live-failure.png`});
        const nativeFrame=await(await live.locator('iframe').elementHandle()).contentFrame();
        await writeFile(`${output}/${name}-live-failure.json`,JSON.stringify({
          iframe:await live.locator('iframe').boundingBox(),
          frame:await nativeFrame.evaluate(()=>({events:window.events,clicks:window.clicks,rect:document.querySelector('button').getBoundingClientRect().toJSON()})),
        },null,2));
        throw error;
      }
      assert.equal(await frame.getByRole('button').textContent(),String(click),'Every native iframe click reaches the original DOM');
    }
    await frame.getByRole('textbox',{name:'Live input'}).fill('Native keyboard');
    assert.equal(await frame.getByRole('textbox').inputValue(),'Native keyboard');
    await frame.getByRole('button').hover();await page.mouse.wheel(0,240);
    await (await (await live.locator('iframe').elementHandle()).contentFrame()).waitForFunction(()=>document.scrollingElement.scrollTop>0);
    assert.equal(await live.locator('.screening-css3d .screening-surface').count(),1,'Keep the CSS3D viewing plane');
    await live.getByRole('button',{name:'Close live preview',exact:true}).click();
    await live.waitFor({state:'hidden'});await gallery.locator('.screening-close').click();await worlds.waitFor({state:'visible'});
    for(const id of ['mpoly','beatsync','boom','study','manager','fashion','sentinel','security','backup']){
      // Native keyboard changes exercise both bounds and every destination.
      await worlds.focus();
      if(id==='mpoly')await worlds.press('Home');else await worlds.press('ArrowRight');
      await page.waitForURL(`**/#/showcase/${id}`);
      await page.waitForFunction(()=>{
        const track=document.querySelector('.worlds-track'),matrix=new DOMMatrixReadOnly(getComputedStyle(track).transform);
        const index=Number(track.style.getPropertyValue('--world-index'));
        return Math.abs(matrix.m41+index*track.clientWidth)<1;
      });
      const fit=await page.evaluate(()=>{
        const active=document.querySelector('.worlds-slide[aria-hidden="false"]');
        const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        const panel=active.querySelector('.worlds-caption'),rim=getComputedStyle(panel,'::before');
        return{heading:rect(active.querySelector('.worlds-heading')),preview:rect(active.querySelector('.worlds-window')),caption:rect(panel),footer:rect(document.querySelector('.worlds-footer')),rimBottom:rect(panel).bottom-parseFloat(rim.bottom),contain:[...active.querySelectorAll('img')].every(img=>getComputedStyle(img).objectFit==='contain')};
      });
      assert(fit.preview.x>=-1&&fit.preview.right<=options.viewport.width+1,`${name}/${id}: authentic preview fits horizontally`);
      assert(fit.caption.x>=0&&fit.caption.right<=options.viewport.width,`${name}/${id}: text fits`);
      assert(fit.rimBottom+4<fit.footer.y,`${name}/${id}: actions/glass do not collide with navigation: ${JSON.stringify(fit)}`);
      assert(fit.contain,`${name}/${id}: preserve whole authentic preview`);
      if(options.viewport.width<600)assert(fit.heading.bottom+5<fit.preview.y&&fit.preview.bottom+5<fit.caption.y,`${name}/${id}: mobile title, preview and text do not overlap`);
    }
    assert(await worlds.getByRole('button',{name:'Next world',exact:true}).isDisabled(),'Last destination is bounded');
    await capture('worlds');
    const stageBox=await worlds.locator('.worlds-stage').boundingBox();
    await page.mouse.move(stageBox.x+8,stageBox.y+stageBox.height*.5);
    await page.mouse.wheel(180,0);await page.waitForTimeout(250);
    assert.equal(await worlds.evaluate(el=>el.scrollTop),0,'Horizontal input remains bounded at 9/9');
    await worlds.focus();await worlds.press('ArrowLeft');
    await page.waitForFunction(()=>document.querySelector('.worlds-track').style.getPropertyValue('--world-index')==='7');
    await page.mouse.wheel(0,120);
    await page.waitForURL('**/#/showcase/backup');
    await page.mouse.wheel(0,80);
    assert.equal(await worlds.evaluate(el=>el.scrollTop),0,'Momentum that selected 9/9 cannot skip the final world');
    await page.waitForTimeout(250);
    await page.mouse.wheel(0,320);
    await page.waitForFunction(()=>document.querySelector('.worlds-showcase').scrollTop>100);
    assert(page.url().endsWith('#/showcase/backup'),'Downward scrolling keeps the final world selected');
    await page.mouse.wheel(0,-900);
    await page.waitForFunction(()=>document.querySelector('.worlds-showcase').scrollTop<2);
    await page.waitForFunction(()=>document.querySelector('.contact-landing').dataset.revealed==='false');
    const hiddenForest=await page.locator('.contact-forest-walker').evaluate(el=>({state:getComputedStyle(el).animationPlayState,name:getComputedStyle(el).animationName}));
    if(name==='reduced')assert.equal(hiddenForest.name,'none','Reduced motion disables forest animation entirely');
    else assert.equal(hiddenForest.state,'paused','Forest pauses outside Contact');
    await worlds.getByRole('button',{name:'Let’s connect',exact:false}).click();
    await page.waitForFunction(()=>Math.abs(document.querySelector('.contact-landing').getBoundingClientRect().top)<2);
    await page.waitForFunction(()=>document.querySelector('.contact-landing').dataset.revealed==='true');
    const entrance=await page.locator('.contact-landing h2').evaluate(el=>getComputedStyle(el).animationName);
    assert.equal(entrance,name==='reduced'?'none':'contact-content-arrive','Contact reveals on entry and respects reduced motion');
    await capture('contact-arriving');
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.contact-landing footer')).opacity)>.99);
    const fox=page.locator('.contact-forest-walker');
    const foxBefore=await fox.boundingBox();await page.waitForTimeout(250);
    const foxAfter=await fox.boundingBox();
    if(name==='reduced')assert(Math.abs(foxAfter.x-foxBefore.x)<.1,'Reduced motion keeps the fox still');
    else assert(foxAfter.x>foxBefore.x+.2,'The fox walks across the forest while Contact is visible');
    assert.equal(await fox.evaluate(el=>getComputedStyle(el).pointerEvents),'none','Forest animation never blocks contact links');
    await capture('contact-landing');
    await page.getByRole('link',{name:'Read CV',exact:true}).click();
    const dialog=page.locator('.virgo-dialog[open]');await dialog.waitFor();
    await dialog.getByRole('button',{name:'Close',exact:true}).click();await worlds.waitFor({state:'visible'});
    if(name==='desktop'||name==='phone'){
      await load('#/workspace');await page.getByRole('button',{name:'Contents',exact:true}).click();
      await page.locator('.room-contents').waitFor({state:'visible'});await capture('workspace-contents');
      await load('#/workspace/library');await page.locator('.reader-body').waitFor();
      assert(await page.locator('.reader-body a').count()>5,'Workspace library remains available independently of 3D');
      await capture('workspace-library');
    }
    assert.deepEqual(errors,[],`${name}: no runtime errors`);
    const result={name,viewport:options.viewport,status:'pass',sourceSha256};
    report.push(result);await writeFile(`${output}/report-${name}.json`,JSON.stringify(result,null,2));
    await writeReport('running');
    console.log(`PASS ${name}: intro, destinations, four stations, all nine worlds, contact, CV and preserved straight camera`);
    await context.close();
  }
  assert.equal(await fingerprint(),sourceSha256,'Source changed during UI verification; rerun against a stable version');
  await writeReport('pass');
}catch(error){
  await activePage?.screenshot({path:`${output}/failure.png`}).catch(()=>{});
  await writeReport('fail',error.message);throw error;
}finally{await browser?.close();await server?.close();}
