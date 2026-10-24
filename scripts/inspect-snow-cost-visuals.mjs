// Deterministic image/data comparisons, separate from uninstrumented benchmarks.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const arg=(k,d)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const out=arg('out','artifacts/editor/snow-query-render-cost'),label=arg('label','visuals'),hash=b=>createHash('sha256').update(b).digest('hex');
const report={images:[],data:[],interior:[],thumbnails:[],errors:[],checks:[]};
await mkdir(out,{recursive:true});await writeFile(`${out}/${label}.json`,'{}',{flag:'wx'});
const save=()=>writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2)+'\n');
let browser;
async function difference(page,old,current){
 return page.evaluate(async urls=>{
  const images=await Promise.all(urls.map(async src=>{const im=new Image();im.src=src;await im.decode();return im;}));
  const c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height;const ctx=c.getContext('2d'),arrays=images.map(im=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;});
  let pixels=0,maxDelta=0;for(let i=0;i<arrays[0].length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(arrays[0][i+j]-arrays[1][i+j]);changed ||= d>0;maxDelta=Math.max(maxDelta,d);}if(changed)pixels++;}return {pixels,maxDelta};
 },[old,current].map(b=>'data:image/png;base64,'+b.toString('base64')));
}
try{
 for(const count of [6,12])for(const variant of ['before','after']){
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('PAGE_CRASH'));
  const source=`${out}/${variant}-source`,manifest=JSON.parse(await readFile(`${source}/manifest.json`,'utf8'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());assert.equal(u.origin,'http://127.0.0.1:4173');const path=u.pathname.slice(1),entry=manifest[path];
   if(!entry)return route.continue();let body=await readFile(`${source}/${entry.file}`,'utf8');
   if(path==='main.js')body=body.replace('time+=elapsedDt','time=0').replaceAll('frameId=requestAnimationFrame(draw);','if(!window.__batchManual)frameId=requestAnimationFrame(draw);').replace('window.townEditor=Object.freeze',"window.__batchTick=draw;window.__batchRender=()=>{renderScene();return canvas.toDataURL('image/png');};window.townEditor=Object.freeze");
   return route.fulfill({contentType:'text/javascript',body});
  });
  const layout={format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<3+Math.ceil(count/3)?3:0})),instances:Array.from({length:count},(_,i)=>({id:`fixed-${i}`,assetId:['sakura-house','convenience','mitsuya'][i%3],x:i%3+3,z:3+Math.floor(i/3),rotation:0}))};
  await page.addInitScript(layout=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout,environment:{time:'afternoon',weather:'clear',snowAmount:0}})),layout);
  await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
  await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();window.__batchManual=true;townEditor.showOverview({immediate:true});});await page.waitForTimeout(100);
  const capture=async name=>{
   await page.evaluate(()=>{__batchTick(performance.now());__batchRender();__batchRender();});
   const png=Buffer.from((await page.evaluate(()=>__batchRender())).split(',')[1],'base64'),file=`${label}-${variant}-${count}-${name}.png`;
   await writeFile(`${out}/${file}`,png);const item={variant,count,name,file,hash:hash(png)};report.images.push(item);
   if(variant==='after'){
    const reference=report.images.find(i=>i.variant==='before'&&i.count===count&&i.name===name);item.same=item.hash===reference.hash;
    if(!item.same){const old=await readFile(`${out}/${reference.file}`);item.difference=await page.evaluate(async urls=>{
     const images=await Promise.all(urls.map(async src=>{const i=new Image();i.src=src;await i.decode();return i;}));
     const c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height;const ctx=c.getContext('2d'),data=images.map(i=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(i,0,0);return ctx.getImageData(0,0,c.width,c.height).data;});let pixels=0,maxDelta=0;
     for(let i=0;i<data[0].length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(data[0][i+j]-data[1][i+j]);changed ||= d>0;maxDelta=Math.max(maxDelta,d);}if(changed)pixels++;}return {pixels,maxDelta};
    },[old,png].map(b=>'data:image/png;base64,'+b.toString('base64')));}
    report.checks.push({name:`${count} ${name}: exact pixels`,pass:item.same});
   }
   await save();console.log(JSON.stringify(item));
  };
  const recordData=async amount=>{
   const data=await page.evaluate(async()=>{
    const digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),x=>x.toString(16).padStart(2,'0')).join(''),entries=[];
    for(const {asset,placement}of townEditor.sceneView.getInstances()){
     const nodes=[];asset.root.traverse(n=>{if(n.geometry)nodes.push(n);});const objects=[];
     for(const n of nodes){const g=n.geometry,attributes={};for(const [key,a]of Object.entries({...g.attributes,...(g.index?{index:g.index}:{})}))attributes[key]=await digest((a.data??a).array);objects.push({name:n.name,visible:n.visible,attributes,groups:g.groups,drawRange:g.drawRange});}
     entries.push({id:placement.id,hash:await digest(new TextEncoder().encode(JSON.stringify(objects))),snow:asset.snow?{mode:asset.snow.getInspection().preparationMode,fallback:asset.snow.getInspection().preparationFallback}:null});
    }
    const queries=[];for(let x=-28.03;x<14.5;x+=2.17)for(let z=-28.09;z<28.5;z+=2.19)queries.push(townEditor.weather.sampleSurface(x,z));
    return {entries,queries:await digest(new TextEncoder().encode(JSON.stringify(queries))),queryCount:queries.length};
   });
   report.data.push({variant,count,amount,data});if(variant==='after')report.checks.push({name:`${count} snow ${amount}: exact geometry and surface queries`,pass:JSON.stringify(data)===JSON.stringify(report.data.find(x=>x.variant==='before'&&x.count===count&&x.amount===amount).data)});await save();
  };
  await capture('clear');
  for(const amount of [.12,1]){
   await page.evaluate(a=>townEditor.environment.set({weather:'snow',snowAmount:a}),amount);
   await page.waitForFunction(a=>[townEditor.sceneView.getInspection().snow,...townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>e.asset.snow.getInspection())].every(s=>s.shown===a),amount,{timeout:90000});
   await capture(amount===1?'full-snow':'thin-snow');await recordData(amount);
  }
  await page.evaluate(()=>townEditor.environment.set({time:'night'}));await capture('night-snow');
  for(const [id,name]of [['fixed-0','sakura-close'],['fixed-2','mitsuya-close']]){await page.evaluate(id=>__editor.cameraRig.focus(id,{immediate:true}),id);await capture(name);}
  await page.evaluate(()=>townEditor.state.rotate('fixed-2'));await capture('mitsuya-rotated');
  assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);
  await page.evaluate(()=>townEditor.dispose());await browser.close();browser=null;
 }
 assert.deepEqual(report.errors,[]);report.passed=report.checks.every(c=>c.pass);if(!report.passed)process.exitCode=1;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}finally{await save();await browser?.close();}
console.log(JSON.stringify({label,passed:report.passed,checks:report.checks,errors:report.errors,failure:report.failure}));
