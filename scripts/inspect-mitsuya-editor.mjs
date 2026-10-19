import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const output='artifacts/editor/v2.5/mitsuya';await mkdir(output,{recursive:true});
const report={startedAt:new Date().toISOString(),checks:[],errors:[],limitations:[
  'Isolated Chrome/WebGL interaction and screenshots; aesthetic acceptance remains with the user.',
  'Exterior only. No enter/exit, player, collision, shopping, operating-state animation or asset environment hooks.',
  'Bounded warm lighting and rain are town-host effects; Mitsuya itself has no setEnvironment/updateEnvironment.'
]};
let browser,page;
async function check(name,fn){const start=Date.now();try{const data=await fn();report.checks.push({name,passed:true,ms:Date.now()-start,...(data?{data}:{})});}catch(e){report.checks.push({name,passed:false,error:e.stack});throw e;}}
const empty={format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:2,length:z>=2&&z<=7?6:0})),instances:[]};
const fixture={...empty,instances:[
  {id:'mitsuya-main',assetId:'mitsuya',x:4,z:4,rotation:0},
  {id:'town-sakura',assetId:'sakura-house',x:3,z:4,rotation:0},
  {id:'town-store',assetId:'convenience',x:5,z:4,rotation:0},
  {id:'town-road-a',assetId:'road-cross',x:3,z:5,rotation:0},
  {id:'town-road-b',assetId:'road-cross',x:4,z:5,rotation:0},
  {id:'town-road-c',assetId:'road-cross',x:5,z:5,rotation:0}
]};
const layout=()=>page.evaluate(()=>window.townEditor.getLayout());
const settle=()=>page.waitForFunction(()=>!window.__editor.inspection.camera.busy);
const ready=()=>page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
const point=(x,z)=>page.evaluate(([x,z])=>window.__editor.screenCell(x,z),[x,z]);
async function click(x,z){const p=await point(x,z);await page.mouse.click(p.x,p.y);}
const panel=name=>page.locator(`[data-panel="${name}"]`).click();
async function choose(id){await panel('assets');await page.locator(`[data-asset="${id}"]`).click();}
async function cancel(){await page.locator('#select-tool').click();}
async function top(){await page.evaluate(()=>window.townEditor.showOverview({top:true,immediate:true}));await settle();}
async function shot(name){await settle();await page.waitForTimeout(250);await page.screenshot({path:`${output}/${name}.png`});}
async function importFile(value){await cancel();await panel('save');await page.locator('#import-file').setInputFiles({name:'test-layout.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await page.waitForFunction(()=>/已导入布局|导入失败/.test(document.querySelector('#message').textContent));}
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1,acceptDownloads:true});page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});await ready();
  await check('catalog uses delivered revision, real thumbnail, exterior only and blank first entry',async()=>{
    assert.equal((await layout()).instances.length,0);await page.locator('#enter-editor').click();
    assert.equal(await page.locator('[data-asset="mitsuya"] strong').innerText(),'みつや小店');
    assert.equal(await page.locator('#building-count').innerText(),'3 件可用');assert.equal(await page.locator('.pending-row').count(),2);
    const data=await page.evaluate(async()=>{const c=await import('/town/editor/catalog.js'),a=c.createAsset('mitsuya');try{return{revision:a.specification.revision,space:a.space,scale:a.root.scale.toArray(),hooks:[typeof a.setEnvironment,typeof a.updateEnvironment],dispose:typeof a.dispose,lamps:a.previewLamps,thumb:document.querySelector('[data-asset="mitsuya"] img').naturalWidth};}finally{a.dispose();}});
    assert.equal(data.revision,'anime-facade-landscape-09');assert.equal(data.space,'exterior');assert.deepEqual(data.scale,[1,1,1]);assert.deepEqual(data.hooks,['undefined','undefined']);assert.equal(data.dispose,'function');assert.equal(data.thumb,280);assert.equal(data.lamps.length,2);return data;
  });
  await check('actual click and native card drag placement, collision refusal, stable ID rotation/move/delete/undo',async()=>{
    await top();await choose('mitsuya');const p=await point(4,4);await page.mouse.move(p.x,p.y);await shot('01-card-and-placement-preview');await click(4,4);const first=(await layout()).instances[0];
    await click(4,4);assert.equal((await layout()).instances.length,1);await click(5,4);const second=(await layout()).instances[1];
    const to=await point(6,4),box=await page.locator('#editor-world').boundingBox();await page.locator('[data-asset="mitsuya"]').dragTo(page.locator('#editor-world'),{targetPosition:{x:to.x-box.x,y:to.y-box.y}});
    assert.equal((await layout()).instances.length,3);assert.equal(new Set((await layout()).instances.map(i=>i.id)).size,3);
    await cancel();await click(4,4);const rotations=[];
    for(let i=0;i<4;i++){await page.locator('#rotate').click();rotations.push((await layout()).instances.find(p=>p.id===first.id).rotation);}
    assert.deepEqual(rotations,[90,180,270,0]);await page.locator('#move').click();await click(5,4);assert.equal((await layout()).instances.find(p=>p.id===first.id).x,4);await click(4,3);
    assert.equal((await layout()).instances.find(p=>p.id===first.id).z,3);await cancel();
    const from=await point(5,4),end=await point(5,3);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:15});await page.mouse.up();assert.equal((await layout()).instances.find(p=>p.id===second.id).z,3);
    await click(4,3);await page.locator('#delete').click();assert.equal((await layout()).instances.some(p=>p.id===first.id),false);await page.locator('#undo').click();assert.equal((await layout()).instances.find(p=>p.id===first.id).z,3);
    return{rotations,clickPlacement:true,cardDrag:true,directDrag:true,stableIds:true,collisionRefusal:true};
  });
  await check('autosave, reload, real JSON export/import and invalid input preserve stable placements',async()=>{
    const saved=await layout();await page.reload({waitUntil:'networkidle'});await ready();assert.deepEqual(await layout(),saved);
    await page.locator('#enter-editor').click();await panel('save');const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending;await download.saveAs(`${output}/exported-layout.json`);assert.deepEqual(JSON.parse(await readFile(`${output}/exported-layout.json`,'utf8')),saved);
    await importFile(empty);assert.equal((await layout()).instances.length,0);await importFile(saved);assert.deepEqual(await layout(),saved);
    const raw=await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1'));await importFile({...saved,instances:saved.instances.map((p,i)=>i? p:{...p,assetId:'mitsuya-future-unknown'})});assert.deepEqual(await layout(),saved);assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),raw);
    await cancel();await panel('assets');return{ids:saved.instances.map(p=>p.id),format:saved.format,version:saved.version};
  });
  await check('original geometry/toon shaders/textures preserved; four 14x14 boundaries, ground and full grass mask',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),{createModel}=await import('/town/assets/mitsuya/index.js'),{hasGrassAt}=await import('/town/editor/grass.js');
      const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      const bytes=a=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength);
      async function fingerprint(root){const nodes=[];root.traverse(n=>nodes.push(n));const materials=new Set(),textures=new Set();for(const n of nodes)for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){materials.add(m);for(const key of ['map','gradientMap','emissiveMap'])if(m[key])textures.add(m[key]);}
        const data=await Promise.all(nodes.map(async(n,i)=>({name:n.name,type:n.type,transform:i?[n.position.toArray(),n.quaternion.toArray(),n.scale.toArray()]:null,kind:n.userData.kind,flowers:n.userData.flowerCount,
          attributes:n.geometry?await Promise.all(Object.entries(n.geometry.attributes).map(async([key,a])=>[key,a.itemSize,a.count,await digest(bytes(a.array))])):null,index:n.geometry?.index?await digest(bytes(n.geometry.index.array)):null,
          materials:(n.material?(Array.isArray(n.material)?n.material:[n.material]):[]).map(m=>({type:m.type,color:m.color?.getHexString(),emissive:m.emissive?.getHexString(),emissiveIntensity:m.emissiveIntensity,opacity:m.opacity,side:m.side,hook:m.onBeforeCompile.toString(),cache:m.customProgramCacheKey.toString(),gradient:!!m.gradientMap}))})));
        const maps=await Promise.all([...textures].map(async t=>({name:t.name,colorSpace:t.colorSpace,min:t.minFilter,mag:t.magFilter,image:t.image?.data?await digest(bytes(t.image.data)):t.image?.toDataURL?.()})));
        return{hash:await digest(new TextEncoder().encode(JSON.stringify({data,maps}))),meshes:nodes.filter(n=>n.isMesh).length,materials:materials.size,textures:textures.size,toon:[...materials].filter(m=>m.isMeshToonMaterial).length};
      }
      const original=createModel(),app=window.townEditor,entries=app.sceneView.getInstances().filter(e=>e.placement.assetId==='mitsuya');
      try{const originalSignature=await fingerprint(original.root),signatures=await Promise.all(entries.map(e=>fingerprint(e.asset.root))),bounds=[],grass=[];
        for(let i=0;i<4;i++){original.root.rotation.y=i*Math.PI/2;original.root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(original.root);bounds.push({min:b.min.toArray(),max:b.max.toArray(),scale:original.root.scale.toArray()});}
        for(const {placement} of entries)for(let x=-6.8;x<7;x+=1.3)for(let z=-6.8;z<7;z+=1.3)grass.push(hasGrassAt(app.getLayout(),(placement.x-4.5)*14+x,(placement.z-4.5)*14+z));
        const kinds=[];entries[0].asset.root.traverse(n=>{if(n.userData.kind)kinds.push({kind:n.userData.kind,flowers:n.userData.flowerCount,name:n.name});});
        return{original:originalSignature,signatures,bounds,grassPresent:grass.some(Boolean),bladeCount:window.__editor.inspection.scene.grass.bladeCount,kinds};
      }finally{original.dispose();}
    });
    for(const s of data.signatures)assert.deepEqual(s,data.original);for(const b of data.bounds){for(const axis of [0,2]){assert.ok(b.min[axis]>=-7.0001);assert.ok(b.max[axis]<=7.0001);}assert.ok(Math.abs(b.min[1]+.14)<.001);}
    assert.equal(data.grassPresent,false);assert.equal(data.bladeCount,33*24000);for(const kind of ['doghouse','bench','gathered-blind','flowering-shrub'])assert.ok(data.kinds.some(k=>k.kind===kind),kind);assert.ok(data.kinds.find(k=>k.kind==='flowering-shrub').flowers>0);assert.ok(data.original.toon>10);return data;
  });
  await check('independent preview, thumbnail and instance resources release without touching neighbours',async()=>{
    const data=await page.evaluate(async()=>{
      const {createEditorState}=await import('/town/editor/state.js'),{createEditorScene,renderThumbnails}=await import('/town/editor/scene.js'),{assetIds,createAsset,ASSETS}=await import('/town/editor/catalog.js');
      const track=asset=>{const resources=new Set();asset.root.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){resources.add(m);for(const key of ['map','gradientMap','emissiveMap'])if(m[key])resources.add(m[key]);}});for(const t of asset.textures.values())resources.add(t);const hits=new Map([...resources].map(r=>[r,0]));for(const r of resources)r.addEventListener('dispose',()=>hits.set(r,hits.get(r)+1));return()=>({total:hits.size,released:[...hits.values()].filter(n=>n>0).length,repeated:[...hits.values()].filter(n=>n>1).length});};
      const created=[],factory=id=>{const a=createAsset(id);if(id==='mitsuya')created.push({asset:a,inspect:track(a)});return a;};
      const state=createEditorState({assetIds,initial:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:4,length:z===4?2:0})),instances:[{id:'owned-a',assetId:'mitsuya',x:4,z:4,rotation:0},{id:'owned-b',assetId:'mitsuya',x:5,z:4,rotation:0}]}}),scene=createEditorScene({state,createAsset:factory}),a=created[0],b=created[1];
      scene.preview({assetId:'mitsuya',x:4,z:4});const ghost=created.at(-1);let toonHook=false;ghost.asset.root.traverse(n=>{if(n.material?.isMeshToonMaterial&&n.material.onBeforeCompile.toString().includes('max( dotNL'))toonHook=true;});scene.preview();const cancelled={hidden:!ghost.asset.root.visible,survivor:b.inspect()};scene.preview({assetId:'road-cross',x:4,z:4});const replacedGhost=ghost.inspect();
      state.remove('owned-a');const removed=a.inspect(),survivor=b.inspect();state.undo();const restored=created.at(-1);const changed=state.getLayout();changed.instances.find(p=>p.id==='owned-a').assetId='road-cross';state.loadLayout(changed);const replaced=restored.inspect();
      const cards=renderThumbnails(ASSETS.filter(a=>a.id==='mitsuya'),factory),thumbnail=created.at(-1).inspect();scene.dispose();return{toonHook,cancelled,replacedGhost,removed,survivor,replaced,thumbnail,scene:b.inspect(),validThumbnail:cards.get('mitsuya').startsWith('data:image/png')};
    });assert.ok(data.toonHook&&data.cancelled.hidden&&data.validThumbnail);assert.equal(data.cancelled.survivor.released,0);assert.equal(data.survivor.released,0);for(const name of ['replacedGhost','removed','replaced','thumbnail','scene']){assert.ok(data[name].total>100);assert.equal(data[name].released,data[name].total);assert.equal(data[name].repeated,0);}return data;
  });
  await page.evaluate(l=>window.townEditor.loadLayout(l),fixture);await page.locator('#exit-editor').click();await page.evaluate(()=>window.townEditor.focusInstance('mitsuya-main'));await shot('02-mitsuya-with-neighbours');
  await check('bounded warm downlights follow transforms and actual walls block side/back light paths',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),app=window.townEditor;const p=app.state.place('mitsuya',6,4),q=app.state.place('mitsuya',6,3);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const info=window.__editor.inspection.lighting,main=app.sceneView.getInstances().find(e=>e.placement.id==='mitsuya-main').asset,meshes=[];main.root.traverse(n=>{if(n.isMesh&&n.castShadow&&!n.material.transparent)meshes.push(n);});
      const obstruction=[];for(const spec of main.previewLamps){const from=main.root.localToWorld(new T.Vector3(spec[3],spec[4],spec[5]));for(const target of [[4.1,1.0,-.5],[.5,1.0,-2.7]]){const to=main.root.localToWorld(new T.Vector3(...target)),delta=to.clone().sub(from),ray=new T.Raycaster(from,delta.clone().normalize(),.01,delta.length());obstruction.push(ray.intersectObjects(meshes,false).length>0);}}
      const measurements=[];for(let i=0;i<4;i++){app.state.rotate('mitsuya-main');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const lights=window.__editor.inspection.lighting.downlights.filter(l=>l.instanceId==='mitsuya-main');const expected=main.previewLamps.map(s=>main.root.localToWorld(new T.Vector3(s[3],s[4],s[5])).toArray());measurements.push({lights,expected});}
      app.state.remove(p.id);app.state.remove(q.id);return{info,obstruction,measurements};
    });assert.equal(data.info.activeDownlights,4);assert.equal(data.info.activeStoreLamps,5);assert.ok(data.obstruction.every(Boolean));
    for(const measure of data.measurements){assert.equal(measure.lights.length,2);measure.lights.forEach((l,i)=>{assert.ok(l.position.every((v,k)=>Math.abs(v-measure.expected[i][k])<1e-5));assert.equal(l.intensity,8);assert.ok(l.castShadow&&l.shadowReady);assert.deepEqual(l.shadowMap,[512,512]);assert.ok(l.position[1]>l.target[1]);});}return data;
  });
  await check('rain first contact matches actual roof/doghouse/landscape through four rotations and editing',async()=>{
    await page.evaluate(()=>window.townEditor.setWeather('rain'));
    const data=await page.evaluate(async()=>{
      const T=await import('three'),app=window.townEditor,results=[];
      for(let i=0;i<4;i++){
        const asset=app.sceneView.getInstances().find(e=>e.placement.id==='mitsuya-main').asset,meshes=[],sides=new Map();asset.root.updateMatrixWorld(true);
        asset.root.traverse(n=>{if(n.isMesh&&!n.material.transparent){meshes.push(n);if(!sides.has(n.material)){sides.set(n.material,n.material.side);n.material.side=T.DoubleSide;}}});
        let probes=0,maxError=0,slopes=0;for(let x=-6.813;x<7;x+=.67)for(let z=-6.771;z<7;z+=.69){const p=asset.root.localToWorld(new T.Vector3(x,0,z)),ray=new T.Raycaster(new T.Vector3(p.x,30,p.z),new T.Vector3(0,-1,0)),expected=ray.intersectObjects(meshes,false).find(h=>h.point.y>=0)?.point.y||0,actual=app.weather.sampleSurface(p.x,p.z);maxError=Math.max(maxError,Math.abs(expected-actual.point[1]));if(actual.normal[1]<.99&&actual.normal[1]>.1)slopes++;probes++;}
        for(const [m,s]of sides)m.side=s;
        const probesLocal=[[.5,0,0],[-5.4,0,2.57],[0,0,6.8]].map(a=>{const p=asset.root.localToWorld(new T.Vector3(...a));return app.weather.sampleSurface(p.x,p.z);});
        const samples=app.weather.getRainSamples().filter(c=>c.instanceId==='mitsuya-main'),invalid=samples.filter(c=>c.headY<c.point[1]-1e-5||Math.abs(app.weather.sampleSurface(c.point[0],c.point[2]).point[1]-c.point[1])>1e-6).length;
        results.push({rotation:i*90,probes,maxError,slopes,probesLocal,samples:samples.length,invalid});app.state.rotate('mitsuya-main');
      }
      app.state.move('mitsuya-main',4,3);const old=app.weather.sampleSurface(-7,-7),moved=app.weather.sampleSurface(-7,-21);app.state.remove('mitsuya-main');const deleted=app.weather.sampleSurface(-7,-21);app.state.undo();const restored=app.weather.sampleSurface(-7,-21);app.state.undo();return{results,old,moved,deleted,restored};
    });for(const r of data.results){assert.ok(r.probes>400&&r.slopes>10);assert.ok(r.maxError<.002);assert.equal(r.invalid,0);assert.equal(r.samples,144);assert.ok(r.probesLocal[0].point[1]>5);assert.ok(r.probesLocal[1].point[1]>1);assert.ok(r.probesLocal[2].point[1]<.1);}assert.equal(data.old.point[1],0);assert.ok(data.moved.point[1]>4);assert.equal(data.deleted.point[1],0);assert.equal(data.restored.point[1],data.moved.point[1]);return data;
  });
  await page.evaluate(()=>window.townEditor.focusInstance('mitsuya-main'));await shot('03-rain-mitsuya-neighbours');
  await page.evaluate(()=>window.townEditor.state.rotate('mitsuya-main'));await shot('04-rain-rotated');await page.evaluate(()=>window.townEditor.state.undo());
  await page.evaluate(()=>window.townEditor.setWeather('clear'));
  await check('same street scale, road contact and close details in actual rendered scene',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),app=window.townEditor,entries=app.sceneView.getInstances().filter(e=>['mitsuya','sakura-house','convenience'].includes(e.placement.assetId));
      const bounds=entries.map(({placement,asset})=>{const b=new T.Box3().setFromObject(asset.root);return{assetId:placement.assetId,size:b.getSize(new T.Vector3()).toArray(),scale:asset.root.scale.toArray()};});
      return{bounds,edgeBefore:app.weather.sampleSurface(-7,-.001),edgeAfter:app.weather.sampleSurface(-7,.001),weather:app.weather.getInspection().weather,layout:app.getLayout()};
    });for(const b of data.bounds){assert.ok(b.size[0]<=14.001&&b.size[2]<=14.001);}assert.ok(Math.abs(data.edgeBefore.point[1]-data.edgeAfter.point[1])<.06);assert.equal(data.weather,'clear');
    await page.evaluate(()=>window.townEditor.focusInstance('mitsuya-main'));await settle();await page.mouse.move(900,450);
    for(let i=0;i<10;i++){await page.mouse.wheel(0,-120);await page.waitForTimeout(40);}await shot('05-entry-warm-light');
    // Use ordinary orbit controls to expose the retained rear-left flowers, then the right-side blind.
    await page.mouse.move(900,450);await page.mouse.down();await page.mouse.move(1300,500,{steps:25});await page.mouse.up();await shot('06-side-landscape');
    await page.evaluate(()=>window.townEditor.showOverview());await shot('07-whole-town');
    async function detail(name,focus){await page.evaluate(f=>{const app=window.townEditor,a=app.sceneView.getInstances().find(e=>e.placement.id==='mitsuya-main').asset,saved=a.focus;a.focus=f;app.focusInstance('mitsuya-main');a.focus=saved;},focus);await shot(name);}
    await detail('08-three-buildings-same-street',{target:[0,1.8,0],distance:52,direction:[.05,.8,1.6]});
    await detail('09-rear-pink-flowers',{target:[-4.54,.65,-3.95],distance:9,direction:[-.8,.7,-1.5]});
    await detail('10-right-bamboo-blind',{target:[4.32,1.3,1.87],distance:10,direction:[1,.6,1.3]});
    await writeFile(`${output}/same-street-layout.json`,JSON.stringify(data.layout,null,2));return data;
  });
  await check('all B assets, other buildings, layout/save, grass and weather implementation unchanged',async()=>{
    const entries=JSON.parse(await readFile('artifacts/editor/v2.5/protected-before.json','utf8'));for(const e of entries){assert.equal(createHash('sha256').update(await readFile(e.path)).digest('hex'),e.hash,e.path);}return{files:entries.length};
  });
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;await page?.screenshot({path:`${output}/failure.png`}).catch(()=>{});}
finally{await browser?.close();report.finishedAt=new Date().toISOString();await writeFile(`${output}/inspection.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.map(({name,passed,ms})=>({name,passed,ms})),errors:report.errors,failure:report.failure},null,2));if(!report.passed)process.exitCode=1;}
