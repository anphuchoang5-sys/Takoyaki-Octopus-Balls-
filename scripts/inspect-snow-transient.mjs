// Exact-data and allocation regression checks. Never uses a personal browser profile.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {decodePreparedSnow} from '../dist/town/assets/shared/snow-prepared.js';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/editor/snow-transient',baseline='artifacts/editor/snow-buffers/final-source';
const red=process.argv.includes('--red'),browserMode=process.argv.includes('--browser');
const uri=p=>pathToFileURL(`${process.cwd()}/${p}`).href;
const hash=a=>createHash('sha256').update(ArrayBuffer.isView(a)?Buffer.from(a.buffer,a.byteOffset,a.byteLength):a).digest('hex');
const before=async name=>readFile(`${baseline}/town__assets__shared__${name}`,'utf8');
const current=async name=>readFile(`dist/town/assets/shared/${name}`,'utf8');
const moduleURL=body=>'data:text/javascript;base64,'+Buffer.from(body.replaceAll("from 'three'",`from '${uri('dist/vendor/three.module.js')}'`).replaceAll('../../../vendor/three.module.js',uri('dist/vendor/three.module.js')).replaceAll('./snow-surfaces.js',uri('dist/town/assets/shared/snow-surfaces.js'))).toString('base64');
const report={red,baseline,checks:[],frames:[],errors:[]};await mkdir(out,{recursive:true});
try{
 if(browserMode)await browserChecks();else await dataChecks();
 report.passed=true;
}catch(error){report.failure=error.stack;process.exitCode=1;console.error(error.message);}
await writeFile(`${out}/${browserMode?'browser':red?'allocation-red':'data'}.json`,JSON.stringify(report,null,2));

async function dataChecks(){
 const oldCollector=await import(moduleURL(await before('snow.js'))),nextCollector=await import(moduleURL(await current('snow.js')));
 const sourceRoot=new T.Group(),g=new T.PlaneGeometry(8,8,30,30);g.rotateX(-Math.PI/2);
 const material=new T.MeshBasicMaterial(),mesh=new T.Mesh(g,material);sourceRoot.add(mesh);
 const clone=T.Vector3.prototype.clone;let clones=0;
 T.Vector3.prototype.clone=function(){clones++;return clone.call(this);};
 let next;try{next=nextCollector.collectSnowSource(sourceRoot,()=>0,[-7,7,-7,7]);}finally{T.Vector3.prototype.clone=clone;}
 const old=oldCollector.collectSnowSource(sourceRoot,()=>0,[-7,7,-7,7]);
 assert.equal(hash(next.positions),hash(old.positions));assert.equal(hash(next.parts),hash(old.parts));
 report.checks.push({name:'source-clone-budget',clones,maximum:4});
 // Actual collector over many triangles: catches per-triangle Vector3 cloning.
 g.dispose();material.dispose();
 const extract=body=>{const start=body.indexOf('const quantize=')+15,end=body.indexOf('};',start)+1;assert(start>=15&&end>start);return Function(`return (${body.slice(start,end)})`)();};
 const ref=extract(await before('snow-geometry.js')),fast=extract(await current('snow-geometry.js'));
 const toFixed=Number.prototype.toFixed;let stringCalls=0;
 Number.prototype.toFixed=function(...args){stringCalls++;return toFixed.apply(this,args);};
 try{for(let i=0;i<10000;i++)fast((i-5000)*.00123456789);}finally{Number.prototype.toFixed=toFixed;}
 report.checks.push({name:'quantize-string-budget',stringCalls,maximum:100});
 assert(clones<=4,`SOURCE_TEMPORARIES: ${clones} Vector3 clones; QUANTIZE_TEMPORARIES: ${stringCalls} decimal strings`);
 assert(stringCalls<100,`QUANTIZE_TEMPORARIES: ${stringCalls} decimal strings for 10000 coordinates`);
 let checked=0,seed=74123;
 const check=n=>{assert(Object.is(ref(n),fast(n)),`quantize mismatch at ${n}`);checked++;};
 for(let i=0;i<500000;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=(seed/4294967296-.5)*5000;check(n);
  const half=(Math.floor(n*1e6)+.5)/1e6;
  for(const sign of [-1,1])for(const shift of [-2,-1,0,1,2])check(sign*(half+shift*Math.max(1,Math.abs(half))*Number.EPSILON));
 }
 for(const n of [0,-0,5e-7,-5e-7,1e-8,-1e-8,1e21,-1e21,NaN,Infinity,-Infinity])check(n);
 report.checks.push({name:'quantize-exact',checked});
 const aModule=await import(moduleURL(await before('snow-geometry.js'))),bModule=await import(moduleURL(await current('snow-geometry.js')));
 const entries=JSON.parse(await readFile('artifacts/editor/snow-startup/prepared-data.json','utf8'));
 for(const entry of entries){
  let config=await readFile(`dist/town/assets/${entry.assetId}/snow.js`,'utf8');
  config=config.replace("import {attachSnow,surfacePart} from '../shared/snow.js';",`import {surfacePart} from '${uri('dist/town/assets/shared/snow.js')}';const attachSnow=(_,c)=>c;`).replace("new URL('./snow-support.bin.gz',import.meta.url).href","null");
  const factory=Object.values(await import(moduleURL(config)))[0],options={minNormal:.15,groundBounds:[-7,7,-7,7],...factory({specification:{revision:'test'}})};
  const raw=gunzipSync(await readFile(`dist/town/assets/${entry.assetId}/snow-support.bin.gz`));
  const prepared=decodePreparedSnow(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),entry.fingerprint);
  const a=aModule.createSurfaceSnow(options,prepared,new Map()),b=bModule.createSurfaceSnow(options,prepared,new Map());
  for(const amount of [.005,.12,.4,.75,1,.45]){
   a.setAmount(amount);b.setAmount(amount);const x=a.takeFrame(undefined,true),y=b.takeFrame(undefined,true);
   for(const field of ['positions','normals','colors','indices','parts','topIndices'])assert.equal(hash(x[field]),hash(y[field]),`${entry.assetId}/${amount}/${field}`);
   assert.deepEqual(x.groups,y.groups);report.frames.push({asset:entry.assetId,amount,exact:true});a.releaseFrame();b.releaseFrame();
  }
  a.dispose();b.dispose();
 }
 console.log(JSON.stringify({checks:report.checks,frames:report.frames.length}));
}

