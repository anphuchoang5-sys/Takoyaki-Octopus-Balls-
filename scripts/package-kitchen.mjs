import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const adjustments=process.argv.includes('--adjustments');
const folder='town/assets/sakura-house/interior',out=path.resolve('artifacts/buildings/sakura-house/interior'),review=path.join(out,adjustments?'kitchen-02':'kitchen-01');
const hash=v=>createHash('sha256').update(v).digest('hex');
const inspection=JSON.parse(await readFile(review+'/inspection.json','utf8'));assert(inspection.passed);
for(const [file,h] of Object.entries(inspection.sourceHashes))assert.equal(hash(await readFile(file)),h,'Rerun kitchen inspection for '+file);
const oldGLB=await readFile('dist/'+folder+'/sakura-interior.glb'),oldHash=hash(oldGLB);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 // Serve files only inside this isolated browser, without starting a local server.
 const distRoot=path.resolve('dist');
 await page.route('http://127.0.0.1:4173/**',async route=>{
  const request=route.request(),url=new URL(request.url()),file=path.resolve(distRoot,'.'+decodeURIComponent(url.pathname));
  const relative=path.relative(distRoot,file);
  if(request.method()!=='GET'||relative.startsWith('..')||path.isAbsolute(relative))return route.abort();
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary'};
  try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'Local preview file missing'});}
 });
 await page.goto('http://127.0.0.1:4173/'+folder+'/preview.html?view=kitchen-stove');await page.waitForFunction(()=>window.__sakuraInterior?.ready);
 const exporter=await readFile('node_modules/three/examples/jsm/exporters/GLTFExporter.js','utf8'),loader=(await readFile('node_modules/three/examples/jsm/loaders/GLTFLoader.js','utf8')).replace('../utils/BufferGeometryUtils.js','three/addons/utils/BufferGeometryUtils.js');
 const exported=await page.evaluate(async({exporter,loader,oldBase64,adjustments})=>{
  async function mod(code){const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{return await import(url);}finally{URL.revokeObjectURL(url);}}
  const T=await import('three'),{GLTFExporter}=await mod(exporter),{GLTFLoader}=await mod(loader),h=window.__sakuraInterior.createInterior();h.setWalls('full');h.setCeiling(true);h.setDoorsOpen(false);
  const data=await new GLTFExporter().parseAsync(h.root,{binary:true,onlyVisible:true});
  const previous=await new GLTFLoader().parseAsync(Uint8Array.from(atob(oldBase64),c=>c.charCodeAt(0)).buffer,''),current=await new GLTFLoader().parseAsync(data,'');
  async function protectedGeometry(root){const result={};root.updateMatrixWorld(true);async function walk(o,p){const name=o.name.replace(/[:_.]/g,'');if(adjustments?/^厨(11|14|19)/.test(name):['厨房精修','floorkitchen','ceilingkitchen','厨房扩建底座','厨房冰箱','水槽与灶台','厨房餐桌','厨房东侧小柜','厨房入口食器架'].includes(name)||/^厨房餐椅[0-9]*$/.test(name)||/^(wall|cut|frame)(north-main$|kitchen-corridor$|kitchen-rear)/.test(name))return;const stableName=o.name.replace(/^(门扇_[01])_\d+$/,'$1').replace(/^门板几何_\d+$/,'门板几何');const k=p+'/'+(o.isMesh||o.isLineSegments?o.type:stableName||o.type);if(o.isMesh||o.isLineSegments){const record={matrix:o.matrixWorld.elements,attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([key,a])=>[key,Array.from(a.array)])),index:o.geometry.index&&Array.from(o.geometry.index.array),color:o.material.color?.getHex(),opacity:o.material.opacity};if(o.material.map){const im=o.material.map.image,c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);record.texture=Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);}const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(record))))).map(v=>v.toString(16).padStart(2,'0')).join('');result[k]=(result[k]||'')+digest;}else for(const c of o.children)await walk(c,k);}for(const c of root.children)await walk(c,'');return result;}
  const oldProtected=await protectedGeometry(previous.scene),newProtected=await protectedGeometry(current.scene),keys=new Set([...Object.keys(oldProtected),...Object.keys(newProtected)]),differences=[...keys].filter(k=>oldProtected[k]!==newProtected[k]);
  let meshes=0,triangles=0,unlit=0,hasKitchen=false,hasCeilings=false,hasCut=false;current.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;if(o.material.isMeshBasicMaterial)unlit++;}if(o.name==='厨房精修')hasKitchen=true;if(o.name.includes('完整天花'))hasCeilings=true;if(o.name.includes('剖视低墙'))hasCut=true;});
  const bounds=new T.Box3().setFromObject(current.scene).getSize(new T.Vector3()).toArray();h.dispose();
  const bytes=new Uint8Array(data);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return {base64:btoa(binary),bytes:bytes.length,meshes,triangles,unlit,hasKitchen,hasCeilings,hasCut,bounds,protectedObjects:keys.size,differences,roundTrip:true};
 },{exporter,loader,oldBase64:oldGLB.toString('base64'),adjustments});
 const {base64,...glb}=exported;await writeFile(review+'/glb-inspection.json',JSON.stringify(glb,null,2));
 assert.deepEqual(glb.differences,[],'Export changed objects outside kitchen');assert(glb.hasKitchen&&glb.hasCeilings&&!glb.hasCut);assert.equal(glb.meshes,glb.unlit);
 const imports={},visited=new Set(),sourceHashes={};
 function resolve(spec,from){if(spec==='three')return 'vendor/three.module.js';if(spec.startsWith('three/addons/'))return 'vendor/addons/'+spec.slice(13);if(spec.startsWith('.'))return path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));throw new Error('Unsupported import '+spec);}
 async function bundle(file){if(visited.has(file))return;visited.add(file);const src=await readFile('dist/'+file,'utf8'),deps=[];sourceHashes['dist/'+file]=hash(src);const rewritten=src.replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g,(_,prefix,q,spec)=>{const target=resolve(spec,file);deps.push(target);return `${prefix}${q}@interior/${target}${q}`;});imports['@interior/'+file]='data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64');for(const dep of deps)await bundle(dep);}
 await bundle(folder+'/preview.js');
 const names=['01-plan.jpg','02-exterior.jpg','03-whole.jpg','04-corridor.jpg','05-living.jpg','06-kitchen.jpg','07-sisters.jpg','08-grandparents.jpg','09-parents.jpg','anime-living.png','anime-kitchen.jpg','anime-sisters.jpg','anime-grandparents.jpg','sisters-02-room.jpg','sisters-03-sakiko.jpg','sisters-04-maruko.jpg','living-01-anime.jpg','living-02-wall-bug.png','living-03-cabinet.jpg','living-04-window.jpg','wash-01-anime.jpg','kitchen-stove.jpg','kitchen-side.jpg','kitchen-table.jpg','kitchen-front.jpg'];
 const refs={};for(const name of names){const data=await readFile('dist/'+folder+'/references/'+name);refs[name]='data:image/'+(name.endsWith('.png')?'png':'jpeg')+';base64,'+data.toString('base64');sourceHashes['dist/'+folder+'/references/'+name]=hash(data);}
 const css=await readFile('dist/'+folder+'/preview.css','utf8'),sourceHTML=await readFile('dist/'+folder+'/preview.html','utf8');
 sourceHashes['dist/'+folder+'/preview.css']=hash(css);sourceHashes['dist/'+folder+'/preview.html']=hash(sourceHTML);
 const html=sourceHTML.replace('<style id="viewer-style"></style>',`<style id="viewer-style">${css}</style>`).replace(/<script type="importmap">[\s\S]*?<\/script>/,`<script>globalThis.__interiorReferences=${JSON.stringify(refs)};</script><script type="importmap">${JSON.stringify({imports})}</script>`).replace('<script type="module" src="./preview.js"></script>',`<script type="module">import "@interior/${folder}/preview.js";</script>`).replace('href="./sakura-interior.glb" download','href="data:model/gltf-binary;base64,'+base64+'" download="sakura-interior.glb"');
 // Recheck concurrent source/model writes before replacing the shared delivery.
 for(const [f,h] of Object.entries(sourceHashes))assert.equal(hash(await readFile(f)),h,'Concurrent source change: '+f);assert.equal(hash(await readFile('dist/'+folder+'/sakura-interior.glb')),oldHash,'Concurrent GLB change');
 await writeFile('dist/'+folder+'/sakura-interior.glb',Buffer.from(base64,'base64'));
 const offline=path.join(out,'樱家-室内结构预览.html');await writeFile(offline,html);
 const figure=(file,caption)=>`<figure><img src="${file}"><figcaption>${caption}</figcaption></figure>`;
 const pair=(id,ref,view,title)=>`<h2>${title}</h2><div class="pair" id="${id}">${figure(refs[ref],'用户动画参考')}${figure(view+'.png','当前真实三维 · 接近参考方向')}</div>`;
 const gallery=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>樱家厨房 · 参考与修改前后</title><style>*{box-sizing:border-box}body{margin:0;background:#edf0df;color:#42594c;font:15px/1.85 'Microsoft YaHei',sans-serif}main{max-width:1600px;margin:auto;padding:32px}h1{font-size:28px;font-weight:500}h2{font-size:20px;font-weight:500;margin-top:38px}a{color:#337d68}nav{display:flex;gap:24px;flex-wrap:wrap;margin:20px 0}.pair,.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;background:#fffef3}img{width:100%;display:block}figcaption{padding:12px 16px}small{color:#7b8268}.pair figure{display:flex;flex-direction:column;justify-content:center}.pair img{object-fit:contain}p{max-width:1150px}@media(max-width:850px){.pair,.grid{grid-template-columns:1fr}main{padding:16px}}</style><main><small>SAKURA HOUSE / KITCHEN 01</small><h1>绿色厨房 · 灶台与门边食器柜</h1><p>原厨房主区保留，后侧局部增加约 1.8 米深的区域，冰箱旁补出小门，形成 L 形。入口沿原走廊墙向左调整约 0.92 米，框内净宽约 1.11 米。卫浴、其他房间、走廊尺寸及室外建筑保持。</p><nav><a href="../樱家-室内结构预览.html?view=kitchen-stove">可旋转三维预览</a><a href="../樱家-室内结构预览.html?view=kitchen-entry&compare=1">食器柜与原图同屏</a><a href="../樱家-室内结构预览.html?view=kitchen-top">厨房俯视</a><a href="inspection.json">定向检查报告</a></nav>
 ${pair('reference-pair','kitchen-stove.jpg','kitchen-stove-closed','灶台参考方向')}
 <p>奶油色矮冰箱、顶箱和便条；真凹槽、备餐台与低灶柜；窗台清洁用品、厨具挂架和棕色三角边地毯。参考画面没有给出整屋尺寸，桌椅与门窗的具体间距为本次空间补全。</p>
 ${pair('entry-pair','kitchen-front.jpg','kitchen-entry','新增正面图 · 食器柜与厨房入口')}
 <p>柜内是实体碗盘、杯子与盖罐，前面加蓝色玻璃；三只抽屉和两扇底柜门有厚度和拉手。入口保持通口与黄暖帘，后方可见实际走廊。白袋和提篮、小架、电饭煲柜均避开入口。</p>
 ${pair('side-pair','kitchen-side.jpg','kitchen-side','侧面 · 富士山日历、三层架与坛子')}
 ${pair('table-pair','kitchen-table.jpg','kitchen-table','餐桌与椅凳')}
 <p>黄色厚桌面、橙色四椅和绿色圆凳；墙面纸画与纸袋。以新正面图为准，小架底层使用灰/浅绿容器，未把不同场次里的纸箱再叠入；桌面剧情养虫盒未设为固定家具。</p>
 <h2>同机位修改前后</h2><div class="pair" id="layout-pair">${figure('before-top.png','修改前 · 厨房占位家具与被食器架挡住的门位')}${figure('after-top.png','修改后 · 只在厨房后侧外扩，其他空间原位保留')}</div><div class="pair">${figure('before-entry.png','修改前 · 门边占位食器架')}${figure('after-entry.png','修改后 · 厨房门移位、两侧柜体避开门洞')}</div>
 <h2>近景与侧后</h2><div class="grid">${[['kitchen-sink','真实水槽下凹、台面与灶面接触'],['kitchen-cabinet','实体餐具、分层玻璃与抽屉'],['kitchen-top','L形空间、桌椅与通路'],['kitchen-rear','侧后完整墙体、后门与原房间连接']].map(([f,c])=>figure(f+'.png',c)).join('')}</div>
 <p>真实几何：盆腔、柜板、碗杯、炉架/旋钮、窗台、厨具、袋篮、小架、桌椅、门框、布帘起伏。表面图案：日历、便条和纸画、地毯纹样、布帘小印花。玻璃为动画式蓝色材质，没有动态反射。</p><p>后扩米制尺寸、后门朝向与门外落脚处、饭锅上方固定小窗与走廊墙的连接、家具背面均为补全，不能视作原作严格复原。后门只提供本地查看开合，未连接正式室外；室内仍未接入正式进出门。本轮制作与技术检查完成，画面待用户认可。</p></main></html>`;
 const adjustmentGallery=adjustments?`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>樱家厨房 · 四项调整对照</title>${gallery.match(/<style>[\s\S]*?<\/style>/)[0]}<main><small>SAKURA HOUSE / KITCHEN 02</small><h1>桌左侧绿凳与门边圆饭锅</h1><p>绿凳移到朝门看时桌子的左侧，冰箱前袋子和纸张移除；饭锅连同白布小柜向门框移 19 厘米，保留约 8 厘米空隙。饭锅按用户确认改为圆柱锅身和圆盖。餐桌、四椅、其他陈设、墙窗门、走廊和其他房间布局保持。</p><nav><a href="../樱家-室内结构预览.html?view=kitchen-entry&compare=1">可旋转预览与原图同屏</a><a href="../樱家-室内结构预览.html?view=kitchen-cooker">圆饭锅近看</a><a href="../樱家-室内结构预览.html?view=kitchen-top">俯视布局</a><a href="inspection.json">定向检查</a></nav>
 ${pair('reference-pair','kitchen-front.jpg','kitchen-entry','入口参考方向')}
 <p>圆形器具依据用户明确说明建模，直径、高度、背面和具体间距为三维补全；参考中的透视形变没有作为方壳结构。顶部可见真圆盖，锅身竖条、提手、开关与支脚有真实几何。</p>
 <h2>同机位 · 小柜靠门与圆饭锅</h2><div class="pair" id="entry-pair">${figure('before-kitchen-entry.png','本次修改前：方壳饭锅、小柜距门较远，绿凳在椅后')}${figure('kitchen-entry.png','本次修改后：圆饭锅和小柜靠门，椅后空出')}</div>
 <h2>同机位 · 绿凳与冰箱前空地</h2><div class="pair" id="layout-pair">${figure('before-kitchen-top.png','本次修改前')}${figure('kitchen-top.png','本次修改后：绿凳移到过道侧，冰箱前袋子清除，其他布局原位')}</div>
 <p>上面的俯视图朝向与入口参考相反：绿凳位于画面中桌子的右边，对应朝门看时桌子的左侧。沿桌边略向冰箱方向放置，以避开原有路线的转弯处。</p>
 <h2>近景与侧后</h2><div class="grid">${[['kitchen-cooker','圆锅俯斜近景、灰色圆盖与落在柜顶的支脚'],['kitchen-table','桌左侧绿凳与保持原位的四椅'],['kitchen-stove','冰箱前空地，顶部箱子和便条保留'],['kitchen-rear','侧后墙体及其他空间保持']].map(([f,c])=>figure(f+'.png',c)).join('')}</div>
 <p>本次模型修改限于饭锅/白布柜、绿凳及移除的地面杂物。白布褶皱沿用实体起伏和原印花；其他贴图、家具及墙面保持。技术检查通过不等于画面已获认可；独立室内仍未接入正式进出门。</p></main></html>`:gallery;
 const galleryPath=review+'/厨房-参考对照.html';await writeFile(galleryPath,adjustmentGallery);
 const requests=[];await page.route(/^https?:\/\//,r=>{requests.push(r.request().url());return r.abort();});
 await page.goto('file:///'+offline.replace(/\\/g,'/')+'?view=kitchen-stove');await page.waitForFunction(()=>window.__sakuraInterior?.ready);assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().specification.revision),'interior-06-kitchen');
 if(adjustments)assert.equal(await page.evaluate(()=>window.__sakuraInterior.house.kitchen.specification.revision),'kitchen-02');
 const views=['kitchen-stove','kitchen-entry','kitchen-side','kitchen-table','kitchen-sink','kitchen-cabinet','kitchen-top','kitchen-rear',...(adjustments?['kitchen-cooker']:[])];for(const v of views){await page.locator(`[data-view="${v}"]`).click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().current),v);await page.locator('#compare').click();await page.waitForFunction(()=>{const i=document.getElementById('reference-image');return i.complete&&i.naturalWidth===1728;});await page.locator('#close-reference').click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().current),v);}
 await page.locator('#doors').uncheck();assert.equal(await page.evaluate(()=>window.__sakuraInterior.house.getViewState().doorsOpen),false);await page.locator('#doors').check();assert.equal(await page.evaluate(()=>window.__sakuraInterior.house.getViewState().doorsOpen),true);
 await page.locator('[data-view="kitchen-stove"]').click();
 const rect=await page.locator('#world').boundingBox(),camera=()=>page.evaluate(()=>window.__sakuraInterior.inspect().camera),before=await camera();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.57,rect.y+rect.height*.53,{steps:8});await page.mouse.up();await page.waitForTimeout(200);assert.notDeepEqual((await camera()).position,before.position);
 const orbit=await camera();await page.mouse.wheel(0,-140);await page.waitForTimeout(200);assert.notDeepEqual((await camera()).position,orbit.position);const zoom=await camera();await page.mouse.down({button:'right'});await page.mouse.move(rect.x+rect.width*.61,rect.y+rect.height*.55,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);assert.notDeepEqual((await camera()).target,zoom.target);
 await page.locator('[data-view="kitchen-stove"]').click();await page.locator('#compare').click();await page.screenshot({path:review+'/offline-comparison.png'});
 await page.goto('file:///'+galleryPath.replace(/\\/g,'/'));await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));await page.locator('#reference-pair').screenshot({path:review+'/reference-pair.png'});await page.locator('#layout-pair').screenshot({path:review+'/layout-before-after.png'});await page.locator('#entry-pair').screenshot({path:review+'/entry-pair.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 for(const [f,h] of Object.entries(sourceHashes))assert.equal(hash(await readFile(f)),h,'Concurrent source change after packaging: '+f);
 const result={passed:true,revision:'interior-06-kitchen',glb,offline:{bytes:Buffer.byteLength(html),modules:visited.size,references:names.length,networkRequests:requests.length,errors,orbit:true,zoom:true,pan:true,views},gallery:{images:await page.locator('img').count(),loaded:true},sourceHashes};await writeFile(review+'/delivery-inspection.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,sourceHashes:undefined}));
}finally{await browser.close();}
