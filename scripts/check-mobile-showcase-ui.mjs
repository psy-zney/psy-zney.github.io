import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = process.env.MOBILE_OUTPUT || 'artifacts/mobile-showcase';
await mkdir(output, {recursive:true});
const server = process.env.MOBILE_URL ? null : await createServer({server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false}});
await server?.listen();
const url = process.env.MOBILE_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});
const geometry = page => page.evaluate(() => Object.fromEntries(['.worlds-header','.worlds-gate.is-selected .worlds-window','.worlds-slide[aria-hidden="false"] .worlds-caption','.worlds-footer','.worlds-heading'].map(selector=>{
  const el=document.querySelector(selector),{x,y,width,height}=el.getBoundingClientRect();return[selector,{x,y,width,height}];
})));
const ready = async page => {
  await page.locator('[data-page-loader]').waitFor({state:'detached'});
  await page.locator('.worlds-showcase').waitFor();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.worlds-stage')).opacity)>.999);
};
const results=[]; let page;
try {
  if(process.env.MOBILE_RECORD==='1') {
    page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    await page.goto(`${url}/#/showcase/backup`);await ready(page);
    await writeFile(`${output}/desktop-baseline.json`,JSON.stringify(await geometry(page),null,2));
    await page.screenshot({path:`${output}/desktop-before.png`});await page.close();
    page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await page.goto(`${url}/#/showcase/backup`);await ready(page);
    await page.screenshot({path:`${output}/phone-before.png`});
    console.log('Recorded desktop geometry and mobile appearance before changes.');
  } else {
    const baseline=JSON.parse(await readFile(new URL('./fixtures/showcase-desktop-1440x900.json',import.meta.url),'utf8'));
    page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    await page.goto(`${url}/#/showcase/backup`);await ready(page);
    assert.deepEqual(await geometry(page),baseline,'Desktop geometry stays unchanged');
    await page.screenshot({path:`${output}/desktop-after.png`});await page.close();
    for(const [name,width,height,fontScale] of [['small',320,568,1],['compact',360,640,1],['phone',390,844,1],['large',430,932,1],['landscape',844,390,1],['short-landscape',640,360,1],['tablet',768,1024,1],['large-text',390,844,1.25]]) {
      if(process.env.MOBILE_SCENARIOS&&!process.env.MOBILE_SCENARIOS.split(',').includes(name))continue;
      page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${url}/#/showcase/backup`);await ready(page);
      if(fontScale!==1)await page.addStyleTag({content:`html{font-size:${16*fontScale}px}`});
      // Exercise every content length and each action combination, including missing previews.
      for(const id of ['backup','beatsync','manager','fashion','sentinel','security','mpoly','boom','study']) {
        await page.evaluate(id=>{location.hash=`#/showcase/${id}`;},id);
        await page.waitForFunction(id=>document.querySelector('.worlds-gate.is-selected')?.getAttribute('data-world-index')===String(['mpoly','beatsync','boom','study','manager','fashion','sentinel','security','backup'].indexOf(id)),id);
        const layout=await page.evaluate(()=>{
          const root=document.querySelector('.worlds-showcase'),stage=root.querySelector('.worlds-stage'),slide=root.querySelector('.worlds-slide[aria-hidden="false"]'),caption=slide.querySelector('.worlds-caption');
          const rect=el=>{const {x,y,width,height}=el.getBoundingClientRect();return {x,y,width,height,right:x+width,bottom:y+height};};
          const controls=[...caption.querySelectorAll('a,button')].map(el=>({...rect(el),text:el.textContent.trim(),font:parseFloat(getComputedStyle(el).fontSize)}));
          return{root:rect(root),stage:rect(stage),caption:rect(caption),preview:rect(slide.querySelector('.worlds-window')),descriptionFont:parseFloat(getComputedStyle(caption.querySelector('h2+p')).fontSize),controls,stageScroll:stage.scrollWidth,rootScroll:root.scrollWidth};
        });
        assert(layout.caption.x>=12&&layout.caption.right<=width-12,`${name}/${id}: copy has comfortable side margins`);
        assert(layout.preview.x>=12&&layout.preview.right<=width-12,`${name}/${id}: authentic preview fits the screen`);
        assert(layout.descriptionFont>=14,`${name}/${id}: descriptions stay readable`);
        assert(layout.controls[0].width>layout.caption.width*.75,`${name}/${id}: the primary action fills the reading panel`);
        assert(layout.preview.bottom+8<=layout.caption.y||layout.preview.right+12<=layout.caption.x,`${name}/${id}: image and text occupy separate areas`);
        for(const control of layout.controls)assert(control.height>=44&&control.x>=12&&control.right<=width-12,`${name}/${id}: action targets fit and are at least 44px tall`);
        assert(layout.rootScroll<=width+1,`${name}/${id}: no page-wide horizontal overflow (${layout.rootScroll}px)`);
        assert(await page.locator('.worlds-slide[inert]').count()===8,'Only the selected project is interactive');
        const nav=await page.locator('.worlds-footer').boundingBox();
        assert(nav.y>=layout.caption.bottom+12,`${name}/${id}: navigation follows the entire action panel and cannot cover its buttons`);
        await page.locator('.worlds-slide[aria-hidden="false"] .worlds-actions a').last().click({trial:true});
        const clearance=await page.locator('.worlds-showcase').evaluate(root=>{const action=root.querySelector('.worlds-slide[aria-hidden="false"] .worlds-actions').getBoundingClientRect(),footer=root.querySelector('.worlds-footer').getBoundingClientRect();return footer.top-action.bottom;});
        assert(clearance>=12,`${name}/${id}: actions remain unobscured after scrolling them into view`);
      }
      await page.evaluate(()=>{location.hash='#/showcase/backup';document.querySelector('.worlds-showcase').scrollTop=0;});
      await page.waitForFunction(()=>document.querySelector('.worlds-gate.is-selected')?.dataset.worldIndex==='8');
      await page.screenshot({path:`${output}/${name}.png`});
      const worlds=page.locator('.worlds-showcase');
      if(name==='phone') {
        await page.evaluate(()=>{
          window.__mobilePointers=[];
          for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(type,event=>window.__mobilePointers.push({type,x:event.clientX,y:event.clientY,button:event.button,primary:event.isPrimary,target:event.target.className}),{capture:true});
        });
        const session=await page.context().newCDPSession(page);
        const preview=await worlds.locator('.worlds-gate.is-selected').boundingBox(),x=width*.35,y=preview.y+preview.height*.5;
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        for(let i=1;i<=6;i++) {
          await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*18,y}]});
          await page.waitForTimeout(20);
        }
        await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await writeFile(`${output}/touch.json`,JSON.stringify(await page.evaluate(()=>({events:window.__mobilePointers,hash:location.hash,dragging:document.querySelector('.worlds-showcase').dataset.dragging,scroll:document.querySelector('.worlds-showcase').scrollTop})),null,2));
        await page.waitForURL('**/#/showcase/security');
        assert.equal(await page.locator('dialog.screening-room[open]').count(),0,'A native touch swipe changes one project without opening it');
        await worlds.getByRole('button',{name:'Next world',exact:true}).click();
        await page.waitForURL('**/#/showcase/backup');
        await session.detach();
      }
      await worlds.getByRole('button',{name:/Previous world|Thế giới trước/,exact:true}).click();
      await page.waitForURL('**/#/showcase/security');
      await worlds.getByRole('button',{name:/Enter world|Đi vào thế giới/,exact:true}).click();
      await page.locator('dialog.screening-room[open]').waitFor();
      await page.locator('.screening-close').click();await worlds.waitFor();
      assert(page.url().endsWith('/security'),'Closing returns to the selected project');
      await worlds.getByRole('button',{name:/Let’s connect|Đi tới liên hệ/}).click();
      await page.waitForFunction(()=>document.querySelector('.worlds-showcase').scrollTop>100);
      assert.deepEqual(errors,[],`${name}: no runtime errors`);
      results.push({name,width,height,passed:true});console.log(`PASS: ${name}, 9 projects, readable copy, 44px targets, navigation and return.`);
      await page.close();
    }
    await writeFile(`${output}/report.json`,JSON.stringify({passed:true,results},null,2));
  }
} catch(error) {
  if(page&&!page.isClosed())await page.screenshot({path:`${output}/failure.png`});
  await writeFile(`${output}/report.json`,JSON.stringify({passed:false,results,error:String(error)},null,2));throw error;
} finally {await browser.close();await server?.close();}