async function browserChecks(){
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 report.images=[];report.runtime=[];report.sources=[];
 const manifest=JSON.parse(await readFile(`${baseline}/manifest.json`,'utf8'));
 const layout={format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<=5?3:0})),instances:['sakura-house','convenience','mitsuya','road-straight','road-corner','road-cross'].map((assetId,i)=>({id:`fixed-${i}`,assetId,x:3+i%3,z:3+Math.floor(i/3),rotation:i>=3?90:0}))};
 try{
  for(const dpr of [1,2])for(const variant of ['before','after']){
   const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:dpr});
   for(const [url,meta]of Object.entries(manifest)){
    let body=await readFile(variant==='before'?`${baseline}/${meta.file}`:`dist/${url}`,'utf8');
    if(url==='main.js'){
     assert(body.includes('frameId=requestAnimationFrame(draw);'));
     body=body.replace('time+=elapsedDt','time=0').replaceAll('frameId=requestAnimationFrame(draw);','if(!window.__transientManual)frameId=requestAnimationFrame(draw);')
      .replace('window.townEditor=Object.freeze',"window.__transientTick=draw;window.__transientRender=()=>{renderScene();return canvas.toDataURL('image/png');};window.townEditor=Object.freeze");
    }
    await context.route('**/'+url,r=>r.fulfill({status:200,contentType:'text/javascript',body}));
   }
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('PAGE_CRASH'));
   await page.addInitScript(layout=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout,environment:{time:'afternoon',weather:'clear',snowAmount:0}})),layout);
   await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
   await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();window.__transientManual=true;});await page.waitForTimeout(100);
   if(dpr===1){
    const sources=await page.evaluate(async()=>{
     const digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),x=>x.toString(16).padStart(2,'0')).join(''),result=[];
     for(let i=0;i<3;i++)for(let step=0;step<5;step++){
      const id=`fixed-${i}`;if(step>0&&step<4)townEditor.state.rotate(id);if(step===4)townEditor.state.move(id,3+i,5,0);
      const {asset,placement}=townEditor.sceneView.getInstances().find(e=>e.placement.id===id),{source}=asset.snow.getPreparationSource();
      result.push({asset:placement.assetId,rotation:placement.rotation,x:placement.x,z:placement.z,positions:await digest(source.positions),parts:await digest(source.parts)});
     }return result;
    });
    report.sources.push({variant,sources});if(variant==='after')assert.deepEqual(sources,report.sources[0].sources,'Real source changed after rotation/move');
    await page.evaluate(layout=>townEditor.loadLayout(layout),layout);
   }
   await page.evaluate(()=>townEditor.showOverview({immediate:true}));
   const set=async amount=>{
    await page.evaluate(a=>townEditor.environment.set({weather:'snow',snowAmount:a}),amount);
    await page.waitForFunction(a=>[townEditor.sceneView.getInspection().snow,...townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>e.asset.snow.getInspection())].every(s=>s.shown===a),amount,{timeout:90000});
    await page.evaluate(()=>{__transientTick(performance.now());__transientRender();__transientRender();});
   };
   const capture=async name=>{
    await page.evaluate(()=>{__transientTick(performance.now());__transientRender();__transientRender();});
    const png=Buffer.from((await page.evaluate(()=>__transientRender())).split(',')[1],'base64'),file=`${variant}-dpr${dpr}-${name}.png`;
    await writeFile(`${out}/${file}`,png);const item={variant,dpr,name,file,hash:hash(png),view:await page.evaluate(()=>({camera:__editor.cameraRig.getInspection(),lighting:__editor.inspection.lighting}))};report.images.push(item);
    if(variant==='after')assert.equal(item.hash,report.images.find(x=>x.variant==='before'&&x.dpr===dpr&&x.name===name).hash,`Image changed: ${file}`);
   };
   for(const amount of [.005,.12,.4,.75,1,.45]){
    await set(amount);
    if(dpr===1){
     const data=await page.evaluate(async()=>{
      const h=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),n=>n.toString(16).padStart(2,'0')).join('');
      const meshes=[];townEditor.root.traverse(n=>{if(n.name==='surface-snow'&&n.visible)meshes.push(n);});
      const geometries=[];for(const m of meshes){const g=m.geometry,attributes={};for(const [k,a]of Object.entries(g.attributes))attributes[k]=await h(a.array.subarray(0,a.count*a.itemSize));geometries.push({attributes,index:await h(g.index.array.subarray(0,g.index.count)),groups:g.groups});}
      const queries=[];for(let x=-28.03;x<14.5;x+=1.17)for(let z=-28.09;z<14.5;z+=1.19)queries.push(townEditor.weather.sampleSurface(x,z));
      const falls=[];for(const t of [0,.5,4,12,30]){townEditor.weather.update(t);falls.push(Array.from(__editor.scene.getObjectByName('全镇六角飘雪').instanceMatrix.array));}
      const preparation=townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>({asset:e.placement.assetId,mode:e.asset.snow.getInspection().preparationMode,fallback:e.asset.snow.getInspection().preparationFallback}));
      return {geometries,queries:await h(new TextEncoder().encode(JSON.stringify(queries))),flakes:await h(new TextEncoder().encode(JSON.stringify(falls))),queryCount:queries.length,preparation};
     });
     assert(data.preparation.every(x=>x.mode==='asset'&&!x.fallback),'Prepared source fingerprint changed');
     report.runtime.push({variant,amount,data});if(variant==='after')assert.deepEqual(data,report.runtime.find(x=>x.variant==='before'&&x.amount===amount).data,`Visible snow/query/flakes changed: ${amount}`);
    }
    if([.12,.4,1].includes(amount))for(const time of ['afternoon','night']){await page.evaluate(t=>townEditor.environment.set({time:t}),time);await capture(`${amount}-${time}`);}
   }
   await set(1);await page.evaluate(()=>__editor.cameraRig.focus('fixed-2',{immediate:true}));await capture('warm-snow-close');
   await page.evaluate(()=>townEditor.state.rotate('fixed-2'));await capture('rotated');
   assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);
   await page.evaluate(()=>townEditor.dispose());await context.close();console.log(`${variant} DPR${dpr} exact checks completed`);
  }
  assert.deepEqual(report.errors,[]);
 }finally{await browser.close();}
}
