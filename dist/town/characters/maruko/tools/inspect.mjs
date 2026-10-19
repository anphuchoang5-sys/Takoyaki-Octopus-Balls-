import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=fileURLToPath(new URL('../',import.meta.url)),project=path.resolve(base,'../../../..');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={passed:false,checks:[],errors:[],scope:'Independent static character only; no player save or editor runtime.'};
const check=(name,condition,data)=>{report.checks.push({name,passed:!!condition,...(data?{data}:{})});assert(condition,name);};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1040}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:4185/town/characters/maruko/preview.html');
 await page.waitForFunction(()=>window.__maruko?.ready);
 const bodyComparison=await page.evaluate(async()=>{
  const {createMaruko:previous}=await import('./evidence/before-side-06/model.js');
  const before=previous(),after=window.__maruko.createMaruko();
  const headNames=/^(hair ·|head ·)/;
  function body(root){const records=[];root.traverse(o=>{if(!o.isMesh||headNames.test(o.name))return;records.push({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),color:o.material.color.getHexString(),index:Array.from(o.geometry.index?.array||[]),attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)]))});});return records;}
  const a=body(before.root),b=body(after.root);
  const oldHead=before.root.getObjectByName('head · full skin volume').geometry.attributes.position,newHead=after.root.getObjectByName('head · full skin volume').geometry.attributes.position;
  let faceSamples=0,faceChanged=0;
  for(let i=0;i<oldHead.count-2;i++){if(oldHead.getZ(i)<0||oldHead.getY(i)>1.10)continue;faceSamples++;if(oldHead.getX(i)!==newHead.getX(i)||oldHead.getY(i)!==newHead.getY(i)||oldHead.getZ(i)!==newHead.getZ(i))faceChanged++;}
  const result={meshes:a.length,identical:JSON.stringify(a)===JSON.stringify(b),jointGuideIdentical:JSON.stringify(before.joints)===JSON.stringify(after.joints),faceSamples,faceChanged};before.dispose();after.dispose();return result;
 });
 check('facial marks, ears, body, clothing and joints unchanged from static-05',bodyComparison.identical&&bodyComparison.jointGuideIdentical,bodyComparison);
 check('visible front-face vertex positions unchanged from static-05',bodyComparison.faceSamples>0&&bodyComparison.faceChanged===0,bodyComparison);
 const headFit=await page.evaluate(async()=>{
  const T=await import('three'),root=window.__maruko.character.root;root.updateMatrixWorld(true);
  const skin=root.getObjectByName('head · full skin volume'),hair=root.getObjectByName('hair · continuous bob and zigzag fringe');
  const ray=new T.Raycaster(),gaps=[],rimGaps=[],origin=new T.Vector3(),dir=new T.Vector3();let missed=0;
  for(const y of [.805,.84,.9,1,1.10,1.17])for(const deg of [105,120,135,150,165,180,195,210,225,240,255]){
   const a=deg*Math.PI/180;dir.set(-Math.sin(a),0,-Math.cos(a));origin.set(-2*dir.x,y,skin.position.z-2*dir.z);ray.set(origin,dir);
   const scalp=ray.intersectObject(skin,false)[0],cap=ray.intersectObject(hair,false)[0];if(scalp&&cap)gaps.push(scalp.distance-cap.distance);else missed++;
  }
  const p=hair.geometry.attributes.position;
  for(let i=1;i<(p.count-2)/2;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(z>=-.06||Math.abs(y-(.795+.09*z))>2e-6)continue;
   const radial=new T.Vector3(x,0,z).normalize();origin.set(x,y,z).add(hair.position).addScaledVector(radial,1);ray.set(origin,radial.clone().negate());
   const scalp=ray.intersectObject(skin,false)[0];if(scalp)rimGaps.push(scalp.distance-1);else missed++;
  }
  return {samples:gaps.length,rimSamples:rimGaps.length,missed,min:Math.min(...gaps),max:Math.max(...gaps),rimMin:Math.min(...rimGaps),rimMax:Math.max(...rimGaps)};
 });
 report.headFit=headFit;
 check('posterior hair and hem supported by full head within 25 mm',headFit.missed===0&&headFit.samples===66&&headFit.rimSamples>50&&headFit.min>0&&headFit.max<.025&&headFit.rimMin>0&&headFit.rimMax<.025,headFit);
 const mouthSurface=await page.evaluate(async()=>{
  const T=await import('three'),root=window.__maruko.character.root;
  root.updateMatrixWorld(true);const head=root.getObjectByName('head · full skin volume');
  const ray=new T.Raycaster(),p=new T.Vector3(),samples=[];
  for(const name of ['open smile','open smile fill']){
   const mesh=root.getObjectByName(name),positions=mesh.geometry.attributes.position;
   for(let i=0;i<positions.count;i+=17){
    p.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
    ray.set(new T.Vector3(p.x,p.y,2),new T.Vector3(0,0,-1));
    const hit=ray.intersectObject(head,false)[0];
    samples.push(hit?p.z-hit.point.z:null);
   }
  }
  return {sampleCount:samples.length,allSupported:samples.every(n=>n!==null),minOffset:Math.min(...samples.filter(n=>n!==null)),maxOffset:Math.max(...samples.filter(n=>n!==null))};
 });
 check('mouth colour meshes lie on skin within 1 mm',mouthSurface.allSupported&&mouthSurface.minOffset>=0&&mouthSurface.maxOffset<.001,mouthSurface);
 const exporter=await readFile(path.join(project,'node_modules/three/examples/jsm/exporters/GLTFExporter.js'),'utf8');
 const exported=await page.evaluate(async code=>{
   const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const {GLTFExporter}=await import(url);URL.revokeObjectURL(url);
   const T=await import('three'),{GLTFLoader}=await import('./tools/GLTFLoader.js');
   const source=window.__maruko.createMaruko(),binary=await new GLTFExporter().parseAsync(source.root,{binary:true,onlyVisible:true});
   const parsed=await new GLTFLoader().parseAsync(binary,'');
   function inspect(root){let meshes=0,vertices=0,triangles=0,nonfinite=0,degenerate=0,outlines=0,unlit=0;const palette=new Set(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    root.traverse(o=>{if(!o.isMesh)return;meshes++;if(o.userData.outline)outlines++;if(o.material.isMeshBasicMaterial)unlit++;palette.add(o.material.color.getHexString());const p=o.geometry.attributes.position,ix=o.geometry.index,n=ix?.count||p.count;vertices+=p.count;triangles+=n/3;for(const v of p.array)if(!Number.isFinite(v))nonfinite++;for(let j=0;j<n;j+=3){a.fromBufferAttribute(p,ix?ix.getX(j):j);b.fromBufferAttribute(p,ix?ix.getX(j+1):j+1);c.fromBufferAttribute(p,ix?ix.getX(j+2):j+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-20)degenerate++;}});
    const bounds=new T.Box3().setFromObject(root);return {meshes,vertices,triangles,nonfinite,degenerate,outlines,unlit,palette:[...palette].sort(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:bounds.getSize(new T.Vector3()).toArray()}};
   }
   const original=inspect(source.root),roundTrip=inspect(parsed.scene),animations=parsed.animations.length;
   const counts=new Map();source.root.traverse(o=>{if(o.isMesh){counts.set(o.geometry,0);counts.set(o.material,0);}});for(const r of counts.keys())r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));source.dispose();source.dispose();
   let data='';const bytes=new Uint8Array(binary);for(let i=0;i<bytes.length;i+=32768)data+=String.fromCharCode(...bytes.subarray(i,i+32768));
   parsed.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
   return {base64:btoa(data),bytes:bytes.length,original,roundTrip,animations,disposeOnce:[...counts.values()].every(n=>n===1),resources:counts.size};
 },exporter);
 const {base64,...glb}=exported;await writeFile(base+'maruko.glb',Buffer.from(base64,'base64'));report.glb=glb;
 check('finite, nondegenerate original geometry',glb.original.nonfinite===0&&glb.original.degenerate===0);
 check('GLB geometry, unlit palette, outlines and bounds round trip',JSON.stringify(glb.original)===JSON.stringify(glb.roundTrip));
 check('soles at floor and nominal 1.24 m height',Math.abs(glb.original.bounds.min[1])<1e-6&&Math.abs(glb.original.bounds.max[1]-1.24)<.001);
 check('no animation and independent idempotent disposal',glb.animations===0&&glb.disposeOnce);
 const box=await page.locator('#world').boundingBox(),point={x:box.x+box.width*.55,y:box.y+box.height*.45};
 const before=await page.evaluate(()=>window.__maruko.inspect().camera);
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+110,point.y+35,{steps:12});await page.mouse.up();await page.waitForTimeout(250);
 const orbit=await page.evaluate(()=>window.__maruko.inspect().camera);
 check('real pointer orbit',JSON.stringify(orbit.position)!==JSON.stringify(before.position));
 await page.mouse.wheel(0,-350);await page.waitForTimeout(250);
 check('real wheel zoom',(await page.evaluate(()=>window.__maruko.inspect().camera.zoom))>orbit.zoom);
 const target=await page.evaluate(()=>window.__maruko.inspect().camera.target);
 await page.mouse.down({button:'right'});await page.mouse.move(point.x+170,point.y+70,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);
 check('real right-button pan',JSON.stringify(target)!==JSON.stringify(await page.evaluate(()=>window.__maruko.inspect().camera.target)));
 await page.keyboard.press('Home');check('Home restores full body',(await page.evaluate(()=>window.__maruko.inspect().view))==='quarter');
 for(const [view,file] of [['front','01-front'],['quarter','02-quarter'],['side','03-side'],['left-side','14-left-side'],['back','04-back'],['face','05-face'],['side-face','15-side-face']]){
  await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(200);
  check('view button '+view,(await page.evaluate(()=>window.__maruko.inspect().view))===view);
  await page.screenshot({path:base+'evidence/'+file+'.png'});
 }
 await page.evaluate(()=>{const h=window.__maruko;h.setView('back');h.camera.position.set(3,.975,-6);h.controls.update();});
 await page.waitForTimeout(200);await page.screenshot({path:base+'evidence/20-rear-quarter.png'});
 await page.locator('#reference').click();for(let i=0;i<5;i++){await page.locator(`[data-reference="${i}"]`).click();await page.waitForFunction(()=>{const i=document.querySelector('#reference-image');return i.complete&&i.naturalWidth>0;});}await page.locator('#reference').click();check('five reference images load including user side screenshot',true);
 await page.locator('[data-view="quarter"]').click();await page.waitForTimeout(300);
 const sourcePNG=await page.locator('#world').screenshot();await writeFile(base+'evidence/06-source-canvas.png',sourcePNG);
 await page.locator('#model-source').click();await page.waitForFunction(()=>window.__maruko.inspect().source==='glb');await page.waitForTimeout(300);
 const glbPNG=await page.locator('#world').screenshot();await writeFile(base+'evidence/07-glb-canvas.png',glbPNG);
 // PNG bytes include the same canvas only, with identical camera, ground and shadows.
 report.renderComparison={exactPNGMatch:sourcePNG.equals(glbPNG),sourceBytes:sourcePNG.length,glbBytes:glbPNG.length};
 check('source and GLB quarter-view pixels identical',report.renderComparison.exactPNGMatch,report.renderComparison);
 check('GLB button opens actual exported file',(await page.evaluate(()=>window.__maruko.inspect().source))==='glb');
 await page.locator('#model-source').click();await page.waitForFunction(()=>window.__maruko.inspect().source==='editable');
 await page.locator('[data-view="side-face"]').click();await page.waitForTimeout(250);
 const sourceSide=await page.locator('#world').screenshot();await writeFile(base+'evidence/16-side-source-canvas.png',sourceSide);
 await page.locator('#model-source').click();await page.waitForFunction(()=>window.__maruko.inspect().source==='glb');await page.waitForTimeout(250);
 const glbSide=await page.locator('#world').screenshot();await writeFile(base+'evidence/17-side-glb-canvas.png',glbSide);
 report.sideRenderComparison={exactPNGMatch:sourceSide.equals(glbSide),sourceBytes:sourceSide.length,glbBytes:glbSide.length};
 check('source and GLB side-face pixels identical',report.sideRenderComparison.exactPNGMatch,report.sideRenderComparison);
 await page.locator('#model-source').click();await page.waitForFunction(()=>window.__maruko.inspect().source==='editable');
 await page.evaluate(()=>{const h=window.__maruko;h.setView('side-face');h.camera.position.set(0,.956,-6);h.controls.update();});
 await page.waitForTimeout(250);
 const sourceBack=await page.locator('#world').screenshot();await writeFile(base+'evidence/22-back-source-canvas.png',sourceBack);
 await page.locator('#model-source').click();await page.waitForFunction(()=>window.__maruko.inspect().source==='glb');await page.waitForTimeout(250);
 const glbBack=await page.locator('#world').screenshot();await writeFile(base+'evidence/23-back-glb-canvas.png',glbBack);
 report.backRenderComparison={exactPNGMatch:sourceBack.equals(glbBack),sourceBytes:sourceBack.length,glbBytes:glbBack.length};
 check('source and GLB back close-up pixels identical',report.backRenderComparison.exactPNGMatch,report.backRenderComparison);
 await page.locator('#model-source').click();await page.waitForFunction(()=>window.__maruko.inspect().source==='editable');
 report.comparisons=[];
 for(const [mode,file] of [['house','08-house-scale'],['store','09-store-scale'],['interior','10-interior-scale']]){
  await page.locator(`[data-scene="${mode}"]`).click();await page.waitForTimeout(500);
  const state=await page.evaluate(()=>window.__maruko.inspect());check('comparison scene '+mode,state.scene===mode&&state.scale.every(s=>s===1));
  const supports=await page.evaluate(async()=>{const T=await import('three'),h=window.__maruko,s=h.inspect(),objects=[];h.assets[s.scene].root.updateMatrixWorld(true);h.assets[s.scene].root.traverse(o=>{if(o.isMesh&&!o.userData.outline)objects.push(o);});const ray=new T.Raycaster(),out=[];for(const x of [-.065,.065])for(const z of [-.04,.04]){ray.set(new T.Vector3(x,s.placement[1]+.3,z),new T.Vector3(0,-1,0));ray.far=1;const hits=ray.intersectObjects(objects,false);out.push({x,z,y:hits[0]?.point.y??null,footY:s.placement[1],delta:hits[0]?s.placement[1]-hits[0].point.y:null});}return out;});
  state.supports=supports;check('actual sole support '+mode,supports.every(p=>p.delta!==null&&Math.abs(p.delta)<.005),supports);
  await page.screenshot({path:base+'evidence/'+file+'.png'});
  await page.locator('#scene-wide').click();await page.waitForTimeout(200);await page.screenshot({path:base+'evidence/'+file+'-wide.png'});
  report.comparisons.push(state);
 }
 await page.locator('#cut-walls').check();await page.locator('#cut-walls').uncheck();check('interior inspection wall toggle',true);
 await page.locator('[data-scene="studio"]').click();await page.locator('#reset').click();await page.waitForTimeout(200);
 await page.screenshot({path:base+'evidence/11-viewer.png'});
 await page.setViewportSize({width:900,height:900});await page.waitForTimeout(200);await page.screenshot({path:base+'evidence/12-small-viewer.png'});
  await page.locator('[data-view="face"]').click();await page.waitForTimeout(200);check('narrow viewport keeps full face width',await page.evaluate(()=>{const c=window.__maruko.camera;return c.right-c.left>=.739;}));await page.screenshot({path:base+'evidence/13-small-face.png'});
 check('no browser errors',report.errors.length===0,report.errors);
 const baseline=JSON.parse((await readFile(base+'evidence/protected-before.json','utf8')).replace(/^\uFEFF/,'')),changes=[];
 for(const [file,sha] of Object.entries(baseline)){const actual=createHash('sha256').update(await readFile(path.join(project,file))).digest('hex');if(actual.toLowerCase()!==sha.toLowerCase())changes.push(file);}
 report.protected={count:Object.keys(baseline).length,changes};check('pre-existing tracked files unchanged',changes.length===0,changes);
 report.passed=true;console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,glb,renderComparison:report.renderComparison,protected:report.protected}));
}catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}
finally{await writeFile(base+'evidence/inspection.json',JSON.stringify(report,null,2));await browser.close();}
