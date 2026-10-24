// Exact-data checks use the actual generator and prepared building supports.
// Browser checks use a fresh review context, never a user's browser profile.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decodePreparedSnow} from '../dist/town/assets/shared/snow-prepared.js';
import * as T from '../dist/vendor/three.module.js';
const out='artifacts/editor/snow-buffers',red=process.argv.includes('--red');
const tag=process.argv.find(a=>a.startsWith('--tag='))?.slice(6)||'';
const hash=a=>createHash('sha256').update(ArrayBuffer.isView(a)?Buffer.from(a.buffer,a.byteOffset,a.byteLength):a).digest('hex');
await mkdir(out,{recursive:true});
const report={red,frames:[],queries:[],errors:[]};
const uri=p=>pathToFileURL(process.cwd()+'/'+p).href;
async function baseline(name){
  let body=await readFile(`${out}/before-source/town__assets__shared__${name}`,'utf8');
  body=body.replaceAll('../../../vendor/three.module.js',uri('dist/vendor/three.module.js'));
  if(name==='snow-geometry.js')body=body.replace('./snow-surfaces.js',await baseline('snow-surfaces.js'));
  return 'data:text/javascript;base64,'+Buffer.from(body).toString('base64');
}
try{
 if(process.argv.includes('--lifecycle'))await lifecycleChecks();
 else if(process.argv.includes('--browser')||process.argv.includes('--gpu-red'))await browserChecks();
 else{
  const old=await import(await baseline('snow-geometry.js')),next=await import('../dist/town/assets/shared/snow-geometry.js');
  const oldQuery=await import(await baseline('snow-surfaces.js')),nextQuery=await import('../dist/town/assets/shared/snow-surfaces.js');
  const entries=JSON.parse(await readFile('artifacts/editor/snow-startup/prepared-data.json','utf8'));
  for(const entry of red?entries.filter(e=>e.assetId==='convenience'):entries){
    let config=await readFile(`dist/town/assets/${entry.assetId}/snow.js`,'utf8');
    config=config.replace("import {attachSnow,surfacePart} from '../shared/snow.js';",`import {surfacePart} from '${uri('dist/town/assets/shared/snow.js')}';const attachSnow=(_,c)=>c;`)
      .replace("new URL('./snow-support.bin.gz',import.meta.url).href","null");
    const factory=Object.values(await import('data:text/javascript;base64,'+Buffer.from(config).toString('base64')))[0];
    const options={minNormal:.15,groundBounds:[-7,7,-7,7],...factory({specification:{revision:'test'}})};
    const raw=gunzipSync(await readFile(`dist/town/assets/${entry.assetId}/snow-support.bin.gz`));
    const prepared=decodePreparedSnow(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),entry.fingerprint);
    const a=old.createSurfaceSnow(options,prepared,new Map()),b=next.createSurfaceSnow(options,prepared,new Map());
    for(const amount of red?[.4]:[.005,.12,.4,.75,1,.45]){
      a.setAmount(amount);b.setAmount(amount);const before=a.takeFrame(),after=b.takeFrame(undefined,true);
      assert(after.topIndices instanceof Uint32Array,'DUPLICATE_QUERY_COORDINATES: live frame still copies top coordinates');
      assert(!after.top,'Live indexed frame retained the coordinate copy');
      for(const key of ['positions','normals','colors','indices','parts'])assert.equal(hash(after[key]),hash(before[key]),`${entry.assetId} ${amount} ${key}`);
      const expanded=new Float32Array(after.topIndices.length*3);
      for(let i=0;i<after.topIndices.length;i++)for(let j=0;j<3;j++)expanded[i*3+j]=after.positions[after.topIndices[i]*3+j];
      assert.equal(hash(expanded),hash(before.top),'Query vertices changed');
      const entryResult={id:entry.assetId,amount,topTriangles:after.parts.length,beforeQueryBytes:before.top.byteLength,afterQueryBytes:after.topIndices.byteLength,exact:true};
      report.frames.push(entryResult);
      for(const disabled of [new Set(),new Set([0,2])]){
        const ref=oldQuery.indexPackedTriangles(before.top,before.parts,disabled),got=nextQuery.indexPackedTriangles(after.positions,after.parts,disabled,.5,{indices:after.topIndices});
        let count=0,hits=0;const xout={y:0,normal:new T.Vector3(),part:0},yout={y:0,normal:new T.Vector3(),part:0};
        const compare=(x,z)=>{const xh=ref.sampleInto(x,z,xout),yh=got.sampleInto(x,z,yout);assert.deepEqual(yh,xh,`${entry.assetId} ${amount} @${x},${z}`);count++;if(xh)hits++;};
        for(let i=0;i<1000;i++)compare(-7.2+((i*53.173)%14.4),-7.2+((i*37.199)%14.4));
        // Actual vertices, edge midpoints and tiny offsets cover narrow boundaries.
        for(let n=0;n<250&&before.top.length;n++){
          const i=(n*7919%after.parts.length)*9;
          for(const d of [0,-1e-9,1e-9]){compare(before.top[i]+d,before.top[i+2]-d);compare((before.top[i]+before.top[i+3])/2+d,(before.top[i+2]+before.top[i+5])/2);}
        }
        report.queries.push({id:entry.assetId,amount,disabled:[...disabled],count,hits,exact:true});
      }
      a.releaseFrame();b.releaseFrame();console.log(JSON.stringify(entryResult));
    }
    a.dispose();b.dispose();
  }
 }
  report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}
