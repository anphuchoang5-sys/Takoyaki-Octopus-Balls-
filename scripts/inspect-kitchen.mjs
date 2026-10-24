import {chromium} from 'playwright';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const adjustments=process.argv.includes('--adjustments');
const folder='dist/town/assets/sakura-house/interior',out='artifacts/buildings/sakura-house/interior/'+(adjustments?'kitchen-02':'kitchen-01');
const hash=v=>createHash('sha256').update(v).digest('hex');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1700,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const distRoot=path.resolve('dist');
 await page.route('http://127.0.0.1:4173/**',async route=>{
  const request=route.request(),file=path.resolve(distRoot,'.'+decodeURIComponent(new URL(request.url()).pathname)),relative=path.relative(distRoot,file);
  if(request.method()!=='GET'||relative.startsWith('..')||path.isAbsolute(relative))return route.abort();
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png'};
  try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'Local file missing'});}
 });
 await page.goto('http://127.0.0.1:4173/town/assets/sakura-house/interior/preview.html');await page.waitForFunction(()=>window.__sakuraInterior?.ready);
 const snapshot=await page.evaluate(async(adjustments)=>{
  const T=await import('three'),h=window.__sakuraInterior.house,data={},exclude=new Set(['厨房精修','厨房扩建底座','floor:kitchen','ceiling:kitchen','厨房冰箱','水槽与灶台','厨房餐桌','厨房餐椅','厨房东侧小柜','厨房入口食器架']);
  h.setWalls('full');h.root.updateMatrixWorld(true);
  async function visit(o,p){if(adjustments?/^厨(11|14|19) /.test(o.name):exclude.has(o.name)||/^(wall:|cut:|frame:|door:)(north-main$|kitchen-corridor$|kitchen-rear)/.test(o.name))return;const key=p+'/'+(o.name||o.type);
   if(o.isMesh||o.isLineSegments){const m=o.material,record=JSON.stringify({matrix:o.matrixWorld.elements,attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:o.geometry.index&&Array.from(o.geometry.index.array),color:m.color?.getHex(),opacity:m.opacity,map:m.map?.image?.toDataURL?.()});const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(record)))).map(x=>x.toString(16).padStart(2,'0')).join('');data[key]=(data[key]||'')+digest;
   }else for(const c of o.children)await visit(c,key);
  }for(const c of h.root.children)await visit(c,'');
  const surfaces=[];for(const x of [1.96,2.5,2.9,4.1,4.6,5.15,5.8,6.2,10.05,11.75])for(const y of [.22,1.2,2.2])for(const s of [-1,1]){const hit=new T.Raycaster(new T.Vector3(x,y,s*.2),new T.Vector3(0,0,-s),0,.4).intersectObject(h.fullWalls,true).find(v=>v.object.isMesh);surfaces.push(hit?{p:hit.point.toArray().map(v=>+v.toFixed(5)),color:hit.object.material.color.getHexString()}:null);}
  return {objects:data,surfaces,layout:{rooms:adjustments?h.rooms:h.rooms.filter(r=>r.id!=='kitchen'),walls:adjustments?h.walls:h.walls.filter(w=>!['north-main','kitchen-corridor'].includes(w.id)&&!w.id.startsWith('kitchen-rear')),routes:adjustments?h.routes:Object.fromEntries(Object.entries(h.routes).filter(([k])=>k!=='kitchen')),connections:h.connections,entry:h.entry}};
 },adjustments);
 const files={},excluded=new Set(['plan.js','index.js','preview.js','preview.html','README.md','sakura-interior.glb','kitchen-room.js','kitchen-art.js']);
 if(adjustments)for(const f of ['plan.js','index.js','kitchen-art.js'])excluded.delete(f);
 for(const e of await readdir(folder,{withFileTypes:true}))if(e.isFile()&&!excluded.has(e.name))files[folder+'/'+e.name]=hash(await readFile(folder+'/'+e.name));
 for(const e of await readdir(folder+'/..',{withFileTypes:true}))if(e.isFile())files[folder+'/../'+e.name]=hash(await readFile(folder+'/../'+e.name));
 if(process.argv.includes('--baseline')){
  await writeFile(out+'/scope-before.json',JSON.stringify({...snapshot,files},null,2),{flag:'wx'});
  if(adjustments)for(const v of ['kitchen-entry','kitchen-top','kitchen-table']){await page.locator(`[data-view="${v}"]`).click();await page.waitForTimeout(180);await page.locator('#world').screenshot({path:out+'/before-'+v+'.png'});}
  for(const [name,p,t,zoom,persp] of [['before-top',[8,12,.001],[8,0,0],2.05,false],['before-stove',[8.65,1.85,2.45],[8.45,1.0,.3],.75,true],['before-entry',[8.15,1.8,.2],[8.35,.95,2.7],.75,true]]){await page.evaluate(({p,t,zoom,persp})=>{const a=window.__sakuraInterior;a.setView(persp?'corridor-view':'top');a.setWallMode(persp?'full':'cut');a.camera.position.fromArray(p);a.controls.target.fromArray(t);a.camera.zoom=zoom;a.camera.updateProjectionMatrix();a.controls.update();},{p,t,zoom,persp});await page.waitForTimeout(150);await page.locator('#world').screenshot({path:out+'/'+name+'.png'});}
  console.log(JSON.stringify({baseline:true,objects:Object.keys(snapshot.objects).length,files:Object.keys(files).length,surfaces:snapshot.surfaces.length}));
 }else{
  const before=JSON.parse(await readFile(out+'/scope-before.json','utf8'));
  assert.deepEqual(snapshot.objects,before.objects,'Objects outside kitchen changed');assert.deepEqual(snapshot.layout,before.layout,'Protected layout changed');assert.deepEqual(snapshot.surfaces,before.surfaces,'Non-kitchen faces of north wall changed');
  for(const [f,v] of Object.entries(before.files))assert.equal(hash(await readFile(f)),v,f);
  const audit=await page.evaluate(async()=>{
   const T=await import('three'),h=window.__sakuraInterior.house,k=h.kitchen;h.setWalls('full');h.root.updateMatrixWorld(true);
   let nonfinite=0,degenerate=0,triangles=0;const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3();const roots=[k.root,...['floor:kitchen','ceiling:kitchen','厨房扩建底座'].map(n=>h.root.getObjectByName(n)),...h.fullWalls.children.filter(g=>/^wall:(north-main|kitchen-corridor|kitchen-rear)/.test(g.name))];for(const r of roots)r.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:p.count;triangles+=n/3;for(const v of p.array)if(!Number.isFinite(v))nonfinite++;for(let i=0;i<n;i+=3){va.fromBufferAttribute(p,ix?ix.getX(i):i);vb.fromBufferAttribute(p,ix?ix.getX(i+1):i+1);vc.fromBufferAttribute(p,ix?ix.getX(i+2):i+2);if(vb.sub(va).cross(vc.sub(va)).lengthSq()<1e-28)degenerate++;}});
   const entries=k.entries.map(e=>{const b=new T.Box3().setFromObject(e.group);return {id:e.id,name:e.name,min:b.min.toArray(),max:b.max.toArray(),grounded:e.grounded};});
   const grounding=entries.filter(e=>e.grounded).map(e=>({id:e.id,y:e.min[1],pass:Math.abs(e.min[1])<.004}));
   const outside=entries.filter(e=>e.grounded&&([e.min[0],e.max[0]].some(x=>x<5.52||x>9.95)||e.min[2]<-1.74||e.max[2]>2.67||(e.max[2]>0&&e.min[0]<6.43)));
   const opening=h.walls.find(w=>w.id==='kitchen-corridor').open.find(o=>o.kind==='open'),blockedEntry=entries.filter(e=>e.grounded&&e.max[2]>2.1&&e.max[0]>opening.a&&e.min[0]<opening.b);
   const rearLeaf=k.root.getObjectByName('厨房后门扇'),sweep=[];for(let i=0;i<=24;i++){rearLeaf.rotation.y=i*Math.PI/48;h.root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(rearLeaf);for(const o of h.obstacles)if(b.max.x>o.x-o.w/2&&b.min.x<o.x+o.w/2&&b.max.z>o.z-o.d/2&&b.min.z<o.z+o.d/2)sweep.push(o.name);}
   h.setDoorsOpen(false);const closedRear=new T.Box3().setFromObject(rearLeaf);h.setDoorsOpen(true);const openRear=new T.Box3().setFromObject(rearLeaf);
   const passage=[];h.setDoorsOpen(true);const points=h.routes.kitchen;for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i],n=Math.ceil(Math.hypot(bx-ax,bz-az)/.025);for(let j=0;j<=n;j++){const x=ax+(bx-ax)*j/n,z=az+(bz-az)*j/n;for(const o of h.obstacles){const dx=Math.max(Math.abs(x-o.x)-o.w/2,0),dz=Math.max(Math.abs(z-o.z)-o.d/2,0);if(Math.hypot(dx,dz)<.22)passage.push({x,z,obstacle:o.name});}for(let m=0;m<16;m++){const hits=new T.Raycaster(new T.Vector3(x,1,z),new T.Vector3(Math.cos(m*Math.PI/8),0,Math.sin(m*Math.PI/8)),0,.22).intersectObjects([h.fullWalls,h.doors,k.root],true).filter(v=>v.object.isMesh);if(hits.length)passage.push({x,z,mesh:hits[0].object.parent.name});}}}
   const wallModes={};for(const m of ['hidden','cut','outer-hidden','full']){h.setWalls(m);wallModes[m]=k.wallDecor.every(g=>g.visible===(m==='full'));}
   const fresh=window.__sakuraInterior.createInterior(),counts=new Map();fresh.root.traverse(o=>{if(o.isMesh||o.isLineSegments){counts.set(o.geometry,0);for(const m of Array.isArray(o.material)?o.material:[o.material]){counts.set(m,0);if(m.map)counts.set(m.map,0);}}});for(const o of counts.keys())o.addEventListener('dispose',()=>counts.set(o,counts.get(o)+1));fresh.dispose();fresh.dispose();
   return {triangles,nonfinite,degenerate,entries,grounding,outside,blockedEntry,rearDoor:{closed:[closedRear.min.toArray(),closedRear.max.toArray()],open:[openRear.min.toArray(),openRear.max.toArray()],sweepCollisions:[...new Set(sweep)]},passage,wallModes,resourceDisposal:[...counts.values()].every(v=>v===1),resources:counts.size,details:k.audit()};
  });
  const views=['kitchen-stove','kitchen-entry','kitchen-side','kitchen-table','kitchen-sink','kitchen-cabinet','kitchen-top','kitchen-rear'];
  if(adjustments){
   audit.adjustments=await page.evaluate(async()=>{
    const T=await import('three'),h=window.__sakuraInterior.house,k=h.kitchen,entry=id=>k.entries.find(e=>e.id===id).group;
    h.setWalls('full');h.root.updateMatrixWorld(true);const cooker=entry('厨11'),stool=entry('厨14'),table=entry('厨12'),cb=new T.Box3().setFromObject(cooker),sb=new T.Box3().setFromObject(stool),tb=new T.Box3().setFromObject(table),center=cooker.position;
    const radius=[];for(let i=0;i<32;i++){const a=i*Math.PI/16,dir=new T.Vector3(Math.cos(a),0,Math.sin(a));const hit=new T.Raycaster(new T.Vector3(center.x,1.0,center.z).addScaledVector(dir,.4),dir.negate(),0,.4).intersectObject(cooker,true).find(v=>v.object.isMesh);radius.push(hit?.point.distanceTo(new T.Vector3(center.x,1.0,center.z))??null);}
    const collisions=k.entries.filter(e=>e.grounded&&!['厨14','厨06'].includes(e.id)&&new T.Box3().setFromObject(e.group).intersectsBox(sb)).map(e=>e.id);
    const feet=[];for(const [dx,dz]of[[-.125,-.125],[-.125,.125],[.125,-.125],[.125,.125]]){const hit=new T.Raycaster(new T.Vector3(center.x+dx,.8,center.z+dz),new T.Vector3(0,1,0),0,.045).intersectObject(cooker,true).find(v=>v.object.isMesh);feet.push(hit?.point.y??null);}
    return {radius,cupboardDoorGap:7.60-cb.max.x,stoolTableGap:sb.min.x-tb.max.x,stoolLeftOfTable:sb.min.x>tb.max.x,stoolCollisions:collisions,clutterAbsent:!k.entries.some(e=>e.id==='厨19'),feetUndersides:feet};
   });
   const a=audit.adjustments;assert(a.radius.every(r=>r!==null&&r>.19&&r<.215));assert(Math.max(...a.radius)-Math.min(...a.radius)<.006);assert(a.cupboardDoorGap>.06&&a.cupboardDoorGap<.11);assert(a.stoolLeftOfTable);assert.deepEqual(a.stoolCollisions,[]);assert(a.clutterAbsent);assert(a.feetUndersides.every(y=>y!==null&&Math.abs(y-.815)<.001));
   views.push('kitchen-cooker');
  }
  for(const v of views){await page.locator(`[data-view="${v}"]`).click();await page.waitForTimeout(250);await page.locator('#world').screenshot({path:out+'/'+v+'.png'});}
  await page.locator('[data-view="kitchen-stove"]').click();await page.locator('#doors').uncheck();await page.waitForTimeout(150);await page.locator('#world').screenshot({path:out+'/kitchen-stove-closed.png'});await page.locator('#doors').check();
  for(const [name,p,t,zoom,persp]of [['after-top',[8,12,.001],[8,0,0],2.05,false],['after-stove',[8.65,1.85,2.45],[8.45,1.0,.3],.75,true],['after-entry',[8.15,1.8,.2],[8.35,.95,2.7],.75,true]]){await page.evaluate(({p,t,zoom,persp})=>{const a=window.__sakuraInterior;a.setView(persp?'corridor-view':'top');a.setWallMode(persp?'full':'cut');a.camera.position.fromArray(p);a.controls.target.fromArray(t);a.camera.zoom=zoom;a.camera.updateProjectionMatrix();a.controls.update();},{p,t,zoom,persp});await page.waitForTimeout(150);await page.locator('#world').screenshot({path:out+'/'+name+'.png'});}
  for(const v of ['kitchen-stove','kitchen-entry','kitchen-table']){await page.locator(`[data-view="${v}"]`).click();await page.locator('#compare').click();await page.waitForFunction(()=>document.getElementById('reference-image').complete&&document.getElementById('reference-image').naturalWidth>0);await page.screenshot({path:out+'/'+v+'-comparison.png'});await page.locator('#close-reference').click();}
  await page.locator('[data-view="kitchen-stove"]').click();const b=await page.locator('#world').boundingBox(),cam=()=>page.evaluate(()=>window.__sakuraInterior.inspect().camera),pre=await cam();
  await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(b.x+b.width*.55,b.y+b.height*.52,{steps:8});await page.mouse.up();await page.waitForTimeout(200);assert.notDeepEqual((await cam()).position,pre.position);const orbit=await cam();await page.mouse.wheel(0,-140);await page.waitForTimeout(200);assert.notDeepEqual((await cam()).position,orbit.position);const zoom=await cam();await page.mouse.down({button:'right'});await page.mouse.move(b.x+b.width*.58,b.y+b.height*.55,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);assert.notDeepEqual((await cam()).target,zoom.target);
  const sourceHashes={};for(const f of ['plan.js','index.js','kitchen-room.js','kitchen-art.js','preview.js','preview.html',...['stove','side','table','front'].map(n=>'references/kitchen-'+n+'.jpg')])sourceHashes[folder+'/'+f]=hash(await readFile(folder+'/'+f));
  const report={passed:false,sourceHashes,scope:{objects:Object.keys(snapshot.objects).length,files:Object.keys(files).length,surfaces:snapshot.surfaces.length,otherRoomsUnchanged:true},audit,views,interaction:{orbit:true,zoom:true,pan:true,reference:true},errors};await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));
  assert.equal(audit.nonfinite,0);assert.equal(audit.degenerate,0);assert(audit.grounding.every(v=>v.pass));assert.deepEqual(audit.outside,[]);assert.deepEqual(audit.blockedEntry,[]);assert.deepEqual(audit.rearDoor.sweepCollisions,[]);assert.deepEqual(audit.passage,[]);assert(Object.values(audit.wallModes).every(Boolean));assert(audit.resourceDisposal);assert(audit.details.sinkDepth>.12);assert(audit.details.entryClearWidth>1);assert.deepEqual(errors,[]);
  report.passed=true;await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,scope:report.scope,audit,errors}));
 }
}finally{await browser.close();}
