import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const output=process.env.NEBULA_OUTPUT||'artifacts/nebula-passage';await mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:5186,strictPort:true}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});
const results=[];
try{
  for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['landscape',844,390]]){
    const page=await browser.newPage({viewport:{width,height}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
    await page.goto('http://127.0.0.1:5186/#/showcase/beatsync');
    const render=await page.evaluate(async({width,height})=>{
      const {SingularityLens}=await import('/src/components/SingularityLens.ts');
      const source=document.createElement('canvas');source.width=source.height=16;
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d'),lens=new SingularityLens(source);
      const deadline=performance.now()+10000;
      while(canvas.dataset.nebulaReady!=='true'){
        lens.drawTunnel(ctx,width,height,.5,4.4);
        if(performance.now()>deadline)throw new Error('Nebula atlas did not load');
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      const frames=[];
      for(const progress of [.25,.50,.78]){
        lens.drawTunnel(ctx,width,height,progress,3.2+progress*2.4);
        frames.push({progress,png:canvas.toDataURL('image/png').split(',')[1]});
      }
      lens.drawTunnel(ctx,width,height,.5,4.4);const first=ctx.getImageData(0,0,width,height).data.slice();
      lens.drawTunnel(ctx,width,height,.78,5.072);
      lens.drawTunnel(ctx,width,height,.5,4.4);const back=ctx.getImageData(0,0,width,height).data;
      let changed=0,lit=0,bright=0,count=0,chroma=0,sum=0,squared=0;
      for(let i=0;i<first.length;i+=4){if(first[i]!==back[i]||first[i+1]!==back[i+1]||first[i+2]!==back[i+2])changed++;}
      for(let i=0;i<back.length;i+=64){const value=Math.max(back[i],back[i+1],back[i+2]);sum+=value;squared+=value*value;if(value>40){lit++;chroma+=(value-Math.min(back[i],back[i+1],back[i+2]))/value;}if(value>140)bright++;count++;}
      const destination=()=>{for(let y=0;y<height;y+=32)for(let x=0;x<width;x+=32){ctx.fillStyle=(x+y)%64?'#294559':'#b1afa6';ctx.fillRect(x,y,32,32);}};
      destination();const original=ctx.getImageData(0,0,width,height).data.slice(),exitFrames=[],clear=[];
      for(const p of [0,.18,.42,.70]){
        destination();lens.drawExit(ctx,width,height,p,5.6+p*2.2);
        const pixels=ctx.getImageData(0,0,width,height).data;let untouched=0,centerChanged=0;
        for(let y=0;y<height;y+=4)for(let x=0;x<width;x+=4){const i=(y*width+x)*4;
          const equal=pixels[i]===original[i]&&pixels[i+1]===original[i+1]&&pixels[i+2]===original[i+2];
          if(equal)untouched++;else if(Math.hypot(x-width/2,y-height/2)<Math.min(width,height)*.06)centerChanged++;
        }
        clear.push(untouched);if(centerChanged)throw new Error('The white-hole mouth must show undistorted destination pixels');
        exitFrames.push({p,png:canvas.toDataURL('image/png').split(',')[1]});
      }
      destination();lens.drawExit(ctx,width,height,.18,5.996);const exitFirst=ctx.getImageData(0,0,width,height).data.slice();
      destination();lens.drawExit(ctx,width,height,.42,6.524);
      destination();lens.drawExit(ctx,width,height,.18,5.996);const exitBack=ctx.getImageData(0,0,width,height).data;
      let exitChanged=0;for(let i=0;i<exitFirst.length;i++)if(exitFirst[i]!==exitBack[i])exitChanged++;
      lens.dispose();return{frames,changed,lit:lit/count,bright:bright/count,contrast:Math.sqrt(squared/count-(sum/count)**2),chroma:chroma/Math.max(1,lit),exitFrames,clear,exitChanged};
    },{width,height});
    assert.equal(render.changed,0,`${name}: the real GLSL wall returns to exactly the same pixels when time rewinds`);
    assert(render.lit>.20,`${name}: detailed walls remain visible`);
    // The owner requested darker, less colorful walls; preserve detail contrast rather than a bright-pixel quota.
    assert(render.contrast>14,`${name}: neutral walls retain filament contrast and dark depth channels`);
    assert(render.chroma<.22,`${name}: tunnel walls keep a restrained neutral palette`);
    assert.equal(render.exitChanged,0,`${name}: the finite white-hole mouth rewinds to identical pixels`);
    assert(render.clear.every((n,i,a)=>i===0||n>=a[i-1]),`${name}: forward motion expands the mouth instead of shrinking a luminous ball`);
    assert.equal(render.clear.at(-1),Math.ceil(width/4)*Math.ceil(height/4),`${name}: crossing the mouth clears the entire destination`);
    assert.deepEqual(errors,[],`${name}: shader/runtime errors`);
    for(const frame of render.frames)await writeFile(`${output}/${name}-${frame.progress}.png`,Buffer.from(frame.png,'base64'));
    for(const frame of render.exitFrames)await writeFile(`${output}/${name}-white-hole-${frame.p}.png`,Buffer.from(frame.png,'base64'));
    results.push({name,rewindChanged:render.changed,lit:render.lit,bright:render.bright,contrast:render.contrast,chroma:render.chroma,clear:render.clear,exitRewindChanged:render.exitChanged});
    await page.close();console.log(`PASS nebula: ${name}, deterministic rewind and atlas projection.`);
  }
  const recovery=await browser.newPage({viewport:{width:640,height:360}}),recoveryErrors=[];
  recovery.on('pageerror',error=>recoveryErrors.push(error.message));
  recovery.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(m.text()))recoveryErrors.push(m.text());});
  await recovery.route('**/wormhole-nebula-v1.webp',route=>route.abort());
  await recovery.goto('http://127.0.0.1:5186/#/showcase/beatsync');
  const fallback=await recovery.evaluate(async()=>{
    const {SingularityLens}=await import('/src/components/SingularityLens.ts');
    const source=document.createElement('canvas');source.width=source.height=16;
    const target=document.createElement('canvas');target.width=640;target.height=360;
    const ctx=target.getContext('2d'),lens=new SingularityLens(source);
    await new Promise(resolve=>setTimeout(resolve,300));lens.drawTunnel(ctx,640,360,.5,4.4);
    const pixels=ctx.getImageData(0,0,640,360).data;let lit=0,total=0;
    for(let i=0;i<pixels.length;i+=64){if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>40)lit++;total++;}
    const result={ready:target.dataset.nebulaReady,lit:lit/total};lens.dispose();return result;
  });
  assert.equal(fallback.ready,'false','Missing assets use procedural recovery');
  assert(fallback.lit>.2,'The fallback remains visible without the atlas');
  assert.deepEqual(recoveryErrors,[],'Asset failure does not break the GPU pipeline');
  await recovery.close();results.push({name:'asset-failure',...fallback});
  console.log('PASS nebula: missing texture recovers without a blank frame.');
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,results},null,2));
}catch(error){await writeFile(`${output}/report.json`,JSON.stringify({passed:false,results,error:String(error)},null,2));throw error;}
finally{await browser.close();await server.close();}
