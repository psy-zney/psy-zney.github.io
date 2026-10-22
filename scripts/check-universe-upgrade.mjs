import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await readFile('public/model/universe-only.json','utf8'));
assert.equal(sha(await readFile(manifest.source)),manifest.sourceSha256,'The original main.glb remains byte-identical');
const bytes=await readFile(`public/${manifest.asset.slice(2)}`);
assert.equal(bytes.length,manifest.bytes);assert.equal(sha(bytes),manifest.sha256);
assert(bytes.length<2_000_000,'The shared sky stays under 2MB');
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes),root=doc.getRoot();
assert.equal(root.listMeshes().length,1,'No desks, cabinets or other furniture survive in the sky derivative');
const sky=root.listNodes().find(node=>node.getMesh());assert.equal(sky.getName(),'MainUniverseSky');
const position=sky.getMesh().listPrimitives()[0].getAttribute('POSITION');
const min=position.getMin([]),max=position.getMax([]);
for(let i=0;i<3;i++)assert(Math.abs(min[i]+max[i])<.05,'The camera is in the geometric centre');
assert(Math.max(...max)<1001 && Math.min(...min)>-1001);
assert(root.listTextures().some(texture=>texture.getMimeType()==='image/webp'),'The original sky texture is preserved in a web format');
const server=await createServer({server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try {
  const {originalIntroMedia}=await server.ssrLoadModule('/src/data/introMedia.ts');
  assert.deepEqual(originalIntroMedia(null),{url:null,poster:null});
  for(const url of ['javascript:alert(1)','http://example.org/a.mp4','./video/universe-tunnel-reference.mp4'])assert.equal(originalIntroMedia({url}).url,null);
  assert.equal(originalIntroMedia({url:'https://example.org/original.mp4'}).url,'https://example.org/original.mp4');
  const configured=originalIntroMedia(JSON.parse(await readFile('public/media/intro-source.json','utf8')));
  assert.equal(configured.url,null,'An unavailable original is explicit; there is no counterfeit recording fallback');
  const {ContactLanding}=await server.ssrLoadModule('/src/components/ContactLanding.tsx');
  for(const lang of ['vie','eng']) {
    const html=renderToStaticMarkup(React.createElement(ContactLanding,{lang}));
    for(const href of ['mailto:lequangkhanh295@gmail.com','https://github.com/psy-zney','https://www.linkedin.com/in/psy-zney295','#/cv/web','#/cosmos'])assert(html.includes(href));
    assert(html.includes('contact-landing-title')&&!html.includes('undefined'));
  }
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  try {
    const windowMock=new EventTarget(),documentMock=new EventTarget();
    documentMock.hidden=false;documentMock.documentElement={dataset:{}};
    let contexts=0,oscillators=0,bufferStarts=0,closed=0;const gains=[];
    const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},cancelAndHoldAtTime(){}});
    const connection={connect(){return this;},disconnect(){}};
    windowMock.AudioContext=class {
      state='running';currentTime=1;sampleRate=24000;destination={};
      constructor(){contexts++;}
      createGain(){const gain={...connection,gain:param()};gains.push(gain);return gain;}
      createDynamicsCompressor(){return{...connection,threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
      createOscillator(){oscillators++;return{...connection,frequency:param(),detune:param(),start(){},stop(){}};}
      createBiquadFilter(){return{...connection,frequency:param(),Q:param()};}
      createBuffer(channels,length,rate){const samples=Array.from({length:channels},()=>new Float32Array(length));return{duration:length/rate,getChannelData(i){return samples[i];}};}
      createBufferSource(){return{...connection,playbackRate:param(),start(){bufferStarts++;},stop(){}};}
      async close(){closed++;}
    };
    globalThis.window=windowMock;globalThis.document=documentMock;
    const {PortfolioAudioSystem}=await server.ssrLoadModule('/src/utils/portfolioAudio.ts');
    const {dbGain,SCENE_MIX}=await server.ssrLoadModule('/src/utils/portfolioSoundDesign.ts');
    const audio=new PortfolioAudioSystem();
    audio.playTypingTick();assert.equal(contexts,0,'Typing cannot autoplay');
    audio.unlockContext();assert.equal(contexts,1);assert.equal(bufferStarts,2,'Bed and pulse use exactly two persistent score buffers');
    for(let i=0;i<1000;i++)audio.playScroll(i%2?1:-1);
    assert.equal(oscillators,1,'Dense scrolling reuses exactly one wheel voice alongside the buffer score');
    audio.playTypingTick();assert.equal(bufferStarts,3);
    audio.setMuted(true);audio.playTypingTick();assert.equal(bufferStarts,3);assert.equal(gains[0].gain.value,0);
    documentMock.hidden=true;documentMock.dispatchEvent(new Event('visibilitychange'));audio.setMuted(false);
    assert.equal(gains[0].gain.value,0,'Unmuting a hidden tab cannot make it audible');
    audio.playTypingTick();assert.equal(bufferStarts,3,'Hidden typing is discarded');
    documentMock.hidden=false;documentMock.dispatchEvent(new Event('visibilitychange'));
    assert.equal(gains[0].gain.value,.65);audio.setScene('contact');assert.equal(gains[2].gain.value,dbGain(SCENE_MIX.contact.music));
    audio.dispose();assert.equal(closed,1);
  }finally{globalThis.window=previousWindow;globalThis.document=previousDocument;}
  console.log('PASS: original GLB hash, sky-only centred geometry, texture/size budget, media validation, bilingual Contact and mixer unlock/1000 wheel packets/mute/hidden/cleanup.');
}finally{await server.close();}
