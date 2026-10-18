import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const output='artifacts/editor/v2.4/weather';await mkdir(output,{recursive:true});
const report={startedAt:new Date().toISOString(),checks:[],errors:[],limitations:[
  'Real Chrome/WebGL and browser interaction in isolated storage; art acceptance remains with the user.',
  'Vertical rain, static authored geometry. No wind-driven rain, runoff simulation, puddle accumulation or other weather.',
  'Time selector and walking remain pending; night lamp preservation is tested through the existing B API.'
]};
let browser,page;
async function check(name,fn){const start=Date.now();try{const data=await fn();report.checks.push({name,passed:true,ms:Date.now()-start,...(data?{data}:{})});}catch(e){report.checks.push({name,passed:false,error:e.stack});throw e;}}
const fixture={format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:z===3?3:2,length:z>=2&&z<=7?(z===3?5:6):0})),instances:[
  {id:'weather-house',assetId:'sakura-house',x:4,z:4,rotation:0},
  {id:'weather-store',assetId:'convenience',x:5,z:4,rotation:0},
  {id:'weather-road',assetId:'road-cross',x:4,z:5,rotation:0},
  {id:'weather-road-2',assetId:'road-straight',x:5,z:5,rotation:90}
]};
const pause=ms=>page.waitForTimeout(ms);
async function rain(value){await page.evaluate(v=>window.townEditor.setWeather(v),value);}
async function screenshot(name){await pause(700);await page.screenshot({path:`${output}/${name}.png`});}
async function compareSurfaces(){return page.evaluate(async()=>{
  const THREE=await import('three'),app=window.townEditor,ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  let probes=0,maxError=0,slopes=0;const heights={};
  for(const {placement,asset} of app.sceneView.getInstances()){
    const meshes=[];asset.root.updateMatrixWorld(true);
    asset.root.traverse(n=>{
      if(!n.isMesh||n.isInstancedMesh)return;
      // Independent ray intersection, not the weather triangle bins or surface filter.
      for(let p=n;p&&p!==asset.root;p=p.parent)if(!p.visible||p.name==='樱家外部环境响应')return;
      meshes.push(n);
    });
    const sides=new Map();for(const mesh of meshes)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(!sides.has(m)){sides.set(m,m.side);m.side=THREE.DoubleSide;}
    heights[placement.id]={min:Infinity,max:0};
    for(let x=-6.827;x<7;x+=.71)for(let z=-6.783;z<7;z+=.73){
      const p=asset.root.localToWorld(new THREE.Vector3(x,0,z));ray.set(new THREE.Vector3(p.x,35,p.z),down);
      const hits=ray.intersectObjects(meshes,false).filter(h=>{const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return !m.transparent&&m.depthWrite!==false&&h.point.y>=0;});
      const expected=hits[0]?.point.y||0,actual=app.weather.sampleSurface(p.x,p.z),error=Math.abs(actual.point[1]-expected);
      if(error>maxError)maxError=error;
      if(error>.002)throw new Error(`Surface mismatch ${placement.id} local ${x},${z}: ${actual.point[1]} vs ${expected}`);
      if(actual.normal[1]<.99&&actual.normal[1]>.1)slopes++;
      heights[placement.id].min=Math.min(heights[placement.id].min,expected);heights[placement.id].max=Math.max(heights[placement.id].max,expected);probes++;
    }
    for(const [material,side] of sides)material.side=side;
  }
  return{probes,maxError,slopes,heights};
});}
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__editor?.ready);
  await page.evaluate(l=>window.townEditor.loadLayout(l),fixture);
  await check('clear/rain via visible controls, capability status and save invariance',async()=>{
    await page.locator('#enter-editor').click();await page.locator('[data-panel="environment"]').click();
    assert.equal(await page.locator('#weather').inputValue(),'clear');assert.equal(await page.locator('#time').isDisabled(),true);
    assert.equal(await page.locator('#weather option[value="hail"]').count(),0);
    assert.equal(await page.evaluate(async()=> (await window.townEditor.requestMode('god')).ok),true);
    const before=await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1'));
    await page.locator('#weather').selectOption('rain');await page.waitForFunction(()=>window.__editor.inspection.weather.visible);
    assert.equal(await page.evaluate(()=>window.townEditor.sceneView.getInstances()[0].asset.getEnvironmentState().rainOn),true);
    await page.locator('#weather').selectOption('clear');assert.equal(await page.evaluate(()=>window.__editor.inspection.weather.visible),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),before);
    assert.equal(await page.evaluate(async()=> (await window.townEditor.setWeather('hail')).ok),false);
    assert.equal(await page.evaluate(()=>window.__editor.inspection.weather.weather),'clear');
    await page.locator('#exit-editor').click();await page.evaluate(()=>window.townEditor.focusInstance('weather-house'));
    await screenshot('01-clear-close');
  });
  await rain('rain');
  await check('real triangles vs independent raycaster: roofs, sloping tiles, courtyard, shop and roads',async()=>{
    const data=await compareSurfaces();assert.ok(data.probes>1000);assert.ok(data.slopes>30);return data;
  });
  await check('all enabled map cells rain; streaks and splashes stop at first contact, never below roofs',async()=>{
    const data=await page.evaluate(()=>{
      const app=window.townEditor,samples=app.weather.getRainSamples(),layout=app.getLayout();
      let invalid=0,roof=0,courtyard=0,road=0,terrain=0;
      for(const c of samples){const [x,y,z]=c.point,cx=Math.floor(x/14+5),cz=Math.floor(z/14+5),r=layout.rows[cz];
        if(!r||cx<r.start||cx>=r.start+r.length||!Number.isFinite(c.headY)||c.headY<y-1e-5||c.tailY<c.headY)invalid++;
        const hit=app.weather.sampleSurface(x,z);if(Math.abs(hit.point[1]-y)>.0001)invalid++;
        if(c.assetId==='sakura-house'&&y>2)roof++;else if(c.assetId==='sakura-house')courtyard++;
        if(c.assetId?.startsWith('road'))road++;if(c.surface==='terrain')terrain++;
      }
      return{invalid,roof,courtyard,road,terrain,samples:samples.length,activeCells:layout.rows.reduce((n,r)=>n+r.length,0),inspection:app.weather.getInspection()};
    });
    assert.equal(data.invalid,0);assert.equal(data.samples,data.activeCells*144);for(const k of ['roof','courtyard','road','terrain'])assert.ok(data[k]>0);
    assert.ok(data.inspection.falling>0&&data.inspection.splashing>0);return data;
  });
  await screenshot('02-rain-roof-yard');
  await page.evaluate(()=>window.townEditor.focusInstance('weather-road'));await screenshot('03-rain-road');
  await page.evaluate(()=>window.townEditor.showOverview());await screenshot('04-rain-whole-map');
  await check('rain stays active during actual click/drag/rotate/delete/undo editor gestures',async()=>{
    await page.locator('#enter-editor').click();await page.locator('[data-panel="assets"]').click();
    await page.evaluate(()=>window.townEditor.showOverview({top:true,immediate:true}));await page.waitForFunction(()=>!window.__editor.inspection.camera.busy);
    const point=async(x,z)=>page.evaluate(([x,z])=>window.__editor.screenCell(x,z),[x,z]);
    const from=await point(4,4),to=await point(4,3);await page.mouse.click(from.x,from.y);await page.locator('#rotate').click();
    assert.equal(await page.evaluate(()=>window.townEditor.state.at(4,4).rotation),90);
    await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:15});await page.mouse.up();
    assert.equal(await page.evaluate(()=>window.townEditor.state.at(4,3)?.id),'weather-house');
    await page.locator('#delete').click();assert.equal(await page.evaluate(()=>window.townEditor.state.at(4,3)),null);
    await page.locator('#undo').click();assert.equal(await page.evaluate(()=>window.townEditor.state.at(4,3)?.id),'weather-house');
    await page.locator('#undo').click();await page.locator('#undo').click();
    assert.deepEqual(await page.evaluate(()=>window.townEditor.getLayout()),fixture);
    assert.equal(await page.evaluate(()=>window.__editor.inspection.weather.weather),'rain');
    await page.locator('#exit-editor').click();await page.evaluate(()=>window.townEditor.focusInstance('weather-house'));await pause(1000);
  });
  await check('four rotations, move, removal and undo synchronously rebuild roof impacts',async()=>{
    const rotations=[];
    for(let i=0;i<4;i++){
      const data=await page.evaluate(()=>{const a=window.townEditor,before=a.weather.getInspection().layoutRevision;a.state.rotate('weather-house');return{before,after:a.weather.getInspection().layoutRevision,rotation:a.getLayout().instances[0].rotation};});
      assert.ok(data.after>data.before);const comparison=await compareSurfaces();rotations.push({...data,probes:comparison.probes});
      if(i===0){await page.evaluate(()=>window.townEditor.focusInstance('weather-house'));await screenshot('05-rain-rotated-90');}
    }
    const edits=await page.evaluate(()=>{
      const a=window.townEditor,probe=(x,z)=>a.weather.sampleSurface(x,z);
      const old=probe(-7,-7);a.state.move('weather-house',3,3);const cleared=probe(-7,-7),moved=probe(-21,-21);
      a.state.remove('weather-house');const deleted=probe(-21,-21);a.state.undo();const restored=probe(-21,-21);
      const inherited=a.sceneView.getInstances().find(e=>e.placement.id==='weather-house').asset.getEnvironmentState();a.state.undo();
      return{old,cleared,moved,deleted,restored,inherited};
    });
    assert.ok(edits.old.point[1]>2);assert.equal(edits.cleared.point[1],0);assert.equal(edits.moved.point[1],edits.old.point[1]);
    assert.equal(edits.deleted.point[1],0);assert.equal(edits.restored.point[1],edits.old.point[1]);assert.equal(edits.inherited.weather,'rain');
    return{rotations,edits};
  });
  await check('shared cumulative seconds, new-instance inheritance, exactly one B drip system, preserved light beam',async()=>{
    const data=await page.evaluate(async()=>{
      const a=window.townEditor;const p=a.state.place('sakura-house',6,5,270);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const entries=a.sceneView.getInstances().filter(e=>e.placement.assetId==='sakura-house');
      const clocks=entries.map(e=>e.asset.getEnvironmentState()),weatherClock=a.weather.getInspection().elapsedSeconds;
      const groups=entries.map(e=>{let count=0;e.asset.root.traverse(n=>{if(n.name==='屋檐聚水、落滴与落地涟漪')count++;});return count;});
      const asset=entries[0].asset;asset.setEnvironment({time:'night'});
      const signature=()=>{const names=['向下展开的动画式光束','地面圆形光斑'];return names.map(name=>{const n=asset.root.getObjectByName(name);return{name,positions:Array.from(n.geometry.attributes.position.array),userData:n.userData,opacity:n.material.opacity,visible:n.visible};});};
      const before=signature();await a.setWeather('clear');const clear=asset.getEnvironmentState();await a.setWeather('rain');const after=signature(),rain=asset.getEnvironmentState();
      asset.setEnvironment({time:'afternoon'});a.state.remove(p.id);
      return{clocks,weatherClock,groups,before,after,clear,rain};
    });
    assert.ok(data.weatherClock>1);for(const c of data.clocks){assert.equal(c.elapsedSeconds,data.weatherClock);assert.equal(c.weather,'rain');assert.equal(c.dripSources,44);}
    assert.deepEqual(data.groups,[1,1]);assert.deepEqual(data.before,data.after);assert.equal(data.clear.time,'night');assert.equal(data.clear.rainOn,false);assert.equal(data.rain.time,'night');assert.equal(data.rain.lightsOn,true);
    // Keep the JSON evidence readable; geometry equality was asserted above.
    return{clocks:data.clocks.map(({elapsedSeconds,weather,dripSources})=>({elapsedSeconds,weather,dripSources})),weatherClock:data.weatherClock,groups:data.groups,beamUnchanged:true};
  });
  await check('shape/import changes, unknown weather rejection, reload and saved layout preservation',async()=>{
    const data=await page.evaluate(async()=>{
      const a=window.townEditor,before=a.getLayout(),rows=structuredClone(before.rows);rows[4]={start:0,length:0};
      a.state.applyShape(a.state.previewShape(rows),{confirmAffected:true});const removed=a.weather.sampleSurface(-7,-7);a.state.undo();const restored=a.weather.sampleSurface(-7,-7);
      const changed=a.getLayout();changed.instances.find(i=>i.id==='weather-house').assetId='road-corner';a.loadLayout(changed);const replacement=a.weather.sampleSurface(-7,-7);a.state.undo();
      const raw=localStorage.getItem('rainy-corner.editor.layout.v1');let rejected=false;try{a.loadLayout({...before,version:999});}catch{rejected=true;}
      const unchanged=raw===localStorage.getItem('rainy-corner.editor.layout.v1');await a.setWeather('clear');const clear=a.weather.getInspection();return{removed,restored,replacement,rejected,unchanged,clear,layout:a.getLayout()};
    });
    assert.equal(data.removed,null);assert.ok(data.restored.point[1]>2);assert.ok(data.replacement.point[1]<1);assert.ok(data.rejected&&data.unchanged);assert.equal(data.clear.visible,false);assert.equal(data.clear.falling,0);assert.equal(data.clear.splashing,0);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__editor?.ready);assert.deepEqual(await page.evaluate(()=>window.townEditor.getLayout()),data.layout);assert.equal(await page.evaluate(()=>window.__editor.inspection.weather.weather),'clear');
    return{shapeUndo:true,replacement:true,rejection:true,reload:true};
  });
  await check('100 enabled tiles and empty map remain valid',async()=>{
    const data=await page.evaluate(async()=>{
      const a=window.townEditor,before=a.getLayout(),full={...before,rows:Array.from({length:10},()=>({start:0,length:10})),instances:Array.from({length:100},(_,i)=>({id:`rain-capacity-${i}`,assetId:'road-cross',x:i%10,z:Math.floor(i/10),rotation:0}))};
      a.loadLayout(full);await a.setWeather('rain');const fullInspection=a.weather.getInspection();
      a.loadLayout({...full,rows:full.rows.map(()=>({start:0,length:0})),instances:[]});const empty=a.weather.getInspection();a.loadLayout(before);return{full:fullInspection,empty};
    });assert.equal(data.full.columns,14400);assert.equal(data.empty.columns,0);return data;
  });
  await check('live close-up rain, rotation and clear video',async()=>{
    await page.evaluate(()=>window.townEditor.focusInstance('weather-house'));await pause(1000);
    await page.evaluate(()=>{window.__weatherVideo=new Promise(resolve=>{const stream=document.querySelector('#editor-world').captureStream(24),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());stream.getTracks().forEach(t=>t.stop());let text='';for(const byte of bytes)text+=String.fromCharCode(byte);resolve(btoa(text));};window.__stopWeatherVideo=()=>recorder.stop();recorder.start();});});
    await pause(2500);await page.evaluate(()=>window.townEditor.state.rotate('weather-house'));await pause(2500);await rain('clear');await pause(1500);
    await page.evaluate(()=>window.__stopWeatherVideo());const video=await page.evaluate(()=>window.__weatherVideo);await writeFile(`${output}/06-rain-rotation-clear.webm`,Buffer.from(video,'base64'));
    await rain('rain');await screenshot('07-final-rain-close');
    return{file:'06-rain-rotation-clear.webm',bytes:Buffer.from(video,'base64').length};
  });
  await check('B assets and original convenience/world sources match pre-change hashes',async()=>{
    const entries=JSON.parse(await readFile('artifacts/editor/v2.4/protected-before.json','utf8'));let count=0;
    for(const entry of entries){const hash=createHash('sha256').update(await readFile(entry.path)).digest('hex');assert.equal(hash.toLowerCase(),entry.hash.toLowerCase(),entry.path);count++;}return{files:count};
  });
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;await page?.screenshot({path:`${output}/failure.png`}).catch(()=>{});}
finally{await browser?.close();report.finishedAt=new Date().toISOString();await writeFile(`${output}/inspection.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.map(({name,passed,ms})=>({name,passed,ms})),errors:report.errors,failure:report.failure},null,2));if(!report.passed)process.exitCode=1;}
