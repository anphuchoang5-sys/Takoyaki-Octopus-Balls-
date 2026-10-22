import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const args=process.argv.slice(2),out=path.resolve('artifacts/buildings/flowerorangebuilding/ground-debug');
const label=args.find(v=>v.startsWith('--label='))?.slice(8)||'check';
const probe=args.find(v=>v.startsWith('--probe='))?.slice(8)||'none';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 const url=args.includes('--offline')?pathToFileURL(path.resolve('artifacts/buildings/flowerorangebuilding/花满橙瓦屋-三维预览.html')).href:'http://127.0.0.1:4184/town/assets/flowerorangebuilding/preview.html';
 await page.goto(url);await page.waitForFunction(()=>window.__flower?.ready);await page.evaluate(()=>window.__flower.clean());
 const result=await page.evaluate(async({probe,minimal})=>{
   const imports=JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports;
   const T=await import(imports.three?'three':'@flower/vendor/three.module.js'),a=window.__flower,site=a.asset.root.getObjectByName('地块与院内通道');
   const base=site.children.find(o=>o.isMesh&&o.material.color.getHexString()==='74856b');
   const grass=site.children.find(o=>o.isMesh&&o.material.color.getHexString()==='98ad77');
   const bounds=o=>new T.Box3().setFromObject(o);
   const ground={baseTop:bounds(base).max.y,grassTop:bounds(grass).max.y,grassBottom:bounds(grass).min.y};
   const protectedGroups={};
   for(const g of a.asset.root.children.filter(g=>g!==site)){
     const data=[];g.traverse(o=>{if(o.geometry)data.push({p:[...o.geometry.attributes.position.array],n:o.geometry.attributes.normal?[...o.geometry.attributes.normal.array]:null,c:o.material.color.getHexString(),m:o.matrixWorld.toArray()});});
     protectedGroups[g.name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)))),b=>b.toString(16).padStart(2,'0')).join('');
   }
   if(minimal){a.asset.root.children.forEach(g=>g.visible=g===site);site.children.forEach(o=>o.visible=o===base||o===grass);}
   if(probe==='no-shadow'){a.renderer.shadowMap.enabled=false;a.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});}
   if(probe==='hide-base')base.visible=false;
   if(probe==='clip'){a.camera.near=10;a.camera.far=60;a.camera.updateProjectionMatrix();}
   a.controls.enableDamping=false;a.setView('top');a.controls.target.set(0,0,0);
   const gl=a.renderer.getContext(),pixel=new Uint8Array(4),points=[];
   for(const z of [6.20,6.40,6.60])for(const x of [-5,-4,-3,-2,-1,0,1,2,3,4,5])points.push(new T.Vector3(x,.08001,z));
   const frames=[];
   for(let i=0;i<=16;i++){
     const angle=(-48+i*6)*Math.PI/180;
     a.camera.position.set(Math.sin(angle)*25,18,Math.cos(angle)*25);a.controls.update();a.renderer.render(a.scene,a.camera);
     const pixels=points.map(p=>{const n=p.clone().project(a.camera),x=Math.round((n.x+1)*.5*(gl.drawingBufferWidth-1)),y=Math.round((n.y+1)*.5*(gl.drawingBufferHeight-1));gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return [...pixel].slice(0,3);});
     frames.push({degrees:-48+i*6,pixels});
   }
   const ranges=points.map((p,i)=>({point:p.toArray(),range:Math.max(...[0,1,2].map(c=>Math.max(...frames.map(f=>f.pixels[i][c]))-Math.min(...frames.map(f=>f.pixels[i][c]))))}));
   return {ground,protectedGroups,frames,ranges,unstableSamples:ranges.filter(p=>p.range>10).length,maxRange:Math.max(...ranges.map(p=>p.range)),totalSamples:points.length,frameCount:frames.length};
 },{probe,minimal:args.includes('--minimal')});
 for(const [name,angle] of [['a',-30],['b',30]]){
   await page.evaluate(angle=>{const a=window.__flower;a.camera.position.set(Math.sin(angle*Math.PI/180)*25,18,Math.cos(angle*Math.PI/180)*25);a.controls.update();a.renderer.render(a.scene,a.camera);},angle);
   await page.screenshot({path:path.join(out,`${label}-${name}.png`)});
 }
 await writeFile(path.join(out,label+'.json'),JSON.stringify({...result,probe,errors},null,2));
 console.log(JSON.stringify({label,probe,ground:result.ground,unstableSamples:result.unstableSamples,maxRange:result.maxRange,totalSamples:result.totalSamples,frameCount:result.frameCount,errors}));
 if(args.includes('--compare')){
   const baseline=JSON.parse(await readFile(path.join(out,'before.json'),'utf8'));assert.deepEqual(result.protectedGroups,baseline.protectedGroups,'building, entry and plants unchanged');
 }
 assert.deepEqual(errors,[]);
 assert.equal(result.unstableSamples,0,'Same ground points changed color while orbiting: '+JSON.stringify(result.ranges.filter(p=>p.range>10)));
}finally{await browser.close();}
