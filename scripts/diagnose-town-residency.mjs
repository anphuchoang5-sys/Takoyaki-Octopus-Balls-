// Independent diagnosis only. All substitutions live in this isolated browser.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const arg=(k,d)=>process.argv.find(v=>v.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const count=Number(arg('count',12)),kind=arg('kind','mixed'),variant=arg('variant','base');
const inventory=process.argv.includes('--inventory'),gc=process.argv.includes('--gc'),holdMs=Number(arg('hold-ms',0));
const label=arg('label',`${kind}-${count}-${variant}`),out=arg('out','artifacts/editor/memory-independent-20261024');
assert(/^[a-z0-9-]+$/.test(label));assert(['base','drop-unused','no-thumbnails','no-shadows','no-post'].includes(variant));
const exec=promisify(execFile),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});
const report={label,count,kind,variant,inventory,gc,holdMs,started:new Date().toISOString(),samples:[],errors:[],source:{}};
await writeFile(`${out}/${label}.json`,JSON.stringify(report),{flag:'wx'});
async function fingerprint(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory()){if(e.name!=='vendor')await fingerprint(p);}else if(/\.(js|html|css|gz)$/.test(e.name))report.source[p]=hash(await readFile(p));}}
await fingerprint('dist');
report.git={head:(await exec('git',['rev-parse','HEAD'])).stdout.trim(),status:(await exec('git',['status','--porcelain=v1'])).stdout};
report.scriptHash=hash(await readFile('scripts/diagnose-town-residency.mjs'));
const save=()=>writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2)+'\n');
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const cdp=await browser.newBrowserCDPSession(),page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),main=await page.context().newCDPSession(page);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('PAGE_CRASH'));
 report.browser=await cdp.send('Browser.getVersion');const info=await cdp.send('SystemInfo.getInfo');report.backend={devices:info.gpu.devices,aux:info.gpu.auxAttributes};
 async function sample(stage,scene=false){
  const start=Date.now(),{processInfo}=await cdp.send('SystemInfo.getProcessInfo'),ids=[...new Set(processInfo.map(p=>p.id))];
  assert(ids.every(Number.isInteger));assert.equal(ids.length,processInfo.length,'Duplicate CDP process ID');
  const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,PrivateMemorySize64,WorkingSet64 | ConvertTo-Json -Compress`]);
  const processes=[JSON.parse(stdout)].flat().map(p=>({pid:p.Id,type:processInfo.find(x=>x.id===p.Id).type,privateMiB:p.PrivateMemorySize64/1048576,workingMiB:p.WorkingSet64/1048576}));
  const data={stage,timestamp:new Date().toISOString(),collectionMs:Date.now()-start,reportedIds:ids,missingIds:ids.filter(id=>!processes.some(p=>p.pid===id)),processes,privateMiB:processes.reduce((n,p)=>n+p.privateMiB,0),main:await main.send('Runtime.getHeapUsage')};
  if(scene)data.scene=await page.evaluate(async()=>({pool:(await import('/town/assets/shared/snow.js')).getSnowMemoryInspection(),resources:__editor.renderer.info.memory,render:__editor.renderer.info.render,grass:townEditor.sceneView.getInspection().grass,formal:localStorage.getItem('rainy-corner.editor.layout.v1')}));
  if(scene)assert.equal(data.scene.formal,null);
  report.samples.push(data);await save();console.log(JSON.stringify({stage,privateMiB:data.privateMiB,mainMiB:(data.main.usedSize+data.main.backingStorageSize)/1048576,processes:processes.map(p=>({type:p.type,privateMiB:p.privateMiB}))}));
  assert(data.privateMiB<1900,'Protective stop: isolated test reached 1900 MiB');
 }
 await sample('blank');
 if(process.argv.includes('--audit')){
  report.targets=await cdp.send('Target.getTargets');
  const {processInfo}=await cdp.send('SystemInfo.getProcessInfo'),root=processInfo.find(p=>p.type==='browser').id;
  try{
   const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`$all=Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction Stop | Select-Object ProcessId,ParentProcessId,Name; $owned=[System.Collections.Generic.HashSet[int]]::new(); [void]$owned.Add(${root}); do{$changed=$false;foreach($p in $all){if($owned.Contains([int]$p.ParentProcessId)){if($owned.Add([int]$p.ProcessId)){$changed=$true}}}}while($changed); $all | Where-Object {$owned.Contains([int]$_.ProcessId)} | ConvertTo-Json -Compress`]);
   const descendants=[JSON.parse(stdout)].flat();report.osProcessAudit={cdp:processInfo,descendants};
   const ownedIds=descendants.map(p=>p.ProcessId);assert(ownedIds.every(Number.isInteger));
   const extra=ownedIds.filter(id=>!processInfo.some(p=>p.id===id));
   if(extra.length){const {stdout:details}=await exec('powershell.exe',['-NoProfile','-Command',`$list=Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"; $list | Where-Object {$_.ProcessId -in @(${extra.join(',')})} | ForEach-Object {$p=Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue; $t=if($_.CommandLine -match '--type=([a-zA-Z0-9_-]+)'){$Matches[1]}else{'unclassified'}; [pscustomobject]@{Id=$_.ProcessId;Type=$t;PrivateBytes=$p.PrivateMemorySize64}} | ConvertTo-Json -Compress`]);report.osProcessAudit.omitted=[JSON.parse(details)].flat();}
  }catch(e){report.osProcessAudit={failure:String(e.message),note:'CDP IDs still checked; OS ancestry unavailable'};}
 }
 const ids=kind==='mixed'?['sakura-house','convenience','mitsuya']:['empty','ground'].includes(kind)?[]:[kind];
 const cells=kind==='empty'?0:Math.max(count,1),width=Math.min(3,cells),height=Math.ceil(cells/3);
 await page.addInitScript(({ids,count,width,height})=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<3+height?width:0})),instances:ids.length?Array.from({length:count},(_,i)=>({id:`resident-${i}`,assetId:ids[i%ids.length],x:3+i%3,z:3+Math.floor(i/3),rotation:0})):[]},environment:{time:'afternoon',weather:'clear',snowAmount:0}})),{ids,count,width,height});
 // Enforce local network scope; never contact a third party or another profile.
 await page.context().route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'||url.port!=='4173')return route.abort();
  let body,path=url.pathname;
  if(path==='/main.js'&&(variant!=='base'||inventory)){
   body=await readFile('dist/main.js','utf8');
   if(variant==='no-thumbnails')body=body.replace('renderThumbnails(ASSETS,createAsset,TILE_SIZE)','new Map()');
   if(variant==='no-shadows')body=body.replace('renderer.shadowMap.enabled=true','renderer.shadowMap.enabled=false');
   if(variant==='no-post')body=body.replace('composer.render();','renderer.render(scene,camera);');
   if(inventory)body=body.replace('window.__editor={environment,','window.__editor={composer,environment,');
  }
  if((inventory||variant==='drop-unused')&&['/town/assets/sakura-house/geometry.js','/town/assets/mitsuya/workshop.js'].includes(path)){
   body=await readFile('dist'+path,'utf8');
   const marker=path.includes('sakura')?'  function dispose(){':' let disposed=false;function dispose(){';assert(body.includes(marker));
   const inspect=`root.userData.__residentOwned=()=>{const live=new Set();root.traverse(n=>{if(n.geometry)live.add(n.geometry);});const bytes=gs=>{const buffers=new Set();for(const g of gs)for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))buffers.add((a.data??a).array.buffer);return [...buffers].reduce((s,b)=>s+b.byteLength,0);};const unused=[...geometries].filter(g=>!live.has(g));return {owned:geometries.size,live:live.size,unused:unused.length,ownedBytes:bytes(geometries),unusedBytes:bytes(unused)};};\n`;
   body=body.replace(marker,inspect+marker);
   if(variant==='drop-unused'){
    const marker2=path.includes('sakura')?'root.userData.components=components;':'if(transparent.length)g.add(...transparent);';assert(body.includes(marker2));
    body=body.replace(marker2,marker2+`const used=new Set();root.traverse(n=>{if(n.geometry)used.add(n.geometry);});for(const old of geometries)if(!used.has(old)){old.dispose();geometries.delete(old);}`);
   }
  }
  return body===undefined?route.continue():route.fulfill({status:200,contentType:'text/javascript',body});
 });
 await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
 await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();townEditor.showOverview({immediate:true});});
 await page.waitForTimeout(1000);await sample('clear-initial',true);
 await page.waitForTimeout(3000);await sample('clear-steady',true);
 if(holdMs){await page.waitForTimeout(holdMs);await sample('clear-late',true);}
 if(gc){await main.send('HeapProfiler.collectGarbage');await page.waitForTimeout(300);await sample('clear-gc-diagnostic-only',true);}
 if(inventory){
  report.inventory=await page.evaluate(async()=>{
   async function scan(root){
    const geometries=new Set(),buffers=new Set(),materials=new Set(),textures=new Set(),images=new Set(),hashes=[];let meshes=0;
    root.traverse(n=>{if(n.isMesh)meshes++;if(n.geometry)geometries.add(n.geometry);if(n.instanceMatrix)buffers.add(n.instanceMatrix.array.buffer);if(n.instanceColor)buffers.add(n.instanceColor.array.buffer);for(const m of !n.material?[]:Array.isArray(n.material)?n.material:[n.material]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture){textures.add(v);if(v.image)images.add(v.image);}}});
    for(const g of geometries){const local=new Set(),parts=[];for(const [key,a]of Object.entries({...g.attributes,...(g.index?{index:g.index}:{})})){const owner=a.data??a;buffers.add(owner.array.buffer);local.add(owner.array.buffer);parts.push([key,a.itemSize,a.normalized,owner.array.constructor.name,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',owner.array)),n=>n.toString(16).padStart(2,'0')).join('')]);}hashes.push({key:JSON.stringify([parts,g.groups,g.drawRange]),bytes:[...local].reduce((s,b)=>s+b.byteLength,0)});}
    const duplicates=new Map();for(const g of hashes){const old=duplicates.get(g.key);if(old){old.count++;old.duplicateBytes+=g.bytes;}else duplicates.set(g.key,{bytes:g.bytes,count:1,duplicateBytes:0});}
    return {meshes,geometries:geometries.size,materials:materials.size,textures:textures.size,uniqueBuffers:buffers.size,bufferBytes:[...buffers].reduce((s,b)=>s+b.byteLength,0),imageRGBAUpperBytes:[...images].reduce((s,i)=>s+(i.width??0)*(i.height??0)*4,0),images:[...images].map(i=>({w:i.width,h:i.height,dataBytes:i.data?.byteLength})),duplicateGeometryBytes:[...duplicates.values()].reduce((s,g)=>s+g.duplicateBytes,0),owned:root.userData.__residentOwned?.()};
   }
   const instances=[];for(const {asset,placement}of townEditor.sceneView.getInstances())instances.push({id:placement.id,assetId:placement.assetId,...await scan(asset.root)});
   const targets=[];const seen=new Set();function target(t,label){if(!t||seen.has(t))return;seen.add(t);targets.push({label,width:t.width,height:t.height,samples:t.samples,allocated:!!__editor.renderer.properties.get(t).__webglFramebuffer,depthBuffer:t.depthBuffer,textures:t.textures.map(t=>({type:t.type,format:t.format,internalFormat:t.internalFormat}))});}
   const c=__editor.composer;target(c.renderTarget1,'scene1');target(c.renderTarget2,'scene2');for(const [i,p]of c.passes.entries())for(const [k,v]of Object.entries(p)){if(v?.isWebGLRenderTarget)target(v,`pass${i}.${k}`);if(Array.isArray(v))v.forEach((t,j)=>{if(t?.isWebGLRenderTarget)target(t,`pass${i}.${k}.${j}`);});}
   __editor.scene.traverse(n=>{if(n.isLight&&n.shadow)target(n.shadow.map,`shadow.${n.type}`);});
   return {scene:await scan(__editor.scene),instances,targets};
  });await save();
 }
 assert.deepEqual(report.errors,[]);report.completed=true;
 // Both phases remain visible in the raw output; a threshold failure is not OOM.
 report.highResident=report.samples.find(s=>s.stage==='clear-steady').privateMiB>1200;
 if(report.highResident){report.failure='MEMORY_HIGH: steady clear >1200 MiB diagnostic trigger';process.exitCode=1;}
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}
finally{await save();await browser?.close();}
