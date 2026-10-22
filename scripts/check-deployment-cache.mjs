import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {Script} from 'node:vm';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';

const deployment=JSON.parse(await readFile('dist/deployment.json','utf8'));
const deployedWorker=await readFile('dist/deployment-worker.js','utf8');
assert.match(deployment.version,/^[a-zA-Z0-9._-]{1,128}$/);
assert(deployedWorker.includes('self.deploymentVersion = '+JSON.stringify(deployment.version)));
new Script(deployedWorker);
for(const directory of await readdir('public',{withFileTypes:true}))if(directory.isDirectory())assert(deployedWorker.includes(JSON.stringify(directory.name+'/')),'Every public asset directory is versioned');
const index=await readFile('dist/index.html','utf8');
assert(index.includes('data-deployment-gate')&&index.includes(JSON.stringify(deployment.version)),'Cached HTML has an independent deployment gate');
const entry=index.match(/type="module"[^>]*src="([^"]+)"/)[1];
assert((await readFile(resolve('dist',entry),'utf8')).includes(deployment.version),'The bootstrap and worker use the same deployment version');
console.log('PASS: production version metadata, valid worker, all public folders and matching bootstrap.');
if(process.argv.includes('--static'))process.exit(0);

const output='artifacts/deployment-cache';await mkdir(output,{recursive:true});
const {build}=createRequire(import.meta.resolve('vite'))('esbuild');
const workerSource=await readFile('src/deployment-worker.js','utf8');
const gateSource=await readFile('scripts/templates/deployment-gate.js','utf8');
const entries={};
for(const version of ['A','B']){
 const built=await build({stdin:{contents:`import {prepareDeployment} from './src/utils/deploymentCache'; if(await prepareDeployment()){document.body.dataset.ready='${version}';document.querySelector('h1').textContent='Version ${version}';}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',define:{__DEPLOYMENT_VERSION__:JSON.stringify(version),'import.meta.env.DEV':'false','import.meta.env.BASE_URL':JSON.stringify('./')}});
 entries[version]=built.outputFiles[0].text;
}
let version='A',metadataError=false,metadataOverride=null;const requests=[],results=[],errors=[];
const html=current=>`<!doctype html><title>Deployment cache test</title><script>${gateSource.replace('__DEPLOYMENT_VERSION__',JSON.stringify(current))}</script><h1>Opening</h1><script type="module" src="./main-${current}.js"></script>`;
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');requests.push({path:url.pathname,query:url.search,range:req.headers.range});
  res.setHeader('Access-Control-Allow-Origin','*');
  if(url.pathname.startsWith('/production/')){
   const root=resolve('dist'),path=resolve(root,decodeURIComponent(url.pathname.slice('/production/'.length))||'index.html');
   if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
   const body=await readFile(path);res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(body);return;
  }
  res.setHeader('Cache-Control','public,max-age=31536000');
  if(url.pathname==='/portfolio/'||url.pathname==='/portfolio/index.html'){res.setHeader('Content-Type','text/html');res.end(html(version));}
  else if(url.pathname==='/portfolio/deployment.json'){if(metadataError)res.writeHead(503).end();else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version:metadataOverride??version}));}}
  else if(url.pathname==='/portfolio/deployment-worker.js'){res.setHeader('Content-Type','text/javascript');res.end(`self.deploymentVersion=${JSON.stringify(version)};self.deploymentAssetFolders=['img/','file/','model/'];self.deploymentAssetFiles=[];\n`+workerSource);}
  else if(url.pathname.startsWith('/portfolio/main-')){res.setHeader('Content-Type','text/javascript');res.end(entries[url.pathname.includes('-B.')?'B':'A']);}
  else if(url.pathname==='/portfolio/img/pixel.svg'){res.setHeader('Content-Type','image/svg+xml');res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${version==='A'?'red':'blue'}"/></svg>`);}
  else if(url.pathname==='/portfolio/file/cv.html'){res.setHeader('Content-Type','text/html');res.end('<h1>CV '+version+'</h1>');}
  else if(req.headers.range){res.writeHead(206,{'Content-Range':'bytes 0-3/8'}).end(version.repeat(4));}
  else res.end(version);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.UI_CHROME_PATH});let page;
