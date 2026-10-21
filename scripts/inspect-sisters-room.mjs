import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const out='artifacts/buildings/sakura-house/interior/sisters-02';
const base='http://127.0.0.1:4184/town/assets/sakura-house/interior/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const hash=s=>createHash('sha256').update(s).digest('hex');
async function roomSignatures(page){
 await page.goto(base+'preview.html');await page.waitForFunction(()=>window.__sakuraInterior?.ready);
 const records=await page.evaluate(()=>{
  const root=window.__sakuraInterior.house.root,exclude=new Set(['floor:sisters','姐姐书桌','小丸子书桌','姐姐椅子','小丸子椅子','姐妹房左书柜','姐妹房右书柜','姐妹房精修']);
  const data={};root.updateMatrixWorld(true);
  function visit(o,p){if(exclude.has(o.name))return;const key=p+'/'+(o.name||o.type);if(o.isMesh||o.isLineSegments){const m=o.material;data[key]=(data[key]||'')+JSON.stringify({matrix:o.matrixWorld.elements,attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:o.geometry.index&&Array.from(o.geometry.index.array),color:m.color?.getHex(),opacity:m.opacity});}else for(const child of o.children)visit(child,key);}
  for(const child of root.children)visit(child,'');return data;
 });
 return Object.fromEntries(Object.entries(records).map(([k,v])=>[k,hash(v)]));
}
try {
 const page=await browser.newPage({viewport:{width:1600,height:1100}});
 if(process.argv.includes('--baseline')){
  const objects=await roomSignatures(page);
  const files={};for(const f of ['plan.js','workshop.js','preview.js','preview.html','preview.css'])files[f]=hash(await readFile('dist/town/assets/sakura-house/interior/'+f));
  await writeFile(out+'/scope-before.json',JSON.stringify({objects,files},null,2));
  console.log(JSON.stringify({baseline:true,protectedObjects:Object.keys(objects).length,files:Object.keys(files)}));
 } else {
  const before=JSON.parse(await readFile(out+'/scope-before.json','utf8')),after=await roomSignatures(page);
  const changed=Object.keys(before.objects).filter(k=>before.objects[k]!==after[k]);
  assert.deepEqual(changed,[],'Other rooms/shared architecture changed');
  // Whole-house preview revisions are verified by inspect-sakura-interior.
  const sharedFiles=['plan.js','workshop.js'];
  for(const f of sharedFiles)assert.equal(hash(await readFile('dist/town/assets/sakura-house/interior/'+f)),before.files[f],f);
  console.log(JSON.stringify({scopePassed:true,protectedObjects:Object.keys(after).length}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'sisters-preview.html');await page.waitForFunction(()=>window.__sisters?.ready);
  await page.screenshot({path:out+'/01-viewer.png'});
  await page.goto(base+'sisters-preview.html?capture');await page.waitForFunction(()=>window.__sisters?.ready);
  for(const view of ['room','top','cabinets','sakiko','maruko','reverse','dolls','mirror','loose']){
   await page.evaluate(v=>window.__sisters.setView(v),view);await page.waitForTimeout(180);await page.screenshot({path:out+'/'+view+'.png'});
  }
  const audit=await page.evaluate(async()=>{
   const T=await import('three'),a=window.__sisters,r=a.room;let meshes=0,triangles=0,nonfinite=0,zeroArea=0;
   const v1=new T.Vector3(),v2=new T.Vector3(),v3=new T.Vector3();
   r.root.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:p.count;triangles+=n/3;for(const x of p.array)if(!Number.isFinite(x))nonfinite++;for(let i=0;i<n;i+=3){v1.fromBufferAttribute(p,ix?ix.getX(i):i);v2.fromBufferAttribute(p,ix?ix.getX(i+1):i+1);v3.fromBufferAttribute(p,ix?ix.getX(i+2):i+2);if(v2.sub(v1).cross(v3.sub(v1)).lengthSq()<1e-28)zeroArea++;}});
   r.root.updateMatrixWorld(true);const entries=r.entries.map(e=>{const b=new T.Box3().setFromObject(e.group);return {id:e.id,name:e.name,min:b.min.toArray(),max:b.max.toArray()};});
   const outside=entries.filter(e=>e.min[0]<4.55-.003||e.max[0]>8.19+.003||e.min[2]<3.64-.003||e.max[2]>7.28+.003||e.min[1]<-.003||e.max[1]>2.45+.003);
   const byId=new Map(r.entries.map(e=>[e.id,e.group])),intersections=[];
   const pairs=[['姐04','姐05'],['姐05','姐06'],['姐04','姐07'],['姐10','姐01'],['姐11','姐12'],['姐11','姐13'],['柜18','柜19'],['柜19','柜20'],['丸05','丸10'],['丸12','丸10'],['丸07','丸08'],['丸06','丸07'],['丸18','丸01']];
   for(const [p,q] of pairs){const b=new T.Box3().setFromObject(byId.get(p)),c=new T.Box3().setFromObject(byId.get(q)),d=b.clone().intersect(c);if(!d.isEmpty()&&Math.min(...d.getSize(new T.Vector3()).toArray())>.001)intersections.push({pair:[p,q],depth:d.getSize(new T.Vector3()).toArray()});}
   const groundChecks=['柜01','柜13','姐01','姐03','姐10','丸01','丸04','丸17','丸18','地01','地02','地03','地04','地05'].map(id=>{const e=entries.find(v=>v.id===id),gap=e.min[1]-.0075;return {id,gap,pass:gap>=-.009&&gap<=.012};});
   const supportChecks=[['姐04',.746],['姐05',.746],['姐06',.746],['姐07',.746],['姐11',.7695],['姐12',.7695],['姐13',.7695],['丸05',.748],['丸06',.748],['丸07',.748],['丸08',.748],['丸10',.748],['丸12',.748],['柜07',1.5775],['柜08',1.7595],['柜09',1.5775],['柜18',1.021],['柜19',1.021],['柜20',1.021]].map(([id,surface])=>{const gap=entries.find(e=>e.id===id).min[1]-surface;return {id,surface,gap,pass:gap>=-.008&&gap<=.012};});
   const collisions=[],paths={entry:[[6.45,3.17],[6.45,4.1],[6.4,5.4]],closet:[[6.45,4.65],[4.88,4.65]]},radius=.22;
   const scatter=entries.filter(e=>e.id.startsWith('地')).map(e=>({name:e.id,x:(e.min[0]+e.max[0])/2,z:(e.min[2]+e.max[2])/2,w:e.max[0]-e.min[0],d:e.max[2]-e.min[2]}));
   for(const [name,points] of Object.entries(paths))for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i],steps=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/.03);for(let j=0;j<=steps;j++){const x=p[0]+(q[0]-p[0])*j/steps,z=p[1]+(q[1]-p[1])*j/steps;for(const o of [...r.obstacles,...scatter]){const dx=Math.max(Math.abs(x-o.x)-o.w/2,0),dz=Math.max(Math.abs(z-o.z)-o.d/2,0);if(Math.hypot(dx,dz)<radius&&!collisions.some(c=>c.route===name&&c.object===o.name))collisions.push({route:name,object:o.name,at:[x,z]});}}}
   const sibling=a.createSistersRoom(),counts=new Map();sibling.root.traverse(o=>{if(o.isMesh||o.isLineSegments){counts.set(o.geometry,0);const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){counts.set(m,0);if(m.map)counts.set(m.map,0);}}});for(const v of counts.keys())v.addEventListener('dispose',()=>counts.set(v,counts.get(v)+1));sibling.dispose();sibling.dispose();
   return {meshes,triangles,nonfinite,zeroArea,entries,outside,intersectionPairs:pairs.length,intersections,groundChecks,supportChecks,paths,routeRadius:radius,collisions,resourceDisposal:[...counts.values()].every(v=>v===1),resources:counts.size,stats:a.inspect().stats};
  });
  await writeFile(out+'/geometry-inspection.json',JSON.stringify({scopePassed:true,protectedObjects:Object.keys(after).length,audit,errors},null,2));
  console.log(JSON.stringify({audit:{...audit,entries:audit.entries.length},errors}));
  assert.equal(audit.nonfinite,0);assert.equal(audit.zeroArea,0);assert.deepEqual(audit.outside,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(audit.intersections,[]);assert(audit.groundChecks.every(c=>c.pass));assert(audit.supportChecks.every(c=>c.pass));assert.deepEqual(audit.collisions,[]);assert(audit.resourceDisposal);
  const checklist=JSON.parse(await readFile('dist/town/assets/sakura-house/interior/sisters-checklist.json','utf8'));
  const ids=audit.entries.map(e=>e.id);assert.equal(checklist.items.filter(e=>!e.excluded).length,59);
  for(const e of checklist.items){assert.equal(ids.includes(e.id),!e.excluded,e.id);if(!e.excluded)assert.equal(ids.filter(id=>id===e.id).length,1);}
  await page.goto(base+'sisters-preview.html');await page.waitForFunction(()=>window.__sisters?.ready);
  const canvas=await page.locator('#world').boundingBox(),start=await page.evaluate(()=>window.__sisters.inspect().camera);
  await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.5);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.62,canvas.y+canvas.height*.55,{steps:12});await page.mouse.up();await page.waitForTimeout(250);
  assert.notDeepEqual(await page.evaluate(()=>window.__sisters.inspect().camera.position),start.position);
  const distance=await page.evaluate(()=>window.__sisters.camera.position.distanceTo(window.__sisters.controls.target));
  await page.mouse.wheel(0,-280);await page.waitForTimeout(250);assert((await page.evaluate(()=>window.__sisters.camera.position.distanceTo(window.__sisters.controls.target)))<distance);
  const target=await page.evaluate(()=>window.__sisters.controls.target.toArray());await page.mouse.down({button:'right'});await page.mouse.move(canvas.x+canvas.width*.67,canvas.y+canvas.height*.61,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(250);assert.notDeepEqual(await page.evaluate(()=>window.__sisters.controls.target.toArray()),target);
  await page.locator('#loose').uncheck();assert.equal(await page.evaluate(()=>window.__sisters.room.loose.visible),false);await page.locator('#loose').check();
  await page.locator('#auto-walls').uncheck();await page.waitForTimeout(50);assert(await page.evaluate(()=>window.__sisters.room.entries.find(e=>e.id==='房02').group.children.every(c=>c.visible)));await page.locator('#auto-walls').check();
  await page.locator('#compare').click();for(const ref of [1,2,3,4]){await page.locator(`[data-ref="${ref}"]`).click();await page.waitForFunction(()=>document.getElementById('reference-image').complete&&document.getElementById('reference-image').naturalWidth>0);}await page.locator('#close-reference').click();await page.locator('#reset').click();
  await page.screenshot({path:out+'/01-viewer.png'});
  await writeFile(out+'/inspection.json',JSON.stringify({passed:true,scope:{protectedObjects:Object.keys(after).length,sharedFiles},audit,checklist:{modelled:59,excluded:['地06']},interaction:{orbit:true,zoom:true,pan:true,looseToggle:true,wallToggle:true,references:4},errors},null,2));
  console.log(JSON.stringify({passed:true,checklist:59,excluded:'地06',scopeObjects:Object.keys(after).length,interaction:'orbit / zoom / pan / loose / walls / 4 references'}));
 }
}finally{await browser.close();}
