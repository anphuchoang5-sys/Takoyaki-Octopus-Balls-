import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const dir='town/assets/sakura-house/interior',out=path.resolve('artifacts/buildings/sakura-house/interior/sisters-02');
await mkdir(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const wholeBefore=hash(await readFile('dist/'+dir+'/sakura-interior.glb'));
const inspection=JSON.parse(await readFile(out+'/inspection.json','utf8'));assert(inspection.passed);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}});
 await page.goto('http://127.0.0.1:4184/'+dir+'/sisters-preview.html');await page.waitForFunction(()=>window.__sisters?.ready);
 const exporter=await readFile('node_modules/three/examples/jsm/exporters/GLTFExporter.js','utf8');
 const loader=(await readFile('node_modules/three/examples/jsm/loaders/GLTFLoader.js','utf8')).replace('../utils/BufferGeometryUtils.js','three/addons/utils/BufferGeometryUtils.js');
 const models=await page.evaluate(async({exporter,loader})=>{
  async function module(code){const u=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{return await import(u);}finally{URL.revokeObjectURL(u);}}
  const T=await import('three'),{GLTFExporter}=await module(exporter),{GLTFLoader}=await module(loader);
  const result={};
  for(const type of ['room','interior']){
   const asset=type==='room'?window.__sisters.createSistersRoom():window.__sisters.createInterior();
   if(type==='interior'){asset.setWalls('full');asset.setCeiling(true);asset.setDoorsOpen(false);}
   else asset.setWallMode('full');
   const data=await new GLTFExporter().parseAsync(asset.root,{binary:true,onlyVisible:true});
   const loaded=await new GLTFLoader().parseAsync(data,'');let meshes=0,triangles=0,mapped=0;const ids=new Set();
   loaded.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(o.material.map)mapped++;}if(o.userData.checklist)ids.add(o.userData.checklist);});
   const bounds=new T.Box3().setFromObject(loaded.scene),bytes=new Uint8Array(data);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   result[type]={base64:btoa(binary),bytes:bytes.length,meshes,triangles,mapped,ids:[...ids],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},roundTrip:true};asset.dispose();
  }return result;
 },{exporter,loader});
 for(const r of Object.values(models)){assert(r.meshes>100);assert(r.mapped>10);assert.equal(r.ids.length,62);}
 const checklist=JSON.parse(await readFile('dist/'+dir+'/sisters-checklist.json','utf8'));
 for(const c of checklist.items.filter(c=>!c.excluded))for(const r of Object.values(models))assert(r.ids.includes(c.id),c.id);
 await writeFile('dist/'+dir+'/sisters-room.glb',Buffer.from(models.room.base64,'base64'));
 assert.equal(hash(await readFile('dist/'+dir+'/sakura-interior.glb')),wholeBefore,'Concurrent GLB edit; do not overwrite');
 await writeFile('dist/'+dir+'/sakura-interior.glb',Buffer.from(models.interior.base64,'base64'));
 const imports={},visited=new Set(),sourceHashes={};
 function resolve(spec,from){if(spec==='three')return 'vendor/three.module.js';if(spec.startsWith('three/addons/'))return 'vendor/addons/'+spec.slice(13);if(spec.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));throw new Error('Unsupported import '+spec);}
 async function bundle(relative){if(visited.has(relative))return;visited.add(relative);const source=await readFile(path.join('dist',relative),'utf8'),deps=[];sourceHashes['dist/'+relative]=hash(source);const rewritten=source.replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g,(match,prefix,q,spec)=>{const target=resolve(spec,relative);deps.push(target);return `${prefix}${q}@sisters/${target}${q}`;});imports['@sisters/'+relative]='data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64');for(const dep of deps)await bundle(dep);}
 await bundle(dir+'/sisters-preview.js');
 const refs={};for(const f of ['sisters-01-cabinets.jpg','sisters-02-room.jpg','sisters-03-sakiko.jpg','sisters-04-maruko.jpg'])refs[f]='data:image/jpeg;base64,'+(await readFile('dist/'+dir+'/references/'+f)).toString('base64');
 let html=await readFile('dist/'+dir+'/sisters-preview.html','utf8');
 html=html.replace('<style id="sisters-style"></style>','<style id="sisters-style">'+await readFile('dist/'+dir+'/sisters-preview.css','utf8')+'</style>')
  .replace(/<script type="importmap">[\s\S]*?<\/script>/,`<script>globalThis.__sistersReferences=${JSON.stringify(refs)};</script><script type="importmap">${JSON.stringify({imports})}</script>`)
  .replace('<script type="module" src="./sisters-preview.js"></script>',`<script type="module">import "@sisters/${dir}/sisters-preview.js";</script>`)
  .replace('href="./sisters-room.glb" download','href="data:model/gltf-binary;base64,'+models.room.base64+'" download="sisters-room.glb"');
 const offline=out+'/樱家-姐妹房02-三维预览.html';await writeFile(offline,html);
 const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:\/\//,r=>{network.push(r.request().url());return r.abort();});
 await page.goto(pathToFileURL(offline).href);await page.waitForFunction(()=>window.__sisters?.ready);
 await page.locator('[data-view="maruko"]').click();assert.equal(await page.evaluate(()=>window.__sisters.inspect().current),'maruko');
 await page.locator('#compare').click();for(const n of [1,2,3,4]){await page.locator(`[data-ref="${n}"]`).click();await page.waitForFunction(()=>document.getElementById('reference-image').naturalWidth>0);}
 await page.locator('#close-reference').click();await page.locator('#reset').click();
 const b=await page.locator('#world').boundingBox(),start=await page.evaluate(()=>window.__sisters.inspect().camera.position);
 await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(b.x+b.width*.6,b.y+b.height*.57,{steps:10});await page.mouse.up();await page.waitForTimeout(250);assert.notDeepEqual(await page.evaluate(()=>window.__sisters.inspect().camera.position),start);
 const dist=await page.evaluate(()=>window.__sisters.camera.position.distanceTo(window.__sisters.controls.target));await page.mouse.wheel(0,-250);await page.waitForTimeout(250);assert((await page.evaluate(()=>window.__sisters.camera.position.distanceTo(window.__sisters.controls.target)))<dist);
 await page.locator('#loose').uncheck();assert.equal(await page.evaluate(()=>window.__sisters.room.loose.visible),false);await page.locator('#loose').check();await page.locator('#reset').click();await page.waitForTimeout(180);await page.screenshot({path:out+'/offline-preview.png'});
 assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
 const style=`*{box-sizing:border-box}body{margin:0;background:#f4eae2;color:#665251;font:14px/1.8 'Microsoft YaHei',sans-serif}main{max-width:1500px;margin:auto;padding:32px}h1{font-size:28px;font-weight:500}h2{font-size:19px;font-weight:500;margin-top:40px}nav{display:flex;gap:25px;flex-wrap:wrap;margin:20px 0 30px}a{color:#88635f}.pair,.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair{align-items:center;margin-bottom:25px}figure{margin:0;background:#fff8ef;border-radius:6px;overflow:hidden}img{width:100%;display:block}figcaption{font-size:12px;padding:10px 15px}.crop{aspect-ratio:1279/853;overflow:hidden}table{width:100%;border-collapse:collapse;background:#fff8ef;font-size:12px}td,th{padding:10px;text-align:left;border-bottom:1px solid #e7d7d0;vertical-align:top}th{background:#e9d9d1}.id{white-space:nowrap}.notes{max-width:1100px}.tag{background:#e1e8d6;padding:2px 6px;border-radius:4px;white-space:nowrap}.excluded{background:#eee1c7}@media(max-width:800px){main{padding:16px}.pair,.grid{grid-template-columns:1fr}td,th{padding:6px}}`;
 const pair=(n,file,title,crop=false)=>`<h2>${title}</h2><div class="pair"><figure><div class="${crop?'crop':''}"><img src="${refs[['sisters-01-cabinets.jpg','sisters-02-room.jpg','sisters-03-sakiko.jpg','sisters-04-maruko.jpg'][n-1]]}"></div><figcaption>用户参考图 ${n}${crop?' · 上半部动画':''}</figcaption></figure><figure><a href="${file}.png"><img src="${file}.png"></a><figcaption>当前真实三维 · 对应位置</figcaption></figure></div>`;
 const gallery=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>姐妹房 02 · 清单与对照</title><style>${style}</style><main><small>SAKURA HOUSE / SISTERS 02</small><h1>姐妹房 · 清单与参考对照</h1><p class="notes">只精修姐妹房。姐姐桌上的物件按用户决定做圆镜。59 项可辨认陈设已经制作；地06只露出棕色尖角，按确认方案不补造。另有本房粉色地面、内侧墙面与柔和接地阴影。技术检查与用户美术认可分开，当前画面待审看。</p><nav><a href="樱家-姐妹房02-三维预览.html">打开可旋转三维预览</a><a href="inspection.json">定向技术检查</a><a href="delivery-inspection.json">GLB 与离线检查</a></nav>${pair(2,'cabinets','走廊这一侧 · 两只书柜、墙贴与挂袋')}${pair(3,'sakiko','姐姐书桌 · 格纹椅、圆镜与窗边陈设')}${pair(4,'maruko','小丸子书桌 · 黄色桌面、圆底椅和墙面装饰',true)}<h2>整体、侧后与近景</h2><div class="grid">${[['room','整体'],['top','俯视与通道'],['reverse','侧面与背面'],['dolls','透明盒、坐熊与娃娃'],['mirror','圆镜与窗边小桌'],['loose','地面小物']].map(([f,t])=>`<figure><a href="${f}.png"><img src="${f}.png" loading="lazy"></a><figcaption>${t}</figcaption></figure>`).join('')}</div><h2>逐项核对表</h2><p>编号与模型组一一对应。检查包含几何存在、摆位和可见细节；点击机位可放大检查。墙面画稿和印刷图案按参考重绘，不称逐像素复原。</p><table><thead><tr><th>编号</th><th>物件</th><th>核对内容</th><th>状态 / 机位</th></tr></thead><tbody>${checklist.items.map(e=>`<tr><td class="id">${e.id}</td><td>${e.item}</td><td>${e.features}${e.excluded?'；'+e.reason:''}</td><td><span class="tag ${e.excluded?'excluded':''}">${e.excluded?'明确不补造':'已制作、逐项核对'}</span>${e.excluded?'':`<br><a href="${e.view}.png">查看图</a>`}</td></tr>`).join('')}</tbody></table><h2>检查与补全边界</h2><p class="notes">其他房间及共享结构的 273 组几何签名未变，共用布局、几何工具和整屋预览文件未改。检查本房有限坐标、非退化三角形、边界、14 组接地和 19 组陈设支撑，13 对相邻陈设包围盒无明显交叠，按半径 0.22 米核对入口与壁橱前通道。此检查不是完整人物碰撞系统。</p><p class="notes">窗洞、门洞和原壁橱保留。独立预览门后木地板与浅色背景仅帮助辨认原有走廊，不是其他房间的新装修。米制尺寸、家具背面、被遮挡结构、书笔离开人物后的摆位属于补全。小字无法辨认的不编造；未加入人物、视频界面和水印，也未按下半部实物图添加长毛地毯或额外地面笔盒。</p></main></html>`;
 const galleryFile=out+'/姐妹房-清单与对照.html';await writeFile(galleryFile,gallery);
 await page.goto(pathToFileURL(galleryFile).href);await page.waitForFunction(()=>[...document.querySelectorAll('.pair img')].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await page.locator('tbody tr').count(),60);
 const glbs=Object.fromEntries(Object.entries(models).map(([k,{base64,...r}])=>[k,r]));
 const result={passed:true,glbs,offline:{bytes:Buffer.byteLength(html),modules:visited.size,references:4,networkRequests:network.length,errors,orbit:true,zoom:true,focus:true,looseToggle:true},checklist:{modelled:59,excluded:['地06'],rows:60},sourceHashes,userArtApproved:false};
 await writeFile(out+'/delivery-inspection.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({passed:true,glbs:Object.fromEntries(Object.entries(glbs).map(([k,r])=>[k,{bytes:r.bytes,meshes:r.meshes,triangles:r.triangles,mapped:r.mapped}])),offline:result.offline,checklist:result.checklist}));
}finally{await browser.close();}
