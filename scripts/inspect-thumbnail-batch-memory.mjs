// Targeted ownership/startup regression. Browser substitutions are diagnostic only.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const arg=(k,d)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const out=arg('out','artifacts/editor/thumbnail-batch-memory'),before=process.argv.includes('--before');
const label=arg('label',before?'regression-before':'regression-after'),report={before,checks:[],errors:[]};
await mkdir(out,{recursive:true});await writeFile(`${out}/${label}.json`,'{}',{flag:'wx'});
const snapshot=before?JSON.parse(await readFile(`${out}/before-source/manifest.json`,'utf8')):null;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{
  const contexts=new WeakSet();window.__contextCount=0;const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){const context=original.call(this,type,...args);if(context&&type.startsWith('webgl')&&!contexts.has(context)){contexts.add(context);window.__contextCount++;}return context;};
  localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z===3?3:0})),instances:['sakura-house','convenience','mitsuya'].map((assetId,i)=>({id:`check-${i}`,assetId,x:i+3,z:3,rotation:0}))},environment:{time:'afternoon',weather:'clear',snowAmount:0}}));
 });
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());assert.equal(u.origin,'http://127.0.0.1:4173');const path=u.pathname.slice(1);
  if(!path.endsWith('.js')||path.startsWith('vendor/'))return route.continue();
  let body=await readFile(snapshot?.[path]?`${out}/before-source/${snapshot[path].file}`:`dist/${path}`,'utf8');
  if(['town/assets/sakura-house/geometry.js','town/assets/mitsuya/workshop.js'].includes(path)){
   const marker=path.includes('sakura')?'  function dispose(){':' let disposed=false;function dispose(){';assert(body.includes(marker));
   body=body.replace(marker,`root.userData.__batchOwned=()=>{const live=new Set();root.traverse(n=>{if(n.geometry)live.add(n.geometry);});const unused=[...geometries].filter(g=>!live.has(g)),buffers=new Set();for(const g of unused)for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))buffers.add((a.data??a).array.buffer);return {owned:geometries.size,unused:unused.length,unusedBytes:[...buffers].reduce((n,b)=>n+b.byteLength,0)};};\n`+marker);
  }
  return route.fulfill({contentType:'text/javascript',body});
 });
 await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
 report.startup=await page.evaluate(()=>({contexts:__contextCount,formal:localStorage.getItem('rainy-corner.editor.layout.v1')}));
 report.checks.push({name:'startup uses only the scene WebGL context',pass:report.startup.contexts===1});
 report.assets=await page.evaluate(async()=>{
  const {createAsset}=await import('/town/editor/catalog.js'),results=[];
  const digest=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
  for(const id of ['sakura-house','mitsuya']){
   const a=createAsset(id),b=createAsset(id),geometries=new Set(),neighbour=new Set(),objects=[];
   a.root.updateWorldMatrix(true,true);
   const nodes=[];a.root.traverse(n=>{if(n.geometry){nodes.push(n);geometries.add(n.geometry);}});b.root.traverse(n=>{if(n.geometry)neighbour.add(n.geometry);});
   for(const n of nodes){const attributes={};for(const [key,attr]of Object.entries({...n.geometry.attributes,...(n.geometry.index?{index:n.geometry.index}:{})}))attributes[key]={itemSize:attr.itemSize,normalized:attr.normalized,hash:await digest((attr.data??attr).array)};
    const materials=(Array.isArray(n.material)?n.material:[n.material]).map(m=>({type:m.type,color:m.color?.getHex(),opacity:m.opacity,transparent:m.transparent,side:m.side,depthWrite:m.depthWrite,vertexColors:m.vertexColors,map:!!m.map}));
    objects.push({type:n.type,name:n.name,visible:n.visible,matrix:n.matrixWorld.elements,attributes,groups:n.geometry.groups,drawRange:n.geometry.drawRange,materials});
   }
   const owned=a.root.userData.__batchOwned(),disposed=new Map(),neighbourDisposed=[];
   geometries.forEach(g=>g.addEventListener('dispose',()=>disposed.set(g,(disposed.get(g)??0)+1)));
   neighbour.forEach(g=>g.addEventListener('dispose',()=>neighbourDisposed.push(g.uuid)));
   a.dispose();const release={live:geometries.size,disposed:disposed.size,exactlyOnce:[...geometries].every(g=>disposed.get(g)===1),neighbourDisposed:neighbourDisposed.length};b.dispose();
   results.push({id,owned,release,visibleHash:await digest(new TextEncoder().encode(JSON.stringify(objects))),objects:objects.length});
  }return results;
 });
 for(const a of report.assets){report.checks.push({name:`${a.id}: no unused owned geometry`,pass:a.owned.unused===0});report.checks.push({name:`${a.id}: release all live geometry once and preserve neighbour`,pass:a.release.exactlyOnce&&a.release.neighbourDisposed===0});}
 if(!before){const old=JSON.parse(await readFile(`${out}/regression-before.json`,'utf8'));for(const a of report.assets)report.checks.push({name:`${a.id}: exact visible geometry and materials`,pass:a.visibleHash===old.assets.find(b=>b.id===a.id).visibleHash});}
 const images=await page.evaluate(async()=>{const imgs=[...document.querySelectorAll('img')];await Promise.all(imgs.map(i=>i.decode()));return imgs.map(i=>({src:i.src,width:i.naturalWidth,height:i.naturalHeight}));});
 report.images=images;report.checks.push({name:'all 8 real asset cards decode at 280x190',pass:images.length===8&&images.every(i=>i.width===280&&i.height===190)});
 report.checks.push({name:'formal storage untouched and no page errors',pass:report.startup.formal===null&&!report.errors.length});
 report.passed=report.checks.every(c=>c.pass);if(!report.passed)process.exitCode=1;
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify({label,checks:report.checks,startup:report.startup,assets:report.assets,errors:report.errors,failure:report.failure,passed:report.passed}));
