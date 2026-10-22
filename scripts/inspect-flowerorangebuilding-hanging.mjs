import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const args=process.argv.slice(2),label=args.find(a=>a.startsWith('--label='))?.slice(8)||'check';
const out=path.resolve('artifacts/buildings/flowerorangebuilding/hanging-debug');await mkdir(out,{recursive:true});
const offline=args.includes('--offline'),url=offline?pathToFileURL(path.resolve('artifacts/buildings/flowerorangebuilding/花满橙瓦屋-三维预览.html')).href:'http://127.0.0.1:4184/town/assets/flowerorangebuilding/preview.html';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.__flower?.ready);await page.evaluate(()=>window.__flower.clean());
 const result=await page.evaluate(async({offline})=>{
   const prefix=offline?'@flower/town/assets/flowerorangebuilding/':'/town/assets/flowerorangebuilding/';
   const {createWorkshop}=await import(prefix+'geometry.js'),{createGarden}=await import(prefix+'garden.js');
   const W=createWorkshop(),{THREE:T}=W,parent=W.group('garden-inspect'),garden=createGarden(W,parent);garden.build();W.root.updateMatrixWorld(true);
   const names=['阳台挂盆1','阳台挂盆2','阳台挂盆3','木门上的紫花挂盆'];
   const protectedGroups={};
   async function hash(g){const data=[];g.traverse(o=>{if(o.geometry)data.push({type:o.type,p:[...o.geometry.attributes.position.array],n:o.geometry.attributes.normal?[...o.geometry.attributes.normal.array]:null,c:o.material.color.getHexString(),m:o.matrixWorld.toArray()});});return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data)))),b=>b.toString(16).padStart(2,'0')).join('');}
   for(const g of parent.children.filter(g=>g.name&&!names.includes(g.name)))protectedGroups['garden/'+g.name]=await hash(g);
   for(const g of window.__flower.asset.root.children.filter(g=>g.name!=='庭院花木'))protectedGroups['asset/'+g.name]=await hash(g);
   const pots=[];
   for(const name of names){
     const group=parent.getObjectByName(name),pot=group.children.find(o=>o.geometry?.type==='LatheGeometry'),b=new T.Box3().setFromObject(pot),center=new T.Vector3((b.min.x+b.max.x)/2,0,(b.min.z+b.max.z)/2),r=(b.max.x-b.min.x)/2;
     const side=pot.material.side;pot.material.side=T.DoubleSide;
     const ray=new T.Raycaster(),point=new T.Vector3(),radial=new T.Vector3(),origin=new T.Vector3();
     let hits=0,checked=0;const collisions={},examples=[];
     function sample(p,type){
       if(p.y<=b.min.y+.003||p.y>=b.max.y-.002)return;
       radial.set(p.x-center.x,0,p.z-center.z);const length=radial.length();if(length>r+.03||length<.0001)return;radial.normalize();
       origin.set(center.x,p.y,center.z).addScaledVector(radial,r+.10);ray.set(origin,radial.clone().negate());ray.far=origin.distanceTo(p)-.0005;
       const distances=ray.intersectObject(pot,false).map(h=>h.distance).filter((v,i,a)=>!i||Math.abs(v-a[i-1])>.0005);checked++;
       if(distances.length%2){hits++;collisions[type]=(collisions[type]||0)+1;if(examples.length<6)examples.push(p.toArray());}
     }
     group.traverse(o=>{if(!o.isMesh||!['3c8549','6caa52','85b75c'].includes(o.material.color.getHexString()))return;
       const p=o.geometry.attributes.position,index=o.geometry.index;
       for(let i=0;i<p.count;i++)sample(point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld),o.geometry.type);
       for(let i=0;i<(index?.count||p.count);i+=3){point.set(0,0,0);for(let j=0;j<3;j++)point.add(new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j));point.multiplyScalar(1/3).applyMatrix4(o.matrixWorld);sample(point,o.geometry.type);}
     });
     const ceramics=group.children.filter(o=>o.isMesh&&o.material.color.getHexString()==='ad7656');
     ray.set(new T.Vector3(center.x,b.min.y-.10,center.z),new T.Vector3(0,1,0));ray.far=1;
     const bottom=ray.intersectObjects(ceramics,false)[0]?.point.y??null;
     pot.material.side=side;pots.push({name,checked,hits,collisions,examples,bottomGap:bottom===null?null:Math.abs(bottom-b.min.y)});
   }
   W.dispose();return {revision:window.__flower.asset.specification.revision,protectedGroups,pots,totalHits:pots.reduce((sum,p)=>sum+p.hits,0)};
 },{offline});
 const views={balcony:{p:[7.2,6.1,13],t:[2.46,3.55,2.1],height:2.4},gate:{p:[2.0,2.9,13],t:[-.37,1.83,4.7],height:1.65},'balcony-under':{p:[6,2.3,11],t:[2.46,3.5,2.1],height:2.4},'gate-side':{p:[3.8,2.1,7.5],t:[-.37,1.78,4.7],height:1.6},'gate-left':{p:[-3.5,2.05,8],t:[-.37,1.78,4.78],height:1.6}};
 for(const [name,v] of Object.entries(views)){
   await page.evaluate(v=>{const a=window.__flower;a.setView('balcony');a.controls.minPolarAngle=0;a.controls.maxPolarAngle=Math.PI;a.controls.enableDamping=false;a.camera.position.fromArray(v.p);a.controls.target.fromArray(v.t);a.camera.zoom=3.6/v.height;a.controls.update();a.camera.updateProjectionMatrix();a.renderer.render(a.scene,a.camera);},v);await page.waitForTimeout(120);
   await page.screenshot({path:path.join(out,`${label}-${name}.png`)});
 }
 await writeFile(path.join(out,label+'.json'),JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({label,revision:result.revision,pots:result.pots,totalHits:result.totalHits,errors}));
 if(args.includes('--compare'))assert.deepEqual(result.protectedGroups,JSON.parse(await readFile(path.join(out,'before.json'),'utf8')).protectedGroups,'unrelated buildings and plants unchanged');
 assert.deepEqual(errors,[]);assert.equal(result.totalHits,0,'green branches/leaves penetrate actual pot wall');
 assert(result.pots.every(p=>p.bottomGap!==null&&p.bottomGap<.001),'hanging pots need solid bottoms');
 if(args.includes('--comparison')){
   const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>挂盆修复前后对照</title><style>body{margin:0;background:#edf0e6;color:#45543f;font:15px/1.7 'Microsoft YaHei',sans-serif}main{max-width:1480px;margin:auto;padding:28px}h1{font-size:28px;font-weight:500}h2{font-size:20px;font-weight:500}a{color:#536f44}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}figure{margin:0;background:#f8faf2;border-radius:8px;overflow:hidden}img{display:block;width:100%}figcaption{padding:10px 14px}</style><main><h1>阳台与院门挂盆 · 修复前后</h1><p>枝条从盆内跨过盆沿，在盆外下垂；叶片沿枝条连接，盆底补为实体。花盆位置、大小、配色和建筑保持。</p><p><a href="花满橙瓦屋-三维预览.html">打开可旋转缩放预览</a> · <a href="原图与模型对照.html">返回整栋建筑对照</a></p>${[['balcony','阳台挂盆'],['gate','院门挂盆']].map(([id,title])=>`<h2>${title}</h2><div class="pair" id="${id}"><figure><img src="hanging-debug/before-${id}.png"><figcaption>修改前 · 下垂枝叶从盆壁中穿出</figcaption></figure><figure><img src="hanging-debug/after-${id}.png"><figcaption>修改后 · 枝条跨过盆沿，叶片留在盆外</figcaption></figure></div>`).join('')}<h2>下方与侧面检查</h2><div class="pair"><figure><img src="hanging-debug/after-balcony-under.png"><figcaption>阳台仰视 · 实体盆底</figcaption></figure><figure><img src="hanging-debug/after-gate-left.png"><figcaption>院门斜侧 · 枝叶与盆壁间隙</figcaption></figure></div></main></html>`;
   const target=path.join(out,'..','挂盆修复对照.html');await writeFile(target,html);await page.goto(pathToFileURL(target).href);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   for(const id of ['balcony','gate'])await page.locator('#'+id).screenshot({path:path.join(out,id+'-before-after.png')});
 }
}finally{await browser.close();}
