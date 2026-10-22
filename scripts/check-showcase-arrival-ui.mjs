import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const output='artifacts/showcase-arrival';await mkdir(output,{recursive:true});
const server=process.env.ARRIVAL_URL?null:await createServer({server:{host:'127.0.0.1',port:5192,strictPort:true,hmr:false}});await server?.listen();
const base=process.env.ARRIVAL_URL||'http://127.0.0.1:5192';
const browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});
let page;const results=[];
const finish=async page=>{await page.clock.runFor(1800);assert.equal(await page.locator('.page-passage').count(),0);await page.getByRole('button',{name:'Enter world',exact:true}).waitFor();};
try{
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small',320,640],['landscape',844,390],['error',390,844]]){
  if(process.env.ARRIVAL_SCENARIOS&&!process.env.ARRIVAL_SCENARIOS.split(',').includes(name))continue;
  page=await browser.newPage({viewport:{width,height},hasTouch:width<900,reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  if(name==='error')await page.route('**/img/products/**',route=>route.abort());
  await page.clock.install();
  await page.goto(base+'/#/contact');await page.locator('[data-page-loader]').waitFor({state:'detached'});
  await page.waitForFunction(()=>Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6>5.995);
  const pose=await page.locator('.virgo-page').getAttribute('data-camera-pose');
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));
  await page.mouse.move(12,height/2);await page.mouse.wheel(0,120);await page.clock.runFor(650);
  const arrival=page.locator('.showcase-arrival');assert(await arrival.isVisible());
  assert.equal(await arrival.locator('.arrival-preview').count(),3,'The passage uses three original preview windows');
  assert(await arrival.getByRole('heading',{name:'Opening the showcase'}).isVisible());
  const layout=await arrival.locator('.arrival-preview').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,transform:getComputedStyle(el).transform,state:el.dataset.state};}));
  assert(layout.every(r=>r.x>=0&&r.right<=width&&r.y>=0&&r.bottom<=height),`${name}: all preview windows fit: ${JSON.stringify(layout)}`);
  assert(layout.every(r=>r.transform!=='none'),'The windows are opening within the passage');
  assert.equal(await page.locator('.virgo-page').getAttribute('data-camera-pose'),pose,'Opening previews never moves the parked journey camera');
  if(name==='error'){
   assert.equal(await arrival.locator('[data-state="error"]').count(),3,'Failed preview requests get an explicit fallback');
   assert((await arrival.getByRole('status').textContent()).includes('0/3'),'The status reports actual preview availability');
  }else assert.equal(await arrival.locator('[data-state="ready"]').count(),3,'Ready status follows loaded original images');
  await page.screenshot({path:`${output}/${name}-opening.png`});
  if(name==='desktop'){
   await page.keyboard.press('Escape');await page.clock.runFor(1000);
   assert(page.url().endsWith('#/contact'));assert.equal(await page.locator('.page-passage').count(),0,'Escape reverses the introduction back to Contact');
   await page.mouse.wheel(0,120);await page.clock.runFor(650);await page.screenshot({path:`${output}/desktop-reentry.png`});
  }
  await finish(page);
  assert.deepEqual(errors,[],`${name}: no runtime errors`);results.push({name,passed:true});console.log(`PASS: ${name}: real preview windows, status, fit, fixed camera and passage.`);await page.close();
 }
 page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto(base+'/#/contact');await page.locator('[data-page-loader]').waitFor({state:'detached'});
 await page.waitForFunction(()=>Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6>5.995);
 await page.mouse.move(12,422);await page.mouse.wheel(0,120);await page.getByRole('button',{name:'Enter world',exact:true}).waitFor();
 assert.equal(await page.locator('.page-passage').count(),0,'Reduced motion enters directly without the animated introduction');results.push({name:'reduced',passed:true});await page.close();
 await writeFile(output+'/report.json',JSON.stringify({passed:true,results},null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:output+'/failure.png'});await writeFile(output+'/report.json',JSON.stringify({passed:false,results,error:String(error)},null,2));throw error;}
finally{await browser.close();await server?.close();}