const ready=async(expected)=>page.waitForFunction(expected=>document.body.dataset.ready===expected,expected);
const done=message=>{results.push(message);console.log('PASS: '+message);};
try{
 const context=await browser.newContext();page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/portfolio/seed');
 await page.evaluate(async()=>{localStorage.setItem('portfolio-sound','off');localStorage.setItem('zney-language','vie');await(await caches.open('legacy-site-cache')).put('/portfolio/img/old.png',new Response('old'));});
 await page.goto(base+'/portfolio/?keep=1#/project/beatsync');await ready('A');
 assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('?v=A')),true);
 assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
 assert.equal(await page.evaluate(()=>localStorage.getItem('portfolio-sound')),'off');
 assert.equal(await page.evaluate(()=>localStorage.getItem('zney-language')),'vie');
 assert.equal(await page.evaluate(async()=>await(await fetch('./img/version.txt')).text()),'A');
 const initialAssetRequests=requests.filter(r=>r.path==='/portfolio/img/version.txt').length;
 assert.equal(await page.evaluate(async()=>await(await fetch('./img/version.txt')).text()),'A');
 assert.equal(requests.filter(r=>r.path==='/portfolio/img/version.txt').length,initialAssetRequests,'Unchanged deployments reuse the HTTP asset cache');
 await page.evaluate(async()=>{await(await caches.open('same-version-cache')).put('/portfolio/img/cache.png',new Response('cached'));});
 await page.reload();await ready('A');assert.deepEqual(await page.evaluate(()=>caches.keys()),['same-version-cache']);
 done('First deployment clears old caches; the same version retains cache and preferences.');
 version='B';await page.reload();await ready('B');assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
 assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('?v=B')),true);
 assert.equal(await page.evaluate(async()=>await(await fetch('./img/version.txt')).text()),'B');
 assert(requests.some(r=>r.path==='/portfolio/img/version.txt'&&r.query==='?__deploy=A'));
 assert(requests.some(r=>r.path==='/portfolio/img/version.txt'&&r.query==='?__deploy=B'));
 assert(page.url().endsWith('?keep=1#/project/beatsync'));done('A → B replaces the worker and invalidates HTTP asset keys while preserving route/query.');
 const media=await page.evaluate(async()=>{const response=await fetch('./model/range.bin',{headers:{Range:'bytes=0-3'}});return{status:response.status,text:await response.text()};});assert.deepEqual(media,{status:206,text:'BBBB'});
 await page.evaluate(()=>{const image=new Image();image.id='pixel';image.src='./img/pixel.svg';document.body.append(image);const frame=document.createElement('iframe');frame.id='cv';frame.src='./file/cv.html';document.body.append(frame);});
 await page.waitForFunction(()=>document.querySelector('#pixel').naturalWidth===8);await page.frameLocator('#cv').getByRole('heading',{name:'CV B'}).waitFor();
 await page.evaluate(async()=>{await fetch('./stats');await fetch('/another-project/app.js');});
 assert(requests.some(r=>r.path==='/portfolio/img/pixel.svg'&&r.query==='?__deploy=B'));
 assert(requests.some(r=>r.path==='/portfolio/file/cv.html'&&r.query==='?__deploy=B'));
 assert(requests.filter(r=>r.path==='/portfolio/stats'||r.path==='/another-project/app.js').every(r=>r.query===''));done('Images, iframe HTML and Range media update; APIs and other project paths are unaffected.');
 await context.close();
 const stale=await browser.newContext({serviceWorkers:'block'});page=await stale.newPage();let navigations=0;
 await page.route(url=>url.pathname==='/portfolio/'&&!url.searchParams.has('__deployment'),route=>{navigations++;return route.fulfill({contentType:'text/html',body:html('A')});});
 await page.goto(base+'/portfolio/?keep=2#/cv/backend');await ready('B');assert.equal(navigations,1);assert(page.url().includes('keep=2')&&page.url().endsWith('#/cv/backend'));
 done('Stale HTML detects the new deployment and reloads once with its route intact.');await stale.close();
 const missing=await browser.newContext();page=await missing.newPage();
 await page.route(url=>url.pathname==='/portfolio/'&&!url.searchParams.has('__deployment'),route=>route.fulfill({contentType:'text/html',body:`<!doctype html><script>${gateSource.replace('__DEPLOYMENT_VERSION__',JSON.stringify('A'))}</script><h1>Old HTML</h1><script type="module" src="./removed-entry.js"></script>`}));
 await page.route('**/removed-entry.js',route=>route.fulfill({status:404,body:'Removed by deployment'}));
 await page.goto(base+'/portfolio/?keep=3#/projects/all');await ready('B');assert(page.url().includes('keep=3')&&page.url().endsWith('#/projects/all'));done('Cached HTML recovers even when its old JavaScript entry no longer exists.');await missing.close();
 const stubborn=await browser.newContext({serviceWorkers:'block'});page=await stubborn.newPage();let attempts=0;
 await page.route(url=>url.pathname==='/portfolio/',route=>{attempts++;return route.fulfill({contentType:'text/html',body:html('A')});});
 await page.goto(base+'/portfolio/');await ready('A');assert.equal(attempts,2);await page.waitForTimeout(500);assert.equal(attempts,2);done('A stale CDN cannot create an infinite reload loop.');await stubborn.close();
 const privateContext=await browser.newContext();await privateContext.addInitScript(()=>{for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new DOMException('Storage disabled','SecurityError');}});});
 page=await privateContext.newPage();await page.goto(base+'/portfolio/');await ready('B');assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('?v=B')),true);done('Disabled Web Storage still permits fresh assets and normal entry.');await privateContext.close();
 metadataError=true;const offline=await browser.newContext();page=await offline.newPage();await page.goto(base+'/portfolio/');await ready('B');done('Unavailable version metadata does not block entry.');await offline.close();metadataError=false;
 metadataOverride=1;const malformed=await browser.newContext();page=await malformed.newPage();await page.goto(base+'/portfolio/');await ready('B');done('Malformed version metadata cannot trigger a reload loop.');await malformed.close();metadataOverride=null;
 const production=await browser.newContext();page=await production.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/production/#/cv/backend',{waitUntil:'domcontentloaded'});await page.frameLocator('.resume-document iframe').getByRole('heading',{name:'LE QUANG KHANH',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('zney-deployment-version')),deployment.version);
 await page.screenshot({path:output+'/production-cv.png'});done('The real production build boots behind version checking and opens the HTML CV.');await production.close();
 assert.deepEqual(errors,[]);await writeFile(output+'/report.json',JSON.stringify({passed:true,version:deployment.version,results},null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:output+'/failure.png'});await writeFile(output+'/report.json',JSON.stringify({passed:false,results,error:String(error),errors},null,2));throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
