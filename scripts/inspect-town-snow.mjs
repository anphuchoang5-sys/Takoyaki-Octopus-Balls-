import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/editor/snow';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],results=[],shots=[];
const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});shots.push(name);}
async function check(name,run){try{const evidence=await run();results.push({name,ok:true,evidence});}catch(error){results.push({name,ok:false,error:error.stack});}}
try{
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>window.__editor?.ready,{},{timeout:60000});
  const layout=await page.evaluate(()=>{
    const s=townEditor.state,l=s.getLayout();l.rows=l.rows.map((r,z)=>({start:3,length:z>=3&&z<=5?3:0}));l.instances=[];
    s.loadLayout(l);s.place('sakura-house',3,3);s.place('convenience',4,3);s.place('mitsuya',5,3);
    for(let x=3;x<=5;x++)s.place('road-straight',x,4,90);
    townEditor.showOverview({immediate:true});return s.getLayout();
  });
  await page.waitForTimeout(1000);
  for(const time of ['morning','afternoon','dusk','night']){
    await page.evaluate(t=>townEditor.setTime(t),time);await page.waitForTimeout(500);await shot(`01-${time}`);
    const lighting=await page.evaluate(()=>__editor.inspection.lighting);
    results.push({name:`period-${time}`,ok:lighting.environment.time===time,evidence:lighting});
  }
  await page.evaluate(()=>{townEditor.environment.set({weather:'snow',snowAmount:.18});});await page.waitForTimeout(500);await shot('02-thin-snow-night');
  await page.evaluate(()=>{townEditor.environment.set({time:'afternoon',weather:'snow',snowAmount:1});});await page.waitForTimeout(500);await shot('03-thick-snow');
  for(const id of ['sakura-house','mitsuya']){
    await page.evaluate(id=>{const p=townEditor.state.getLayout().instances.find(p=>p.assetId===id);__editor.cameraRig.focus(p.id,{immediate:true});},id);
    await page.waitForTimeout(1000);await shot(`04-${id}-snow`);
  }
  await page.evaluate(()=>townEditor.setTime('night'));await page.waitForTimeout(500);await shot('05-mitsuya-night-snow');
  await check('descriptor-world-position-and-target',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),entries=townEditor.sceneView.getInstances(),assignments=__editor.inspection.lighting.assignments;
      return assignments.map(a=>{
        const e=entries.find(e=>e.placement.id===a.instanceId),d=e.asset.getLightingDescriptors().find(d=>d.id===a.id);
        const position=e.asset.root.localToWorld(new T.Vector3(...d.position)).toArray(),target=d.target?e.asset.root.localToWorld(new T.Vector3(...d.target)).toArray():null;
        return {...a,expectedPosition:position,expectedTarget:target};
      });
    });
    for(const d of data){assert.deepEqual(d.position,d.expectedPosition);assert.deepEqual(d.target,d.expectedTarget);}
    return data;
  });
  await check('elapsed-time-rates-and-continuity',async()=>{
    const data=await page.evaluate(async()=>{
      const {createEnvironmentState}=await import('/town/editor/environment.js'),e=createEnvironmentState(),trace=[];
      const at=(seconds)=>{e.advance(seconds);trace.push({elapsed:seconds,...e.get()});};
      e.set({weather:'snow'});at(0);at(15);at(30);at(60);at(90);
      e.set({weather:'clear'});at(150);at(390);
      e.set({weather:'snow'});at(420);e.set({weather:'rain'});at(435);e.set({weather:'snow',time:'night'});at(450);
      e.set({snowAmount:1,weather:'rain'});at(480);at(510);
      const fine=createEnvironmentState({time:'night',weather:'snow',snowAmount:0});for(let i=1;i<=3600;i++)fine.advance(i/60);
      return {trace,fine:fine.get(),historyRevision:townEditor.state.revision};
    });
    assert.deepEqual(data.trace.map(t=>Number(t.snowAmount.toFixed(5))),[0,.25,.5,1,1,.8,0,.5,.25,.5,.5,0]);
    assert(Math.abs(data.fine.snowAmount-1)<1e-10);return data;
  });
  await check('real-host-clock-no-layout-history',async()=>{
    const before=await page.evaluate(()=>{townEditor.environment.set({weather:'snow',snowAmount:0});return{env:townEditor.environment.get(),elapsed:townEditor.environment.elapsedSeconds,revision:townEditor.state.revision,wall:performance.now()};});
    await page.waitForTimeout(3200);
    const after=await page.evaluate(()=>({env:townEditor.environment.get(),elapsed:townEditor.environment.elapsedSeconds,revision:townEditor.state.revision,wall:performance.now()}));
    assert.equal(after.revision,before.revision);assert(Math.abs(after.env.snowAmount-(after.elapsed-before.elapsed)/60)<.001);
    assert(after.elapsed-before.elapsed>2.5);return {before,after};
  });
  await check('snow-volume-and-first-contact',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),api=townEditor;api.environment.set({weather:'snow',snowAmount:1});
      const entries=api.sceneView.getInstances().filter(e=>!e.placement.assetId.startsWith('road-'));
      const surfaces=entries.map(({placement,asset})=>{
        const p=asset.root.localToWorld(new T.Vector3(0,0,0)),hit=api.weather.sampleSurface(p.x,p.z);
        const stats=asset.snow.getInspection();let bottom=Infinity,top=-Infinity,nonfinite=0;
        asset.snow.root.traverse(n=>{if(n.geometry){const a=n.geometry.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i);if(!Number.isFinite(y))nonfinite++;bottom=Math.min(bottom,y);top=Math.max(top,y);}}});
        return {id:placement.assetId,hit,stats,span:top-bottom,nonfinite};
      });return surfaces;
    });
    for(const d of data){assert(d.hit.point[1]>3);assert.equal(d.hit.surface,'snow-model');assert(d.span>1);assert.equal(d.nonfinite,0);}
    await page.waitForTimeout(500);const flakes=await page.evaluate(()=>__editor.inspection.weather.snowfall);
    assert(flakes.samples.filter(f=>f.visible).every(f=>f.y-f.size>f.hitY));return {surfaces:data,flakeSamples:flakes.samples.length,active:flakes.count};
  });
  await check('rotate-move-delete-undo-and-resource-isolation',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),api=townEditor,s=api.state,entry=api.sceneView.getInstances().find(e=>e.placement.assetId==='mitsuya'),id=entry.placement.id;
      const other=s.place('mitsuya',5,5),neighbor=api.sceneView.getInstances().find(e=>e.placement.id===other.id);
      let released=0,neighborReleased=0;const seen=new Set();
      function watch(asset,fn){asset.snow.root.traverse(n=>{for(const r of [n.geometry,n.material])if(r&&!seen.has(r)){seen.add(r);r.addEventListener('dispose',fn);}});}
      watch(entry.asset,()=>released++);const owned=seen.size;watch(neighbor.asset,()=>neighborReleased++);
      const before=api.environment.get();s.rotate(id);const yaw=entry.asset.root.rotation.y;
      const local=new T.Vector3(0,0,1),point=entry.asset.root.localToWorld(local.clone()),rotatedHit=api.weather.sampleSurface(point.x,point.z);
      s.move(id,4,5);const moved=entry.asset.root.localToWorld(local.clone()),movedHit=api.weather.sampleSurface(moved.x,moved.z);
      const vacant=api.weather.sampleSurface((5-4.5)*14,(3-4.5)*14);
      s.remove(id);const removed=api.weather.sampleSurface((4-4.5)*14,(5-4.5)*14);
      s.undo();const restored=api.sceneView.getInstances().find(e=>e.placement.id===id);
      const result={owned,released,neighborReleased,yaw,rotatedHit,movedHit,vacant,removed,restored:restored.placement,restoredEnvironment:restored.asset.getEnvironment(),before};
      s.undo();s.undo();s.remove(other.id);return result;
    });
    assert.equal(data.released,data.owned);assert.equal(data.neighborReleased,0);assert.equal(data.yaw,Math.PI/2);
    assert.equal(data.rotatedHit.surface,'snow-model');assert.equal(data.movedHit.surface,'snow-model');assert.equal(data.vacant.surface,'snow-terrain');assert.equal(data.removed.surface,'snow-terrain');
    assert.equal(data.restored.rotation,90);assert.equal(data.restoredEnvironment.snowAmount,1);return data;
  });
  await check('shape-boundary-and-undo',async()=>{
    const data=await page.evaluate(()=>{
      const api=townEditor,s=api.state,before=s.getLayout(),rows=structuredClone(before.rows);rows[3]={start:4,length:2};
      const plan=s.previewShape(rows);s.applyShape(plan,{confirmAffected:true});
      const outside=api.weather.sampleSurface(-21,-21),remaining=s.getLayout().instances.length;s.undo();
      return {affected:plan.affected.length,outside,remaining,restored:JSON.stringify(s.getLayout())===JSON.stringify(before)};
    });
    assert.equal(data.outside,null);assert.equal(data.affected,1);assert(data.restored);return data;
  });
  await check('residual-snow-rain-contacts',async()=>{
    const data=await page.evaluate(()=>{
      const api=townEditor;api.environment.set({weather:'rain',snowAmount:.75});api.weather.update(api.environment.elapsedSeconds);
      const samples=api.weather.getRainSamples();
      return {count:samples.length,snowHits:samples.filter(s=>s.surface.startsWith('snow')).length,below:samples.filter(s=>s.headY+1e-5<s.point[1]).length,ground:samples.filter(s=>s.surface==='snow-terrain').slice(0,8)};
    });
    assert(data.snowHits>0);assert.equal(data.below,0);assert(data.ground.every(s=>s.point[1]>.05));return data;
  });
  await check('new-old-and-invalid-import-transaction',async()=>{
    const data=await page.evaluate(()=>{
      const api=townEditor,baseline=api.state.getLayout();api.environment.set({time:'night',weather:'clear',snowAmount:.6});
      const text=api.exportJSON(),doc=JSON.parse(text),newDoc=structuredClone(doc);newDoc.environment={time:'morning',weather:'snow',snowAmount:.3};newDoc.layout.instances[0].rotation=180;
      api.importJSON(JSON.stringify(newDoc));const changed=api.environment.get();api.state.undo();const undone=api.environment.get();
      api.importJSON(JSON.stringify(baseline));const old=api.environment.get();
      const cases=['{',JSON.stringify({...doc,version:999})];
      for(const patch of [{snowAmount:-1},{snowAmount:2},{snowAmount:'1'},{time:'winter'},{weather:'hail'}]){const d=structuredClone(doc);Object.assign(d.environment,patch);cases.push(JSON.stringify(d));}
      for(const kind of ['duplicate','outside','unknown']){const d=structuredClone(doc);if(kind==='duplicate')d.layout.instances.push({...d.layout.instances[0],id:'other'});if(kind==='outside')d.layout.instances[0].x=99;if(kind==='unknown')d.layout.instances[0].assetId='unreleased';cases.push(JSON.stringify(d));}
      const before=api.exportJSON(),saved=localStorage.getItem('rainy-corner.editor.layout.v1');let rejected=0;
      for(const input of cases){try{api.importJSON(input);}catch{rejected++;}if(api.exportJSON()!==before||localStorage.getItem('rainy-corner.editor.layout.v1')!==saved)throw new Error('Invalid import partially applied');}
      return {changed,undone,old,rejected,cases:cases.length,exported:JSON.parse(api.exportJSON())};
    });
    assert.equal(data.changed.time,'morning');assert.equal(data.undone.time,'night');assert.equal(data.old.weather,'clear');assert.equal(data.old.snowAmount,.6);assert.equal(data.rejected,data.cases);return data;
  });
  await check('save-refresh-instance-id-and-environment',async()=>{
    await page.waitForTimeout(1200);
    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('rainy-corner.editor.layout.v1')));
    await page.reload();await page.waitForFunction(()=>__editor?.ready,{},{timeout:60000});
    const after=await page.evaluate(()=>({layout:townEditor.getLayout(),environment:townEditor.environment.get()}));
    assert.deepEqual(after.layout,before.layout);assert.equal(after.environment.time,before.environment.time);assert.equal(after.environment.weather,before.environment.weather);assert(Math.abs(after.environment.snowAmount-before.environment.snowAmount)<.025);
    return {before,after};
  });
  await check('legacy-and-corrupt-save-protection',async()=>{
    const data=await page.evaluate(async()=>{
      const {readSavedLayout,connectAutosave,STORAGE_KEY}=await import('/town/editor/persistence.js'),{assetIds}=await import('/town/editor/catalog.js');
      const storage={value:'{invalid old data',getItem(){return this.value;},setItem(k,v){this.value=v;}};
      const bad=readSavedLayout(storage,assetIds),save=connectAutosave(townEditor.state,storage,{blocked:bad.blocked});save.save();save.dispose();
      const preserved=storage.value;storage.value=JSON.stringify(townEditor.getLayout());const legacy=readSavedLayout(storage,assetIds);
      return{blocked:bad.blocked,preserved,legacy:legacy.environment};
    });assert(data.blocked);assert.equal(data.preserved,'{invalid old data');assert.deepEqual(data.legacy,{time:'afternoon',weather:'clear',snowAmount:0});return data;
  });
  await check('bounded-multi-instance-light-pool-and-performance',async()=>{
    await page.evaluate(()=>{const s=townEditor.state;for(const [x,id]of [[3,'mitsuya'],[4,'convenience'],[5,'convenience']])if(!s.at(x,5))s.place(id,x,5);townEditor.environment.set({time:'night',weather:'snow',snowAmount:1});townEditor.showOverview({immediate:true});});
    await page.waitForTimeout(500);
    const before=await page.evaluate(()=>({frames:__editor.inspection.frames,wall:performance.now()}));await page.waitForTimeout(2000);
    const after=await page.evaluate(()=>({inspection:__editor.inspection,wall:performance.now()}));
    const light=after.inspection.lighting;assert(light.activeStoreLamps<=10);assert(light.activeDownlights<=4);
    return {lighting:light,fps:(after.inspection.frames-before.frames)/((after.wall-before.wall)/1000),drawCalls:after.inspection.drawCalls,triangles:after.inspection.triangles,buildings:after.inspection.scene.instances};
  });
  await page.evaluate(l=>{townEditor.loadLayout(l);townEditor.environment.set({time:'afternoon',weather:'clear',snowAmount:1});townEditor.showOverview({immediate:true});},layout);
  await page.waitForTimeout(500);await shot('06-snow-after-clear');
  await page.evaluate(()=>townEditor.environment.set({time:'night',weather:'snow',snowAmount:1}));await page.waitForTimeout(500);await shot('07-town-night-snow');
  await page.evaluate(()=>townEditor.environment.set({time:'afternoon',weather:'clear',snowAmount:0}));await page.waitForTimeout(500);await shot('08-thaw-restored');
  await writeFile(`${out}/inspection.json`,JSON.stringify({results,errors,shots,scope:'Directed environment checks only; building snow shapes remain paused drafts'},null,2));
  await writeFile(`${out}/smoke.json`,JSON.stringify({errors,layout,inspection:await page.evaluate(()=>__editor.inspection),shots},null,2));
  console.log(JSON.stringify({results:results.map(r=>({name:r.name,ok:r.ok,error:r.error})),errors,shots}));assert.deepEqual(errors,[]);assert(results.every(r=>r.ok));
}finally{await browser.close();}
