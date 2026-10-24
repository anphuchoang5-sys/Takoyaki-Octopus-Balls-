import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {FLOWER_REVIEW_TOWN as fixture,FLOWER_REVIEW_STORAGE_KEY as reviewKey} from '../dist/editor-preview/flowerorangebuilding-review.js';

const base=process.env.EDITOR_URL||'http://127.0.0.1:4173',url=base+'/?review=flowerorangebuilding';
const out='artifacts/editor/flowerorangebuilding',formalKey='rainy-corner.editor.layout.v1';
const id='flowerorangebuilding',main='review-flower-front';
const only=process.argv.find(v=>v.startsWith('--only='))?.slice(7);
await mkdir(out,{recursive:true});
const report={startedAt:new Date().toISOString(),url,checks:[],errors:[],screenshots:[],limitations:[
  'No asset-local snow, wet material, eave drips, local lamps or interior. Global lighting/precipitation are tested separately.',
  'Targeted formal-editor checks only, not whole-project regression or user aesthetic approval.'
]};
let browser,page;
const ready=()=>page.waitForFunction(()=>window.__editor?.ready,null,{timeout:90000});
const layout=()=>page.evaluate(()=>window.townEditor.getLayout());
const settle=()=>page.waitForFunction(()=>!window.__editor.inspection.camera.busy,null,{timeout:10000});
async function shot(name){await settle();await page.screenshot({path:`${out}/${name}.png`});report.screenshots.push(name+'.png');}
const panel=name=>page.locator(`[data-panel="${name}"]`).click();
async function clickCell(x,z){const p=await page.evaluate(([x,z])=>window.__editor.screenCell(x,z),[x,z]);await page.mouse.click(p.x,p.y);}
async function importFile(data){await page.locator('#import-file').setInputFiles({name:'isolated-town.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForTimeout(150);}
async function check(name,fn){if(only&&!name.startsWith(only))return;const start=performance.now();try{const data=await fn();report.checks.push({name,passed:true,ms:Math.round(performance.now()-start),data});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.stack});throw e;}}
async function view(target,direction,distance,instance=main){
  await page.evaluate(({target,direction,distance,instance})=>{const e=window.__editor,a=window.townEditor.sceneView.getInstances().find(e=>e.placement.id===instance).asset,saved=a.focus;a.focus={target,direction,distance};e.cameraRig.focus(instance,{immediate:true});a.focus=saved;},{target,direction,distance,instance});
  await settle();
}
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1,acceptDownloads:true});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto(only?url:base+'/',{waitUntil:'networkidle'});await ready();
  const old={...fixture.layout,instances:fixture.layout.instances.filter(p=>p.assetId!==id)};
  let sentinel=JSON.stringify(old);
  await check('ordinary first entry stays empty; old save is preserved by the isolated review',async()=>{
    assert.equal((await layout()).instances.length,0);
    // This is a fresh test browser; the sentinel is never written to the user's browser.
    await page.evaluate(({formalKey,sentinel})=>{window.townEditor.dispose();localStorage.setItem(formalKey,sentinel);},{formalKey,sentinel});
    await page.reload({waitUntil:'networkidle'});await ready();assert.deepEqual(await layout(),old);
    // Normal entry may migrate v1 to the existing v2 wrapper; freeze that save
    // before testing that the review entry never changes the formal key.
    sentinel=await page.evaluate(k=>{window.townEditor.dispose();return localStorage.getItem(k);},formalKey);
    await page.goto(url,{waitUntil:'networkidle'});await ready();assert.deepEqual(await layout(),fixture.layout);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),formalKey),sentinel);
    await page.locator('#enter-editor').click();
    assert.equal(await page.locator('[data-asset="flowerorangebuilding"] strong').innerText(),'花满橙瓦屋');
    assert.equal(await page.locator('#building-count').innerText(),'4 件可用');
    assert.equal(await page.locator('[data-asset="flowerorangebuilding"] img').evaluate(n=>n.naturalWidth),280);
    await page.locator('[data-asset="flowerorangebuilding"]').screenshot({path:`${out}/01-real-model-card.png`});report.screenshots.push('01-real-model-card.png');
    return {oldInstances:old.instances.length,reviewInstances:fixture.layout.instances.length,formalSaveUnchanged:true};
  });
  await check('click/repeated/native drag placement, collision, four rotations, move, direct drag, delete and undo',async()=>{
    await page.evaluate(()=>window.townEditor.showOverview({top:true,immediate:true}));await settle();
    await page.locator(`[data-asset="${id}"]`).click();await clickCell(3,5);const first=(await layout()).instances.find(p=>p.x===3&&p.z===5);
    assert.equal(first.assetId,id);await clickCell(3,5);assert.equal((await layout()).instances.length,fixture.layout.instances.length+1);
    await clickCell(4,5);const second=(await layout()).instances.find(p=>p.x===4&&p.z===5);
    const to=await page.evaluate(()=>window.__editor.screenCell(5,5)),box=await page.locator('#editor-world').boundingBox();
    await page.locator(`[data-asset="${id}"]`).dragTo(page.locator('#editor-world'),{targetPosition:{x:to.x-box.x,y:to.y-box.y}});
    assert.equal((await layout()).instances.length,fixture.layout.instances.length+3);
    await page.keyboard.press('Escape');await clickCell(3,5);const rotations=[];
    for(let i=0;i<4;i++){await page.locator('#rotate').click();rotations.push((await layout()).instances.find(p=>p.id===first.id).rotation);}assert.deepEqual(rotations,[90,180,270,0]);
    await page.locator('#move').click();await clickCell(4,5);assert.equal((await layout()).instances.find(p=>p.id===first.id).x,3);await clickCell(6,5);assert.equal((await layout()).instances.find(p=>p.id===first.id).x,6);await page.locator('#select-tool').click();
    const from=await page.evaluate(()=>window.__editor.screenCell(4,5)),end=await page.evaluate(()=>window.__editor.screenCell(3,5));
    await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:15});await page.mouse.up();assert.equal((await layout()).instances.find(p=>p.id===second.id).x,3);
    await clickCell(6,5);await page.locator('#delete').click();assert.ok(!(await layout()).instances.some(p=>p.id===first.id));await page.locator('#undo').click();assert.equal((await layout()).instances.find(p=>p.id===first.id).x,6);
    await shot('02-placement-and-editing');return {rotations,stableIds:[first.id,second.id],click:true,repeat:true,nativeDrag:true,directDrag:true,collisionRefusal:true};
  });
  await check('autosave/reload, real download/upload, old files, invalid imports are atomic',async()=>{
    const before=await layout();await page.reload({waitUntil:'networkidle'});await ready();assert.deepEqual(await layout(),before);
    await page.locator('#enter-editor').click();await panel('save');const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending;await download.saveAs(`${out}/exported-town.json`);
    const saved=JSON.parse(await readFile(`${out}/exported-town.json`,'utf8'));assert.equal(saved.format,'maruko-town');assert.equal(saved.version,2);assert.deepEqual(saved.layout,before);
    await importFile(old);assert.deepEqual(await layout(),old);await importFile(saved);assert.deepEqual(await layout(),before);
    const bad=[{...saved,version:999},{...saved,environment:{...saved.environment,snowAmount:4}},
      ...[{assetId:'unknown-building'},{x:11},{rotation:45}].map(p=>({...saved,layout:{...before,instances:before.instances.map((v,i)=>i?v:{...v,...p})}})),
      {...saved,layout:{...before,instances:[...before.instances,{...before.instances[0],id:'overlap'}]}}];
    const raw=await page.evaluate(k=>localStorage.getItem(k),reviewKey);
    for(const input of bad){await importFile(input);assert.deepEqual(await layout(),before);assert.equal(await page.evaluate(k=>localStorage.getItem(k),reviewKey),raw);}
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),formalKey),sentinel);
    await page.evaluate(t=>window.townEditor.importJSON(JSON.stringify(t)),fixture);await page.locator('#exit-editor').click();await page.evaluate(()=>window.townEditor.showOverview({immediate:true}));
    return {format:saved.format,version:saved.version,layoutVersion:saved.layout.version,instances:before.instances.length,invalidCases:bad.length,formalSaveUnchanged:true};
  });
  await check('factory geometry/material fidelity, four cell bounds, camera framing and grass mask',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),{createModel}=await import('/town/assets/flowerorangebuilding/index.js'),{hasGrassAt}=await import('/town/editor/grass.js');
      const digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),b=>b.toString(16).padStart(2,'0')).join('');
      const bytes=a=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength);
      async function signature(root){const nodes=[];root.traverse(n=>nodes.push(n));const data=await Promise.all(nodes.map(async(n,i)=>({name:n.name,type:n.type,transform:i?[n.position.toArray(),n.quaternion.toArray(),n.scale.toArray()]:null,castShadow:n.castShadow,receiveShadow:n.receiveShadow,
        attrs:n.geometry?await Promise.all(Object.entries(n.geometry.attributes).map(async([k,a])=>[k,a.itemSize,a.count,await digest(bytes(a.array))])):null,index:n.geometry?.index?await digest(bytes(n.geometry.index.array)):null,
        materials:(n.material?(Array.isArray(n.material)?n.material:[n.material]):[]).map(m=>({type:m.type,color:m.color?.getHexString(),emissive:m.emissive?.getHexString(),emissiveIntensity:m.emissiveIntensity,roughness:m.roughness,metalness:m.metalness,opacity:m.opacity,transparent:m.transparent,side:m.side,depthWrite:m.depthWrite,toneMapped:m.toneMapped,hook:m.onBeforeCompile.toString()}))})));
        return {hash:await digest(new TextEncoder().encode(JSON.stringify(data))),meshes:nodes.filter(n=>n.isMesh).length,triangles:nodes.filter(n=>n.isMesh).reduce((sum,n)=>sum+(n.geometry.index?.count||n.geometry.attributes.position.count)/3,0)};}
      const original=createModel(),app=window.townEditor,entries=app.sceneView.getInstances().filter(e=>e.placement.assetId==='flowerorangebuilding');
      try{
        const source=await signature(original.root),placed=await Promise.all(entries.map(e=>signature(e.asset.root))),bounds=[];
        for(let i=0;i<4;i++){original.root.rotation.y=i*Math.PI/2;original.root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(original.root);bounds.push({min:b.min.toArray(),max:b.max.toArray()});}
        original.root.rotation.y=0;original.root.updateMatrixWorld(true);
        const thumb=new T.OrthographicCamera(-10,10,6.8,-6.8,.1,100);thumb.position.fromArray(entries[0].asset.thumbnail.position);thumb.lookAt(new T.Vector3(...entries[0].asset.thumbnail.target));thumb.updateMatrixWorld(true);
        let maxThumbnail=0,grassSamples=0,grassPresent=false;
        original.root.traverse(n=>{if(n.geometry){const p=n.geometry.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld).project(thumb);maxThumbnail=Math.max(maxThumbnail,Math.abs(v.x),Math.abs(v.y));}}});
        for(const {placement} of entries)for(let x=-6.7;x<7;x+=1.2)for(let z=-6.7;z<7;z+=1.2){grassSamples++;grassPresent||=hasGrassAt(app.getLayout(),(placement.x-4.5)*14+x,(placement.z-4.5)*14+z);}
        const a=entries[0].asset;
        return {source,placed,bounds,maxThumbnail,grassSamples,grassPresent,scale:a.root.scale.toArray(),revision:a.specification.revision,interior:a.specification.interior,entry:a.entry,fields:Object.keys(a),environment:a.getEnvironment(),lamps:a.getLightingDescriptors()};
      }finally{original.dispose();}
    });
    data.placed.forEach(p=>assert.deepEqual(p,data.source));data.bounds.forEach(b=>[0,2].forEach(k=>{assert.ok(b.min[k]>=-7.0001);assert.ok(b.max[k]<=7.0001);}));
    assert.deepEqual(data.scale,[1,1,1]);assert.ok(data.maxThumbnail<.99,JSON.stringify(data.maxThumbnail));assert.equal(data.grassPresent,false);assert.equal(data.interior,false);assert.equal(data.revision,'exterior-04-hanging');assert.deepEqual(data.lamps,[]);return data;
  });
  await check('independent instances, ghost originals/clones and thumbnail dispose exactly once',async()=>{
    const data=await page.evaluate(async()=>{
      const {createEditorState}=await import('/town/editor/state.js'),{createEditorScene,renderThumbnails}=await import('/town/editor/scene.js'),{assetIds,createAsset,ASSETS}=await import('/town/editor/catalog.js');
      function track(asset){const resources=new Set();asset.root.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])resources.add(m);});const hits=new Map([...resources].map(r=>[r,0]));for(const r of resources)r.addEventListener('dispose',()=>hits.set(r,hits.get(r)+1));return()=>({total:hits.size,released:[...hits.values()].filter(n=>n>0).length,repeated:[...hits.values()].filter(n=>n>1).length});}
      const made=[],factory=id=>{const a=createAsset(id);if(id==='flowerorangebuilding')made.push({asset:a,inspect:track(a)});return a;};
      const state=createEditorState({assetIds,initial:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:4,length:z===4?2:0})),instances:[{id:'a',assetId:'flowerorangebuilding',x:4,z:4,rotation:0},{id:'b',assetId:'flowerorangebuilding',x:5,z:4,rotation:90}]}}),scene=createEditorScene({state,createAsset:factory}),a=made[0],b=made[1];
      scene.setEnvironment({time:'night',weather:'rain',snowAmount:.4});scene.preview({assetId:'flowerorangebuilding',x:4,z:4});const ghost=made.at(-1),cloneResources=new Set();ghost.asset.root.traverse(n=>{if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])cloneResources.add(m);});
      const cloneHits=new Map([...cloneResources].map(r=>[r,0]));for(const r of cloneResources)r.addEventListener('dispose',()=>cloneHits.set(r,cloneHits.get(r)+1));
      const inherited=ghost.asset.getEnvironment();scene.preview();const hidden=!ghost.asset.root.visible;scene.preview({assetId:'road-straight',x:4,z:4});const ghostReleased=ghost.inspect();
      state.remove('a');const removed=a.inspect(),survivor=b.inspect();state.undo();const restored=made.at(-1),restoredEnvironment=restored.asset.getEnvironment();
      const cards=renderThumbnails(ASSETS.filter(a=>a.id==='flowerorangebuilding'),factory),thumbnail=made.at(-1).inspect();scene.dispose();a.asset.dispose();b.asset.dispose();
      return {hidden,inherited,restoredEnvironment,ghostReleased,cloneReleased:[...cloneHits.values()].every(n=>n===1),removed,survivor,restored:restored.inspect(),thumbnail,scene:b.inspect(),validThumbnail:cards.get('flowerorangebuilding').startsWith('data:image/png')};
    });
    assert.ok(data.hidden&&data.cloneReleased&&data.validThumbnail);assert.equal(data.survivor.released,0);
    for(const key of ['ghostReleased','removed','restored','thumbnail','scene']){assert.ok(data[key].total>200);assert.equal(data[key].released,data[key].total);assert.equal(data[key].repeated,0);}
    for(const key of ['inherited','restoredEnvironment']){assert.equal(data[key].time,'night');assert.equal(data[key].weather,'rain');assert.equal(data[key].snowAmount,.4);}return data;
  });
  await check('ground clears map top, road contact and 17 orbit angles have no color flicker',async()=>{
    await view([0,2,0],[.65,.5,1.4],31);
    const data=await page.evaluate(async()=>{
      const T=await import('three'),e=window.__editor,app=window.townEditor,a=app.sceneView.getInstances().find(e=>e.placement.id==='review-flower-front').asset,site=a.root.getObjectByName('地块与院内通道');
      const bounds=color=>new T.Box3().setFromObject(site.children.find(n=>n.isMesh&&n.material.color.getHexString()===color));
      const ground={mapTop:app.sceneView.getGroundHeight(a.root.position.x,a.root.position.z),baseTop:bounds('74856b').max.y,grassBottom:bounds('98ad77').min.y,grassTop:bounds('98ad77').max.y};
      const controls=e.cameraRig.controls,saved={position:e.camera.position.clone(),target:controls.target.clone(),damping:controls.enableDamping};controls.enableDamping=false;
      const points=[];for(const z of [6.2,6.4,6.6])for(let x=-5;x<=5;x++)points.push(a.root.localToWorld(new T.Vector3(x,.08001,z)));
      const gl=e.renderer.getContext(),pixel=new Uint8Array(4),frames=[];
      // Elevated orbit keeps foreground road grass from occluding the measured
      // turf points. All scene geometry and shadow settings stay enabled.
      for(let i=0;i<=16;i++){const angle=(-48+i*6)*Math.PI/180;e.camera.position.copy(a.root.position).add(new T.Vector3(Math.sin(angle)*25,65,Math.cos(angle)*25));controls.target.copy(a.root.position);controls.update();e.renderer.render(e.scene,e.camera);
        frames.push(points.map(p=>{const n=p.clone().project(e.camera),x=Math.round((n.x+1)*.5*(gl.drawingBufferWidth-1)),y=Math.round((n.y+1)*.5*(gl.drawingBufferHeight-1));gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return [...pixel].slice(0,3);}));}
      controls.enableDamping=saved.damping;controls.target.copy(saved.target);e.camera.position.copy(saved.position);controls.update();
      const ranges=points.map((p,i)=>({point:p.toArray(),range:Math.max(...[0,1,2].map(c=>Math.max(...frames.map(f=>f[i][c]))-Math.min(...frames.map(f=>f[i][c]))))}));
      const edge=[6.99,7.01].map(z=>{const p=a.root.localToWorld(new T.Vector3(-1,0,z));return app.weather.sampleSurface(p.x,p.z);});
      return {ground,frameCount:frames.length,samples:points.length,maxRange:Math.max(...ranges.map(r=>r.range)),unstable:ranges.filter(r=>r.range>10),ranges,frames,edge,shadowsEnabled:e.renderer.shadowMap.enabled};
    });
    await writeFile(`${out}/ground-probe.json`,JSON.stringify(data,null,2));
    assert.ok(data.ground.grassBottom>data.ground.mapTop+.05);assert.equal(data.unstable.length,0);assert.ok(Math.abs(data.edge[0].point[1]-data.edge[1].point[1])<.1);assert.equal(data.shadowsEnabled,true);return data;
  });
  await check('global rain hits real roofs/gate/yard after four rotations, move, remove and undo',async()=>{
    await page.evaluate(()=>window.townEditor.setWeather('rain'));
    const data=await page.evaluate(async()=>{
      const T=await import('three'),app=window.townEditor,results=[];
      for(let i=0;i<4;i++){
        const asset=app.sceneView.getInstances().find(e=>e.placement.id==='review-flower-front').asset,meshes=[],sides=new Map();asset.root.updateMatrixWorld(true);
        asset.root.traverse(n=>{if(n.isMesh&&!n.material.transparent){meshes.push(n);if(!sides.has(n.material)){sides.set(n.material,n.material.side);n.material.side=T.DoubleSide;}}});
        let probes=0,maxError=0;const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
        for(let x=-6.79;x<7;x+=.94)for(let z=-6.73;z<7;z+=.97){const p=asset.root.localToWorld(new T.Vector3(x,0,z));ray.set(new T.Vector3(p.x,30,p.z),down);const expected=ray.intersectObjects(meshes,false).find(h=>h.point.y>=0)?.point.y||0,actual=app.weather.sampleSurface(p.x,p.z);maxError=Math.max(maxError,Math.abs(expected-actual.point[1]));probes++;}
        for(const [m,s] of sides)m.side=s;
        const keyPoints=[[1,0,-1],[-.985,0,4.44],[0,0,6.4]].map(v=>{const p=asset.root.localToWorld(new T.Vector3(...v));return app.weather.sampleSurface(p.x,p.z);});
        const samples=app.weather.getRainSamples().filter(s=>s.instanceId==='review-flower-front');results.push({rotation:i*90,probes,maxError,keyPoints,rainSamples:samples.length,belowSurface:samples.filter(s=>s.headY<s.point[1]-1e-5).length});app.state.rotate('review-flower-front');
      }
      app.state.move('review-flower-front',3,5);const old=app.weather.sampleSurface(-21,-21),moved=app.weather.sampleSurface(-21,7);app.state.remove('review-flower-front');const removed=app.weather.sampleSurface(-21,7);app.state.undo();const restored=app.weather.sampleSurface(-21,7);app.state.undo();return{results,old,moved,removed,restored};
    });
    for(const r of data.results){assert.ok(r.maxError<.002);assert.equal(r.belowSurface,0);assert.equal(r.rainSamples,144);assert.ok(r.keyPoints[0].point[1]>5);assert.ok(r.keyPoints[1].point[1]>3);assert.ok(r.keyPoints[2].point[1]<.1);}
    assert.equal(data.old.point[1],0);assert.ok(data.moved.point[1]>4);assert.equal(data.removed.point[1],0);assert.equal(data.restored.point[1],data.moved.point[1]);
    await view([0,2,0],[.65,.5,1.4],31);await shot('03-rain-roof-and-gate');await page.evaluate(()=>window.townEditor.setWeather('clear'));return data;
  });
  await check('four times/global snow, no fabricated asset snow or lamps, environment persists',async()=>{
    const times=[];
    for(const time of ['morning','afternoon','dusk','night']){
      await page.evaluate(time=>window.townEditor.setTime(time),time);await view([0,2,0],[.65,.5,1.4],31);await shot('04-time-'+time);
      times.push(await page.evaluate(()=>({environment:window.townEditor.environment.get(),asset:window.townEditor.sceneView.getInstances().find(e=>e.placement.id==='review-flower-front').asset.getEnvironment(),lighting:window.__editor.inspection.lighting})));
    }
    await page.evaluate(()=>window.townEditor.setWeather('snow'));await page.waitForTimeout(1700);await shot('05-night-snow');
    const snow=await page.evaluate(()=>{const a=window.townEditor.sceneView.getInstances().find(e=>e.placement.id==='review-flower-front').asset;return {inspection:window.townEditor.weather.getInspection(),asset:a.getEnvironment(),hasSnowLayer:!!a.snow,lamps:a.getLightingDescriptors()};});
    assert.ok(snow.inspection.snowfall.count>0);assert.equal(snow.inspection.snowfall.visible,true);assert.ok(snow.inspection.snowfall.samples.every(s=>!s.visible||s.y-s.size>s.hitY));assert.equal(snow.hasSnowLayer,false);assert.equal(snow.asset.snowImplemented,false);assert.deepEqual(snow.lamps,[]);
    await page.evaluate(()=>window.townEditor.environment.set({time:'afternoon',weather:'clear',snowAmount:0}));
    const saved=await page.evaluate(()=>window.townEditor.exportJSON());await page.reload({waitUntil:'networkidle'});await ready();assert.deepEqual(JSON.parse(await page.evaluate(()=>window.townEditor.exportJSON())),JSON.parse(saved));
    for(const {environment,asset} of times){assert.equal(environment.time,asset.time);assert.equal(asset.localLightingImplemented,false);assert.equal(asset.weatherEffectsImplemented,false);}return {times,snow,restored:true};
  });
  await check('formal map overview and front/side/rear/entrance/balcony camera views',async()=>{
    await page.evaluate(()=>window.townEditor.showOverview({immediate:true}));await shot('06-whole-town');
    await view([4,2,0],[.04,.65,1.6],96);await shot('07-same-street');
    await view([0,2,0],[.65,.5,1.4],31);await shot('08-flower-in-town');
    await view([0,2.8,0],[0,.15,1],30);await shot('09-front');
    await view([0,2,0],[-1,.6,.15],32);await shot('10-left');
    await view([0,2,0],[1,.6,.15],32);await shot('11-right');
    await view([0,2,0],[-.3,.6,-1],32);await shot('12-back');
    await view([-.985,1.7,4.49],[.35,.25,1],10);await shot('13-gate-detail');
    await view([2.46,3.55,2.1],[.42,.23,1],7);await shot('14-balcony-detail');
    await view([-.37,1.78,4.78],[-.7,.10,1],5);await shot('15-gate-pot-side');
    await view([2.46,2.9,2.1],[.45,.08,1],6);await shot('16-balcony-under');
    await page.mouse.move(1050,450);const before=await page.evaluate(()=>window.__editor.inspection.camera.position);await page.mouse.down();await page.mouse.move(1200,480,{steps:12});await page.mouse.up();await page.mouse.wheel(0,-120);await settle();
    const after=await page.evaluate(()=>window.__editor.inspection.camera.position);assert.notDeepEqual(after,before);
    await page.evaluate(()=>window.townEditor.showOverview({immediate:true}));await writeFile(`${out}/review-town.json`,await page.evaluate(()=>window.townEditor.exportJSON()));return {screenshots:report.screenshots,mouseOrbitAndZoom:true};
  });
  await check('ordinary save and unrelated asset/editor/snow source remain unchanged',async()=>{
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),formalKey),sentinel);
    const files=JSON.parse((await readFile(`${out}/protected-before.json`,'utf8')).replace(/^\uFEFF/,'')),changed=[];
    for(const f of files){const p=f.path.replaceAll('\\','/');if(p==='dist/town/editor/catalog.js'||p.endsWith('/README.md'))continue;const hash=createHash('sha256').update(await readFile(f.path)).digest('hex');if(hash!==f.hash.toLowerCase())changed.push(f.path);}
    assert.deepEqual(changed,[]);return {protectedFiles:files.length,changed,formalSaveUnchanged:true};
  });
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});}
finally{await browser?.close();report.finishedAt=new Date().toISOString();await writeFile(`${out}/inspection.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.map(({name,passed,ms})=>({name,passed,ms})),errors:report.errors,failure:report.failure},null,2));if(!report.passed)process.exitCode=1;}
