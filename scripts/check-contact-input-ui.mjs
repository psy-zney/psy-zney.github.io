import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
const output='artifacts/contact-input';await mkdir(output,{recursive:true});
const server=await createServer({cacheDir:'node_modules/.vite-contact-input',server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false}});
const scenarios=[{name:'short-mouse',viewport:{width:844,height:390}},{name:'desktop',viewport:{width:1440,height:900}},{name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true}];
const checks=[];let browser,page,currentName,errorMessage;
try{
  await server.listen();browser=await chromium.launch({headless:true,...(process.env.UI_CHROME_PATH?{executablePath:process.env.UI_CHROME_PATH}:{})});
  for(const{name,...options}of scenarios){
    currentName=name;page=await browser.newPage(options);const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/track',route=>route.fulfill({status:204}));
    await page.goto(server.resolvedUrls.local[0]+'#/contact');
    await page.locator('[data-page-loader]').waitFor({state:'detached'});
    await page.waitForFunction(()=>Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6>5.9999);
    const links=page.locator('.virgo-overlay-panel[aria-labelledby="virgo-contact-title"] .virgo-bare a');
    assert.equal(await links.count(),5);
    const targets=[];
    for(let index=0;index<5;index++){
      const link=links.nth(index),hit=await link.evaluate(el=>{const r=el.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:el.textContent.trim(),receives:target?.closest('a')===el,interceptor:target?.outerHTML.slice(0,220)};});
      targets.push(hit);await writeFile(`${output}/${name}-targets.json`,JSON.stringify(targets,null,2));
      assert(hit.receives,`${name}: ${hit.label} receives pointer input instead of ${hit.interceptor}`);
      // Exercise real clicks without navigating to mail, external sites or CVs.
      await link.evaluate(el=>el.addEventListener('click',event=>{event.preventDefault();el.dataset.pointerClicks=String(Number(el.dataset.pointerClicks||0)+1);}));
      await link.click();assert.equal(await link.getAttribute('data-pointer-clicks'),'1');
    }
    if(!options.hasTouch){
      const orbit=page.locator('.virgo-black-hole-orbit'),r=await orbit.boundingBox();
      await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+80,r.y+r.height/2+20,{steps:8});await page.mouse.up();
      assert(Math.abs(Number(await orbit.getAttribute('data-azimuth')))>.1,`${name}: the exposed core still handles orbit dragging`);
    }
    assert.deepEqual(errors,[]);await page.screenshot({path:`${output}/${name}.png`});checks.push({name,viewport:options.viewport,targets});await page.close();console.log(`PASS Contact input: ${name}, five links and orbit`);
  }
}catch(error){errorMessage=error.message;if(page&&!page.isClosed())await page.screenshot({path:`${output}/${currentName}-failure.png`});throw error;}
finally{await writeFile(`${output}/report.json`,JSON.stringify({passed:checks.length===scenarios.length&&!errorMessage,checks,...(errorMessage?{error:errorMessage}:{})},null,2));await browser?.close();await server.close();}
