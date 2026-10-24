import {chromium} from 'playwright';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const folder='dist/town/assets/sakura-house/interior',out='artifacts/buildings/sakura-house/interior/corridor-01',baseline=process.argv.includes('--baseline');
const hash=v=>createHash('sha256').update(v).digest('hex');
const cameras=[['overview',null],['central',[9.8,1.35,3.17],[5.6,.10,3.17],.85,'full'],['engawa',[.455,1.35,3.96],[.455,.08,6.7],.85,'full'],['corner',[2.2,3.2,2.1],[.50,0,3.8],.85,'cut'],['entry',[11.65,1.15,1.62],[10.32,.48,1.60],.8,'full']];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const dist=path.resolve('dist');await page.route('http://127.0.0.1:4173/**',async r=>{const file=path.resolve(dist,'.'+decodeURIComponent(new URL(r.request().url()).pathname)),rel=path.relative(dist,file);if(r.request().method()!=='GET'||rel.startsWith('..')||path.isAbsolute(rel))return r.abort();try{await r.fulfill({body:await readFile(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});}catch{await r.fulfill({status:404,body:'Missing file'});}});
 await page.goto('http://127.0.0.1:4173/town/assets/sakura-house/interior/preview.html');await page.waitForFunction(()=>window.__sakuraInterior?.ready);
 const snapshot=await page.evaluate(async()=>{
  const h=window.__sakuraInterior.house,objects={};h.setWalls('full');h.setDoorsOpen(false);h.root.updateMatrixWorld(true);
  async function walk(o,p){if(['floor:corridor','floor:engawa'].includes(o.name))return;const key=p+'/'+(o.name||o.type);if(o.isMesh||o.isLineSegments){const m=o.material,record=JSON.stringify({matrix:o.matrixWorld.elements,attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:o.geometry.index&&Array.from(o.geometry.index.array),color:m.color?.getHex(),opacity:m.opacity,map:m.map?.image?.toDataURL?.()});const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(record)))).map(v=>v.toString(16).padStart(2,'0')).join('');objects[key]=(objects[key]||'')+digest;}else for(const c of o.children)await walk(c,key);}
  for(const c of h.root.children)await walk(c,'');return {objects,layout:{rooms:h.rooms,walls:h.walls,routes:h.routes,entry:h.entry,connections:h.connections,obstacles:h.obstacles}};
 });
 const files={},mutable=new Set(['index.js','preview.js','preview.html','README.md','sakura-interior.glb']);for(const e of await readdir(folder,{withFileTypes:true}))if(e.isFile()&&!mutable.has(e.name))files[folder+'/'+e.name]=hash(await readFile(folder+'/'+e.name));
 if(baseline)await writeFile(out+'/scope-before.json',JSON.stringify({...snapshot,files},null,2),{flag:'wx'});
 else {const before=JSON.parse(await readFile(out+'/scope-before.json','utf8'));assert.deepEqual(snapshot.objects,before.objects,'Object outside corridor floors changed');assert.deepEqual(snapshot.layout,before.layout,'Layout changed');assert.deepEqual(files,before.files,'Protected interior source changed');}
 for(const [name,p,t,zoom,mode]of cameras){await page.evaluate(({p,t,zoom,mode})=>{const a=window.__sakuraInterior;a.setView(p?'corridor-view':'top');a.house.setDoorsOpen(false);if(p){a.setWallMode(mode);a.camera.position.fromArray(p);a.controls.target.fromArray(t);a.camera.zoom=zoom;a.camera.updateProjectionMatrix();a.controls.update();}document.getElementById('labels').checked=false;},{p,t,zoom,mode});await page.waitForTimeout(150);await page.locator('#world').screenshot({path:out+'/'+(baseline?'before-':'')+name+'.png'});}
 if(baseline){console.log(JSON.stringify({baseline:true,objects:Object.keys(snapshot.objects).length,files:Object.keys(files).length}));}
 else{
  const audit=await page.evaluate(async()=>{
   const T=await import('three'),h=window.__sakuraInterior.house,result={};h.root.updateMatrixWorld(true);
   for(const id of ['hall','corridor','engawa']){
    const g=h.root.getObjectByName('floor:'+id),[x0,z0,x1,z1]=h.rooms.find(r=>r.id===id).r,box=new T.Box3().setFromObject(g),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let triangles=0,nonfinite=0,degenerate=0;
    g.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?.count||p.count;triangles+=n/3;for(const v of p.array)if(!Number.isFinite(v))nonfinite++;for(let i=0;i<n;i+=3){a.fromBufferAttribute(p,ix?ix.getX(i):i);b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1);c.fromBufferAttribute(p,ix?ix.getX(i+2):i+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-28)degenerate++;}});
    const hit=(x,z)=>new T.Raycaster(new T.Vector3(x,.5,z),new T.Vector3(0,-1,0)).intersectObject(g,true).find(v=>v.object.isMesh),across=[],along=[];
    for(let x=x0+.03;x<x1-.03;x+=.0017)across.push(hit(x,(z0+z1)/2));for(let z=z0+.03;z<z1-.03;z+=.02)along.push(hit(x0+.1,z));
    result[id]={triangles,nonfinite,degenerate,bounds:[box.min.toArray(),box.max.toArray()],expected:[x0,z0,x1,z1],acrossHeights:[...new Set(across.map(v=>+v.point.y.toFixed(5)))].sort(),alongHeights:[...new Set(along.map(v=>+v.point.y.toFixed(5)))],colors:[...new Set(across.map(v=>v.object.material.color.getHexString()))].sort()};
   }return result;
  });
  for(const v of Object.values(audit)){assert.equal(v.nonfinite,0);assert.equal(v.degenerate,0);assert.deepEqual(v.acrossHeights,[-.002,0]);assert.deepEqual(v.alongHeights,[0]);assert.deepEqual(v.colors,['b89a43','e5c34f']);const [a,b,c,d]=v.expected;for(const [actual,expected]of [[v.bounds[0][0],a],[v.bounds[0][2],b],[v.bounds[1][0],c],[v.bounds[1][2],d],[v.bounds[1][1],0]])assert(Math.abs(actual-expected)<1e-5);}
  for(const v of ['corridor-view','engawa-view','top']){await page.locator(`[data-view="${v}"]`).click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().current),v);}
  await page.locator('[data-view="entry-cabinet"]').click();await page.locator('#compare').click();await page.waitForFunction(()=>document.getElementById('reference-image').naturalWidth===1200);await page.locator('#close-reference').click();
  const rect=await page.locator('#world').boundingBox(),camera=()=>page.evaluate(()=>window.__sakuraInterior.inspect().camera),before=await camera();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.57,rect.y+rect.height*.53,{steps:8});await page.mouse.up();await page.waitForTimeout(150);assert.notDeepEqual((await camera()).position,before.position);const orbit=await camera();await page.mouse.wheel(0,-140);await page.waitForTimeout(150);assert.notDeepEqual((await camera()).position,orbit.position);
  assert.deepEqual(errors,[]);const sourceHashes={};for(const f of ['index.js','preview.js','preview.html','entry-room.js','plan.js'])sourceHashes[folder+'/'+f]=hash(await readFile(folder+'/'+f));
  const report={passed:true,sourceHashes,scope:{objects:Object.keys(snapshot.objects).length,files:Object.keys(files).length,layoutUnchanged:true,entryUnchanged:true},audit,views:cameras.map(v=>v[0]),interaction:{orbit:true,zoom:true,reference:true},errors};await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }
}finally{await browser.close();}
