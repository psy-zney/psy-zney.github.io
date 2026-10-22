import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
const output=process.env.READING_OUTPUT||'artifacts/journey-reading';await mkdir(output,{recursive:true});
const server=process.env.READING_URL?null:await createServer({server:{host:'127.0.0.1',port:5190,strictPort:true,hmr:false}});await server?.listen();
const base=process.env.READING_URL||'http://127.0.0.1:5190';
const browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});
let page;const results=[];
const at=(page,position)=>page.waitForFunction(p=>Math.abs(Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6-p)<.002,position);
try{
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['mac',1280,800,false],['phone',390,844,true],['small',320,640,true],['tablet',768,1024,true],['landscape',844,390,true]]){
  if(process.env.READING_SCENARIOS&&!process.env.READING_SCENARIOS.split(',').includes(name))continue;
  page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#/home');await page.locator('[data-page-loader]').waitFor({state:'detached'});await at(page,1.92);
  const home=page.locator('.virgo-home-guide');await home.waitFor({state:'visible'});
  assert.equal(await page.locator('.portfolio-introduction').isVisible(),false,'Home and the detailed introduction never overlap');
  assert((await home.textContent()).includes('Lê Quang Khánh')&&(await home.textContent()).includes('Web, backend & Windows'),'Home presents identity and focus without the full biography');
  assert(!(await home.textContent()).includes('Information Technology student'),'Education is allocated to About');
  const homeBox=await home.boundingBox();assert(homeBox.x>=0&&homeBox.x+homeBox.width<=width&&homeBox.y>=0&&homeBox.y+homeBox.height<=height-20,`${name}: home identity and entry action fit: ${JSON.stringify(homeBox)}`);
  const entryBox=await home.getByRole('button').boundingBox(),soundBox=await page.locator('.virgo-sound-toggle').boundingBox();
  assert(entryBox.x+entryBox.width<=soundBox.x||entryBox.x>=soundBox.x+soundBox.width||entryBox.y+entryBox.height<=soundBox.y||entryBox.y>=soundBox.y+soundBox.height,'The exploration and sound buttons do not overlap');
  await page.screenshot({path:`${output}/${name}-home.png`});
  await page.goto(base+'/#/story');await page.locator('[data-page-loader]').waitFor({state:'detached'});await at(page,2.12);
  const card=page.locator('.journey-station-card:visible');
  await card.waitFor();
  const profile=card.locator('.portfolio-introduction');await profile.waitFor({state:'visible'});
  assert(await profile.getByRole('heading',{name:'Lê Quang Khánh',exact:true}).isVisible(),'Identity is visible without opening a disclosure');
  assert((await profile.textContent()).includes('Information Technology student · UEH'),'The profile states the actual student status');
  assert.equal(await profile.locator('.portfolio-experience>li').count(),3,'About distinguishes personal projects, freelance delivery and team experience');
  assert(!(await home.textContent()).includes(await profile.locator('.portfolio-introduction-bio').textContent()),'Home does not duplicate the About biography');
  assert.equal(await card.locator('.journey-station-body').isVisible(),false,'Core introduction is independent of optional process details');
  assert.deepEqual(await profile.locator('.portfolio-experience a').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),['#/project/sentinellan','https://github.com/psy-zney/-Fashion-Dress-up-Game','#/project/cloud-pos'],'Experience links to authentic project evidence');
  await page.screenshot({path:`${output}/${name}-profile.png`});
  const content=card.locator('.journey-station-content');
  assert(await content.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'The visible profile has no horizontal overflow');
  await profile.locator('.portfolio-experience a').last().scrollIntoViewIfNeeded();
  await profile.locator('.portfolio-experience a').last().click({trial:true});
  const nextBox=await card.locator('.journey-continue').boundingBox();assert(nextBox&&nextBox.y>=0&&nextBox.y+nextBox.height<=height,'Continue remains visible while the profile scrolls');
  await content.evaluate(el=>{el.scrollTop=0;});
  if(touch)await card.locator('.journey-detail-toggle').tap();else await card.hover();
  await card.locator('.journey-station-body').waitFor({state:'visible'});
  if(touch){
   const cvLink=card.getByRole('link',{name:'Read my CV'});await cvLink.click({trial:true});
   assert(await content.evaluate(el=>el.scrollTop>0),'Opening process details brings its contents into view');
  }
  assert(await card.locator('.journey-station-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${name}: station details do not overflow horizontally`);
  const rect=await card.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=height-40,`${name}: expanded station detail fits: ${JSON.stringify(rect)}`);
  await page.screenshot({path:`${output}/${name}-about.png`});
  if(touch)await card.locator('.journey-detail-toggle').tap();else await page.mouse.move(2,height-2);
  for(const [index,position] of [[4,3.23],[5,3.95],[6,4.92],[7,5.17],[-1,6]]){
   await page.getByRole('button',{name:'Continue',exact:true}).click();await at(page,position);
   assert(!page.url().includes('showcase'),'Continue never bypasses the story to open the showcase');
   if(index>=0){
    await page.locator(`[data-narrative-index="${index}"][aria-hidden="false"]`).waitFor();
    const layout=await page.locator(`[data-narrative-index="${index}"]`).evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{x:r.x,right:r.right,bottom:r.bottom,font:parseFloat(s.fontSize),align:s.textAlign,phrases:[...el.querySelectorAll('.virgo-story-phrase')].map(p=>getComputedStyle(p).display)};});
    assert(layout.x>=0&&layout.right<=width&&layout.bottom<height-70&&layout.font>=24,`${name}: readable headline fits the screen`);
    if(touch&&width>height){
     if(layout.x<width*.5)console.log(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],landscape:matchMedia('(max-height:599px) and (orientation:landscape)').matches,styles:[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].filter(rule=>rule.cssText.includes('body .virgo-page .virgo-narrative')).map(rule=>rule.cssText);}catch{return[];}}),line:[...document.querySelectorAll('.virgo-narrative-line')].filter(el=>el.getAttribute('aria-hidden')==='false').map(el=>({class:el.className,left:getComputedStyle(el).left,width:getComputedStyle(el).width,position:getComputedStyle(el).position,inline:el.getAttribute('style')}))})));
     assert(layout.x>=width*.5,`${name}: landscape reserves the left half for the star system`);
    }
    if(touch&&height>width){assert.equal(layout.align,'center');assert(layout.phrases.every(v=>v==='inline'),'Mobile sentences flow naturally without forced line breaks');}
    if(index===6||index===7){
     const role=index===6?'tools':'delivery',other=index===6?'delivery':'tools';
     assert(await page.locator(`[data-content-role="${role}"] .journey-station-card`).isVisible(),'The reading stop presents its own content');
     assert.equal(await page.locator(`[data-content-role="${other}"] .journey-station-card`).isVisible(),false,'The other Skills view stays hidden');
     const disclosure=page.locator(`[data-content-role="${role}"] .journey-detail-toggle`);
     if(touch)await disclosure.tap();else await disclosure.hover();
     const details=page.locator(`[data-content-role="${role}"] .journey-station-body`);await details.waitFor({state:'visible'});
     if(index===6){
      const skills=details.locator('.virgo-skill-list button');assert.equal(await skills.count(),5,'Technical view preserves all five interactive capabilities');
      for(const skill of await skills.all()){
       await skill.click();assert.equal(await skill.getAttribute('aria-pressed'),'true');assert(page.url().includes('#/skills/'));
       assert((await details.locator('.virgo-skill-detail').innerText()).length>30);assert(await details.locator('.virgo-skill-tools span').count()>0);assert(await details.locator('.virgo-skill-evidence a').count()>0);
      }
     }
     else {assert.equal(await details.locator('.journey-delivery-notes>li').count(),3);assert.equal(await details.locator('.virgo-skill-list').count(),0,'Delivery adds quality decisions rather than repeating the skills list');}
     await page.screenshot({path:`${output}/${name}-${role}.png`});
     if(index===6){
      const moveTo=p=>page.locator('.virgo-scroll').evaluate((el,p)=>{const steps=[...document.querySelector('.virgo-scroll-content').children],leg=Math.floor(p);el.scrollTop=steps[leg].offsetTop+(p-leg)*(steps[leg+1].offsetTop-steps[leg].offsetTop);},p);
      await moveTo(5.17);await at(page,5.17);
      assert.equal(await page.locator('[data-content-role="tools"] .journey-station-card').isVisible(),false,'An open technical card does not persist at Delivery');
      assert(await page.locator('[data-content-role="delivery"] .journey-station-card').isVisible(),'Delivery has a separate card when scrolling from open technical details');
      assert(await page.locator('.virgo-narrative').evaluate(el=>Number(getComputedStyle(el).opacity)>.9),'A hidden open card cannot suppress the next headline');
      await moveTo(4.92);await at(page,4.92);
     }
     if(touch)await disclosure.tap();else await page.mouse.move(2,height-2);
    }
    if(index===4||index===5)await page.screenshot({path:`${output}/${name}-reading-${index}.png`});
   }
  }
  await page.goto(base+'/#/projects/all');await page.locator('[data-page-loader]').waitFor({state:'detached'});
  const archive=page.locator('.project-archive');await archive.waitFor();assert.equal(await archive.locator('.archive-project').count(),10);
  assert.equal(await archive.locator('.archive-project-purpose').count(),10,'Every project presents its purpose before expansion');
  const first=archive.locator('.archive-project-toggle').first();if(touch)await first.tap();else await first.hover();
  await archive.locator('.archive-project-details').first().waitFor({state:'visible'});
  assert(await archive.getByRole('link',{name:'Read case study'}).isVisible(),'Expanded purpose leads to the original detailed case study');
  await page.screenshot({path:`${output}/${name}-archive.png`});
  await page.goto(base+'/#/cv/fullstack');await page.locator('[data-page-loader]').waitFor({state:'detached'});
  const cv=page.locator('[data-cv-document]');await cv.frameLocator('iframe').locator('h1').waitFor();
  assert.equal(await cv.getByRole('link',{name:'Download HTML'}).count(),0,'Downloads stay out of the primary reading toolbar');
  await cv.getByLabel('More CV actions').click();assert.equal(await cv.getByRole('link',{name:'Download HTML'}).count(),1);await cv.getByLabel('More CV actions').click();
  await page.screenshot({path:`${output}/${name}-cv.png`});
  assert.deepEqual(errors,[],`${name}: no runtime errors`);results.push({name,passed:true});console.log(`PASS: ${name}: step-by-step journey, details, archive purpose and compact CV.`);await page.close();
 }
 await writeFile(output+'/report.json',JSON.stringify({passed:true,results},null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:output+'/failure.png'});await writeFile(output+'/report.json',JSON.stringify({passed:false,results,error:String(error)},null,2));throw error;}
finally{await browser.close();await server?.close();}
