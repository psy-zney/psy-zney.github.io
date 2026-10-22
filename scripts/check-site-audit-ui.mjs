import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
const output='artifacts/final-audit';await mkdir(output,{recursive:true});
const server=process.env.AUDIT_URL?null:await createServer({server:{host:'127.0.0.1',port:5194,strictPort:true,hmr:false}});await server?.listen();
const base=process.env.AUDIT_URL||'http://127.0.0.1:5194';
const browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});
const actions=[],errors=[];let page;
const load=async hash=>{await page.goto(base+'/'+hash);await page.locator('[data-page-loader]').waitFor({state:'detached'});};
const done=label=>{actions.push(label);console.log('PASS: '+label);};
try{
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['phone',390,844,true],['narrow-desktop',820,900,false]]){
  page=await browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(name+': '+e.message));
  await page.route('**/stats',route=>route.fulfill({json:{totalViews:10,uniqueVisitors:5,topPaths:[{path:'/',count:10}],topReferrers:[],recentVisits:[],topFlows:[],status:'ok'}}));
  await load('#/projects/all');const dialog=page.locator('.virgo-dialog[open]');
  const ids=await dialog.locator('.archive-project-toggle').evaluateAll(buttons=>buttons.map(el=>el.getAttribute('aria-controls').replace('archive-','')));assert.equal(ids.length,10);
  for(const toggle of await dialog.locator('.archive-project-toggle').all()){
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   const details=dialog.locator('#'+await toggle.getAttribute('aria-controls'));assert((await details.innerText()).length>30);await details.getByRole('link',{name:'Read case study'}).click({trial:true});
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  }
  for(const id of ids){
   await load('#/project/'+id);await dialog.locator('h1').waitFor();
   for(const section of ['overview','architecture','decisions','notes']){
    const label={overview:'Overview',architecture:'Architecture',decisions:'Decisions',notes:'Notes'}[section];
    const toggle=dialog.getByRole('button',{name:'Contents',exact:true});if(await toggle.count()&&!await dialog.locator('.document-tabs').isVisible())await toggle.click();
    await dialog.locator('.document-tabs button').filter({hasText:label}).click();
    await page.waitForURL('**/#/project/'+id+'/'+section);assert((await dialog.locator('.document-section').innerText()).trim().length>20);
   }
   await dialog.getByRole('button',{name:'Next section',exact:false}).click();await page.waitForURL('**/#/project/'+id+'/overview');
   const contents=dialog.getByRole('button',{name:'Contents',exact:true});
   if(await contents.isVisible()){await contents.click();await dialog.getByRole('button',{name:'Close contents',exact:true}).click();assert.equal(await contents.getAttribute('aria-expanded'),'false');}
   await dialog.getByRole('button',{name:'Copy link',exact:true}).click();await dialog.getByRole('status').filter({hasText:/copied|browser/i}).waitFor();
   await dialog.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('.virgo-dialog[open]').count(),0);
  }done(name+': all ten case studies, every contents section, copy and close');
  for(const track of ['backend','fullstack','software']){
   await load('#/cv/'+track);await dialog.locator('iframe').waitFor();await dialog.frameLocator('iframe').locator('h1').waitFor();
   await dialog.getByLabel('More CV actions').click();assert(await dialog.getByRole('link',{name:'Download HTML'}).getAttribute('download')!==null);assert(await dialog.getByRole('link',{name:'Download original'}).getAttribute('href'));await dialog.getByLabel('More CV actions').click();
   await dialog.getByRole('button',{name:'Close',exact:true}).click();
  }done(name+': all CV tracks, original/HTML downloads and return');
  await load('#/story');await page.locator('.portfolio-introduction').waitFor({state:'visible'});
  const about=page.locator('.journey-station-card:visible');await about.locator('.journey-detail-toggle').click();
  for(const button of await about.locator('.virgo-origin-steps button').all()){await button.click();assert((await about.locator('.virgo-origin-description').innerText()).length>15);}done(name+': all four learning interactions');
  for(const id of ['mpoly','beatsync','boom','study','manager','fashion','sentinel','security','backup']){
   await load('#/showcase/'+id);const worlds=page.locator('.worlds-showcase');await worlds.waitFor();
   const controls=worlds.locator('.worlds-slide[aria-hidden="false"] .worlds-actions');
   for(const action of await controls.locator('a,button').all())await action.click({trial:true});
   const positions=await worlds.evaluate(el=>{const caption=el.querySelector('.worlds-slide[aria-hidden="false"] .worlds-caption').getBoundingClientRect(),footer=el.querySelector('.worlds-footer').getBoundingClientRect();return{captionBottom:caption.bottom,footerTop:footer.top};});
   assert(positions.footerTop>positions.captionBottom+5,name+'/'+id+': footer must not cover any action');
   await controls.getByRole('button',{name:'Enter world',exact:true}).click();const room=page.locator('dialog.screening-room[open]');await room.waitFor();
   await room.locator('.screening-close').click();await worlds.waitFor();assert(page.url().endsWith('/'+id));
  }done(name+': all nine worlds, every selector action is unobscured, enter/close retains selection');
  const worlds=page.locator('.worlds-showcase');await worlds.getByRole('button',{name:'Let’s connect',exact:false}).click();
  const contact=worlds.locator('.contact-landing');await contact.getByRole('heading',{name:'Let’s build something useful.',exact:true}).waitFor();
  await contact.getByRole('button',{name:'Copy email',exact:true}).click();await contact.getByRole('status').filter({hasText:/copied|Select the email/}).waitFor();
  for(const link of await contact.locator('a').all()) {assert(await link.getAttribute('href'));await link.click({trial:true});}
  await contact.getByRole('link',{name:'Read CV',exact:false}).click();await dialog.locator('iframe').waitFor();await dialog.getByRole('button',{name:'Close',exact:true}).click();assert(page.url().includes('#/showcase/backup'));
  await worlds.getByRole('button',{name:'Let’s connect',exact:false}).click();await contact.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/'+name+'-contact.png'});
  await load('#/showcase/beatsync');await page.screenshot({path:output+'/'+name+'-showcase.png'});done(name+': contact copy, all link targets, CV and return');
  if(name!=='narrow-desktop'){
   await load('#/workspace/library');await page.locator('.project-library').waitFor();const library=page.locator('.project-library');
   for(const category of ['all','web','systems','mobile','creative']){await library.locator('.library-filters button').filter({hasText:new RegExp('^'+(category==='all'?'All':category)+' ')}).click();assert(await library.locator('.library-book').count()>0);}
   await library.getByLabel('Search projects').fill('no-such-project');await library.getByRole('button',{name:'Clear filters'}).click();assert.equal(await library.locator('.library-book').count(),10);
   await library.getByLabel('Sort projects').selectOption('name');await library.getByLabel('Sort projects').selectOption('year');await library.getByLabel('List view',{exact:true}).click();await library.getByLabel('Grid view',{exact:true}).click();
   done(name+': workspace library search, all filters, sorting, clear and views');
   await load('#/workspace');await page.getByLabel('Contents',{exact:true}).click();assert.equal(await page.locator('.room-contents>button').count(),4);await page.getByLabel('Close reader',{exact:true}).click();
   await page.getByLabel('Room controls',{exact:true}).click();await page.getByLabel('Close reader',{exact:true}).click();
   await page.getByLabel('Workspace settings',{exact:true}).click();
   await page.getByLabel('Room input controls').selectOption('touch');await page.getByLabel('Room input controls').selectOption('auto');
   await page.getByLabel('Graphics quality').selectOption('low');await page.getByLabel('Graphics quality').selectOption('auto');
   const settings=page.locator('.room-settings');const sound=settings.locator('button[aria-pressed]').first();await sound.click();await sound.click();await settings.getByRole('slider').fill('0.4');
   await settings.getByRole('button',{name:'Recenter',exact:true}).click();await settings.getByRole('button',{name:'Show object labels'}).click();
   done(name+': room contents/help/settings, input, quality, sound, volume and recenter');
   for(const app of ['home','projects','documents','contact','settings','playground']){
    await load('#/workspace/os/home');const os=page.locator('dialog.zney-os');await os.waitFor({state:'visible'});
    const target=os.locator('.os-nav a[href="#/workspace/os/'+app+'"]');
    if(await target.isVisible())await target.click();else {await os.getByRole('button',{name:'More',exact:true}).click();await os.locator('.os-more-apps a[href="#/workspace/os/'+app+'"]').click();}
    await page.waitForURL('**/#/workspace/os/'+app);
    if(app==='contact'){await os.getByRole('button',{name:'Copy email'}).click();await os.getByRole('status').filter({hasText:/Copied|Select/}).waitFor();}
    if(app==='playground'){
     await os.locator('.desktop-overlay').waitFor();for(const led of await os.locator('.led-presets button').all())await led.click();
     const stage=os.locator('.pixel-stage');await stage.focus();
     const steps=()=>os.locator('.pixel-game-hud').innerText();const before=await steps();
     for(const key of ['w','a','s','d','Space'])await stage.press(key);
     assert.notEqual(await steps(),before,'Keyboard movement updates the game');
     const touchControls=os.locator('.game-touch-controls button:visible');
     assert.equal(await touchControls.count(),touch?5:0);
     for(const button of await touchControls.all())await button.click();
     await os.getByRole('button',{name:/SOUND/}).click();
    }
    await os.getByRole('button',{name:'Back to room'}).click();await os.waitFor({state:'detached'});
   }done(name+': every Zney OS app, playground LED/input/game/sound and return');
   await load('?admin');await page.getByRole('heading',{name:'System Access'}).waitFor();await page.getByPlaceholder('Password').fill('local-audit-fixture');await page.getByRole('button',{name:'Login',exact:true}).click();await page.getByRole('heading',{name:'zney Metrics',exact:false}).waitFor();
   await page.getByRole('button',{name:/Refresh|Làm mới/}).click();await page.getByRole('button',{name:/Logout|Đăng Xuất|Log Out/i}).click();await page.getByRole('heading',{name:'System Access'}).waitFor();await page.getByRole('button',{name:'Back',exact:true}).click();done(name+': admin login/refresh/logout/back with local mocked stats, no private data');
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(output+'/controls-report.json',JSON.stringify({passed:true,actions,limitations:['Physical device sensors, pointer lock, real audio perception and third-party iframe availability are not proven by emulation.','Admin stats use a local fixture; no private account is queried.']},null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:output+'/controls-failure.png'});await writeFile(output+'/controls-report.json',JSON.stringify({passed:false,actions,errors,error:String(error)},null,2));throw error;}
finally{await browser.close();await server?.close();}
