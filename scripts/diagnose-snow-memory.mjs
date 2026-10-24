// Isolated diagnosis only: no production source or user storage writes.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openSync,writeSync,closeSync} from 'node:fs';
import assert from 'node:assert/strict';
const arg=(key,fallback)=>process.argv.find(s=>s.startsWith(`--${key}=`))?.slice(key.length+3)??fallback;
const label=arg('label','baseline'),assets=arg('assets','sakura-house,convenience,mitsuya').split(',').filter(Boolean);
const rounds=Number(arg('rounds',1)),limit=Number(arg('limit',1200)),probe=arg('probe','base'),rows=Number(arg('rows',1)),capture=process.argv.includes('--capture');
const out=arg('out','artifacts/editor/snow-diagnosis'),exec=promisify(execFile),count=Number(arg('count',assets.length)),bench=process.argv.includes('--bench');
const baseline=process.argv.includes('--baseline')?'13f9b05d7c2384d53326646252bb6c523b1d05f1':null;
const frameDuration=Number(arg('frame-ms',0)),dpr=Number(arg('dpr',1));
const sourceDir=arg('source-dir',null),dynamic=process.argv.includes('--dynamic');
const cycleOnly=process.argv.includes('--cycle-only'),clearGC=process.argv.includes('--clear-gc'),noWorkerInspection=process.argv.includes('--no-worker-inspection');
const snapshots=new Set(arg('snapshot-clear','').split(',').filter(Boolean).map(Number));
const nativeDumps=process.argv.includes('--native-dumps');
const frameWork=process.argv.includes('--frame-work');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const cdp=await browser.newBrowserCDPSession(),page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr});
const pageCDP=await page.context().newCDPSession(page);
const report={label,assets,count,probe,rows,baseline,sourceDir,dynamic,frameDuration,dpr,bufferInstrumentation:!bench,cycleOnly,clearGC,noWorkerInspection,nativeDumps,frameWork,snapshotClear:[...snapshots],limitMiB:limit,rounds,samples:[],errors:[],red:false};
const save=()=>writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2)+'\n');
page.on('pageerror',e=>report.errors.push(e.message));
page.on('crash',()=>report.errors.push('PAGE_CRASH'));
async function workerCommand(method){
  const result=[];
  for(const t of (await cdp.send('Target.getTargets')).targetInfos.filter(t=>t.type==='worker')){
    const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:t.targetId,flatten:false});
    const reply=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cdp.off('Target.receivedMessageFromTarget',handler);reject(Error('Worker inspection timeout'));},5000);
      function handler(e){if(e.sessionId!==sessionId)return;const m=JSON.parse(e.message);if(m.id===1){clearTimeout(timer);cdp.off('Target.receivedMessageFromTarget',handler);resolve(m.result);}}
      cdp.on('Target.receivedMessageFromTarget',handler);
    });
    await cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:1,method})});
    result.push(await reply);await cdp.send('Target.detachFromTarget',{sessionId});
  }
  return result;
}
async function sample(stage){
  const {processInfo}=await cdp.send('SystemInfo.getProcessInfo'),ids=processInfo.map(p=>p.id).filter(Number.isInteger).join(',');
  const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${ids} -ErrorAction SilentlyContinue | Select-Object Id,PrivateMemorySize64,WorkingSet64 | ConvertTo-Json -Compress; exit 0`]);
  const processes=[JSON.parse(stdout)].flat().map(p=>({pid:p.Id,type:processInfo.find(t=>t.id===p.Id)?.type,privateMiB:p.PrivateMemorySize64/1048576,workingMiB:p.WorkingSet64/1048576}));
  const scene=await page.evaluate(async()=>({env:townEditor.environment.get(),pool:(await import('/town/assets/shared/snow.js')).getSnowMemoryInspection(),gpu:__editor.renderer.info.memory,
    ground:townEditor.sceneView.getInspection().snow,sourceChecks:window.__sourceChecks,models:townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>({id:e.placement.assetId,...e.asset.snow.getInspection()})),
    gl:window.__diagGL,shadowLights:__editor.scene.children.find(n=>n.name==='town-lighting').children.filter(n=>n.isLight&&n.shadow).map(n=>({type:n.type,intensity:n.intensity,castShadow:n.castShadow,map:n.shadow.map?{width:n.shadow.map.width,height:n.shadow.map.height}:null})),formal:localStorage.getItem('rainy-corner.editor.layout.v1')}));
  const entry={stage,seconds:(Date.now()-started)/1000,privateMiB:processes.reduce((n,p)=>n+p.privateMiB,0),processes,main:await pageCDP.send('Runtime.getHeapUsage'),workers:noWorkerInspection?[]:await workerCommand('Runtime.getHeapUsage'),scene};
  assert.equal(scene.formal,null);report.samples.push(entry);report.red ||= entry.privateMiB>limit;await save();
  console.log(JSON.stringify({stage,privateMiB:Math.round(entry.privateMiB),gpuMiB:Math.round(processes.filter(p=>p.type==='GPU').reduce((n,p)=>n+p.privateMiB,0)),mainMiB:Math.round((entry.main.usedSize+entry.main.backingStorageSize)/1048576),buffersMiB:bench?null:Math.round(scene.gl.liveBytes/1048576),programs:bench?null:scene.gl.programs,workerCount:scene.pool.workers,workerHeapInspected:!noWorkerInspection}));
  assert(entry.privateMiB<1900,'Protective stop: isolated test reached 1900 MiB');
}
let started=Date.now();
async function heapSnapshot(stage){
  const path=`${out}/${label}-${stage}.heapsnapshot`,fd=openSync(path,'w');
  const receive=({chunk})=>writeSync(fd,chunk);
  pageCDP.on('HeapProfiler.addHeapSnapshotChunk',receive);
  try{await pageCDP.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});}
  finally{pageCDP.off('HeapProfiler.addHeapSnapshotChunk',receive);closeSync(fd);}
  (report.heapSnapshots??=[]).push({stage,path});await save();console.log(JSON.stringify({heapSnapshot:path}));
}
async function allocationProfile(run){
  const target=(await cdp.send('Target.getTargets')).targetInfos.find(t=>t.type==='worker');
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});let id=0;
  const send=async(method,params={})=>{
    const current=++id,reply=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cdp.off('Target.receivedMessageFromTarget',on);reject(Error('Allocation profile timeout'));},20000);function on(e){if(e.sessionId!==sessionId)return;const m=JSON.parse(e.message);if(m.id===current){clearTimeout(timer);cdp.off('Target.receivedMessageFromTarget',on);if(m.error)reject(Error(JSON.stringify(m.error)));else resolve(m.result);}}cdp.on('Target.receivedMessageFromTarget',on);});
    await cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:current,method,params})});return reply;
  };
  const options={samplingInterval:131072,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true};
  await send('HeapProfiler.startSampling',options);await pageCDP.send('HeapProfiler.startSampling',options);
  await run();
  const worker=await send('HeapProfiler.stopSampling'),main=await pageCDP.send('HeapProfiler.stopSampling');await cdp.send('Target.detachFromTarget',{sessionId});
  const top=profile=>{const sums=new Map();function visit(n){const f=n.callFrame,key=`${f.functionName} ${f.url}:${f.lineNumber+1}`;sums.set(key,(sums.get(key)||0)+n.selfSize);n.children.forEach(visit);}visit(profile.head);return [...sums].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([frame,bytes])=>({frame,allocatedMiB:bytes/1048576}));};
  report.allocations={worker:top(worker.profile),main:top(main.profile)};
  await writeFile(`${out}/${label}-allocations.json`,JSON.stringify({worker,main},null,2));
}
try{
  if(nativeDumps)await cdp.send('Tracing.start',{transferMode:'ReturnAsStream',traceConfig:{recordMode:'recordContinuously',excludedCategories:['*'],includedCategories:['disabled-by-default-memory-infra'],memoryDumpConfig:{triggers:[]}}});
  const info=await cdp.send('SystemInfo.getInfo'),aux=info.gpu.auxAttributes;
  report.backend={devices:info.gpu.devices,glRenderer:aux.glRenderer,glVendor:aux.glVendor,glVersion:aux.glVersion,displayType:aux.displayType,features:info.gpu.featureStatus};
  report.browser=await cdp.send('Browser.getVersion');
  if(sourceDir){
    assert(!baseline&&probe==='base'&&!capture,'Source snapshot must be an isolated benchmark');
    let manifest;try{manifest=JSON.parse(await readFile(`${sourceDir}/manifest.json`,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    const files=manifest?Object.entries(manifest).map(([url,v])=>[url,v.file]):[['main.js','main.js'],['town/editor/lighting.js','lighting.js']];
    for(const [url,file]of files){
      const body=await readFile(`${sourceDir}/${file}`,'utf8');await page.context().route('**/'+url,r=>r.fulfill({status:200,contentType:'text/javascript',body}));
    }
  }
  if(baseline){
    assert(probe==='base'&&!capture,'Baseline benchmark must not combine diagnostic substitutions');
    for(const path of ['main.js','town/assets/shared/snow-geometry.js','town/assets/shared/snow-surfaces.js','town/assets/shared/snow.js','town/editor/rain-surfaces.js','town/editor/ground-snow.js','town/editor/scene.js','town/editor/snowfall.js','town/editor/lighting.js']){
      const {stdout:body}=await exec('git',['show',`${baseline}:dist/${path}`],{maxBuffer:8*1024*1024});
      await page.route('**/'+path,r=>r.fulfill({status:200,contentType:'text/javascript',body}));
    }
  }
  if(probe!=='base'||capture){
    const changes={
      'idle-shadows':['town/editor/lighting.js','if(!entry)return;','if(!entry){l.castShadow=false;return;}'],
      'canvas-aa':['main.js','{canvas,antialias:true,powerPreference:', '{canvas,antialias:false,powerPreference:'],
      'base':['main.js','time+=elapsedDt','time+=elapsedDt'],
    };
    assert(changes[probe],`Unknown probe ${probe}`);
    const [path,from,to]=changes[probe],source=await readFile('dist/'+path,'utf8');assert(source.includes(from));
    let body=source.replace(from,to);if(capture&&path==='main.js')body=body.replace('time+=elapsedDt','time=0');
    await page.route('**/'+path,route=>route.fulfill({status:200,contentType:'text/javascript',body}));
    if(capture&&path!=='main.js'){const main=await readFile('dist/main.js','utf8');await page.route('**/main.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:main.replace('time+=elapsedDt','time=0')}));}
  }
  await page.addInitScript(({ids,rows,count,bench})=>{
    const width=bench?3:Math.max(1,ids.length),height=bench?Math.ceil(count/width):rows;
    localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<3+height?width:0})),instances:Array.from({length:count},(_,i)=>({id:`diag-${i}`,assetId:ids[i%ids.length],x:i%width+3,z:3+Math.floor(i/width),rotation:0}))},environment:{time:'afternoon',weather:'clear',snowAmount:0}}));
    // Weak records do not keep disposed WebGL objects alive.
    const stats=window.__diagGL={liveBytes:0,peakBytes:0,allocatedBytes:0,buffers:0,deletedBuffers:0,programs:0,deletedPrograms:0};
    for(const Type of bench?[]:[window.WebGLRenderingContext,window.WebGL2RenderingContext]){
      if(!Type)continue;const p=Type.prototype,bound=new WeakMap(),sizes=new WeakMap();
      for(const method of ['bindBuffer','bufferData','deleteBuffer','createProgram','deleteProgram']){
        const original=p[method];p[method]=function(...args){
          const result=original.apply(this,args);let bindings=bound.get(this);if(!bindings){bindings=new Map();bound.set(this,bindings);}
          if(method==='bindBuffer')bindings.set(args[0],args[1]);
          if(method==='bufferData'){
            const b=bindings.get(args[0]);if(b){const old=sizes.get(b);const n=typeof args[1]==='number'?args[1]:(args[4]!==undefined?args[4]*(args[1].BYTES_PER_ELEMENT||1):args[1]?.byteLength||0);
              if(old===undefined)stats.buffers++;stats.liveBytes+=n-(old||0);stats.allocatedBytes+=n;sizes.set(b,n);stats.peakBytes=Math.max(stats.peakBytes,stats.liveBytes);}
          }
          if(method==='deleteBuffer'&&sizes.has(args[0])){stats.liveBytes-=sizes.get(args[0]);sizes.delete(args[0]);stats.buffers--;stats.deletedBuffers++;for(const [key,b]of bindings)if(b===args[0])bindings.delete(key);}
          if(method==='createProgram')stats.programs++;
          if(method==='deleteProgram'&&args[0]){stats.programs--;stats.deletedPrograms++;}
          return result;
        };
      }
    }
  },{ids:assets,rows,count,bench});
  await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
  await page.evaluate(()=>{window.__naturalAdvance=townEditor.environment.advance;townEditor.environment.advance=()=>townEditor.environment.get();});
  started=Date.now();await page.waitForTimeout(1000);await sample('clear-initial');
  const settle=async amount=>page.waitForFunction(amount=>townEditor.sceneView.getInstances().filter(e=>e.asset.snow).every(e=>e.asset.snow.getInspection().shown===amount)&&townEditor.sceneView.getInspection().snow.shown===amount,amount,{timeout:60000});
  const measureFrames=async stage=>{
    const result=await page.evaluate(async({duration,frameWork})=>{
      const snow=frameWork?await import('/town/assets/shared/snow.js'):null;
      const initial=frameWork?{revision:snow.getSnowRevision(),shadows:__editor.shadows.getInspection().requestedMaps}:null;
      let calls=0,triangles=0,maxCalls=0;
      const frames=[];let last=0,start=0;
      await new Promise(resolve=>{function frame(t){
        if(last){frames.push(t-last);if(frameWork){const r=__editor.renderer.info.render;calls+=r.calls;triangles+=r.triangles;maxCalls=Math.max(maxCalls,r.calls);}}else start=t;
        last=t;if(frames.length<180||t-start<duration)requestAnimationFrame(frame);else resolve();
      }requestAnimationFrame(frame);});
      frames.sort((a,b)=>a-b);const mean=frames.reduce((a,b)=>a+b,0)/frames.length;
      const work=frameWork?{seconds:(last-start)/1000,snowUpdates:snow.getSnowRevision()-initial.revision,shadowMaps:__editor.shadows.getInspection().requestedMaps-initial.shadows,meanCalls:calls/frames.length,meanTriangles:triangles/frames.length,maxCalls}:undefined;
      return {count:frames.length,meanMs:mean,fps:1000/mean,medianMs:frames[Math.floor(frames.length*.5)],p95Ms:frames[Math.floor(frames.length*.95)],maxMs:frames.at(-1),render:__editor.renderer.info.render,work};
    },{duration:frameDuration,frameWork});
    (report.performance??=[]).push({stage,...result});console.log(JSON.stringify({stage,...result}));await sample(stage);
  };
  if(bench){await page.evaluate(()=>townEditor.showOverview({immediate:true}));await page.waitForTimeout(1000);if(!cycleOnly)await measureFrames('clear-steady');}
  if(process.argv.includes('--profile-main-cycle'))await pageCDP.send('HeapProfiler.startSampling',{samplingInterval:131072,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  for(let i=0;i<rounds;i++){
    const coldStart=Date.now();
    await page.evaluate(()=>townEditor.environment.set({weather:'snow',snowAmount:1}));
    await settle(1);report.coldSnowMs=Date.now()-coldStart;await sample(`snow-${i}-ready`);await page.waitForTimeout(1200);await sample(`snow-${i}-held`);
    if(bench){if(!cycleOnly)await measureFrames('snow-steady');await page.evaluate(()=>townEditor.environment.set({time:'night'}));await page.waitForTimeout(1000);if(!cycleOnly)await measureFrames('snow-night-steady');}
    if(dynamic&&bench){
      await page.evaluate(()=>{let first=true;townEditor.environment.advance=seconds=>{if(first){window.__naturalAdvance(seconds);townEditor.environment.set({weather:'snow',snowAmount:.4});first=false;}else window.__naturalAdvance(seconds);return townEditor.environment.get();};});
      if(cycleOnly){await page.waitForTimeout(1500);await sample('snow-accumulating');}else await measureFrames('snow-accumulating');
      await page.evaluate(()=>townEditor.environment.set({weather:'rain'}));
      if(cycleOnly){await page.waitForTimeout(1500);await sample('rain-melting');}else await measureFrames('rain-melting');
      await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();});
    }
    if(process.argv.includes('--profile')&&i===0){await allocationProfile(async()=>{for(const amount of [.4,.75,1]){await page.evaluate(a=>townEditor.environment.set({snowAmount:a}),amount);await settle(amount);}});await sample('after-three-profiled-rebuilds');}
    if(capture&&i===0){await page.evaluate(()=>{townEditor.environment.set({weather:'clear',snowAmount:1});townEditor.showOverview({immediate:true});});await page.waitForTimeout(400);await page.screenshot({path:`${out}/${label}-snow.png`});}
    if(process.argv.includes('--gc')){await pageCDP.send('HeapProfiler.collectGarbage');await workerCommand('HeapProfiler.collectGarbage');await sample(`snow-${i}-forced-gc-diagnostic-only`);}
    await page.evaluate(()=>townEditor.environment.set({weather:'clear',snowAmount:0}));
    await page.waitForTimeout(1200);await sample(`clear-${i}-released`);
    if(process.argv.includes('--profile-main-cycle')&&i===0){
      const profile=await pageCDP.send('HeapProfiler.stopSampling');
      await writeFile(`${out}/${label}-main-cycle-allocations.json`,JSON.stringify(profile));
    }
    if(clearGC){await pageCDP.send('HeapProfiler.collectGarbage');await sample(`clear-${i}-gc-diagnostic-only`);}
    if(snapshots.has(i)){await heapSnapshot(`clear-${i}`);await sample(`clear-${i}-after-snapshot`);}
    if(nativeDumps){const dump=await cdp.send('Tracing.requestMemoryDump',{deterministic:false,levelOfDetail:'detailed'});(report.nativeDumpStages??=[]).push({stage:`clear-${i}`,dump});await save();}
  }
  if(process.argv.includes('--gc')){await pageCDP.send('HeapProfiler.collectGarbage');await workerCommand('HeapProfiler.collectGarbage');await page.waitForTimeout(500);await sample('clear-forced-gc-diagnostic-only');}
  report.completed=true;assert.equal(report.errors.length,0);
  report.idleShadowMaps=report.samples[0].scene.shadowLights.filter(l=>l.intensity===0&&l.map).length;
  if(process.argv.includes('--assert-idle-shadows'))assert.equal(report.idleShadowMaps,0,'IDLE_SHADOW_MAP: inactive lights allocated shadow render targets');
  if(report.red){report.failure=`MEMORY_HIGH: exceeded diagnostic ${limit} MiB trigger`;process.exitCode=1;}
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{
  if(nativeDumps){
    const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');
    const {stream}=await complete,fd=openSync(`${out}/${label}-native-trace.json`,'w');
    try{let chunk;do{chunk=await cdp.send('IO.read',{handle:stream});writeSync(fd,chunk.base64Encoded?Buffer.from(chunk.data,'base64'):chunk.data);}while(!chunk.eof);}
    finally{closeSync(fd);await cdp.send('IO.close',{handle:stream});}
  }
  await save();await browser.close();
}
