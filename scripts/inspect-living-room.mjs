import {chromium} from 'playwright';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='artifacts/buildings/sakura-house/interior/living-01',folder='dist/town/assets/sakura-house/interior';
const hash=v=>createHash('sha256').update(v).digest('hex');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4184/town/assets/sakura-house/interior/preview.html');await page.waitForFunction(()=>window.__sakuraInterior?.ready);
 const objects=await page.evaluate(async()=>{
  const excluded=new Set(['客厅精修','floor:living','客厅矮桌','客厅东墙食器柜','客厅西北角电视','客厅坐垫','wall:south-main','cut:south-main','wall:east-main','cut:east-main','wall:living-corridor','cut:living-corridor','wall:sisters-living','cut:sisters-living','door:living-corridor:9.03']);
  const data={},h=window.__sakuraInterior.house;h.root.updateMatrixWorld(true);
  async function visit(o,p){if(excluded.has(o.name))return;const k=p+'/'+(o.name||o.type);if(o.isMesh||o.isLineSegments){const m=o.material;if(['/floor:parents','/floor:grandparents'].some(n=>p.includes(n))&&['78896a','bec493'].includes(m.color?.getHexString()))return;const record=JSON.stringify({matrix:o.matrixWorld.elements,attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:o.geometry.index&&Array.from(o.geometry.index.array),color:m.color?.getHex(),opacity:m.opacity,map:m.map?.image?.toDataURL?.()});data[k]=(data[k]||'')+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(record)))).map(x=>x.toString(16).padStart(2,'0')).join('');}else for(const c of o.children)await visit(c,k);}
  for(const c of h.root.children)await visit(c,'');return data;
 });
 const planOutsideLivingRoute=hash((await readFile(folder+'/plan.js','utf8')).replace(/^ living:\[.*$/m,' living:<authorized room route>'));
 const refinementProtected=await page.evaluate(async()=>{
  const h=window.__sakuraInterior.house,data={};h.root.updateMatrixWorld(true);
  const digest=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(x=>x.toString(16).padStart(2,'0')).join('');
  async function visit(o,path,local=false){
   const key=path+'/'+(o.name||o.type);
   if(['客11-3','客11-4'].includes(o.userData.checklist)){local=true;data[key+'/fixedShapeTransform']=await digest({rotation:o.rotation.toArray(),scale:o.scale.toArray()});}
   if(o.isMesh||o.isLineSegments){
    const m=o.material;if((path.includes('/floor:living')&&['c5b57d','aaa078'].includes(m.color?.getHexString()))||(['/floor:parents','/floor:grandparents'].some(n=>path.includes(n))&&['78896a','bec493'].includes(m.color?.getHexString())))return;
    const g=o.geometry,record={matrix:(local?o.matrix:o.matrixWorld).elements,attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:g.index&&Array.from(g.index.array),color:m.color?.getHex(),opacity:m.opacity,map:m.map?.image?.toDataURL?.()};
    data[key]=(data[key]||'')+await digest(record);
   }else for(const c of o.children)await visit(c,key,local);
  }
  for(const c of h.root.children)await visit(c,'');return data;
 });
 if(process.argv.includes('--baseline')){
  const files={};for(const name of await readdir(folder)){if(name.startsWith('sisters-')||name==='workshop.js')files[folder+'/'+name]=hash(await readFile(folder+'/'+name));}
  for(const name of await readdir('dist/town/assets/sakura-house',{withFileTypes:true})){if(name.isFile())files['dist/town/assets/sakura-house/'+name.name]=hash(await readFile('dist/town/assets/sakura-house/'+name.name));}
  await writeFile(out+'/scope-before-04-allfloors.json',JSON.stringify({files,objects,refinementProtected,planOutsideLivingRoute},null,2),{flag:'wx'});console.log(JSON.stringify({baseline:true,objects:Object.keys(objects).length,files:Object.keys(files).length}));
 }else{
  const before=JSON.parse(await readFile(out+'/scope-before-04-allfloors.json','utf8'));
  assert.deepEqual(objects,before.objects,'Unrelated room geometry/material changed');
  assert.deepEqual(refinementProtected,before.refinementProtected,'Protected objects or cushion local shape changed');assert.equal(planOutsideLivingRoute,before.planOutsideLivingRoute,'Plan changed outside the living route');
  for(const [file,h] of Object.entries(before.files))assert.equal(hash(await readFile(file)),h,file);
  const audit=await page.evaluate(async()=>{
   const T=await import('three'),h=window.__sakuraInterior.house,r=h.living;h.setWalls('full');h.root.updateMatrixWorld(true);
   let nonfinite=0,zeroArea=0,meshes=0,triangles=0;const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3();
   r.root.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?ix.count:p.count;triangles+=n/3;for(const v of p.array)if(!Number.isFinite(v))nonfinite++;for(let i=0;i<n;i+=3){va.fromBufferAttribute(p,ix?ix.getX(i):i);vb.fromBufferAttribute(p,ix?ix.getX(i+1):i+1);vc.fromBufferAttribute(p,ix?ix.getX(i+2):i+2);if(vb.sub(va).cross(vc.sub(va)).lengthSq()<1e-28)zeroArea++;}});
   const entries=r.entries.map(e=>{const b=new T.Box3().setFromObject(e.group);return {id:e.id,name:e.name,min:b.min.toArray(),max:b.max.toArray()};}),byId=Object.fromEntries(entries.map(e=>[e.id,e]));
   const outside=entries.filter(e=>e.min[0]<8.25||e.max[0]>11.77||e.min[2]<3.70||e.max[2]>7.22||e.min[1]<-.005||e.max[1]>2.45);
   const cushions=entries.filter(e=>e.id.startsWith('客11-'));
   const supportChecks=[['客05',0],['客07',0],['客06',.442],['客08',0],['客09',0],['客10',1.22],...cushions.map(e=>[e.id,0])].map(([id,y])=>({id,gap:byId[id].min[1]-y,pass:byId[id].min[1]-y>=-.005&&byId[id].min[1]-y<=.012}));
   const pairs=[],intersections=[];for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const a=entries[i].id,b=entries[j].id;if((a==='客07'&&b==='客06')||(a==='客09'&&b==='客10'))continue;pairs.push([a,b]);}
   for(const [a,b] of pairs){const aa=byId[a],bb=byId[b],depth=aa.min.map((v,i)=>Math.min(aa.max[i],bb.max[i])-Math.max(v,bb.min[i]));if(depth.every(v=>v>.001))intersections.push({pair:[a,b],depth});}
   const probes=[['客厅原粉条',[8.6,1.3,7.0],[0,0,1],'f5df8e'],['客厅东墙',[11.5,1.8,6.5],[1,0,0],'f5df8e'],['客厅西墙',[8.5,1.6,5.5],[-1,0,0],'f5df8e'],['客厅门旁',[11.2,1.3,3.9],[0,0,-1],'f5df8e'],['姐妹房原粉墙',[7.7,1.3,7.0],[0,0,1],'e9b9b5']].map(([name,origin,direction,expected])=>{const hit=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,1).intersectObject(h.fullWalls,true).find(v=>v.object.isMesh);return {name,color:hit?.object.material.color.getHexString(),expected};});
   const table=byId['客05'],tableSize=table.max.map((v,i)=>v-table.min[i]);
   const cushionSides={north:0,east:0,south:0,west:0};for(const c of cushions){const x=(c.min[0]+c.max[0])/2,z=(c.min[2]+c.max[2])/2;if(z<table.min[2])cushionSides.north++;else if(z>table.max[2])cushionSides.south++;else if(x<table.min[0])cushionSides.west++;else if(x>table.max[0])cushionSides.east++;}
   const floor=h.root.getObjectByName('floor:living'),floorColors=floor.children.filter(o=>o.isMesh).map(o=>o.material.color.getHexString());
   const floorProbes=[[9.99,4.13],[10.03,4.13],[9.99,6.70]].map(([x,z])=>new T.Raycaster(new T.Vector3(x,.2,z),new T.Vector3(0,-1,0),0,.4).intersectObject(floor,true).find(v=>v.object.isMesh)?.object.material.color.getHexString());
   const televisionAngles=['客06','客07'].map(id=>({id,degrees:r.entries.find(e=>e.id===id).group.rotation.y*180/Math.PI}));
   const tv=r.entries.find(e=>e.id==='客06').group,blackScreen=tv.children.some(o=>o.isMesh&&o.material.color.getHexString()==='202427'&&!o.material.map)&&!tv.children.some(o=>o.material?.map);
   const dishCounts={},dishBounds=[],dishIntersections=[];let chopsticks=0;
   for(const d of r.dishItems){dishCounts[d.kind]=(dishCounts[d.kind]||0)+d.count;chopsticks+=d.chopsticks||0;const floor=d.shelf===0?.655:.855,ceiling=d.shelf===0?.835:1.16,left=(d.min[0]+d.max[0])<0;dishBounds.push({...d,pass:d.min[0]>=(left?-.585:.013)-1e-5&&d.max[0]<=(left?-.013:.585)+1e-5&&Math.abs(d.min[1]-floor)<.002&&d.max[1]<ceiling&&d.min[2]>=-.1945&&d.max[2]<.2125});}
   for(let i=0;i<dishBounds.length;i++)for(let j=i+1;j<dishBounds.length;j++){const a=dishBounds[i],b=dishBounds[j];if(a.min.every((v,k)=>Math.min(a.max[k],b.max[k])-Math.max(v,b.min[k])>.001))dishIntersections.push([i,j]);}
   const quadrants={};for(const d of r.dishItems){quadrants[d.quadrant]||={};quadrants[d.quadrant][d.kind]=(quadrants[d.quadrant][d.kind]||0)+d.count;}
   const cabinet=r.entries.find(e=>e.id==='客09').group,alignedWithTable=Math.abs(cabinet.position.z-5.52)<1e-6&&Math.abs(cabinet.rotation.y+Math.PI/2)<1e-6;
   const windowHits=[.85+1.15/3,.85+2*1.15/3,.85+1.15*.55].map(y=>new T.Raycaster(new T.Vector3(9.40,y,7.0),new T.Vector3(0,0,1),0,.5).intersectObject(h.fullWalls,true).find(v=>v.object.isMesh)?.object.material.color.getHexString());
   const calendarMaps=[];r.root.traverse(o=>{if(o.material?.map?.name==='客厅图案:calendar')calendarMaps.push(o.material.map.name);});
   const decorModes={};for(const mode of ['hidden','cut','outer-hidden','full']){h.setWalls(mode);decorModes[mode]=r.wallDecor.every(g=>g.visible===(mode==='full'));}
   const doorDetails=[];h.doors.traverse(o=>{if(o.userData.checklist==='客04')doorDetails.push(o.name);});
   const fresh=window.__sakuraInterior.createInterior(),counts=new Map();fresh.root.traverse(o=>{if(o.isMesh||o.isLineSegments){counts.set(o.geometry,0);for(const m of Array.isArray(o.material)?o.material:[o.material]){counts.set(m,0);if(m.map)counts.set(m.map,0);}}});for(const obj of counts.keys())obj.addEventListener('dispose',()=>counts.set(obj,counts.get(obj)+1));fresh.dispose();fresh.dispose();
   return {meshes,triangles,nonfinite,zeroArea,entries,outside,supportChecks,pairChecks:pairs.length,intersections,probes,tableSize,televisionAngles,blackScreen,cushionSides,floorColors,floorProbes,quadrants,alignedWithTable,windowHits,calendarMaps,decorModes,dishCounts,chopsticks,dishBounds,dishIntersections,doorDetails,resourceDisposal:[...counts.values()].every(v=>v===1),resources:counts.size};
  });
  const views=['living-reference','living-tv','living-cabinet','living-cabinet-front','living-window','living-reverse'];
  for(const v of views){await page.locator(`[data-view="${v}"]`).click();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().livingView),v);await page.locator('#world').screenshot({path:out+'/'+v+'.png'});}
  await page.evaluate(()=>{const a=window.__sakuraInterior;a.focusRoom('living');a.camera.position.set(10.01,14,6.1);a.controls.target.set(10.01,0,5.46);a.camera.zoom=2.7;a.camera.updateProjectionMatrix();a.controls.update();});await page.waitForTimeout(200);await page.locator('#world').screenshot({path:out+'/living-overhead.png'});
  await page.locator('[data-view="living-reference"]').click();await page.locator('#compare').click();await page.waitForFunction(()=>document.getElementById('reference-image').complete&&document.getElementById('reference-image').naturalWidth>0);assert((await page.locator('#reference-image').getAttribute('src')).endsWith('living-01-anime.jpg'));await page.screenshot({path:out+'/comparison.png'});await page.locator('#close-reference').click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().livingView),'living-reference');
  for(const [view,reference] of [['living-cabinet-front','living-03-cabinet.jpg'],['living-window','living-04-window.jpg']]){
   await page.locator(`[data-view="${view}"]`).click();await page.locator('#compare').click();await page.waitForFunction(name=>{const img=document.getElementById('reference-image');return img.complete&&img.naturalWidth>0&&img.src.endsWith(name);},reference);await page.screenshot({path:out+'/'+view+'-comparison.png'});await page.locator('#close-reference').click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().livingView),view);
  }
  const checklist=JSON.parse(await readFile(folder+'/living-checklist.json','utf8'));assert.equal(checklist.items.length,16);
  const report={passed:false,revision:checklist.revision,scope:{objects:Object.keys(objects).length,files:Object.keys(before.files).length,refinementObjects:Object.keys(refinementProtected).length,planOutsideLivingRoute:true,changed:[]},audit,views,checklist:checklist.items.map(e=>({id:e.id,name:e.name,checked:!['客01','客02','客03','客04','客12','客14'].includes(e.id)?audit.entries.some(v=>v.id.startsWith(e.id)):true})),errors};
  await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));
  assert.deepEqual(audit.outside,[]);assert.equal(audit.nonfinite,0);assert.equal(audit.zeroArea,0);assert(audit.supportChecks.every(v=>v.pass));assert.deepEqual(audit.intersections,[]);assert(audit.probes.every(p=>p.color===p.expected));assert(Math.abs(audit.tableSize[0]-audit.tableSize[2])<1e-6);assert.equal(audit.doorDetails.length,2);assert(audit.resourceDisposal);assert(report.checklist.every(v=>v.checked));assert.deepEqual(errors,[]);
  assert(audit.televisionAngles.every(v=>Math.abs(v.degrees-45)<1e-6));assert(audit.blackScreen);assert.deepEqual(audit.cushionSides,{north:2,east:2,south:2,west:0});assert.deepEqual(audit.floorColors,['f2e5ab']);assert(audit.floorProbes.every(c=>c==='f2e5ab'));assert(audit.dishBounds.every(v=>v.pass));assert.deepEqual(audit.dishIntersections,[]);assert.deepEqual(audit.quadrants,{'左上':{'茶杯':3},'右上':{'茶壶':1,'蒸炉':1},'左下':{'倒扣碗堆':8,'倒扣盆':1},'右下':{'方形叠层物品':2,'倒扣盆':1}});assert(audit.alignedWithTable);assert.equal(audit.windowHits[0],audit.windowHits[1]);assert.notEqual(audit.windowHits[0],'92b6cf');assert.equal(audit.windowHits[2],'92b6cf');assert.equal(audit.calendarMaps.length,1);assert(Object.values(audit.decorModes).every(Boolean));
  report.passed=true;await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,scope:report.scope,geometry:{meshes:audit.meshes,triangles:audit.triangles},probes:audit.probes,checklist:report.checklist}));
 }
}finally{await browser.close();}
