import {chromium} from 'playwright';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const baseline=process.argv.includes('--baseline');
const root=path.resolve('.'),asset='dist/town/assets/tama-house';
const delivery='artifacts/buildings/three-houses/tama-house',out=delivery+'/structure-02';
const views={
 hero:{position:[-18,13,24],target:[0,3.3,0],height:16.5},
 reference:{position:[-23,7,42],target:[0,3.9,0],height:13.8},
 left:{position:[-32,10,9],target:[0,3,0],height:15},
 right:{position:[28,11,9],target:[0,3,0],height:15},
 back:{position:[-18,13,-27],target:[0,3,-.6],height:15},
 top:{position:[0,40,.02],target:[0,0,0],height:17.6},
 roof:{position:[-14,13,20],target:[0,5.5,.3],height:9.5},
 detail:{position:[-12,7,24],target:[1.8,4.3,3.6],height:5.4},
 gate:{position:[-7,5,20],target:[-2.4,1.3,5.7],height:5.5}
};
const sha=b=>createHash('sha256').update(b).digest('hex');
async function hashes(){const files={};async function walk(p){for(const e of await readdir(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())await walk(f);else files[f]=sha(await readFile(f));}}for(const id of ['grandparents-house','kosugi-house']){await walk('dist/town/assets/'+id);await walk('artifacts/buildings/three-houses/'+id);}for(const f of ['residential-kit.js','residential-preview.js','residential-preview.css'])files['dist/town/assets/shared/'+f]=sha(await readFile('dist/town/assets/shared/'+f));return files;}
await mkdir(out+'/'+(baseline?'before':'after'),{recursive:true});
if(baseline){let previous;try{previous=JSON.parse(await readFile(out+'/baseline.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}if(previous)assert.deepEqual(await hashes(),previous.protected);await writeFile(out+'/baseline.json',JSON.stringify({views,protected:await hashes()},null,2));}
else assert.deepEqual(await hashes(),JSON.parse(await readFile(out+'/baseline.json','utf8')).protected,'Other two houses or shared files changed');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1560,height:1040},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('No save writes in art preview');};});
 if(!baseline)await page.route('http://tama-art.local/**',async r=>{const file=path.resolve(root,'dist/.'+decodeURIComponent(new URL(r.request().url()).pathname));if(path.relative(path.join(root,'dist'),file).startsWith('..'))return r.abort();const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.jpg':'image/jpeg'};await r.fulfill({body:await readFile(file),contentType:types[path.extname(file)]||'application/octet-stream'});});
 await page.goto(baseline?pathToFileURL(path.resolve(delivery+'/小玉家-三维预览.html')).href:'http://tama-art.local/town/assets/tama-house/preview.html');
 await page.waitForFunction(()=>window.__house?.ready);
 if(baseline)assert.equal(await page.evaluate(()=>window.__house.asset.specification.revision),'exterior-01-reference','Baseline requires the old offline delivery');
 await page.evaluate(views=>{const h=window.__house;Object.assign(h.views,views);h.clean(true);},views);
 const cameras={};
 for(const view of Object.keys(views)){await page.evaluate(v=>window.__house.setView(v),view);await page.waitForTimeout(500);cameras[view]=await page.evaluate(()=>({...window.__house.inspect().camera,projection:window.__house.camera.projectionMatrix.toArray()}));await page.screenshot({path:out+'/'+(baseline?'before':'after')+'/'+view+'.png'});}
 const geometry=await page.evaluate(()=>window.__house.inspect());
 assert.equal(errors.length,0);
 await writeFile(out+'/'+(baseline?'before':'after')+'/report.json',JSON.stringify({cameras,geometry,errors},null,2));
 if(!baseline){
  const before=JSON.parse(await readFile(out+'/before/report.json','utf8'));
  for(const name of Object.keys(cameras))assert.equal(JSON.stringify(cameras[name]),JSON.stringify(before.cameras[name]),'Camera mismatch '+name);
  const structure=await page.evaluate(async()=>{
   const T=await import('three'),h=window.__house,root=h.asset.root;root.updateMatrixWorld(true);
   const ray=new T.Raycaster(),meshes=o=>{const a=[];o.traverse(m=>{if(m.isMesh)a.push(m);});return a;};
   const roof=meshes(root.getObjectByName('蓝瓦主前坡')).concat(meshes(root.getObjectByName('蓝瓦主后坡')));
   const hit=(x,z)=>{ray.set(new T.Vector3(x,20,z),new T.Vector3(0,-1,0));return ray.intersectObjects(roof,false)[0]?.point.y;};
   let samples=0,maxPlaneError=0,missing=0;for(let x=-4.2;x<=4.2;x+=.7)for(let z=-3.3;z<=3.3;z+=.6){if(Math.abs(z)<.15)continue;const y=hit(x,z);samples++;if(y===undefined)missing++;else maxPlaneError=Math.max(maxPlaneError,Math.abs(y-(7.75-.55*Math.abs(z))));}
   const extension=[1,2,3,4].map(x=>({x,y:hit(x,4.1)}));
   const ridges=root.children.filter(g=>g.name==='唯一长屋脊');const ridgeBounds=h.measure('唯一长屋脊');
   const side=root.getObjectByName('左侧山墙立面'),front=root.getObjectByName('主屋正面');
   const n1=new T.Vector3(0,0,1).transformDirection(side.matrixWorld),n2=new T.Vector3(0,0,1).transformDirection(front.matrixWorld);
   ray.set(new T.Vector3(-10,4.72,.1),new T.Vector3(1,0,0));const sideOpeningClear=ray.intersectObjects(meshes(side),false).length===0;
   ray.set(new T.Vector3(-1.9,4.68,10),new T.Vector3(0,0,-1));const frontOpeningClear=ray.intersectObjects(meshes(front),false).length===0;
   let leafRoofIntersections=0;const p=new T.Vector3();for(const m of meshes(root.getObjectByName('庭院植物'))){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);if(p.x>-4.68&&p.x<4.68&&p.z>-3.6&&p.z<3.6){const y=7.75-.55*Math.abs(p.z);if(p.y>y-.14&&p.y<y+.035)leafRoofIntersections++;}}}
   const ground=meshes(root.getObjectByName('草地与地块')),lawnPoints=[[-4,6.2],[-3.1,4.2],[-6,1],[6,0],[0,-5]];
   const grassSamples=lawnPoints.map(([x,z])=>{ray.set(new T.Vector3(x,.5,z),new T.Vector3(0,-1,0));const hits=ray.intersectObjects(ground,false);return{x,z,y:hits[0]?.point.y};});
   const design=h.asset.getInspection(),postContacts=design.structure.balconyPosts.map(post=>{let top=-Infinity;for(const m of meshes(root.getObjectByName('右侧阳台'))){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);if(Math.abs(p.x-post.x)<.05&&Math.abs(p.z-post.z)<.05)top=Math.max(top,p.y);}}ray.set(new T.Vector3(post.x,4.8,post.z),new T.Vector3(0,1,0));const underside=ray.intersectObjects(roof,false)[0]?.point.y;return{x:post.x,z:post.z,actualTop:top,underside,gap:underside-top};});
   const fences=root.children.filter(g=>g.name.startsWith('粉色')),wallTops=fences.map(g=>({name:g.name,top:h.measure(g.name).max[1]}));
   const obstacle=fences.flatMap(meshes).concat(meshes(root.getObjectByName('加宽灰门柱与半开木门')));
   ray.set(new T.Vector3(-4,1,6.8),new T.Vector3(0,0,-1));ray.far=2;const newGateClear=ray.intersectObjects(obstacle,false).length===0;
   ray.set(new T.Vector3(-2.5,1,6.8),new T.Vector3(0,0,-1));const oldGateClosed=ray.intersectObjects(obstacle,false).length>0;ray.far=Infinity;
   const entryPoints=[[-4,6],[-3.7,5.4],[-3.3,4.7],[-2.9,4]],entryClear=entryPoints.every(([x,z])=>Object.values(design.garden.plantBounds).every(b=>!(x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2])));
   return {samples,missing,maxPlaneError,extension,ridges:ridges.length,ridgeBounds,wallNormalDot:n1.dot(n2),sideOpeningClear,frontOpeningClear,leafRoofIntersections,grassSamples,postContacts,plantBounds:design.garden.plantBounds,treeRoot:design.garden.rearTree.root,wallTops,newGateClear,oldGateClosed,entryClear};
  });
  const checks={sameCameras:true,otherHousesUnchanged:true,twoRoofPlanes:structure.missing===0&&structure.maxPlaneError<.04,singleRidge:structure.ridges===1&&structure.ridgeBounds.max[2]-structure.ridgeBounds.min[2]<.2,perpendicularWalls:Math.abs(structure.wallNormalDot)<1e-6,windowOpenings:structure.sideOpeningClear&&structure.frontOpeningClear,balconyRoof:structure.extension.every(p=>Math.abs(p.y-(7.75-.55*4.1))<.04)&&structure.postContacts.every(p=>Math.abs(p.gap)<1e-5),plantsClearOfRoof:structure.leafRoofIntersections===0,lawnCoverage:structure.grassSamples.every(p=>p.y>.10&&p.y<.35),treeBehindHouse:structure.treeRoot[2]<-3.1&&structure.treeRoot[0]>4.3};
  Object.assign(checks,{levelWalls:structure.wallTops.length===5&&Math.max(...structure.wallTops.map(w=>w.top))-Math.min(...structure.wallTops.map(w=>w.top))<1e-6,gateMovedLeft:structure.newGateClear&&structure.oldGateClosed,entryClear:structure.entryClear});
  await writeFile(out+'/structure-checks.json',JSON.stringify({checks,structure},null,2));
  console.log(JSON.stringify({checks,structure}));
  assert(Object.values(checks).every(Boolean),'Structure inspection failed');
  const names={reference:'参考角度',hero:'立体全景',left:'左侧',right:'右侧',back:'背面（补全）',top:'俯视布局',roof:'单一屋脊与檐口',detail:'阳台与窗框',gate:'院门与草地'};
  const ref='data:image/jpeg;base64,'+(await readFile(asset+'/references/user-exterior.jpg')).toString('base64');
  const pair=(name)=>'<section id="'+name+'"><h2>'+names[name]+'</h2><div class="pair"><figure><img src="before/'+name+'.png"><figcaption>修改前 · exterior-01</figcaption></figure><figure><img src="after/'+name+'.png"><figcaption>修改后 · exterior-02</figcaption></figure></div></section>';
  const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>小玉家 · 主体与庭院修改对照</title><style>body{margin:0;background:#f5f4ee;color:#253c50;font:16px/1.65 "Microsoft YaHei",sans-serif}main{max-width:1500px;margin:auto;padding:28px}h1{font-size:28px;margin:0}h2{font-size:21px;margin:20px 0 8px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;background:white;border-radius:8px;overflow:hidden}img{display:block;width:100%;aspect-ratio:1.5;object-fit:contain;background:#e8f0f1}figcaption{padding:6px 14px;font-size:14px}nav{display:flex;gap:16px;flex-wrap:wrap}a{color:#3469aa}p{margin:8px 0 16px}section{margin-bottom:24px}.ref img{object-fit:contain}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><main><h1>小玉家 · 主体与庭院修改对照</h1><p>2026-10-24 · 矩形主体 / 统一屋脊双坡屋顶 / 粉色分段院墙 / 草地庭院</p><nav><a href="../小玉家-三维预览.html">打开可旋转三维预览</a>'+Object.keys(names).map(n=>'<a href="#'+n+'">'+names[n]+'</a>').join('')+'</nav><p>各组修改前后使用相同相机位置、缩放和投影范围；本轮同时纠正预览偏色，因此光照不同。侧后、纵深和尺寸为结构补全，原动画投影并非精确测绘。未接地图，画面待认可。</p><section id="source" class="ref"><h2>原作参考与当前角度</h2><div class="pair"><figure><img src="'+ref+'"><figcaption>用户提供的动画参考</figcaption></figure><figure><img src="after/reference.png"><figcaption>当前模型 · 正面与左侧山墙</figcaption></figure></div></section>'+Object.keys(names).map(pair).join('')+'</main></html>';
  const gallery=out+'/小玉家-修改对照.html';await writeFile(gallery,html);
  await page.goto(pathToFileURL(path.resolve(gallery)).href);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  for(const name of ['source','reference','back','left'])await page.locator('#'+name).screenshot({path:out+'/'+name+'-compare.png'});
  await writeFile(out+'/gallery-checks.json',JSON.stringify({images:await page.locator('img').count(),errors},null,2));
  if(!process.argv.includes('--draft')){
  const packaged=JSON.parse(await readFile(delivery+'/inspection.json','utf8'));for(const[file,expected]of Object.entries(packaged.package.sourceHashes))assert.equal(sha(await readFile('dist/'+file)),expected,'Offline source differs: '+file);
  const requests=[];await page.route(/^https?:\/\//,r=>{requests.push(r.request().url());return r.abort();});
  await page.goto(pathToFileURL(path.resolve(delivery+'/小玉家-三维预览.html')).href);await page.waitForFunction(()=>window.__house?.ready);
  assert.equal(await page.evaluate(()=>window.__house.asset.specification.revision),'exterior-02-gable');
  const rect=await page.locator('#world').boundingBox(),camera=()=>page.evaluate(()=>window.__house.inspect().camera),start=await camera();
  await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.55,{steps:8});await page.mouse.up();await page.waitForTimeout(200);const orbit=await camera();
  await page.mouse.wheel(0,-160);await page.waitForTimeout(200);const zoom=await camera();
  await page.mouse.down({button:'right'});await page.mouse.move(rect.x+rect.width*.64,rect.y+rect.height*.58,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);const pan=await camera();
  await page.locator('#compare').click();await page.waitForFunction(()=>document.querySelector('#reference-image').naturalWidth>0);
  const offline={rotate:JSON.stringify(start.position)!==JSON.stringify(orbit.position),zoom:orbit.zoom!==zoom.zoom,pan:JSON.stringify(zoom.target)!==JSON.stringify(pan.target),reference:true,requests,errors};
  assert(offline.rotate&&offline.zoom&&offline.pan&&requests.length===0&&errors.length===0);
  await page.screenshot({path:out+'/offline-preview.png'});await writeFile(out+'/offline-checks.json',JSON.stringify(offline,null,2));
  assert.deepEqual(await hashes(),JSON.parse(await readFile(out+'/baseline.json','utf8')).protected);
  console.log(JSON.stringify({offline,protectedFilesUnchanged:true}));
  }
 }else console.log('Before images and protected hashes saved.');
 await context.close();
}finally{await browser.close();}
