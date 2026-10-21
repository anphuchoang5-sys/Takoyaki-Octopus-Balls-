import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {decodePreparedSnow} from '../dist/town/assets/shared/snow-prepared.js';
const out='artifacts/editor/snow-startup',baseline=JSON.parse(await readFile(`${out}/prepared-data.json`,'utf8'));
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)||'prepared-checks';
await mkdir(out,{recursive:true});
const report={codec:[],frames:[],occlusion:[],fallback:[],errors:[]};
for(const entry of baseline){
  const raw=gunzipSync(await readFile(`dist/town/assets/${entry.assetId}/snow-support.bin.gz`));
  const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const state=decodePreparedSnow(buffer,entry.fingerprint);assert.equal(state.facetCount,entry.facets);
  assert.throws(()=>decodePreparedSnow(buffer,'changed-building'));assert.throws(()=>decodePreparedSnow(buffer.slice(0,-16),entry.fingerprint));
  const invalid=buffer.slice(0);new DataView(invalid).setUint32(4,0xffffffff);assert.throws(()=>decodePreparedSnow(invalid,entry.fingerprint));
  report.codec.push({id:entry.assetId,sourceMismatch:true,truncated:true,invalidHeader:true});
}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:4,length:z===4?1:0})),instances:[]},environment:{time:'afternoon',weather:'clear',snowAmount:0}})));
  await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready);
  for(const entry of baseline){
    const checked=await page.evaluate(async entry=>{
      const {decodePreparedSnow}=await import('/town/assets/shared/snow-prepared.js'),{createSurfaceSnow}=await import('/town/assets/shared/snow-geometry.js');
      const response=await fetch(`/town/assets/${entry.assetId}/snow-support.bin.gz`),data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      const state=decodePreparedSnow(data,entry.fingerprint);
      // The real factory supplies current shaping parameters, rather than a test copy.
      townEditor.state.place(entry.assetId,4,4);const asset=townEditor.sceneView.getInstances()[0].asset,{options}=asset.snow.getPreparationSource();
      const snow=createSurfaceSnow(options,state,new Map()),result=[];
      for(const old of entry.comparisons){
        snow.setAmount(old.amount);const frame=snow.takeFrame(),hashes={};
        for(const key of Object.keys(old.before)){
          let array=frame[key];
          if(frame.indices&&['positions','normals','colors'].includes(key)){array=new Float32Array(frame.indices.length*3);for(let i=0;i<frame.indices.length;i++)array.set(frame[key].subarray(frame.indices[i]*3,frame.indices[i]*3+3),i*3);}
          hashes[key]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',array)),n=>n.toString(16).padStart(2,'0')).join('');
        }
        result.push({id:entry.assetId,amount:old.amount,equal:JSON.stringify(hashes)===JSON.stringify(old.before),hashes});snow.releaseFrame();
      }
      snow.dispose();
      const T=await import('three'),ray=new T.Raycaster(),occlusion=[];
      for(const rotation of [0,90,180,270]){
        const l=townEditor.getLayout();l.instances[0].rotation=rotation;townEditor.loadLayout(l);
        const current=townEditor.sceneView.getInstances()[0].asset,meshes=[],sides=new Map();current.root.updateMatrixWorld(true);
        current.root.traverse(n=>{if(!n.isMesh||n.isInstancedMesh)return;for(let p=n;p&&p!==current.root;p=p.parent)if(!p.visible||p.userData.snowLayer||p.name==='樱家外部环境响应')return;meshes.push(n);});
        for(const mesh of meshes)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(!sides.has(m)){sides.set(m,m.side);m.side=T.DoubleSide;}
        let maxError=0,probes=0;
        try{for(let x=-6.827;x<7;x+=1.43)for(let z=-6.783;z<7;z+=1.47){
          const p=current.root.localToWorld(new T.Vector3(x,0,z));ray.set(new T.Vector3(p.x,35,p.z),new T.Vector3(0,-1,0));
          const hit=ray.intersectObjects(meshes,false).find(h=>{const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return !m.transparent&&m.depthWrite!==false&&h.point.y>=0;});
          const actual=townEditor.weather.sampleSurface(p.x,p.z);maxError=Math.max(maxError,Math.abs(actual.point[1]-(hit?.point.y??0)));probes++;
        }}finally{for(const [m,side]of sides)m.side=side;}
        occlusion.push({id:entry.assetId,rotation,maxError,probes});
      }
      const layout=townEditor.getLayout();layout.instances=[];townEditor.loadLayout(layout);return {frames:result,occlusion};
    },entry);
    report.frames.push(...checked.frames);report.occlusion.push(...checked.occlusion);
    assert(checked.frames.every(f=>f.equal),`Snow output changed for ${entry.assetId}`);assert(checked.occlusion.every(o=>o.maxError<.002),'Static weather occlusion changed');
    console.log(`${entry.assetId}: five exact frames and four rotated occlusion checks passed`);
  }
  // A tiny real source reaches the same Worker loader without expensive models.
  for(const mode of ['missing','corrupt','stale','cancel']){
    let requests=0;
    await page.context().route('**/__snow-prepared-test*',async route=>{
      requests++;
      if(mode==='cancel')await new Promise(r=>setTimeout(r,250));
      if(mode==='missing'||mode==='cancel')return route.fulfill({status:404,body:''});
      const body=mode==='corrupt'?Buffer.from('broken'):await readFile('dist/town/assets/convenience/snow-support.bin.gz');
      return route.fulfill({status:200,body,contentType:'application/octet-stream'});
    });
    const result=await page.evaluate(async mode=>{
      const T=await import('three'),{createSnowLayer,surfacePart,getSnowMemoryInspection}=await import('/town/assets/shared/snow.js');
      const make=()=>{const root=new T.Group(),g=new T.PlaneGeometry(2,2,4,4),m=new T.MeshBasicMaterial();g.rotateX(-Math.PI/2);root.add(new T.Mesh(g,m));
        const snow=createSnowLayer(root,{key:'prepared-test',parts:[surfacePart('test')],choose:()=>0,preparedURL:new URL('/__snow-prepared-test',location.href).href});
        snow.setAmount(.4);return {snow,dispose(){snow.dispose();g.dispose();m.dispose();}};};
      // Keep another source alive so cancellation exercises an active shared Worker.
      const stable=make();let start=performance.now();
      while(stable.snow.getInspection().shown!==.4){if(performance.now()-start>15000)throw Error('Fallback timed out');await new Promise(r=>setTimeout(r,10));}
      const inspection=stable.snow.getInspection();
      let cancelled=null;
      if(mode==='cancel'){
        // Retain a distinct source while the prepared-test entry is removed.
        const root=new T.Group(),g=new T.PlaneGeometry(1,1),m=new T.MeshBasicMaterial();g.rotateX(-Math.PI/2);root.add(new T.Mesh(g,m));
        const keeper=createSnowLayer(root,{key:'keeper',parts:[surfacePart('test')],choose:()=>0});keeper.setAmount(.4);
        stable.dispose();const pending=make();await new Promise(r=>setTimeout(r,50));pending.dispose();
        const restored=make();start=performance.now();
        while(restored.snow.getInspection().shown!==.4){if(performance.now()-start>15000)throw Error('Cancelled fetch blocked queue');await new Promise(r=>setTimeout(r,10));}
        cancelled={shown:restored.snow.getInspection().shown,keeper:keeper.getInspection().shown,pool:getSnowMemoryInspection()};
        restored.dispose();keeper.dispose();g.dispose();m.dispose();
      }else stable.dispose();
      return {mode,shown:inspection.shown,path:inspection.preparationMode,reason:inspection.preparationFallback,cancelled,released:getSnowMemoryInspection()};
    },mode);
    await page.context().unroute('**/__snow-prepared-test*');
    assert(requests>0);assert.equal(result.shown,.4);assert.equal(result.path,'generated');assert(result.reason);assert.equal(result.released.sources,0);assert.equal(result.released.workers,0);
    if(mode==='cancel')assert.equal(result.cancelled.keeper,.4);
    report.fallback.push({...result,requests});console.log(`${mode}: fallback/release passed`);
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}
finally{await writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2));await browser.close();}
