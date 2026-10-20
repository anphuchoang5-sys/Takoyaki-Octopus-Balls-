import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir=path.resolve('artifacts/buildings/sakura-house/roof-04');
const base=process.env.SAKURA_PREVIEW_URL||'http://127.0.0.1:4184/town/assets/sakura-house/preview.html';
const draft=process.argv.includes('--draft');
await mkdir(dir,{recursive:true});
const before=await readFile(path.join(dir,'before/index.js'),'utf8');
const current=await readFile('dist/town/assets/sakura-house/index.js','utf8');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],warnings=[];
try{
  const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__sakura?.ready);
  const initial=await page.evaluate(()=>window.__sakura.inspect());
  assert.equal(initial.specification.revision,'exterior-04-roof');

  // Inspect authored components before batching, without changing production geometry helpers.
  const protection=await page.evaluate(async({before,current,base})=>{
    async function load(source){
      source=source.replace("'./geometry.js'",JSON.stringify(new URL('geometry.js',base).href)).replace("'./environment.js'",JSON.stringify(new URL('environment.js',base).href));
      source=source.replace('W.finish();',`root.updateMatrixWorld(true);
        function describe(group){const out=[];group.traverse(o=>{if(!o.isMesh&&!o.isLineSegments)return;out.push({type:o.type,matrix:o.matrixWorld.toArray(),attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),indices:o.geometry.index?Array.from(o.geometry.index.array):null,color:o.material.color?.getHexString(),opacity:o.material.opacity,transparent:o.material.transparent,texture:o.material.map?.image?.toDataURL?.()||null});});return out;}
        root.userData.roofAudit={groups:Object.fromEntries(root.children.map(c=>[c.name,describe(c)])),gables:describe(roof.children.filter(c=>c.name==='端部山墙')[0]).concat(describe(roof.children.filter(c=>c.name==='端部山墙')[1])),annexFixed:annex.children.filter(c=>c.name==='附屋屋檐下封板'||(c.isMesh&&c.material.color?.getHexString()==='ee8fae')).map(describe)};
        W.finish();`);
      const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      try{return (await import(url)).createModel();}finally{URL.revokeObjectURL(url);}
    }
    const old=await load(before),fresh=await load(current),a=old.root.userData.roofAudit,b=fresh.root.userData.roofAudit;
    const excluded=['连续切妻屋顶与轻薄瓦片','右侧低附屋斜屋顶'];
    const same=[],changed=[];
    for(const name of Object.keys(a.groups)){if(excluded.includes(name))continue;(JSON.stringify(a.groups[name])===JSON.stringify(b.groups[name])?same:changed).push(name);}
    const result={same,changed,gablesUnchanged:JSON.stringify(a.gables)===JSON.stringify(b.gables),annexWallUnchanged:JSON.stringify(a.annexFixed)===JSON.stringify(b.annexFixed),openingsUnchanged:JSON.stringify(old.root.userData.openings)===JSON.stringify(fresh.root.userData.openings),collidersUnchanged:JSON.stringify(old.colliders)===JSON.stringify(fresh.colliders),floorsUnchanged:JSON.stringify(old.floors)===JSON.stringify(fresh.floors)};
    // Retain old model only for matched-camera screenshots; remove large audit arrays first.
    delete old.root.userData.roofAudit;delete fresh.root.userData.roofAudit;
    old.root.visible=false;window.__sakura.scene.add(old.root);window.__roofBefore=old;fresh.dispose();return result;
  },{before,current,base});
  assert.deepEqual(protection.changed,[]);assert(protection.gablesUnchanged&&protection.annexWallUnchanged&&protection.openingsUnchanged&&protection.collidersUnchanged&&protection.floorsUnchanged);

  await page.evaluate(()=>{document.body.classList.add('reference-capture');window.__sakura.setElapsed(0);});
  const shots=[];
  async function shot(name){await page.waitForTimeout(200);await page.screenshot({path:path.join(dir,name+'.png')});shots.push(name+'.png');}
  async function showOld(value){await page.evaluate(value=>{window.__sakura.house.root.visible=!value;window.__roofBefore.root.visible=value;window.__sakura.renderer.shadowMap.needsUpdate=true;},value);}
  for(const [view,name] of [['reference','reference'],['roof','roof-close'],['left','left'],['right','right'],['back','back'],['top','top']]){
    await page.evaluate(view=>window.__sakura.setView(view),view);
    if(['reference','roof'].includes(view)){await showOld(true);await shot(name+'-before');await showOld(false);}
    await shot(name+'-after');
  }
  await page.evaluate(()=>{const a=window.__sakura;a.setView('hero');a.controls.target.set(0,2.8,0);a.camera.position.set(-16,10,25);a.camera.zoom=1.32;a.camera.updateProjectionMatrix();a.controls.update();});
  await showOld(true);await shot('town-distance-before');await showOld(false);await shot('town-distance-after');

  const bounds=await page.evaluate(()=>[0,90,180,270].map(n=>window.__sakura.boundsAt(n)));
  for(const b of bounds)for(const i of [0,2])assert(b.min[i]>=-7.00001&&b.max[i]<=7.00001,'plot boundary');
  const geometry=await page.evaluate(async()=>{
    const T=await import('three'),root=window.__sakura.house.root;let nonFinite=0,degenerate=0,triangles=0;
    root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?.count||p.count;for(const v of p.array)if(!Number.isFinite(v))nonFinite++;
      for(let i=0;i<n;i+=3){const a=new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i):i),b=new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+1):i+1),c=new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+2):i+2);if(b.sub(a).cross(c.sub(a)).length()<1e-10)degenerate++;triangles++;}});
    const ray=new T.Raycaster(),meshes=root.children.filter(o=>o.isMesh),misses=[];let rays=0;
    root.updateMatrixWorld(true);
    for(let x=-5.05;x<4.15;x+=.17)for(let z=-3.9;z<3.1;z+=.17){ray.set(new T.Vector3(x,9,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(meshes,false)[0],expected=4.9-Math.abs(z+.4)*1.88/3.65;if(!hit||hit.point.y<expected-.003)misses.push({x,z,y:hit?.point.y,expected});rays++;}
    for(let x=4.4;x<5.95;x+=.17)for(let z=-3;z<3.1;z+=.17){ray.set(new T.Vector3(x,9,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(meshes,false)[0],expected=3.07-(x-3.82)*.145;if(!hit||hit.point.y<expected-.003)misses.push({x,z,y:hit?.point.y,expected});rays++;}
    return {nonFinite,degenerate,triangles,rays,misses};
  });
  assert.equal(geometry.nonFinite,0);assert.equal(geometry.degenerate,0);assert.deepEqual(geometry.misses,[]);
  const report={revision:initial.specification.revision,protection,bounds,geometry,shots,errors,warnings,draft,userArtApproval:'pending'};
  if(draft){await writeFile(path.join(dir,'draft-inspection.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
  else{
    await page.evaluate(()=>{document.body.classList.remove('reference-capture');window.__sakura.setView('hero');});
    const start=await page.evaluate(()=>window.__sakura.inspect().camera);
    await page.mouse.move(800,560);await page.mouse.down();await page.mouse.move(1000,600,{steps:16});await page.mouse.up();await page.waitForTimeout(500);
    const rotated=await page.evaluate(()=>window.__sakura.inspect().camera);assert.notDeepEqual(rotated.position,start.position);
    await page.mouse.wheel(0,-350);await page.waitForTimeout(400);assert.notEqual(rotated.zoom,await page.evaluate(()=>window.__sakura.inspect().camera.zoom));
    await page.keyboard.press('Home');
    const state=await page.evaluate(()=>{const a=window.__sakura;a.setEnvironment({time:'night',weather:'rain'});a.setElapsed(2);const first=a.inspect().environment;a.setElapsed(2.7);const second=a.inspect().environment;a.setEnvironment({time:'afternoon',weather:'clear'});return {nightRain:first.lightsOn&&first.rainOn,moving:JSON.stringify(first.samples)!==JSON.stringify(second.samples),restored:a.inspect().environment};});
    assert(state.nightRain&&state.moving&&!state.restored.lightsOn&&!state.restored.rainOn);
    report.interaction={drag:true,wheel:true,home:true};report.state=state;
    await page.evaluate(()=>{window.__sakura.setView('reference');});await shot('viewer');

    const exporter=await readFile('node_modules/three/examples/jsm/exporters/GLTFExporter.js','utf8');
    const loader=(await readFile('node_modules/three/examples/jsm/loaders/GLTFLoader.js','utf8')).replace('../utils/BufferGeometryUtils.js','three/addons/utils/BufferGeometryUtils.js');
    const exported=await page.evaluate(async({exporter,loader})=>{
      const T=await import('three');async function module(text){const u=URL.createObjectURL(new Blob([text],{type:'text/javascript'}));try{return await import(u);}finally{URL.revokeObjectURL(u);}}
      const {GLTFExporter}=await module(exporter),{GLTFLoader}=await module(loader),a=window.__sakura;
      const unsupportedTypes=[];a.house.root.traverse(o=>{if(o.material&&!o.material.isMeshBasicMaterial&&!o.material.isMeshStandardMaterial&&!unsupportedTypes.includes(o.material.type))unsupportedTypes.push(o.material.type);});
      const buffer=await new GLTFExporter().parseAsync(a.house.root,{binary:true,onlyVisible:true});
      const loaded=await new GLTFLoader().parseAsync(buffer,'');window.__roofLoaded=loaded.scene;a.scene.add(loaded.scene);a.house.root.visible=false;a.renderer.shadowMap.needsUpdate=true;
      const bounds=new T.Box3().setFromObject(loaded.scene);let meshes=0,triangles=0;loaded.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
      const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
      return {base64:btoa(binary),bytes:bytes.length,meshes,triangles,unsupportedTypes,min:bounds.min.toArray(),max:bounds.max.toArray(),revision:loaded.scene.children[0]?.userData?.specification?.revision||loaded.scene.userData?.specification?.revision};
    },{exporter,loader});
    await shot('glb-reopened');assert.equal(exported.revision,'exterior-04-roof');assert(Math.abs(exported.max[0]-exported.min[0]-14)<.0001);
    const {base64,...glb}=exported;await writeFile('dist/town/assets/sakura-house/sakura-house.glb',Buffer.from(base64,'base64'));report.glb=glb;

    const imports={},visited=new Set(),dist=path.resolve('dist');
    function resolve(spec,relative){if(spec==='three')return 'vendor/three.module.js';if(spec.startsWith('three/addons/'))return 'vendor/addons/'+spec.slice(13);if(spec.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(relative),spec));throw new Error('Unexpected import '+spec);}
    async function bundle(relative){if(visited.has(relative))return;visited.add(relative);const source=await readFile(path.join(dist,relative),'utf8'),deps=[];
      const rewritten=source.replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g,(match,prefix,q,spec)=>{const target=resolve(spec,relative);deps.push(target);return `${prefix}${q}@sakura/${target}${q}`;});
      imports['@sakura/'+relative]='data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64');for(const dep of deps)await bundle(dep);
    }
    await bundle('town/assets/sakura-house/preview.js');
    const source=await readFile('dist/town/assets/sakura-house/preview.html','utf8');
    const html=source.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">'+JSON.stringify({imports})+'</script>').replace('<script type="module" src="./preview.js"></script>','<script type="module">import "@sakura/town/assets/sakura-house/preview.js";</script>');
    const offline=path.join(dir,'樱家-屋顶04-三维预览.html');await writeFile(offline,html);
    const ctx=await browser.newContext({offline:true,viewport:{width:1440,height:960}}),off=await ctx.newPage(),offErrors=[],requests=[];
    off.on('pageerror',e=>offErrors.push(e.message));off.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    await off.goto(pathToFileURL(offline).href+'?view=reference');await off.waitForFunction(()=>window.__sakura?.ready);
    await off.getByRole('button',{name:'自动环绕',exact:true}).click();const first=await off.evaluate(()=>window.__sakura.inspect().camera);await off.waitForTimeout(450);assert.notDeepEqual(first.position,await off.evaluate(()=>window.__sakura.inspect().camera.position));await off.getByRole('button',{name:'自动环绕',exact:true}).click();
    await off.mouse.move(750,550);const zoom=await off.evaluate(()=>window.__sakura.inspect().camera.zoom);await off.mouse.wheel(0,-200);await off.waitForTimeout(400);assert.notEqual(zoom,await off.evaluate(()=>window.__sakura.inspect().camera.zoom));
    await off.getByRole('button',{name:'屋顶',exact:true}).click();await off.waitForTimeout(200);await off.screenshot({path:path.join(dir,'offline-viewer.png')});
    assert.deepEqual(offErrors,[]);assert.deepEqual(requests,[]);report.offline={file:offline,bytes:Buffer.byteLength(html),modules:visited.size,rotation:true,zoom:true,roofView:true,errors:offErrors,httpRequests:requests};await ctx.close();
    const protectedBefore=JSON.parse((await readFile(path.join(dir,'protected-before.json'),'utf8')).replace(/^\uFEFF/,'')),changes=[];
    for(const entry of protectedBefore){let hash;try{hash=createHash('sha256').update(await readFile(entry.Path)).digest('hex').toUpperCase();}catch{hash='missing';}if(hash!==entry.Hash)changes.push(entry.Path);}
    report.protectedFiles={checked:protectedBefore.length,changed:changes};assert.deepEqual(changes,[]);
    assert.deepEqual(errors,[]);
    // The unchanged LineBasicMaterial outline triggers this exporter advisory.
    // Keep its existing GLB handling, report it, and reject every other warning.
    assert.deepEqual(glb.unsupportedTypes,['LineBasicMaterial']);
    assert.deepEqual(warnings,['GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.']);
    report.exporterAdvisory='Existing LineBasicMaterial outline; retained original export handling. Source preview has no warnings.';
    report.passed=true;
    await writeFile(path.join(dir,'inspection.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }
}finally{await browser.close();}
