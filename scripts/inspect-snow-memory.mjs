import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const exec=promisify(execFile),out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/editor/snow-memory';
await mkdir(out,{recursive:true});
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)||'baseline';
const seconds=Number(process.argv.find(a=>a.startsWith('--seconds='))?.slice(10)||90);
const limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.slice(8)||2400);
const onlyAsset=process.argv.find(a=>a.startsWith('--asset='))?.slice(8);
const hold=process.argv.find(a=>a.startsWith('--hold='))?.slice(7);
const cycle=process.argv.includes('--cycle');
const cold=process.argv.includes('--cold');
const natural=process.argv.includes('--natural');
if(process.argv.includes('--topology')){
  const T=await import('../dist/vendor/three.module.js'),{conformFacets,subdivideFacets,triangle,indexTriangles,indexPackedTriangles}=await import('../dist/town/assets/shared/snow-surfaces.js');
  const face=(a,b,c,part)=>Object.assign([a,b,c].map(p=>new T.Vector3(...p)),{part});
  const base=face([0,0,0],[1,0,0],[0,0,1],0);
  const distant=Array.from({length:40},(_,i)=>{const x=(i+1)/41;return face([x,2,0],[x+.001,2,0],[x,2,.01],1);});
  const otherHeight=conformFacets([base,...distant],.25).filter(f=>f.part===0).length;
  const touching=face([.5,0,0],[.5,0,-.2],[.6,0,-.1],1);
  const sameHeight=conformFacets([base,touching],.25).filter(f=>f.part===0).length;
  const sliver=face([0,0,0],[0,0,.00001],[10,0,0],2),wide=face([0,0,0],[0,0,2],[2,0,0],3);
  const fine=subdivideFacets([sliver,wide],.35),slivers=fine.filter(f=>f.part===2),area=fs=>fs.reduce((s,f)=>s+Math.abs(triangle(...f).denom)/2,0);
  assert.equal(slivers.length,1,'Thin clipped strip was needlessly multiplied');assert(fine.length>2,'Broad snow surface has no detail');
  assert(Math.abs(area(fine)-area([sliver,wide]))<1e-9,'Subdivision changed the actual support area');
  assert(fine.every(f=>f.every(p=>p.y===0)),'Subdivision moved contact off its support');
  const queryFaces=[face([-2,0,-2],[-2,0,2],[2,0,2],0),face([-2,0,-2],[2,0,2],[2,0,-2],0),face([-.3,1,-.3],[-.3,1.5,.7],[.7,2,.7],1)];
  const packed=new Float32Array(queryFaces.flatMap(f=>f.flatMap(v=>v.toArray()))),ids=new Int16Array(queryFaces.map(f=>f.part));let querySamples=0;
  for(const disabled of [new Set(),new Set([1]),new Set([0,1])]){
    const fast=indexPackedTriangles(packed,ids,disabled),triangles=[];
    for(let i=0;i<packed.length;i+=9)if(!disabled.has(ids[i/9]))triangles.push(triangle(...[0,3,6].map(j=>new T.Vector3().fromArray(packed,i+j))));
    const reference=indexTriangles(triangles);
    const reusable={y:0,normal:new T.Vector3(),part:0};
    for(let x=-2.5;x<=2.5;x+=.125)for(let z=-2.5;z<=2.5;z+=.125){
      const a=fast.sample(x,z),b=reference.sample(x,z);assert.equal(!!a,!!b,'Packed snow index changed a hole');if(a){assert(Math.abs(a.y-b.y)<1e-10);assert(a.normal.distanceTo(b.normal)<1e-10);}querySamples++;
      const c=fast.sampleInto(x,z,reusable);assert.deepEqual(c,a);if(c){assert.equal(c,reusable);assert.notEqual(c.normal,a.normal);}
    }
  }
  await writeFile(`${out}/${label}-topology.json`,JSON.stringify({otherHeight,sameHeight,slivers:slivers.length,area:area(fine),querySamples},null,2));
  assert.equal(otherHeight,1,'Unrelated upper geometry subdivided a lower surface');assert(sameHeight>1,'Real touching edge was not conformed');
  console.log(JSON.stringify({otherHeight,sameHeight,passed:true}));process.exit(0);
}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const cdp=await browser.newBrowserCDPSession();
const page=await browser.newPage({viewport:{width:1280,height:800}});
const pageCDP=process.argv.includes('--heap')?await page.context().newCDPSession(page):null;
async function heaps(){
  if(!pageCDP)return undefined;
  const result={main:await pageCDP.send('Runtime.getHeapUsage'),workers:[]};
  const {targetInfos}=await cdp.send('Target.getTargets');
  for(const target of targetInfos.filter(t=>t.type==='worker')){
    const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
    const response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cdp.off('Target.receivedMessageFromTarget',handler);reject(Error('Heap measurement timeout'));},5000);function handler(e){if(e.sessionId!==sessionId)return;const m=JSON.parse(e.message);if(m.id===1){clearTimeout(timer);cdp.off('Target.receivedMessageFromTarget',handler);resolve(m.result);}}cdp.on('Target.receivedMessageFromTarget',handler);});
    await cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id:1,method:'Runtime.getHeapUsage'})});
    result.workers.push(await response);await cdp.send('Target.detachFromTarget',{sessionId});
  }
  return result;
}
const report={label,seconds,limitMB:limit,samples:[],errors:[],crashed:false,passed:false};
page.on('crash',()=>{report.crashed=true;});page.on('pageerror',e=>report.errors.push(e.message));
const save=()=>writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2));
try{
  if(cold||natural)await page.addInitScript(()=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<=5?3:0})),instances:['sakura-house','convenience','mitsuya'].map((assetId,i)=>({id:`cold-${i}`,assetId,x:i+3,z:3,rotation:0}))},environment:{time:'afternoon',weather:'clear',snowAmount:0}})));
  if(onlyAsset)await page.addInitScript(id=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:4,length:z===4?1:0})),instances:[{id:'memory-one',assetId:id,x:4,z:4,rotation:0}]},environment:{time:'afternoon',weather:'snow',snowAmount:.05}})),onlyAsset);
  await page.goto('http://127.0.0.1:4173/?review=snow');
  await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
  await page.evaluate(({hold,cold,natural})=>{
    if(hold!==undefined||cold)townEditor.environment.advance=()=>townEditor.environment.get();
    if(cold||natural){
      const started=performance.now();window.__snowCold={first:{},full:{},all:null};
      const timer=setInterval(()=>{
        const states=townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>[e.placement.assetId,e.asset.snow.getInspection().shown]);
        for(const [id,shown]of states){
          if(shown>0&&!__snowCold.first[id])__snowCold.first[id]=(performance.now()-started)/1000;
          if(shown===1&&!__snowCold.full[id])__snowCold.full[id]=(performance.now()-started)/1000;
        }
        if(states.every(([,shown])=>shown===1)&&townEditor.sceneView.getInspection().snow.shown===1){__snowCold.all=(performance.now()-started)/1000;clearInterval(timer);}
      },25);
    }
    townEditor.environment.set({time:'afternoon',weather:'snow',snowAmount:cold?1:natural?0:hold===undefined?.05:Number(hold)});
  },{hold,cold,natural});
  const start=Date.now();
  let phase='snow';
  while(Date.now()-start<seconds*1000){
    await new Promise(r=>setTimeout(r,2500));
    if(report.crashed)throw new Error('PAGE_CRASH: renderer stopped during snowfall');
    const elapsed=(Date.now()-start)/1000;
    if(cycle&&elapsed>=110&&phase==='snow'){await page.evaluate(()=>townEditor.setWeather('rain'));phase='rain';}
    if(cycle&&elapsed>=185&&phase==='rain'){await page.evaluate(()=>townEditor.setWeather('snow'));phase='snow-again';}
    const {processInfo}=await cdp.send('SystemInfo.getProcessInfo');
    const ids=processInfo.map(p=>p.id).filter(Number.isInteger).join(',');
    const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${ids} -ErrorAction SilentlyContinue | Select-Object Id,PrivateMemorySize64,WorkingSet64 | ConvertTo-Json -Compress; exit 0`]);
    const processes=[JSON.parse(stdout)].flat(),privateMB=processes.reduce((s,p)=>s+p.PrivateMemorySize64,0)/1048576;
    const scene=await page.evaluate(async()=>({environment:townEditor.environment.get(),pool:(await import('/town/assets/shared/snow.js')).getSnowMemoryInspection(),gpu:__editor.renderer.info.memory,ground:townEditor.sceneView.getInspection().snow,models:townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>({id:e.placement.assetId,...e.asset.snow.getInspection()}))}));
    const sample={seconds:(Date.now()-start)/1000,privateMB,processes:processes.map(p=>({...p,type:processInfo.find(x=>x.id===p.Id)?.type})),scene,heaps:await heaps()};report.samples.push(sample);await save();
    console.log(JSON.stringify({seconds:sample.seconds,privateMB:Math.round(privateMB),amount:scene.environment.snowAmount,shown:scene.models.map(m=>[m.id,m.shown])}));
    if(privateMB>limit)throw new Error(`MEMORY_LIMIT: test browser private memory ${Math.round(privateMB)} MB exceeds protective ${limit} MB ceiling`);
    assert(scene.models.every(s=>!s.error)&&!scene.ground.error,'Snow Worker failed');
    assert(scene.pool.workers<=1&&scene.pool.queued<=scene.pool.sources&&scene.pool.frames<=scene.pool.clients,'Unbounded snow queue/frame retention');
    if(cold){report.cold=await page.evaluate(()=>window.__snowCold);if(report.cold.all)break;assert(elapsed<10,'COLD_START: full snow exceeded 10 seconds of computation');}
    if(natural)report.natural=await page.evaluate(()=>window.__snowCold);
  }
  await page.screenshot({path:`${out}/${label}.png`});
  const last=report.samples.at(-1).scene;
  if(cold)assert(report.cold?.all<=10,'COLD_START: full snow exceeded 10 seconds of computation');
  assert([...last.models,last.ground].every(s=>Math.abs(s.shown-last.environment.snowAmount)<.01),'Snow never caught up with the requested amount');
  if(cycle){assert(report.samples.some(s=>s.scene.environment.weather==='rain'&&s.scene.pool.sources===0),'Melted snow retained Workers');}
  report.release=await page.evaluate(async()=>{
    townEditor.environment.set({weather:'clear',snowAmount:0});
    const m=await import('/town/assets/shared/snow.js');return {pool:m.getSnowMemoryInspection(),formal:localStorage.getItem('rainy-corner.editor.layout.v1'),models:townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>e.asset.snow.getInspection().memory)};
  });
  assert.equal(report.release.pool.sources,0);assert.equal(report.release.pool.workers,0);assert.equal(report.release.pool.frames,0);assert.equal(report.release.formal,null);
  if(process.argv.includes('--lifecycle')){
    report.lifecycle=await page.evaluate(async()=>{
      const T=await import('three'),{createSnowLayer,surfacePart,getSnowMemoryInspection}=await import('/town/assets/shared/snow.js');
      const make=key=>{
        const root=new T.Group(),g=new T.PlaneGeometry(4,4,16,16);g.rotateX(-Math.PI/2);
        const m=new T.MeshBasicMaterial();root.add(new T.Mesh(g,m));
        const snow=createSnowLayer(root,{key,parts:[surfacePart('test')],choose:()=>0});snow.setAmount(.4);
        return {snow,dispose(){snow.dispose();g.dispose();m.dispose();}};
      };
      const stable=make('memory-lifecycle-stable');
      const settle=async snow=>{const start=performance.now();while(snow.getInspection().shown!==.4){if(performance.now()-start>15000)throw new Error('Lifecycle worker did not finish');await new Promise(r=>setTimeout(r,10));}};
      await settle(stable.snow);const snapshots=[];
      for(let i=0;i<24;i++){
        const temporary=make('memory-lifecycle-reused-key');await new Promise(r=>setTimeout(r,0));
        temporary.dispose();snapshots.push(getSnowMemoryInspection());
      }
      const last=make('memory-lifecycle-reused-key');await settle(last.snow);
      const survivor=stable.snow.getInspection(),contact=stable.snow.sample(0,0);
      last.dispose();stable.dispose();
      return {snapshots,survivor:{shown:survivor.shown,error:survivor.error,contact:!!contact},released:getSnowMemoryInspection()};
    });
    assert(report.lifecycle.snapshots.every(s=>s.workers===1&&s.sources===1&&s.queued<=s.sources));
    assert(report.lifecycle.survivor.shown===.4&&!report.lifecycle.survivor.error&&report.lifecycle.survivor.contact);
    assert.equal(report.lifecycle.released.sources,0);assert.equal(report.lifecycle.released.workers,0);
  }
  report.passed=!report.crashed&&report.errors.length===0;
}catch(e){report.failure=e.stack;console.error(e.message);process.exitCode=1;}
finally{await save();await browser.close();}
