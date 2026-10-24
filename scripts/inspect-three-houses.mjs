import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

// Dedicated asset inspection. File responses stay inside an isolated browser;
// no HTTP service, editor import, localStorage write or town regression.
const packageOutput=process.argv.includes('--package');
const ids=['tama-house','grandparents-house','kosugi-house'];
const only=process.argv.find(a=>a.startsWith('--only='))?.split('=')[1];
const distRoot=path.resolve('dist'),out=path.resolve('artifacts/buildings/three-houses');
const hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const summary=[];
try{
 for(const id of ids.filter(id=>!only||id===only)){
  const folder='town/assets/'+id,dir=out+'/'+id;await mkdir(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width:1560,height:1040},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('Asset preview must not write browser storage');};});
  await page.route('http://three-houses.local/**',async route=>{
   const u=new URL(route.request().url()),file=path.resolve(distRoot,'.'+decodeURIComponent(u.pathname)),rel=path.relative(distRoot,file);
   if(route.request().method()!=='GET'||rel.startsWith('..')||path.isAbsolute(rel))return route.abort();
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
   try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'Missing local preview file'});}
  });
  await page.goto('http://three-houses.local/'+folder+'/preview.html');await page.waitForFunction(()=>window.__house?.ready,null,{timeout:60000});
  await page.waitForTimeout(250);await page.screenshot({path:dir+'/preview.png'});
  await page.evaluate(()=>window.__house.clean(true));
  for(const view of ['hero','reference','left','right','back','top','roof','detail','gate']){await page.evaluate(v=>window.__house.setView(v),view);await page.waitForTimeout(180);await page.screenshot({path:dir+'/'+view+'.png'});}
  await page.evaluate(()=>{window.__house.clean(false);window.__house.reference(true);});
  await page.waitForFunction(()=>{const i=document.querySelector('#reference-image');return i.complete&&i.naturalWidth>0;});await page.waitForTimeout(220);await page.screenshot({path:dir+'/reference-compare.png'});
  const geometry=await page.evaluate(async()=>{
   const Three=await import('three');
   const h=window.__house,T=h.asset.root,inspection=h.inspect();let meshes=0,triangles=0,invalid=0;const resources=new Set();
   T.traverse(o=>{if(o.geometry){resources.add(o.geometry);for(const a of Object.values(o.geometry.attributes))for(const v of a.array)if(!Number.isFinite(v))invalid++;}if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m);if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
   const neighbour=h.createModel();let sharedResources=0,neighbourDisposed=0;neighbour.root.traverse(o=>{if(o.geometry){if(resources.has(o.geometry))sharedResources++;o.geometry.addEventListener('dispose',()=>neighbourDisposed++);}if(o.material){if(resources.has(o.material))sharedResources++;o.material.addEventListener('dispose',()=>neighbourDisposed++);}});
   const sacrificial=h.createModel(),disposed=new Map();sacrificial.root.traverse(o=>{for(const r of[o.geometry,o.material].filter(Boolean))if(!disposed.has(r)){disposed.set(r,0);r.addEventListener('dispose',()=>disposed.set(r,disposed.get(r)+1));}});sacrificial.dispose();sacrificial.dispose();const lifecycle=[...disposed.values()].every(n=>n===1)&&neighbourDisposed===0;neighbour.dispose();
   // Actual cap vertices must stay below the roof at the same horizontal point.
   // This catches the side gable protrusion found in the first visual pass.
   const roofMeshes=[],caps=[];for(const child of T.children){if(/蓝瓦|红色.*坡|山墙.*坡|高屋[左右]坡|低附屋.*坡/.test(child.name))child.traverse(o=>{if(o.isMesh)roofMeshes.push(o);});if(/封板|奶油.*山墙|薄荷色正山墙/.test(child.name))caps.push(child);}
   const ray=new Three.Raycaster(),point=new Three.Vector3(),violations=[];let roofSamples=0;
   for(const cap of caps){const tops=new Map();cap.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){point.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);const key=point.x.toFixed(4)+':'+point.z.toFixed(4),previous=tops.get(key);if(!previous||point.y>previous[1])tops.set(key,point.toArray());}});for(const p of tops.values()){ray.set(new Three.Vector3(p[0],20,p[2]),new Three.Vector3(0,-1,0));const hits=ray.intersectObjects(roofMeshes,false);if(hits.length){roofSamples++;if(p[1]>hits[0].point.y+.025)violations.push({part:cap.name,cap:p,roofY:hits[0].point.y});}}}
   return {inspection,meshes,triangles,invalid,sharedResources,lifecycle,roofSamples,roofCapViolations:violations};
  });
  await page.locator('#close-reference').click();await page.locator('[data-view=hero]').click();
  const before=await page.evaluate(()=>window.__house.inspect().camera),rect=await page.locator('#world').boundingBox();
  await page.mouse.move(rect.x+rect.width*.50,rect.y+rect.height*.50);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.62,rect.y+rect.height*.55,{steps:10});await page.mouse.up();await page.waitForTimeout(200);const orbit=await page.evaluate(()=>window.__house.inspect().camera);
  await page.mouse.wheel(0,-160);await page.waitForTimeout(200);const zoom=await page.evaluate(()=>window.__house.inspect().camera);
  await page.mouse.down({button:'right'});await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.58,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);const pan=await page.evaluate(()=>window.__house.inspect().camera);
  await page.locator('#plants').click();const hidden=await page.evaluate(()=>!window.__house.asset.root.getObjectByName('庭院植物').visible);await page.locator('#plants').click();
  const b=geometry.inspection.bounds,p=geometry.inspection.specification.plot;
  const checks={finiteGeometry:geometry.invalid===0,withinPlotX:b.min[0]>=-p[0]/2-.02&&b.max[0]<=p[0]/2+.02,withinPlotZ:b.min[2]>=-p[1]/2-.02&&b.max[2]<=p[1]/2+.02,ground:b.min[1]>=-.14&&b.min[1]<.12,roofCaps:geometry.roofSamples>0&&geometry.roofCapViolations.length===0,instanceIsolation:geometry.sharedResources===0,lifecycle:geometry.lifecycle,rotate:JSON.stringify(before.position)!==JSON.stringify(orbit.position),zoom:zoom.zoom!==orbit.zoom,pan:JSON.stringify(pan.target)!==JSON.stringify(zoom.target),plantToggle:hidden,errors:errors.length===0};
  const report={id,checks,geometry,errors,passed:Object.values(checks).every(Boolean),package:null};
  await writeFile(dir+'/inspection.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({id,checks,bounds:b,triangles:geometry.triangles,errors}));
  if(packageOutput){
   assert(report.passed,'Asset inspection failed: '+id);
   const exporter=await readFile('node_modules/three/examples/jsm/exporters/GLTFExporter.js','utf8');
   const loader=(await readFile('node_modules/three/examples/jsm/loaders/GLTFLoader.js','utf8')).replace('../utils/BufferGeometryUtils.js','three/addons/utils/BufferGeometryUtils.js');
   const data=await page.evaluate(async({exporter,loader})=>{
    async function mod(code){const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{return await import(url);}finally{URL.revokeObjectURL(url);}}
    const T=await import('three'),{GLTFExporter}=await mod(exporter),{GLTFLoader}=await mod(loader),model=window.__house.createModel();
    const glb=await new GLTFExporter().parseAsync(model.root,{binary:true,onlyVisible:true}),loaded=await new GLTFLoader().parseAsync(glb,'');let meshes=0,triangles=0;loaded.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
    const box=new T.Box3().setFromObject(loaded.scene),source=new T.Box3().setFromObject(model.root);const error=Math.max(...box.min.toArray().map((v,i)=>Math.abs(v-source.min.toArray()[i])),...box.max.toArray().map((v,i)=>Math.abs(v-source.max.toArray()[i])));model.dispose();const bytes=new Uint8Array(glb);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return{base64:btoa(binary),bytes:bytes.length,meshes,triangles,boundsError:error};
   },{exporter,loader});
   assert(data.boundsError<1e-4&&data.triangles===geometry.triangles,'GLB round-trip differs');
   await writeFile('dist/'+folder+'/'+id+'.glb',Buffer.from(data.base64,'base64'));
   const imports={},visited=new Set(),sourceHashes={};
   function resolve(spec,from){if(spec==='three')return'vendor/three.module.js';if(spec.startsWith('three/addons/'))return'vendor/addons/'+spec.slice(13);if(spec.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));throw new Error('Unsupported module '+spec);}
   async function bundle(file){if(visited.has(file))return;visited.add(file);const src=await readFile('dist/'+file,'utf8'),deps=[];sourceHashes[file]=hash(src);const code=src.replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g,(_,pre,q,spec)=>{const dep=resolve(spec,file);deps.push(dep);return`${pre}${q}@house/${dep}${q}`;});imports['@house/'+file]='data:text/javascript;base64,'+Buffer.from(code).toString('base64');for(const dep of deps)await bundle(dep);}
   await bundle(folder+'/preview.js');
   const reference='data:image/jpeg;base64,'+(await readFile('dist/'+folder+'/references/user-exterior.jpg')).toString('base64'),css=await readFile('dist/town/assets/shared/residential-preview.css','utf8');
   const html=(await readFile('dist/'+folder+'/preview.html','utf8')).replace('<style id="viewer-style"></style>',`<style id="viewer-style">${css}</style>`).replace(/<script type="importmap">[\s\S]*?<\/script>/,`<script>globalThis.__residentialReference=${JSON.stringify(reference)};</script><script type="importmap">${JSON.stringify({imports})}</script>`).replace('<script type="module" src="./preview.js"></script>',`<script type="module">import '@house/${folder}/preview.js';</script>`).replace('src="./references/user-exterior.jpg"',`src="${reference}"`).replace(`href="./${id}.glb"`,`href="data:model/gltf-binary;base64,${data.base64}" download="${id}.glb"`);
   const offline=dir+'/'+geometry.inspection.specification.name+'-三维预览.html';await writeFile(offline,html);
   await page.route(/^https?:\/\//,r=>{requests.push(r.request().url());return r.abort();});await page.goto(pathToFileURL(offline).href);await page.waitForFunction(()=>window.__house?.ready);
   for(const view of['hero','back','roof','detail']){await page.locator(`[data-view=${view}]`).click();assert.equal(await page.evaluate(()=>window.__house.inspect().current),view);}
   await page.locator('#compare').click();await page.waitForFunction(()=>document.querySelector('#reference-image').naturalWidth>0);await page.screenshot({path:dir+'/offline-compare.png'});
   assert.equal(requests.length,0);assert.equal(errors.length,0);for(const[f,h]of Object.entries(sourceHashes))assert.equal(hash(await readFile('dist/'+f)),h,'Concurrent source edit '+f);
   report.package={bytes:data.bytes,triangles:data.triangles,boundsError:data.boundsError,offline,offlineBytes:Buffer.byteLength(html),modules:visited.size,requests,sourceHashes};
   await writeFile(dir+'/inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify({id,package:true,glbBytes:data.bytes,offlineBytes:Buffer.byteLength(html)}));
  }
  summary.push(report);await context.close();
 }
 await writeFile(out+(only?'/inspection-'+only+'.json':'/inspection.json'),JSON.stringify({passed:summary.every(x=>x.passed),assets:summary},null,2));
}finally{await browser.close();}
