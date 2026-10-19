import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const base=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1040}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4185/town/characters/maruko/preview.html?view=side-face');
 await page.waitForFunction(()=>window.__maruko?.ready);
 for(const view of ['side-face','back','front','quarter']){
  await page.evaluate(v=>window.__maruko.setView(v),view);await page.waitForTimeout(180);
  await page.screenshot({path:base+'evidence/draft-'+view+'.png'});
 }
 const fit=await page.evaluate(async()=>{
  const T=await import('three'),h=window.__maruko,root=h.character.root;
  root.updateMatrixWorld(true);
  const skin=root.getObjectByName('head · full skin volume'),hair=root.getObjectByName('hair · continuous bob and zigzag fringe');
  const ray=new T.Raycaster(),samples=[],origin=new T.Vector3(),dir=new T.Vector3();
  for(const y of [.805,.84,.9,1,1.10,1.17])for(const deg of [105,120,135,150,165,180,195,210,225,240,255]){
   const a=deg*Math.PI/180;dir.set(-Math.sin(a),0,-Math.cos(a));origin.set(-2*dir.x,y,skin.position.z-2*dir.z);ray.set(origin,dir);
   const scalp=ray.intersectObject(skin,false)[0],cap=ray.intersectObject(hair,false)[0];
   samples.push({y,deg,gap:scalp&&cap?scalp.distance-cap.distance:null});
  }
  const p=hair.geometry.attributes.position;
  const rim=[];
  // Outer surface occupies the first half of the closed hair shell.
  for(let i=1;i<(p.count-2)/2;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   if(z>=-.06||Math.abs(y-(.795+.09*z))>2e-6)continue;
   const radial=new T.Vector3(x,0,z).normalize();origin.set(x,y,z).add(hair.position).addScaledVector(radial,1);
   ray.set(origin,radial.clone().negate());const scalp=ray.intersectObject(skin,false)[0];
   rim.push({x,y,z,gap:scalp?scalp.distance-1:null});
  }
  const values=samples.map(s=>s.gap).filter(v=>v!==null),rimValues=rim.map(s=>s.gap).filter(v=>v!==null);
  return {samples,rim,allSupported:values.length===samples.length&&rimValues.length===rim.length,min:Math.min(...values),max:Math.max(...values),rimMin:Math.min(...rimValues),rimMax:Math.max(...rimValues)};
 });
 // Diagnostic evidence: real skin volume with the cap hidden, not an alternative model.
 await page.evaluate(()=>{const h=window.__maruko;h.setView('side-face');h.character.root.traverse(o=>{if(/^hair ·/.test(o.name))o.visible=false;});});
 await page.waitForTimeout(180);await page.locator('#world').screenshot({path:base+'evidence/26-head-under-hair-side.png'});
 await page.evaluate(()=>{const h=window.__maruko;h.camera.position.set(3,.956,-6);h.controls.update();});
 await page.waitForTimeout(180);await page.locator('#world').screenshot({path:base+'evidence/27-head-under-hair-rear.png'});
 await writeFile(base+'evidence/head-fit.json',JSON.stringify({fit,errors},null,2));
 console.log(JSON.stringify({errors,samples:fit.samples.length,rim:fit.rim.length,allSupported:fit.allSupported,min:fit.min,max:fit.max,rimMin:fit.rimMin,rimMax:fit.rimMax}));
}finally{await browser.close();}
