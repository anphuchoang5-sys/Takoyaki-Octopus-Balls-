import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const base='dist/town/assets/sakura-house/interior',offline='artifacts/buildings/sakura-house/interior/樱家-室内结构预览.html',out='artifacts/buildings/sakura-house/interior/entry-01/preview-entry';
const sourceURL=pathToFileURL(path.resolve(base+'/preview.html')).href,offlineURL=pathToFileURL(path.resolve(offline)).href;
const hash=v=>createHash('sha256').update(v).digest('hex'),before=process.argv.includes('--before');await mkdir(out,{recursive:true});
const report={passed:false,cases:[],errors:[]},browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,350));});
 const distRoot=path.resolve('dist');await page.route('http://127.0.0.1:4173/**',async route=>{const f=path.resolve(distRoot,'.'+decodeURIComponent(new URL(route.request().url()).pathname)),rel=path.relative(distRoot,f);if(route.request().method()!=='GET'||rel.startsWith('..')||path.isAbsolute(rel))return route.abort();try{await route.fulfill({status:200,contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg'})[path.extname(f)]||'application/octet-stream',body:await readFile(f)});}catch{await route.fulfill({status:404,body:'Missing local file'});}});
 async function check(name,url,expected,current){
  const start=Date.now();await page.goto(url);let ready=true;try{await page.waitForFunction(()=>window.__sakuraInterior?.ready,{},{timeout:8000});}catch{ready=false;}
  const result=await page.evaluate(()=>{const a=window.__sakuraInterior,c=document.querySelector('#world'),probe=document.createElement('canvas');probe.width=80;probe.height=60;const ctx=probe.getContext('2d');ctx.drawImage(c,0,0,80,60);const data=ctx.getImageData(0,0,80,60).data,colors=new Set();for(let i=0;i<data.length;i+=4)colors.add([data[i],data[i+1],data[i+2],data[i+3]].join(','));return {url:location.href,style:getComputedStyle(document.body).display,styleBytes:document.querySelector('#viewer-style')?.textContent.length,rooms:document.querySelectorAll('#room-buttons button').length,canvas:[c.width,c.height],colors:colors.size,current:a?.inspect().current,triangles:a?.inspect().stats.triangles};});
  report.cases.push({name,ready,milliseconds:Date.now()-start,...result});await page.screenshot({path:out+'/'+(before?'before-':'')+name+'.png'});
  assert(ready,'Preview failed to start: '+name);assert.equal(result.url,expected);assert.equal(result.style,'grid');assert.equal(result.rooms,12);assert(result.colors>20,'Canvas is blank');assert(result.triangles>1000);assert.equal(result.current,current);
 }
 await check('source-file',sourceURL,offlineURL,'hero');
 await check('source-file-plant',sourceURL+'?view=entry-plant&compare=1#plant',offlineURL+'?view=entry-plant&compare=1#plant','entry-plant');
 await page.waitForFunction(()=>document.querySelector('#reference-image').naturalWidth===1200);assert(await page.locator('#reference-panel').isVisible());
 const rect=await page.locator('#world').boundingBox(),camera=()=>page.evaluate(()=>window.__sakuraInterior.inspect().camera.position),initial=await camera();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.56,rect.y+rect.height*.52,{steps:8});await page.mouse.up();await page.waitForTimeout(150);assert.notDeepEqual(await camera(),initial);report.orbit=true;
 await check('direct-offline',offlineURL+'?view=entry-reference',offlineURL+'?view=entry-reference','entry-reference');
 const http='http://127.0.0.1:4173/town/assets/sakura-house/interior/preview.html?view=entry-plant';await check('source-http',http,http,'entry-plant');
 // Exercise the real launcher after the same template substitution used by existing packagers.
 const html=await readFile(base+'/preview.html','utf8'),start=html.indexOf('<template id="preview-module">');assert(start>=0);
 const launcher=html.slice(start).replace('<script type="module" src="./preview.js"></script>','<script type="module">document.documentElement.dataset.started="yes";</script>');
 const compat=out+'/embedded-launcher-check.html';await writeFile(compat,'<!doctype html><html><body><script>globalThis.__interiorReferences={};</script>'+launcher);
 const compatURL=pathToFileURL(path.resolve(compat)).href;await page.goto(compatURL);await page.waitForFunction(()=>document.documentElement.dataset.started==='yes');assert.equal(page.url(),compatURL);report.packagerLauncherCompatible=true;
 const delivery=JSON.parse(await readFile('artifacts/buildings/sakura-house/interior/entry-01/delivery-inspection.json','utf8'));let protectedFiles=0;
 for(const [f,h]of Object.entries(delivery.sourceHashes)){if(f===base+'/preview.html')continue;assert.equal(hash(await readFile(f)),h,f);protectedFiles++;}
 assert.equal(hash(await readFile(offline)),delivery.outputs.offlineHash);assert.equal(hash(await readFile(base+'/sakura-interior.glb')),delivery.outputs.glbHash);report.preserved={sourceFiles:protectedFiles,offline:true,glb:true};
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.message;throw e;}finally{await writeFile(out+'/'+(before?'before':'inspection')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
