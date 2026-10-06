import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Vector3, Ray } from 'three';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
globalThis.window = { location: { hash: '#/workspace' }, matchMedia: () => ({ matches: false }) };
try {
  {
    const { ScreenGifFrames } = await server.ssrLoadModule('/src/components/workspace/screenGif.ts');
    const { GifReader } = await import('omggif');
    const gifBytes = new Uint8Array(await readFile('public/img/screenDesktop.gif'));
    const gifPlayer = new ScreenGifFrames(gifBytes), original = new GifReader(gifBytes);
    const reference = new Uint8Array(original.width * original.height * 4);
    let at = 0;
    for (let frame = 0; frame < original.numFrames(); frame++) {
      original.decodeAndBlitFrameRGBA(frame, reference);
      gifPlayer.sample(at);
      assert.deepEqual(gifPlayer.pixels, reference, `Screen GIF frame ${frame} preserves the original image`);
      at += Math.max(20, original.frameInfo(frame).delay * 10);
    }
    assert(gifPlayer.pixels.byteLength <= 512 * 1024, 'GIF keeps one bounded RGBA frame');
    const last = gifPlayer.pixels.slice(); gifPlayer.sample(gifPlayer.duration);
    assert.notDeepEqual(gifPlayer.pixels, last, 'GIF loops back to its first frame');
    assert.equal(gifPlayer.sample(gifPlayer.duration + 1), false, 'Same GIF frame does not upload again');
  }
  const { projects, capabilities } = await server.ssrLoadModule('/src/data/portfolio.ts');
  const { parseWorkspaceRoute, parsePublicDocumentRoute, isWorkspaceHash, DOCUMENT_SECTIONS, OS_APPS } = await server.ssrLoadModule('/src/utils/appRoutes.ts');
  for (const project of projects) { assert.equal(parsePublicDocumentRoute(`#/project/${project.id}`).projectId, project.id); for (const section of DOCUMENT_SECTIONS) assert.equal(parsePublicDocumentRoute(`#/project/${project.id}/${section}`).section, section); }
  for (const hash of ['#/project/no', '#/project/beatsync/no', '#/project/beatsync/overview/bad', '#/cv/no']) assert.equal(parsePublicDocumentRoute(hash).kind, 'missing');
  capabilities.forEach((item,index)=>assert.equal(parsePublicDocumentRoute(`#/skills/${item.id}`).index,index));assert.equal(parsePublicDocumentRoute('#/skills/no').kind,'missing');
  assert(isWorkspaceHash('#/workspace/os/home')); assert(!isWorkspaceHash('#/workspace-fake'));
  assert.equal(parseWorkspaceRoute('#/workspace').kind, 'room');
  for (const track of ['web','mobile']) { assert.equal(parseWorkspaceRoute(`#/workspace/resume/${track}`).track, track); assert.equal(parseWorkspaceRoute(`#/workspace/os/documents/resume/${track}`).track, track); }
  for (const app of OS_APPS) assert.equal(parseWorkspaceRoute(`#/workspace/os/${app}`).app, app);
  for (const project of projects) for (const section of DOCUMENT_SECTIONS) {
    assert.equal(parseWorkspaceRoute(`#/workspace/library/${project.id}/${section}`).projectId, project.id);
    assert.equal(parseWorkspaceRoute(`#/workspace/os/projects/${project.id}/${section}`).section, section);
  }
  for (const route of ['#/workspace/resume/no', '#/workspace/library/no/overview', '#/workspace/library/beatsync/no', '#/workspace/os/no', '#/workspace/contact//bad', '#/workspace/library/beatsync/overview//bad', '#/workspace/os/projects/beatsync/overview//bad']) assert.equal(parseWorkspaceRoute(route).kind, 'missing', route);
  const { CELESTIAL_PROJECTS, CELESTIAL_SKILLS } = await server.ssrLoadModule('/src/data/celestialRegistry.ts');
  assert.deepEqual(new Set(CELESTIAL_PROJECTS.map(p => p.id)), new Set(projects.map(p => p.id)));
  assert.deepEqual(new Set(CELESTIAL_SKILLS.map(p => p.id)), new Set(capabilities.map(p => p.id)));
  const { projectDocuments } = await server.ssrLoadModule('/src/data/projectDocuments.ts');
  for (const p of CELESTIAL_PROJECTS) if (p.satellite) assert(projectDocuments.some(doc => doc.id === `${p.id}/${p.satellite}`));
  const { orbitPosition } = await server.ssrLoadModule('/src/data/virgoFlight.ts');
  const { orbitRadii, planetRadius, ORBIT_PLANE, SPACE_LAYOUT } = await server.ssrLoadModule('/src/data/virgoSpace.ts');
  assert(Math.abs(Math.hypot(ORBIT_PLANE.vertical,ORBIT_PLANE.depth)-1)<1e-12);
  const extent = (entry, index) => planetRadius(index) * (entry.satellite ? 2.98 : entry.ring ? 2.10 : 1.04);
  for (const mobile of [false,true]) {
    const radii = orbitRadii(false,mobile), scale = mobile ? .72 : 1.06;
    for (let phase = 0; phase < 1000; phase++) {
      const time = phase / 999 * 220;
      const points = projects.map((_, i) => new Vector3(...orbitPosition(i,10,3,false,1,time,mobile)));
      for (let i=0;i<points.length;i++) {
        assert(Math.abs(points[i].length()-radii[CELESTIAL_PROJECTS[i].orbit])<1e-7);
        assert((points[i].length()-extent(CELESTIAL_PROJECTS[i],i))*scale>10.4+2);
        for(let j=i+1;j<points.length;j++) assert(points[i].distanceTo(points[j])>extent(CELESTIAL_PROJECTS[i],i)+extent(CELESTIAL_PROJECTS[j],j)+2);
      }
    }
    const belt = mobile ? [62,67] : [SPACE_LAYOUT.asteroidInner,SPACE_LAYOUT.asteroidOuter];
    CELESTIAL_PROJECTS.forEach((entry,i)=> { const r=radii[entry.orbit], e=extent(entry,i); assert(r+e+2 < belt[0]-1 || r-e-2 > belt[1]+1); });
  }
  const { narrativeSample } = await server.ssrLoadModule('/src/data/virgoNarrative.ts');
  assert.equal(narrativeSample(6).reveal,1); assert(narrativeSample(6).interactive); assert(!narrativeSample(2.94).interactive);
  const { workspaceMotion } = await server.ssrLoadModule('/src/data/motionTokens.ts');
  const desktopMotion = workspaceMotion(false), phoneMotion = workspaceMotion(true), reducedMotion = workspaceMotion(true,true);
  assert.equal(desktopMotion.readerAt + desktopMotion.readerEnter,770);
  assert.equal(phoneMotion.readerAt + phoneMotion.readerEnter,500);
  for (const timing of [desktopMotion,phoneMotion]) {
    assert(timing.readerAt < timing.focus,'The reader overlaps camera focus instead of waiting for it');
    assert(timing.readerReturnAt < timing.readerExit,'Camera return begins before the reader exits');
    assert(timing.readerReturnAt + timing.readerReturn <= 600);
    assert.equal(timing.monitorExit + timing.monitorReturn,600);
  }
  assert.equal(desktopMotion.monitorAt + desktopMotion.monitorEnter,900);
  assert.equal(phoneMotion.monitorAt + phoneMotion.monitorEnter,500);
  assert.equal(reducedMotion.focus,0); assert.equal(reducedMotion.monitorFocus,0); assert.equal(reducedMotion.readerEnter,150);
  const { workspaceReducer } = await server.ssrLoadModule('/src/components/workspace/workspaceState.ts');
  let phase='loading'; phase=workspaceReducer(phase,{type:'ready'});phase=workspaceReducer(phase,{type:'lock',value:true});assert.equal(phase,'exploring');
  phase=workspaceReducer(phase,{type:'focus',monitor:true});assert.equal(workspaceReducer(phase,{type:'lock',value:false}),phase);
  phase=workspaceReducer(phase,{type:'route',kind:'os',ready:true,returning:false});assert.equal(phase,'osActive');
  phase=workspaceReducer(phase,{type:'route',kind:'room',ready:true,returning:true});assert.equal(phase,'returning');assert.equal(workspaceReducer(phase,{type:'returned'}),'overview');
  assert.equal(workspaceReducer('overview',{type:'error'}),'errorFallback');
  const { workspaceAssets, workspaceItems } = await server.ssrLoadModule('/src/data/workspaceManifest.ts');
  const { proxyHit, isWorkspaceTap } = await server.ssrLoadModule('/src/components/workspace/workspacePicking.ts');
  const tapStart = { startX: 10, startY: 20, at: 0, id: 1, moved: false, pointerType:'mouse' };
  assert(isWorkspaceTap(tapStart,{pointerId:1,clientX:16,clientY:20},500));
  assert(!isWorkspaceTap(tapStart,{pointerId:1,clientX:16.1,clientY:20},250),'Mouse dragging cancels a click even if move events were missed');
  assert(!isWorkspaceTap(tapStart,{pointerId:1,clientX:10,clientY:20},501));
  assert(isWorkspaceTap({...tapStart,pointerType:'touch'},{pointerId:1,clientX:22,clientY:20},450),'Touch tolerates finger jitter and a deliberate tap');
  assert(!isWorkspaceTap({...tapStart,pointerType:'touch'},{pointerId:1,clientX:22.1,clientY:20},200));
  assert(!isWorkspaceTap({...tapStart,pointerType:'touch'},{pointerId:1,clientX:10,clientY:20},451),'A long press never opens a document');
  assert(!isWorkspaceTap(tapStart,{pointerId:2,clientX:10,clientY:20},10));
  assert(!isWorkspaceTap({...tapStart,moved:true},{pointerId:1,clientX:10,clientY:20},10));
  assert(!isWorkspaceTap(null,{pointerId:1,clientX:10,clientY:20},10));
  const screen=new Vector3(...workspaceAssets.anchors.screen.center), origin=new Vector3(5,10,.5), ray=new Ray(origin,screen.clone().sub(origin).normalize());
  assert.equal(proxyHit(ray),'screen'); assert.equal(proxyHit(ray,.1),null,'An occluding surface must block a proxy');
  const { walkPosition,roomViewPose,roomViews,WALK_AREA } = await server.ssrLoadModule('/src/components/workspace/workspaceNavigation.ts');
  for (const portrait of [false,true]) for (const view of roomViews) {
    const preset = roomViewPose(view.id,portrait);
    assert(preset.position[0]>=WALK_AREA.minX && preset.position[0]<=WALK_AREA.maxX);
    assert(preset.position[2]>=WALK_AREA.minZ && preset.position[2]<=WALK_AREA.maxZ);
    assert(preset.position.every(Number.isFinite) && preset.target.every(Number.isFinite));
  }
  const from = new Vector3(11,10,0);
  const straight=walkPosition(from,0,{x:0,y:1},.04),diagonal=walkPosition(from,0,{x:1,y:1},.04);
  assert(Math.abs(from.distanceTo(straight)-from.distanceTo(diagonal))<1e-10,'Diagonal movement must not be faster');
  const resumed=walkPosition(from,0,{x:0,y:1},30); assert(from.distanceTo(resumed)<=.161,'Returning to a suspended tab cannot jump across the room');
  let walker=from.clone(); for(let i=0;i<10000;i++) walker=walkPosition(walker,Math.PI/2,{x:0,y:1},.05);
  assert.equal(walker.x,WALK_AREA.minX); assert.equal(walker.y,from.y,'Walking stays at eye height, outside source furniture');
  assert.deepEqual(walkPosition(from,.8,{x:0,y:0},1).toArray(),from.toArray(),'Releasing controls stops translation');
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const original=await readFile('public/model/main.glb');assert.equal(createHash('sha256').update(original).digest('hex'),workspaceAssets.original.sha256);
  for(const [tier,asset] of Object.entries(workspaceAssets.assets)) {
    const bytes=await readFile(`public/${asset.path.replace('./','')}`);assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
    const doc=await io.readBinary(bytes);for(const item of workspaceItems) assert(doc.getRoot().listNodes().some(node=>node.getExtras().workspaceItem===item.id),`${tier}/${item.id}`);
    assert(asset.bytes < {low:4e6,medium:9e6,high:16e6}[tier]);assert(asset.triangles < {low:90000,medium:180000,high:350000}[tier]);const screenAndShadow=768*432*4*4/3+(tier==='high'?1024*1024*4:0);assert(asset.textureGPUBytesEstimate+screenAndShadow < {low:48,medium:96,high:192}[tier]*1024**2);
  }
  const { ProjectLibrary } = await server.ssrLoadModule('/src/components/documents/ProjectLibrary.tsx');
  const html=renderToStaticMarkup(React.createElement(ProjectLibrary,{lang:'eng'}));assert.equal((html.match(/href="#\/workspace\/library\//g)||[]).length,10);
  const { ProjectDocument }=await server.ssrLoadModule('/src/components/documents/ProjectDocument.tsx');
  for(const project of projects) for(const section of DOCUMENT_SECTIONS) { const markup=renderToStaticMarkup(React.createElement(ProjectDocument,{projectId:project.id,section,lang:'eng',onSection(){}}));assert(markup.includes(project.name));assert(!markup.includes('undefined')); }
  const { deviceQuaternion, orientationSample }=await server.ssrLoadModule('/src/components/workspace/useDeviceLook.ts');
  for(const angle of [0,90,180,270]) assert(Math.abs(deviceQuaternion(12,35,8,angle).length()-1)<1e-12);
  assert.equal(orientationSample(null,null,null,0),null); assert.equal(orientationSample(null,35,8,0),null); assert.equal(orientationSample(0,NaN,8,90),null); assert.equal(orientationSample(0,35,8,Infinity),null);
  const { WorkspaceAudio } = await server.ssrLoadModule('/src/utils/workspaceAudio.ts');
  let contexts = 0, starts = 0, closes = 0; const stops = [];
  const parameter = () => ({ value: 0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, setTargetAtTime(){}, cancelScheduledValues(){} });
  globalThis.document = { hidden: false };
  globalThis.AudioContext = class {
    state = 'running'; currentTime = 0; destination = {};
    constructor() { contexts++; }
    createGain() { return { gain: parameter(), connect(){}, disconnect(){} }; }
    createOscillator() { return { frequency: parameter(), connect(){}, disconnect(){}, start(){ starts++; }, stop(at){ stops.push(at); }, onended: null }; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; closes++; }
  };
  const audio = new WorkspaceAudio(); audio.play('select'); assert.equal(starts, 0, 'No autoplay');
  await audio.enable(true); for(let i=0;i<7;i++) audio.play('select'); assert.equal(starts,6,'Bounded six-voice pool'); assert.equal(contexts,1);
  const beforeMute=stops.length; await audio.enable(false); assert(stops.slice(beforeMute).every(at=>at<=.1),'Mute must stop within 100ms'); audio.play('confirm'); assert.equal(starts,6);
  audio.dispose(); assert.equal(closes,1);
  const hiddenAudio = new WorkspaceAudio(); await hiddenAudio.enable(true); document.hidden=true; hiddenAudio.play('select'); assert.equal(starts,6,'Hidden cues are dropped'); document.hidden=false; assert.equal(starts,6,'No cue replay on foreground'); hiddenAudio.dispose();
  delete globalThis.document; delete globalThis.AudioContext;
  console.log('PASS: public/workspace routes, state transitions, overlapping desktop/mobile/reduced timelines, 1000 orbit phases, collision envelopes, proxy occlusion, tap/drag cancellation, all asset hashes/anchors/budgets, 40 documents, invalid sensor samples/quaternion normalization, and opt-in/mute/hidden/six-voice audio lifecycle.');
} finally { await server.close(); delete globalThis.window; }