await writeFile(`${out}/${tag}${process.argv.includes('--lifecycle')?'lifecycle-checks':process.argv.includes('--gpu-red')?'gpu-red':process.argv.includes('--browser')?'browser-checks':red?'data-red':'data-checks'}.json`,JSON.stringify(report,null,2)+'\n');

async function lifecycleChecks(){
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
  report.lifecycle=await page.evaluate(async()=>{
   townEditor.dispose();const T=await import('three'),S=await import('/town/assets/shared/snow.js');
   const evidence=[],roots=[];const check=(ok,label,detail)=>{if(!ok)throw Error(label);evidence.push({label,detail});};
   const make=()=>{const root=new T.Group(),g=new T.BoxGeometry(2,.2,2),m=new T.MeshStandardMaterial();root.add(new T.Mesh(g,m));roots.push({g,m});return S.createSnowLayer(root,{key:'buffer-ownership-test',parts:[S.surfacePart('roof')],choose:()=>0,step:.12});};
   const settle=async(...layers)=>{const start=performance.now();while(layers.some(s=>s.getInspection().shown!==s.getInspection().amount)){
    if(layers.some(s=>s.getInspection().error)||performance.now()-start>20000)throw Error('Lifecycle settle timeout');await new Promise(r=>setTimeout(r,10));
   }};
   const mesh=s=>s.root.getObjectByName('surface-snow');
   const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',mesh(s).geometry.attributes.position.array)),n=>n.toString(16).padStart(2,'0')).join('');
   const a=make(),b=make();a.setAmount(.85);b.setAmount(.85);await settle(a,b);
   check(mesh(a).geometry===mesh(b).geometry,'same amount shares geometry');
   const oldHash=await hash(b),oldY=b.sample(0,0).y;a.setAmount(.86);await settle(a,b);
   check(mesh(a).geometry!==mesh(b).geometry&&await hash(b)===oldHash&&b.sample(0,0).y===oldY,'different amount retains exact prior geometry/query');
   b.setAmount(.86);await settle(a,b);check(mesh(a).geometry===mesh(b).geometry&&a.getInspection().memory.frames===1,'rejoining releases superseded frame');
   const identity=mesh(a).geometry.uuid;a.setAmount(.87);b.setAmount(.87);await settle(a,b);
   check(mesh(a).geometry.uuid===identity&&mesh(b).geometry.uuid===identity,'all owners advance with reused geometry');
   const thick=mesh(a).geometry.attributes.position.array.length;a.setAmount(.005);b.setAmount(.005);await settle(a,b);
   const thin=mesh(a).geometry.attributes.position.array.length;
   check(thin<thick*.35,'sparse snow shrinks reserved capacity',{thick,thin});
   a.setAmount(.9);b.setAmount(.9);await Promise.resolve();
   check(S.getSnowMemoryInspection().active==='buffer-ownership-test','cancellation happens while worker job is active');
   a.dispose();b.setAmount(0);b.dispose();
   const c=make();c.setAmount(.75);await settle(c);
   check(c.sample(0,0)?.y>.1&&c.getInspection().sharedClients===1,'replacement after in-flight cancellation has valid resources');
   c.dispose();await new Promise(r=>setTimeout(r,30));
   const pool=S.getSnowMemoryInspection();check(pool.sources===0&&pool.frames===0&&pool.workers===0&&pool.clients===0,'final owner releases worker and frames',pool);
   roots.forEach(({g,m})=>{g.dispose();m.dispose();});
   check(localStorage.getItem('rainy-corner.editor.layout.v1')===null,'formal save key untouched');return evidence;
  });
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report.lifecycle));
 }finally{await browser.close();}
}

