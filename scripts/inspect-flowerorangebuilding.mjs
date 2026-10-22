import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const out=path.resolve('artifacts/buildings/flowerorangebuilding'),folder='town/assets/flowerorangebuilding';
const deliver=process.argv.includes('--deliver'),captureOnly=process.argv.includes('--capture');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],warnings=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
 await page.goto('http://127.0.0.1:4184/'+folder+'/preview.html');
 await page.waitForFunction(()=>window.__flower?.ready,{timeout:30000});
 await page.waitForTimeout(350);
 const initial=await page.evaluate(()=>window.__flower.inspect());
 const revision=await page.evaluate(()=>window.__flower.asset.specification.revision);
 await page.screenshot({path:path.join(out,'00-interactive.png')});
 await page.evaluate(()=>window.__flower.clean());
 for(const view of ['reference','hero','left','right','back','top','roof','gate','balcony']){
   await page.evaluate(view=>window.__flower.setView(view),view);await page.waitForTimeout(180);await page.screenshot({path:path.join(out,view+'.png')});
 }
 const geometry=await page.evaluate(async()=>{
   const T=await import('three'),root=window.__flower.asset.root;root.updateMatrixWorld(true);
   let nonfinite=0,degenerate=0,triangles=0;const bad=[],meshes=[];
   root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,i=o.geometry.index;for(const v of p.array)if(!Number.isFinite(v))nonfinite++;
     let count=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
     for(let k=0;k<(i?.count||p.count);k+=3){a.fromBufferAttribute(p,i?i.getX(k):k);b.fromBufferAttribute(p,i?i.getX(k+1):k+1);c.fromBufferAttribute(p,i?i.getX(k+2):k+2);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-16)count++;triangles++;}
     degenerate+=count;if(count)bad.push({parent:o.parent.name,count});meshes.push({parent:o.parent.name,vertices:p.count});
   });
   const rotations=[];for(const degrees of [0,90,180,270]){root.rotation.y=degrees*Math.PI/180;root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(root);rotations.push({degrees,min:b.min.toArray(),max:b.max.toArray()});}
   root.rotation.y=0;root.updateMatrixWorld(true);
   const lights=[];root.traverse(o=>{if(o.isLight)lights.push(o.type);});
   const ray=new T.Raycaster(),contacts=[],recesses=[],seams=[],supportGroups=root.children.filter(g=>g.name!=='庭院花木');
   for(const p of root.userData.design.potSupports.filter(p=>['wall','step','ground'].includes(p.support))){ray.set(new T.Vector3(p.x,p.base+.005,p.z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(supportGroups,true).find(i=>i.object.isMesh);contacts.push({name:p.name,expected:p.base,actual:hit?.point.y??null,error:hit?Math.abs(hit.point.y-p.base):null});}
   for(const p of root.userData.design.windows.filter(p=>!p.name.startsWith('背面'))){ray.set(new T.Vector3(p.center[0]+p.width*.23,p.center[1]+p.height*.1,p.center[2]+.25),new T.Vector3(0,0,-1));const hit=ray.intersectObjects(supportGroups,true).find(i=>i.object.isMesh);recesses.push({name:p.name,depth:hit?p.center[2]-hit.point.z:null});}
   const roof=root.getObjectByName('橙瓦组合屋面');
   for(const x of [-4.5,-4,-3.15,-2.2,-1.7])for(const z of [1.4,2.3,2.9]){const main=3.92-(z+.4)*1.37/3.15,dormer=3.35-.8*Math.abs(x+3.15)/1.62,expected=z>2.75?dormer:Math.max(main,dormer);ray.set(new T.Vector3(x,8,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(roof,true).find(i=>i.object.isMesh);seams.push({x,z,expected,actual:hit?.point.y??null,error:hit?Math.abs(hit.point.y-expected):null});}
   return {nonfinite,degenerate,triangles,bad,meshCount:meshes.length,rotations,lights,contacts,recesses,seams,design:root.userData.design};
 });
 await writeFile(path.join(out,'geometry.json'),JSON.stringify(geometry,null,2));
 console.log(JSON.stringify({initial:{...initial,bounds:undefined},geometry:{...geometry,design:undefined},errors,warnings}));
 if(captureOnly)process.exitCode=0;
 else{
   assert.equal(geometry.nonfinite,0);assert.equal(geometry.degenerate,0);assert.equal(geometry.lights.length,0);
   for(const b of geometry.rotations)for(const axis of [0,2]){assert(b.min[axis]>=-7.0001,'plot minimum '+JSON.stringify(b));assert(b.max[axis]<=7.0001,'plot maximum '+JSON.stringify(b));}
   assert(geometry.contacts.every(p=>p.error!==null&&p.error<.003),'pot supports '+JSON.stringify(geometry.contacts));
   assert(geometry.recesses.every(p=>p.depth>.045&&p.depth<.11),'window recess '+JSON.stringify(geometry.recesses));
   assert(geometry.seams.every(p=>p.error!==null&&p.error<.09),'roof valley '+JSON.stringify(geometry.seams));
   const lifecycle=await page.evaluate(()=>{
     const a=window.__flower.createModel(),b=window.__flower.createModel(),owned=new Set(),neighbor=new Set(),events=new Map();
     const collect=(asset,set)=>asset.root.traverse(o=>{if(o.geometry)set.add(o.geometry);if(o.material)set.add(o.material);});collect(a,owned);collect(b,neighbor);
     for(const resource of [...owned,...neighbor]){events.set(resource,0);resource.addEventListener('dispose',()=>events.set(resource,events.get(resource)+1));}
     a.setEnvironment({time:'night',weather:'snow',snowAmount:.6});const preserved=a.getEnvironment();let rejected=false;try{a.setEnvironment({time:'bad',weather:'rain'});}catch{rejected=true;}
     const atomic=JSON.stringify(preserved)===JSON.stringify(a.getEnvironment()),isolated=b.getEnvironment().time==='afternoon'&&b.getEnvironment().snowAmount===0;
     a.dispose();a.dispose();const result={owned:owned.size,allDisposedOnce:[...owned].every(g=>events.get(g)===1),neighborIntact:[...neighbor].every(g=>events.get(g)===0),rejected,atomic,isolated,emptyLights:a.getLightingDescriptors().length===0};b.dispose();return result;
   });
   assert(lifecycle.allDisposedOnce&&lifecycle.neighborIntact&&lifecycle.rejected&&lifecycle.atomic&&lifecycle.isolated);
   await page.evaluate(()=>{window.__flower.clean(false);window.__flower.setView('hero');});
   const before=await page.evaluate(()=>window.__flower.inspect().camera);
   await page.mouse.move(800,540);await page.mouse.down();await page.mouse.move(970,590,{steps:12});await page.mouse.up();await page.waitForTimeout(300);
   const orbited=await page.evaluate(()=>window.__flower.inspect().camera);assert.notDeepEqual(orbited.position,before.position);
   await page.mouse.wheel(0,-320);await page.waitForTimeout(300);const zoomed=await page.evaluate(()=>window.__flower.inspect().camera);assert(zoomed.zoom>orbited.zoom);
   await page.mouse.down({button:'right'});await page.mouse.move(900,530,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);assert.notDeepEqual((await page.evaluate(()=>window.__flower.inspect().camera)).target,zoomed.target);
   await page.locator('#reset').click();assert.equal((await page.evaluate(()=>window.__flower.inspect())).view,'hero');
   await page.locator('#reference-toggle').click();await page.waitForFunction(()=>document.querySelector('#reference-image').complete&&document.querySelector('#reference-image').naturalWidth>0);await page.screenshot({path:path.join(out,'comparison-interactive.png')});await page.locator('#reference-close').click();
   await page.locator('#plants-toggle').click();assert.equal(await page.evaluate(()=>window.__flower.asset.root.getObjectByName('庭院花木').visible),false);await page.locator('#plants-toggle').click();
   for(const view of ['gate','balcony','back','reference']){await page.locator(`[data-view="${view}"]`).click();assert.equal((await page.evaluate(()=>window.__flower.inspect())).view,view);}
   const interaction={orbit:true,zoom:true,pan:true,reset:true,reference:true,plantsVisibility:true,viewButtons:true};
   let delivery=null;
   if(deliver){
     const exporter=await readFile('node_modules/three/examples/jsm/exporters/GLTFExporter.js','utf8'),loader=(await readFile('node_modules/three/examples/jsm/loaders/GLTFLoader.js','utf8')).replace('../utils/BufferGeometryUtils.js','three/addons/utils/BufferGeometryUtils.js');
     const result=await page.evaluate(async({exporter,loader})=>{
       async function module(code){const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{return await import(url);}finally{URL.revokeObjectURL(url);}}
       const T=await import('three'),{GLTFExporter}=await module(exporter),{GLTFLoader}=await module(loader),asset=window.__flower.createModel();
       const data=await new GLTFExporter().parseAsync(asset.root,{binary:true}),parsed=await new GLTFLoader().parseAsync(data,''),a=new T.Box3().setFromObject(asset.root),b=new T.Box3().setFromObject(parsed.scene);let meshes=0;parsed.scene.traverse(o=>{if(o.isMesh)meshes++;});
       const bytes=new Uint8Array(data);let bin='';for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode(...bytes.subarray(i,i+32768));
       asset.dispose();const resources=new Set();parsed.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());
       return {base64:btoa(bin),bytes:bytes.length,meshes,sourceBounds:[a.min.toArray(),a.max.toArray()],roundtripBounds:[b.min.toArray(),b.max.toArray()]};
     },{exporter,loader});
     result.sourceBounds.flat().forEach((v,i)=>assert(Math.abs(v-result.roundtripBounds.flat()[i])<1e-5));
     await writeFile('dist/'+folder+'/flowerorangebuilding.glb',Buffer.from(result.base64,'base64'));
     const imports={},visited=new Set();
     function resolve(spec,from){if(spec==='three')return 'vendor/three.module.js';if(spec.startsWith('three/addons/'))return 'vendor/addons/'+spec.slice(13);if(spec.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));throw new Error('Unsupported '+spec);}
     async function bundle(file){if(visited.has(file))return;visited.add(file);const deps=[],source=await readFile('dist/'+file,'utf8');const rewritten=source.replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g,(_,prefix,q,spec)=>{const dep=resolve(spec,file);deps.push(dep);return `${prefix}${q}@flower/${dep}${q}`;});imports['@flower/'+file]='data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64');for(const dep of deps)await bundle(dep);}
     await bundle(folder+'/preview.js');const ref='data:image/jpeg;base64,'+(await readFile('dist/'+folder+'/references/user-exterior.jpg')).toString('base64');
     let html=await readFile('dist/'+folder+'/preview.html','utf8');html=html.replace('<style id="viewer-style"></style>','<style id="viewer-style">'+await readFile('dist/'+folder+'/preview.css','utf8')+'</style>').replace(/<script type="importmap">[\s\S]*?<\/script>/,`<script>globalThis.__flowerReference=${JSON.stringify(ref)}</script><script type="importmap">${JSON.stringify({imports})}</script>`).replace('src="./references/user-exterior.jpg"','src="'+ref+'"').replace('<script type="module" src="./preview.js"></script>',`<script type="module">import '@flower/${folder}/preview.js';</script>`);
     const offline=path.join(out,'花满橙瓦屋-三维预览.html');await writeFile(offline,html);
     const requests=[];await page.route(/^https?:\/\//,route=>{requests.push(route.request().url());return route.abort();});await page.goto(pathToFileURL(offline).href);await page.waitForFunction(()=>window.__flower?.ready);
     await page.locator('[data-view="gate"]').click();assert.equal((await page.evaluate(()=>window.__flower.inspect())).view,'gate');await page.locator('#reference-toggle').click();await page.waitForFunction(()=>document.querySelector('#reference-image').naturalWidth>0);await page.locator('#reference-close').click();await page.locator('#reset').click();
     const start=await page.evaluate(()=>window.__flower.inspect().camera);await page.mouse.move(800,510);await page.mouse.down();await page.mouse.move(930,550,{steps:8});await page.mouse.up();await page.mouse.wheel(0,-200);await page.waitForTimeout(250);const end=await page.evaluate(()=>window.__flower.inspect().camera);assert.notDeepEqual(end.position,start.position);assert(end.zoom>start.zoom);assert.deepEqual(requests,[]);
     await page.locator('#reset').click();await page.screenshot({path:path.join(out,'offline-preview.png')});
     const shots=[['hero','立体全景'],['left','左侧'],['right','右侧'],['back','背面补全'],['roof','屋面交接'],['gate','院门与花盆'],['balcony','阳台与百叶'],['top','俯视']];
     const gallery=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>花满橙瓦屋 · 参考与模型</title><style>body{margin:0;background:#edf0e6;color:#45543f;font:14px/1.8 'Microsoft YaHei',sans-serif}main{max-width:1600px;margin:auto;padding:30px}h1{font-size:30px;font-weight:500}a{color:#637e52}.pair,.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:24px 0}figure{margin:0;background:#f8faf2;border-radius:8px;overflow:hidden}img{width:100%;display:block}figcaption{padding:10px 15px}.pair{align-items:center}.pair img{aspect-ratio:1.6;object-fit:contain}.note{color:#7d8973;font-size:12px}</style><main><h1>花满橙瓦屋</h1><p>以用户动画截图为主参考的独立建筑外观 · <a href="花满橙瓦屋-三维预览.html">打开可旋转缩放的三维预览</a></p><div class="pair" id="comparison"><figure><img src="${ref}"><figcaption>用户原始动画参考</figcaption></figure><figure><img src="reference.png"><figcaption>本轮真实三维 · 接近参考的正面机位</figcaption></figure></div><p class="note">图中未见的背面、纵深、主屋顶短侧坡、附屋连接和住宅入户位置属于补全；原图左侧邻屋及背景不作为本建筑。独立室内、正式地图接入及雪景未制作，画面等待用户认可。</p><div class="grid">${shots.map(([f,t])=>`<figure><img src="${f}.png"><figcaption>${t}</figcaption></figure>`).join('')}</div></main></html>`;
     let entryComparison='';
     if(process.argv.includes('--entry')){
       entryComparison=`<h2>本轮只调整院门入口</h2><p>围墙向内折回，院门与黄色小屋顶后退；两级低台阶通向门前平台，三只花盆落在平台和踏步上。下图采用相同机位、光照和缩放。</p><div class="pair" id="entry-comparison"><figure><img src="entry-before-gate.png"><figcaption>修改前 · 院门齐墙，台阶向外伸，右侧粉花盆落在草地</figcaption></figure><figure><img src="entry-after-gate.png"><figcaption>修改后 · 院门内凹，折墙形成进深，台阶分层摆花</figcaption></figure></div><div class="pair"><figure><img src="entry-before-left.png"><figcaption>修改前 · 左侧斜视</figcaption></figure><figure><img src="entry-after-left.png"><figcaption>修改后 · 可见右侧折墙与花盆承托</figcaption></figure></div><div class="pair"><figure><img src="entry-before-reference.png"><figcaption>修改前 · 整体正面</figcaption></figure><figure><img src="entry-after-reference.png"><figcaption>修改后 · 主体、屋顶、窗与阳台保持原样</figcaption></figure></div>`;
     }
     const galleryPath=path.join(out,'原图与模型对照.html');await writeFile(galleryPath,gallery.replace('<div class="grid">',entryComparison+'<div class="grid">'));await page.goto(pathToFileURL(galleryPath).href);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));await page.locator('#comparison').screenshot({path:path.join(out,'reference-comparison.png')});
     if(entryComparison)await page.locator('#entry-comparison').screenshot({path:path.join(out,'entry-before-after.png')});
     delivery={glb:{bytes:result.bytes,meshes:result.meshes,roundtrip:true,bounds:result.roundtripBounds},offline:{modules:visited.size,bytes:Buffer.byteLength(html),networkRequests:requests.length,orbit:true,zoom:true,references:true}};
   }
   assert.deepEqual(errors,[]);
   const original=JSON.parse((await readFile(path.join(out,'boundary-before.json'),'utf8')).replace(/^\uFEFF/,'')),changed=[];
   for(const item of original){try{const hash=createHash('sha256').update(await readFile(item.path)).digest('hex');if(hash.toUpperCase()!==item.hash)changed.push(item.path);}catch{changed.push(item.path);}}
   const report={passed:true,revision,geometry:{nonfinite:geometry.nonfinite,degenerate:geometry.degenerate,triangles:geometry.triangles,meshCount:geometry.meshCount,rotations:geometry.rotations,potSupportChecks:geometry.contacts,windowRecessChecks:geometry.recesses,roofValleyChecks:geometry.seams},lifecycle,interaction,delivery,errors,warnings,boundary:{baseline:'exterior-01 historical snapshot',checked:original.length,changedOutsideTask:changed},visualAcceptance:'Pending user review; screenshots are actual WebGL output.'};
   await writeFile(path.join(out,'inspection.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }
}finally{await browser.close();}
