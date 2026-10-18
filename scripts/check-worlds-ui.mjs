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
try {
  for (const [name, width, height, reducedMotion] of [['desktop',1440,900,'no-preference'],['tablet',762,715,'no-preference'],['phone',390,844,'no-preference'],['landscape',844,390,'no-preference'],['reduced',1440,900,'reduce']]) {
    if (selectedScenarios && !selectedScenarios.includes(name)) continue;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    await page.addInitScript(() => {
      window.__passageInk={accretion:0,exit:0};
      const stroke=CanvasRenderingContext2D.prototype.stroke;
      CanvasRenderingContext2D.prototype.stroke=function(...args){
        if(this.canvas.classList.contains('singularity-passage')){
          const phase=this.canvas.dataset.phase;
          if(phase==='accretion')window.__passageInk.accretion++;
          if(phase==='white-hole-exit')window.__passageInk.exit++;
        }
        return stroke.apply(this,args);
      };
    });
    const errors = [];
    activeErrors = errors;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if(message.type()==='error'&&/THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text()))errors.push(message.text());});
    await page.goto('http://127.0.0.1:5184/#/showcase/beatsync');
    await page.locator('[data-page-loader]').waitFor({ state: 'detached' });
    const worlds = page.locator('.worlds-showcase');
    await worlds.waitFor();
    const layout = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top:r.top,bottom:r.bottom,left:r.left,right:r.right }; };
      return { caption:rect('.worlds-caption'),footer:rect('.worlds-footer'),heading:rect('.worlds-heading'),gate:rect('.worlds-gate.is-selected') };
    });
    assert(layout.caption.bottom < layout.footer.top, `${name}: actions must not collide with footer`);
    assert(layout.caption.left >= 0 && layout.caption.right <= width, `${name}: caption fits viewport`);
    if (height < 600) {
      assert(layout.gate.right + 16 < layout.caption.left, 'Landscape leaves clear space between the selected portal and its caption');
      assert(layout.gate.top+(layout.gate.bottom-layout.gate.top)*.09>layout.heading.bottom+5,'Landscape keeps the projected portal rim below its heading');
    }
    assert.equal(await worlds.locator('.worlds-gate').count(),9);
    await page.waitForFunction(() => document.querySelector('.cosmic-portal-field')?.dataset.centerProtected==='true');
    await page.screenshot({ path: `${output}/${name}-worlds.png` });
    assert.equal(await worlds.locator('.cosmic-portal-field canvas').count(),1,'One renderer draws all connected portal rims');
    assert.equal(await worlds.locator('.cosmic-portal-field').getAttribute('data-portals'),'9','All nine destinations remain in the cosmic background on every viewport');
    const constellation=await worlds.locator('.worlds-gate').evaluateAll(gates=>gates.map(el=>{
      const r=el.getBoundingClientRect(),m=new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return{active:el.classList.contains('is-selected'),z:m.m43,x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,tilted:Math.abs(m.m13)+Math.abs(m.m23)};
    }));
    const front=constellation.find(p=>p.active),background=constellation.filter(p=>!p.active);
    assert(background.every(p=>p.z< -400&&p.width<front.width*.6),'Previous and upcoming portals occupy a smaller, genuinely recessed plane');
    assert(background.some(p=>p.tilted>.05),'The cosmic shell has real yaw/pitch, rather than flat scaled circles');
    assert(Math.max(...background.map(p=>p.y))-Math.min(...background.map(p=>p.y))>height*.25,'Portals surround the focal world vertically as well as horizontally');
    assert.equal(new Set(background.map(p=>Math.round(p.z))).size,8,'The bowl has varied depth, rather than a straight strip');
    const previewRatio=await worlds.locator('.worlds-gate.is-selected').evaluate(el=>el.querySelector('.worlds-window').offsetWidth/el.offsetWidth);
    assert(previewRatio>.70,'The central product preview fills the portal aperture');
    assert.equal(await worlds.locator('.worlds-gate.is-selected img').evaluate(el=>getComputedStyle(el).transform),'none','Authentic preview pixels remain on an undistorted plane');
    if(name==='desktop'){
      const optics=await page.evaluate(async()=>{
        const {SingularityLens}=await import('/src/components/SingularityLens.ts');
        const source=document.createElement('canvas');source.width=source.height=256;const s=source.getContext('2d');
        for(let y=0;y<256;y+=8)for(let x=0;x<256;x+=8){s.fillStyle=(x+y)%16?'#173f82':'#e2d6a0';s.fillRect(x,y,8,8);}
        const target=document.createElement('canvas');target.width=target.height=256;const ctx=target.getContext('2d');ctx.drawImage(source,0,0);
        const before=ctx.getImageData(0,0,256,256).data,lens=new SingularityLens(source);lens.draw(ctx,256,256,1);const after=ctx.getImageData(0,0,256,256).data;lens.dispose();
        let centerChanged=0,edgeChanged=0;
        for(let y=0;y<256;y++)for(let x=0;x<256;x++){const r=Math.hypot((x+.5)/256-.5,(y+.5)/256-.5)*2,offset=(y*256+x)*4;
          const changed=Math.abs(before[offset]-after[offset])+Math.abs(before[offset+1]-after[offset+1])+Math.abs(before[offset+2]-after[offset+2])>2;
          if(changed&&r<.55)centerChanged++;if(changed&&r>.8)edgeChanged++;
        }return{centerChanged,edgeChanged};
      });
      assert.equal(optics.centerChanged,0,'Real GLSL lensing/chromatic aberration leaves central pixels untouched');
      assert(optics.edgeChanged>100,'The same GLSL lens demonstrably warps peripheral pixels');
      await writeFile(`${output}/peripheral-optics.json`,JSON.stringify(optics));
    }
    await page.mouse.move(width/2, height/2);
    await page.mouse.wheel(0,120);
    await page.waitForURL('**/#/showcase/boom');
    for (let i=0;i<5;i++) await page.mouse.wheel(0,24);
    assert(page.url().endsWith('/boom'), 'Momentum cannot skip multiple destinations');
    await page.waitForTimeout(reducedMotion==='reduce'?50:1100);
    const newFocus=await worlds.locator('.worlds-gate.is-selected').boundingBox();
    assert(Math.abs(newFocus.width-(layout.gate.right-layout.gate.left))<2,'Each scroll repeats the same full-size focal presentation');
    if(name==='desktop'||name==='phone')await page.screenshot({path:`${output}/${name}-next-world.png`});
    await page.mouse.wheel(0,-120);
    await page.waitForURL('**/#/showcase/beatsync');
    await worlds.focus(); await worlds.press('End');
    await page.waitForURL('**/#/showcase/backup');
    await worlds.press('ArrowRight');
    assert(page.url().endsWith('/backup'),'The last world remains reachable without unwanted exit');
    await page.waitForTimeout(reducedMotion==='reduce'?50:1100);
    assert.equal(await worlds.locator('.worlds-gate:not(.is-selected)').count(),8,'Visited worlds remain behind the last destination');
    if(name==='desktop')await page.screenshot({path:`${output}/${name}-last-world.png`});
    await worlds.press('Home'); await worlds.press('ArrowRight');
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
      const rollback = page.locator('.singularity-passage');
      await rollback.waitFor();
      assert.equal(await rollback.getAttribute('data-direction'), '-1');
      await page.waitForFunction(() => document.querySelector('.singularity-passage')?.getAttribute('data-phase') === 'throat');
      assert.equal(await page.evaluate(()=>window.__passageInk.accretion),0,'The full approach and horizon crossing add no flat outline rings');
      await page.screenshot({path:`${output}/${name}-rollback-throat.png`});
      await rollback.waitFor({state:'detached'});
    }
    await page.waitForURL('**/#/contact');
    const portal = page.getByRole('button',{name:'Explore worlds through the black hole',exact:true});
    await portal.waitFor();
    await page.waitForFunction(() => Number(document.querySelector('.virgo-page')?.style.getPropertyValue('--flight-progress'))*6 > 5.8);
    await page.evaluate(() => {window.__spiralFrames=[];const record=()=>{const root=document.querySelector('.virgo-page'),p=document.querySelector('.singularity-passage');if(p?.getAttribute('data-phase')==='accretion'&&root.dataset.singularityPose)window.__spiralFrames.push(root.dataset.singularityPose.split(',').map(Number));if(window.__spiralFrames.length<900)requestAnimationFrame(record);};requestAnimationFrame(record);});
    await portal.locator('.virgo-portal-label').click();
    if (reducedMotion !== 'reduce') {
      const passage = page.locator('.singularity-passage');
      await passage.waitFor();
      await page.waitForTimeout(650);
      assert.equal(await passage.getAttribute('data-phase'),'accretion');
      assert.equal(await passage.getAttribute('data-scene-captured'),'true','The lens bends a captured WebGL scene, rather than an unrelated particle backdrop');
      assert.equal(await page.evaluate(()=>window.__passageInk.accretion),0,'The approach adds no flat ink trails over the ray-traced disk');
      await page.screenshot({path:`${output}/${name}-dust-entry.png`});
      await page.waitForFunction(() => Number(document.querySelector('.singularity-passage')?.getAttribute('data-seconds'))>1.25);
      await page.screenshot({path:`${output}/${name}-spiral-orbit.png`});
      await page.waitForFunction(() => document.querySelector('.singularity-passage')?.getAttribute('data-phase') === 'throat');
      const poses=await page.evaluate(()=>window.__spiralFrames);
      assert(poses.length>5,'The camera renders the spiral rather than skipping straight to the throat');
      assert(Math.max(...poses.map(p=>p[0]))-Math.min(...poses.map(p=>p[0]))>2,'The rendered camera orbits laterally');
      assert(Math.max(...poses.map(p=>p[3]))-Math.min(...poses.map(p=>p[3]))>Math.PI*2,'The rendered view follows a full inward orbit');
      await writeFile(`${output}/${name}-spiral-poses.json`,JSON.stringify(poses));
      await page.waitForFunction(() => Number(document.querySelector('.singularity-passage')?.getAttribute('data-seconds'))>4);
      assert.equal(await passage.getAttribute('data-tunnel-surface'),'layered-nebula-v1','The black-hole throat uses the detailed nebula surface');
      assert.equal(await passage.getAttribute('data-nebula-ready'),'true','The original nebula atlas loads before the throat crossing');
      await page.screenshot({path:`${output}/${name}-throat.png`});
      await page.waitForFunction(() => document.querySelector('.singularity-passage')?.getAttribute('data-phase') === 'white-hole-exit');
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(()=>window.__passageInk.exit),0,'The white-hole reveal has no extra radial streak overlay');
      assert.equal(await passage.getAttribute('data-exit-surface'),'finite-white-throat','The exit has a perspective mouth rather than an exposure overlay');
      await page.screenshot({path:`${output}/${name}-white-hole-exit.png`});
      await passage.waitFor({state:'detached'});
    }
    await worlds.waitFor();
    assert(page.url().endsWith('/mpoly'),'The black hole leads to the first world');
    assert.equal(await page.locator('.workspace-root').count(),0,'The main entry no longer mounts the workspace');
    // Negative wheel at the first world returns through the same passage.
    await page.mouse.move(width/2,height/2);
    await page.mouse.wheel(0,-120);
    await page.waitForURL('**/#/contact');
    await page.locator('.singularity-passage').waitFor({state:'detached'});
    if (reducedMotion !== 'reduce') {
      // Cancel during the outward flight, preserving the current coordinate.
      await portal.locator('.virgo-portal-label').click();
      await page.waitForFunction(() => Number(document.querySelector('.singularity-passage')?.getAttribute('data-seconds')) > .65);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('.singularity-passage')?.getAttribute('data-direction') === '-1');
      await page.locator('.singularity-passage').waitFor({state:'detached'});
      assert(page.url().endsWith('/contact'),'Escape rolls back an unfinished passage');
      const pose = await page.locator('.virgo-page').getAttribute('data-camera-pose');
      assert(pose.split(',').map(Number).every(Number.isFinite), 'Rollback restores a valid camera pose');
    }
    assert.deepEqual(errors,[],`${name}: no runtime errors`);
    results.push({name,layout,passed:true});
    console.log(`PASS: ${name} world layout, GLSL, navigation and rollback.`);
    await page.close();
  }
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,results},null,2));
  console.log(`PASS: world layout, wheel bursts/reversal, keyboard boundaries, case-study return, curved detail, black-hole entry on ${results.length} viewports.`);
 } catch(error) {
  const page = browser.contexts().at(-1)?.pages().at(-1);
  if (page) { await page.screenshot({path:output+'/failure.png'}); await writeFile(output+'/failure.json', JSON.stringify({errors:activeErrors, ...await page.evaluate(() => ({hash:location.hash, field:document.querySelector('.cosmic-portal-field')?.outerHTML, fieldStyle:document.querySelector('.cosmic-portal-field')&&Object.fromEntries(['display','width','height','background','zIndex'].map(key=>[key,getComputedStyle(document.querySelector('.cosmic-portal-field'))[key]])), root:document.querySelector('.worlds-showcase')?.outerHTML.slice(0,1500), body:document.body.innerText}))},null,2)); }
  await writeFile(`${output}/report.json`,JSON.stringify({passed:false,results,error:String(error)},null,2)); throw error;
} finally { await browser.close(); await server.close(); }
