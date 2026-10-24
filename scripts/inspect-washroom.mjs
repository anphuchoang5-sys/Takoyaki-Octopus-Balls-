import {chromium} from 'playwright';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const folder='dist/town/assets/sakura-house/interior',out='artifacts/buildings/sakura-house/interior/wash-02';
const hash=v=>createHash('sha256').update(v).digest('hex');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/town/assets/sakura-house/interior/preview.html');
 await page.waitForFunction(()=>window.__sakuraInterior?.ready);
 const objects=await page.evaluate(async()=>{
  const h=window.__sakuraInterior.house,data={},exclude=new Set(['洗面室精修','floor:wash','floor:bath','ceiling:wash','ceiling:bath','洗衣机','浴缸','洗浴凳','卫浴扩建底座']);
  for(const id of ['bath-north','west-upper','bath-east','bath-wash','wash-corridor','bath-west','wash-west'])for(const p of ['wall:','cut:','frame:','rail:'])exclude.add(p+id);
  h.setWalls('full');h.root.updateMatrixWorld(true);
  async function visit(o,p){if(exclude.has(o.name)||/^door:(bath-wash|wash-corridor):/.test(o.name))return;const key=p+'/'+(o.name||o.type);
   if(o.isMesh||o.isLineSegments){const m=o.material;const record=JSON.stringify({matrix:o.matrixWorld.elements,attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:o.geometry.index&&Array.from(o.geometry.index.array),color:m.color?.getHex(),opacity:m.opacity,map:m.map?.image?.toDataURL?.()});const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(record)))).map(x=>x.toString(16).padStart(2,'0')).join('');data[key]=(data[key]||'')+digest;}
   else for(const c of o.children)await visit(c,key);
  }for(const c of h.root.children)await visit(c,'');return data;
 });
 const layout=await page.evaluate(()=>{const h=window.__sakuraInterior.house;return {rooms:h.rooms.filter(r=>!['wash','bath'].includes(r.id)),walls:h.walls.filter(w=>!['bath-north','west-upper','bath-east','bath-wash','wash-corridor','bath-west','wash-west'].includes(w.id)),routes:Object.fromEntries(Object.entries(h.routes).filter(([k])=>!['wash','bath'].includes(k))),connections:h.connections,entry:h.entry};});
 const corridor=await page.evaluate(async()=>{const T=await import('three'),h=window.__sakuraInterior.house;h.setWalls('full');h.root.updateMatrixWorld(true);const samples=[];function ray(x,y,z,dx,dz){const hits=new T.Raycaster(new T.Vector3(x,y,z),new T.Vector3(dx,0,dz),0,1).intersectObject(h.fullWalls,true).filter(v=>v.object.isMesh),v=hits[0];samples.push(v?{point:v.point.toArray().map(v=>+v.toFixed(5)),color:v.object.material.color.getHexString()}:null);}for(const y of [.25,1.2,2.2]){for(const z of [2.85,3.05,3.35])ray(.4,y,z,-1,0);for(const x of [.15,.3,1.55,1.7])ray(x,y,3.15,0,-1);}return samples;});
 const excluded=new Set(['plan.js','index.js','preview.js','preview.html','README.md','sakura-interior.glb','wash-room.js']);
 const files={};for(const e of await readdir(folder,{withFileTypes:true})){if(e.isFile()&&!excluded.has(e.name))files[folder+'/'+e.name]=hash(await readFile(folder+'/'+e.name));}
 for(const e of await readdir(folder+'/..',{withFileTypes:true}))if(e.isFile())files[folder+'/../'+e.name]=hash(await readFile(folder+'/../'+e.name));
 if(process.argv.includes('--baseline')){
  await writeFile(out+'/scope-before.json',JSON.stringify({objects,files,layout,corridor},null,2),{flag:'wx'});
  await page.evaluate(()=>{const a=window.__sakuraInterior;a.setView('top');a.camera.position.set(.6,10,1.001);a.controls.target.set(.6,0,1);a.camera.zoom=2.05;a.camera.updateProjectionMatrix();a.controls.update();});
  await page.locator('#world').screenshot({path:out+'/before-overview.png'});
  await page.locator('[data-view="wash-reference"]').click();await page.locator('#world').screenshot({path:out+'/before-reference.png'});
  console.log(JSON.stringify({baseline:true,objects:Object.keys(objects).length,files:Object.keys(files).length}));
 }else{
  const before=JSON.parse(await readFile(out+'/scope-before.json','utf8'));
  assert.deepEqual(objects,before.objects,'Objects outside the authorized wet area changed');
  assert.deepEqual(layout,before.layout,'Other room bounds, walls, routes or connections changed');assert.deepEqual(corridor,before.corridor,'Corridor wall surfaces changed');
  for(const [f,h] of Object.entries(before.files))assert.equal(hash(await readFile(f)),h,f);
  const audit=await page.evaluate(async()=>{
   const T=await import('three'),h=window.__sakuraInterior.house,r=h.wash;h.setWalls('full');h.root.updateMatrixWorld(true);
   let nonfinite=0,degenerate=0,triangles=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
   const geometryRoots=[r.root,...['floor:wash','floor:bath','ceiling:wash','ceiling:bath','洗衣机','浴缸','洗浴凳','卫浴扩建底座'].map(n=>h.root.getObjectByName(n))];for(const id of ['bath-north','west-upper','bath-east','bath-wash','wash-corridor','bath-west','wash-west'])for(const prefix of ['wall:','cut:','frame:','rail:']){const g=h.root.getObjectByName(prefix+id);if(g)geometryRoots.push(g);}geometryRoots.push(...h.doors.children.filter(g=>/^door:(bath-wash|wash-corridor):/.test(g.name)));
   for(const root of geometryRoots)root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:p.count;triangles+=n/3;for(const v of p.array)if(!Number.isFinite(v))nonfinite++;for(let i=0;i<n;i+=3){a.fromBufferAttribute(p,ix?ix.getX(i):i);b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1);c.fromBufferAttribute(p,ix?ix.getX(i+2):i+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-28)degenerate++;}});
   const entries=r.entries.map(e=>{const b=new T.Box3().setFromObject(e.group);return {id:e.id,name:e.name,min:b.min.toArray(),max:b.max.toArray()};});
   const outside=entries.filter(e=>e.min[0]<-.54-1e-5||e.max[0]>1.76+1e-5||e.min[2]<.37-1e-5||e.max[2]>2.67+1e-5||e.min[1]<-.005||e.max[1]>2.451);
   const byId=Object.fromEntries(entries.map(e=>[e.id,e]));
   const grounding=['洗01','洗06','洗07','洗08'].map(id=>({id,y:byId[id].min[1],pass:Math.abs(byId[id].min[1])<.003}));
   function down(id,x,z){const g=r.entries.find(e=>e.id===id).group,p=g.localToWorld(new T.Vector3(x,2.3,z));return new T.Raycaster(p,new T.Vector3(0,-1,0),0,3).intersectObject(g,true).find(v=>v.object.isMesh)?.point.y;}
   const cavities={basinBottom:down('洗01',.055,.015),basinRim:down('洗01',.055,.211),basketBottom:down('洗06',0,0),basketRim:down('洗06',0,.187)};
   const passage=[];h.setDoorsOpen(true);for(const name of ['wash','bath']){const points=h.routes[name];for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i],n=Math.ceil(Math.hypot(bx-ax,bz-az)/.025);for(let j=0;j<=n;j++){const x=ax+(bx-ax)*j/n,z=az+(bz-az)*j/n;for(const o of h.obstacles){const dx=Math.max(Math.abs(x-o.x)-o.w/2,0),dz=Math.max(Math.abs(z-o.z)-o.d/2,0);if(Math.hypot(dx,dz)<.22)passage.push({name,x,z,obstacle:o.name});}for(let k=0;k<16;k++){const ray=new T.Raycaster(new T.Vector3(x,1,z),new T.Vector3(Math.cos(k*Math.PI/8),0,Math.sin(k*Math.PI/8)),0,.22);if(ray.intersectObjects([h.fullWalls,h.doors],true).some(v=>v.object.isMesh))passage.push({name,x,z,wallOrDoor:true});}}}}
   const sliding=[];for(const id of ['wash-corridor','bath-wash']){const w=h.walls.find(w=>w.id===id),o=w.open[0],door=h.doors.children.find(g=>g.name.startsWith('door:'+id+':')),leaf=door.children[0];h.setDoorsOpen(false);const closed=new T.Box3().setFromObject(leaf),closedPosition=leaf.position.clone();h.setDoorsOpen(true);const opened=new T.Box3().setFromObject(leaf),openPosition=leaf.position.clone(),contacts=[];for(let k=0;k<=20;k++){leaf.position.lerpVectors(closedPosition,openPosition,k/20);h.root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(leaf);for(const f of h.obstacles)if(b.max.x>f.x-f.w/2&&b.min.x<f.x+f.w/2&&b.max.z>f.z-f.d/2&&b.min.z<f.z+f.d/2)contacts.push(f.name);if(b.min.x<-.54-1e-5||b.max.x>1.76||b.max.z>=w.at-.066)contacts.push('wall-or-room-boundary');}h.setDoorsOpen(true);sliding.push({id,kind:o.kind,leaves:door.children.length,rotation:leaf.rotation.y,travel:closedPosition.distanceTo(openPosition),closed:[closed.min.toArray(),closed.max.toArray()],open:[opened.min.toArray(),opened.max.toArray()],clearWidth:o.b-o.a-.086,closesOpening:closed.min.x<=o.a+.043&&closed.max.x>=o.b-.043,opensOpening:opened.max.x<=o.a+.043,contacts:[...new Set(contacts)]});}
   const dimensions=h.rooms.filter(r=>['wash','bath'].includes(r.id)).map(r=>({id:r.id,bounds:r.r,size:[+(r.r[2]-r.r[0]).toFixed(2),+(r.r[3]-r.r[1]).toFixed(2)]}));
   const washer=new T.Box3().setFromObject(h.root.getObjectByName('洗衣机')),basin=new T.Box3().setFromObject(r.entries.find(e=>e.id==='洗01').group),basinClearance=basin.min.x-washer.max.x;
   const floor=h.root.getObjectByName('floor:wash'),floorColors=floor.children.filter(o=>o.isMesh).map(o=>o.material.color.getHexString());
   const wallModes={};for(const mode of ['hidden','cut','outer-hidden','full']){h.setWalls(mode);wallModes[mode]=r.wallDecor.every(g=>g.visible===(mode==='full'));}
   const fresh=window.__sakuraInterior.createInterior(),counts=new Map();fresh.root.traverse(o=>{if(o.isMesh||o.isLineSegments){counts.set(o.geometry,0);for(const m of Array.isArray(o.material)?o.material:[o.material]){counts.set(m,0);if(m.map)counts.set(m.map,0);}}});for(const obj of counts.keys())obj.addEventListener('dispose',()=>counts.set(obj,counts.get(obj)+1));fresh.dispose();fresh.dispose();
   return {triangles,nonfinite,degenerate,entries,outside,grounding,cavities,passage,sliding,dimensions,basinClearance,floorColors,wallModes,resourceDisposal:[...counts.values()].every(v=>v===1),resources:counts.size};
  });
  const views=['wash-reference','wash-basin','wash-baskets','wash-reverse','wash-entry','wet-overview','bath-view','wet-doors','bath-door','wet-rear'];
  for(const v of views){await page.locator(`[data-view="${v}"]`).click();await page.waitForTimeout(250);await page.locator('#world').screenshot({path:out+'/'+v+'.png'});}
  for(const v of ['wet-doors','bath-door']){await page.locator(`[data-view="${v}"]`).click();await page.locator('#doors').uncheck();await page.waitForTimeout(100);await page.locator('#world').screenshot({path:out+'/'+v+'-closed.png'});await page.locator('#doors').check();}
  await page.evaluate(()=>{const a=window.__sakuraInterior;a.setView('top');a.camera.position.set(.6,10,1.001);a.controls.target.set(.6,0,1);a.camera.zoom=2.05;a.camera.updateProjectionMatrix();a.controls.update();});await page.locator('#world').screenshot({path:out+'/after-overview.png'});
  await page.locator('[data-view="wash-reference"]').click();await page.locator('#compare').click();await page.waitForFunction(()=>{const i=document.getElementById('reference-image');return i.complete&&i.naturalWidth>0&&i.src.includes('wash-01-anime');});await page.screenshot({path:out+'/reference-comparison.png'});await page.locator('#close-reference').click();
  assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().current),'wash-reference');
  const b=await page.locator('#world').boundingBox(),cam=()=>page.evaluate(()=>window.__sakuraInterior.inspect().camera);
  const pre=await cam();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(b.x+b.width*.57,b.y+b.height*.53,{steps:8});await page.mouse.up();await page.waitForTimeout(200);assert.notDeepEqual((await cam()).position,pre.position);
  const orbit=await cam();await page.mouse.wheel(0,-140);await page.waitForTimeout(200);assert.notDeepEqual((await cam()).position,orbit.position);
  const zoom=await cam();await page.mouse.down({button:'right'});await page.mouse.move(b.x+b.width*.60,b.y+b.height*.55,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);assert.notDeepEqual((await cam()).target,zoom.target);
  const sourceHashes={};for(const f of ['plan.js','index.js','wash-room.js','preview.js','preview.html','references/wash-01-anime.jpg'])sourceHashes[folder+'/'+f]=hash(await readFile(folder+'/'+f));
  const report={passed:false,sourceHashes,scope:{objects:Object.keys(objects).length,files:Object.keys(files).length,otherRoomsAndCorridorUnchanged:true,corridorSurfaceSamples:corridor.length},audit,views,interaction:{orbit:true,zoom:true,pan:true,reference:true},errors};
  await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));
  assert.equal(audit.nonfinite,0);assert.equal(audit.degenerate,0);assert.deepEqual(audit.outside,[]);assert(audit.grounding.every(v=>v.pass));
  assert(audit.cavities.basinRim-audit.cavities.basinBottom>.10);assert(audit.cavities.basketRim-audit.cavities.basketBottom>.20);assert.deepEqual(audit.passage,[]);
  assert.deepEqual(audit.dimensions.map(r=>r.size),[[2.42,2.42],[2.42,2.13]]);assert(audit.basinClearance>1.17);for(const d of audit.sliding){assert.equal(d.kind,'surface-slide');assert.equal(d.leaves,1);assert.equal(d.rotation,0);assert(d.closesOpening&&d.opensOpening&&d.clearWidth>.75);assert.deepEqual(d.contacts,[]);}
  assert.deepEqual(audit.floorColors,['d7ae4c']);assert(Object.values(audit.wallModes).every(Boolean));assert(audit.resourceDisposal);assert.deepEqual(errors,[]);
  report.passed=true;await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,scope:report.scope,audit,interaction:report.interaction,errors}));
 }
}finally{await browser.close();}
