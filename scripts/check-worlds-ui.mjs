import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const output = process.env.WORLDS_OUTPUT || 'artifacts/worlds-showcase';
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5184, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROME_PATH });
const results = [];
let activeErrors = [];
const selectedScenarios = process.env.UI_SCENARIOS?.split(',');
// Explicit scope for styling reviews; the default still verifies the complete journey.
const layoutOnly = process.env.WORLDS_LAYOUT_ONLY === '1';
try {
  for (const [name, width, height, reducedMotion] of [['desktop',1440,900,'no-preference'],['tablet',762,715,'no-preference'],['phone',390,844,'no-preference'],['landscape',844,390,'no-preference'],['reduced',1440,900,'reduce']]) {
    if (selectedScenarios && !selectedScenarios.includes(name)) continue;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = [];
    activeErrors = errors;
    page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
    page.on('console', message => {if(message.type()==='error'&&/THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text()))errors.push(message.text());});
    await page.goto('http://127.0.0.1:5184/#/showcase/beatsync');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const worlds = page.locator('.worlds-showcase');
    await worlds.waitFor();
    const layout = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top:r.top,bottom:r.bottom,left:r.left,right:r.right }; };
      return { caption:rect('.worlds-slide[aria-hidden="false"] .worlds-caption'),footer:rect('.worlds-footer'),heading:rect('.worlds-slide[aria-hidden="false"] .worlds-heading'),gate:rect('.worlds-gate.is-selected') };
    });
    assert(layout.caption.bottom < layout.footer.top, `${name}: actions must not collide with footer`);
    assert(layout.caption.left >= 0 && layout.caption.right <= width, `${name}: caption fits viewport`);
    if (height < 600) {
      assert(layout.gate.right + 16 < layout.caption.left, 'Landscape leaves clear space between the selected portal and its caption');
      assert(layout.gate.top+(layout.gate.bottom-layout.gate.top)*.09>layout.heading.bottom+5,'Landscape keeps the projected portal rim below its heading');
    }
    assert.equal(await worlds.locator('.worlds-gate').count(),9);
    const back=worlds.getByRole('button',{name:'Back to Virgo',exact:true});
    const backBounds=await back.boundingBox();
    assert(backBounds.x<width*.15&&backBounds.y<height*.15,'Back stays in the upper-left corner');
    assert.equal((await back.textContent()).trim(),'','Back has only an arrow while keeping an accessible name');
    const nav=await worlds.locator('.worlds-footer').boundingBox();
    assert(Math.abs(nav.x+nav.width/2-width/2)<2&&nav.y>height*.75,'World navigation stays centred at the viewport bottom');
    const glass=await worlds.locator('.worlds-gate.is-selected .worlds-window').evaluate(el=>({blur:getComputedStyle(el).backdropFilter,radius:parseFloat(getComputedStyle(el).borderRadius)}));
    assert(glass.blur.includes('blur(')&&glass.radius>=18,'The selected authentic preview has a rounded glass frame');
    const panel = await worlds.locator('.worlds-slide[aria-hidden="false"] .worlds-caption').evaluate(el => {
      const surface=getComputedStyle(el,'::before'),rim=getComputedStyle(el,'::after'),text=getComputedStyle(el);
      const primary=el.querySelector('.worlds-actions button').getBoundingClientRect();
      const opacity=[...surface.backgroundImage.matchAll(/rgba\([\d.]+,\s*[\d.]+,\s*[\d.]+,\s*([\d.]+)\)/g)].map(match=>Number(match[1]));
      const rect=el.getBoundingClientRect();
      return {opacity,blur:parseFloat(surface.backdropFilter.match(/blur\(([\d.]+)/)?.[1]??'0'),animation:rim.animationName,alignment:text.textAlign,primaryWidth:primary.width,width:rect.width,rimTop:rect.top+parseFloat(surface.top),rimBottom:rect.bottom-parseFloat(surface.bottom),groupPointer:getComputedStyle(el.parentElement).pointerEvents,contentPointer:text.pointerEvents};
    });
    assert(panel.blur>0&&panel.blur<=10,`${name}: the glass surface keeps the background visible with a light blur`);
    assert(panel.opacity.length>=3&&Math.max(...panel.opacity)<=.08,`${name}: panel fills are transparent rather than opaque blue`);
    assert.equal(panel.animation,reducedMotion==='reduce'?'none':'worlds-glass-flow',`${name}: flowing rim respects reduced motion`);
    assert(panel.rimBottom+8<layout.footer.top,`${name}: the full glass rim leaves space above navigation`);
    assert.equal(panel.groupPointer,'none',`${name}: empty column space lets the recessed portals receive input`);
    assert.equal(panel.contentPointer,'auto',`${name}: product actions remain interactive`);
    if(height>=620&&width>=1000){
      assert.equal(panel.alignment,'center','Desktop product information is centered');
      assert(panel.primaryWidth<panel.width*.65,'The primary action stays compact');
      const group=await worlds.locator('.worlds-slide[aria-hidden="false"] .worlds-details').boundingBox();
      assert(Math.abs(group.y+group.height/2-height*.49)<2,'The complete reading column shares the preview center');
      assert(layout.heading.bottom+24<layout.caption.top,'The heading leaves room for the transparent panel rim');
    }
    await page.waitForFunction(() => document.querySelector('.cosmic-portal-field')?.dataset.centerProtected==='true');
    const idleSample = () => worlds.evaluate(root => ({
      time: Number(root.querySelector('.cosmic-portal-field').dataset.ambientTime),
      gates: [...root.querySelectorAll('.worlds-gate')].map(gate => {
        const r=gate.getBoundingClientRect();
        return { selected:gate.classList.contains('is-selected'),x:r.x,y:r.y,z:new DOMMatrixReadOnly(getComputedStyle(gate).transform).m43 };
      }),
    }));
    const idleBefore = await idleSample();
    await page.waitForTimeout(1700);
    const idleAfter = await idleSample();
    if (reducedMotion === 'reduce') {
      assert.equal(idleAfter.time,0,'Reduced motion has no background clock');
      assert.deepEqual(idleBefore.gates,idleAfter.gates,'Reduced motion keeps every aperture at rest');
    } else {
      assert(idleAfter.time > idleBefore.time + .2,'The world field remains alive without scroll input');
      const activeBefore=idleBefore.gates.find(g=>g.selected),activeAfter=idleAfter.gates.find(g=>g.selected);
      assert(Math.hypot(activeAfter.x-activeBefore.x,activeAfter.y-activeBefore.y)<.1,'The authentic selected preview stays steady while its surroundings move');
      assert.deepEqual(idleBefore.gates,idleAfter.gates,'Product slides stay at rest while the cosmic background animates');
    }
    await page.screenshot({ path: `${output}/${name}-worlds.png` });
    assert.equal(await worlds.locator('.cosmic-portal-field canvas').count(),1,'One renderer draws the restrained cosmic background');
    assert.equal(await worlds.locator('.cosmic-portal-field').getAttribute('data-portals'),'9','All nine destinations remain in the cosmic background on every viewport');
    const constellation=await worlds.locator('.worlds-gate').evaluateAll(gates=>gates.map(el=>{
      const r=el.getBoundingClientRect(),m=new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return{active:el.classList.contains('is-selected'),z:m.m43,x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,tilted:Math.abs(m.m13)+Math.abs(m.m23)};
    }));
    const front=constellation.find(p=>p.active),background=constellation.filter(p=>!p.active);
    assert(constellation.every(p=>Math.abs(p.z)<.01&&p.tilted<.001),'Every preview lies on the same flat horizontal plane');
    assert(constellation.every(p=>Math.abs(p.width-front.width)<2&&Math.abs(p.y-front.y)<2),'All slides retain the same size and vertical alignment');
    for(let i=1;i<constellation.length;i++)assert(Math.abs(constellation[i].x-constellation[i-1].x-width)<2,'Adjacent previews are one viewport apart');
    assert.equal(await worlds.locator('.worlds-slide[inert]').count(),8,'Offscreen slides cannot take focus or clicks');
    const previewRatio=await worlds.locator('.worlds-gate.is-selected').evaluate(el=>el.querySelector('.worlds-window').offsetWidth/el.offsetWidth);
    assert(previewRatio>.70,'The central product preview fills the portal aperture');
    assert.equal(await worlds.locator('.worlds-gate.is-selected img').evaluate(el=>getComputedStyle(el).transform),'none','Authentic preview pixels remain on an undistorted plane');
    assert.equal(await worlds.locator('.worlds-gate.is-selected img').evaluate(el=>getComputedStyle(el).objectFit),'contain','Focused work preserves the entire authentic preview');
    const frame = await worlds.locator('.worlds-gate.is-selected .worlds-window').boundingBox();
    assert(frame.x >= 0 && frame.x + frame.width <= width, 'The wide viewing plane stays within the viewport');
    if (height >= 600) {
      const separated = frame.x + frame.width + 20 < layout.caption.left || frame.y + frame.height < layout.caption.top;
      assert(separated, 'The viewing plane and project text occupy separate visual zones');
      if(width<1000)assert(frame.y+frame.height+8<panel.rimTop,'The entire tablet/phone glass rim clears the authentic preview');
    }
    if (layoutOnly) {
      assert.deepEqual(errors,[],`${name}: no layout runtime errors`);
      results.push({name,layout,passed:true});
      console.log(`PASS: ${name} glass, spacing, input targets, ambient and preview layout.`);
      await page.close();
      continue;
    }
    if (reducedMotion !== 'reduce') {
      await worlds.focus(); await worlds.press('Enter'); await worlds.press('Escape');
      await page.waitForTimeout(750);
      assert.equal(await page.locator('dialog.screening-room[open]').count(),0,'Escape cancels a pending world entry');
      await worlds.waitFor();
    }
    if(name==='desktop'){
      const volume=await page.evaluate(async()=>{
        const {NebulaTunnel}=await import('/src/components/NebulaTunnel.ts');
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;
        const ctx=canvas.getContext('2d'),wall=new NebulaTunnel(true);
        const render=(travel,clock)=>{ctx.clearRect(0,0,320,200);wall.draw(ctx,320,200,travel,clock);return ctx.getImageData(0,0,320,200).data;};
        const first=render(40,1),next=render(40,1.4),depth=render(55,1),exit=render(158,6);
        let bright=0,coreAlpha=0,exitAlpha=0,changed=0,depthChanged=0;
        for(let y=0;y<200;y++)for(let x=0;x<320;x++){
          const i=(y*320+x)*4;
          if(first[i+2]>190&&first[i+3]>200)bright++;
          if(Math.hypot(x-159.5,y-99.5)<3)coreAlpha+=first[i+3];
          exitAlpha+=exit[i+3];
          if(Math.abs(first[i]-next[i])+Math.abs(first[i+1]-next[i+1])+Math.abs(first[i+2]-next[i+2])>6)changed++;
          if(Math.abs(first[i]-depth[i])+Math.abs(first[i+1]-depth[i+1])+Math.abs(first[i+2]-depth[i+2])>6)depthChanged++;
        }
        wall.dispose();return{bright,coreAlpha,exitAlpha,changed,depthChanged};
      });
      assert(volume.bright>100,'The rendered wall contains luminous blue gas without waiting for the optional atlas');
      assert(volume.depthChanged>500,'Travelling through curved walls produces parallax even with the gas clock fixed');
      assert.equal(volume.exitAlpha,0,'Passing the finite exit reveals the destination without a white overlay');
      assert(volume.changed>500,'Gas moves independently across the folded geometry');
      await writeFile(`${output}/nebula-volume.json`,JSON.stringify(volume));
    }
    await page.mouse.move(width/2, height/2);
    await page.mouse.wheel(120,0);
    await page.waitForURL('**/#/showcase/boom');
    for (let i=0;i<5;i++) await page.mouse.wheel(24,0);
    assert(page.url().endsWith('/boom'), 'Momentum cannot skip multiple destinations');
    await page.waitForTimeout(reducedMotion==='reduce'?50:1100);
    const newFocus=await worlds.locator('.worlds-gate.is-selected').boundingBox();
    assert(Math.abs(newFocus.width-(layout.gate.right-layout.gate.left))<2,'Each scroll repeats the same full-size focal presentation');
    if(name==='desktop'||name==='phone')await page.screenshot({path:`${output}/${name}-next-world.png`});
    await page.mouse.wheel(-120,0);
    await page.waitForURL('**/#/showcase/beatsync');
    await worlds.focus(); await worlds.press('End');
    await page.waitForURL('**/#/showcase/backup');
    await worlds.press('ArrowRight');
    await page.waitForTimeout(220);assert(page.url().endsWith('/backup'),'Right stops at the last world');
    await worlds.press('ArrowLeft');
    await page.waitForURL('**/#/showcase/security');
    await worlds.getByRole('button',{name:'Next world',exact:true}).click();
    await page.waitForURL('**/#/showcase/backup');
    assert(await worlds.getByRole('button',{name:'Next world',exact:true}).isDisabled(),'Next is disabled at the last world');
    await page.mouse.wheel(0,120);await page.waitForTimeout(220);
    assert(page.url().endsWith('/backup'),'Wheel stops at the last world');
    await page.waitForTimeout(reducedMotion==='reduce'?50:1100);
    assert.equal(await worlds.locator('.worlds-gate:not(.is-selected)').count(),8,'Visited worlds remain behind the last destination');
    if(name==='desktop')await page.screenshot({path:`${output}/${name}-last-world.png`});
    await worlds.focus();await worlds.press('Home'); await worlds.press('ArrowRight');
    await page.waitForURL('**/#/showcase/beatsync');
    await worlds.getByRole('link',{name:'Case study',exact:true}).click();
    await page.locator('.virgo-dialog[open]').getByRole('button',{name:'Close',exact:true}).click();
    await worlds.waitFor();
    assert(page.url().endsWith('/beatsync'),'Case study returns to the selected world');
    await worlds.getByRole('button',{name:'Enter world',exact:true}).click();
    await page.locator('dialog.screening-room[open]').waitFor();
    await page.locator('.screening-title').getByText('BeatSync',{exact:true}).waitFor();
    await page.locator('.screening-close').click();
    await worlds.waitFor();
    await worlds.getByRole('button',{name:'Back to Virgo',exact:true}).click();
    if (reducedMotion !== 'reduce') {
      const rollback = page.locator('.page-passage');
      await rollback.waitFor();
      assert.equal(await rollback.getAttribute('data-direction'), '-1');
      assert.equal(await rollback.getAttribute('data-phase'),'page-slide','Back reverses the vertical page transition');
      assert.equal(await rollback.locator('canvas').count(),0,'The Contact transition has no tunnel canvas');
      await page.screenshot({path:`${output}/${name}-rollback-slide.png`});
      await rollback.waitFor({state:'detached'});
    }
    await page.waitForURL('**/#/contact');
    const orbit = page.locator('.virgo-black-hole-orbit');
    await orbit.waitFor();
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6 > 5.8);
    const contactPose = await page.locator('.virgo-page').getAttribute('data-camera-pose');
    await page.waitForFunction(()=>Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6>5.995);
    await page.mouse.move(width*.5,height*.5);await page.mouse.wheel(0,120);
    if (reducedMotion !== 'reduce') {
      const passage = page.locator('.page-passage');
      await passage.waitFor();
      assert.equal(await passage.getAttribute('data-phase'),'page-slide');
      assert.equal(await passage.locator('canvas').count(),0,'Showcase is revealed by its real DOM, not a tunnel');
      await page.waitForFunction(()=>Number(document.querySelector('.page-passage')?.dataset.progress)>.4);
      const shifted=await worlds.boundingBox();assert(shifted.y>0&&shifted.y<height,'Showcase slides in from below');
      const pose=await page.locator('.virgo-page').getAttribute('data-camera-pose');
      assert.equal(pose,contactPose,'The page slide preserves the interstation camera');
      await page.screenshot({path:`${output}/${name}-showcase-slide.png`});
      await passage.waitFor({state:'detached'});
    }
    await worlds.waitFor();
    assert(page.url().endsWith('/mpoly'),'The black hole leads to the first world');
    assert.equal(await page.locator('.workspace-root').count(),0,'The main entry no longer mounts the workspace');
    // Both wheel axes stop at the first world, and still navigate within bounds.
    await page.mouse.move(width/2,height/2);
    await page.mouse.wheel(-120,0);
    await page.waitForTimeout(220);assert(page.url().endsWith('/mpoly'),'Horizontal wheel cannot wrap backward');
    assert(await worlds.getByRole('button',{name:'Previous world',exact:true}).isDisabled());
    await page.mouse.wheel(120,0);
    await page.waitForURL('**/#/showcase/beatsync');
    await page.waitForTimeout(220);
    await page.mouse.wheel(0,-120);
    await page.waitForURL('**/#/showcase/mpoly');
    await page.waitForTimeout(220);
    await page.mouse.wheel(0,-120);
    await page.waitForTimeout(220);assert(page.url().endsWith('/mpoly'),'Vertical wheel cannot wrap backward');
    await page.waitForTimeout(reducedMotion==='reduce'?50:1100);
    await page.screenshot({path:`${output}/${name}-mpoly.png`});
    if(name==='phone'){
      await page.mouse.move(width*.2,height*.45);await page.mouse.down();
      await page.mouse.move(width*.8,height*.45,{steps:12});await page.mouse.up();
      await page.waitForTimeout(220);assert(page.url().endsWith('/mpoly'),'Dragging cannot wrap backward');
    }
    const worldRoute=page.url();
    await worlds.getByRole('button',{name:'Let’s connect',exact:false}).click();
    await worlds.locator('.contact-mail').scrollIntoViewIfNeeded();
    await page.mouse.move(width/2,height*.7);await page.mouse.wheel(0,120);
    assert.equal(page.url(),worldRoute,'Vertical reading does not select another world');
    await page.screenshot({path:`${output}/${name}-contact.png`});
    await worlds.evaluate(node=>{node.scrollTop=0;});
    await worlds.getByRole('button',{name:'Back to Virgo',exact:true}).click();
    await page.waitForURL('**/#/contact');
    await page.locator('.page-passage').waitFor({state:'detached'});
    if (reducedMotion !== 'reduce') {
      // Cancel during the outward flight, preserving the current coordinate.
      await page.mouse.move(8,height/2);await page.mouse.wheel(0,120);
      await page.waitForFunction(() => Number(document.querySelector('.page-passage')?.getAttribute('data-progress')) > .35);
      if (name === 'phone') {
        await page.locator('.page-passage').evaluate(target => {
          const touch = clientY => new Touch({ identifier: 1, target, clientX: 190, clientY });
          target.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(200)], targetTouches: [touch(200)], changedTouches: [touch(200)], bubbles: true, cancelable: true }));
          target.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(320)], changedTouches: [touch(320)], bubbles: true, cancelable: true }));
        });
      } else await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('.page-passage')?.getAttribute('data-direction') === '-1');
      await page.locator('.page-passage').waitFor({state:'detached'});
      assert(page.url().endsWith('/contact'),'Escape or a downward touch gesture rolls back an unfinished passage');
      const pose = await page.locator('.virgo-page').getAttribute('data-camera-pose');
      assert(pose.split(',').map(Number).every(Number.isFinite), 'Rollback restores a valid camera pose');
    }
    if(name==='desktop'&&reducedMotion!=='reduce') {
      await page.mouse.move(8,height/2);await page.mouse.wheel(0,120);
      await page.waitForFunction(()=>Number(document.querySelector('.page-passage')?.dataset.progress)>.1);
      await page.evaluate(()=>{location.hash='#/skills';});
      await page.locator('.page-passage').waitFor({state:'detached'});
      await page.waitForTimeout(5200);
      assert.equal(await page.evaluate(()=>location.hash),'#/skills','External navigation cancels a pending tunnel handoff');
    }
    assert.deepEqual(errors,[],`${name}: no runtime errors`);
    results.push({name,layout,passed:true});
    console.log(`PASS: ${name} world layout, GLSL, navigation and rollback.`);
    await page.close();
  }
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,scope:layoutOnly?'layout':'full',results},null,2));
  console.log(layoutOnly?`PASS: showcase layout on ${results.length} viewports; navigation/passage checks were not selected.`:`PASS: world layout, wheel bursts/reversal, keyboard boundaries, case-study return, curved detail, black-hole entry on ${results.length} viewports.`);
 } catch(error) {
  const page = browser.contexts().at(-1)?.pages().at(-1);
  if (page) { await page.screenshot({path:output+'/failure.png'}); await writeFile(output+'/failure.json', JSON.stringify({errors:activeErrors, ...await page.evaluate(() => ({hash:location.hash, field:document.querySelector('.cosmic-portal-field')?.outerHTML, fieldStyle:document.querySelector('.cosmic-portal-field')&&Object.fromEntries(['display','width','height','background','zIndex'].map(key=>[key,getComputedStyle(document.querySelector('.cosmic-portal-field'))[key]])), root:document.querySelector('.worlds-showcase')?.outerHTML.slice(0,1500), body:document.body.innerText}))},null,2)); }
  await writeFile(`${output}/report.json`,JSON.stringify({passed:false,results,error:String(error)},null,2)); throw error;
} finally { await browser.close(); await server.close(); }