async function browserChecks(){
 const {chromium}=await import('playwright'),gpuRed=process.argv.includes('--gpu-red');
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 report.images=[];report.runtime=[];report.lifecycle=[];
 try{
  for(const dpr of gpuRed?[1]:[1,2])for(const variant of gpuRed?['before']:['before','after']){
   const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:dpr});
   const manifest=JSON.parse(await readFile(`${out}/before-source/manifest.json`,'utf8'));
   for(const [url,meta]of Object.entries(manifest)){
    let body=await readFile(variant==='before'?`${out}/before-source/${meta.file}`:`dist/${url}`,'utf8');
    if(url==='main.js')body=body.replace('time+=elapsedDt','time=0').replaceAll('frameId=requestAnimationFrame(draw);','if(!window.__bufferManual)frameId=requestAnimationFrame(draw);')
      .replace('window.townEditor=Object.freeze',"window.__bufferTick=draw;window.__bufferRender=()=>{renderScene();return canvas.toDataURL('image/png');};window.townEditor=Object.freeze");
    await context.route('**/'+url,r=>r.fulfill({status:200,contentType:'text/javascript',body}));
   }
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('crash',()=>report.errors.push('PAGE_CRASH'));
   await page.addInitScript(()=>{
    window.__buffersCreated=0;const p=WebGL2RenderingContext.prototype,original=p.createBuffer;
    p.createBuffer=function(...args){window.__buffersCreated++;return original.apply(this,args);};
   });
   await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
   await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();window.__bufferManual=true;});await page.waitForTimeout(100);
   const set=async amount=>{
    await page.evaluate(a=>townEditor.environment.set({weather:'snow',snowAmount:a}),amount);
    await page.waitForFunction(a=>[townEditor.sceneView.getInspection().snow,...townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>e.asset.snow.getInspection())].every(s=>s.shown===a),amount,{timeout:90000});
    await page.evaluate(()=>{__bufferTick(performance.now());__bufferRender();__bufferRender();});
   };
   const identities=()=>page.evaluate(()=>{const ids=[];townEditor.root.traverse(n=>{if(n.name==='surface-snow'&&n.visible)ids.push(n.geometry.uuid)});return {ids,created:window.__buffersCreated};});
   await set(1);await set(.85);await set(.86);const start=await identities();await set(.87);await set(.88);const end=await identities();
   report.runtime.push({variant,dpr,stableGeometry:JSON.stringify(start.ids)===JSON.stringify(end.ids),newBuffers:end.created-start.created});
   if(gpuRed||variant==='after'){assert.deepEqual(end.ids,start.ids,'SNOW_GPU_REALLOCATION: unchanged-capacity snow replaces geometry');assert.equal(end.created-start.created,0,'Snow still allocated new GL buffers');}
   if(gpuRed)continue;
   async function capture(name){
    await page.evaluate(()=>{__bufferTick(performance.now());__bufferRender();__bufferRender();});
    const png=Buffer.from((await page.evaluate(()=>__bufferRender())).split(',')[1],'base64');
    const file=`${tag}${variant}-dpr${dpr}-${name}.png`;await writeFile(`${out}/${file}`,png);
    const item={variant,dpr,name,file,hash:hash(png)};report.images.push(item);
    if(variant==='after'){
     const before=report.images.find(i=>i.variant==='before'&&i.dpr===dpr&&i.name===name),old=await readFile(`${out}/${before.file}`);
     item.difference={pixels:0,maxChannelDelta:0};
     if(hash(old)!==hash(png))item.difference=await page.evaluate(async urls=>{
      const ims=await Promise.all(urls.map(async src=>{const im=new Image();im.src=src;await im.decode();return im;}));
      const c=document.createElement('canvas');c.width=ims[0].width;c.height=ims[0].height;const ctx=c.getContext('2d'),a=[];
      for(const im of ims){ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(im,0,0);a.push(ctx.getImageData(0,0,c.width,c.height).data);}
      let pixels=0,maxChannelDelta=0;for(let i=0;i<a[0].length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(a[0][i+j]-a[1][i+j]);changed||=d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);}if(changed)pixels++;}return {pixels,maxChannelDelta};
     },[old,png].map(b=>'data:image/png;base64,'+b.toString('base64')));
     assert(item.difference.maxChannelDelta<=1,`Image changed: ${file} ${JSON.stringify(item.difference)}`);
    }
   }
   for(const amount of [.005,.12,.4,.75,1,.45]){
    await set(amount);
    if(dpr===1){
     const data=await page.evaluate(async()=>{
      const h=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),n=>n.toString(16).padStart(2,'0')).join('');
      const meshes=[];townEditor.root.traverse(n=>{if(n.name==='surface-snow'&&n.visible)meshes.push(n);});
      const geometries=[];
      for(const m of meshes){const g=m.geometry,attributes={};for(const [k,a]of Object.entries(g.attributes))attributes[k]=await h(a.array.subarray(0,a.count*a.itemSize));
       geometries.push({attributes,index:await h(g.index.array.subarray(0,g.index.count)),groups:g.groups});}
      const queries=[];for(let x=-28.03;x<14.5;x+=1.17)for(let z=-28.09;z<14.5;z+=1.19)queries.push(townEditor.weather.sampleSurface(x,z));
      const falls=[];for(const t of [0,.5,4,12,30]){townEditor.weather.update(t);falls.push(Array.from(__editor.scene.getObjectByName('全镇六角飘雪').instanceMatrix.array));}
      return {geometries,queries:await h(new TextEncoder().encode(JSON.stringify(queries))),flakes:await h(new TextEncoder().encode(JSON.stringify(falls))),queryCount:queries.length};
     });
     const item={variant,dpr,amount,...data};report.runtime.push(item);
     if(variant==='after'){const before=report.runtime.find(i=>i.variant==='before'&&i.amount===amount&&i.dpr===dpr);assert.deepEqual(data,{geometries:before.geometries,queries:before.queries,flakes:before.flakes,queryCount:before.queryCount},`Live frame/query/flakes changed at ${amount}`);}
    }
    if([.12,.4,1].includes(amount))for(const time of ['afternoon','night']){await page.evaluate(t=>townEditor.environment.set({time:t}),time);await capture(`${amount}-${time}`);}
   }
   await set(1);await page.evaluate(()=>__editor.cameraRig.focus('review-mitsuya',{immediate:true}));await capture('warm-snow-close');
   await page.evaluate(()=>townEditor.state.rotate('review-mitsuya'));await capture('rotated');
   assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);
   await page.evaluate(()=>townEditor.dispose());await context.close();console.log(`${variant} DPR${dpr}: browser checks completed`);
  }
  assert.deepEqual(report.errors,[]);
 }finally{await browser.close();}
}
