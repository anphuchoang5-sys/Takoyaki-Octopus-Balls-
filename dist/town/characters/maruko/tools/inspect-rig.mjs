import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=fileURLToPath(new URL('../',import.meta.url)),project=path.resolve(base,'../../../..'),out=base+'evidence/rig-01/';
const draft=process.argv.includes('--draft'),report={passed:false,checks:[],errors:[],scope:'Rig and skinning only; static test poses; no motion clips or editor integration.'};
const check=(name,condition,data)=>{report.checks.push({name,passed:!!condition,...(data?{data}:{})});assert(condition,name);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1040}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:4185/town/characters/maruko/rig-preview.html');
 try{await page.waitForFunction(()=>window.__marukoRig?.ready,{},{timeout:60000});}catch(e){console.log(JSON.stringify({errors:report.errors,body:await page.locator('body').innerText()}));throw e;}
 if(!draft){
  const bind=await page.evaluate(async()=>{
   const T=await import('three'),{createMaruko}=await import('./model.js'),h=window.__marukoRig,reference=createMaruko(),rig=h.actor;
   reference.root.updateMatrixWorld(true);rig.root.updateMatrixWorld(true);
   const old=[];reference.root.traverse(o=>{if(o.isMesh)old.push(o);});
   let meshes=0,vertices=0,attributeChanges=0,transformChanges=0,invalid=0,maxSumError=0,maxRestError=0,outlineMismatch=0;const p=new T.Vector3(),q=new T.Vector3();
   rig.root.traverse(o=>{if(!o.isMesh)return;meshes++;const before=old[o.userData.rigMeshId];if(!o.isSkinnedMesh||!before){invalid++;return;}
    const g=o.geometry,weights=g.attributes.skinWeight,indices=g.attributes.skinIndex;vertices+=weights.count;
    for(const key of ['position','normal','color']){const a=before.geometry.attributes[key]?.array,b=g.attributes[key]?.array;if(a?.length!==b?.length||a?.some((v,i)=>v!==b[i]))attributeChanges++;}
    if(before.geometry.index.array.some((v,i)=>v!==g.index.array[i]))attributeChanges++;
    if(before.material.color.getHex()!==o.material.color.getHex()||!o.material.isMeshBasicMaterial)attributeChanges++;
    if(before.matrixWorld.elements.some((v,i)=>v!==o.matrixWorld.elements[i]))transformChanges++;
    for(let i=0;i<weights.count;i++){let sum=0;for(let j=0;j<4;j++){const w=weights.array[i*4+j],b=indices.array[i*4+j];sum+=w;if(!Number.isFinite(w)||w<0||b<0||b>=rig.skeleton.bones.length)invalid++;}maxSumError=Math.max(maxSumError,Math.abs(sum-1));
     o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld);q.fromBufferAttribute(before.geometry.attributes.position,i).applyMatrix4(before.matrixWorld);maxRestError=Math.max(maxRestError,p.distanceTo(q));
    }
    if(o.userData.outline){const original=rig.root.getObjectByName(o.name.replace(/ · silhouette$/,''));for(const key of ['skinIndex','skinWeight'])if(g.attributes[key].array.some((v,i)=>v!==original.geometry.attributes[key].array[i]))outlineMismatch++;}
   });
   // Compare the actual canvas in exactly the same camera, without HUD or changing placement.
   const canvas=document.createElement('canvas');canvas.width=h.renderer.domElement.width;canvas.height=h.renderer.domElement.height;const ctx=canvas.getContext('2d');
   h.actor.root.visible=false;h.scene.add(reference.root);h.renderer.render(h.scene,h.camera);ctx.drawImage(h.renderer.domElement,0,0);const approved=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   reference.root.visible=false;h.actor.root.visible=true;h.renderer.render(h.scene,h.camera);ctx.drawImage(h.renderer.domElement,0,0);const bound=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let changedPixels=0,totalDifference=0;for(let i=0;i<approved.length;i+=4){const d=Math.max(Math.abs(approved[i]-bound[i]),Math.abs(approved[i+1]-bound[i+1]),Math.abs(approved[i+2]-bound[i+2]));if(d>2)changedPixels++;totalDifference+=d;}
   reference.dispose();return {meshes,vertices,bones:rig.skeleton.bones.length,attributeChanges,transformChanges,invalid,maxSumError,maxRestError,outlineMismatch,pixelDifferenceRatio:changedPixels/(canvas.width*canvas.height),meanPixelDifference:totalDifference/(canvas.width*canvas.height)};
  });report.bind=bind;
  check('all 107 meshes are skinned on the 44-bone hierarchy',bind.meshes===107&&bind.bones===44);
  check('approved static geometry, colours, outlines and transforms unchanged',bind.attributeChanges===0&&bind.transformChanges===0,bind);
  check('all weights finite, normalized and valid with at most four influences',bind.invalid===0&&bind.maxSumError<1e-6,{vertices:bind.vertices,maxSumError:bind.maxSumError});
  check('every outline uses the same weights as its paired surface',bind.outlineMismatch===0);
  check('bind-pose world vertices match approved model within 1 micrometre',bind.maxRestError<1e-6,{maxError:bind.maxRestError});
  check('bind-pose rendered silhouette and colours match approved model',bind.pixelDifferenceRatio<.0015&&bind.meanPixelDifference<.03,{pixelDifferenceRatio:bind.pixelDifferenceRatio,meanPixelDifference:bind.meanPixelDifference});
  const exporter=await readFile(path.join(project,'node_modules/three/examples/jsm/exporters/GLTFExporter.js'),'utf8');
  const exported=await page.evaluate(async code=>{
   const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const {GLTFExporter}=await import(url);URL.revokeObjectURL(url);
   const T=await import('three'),{GLTFLoader}=await import('./tools/GLTFLoader.js'),{createRiggedMaruko,setTestPose,rigBones,refreshRig}=await import('./rig.js');
   const actor=createRiggedMaruko(),binary=await new GLTFExporter().parseAsync(actor.root,{binary:true,onlyVisible:true}),parsed=await new GLTFLoader().parseAsync(binary,'');
   const jsonLength=new DataView(binary).getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(binary,20,jsonLength)));
   const loaded=new Map();parsed.scene.traverse(o=>{if(o.isMesh)loaded.set(o.userData.rigMeshId,o);});
   let maxRoundTripError=0,missing=0,finite=true;const p=new T.Vector3(),q=new T.Vector3();
   for(const pose of ['neutral','head','arms','legs','skirt','torso']){
    setTestPose(actor.root,pose);setTestPose(parsed.scene,pose);
    actor.root.traverse(o=>{if(!o.isMesh)return;const b=loaded.get(o.userData.rigMeshId);if(!b?.isSkinnedMesh){missing++;return;}for(let i=0;i<o.geometry.attributes.position.count;i+=13){o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld);b.getVertexPosition(i,q).applyMatrix4(b.matrixWorld);const d=p.distanceTo(q);finite&&=Number.isFinite(d);maxRoundTripError=Math.max(maxRoundTripError,d);}});
   }
   // Both roots must remain usable under a scene placement and uniform scale.
   for(const root of [actor.root,parsed.scene]){root.position.set(.7,.2,-.4);root.rotation.y=.4;root.scale.setScalar(1.3);refreshRig(root);}
   actor.root.traverse(o=>{if(!o.isMesh)return;const b=loaded.get(o.userData.rigMeshId);for(let i=0;i<o.geometry.attributes.position.count;i+=31){o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld);b.getVertexPosition(i,q).applyMatrix4(b.matrixWorld);maxRoundTripError=Math.max(maxRoundTripError,p.distanceTo(q));}});
   const other=createRiggedMaruko(),before=JSON.stringify(Object.values(other.bones).map(b=>b.quaternion.toArray()));actor.setPose('arms');const independent=before===JSON.stringify(Object.values(other.bones).map(b=>b.quaternion.toArray()));other.dispose();
   const resources=new Map();actor.root.traverse(o=>{if(o.isMesh){resources.set(o.geometry,0);resources.set(o.material,0);}});actor.skeleton.computeBoneTexture();resources.set(actor.skeleton.boneTexture,0);for(const r of resources.keys())r.addEventListener('dispose',()=>resources.set(r,resources.get(r)+1));actor.dispose();actor.dispose();
   const disposeOnce=[...resources.values()].every(v=>v===1);
   const skels=new Set(),geometries=new Set(),materials=new Set();parsed.scene.traverse(o=>{if(o.isSkinnedMesh)skels.add(o.skeleton);if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});for(const s of skels)s.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
   let data='';const bytes=new Uint8Array(binary);for(let i=0;i<bytes.length;i+=32768)data+=String.fromCharCode(...bytes.subarray(i,i+32768));
   return {base64:btoa(data),bytes:bytes.length,skins:json.skins?.length,joints:json.skins?.[0].joints.length,animations:parsed.animations.length,nodes:json.nodes.length,missing,finite,maxRoundTripError,independent,disposeOnce,resources:resources.size,unlit:json.extensionsUsed.includes('KHR_materials_unlit')};
  },exporter);
  const {base64,...glb}=exported;report.glb=glb;await writeFile(base+'maruko-rigged.glb',Buffer.from(base64,'base64'));
  check('GLB contains skins, 44 joints, unlit materials and no animation clips',glb.skins===107&&glb.joints===44&&glb.animations===0&&glb.unlit,glb);
  check('GLB skinning matches all test poses and scene placement within 2 micrometres',glb.missing===0&&glb.finite&&glb.maxRoundTripError<2e-6,{maxError:glb.maxRoundTripError});
  check('rig instances are independent and dispose resources exactly once',glb.independent&&glb.disposeOnce,{resources:glb.resources});
 }
 for(const [pose,view,file] of [
  ['neutral','front','01-neutral-front'],['neutral','side','02-neutral-side'],['neutral','back','03-neutral-back'],
  ['head','quarter','04-head'],['arms','front','05-arms-front'],['arms','side','06-arms-side'],
  ['legs','side','07-leg-side'],['legs','front','08-leg-front'],['skirt','back','09-skirt-back'],['torso','quarter','10-torso'],
 ]){
  await page.locator(`[data-pose="${pose}"]`).click();await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(180);
  await page.screenshot({path:out+(draft?'draft-':'')+file+'.png'});
  if(!draft)check('static deformation preset '+pose+' / '+view,(await page.evaluate(()=>window.__marukoRig.inspect().pose))===pose);
 }
 await page.locator('[data-pose="neutral"]').click();await page.locator('#show-bones').check();await page.locator('[data-view="quarter"]').click();await page.waitForTimeout(180);await page.screenshot({path:out+(draft?'draft-':'')+'11-skeleton.png'});await page.locator('#show-bones').uncheck();
 if(!draft){
  const controls=await page.evaluate(()=>window.__marukoRig.inspect().camera),box=await page.locator('#world').boundingBox(),x=box.x+box.width*.55,y=box.height*.45;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y+25,{steps:10});await page.mouse.up();await page.waitForTimeout(200);
  check('real pointer orbit',JSON.stringify(controls.position)!==JSON.stringify(await page.evaluate(()=>window.__marukoRig.inspect().camera.position)));
  await page.mouse.wheel(0,-250);await page.waitForTimeout(180);check('real wheel zoom',(await page.evaluate(()=>window.__marukoRig.inspect().camera.zoom))>1);
  const target=await page.evaluate(()=>window.__marukoRig.inspect().camera.target);await page.mouse.down({button:'right'});await page.mouse.move(x+130,y+55,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(180);check('real right-button pan',JSON.stringify(target)!==JSON.stringify(await page.evaluate(()=>window.__marukoRig.inspect().camera.target)));
  await page.keyboard.press('Home');check('Home restores full body',(await page.evaluate(()=>window.__marukoRig.inspect().view))==='quarter');
  await page.locator('[data-pose="arms"]').click();await page.locator('#strength').fill('50');await page.locator('#strength').dispatchEvent('input');check('pose strength slider',(await page.evaluate(()=>window.__marukoRig.inspect().amount))===.5);
  await page.locator('#bone').selectOption('left_forearm');await page.locator('#rx').fill('-48');await page.locator('#rx').dispatchEvent('input');
  check('manual joint control uses actual bone rotation',await page.evaluate(()=>Math.abs(window.__marukoRig.actor.bones.left_forearm.rotation.x+48*Math.PI/180)<1e-8));
  await page.locator('#neutral').click();check('neutral reset clears every bone rotation',await page.evaluate(()=>Object.values(window.__marukoRig.actor.bones).every(b=>b.quaternion.angleTo(new b.quaternion.constructor())<1e-8)));
  report.renders=[];
  for(const [pose,view] of [['neutral','quarter'],['arms','front'],['legs','side'],['head','side-face']]){
   await page.evaluate(async({pose,view})=>{const h=window.__marukoRig;await h.setSource('editable');h.setPose(pose);h.setView(view);}, {pose,view});await page.waitForTimeout(180);
   const original=await page.locator('#world').screenshot();await writeFile(out+'12-'+pose+'-source.png',original);
   await page.locator('#source').click();await page.waitForFunction(()=>window.__marukoRig.inspect().source==='glb');await page.waitForTimeout(180);
   const loaded=await page.locator('#world').screenshot();await writeFile(out+'13-'+pose+'-glb.png',loaded);
   const difference=await page.evaluate(async({a,b})=>{
    const read=async src=>{const im=new Image();im.src='data:image/png;base64,'+src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);return x.getImageData(0,0,c.width,c.height).data;};
    const x=await read(a),y=await read(b);let changed=0,total=0;for(let i=0;i<x.length;i+=4){const d=Math.max(Math.abs(x[i]-y[i]),Math.abs(x[i+1]-y[i+1]),Math.abs(x[i+2]-y[i+2]));if(d>2)changed++;total+=d;}return {pixelDifferenceRatio:changed/(x.length/4),meanPixelDifference:total/(x.length/4)};
   },{a:original.toString('base64'),b:loaded.toString('base64')});
   report.renders.push({pose,exactPNGMatch:original.equals(loaded),...difference});
   check('source / actual GLB image agreement '+pose,difference.pixelDifferenceRatio<.0015&&difference.meanPixelDifference<.03,difference);
  }
  check('actual GLB button preserves current pose',report.renders.length===4&&(await page.evaluate(()=>window.__marukoRig.inspect().pose))==='head');
  // Screenshot equality is reported alongside the stricter 3D tolerance; browser skin arithmetic can vary by a pixel.
  await page.locator('#neutral').click();await page.locator('[data-view="quarter"]').click();await page.setViewportSize({width:900,height:900});await page.waitForTimeout(200);await page.screenshot({path:out+'14-small-preview.png'});
  check('narrow viewport retains full canvas',await page.locator('#world').evaluate(el=>el.width>200&&el.height>200));
  const baseline=JSON.parse((await readFile(out+'protected-before.json','utf8')).replace(/^\uFEFF/,'')),changes=[];
  for(const [file,sha] of Object.entries(baseline)){const actual=createHash('sha256').update(await readFile(path.join(project,file))).digest('hex');if(actual.toLowerCase()!==sha.toLowerCase())changes.push(file);}
  // This is a concurrent checkout. Record outside changes without rewriting them
  // or claiming another art window's work is a character regression.
  const concurrent=changes.filter(f=>f.startsWith('dist/town/assets/mitsuya/')||f==='docs/actions/2026-10-18-B-mitsuya.md'||f==='scripts/inspect-mitsuya.mjs'||f==='scripts/package-mitsuya.mjs');
  const unexpected=changes.filter(f=>!concurrent.includes(f));
  report.protected={count:Object.keys(baseline).length,changes,concurrent,unexpected,allOutsideFilesUnchanged:changes.length===0};check('no unexpected outside changes; concurrent Mitsuya work recorded',unexpected.length===0,report.protected);
 }
 check('no browser errors',report.errors.length===0,report.errors);report.passed=true;
 console.log(JSON.stringify({draft,passed:true,checks:report.checks.length,bind:report.bind,glb:report.glb,renders:report.renders,errors:report.errors}));
}catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}
finally{await writeFile(out+(draft?'draft-report.json':'inspection.json'),JSON.stringify(report,null,2));await browser.close();}
