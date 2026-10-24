// Isolated resource diagnosis; never opens a user's browser profile or formal map.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const arg=(key,fallback)=>process.argv.find(s=>s.startsWith(`--${key}=`))?.slice(key.length+3)??fallback;
const count=Number(arg('count',6)),label=arg('label','inventory'),out='artifacts/editor/resident-memory',exec=promisify(execFile);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const cdp=await browser.newBrowserCDPSession(),page=await browser.newPage({viewport:{width:1280,height:800}});
const report={count,label,samples:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
const save=()=>writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2)+'\n');
try{
  if(process.argv.includes('--single-target')){
    const source=await readFile('dist/main.js','utf8'),marker='composer.addPass(new OutputPass());';assert(source.includes(marker));
    await page.route('**/main.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:source.replace(marker,'const output=new OutputPass();output.needsSwap=false;composer.addPass(output);')}));
  }
  if(process.argv.includes('--workshops'))for(const path of ['sakura-house/geometry.js','mitsuya/workshop.js']){
    const source=await readFile('dist/town/assets/'+path,'utf8');
    const marker=path.startsWith('sakura')?'  function dispose(){':' let disposed=false;function dispose(){';assert(source.includes(marker));
    const probe=`root.userData.__ownedResourceInspection=()=>{const live=new Set();root.traverse(n=>{if(n.geometry)live.add(n.geometry);});const bytes=list=>{const a=new Set();for(const g of list)for(const v of [...Object.values(g.attributes),g.index].filter(Boolean))a.add(v.array.buffer);return [...a].reduce((n,b)=>n+b.byteLength,0);};return {owned:geometries.size,live:live.size,unused:[...geometries].filter(g=>!live.has(g)).length,ownedBytes:bytes(geometries),liveBytes:bytes(live),unusedBytes:bytes([...geometries].filter(g=>!live.has(g)))};};\n`;
    await page.route('**/town/assets/'+path,r=>r.fulfill({status:200,contentType:'text/javascript',body:source.replace(marker,probe+marker)}));
  }
  await page.addInitScript(count=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<3+Math.ceil(count/3)?3:0})),instances:Array.from({length:count},(_,i)=>({id:`memory-${i}`,assetId:['sakura-house','convenience','mitsuya'][i%3],x:3+i%3,z:3+Math.floor(i/3),rotation:0}))},environment:{time:'afternoon',weather:'clear',snowAmount:0}})),count);
  await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
  await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();townEditor.showOverview({immediate:true});});
  async function sample(stage){
    const data=await page.evaluate(async()=>{
      const result=[],allGeometries=new Set(),allAttributes=new Set(),allTextures=new Set(),allImages=new Set();
      const imageSize=t=>{const i=t.image;return i?[i.width??0,i.height??0]:[0,0];};
      async function inventory(root,id){
        const geometries=new Set(),textures=new Set(),materials=new Set(),attributes=new Set(),hashes=[];let nodes=0,meshes=0,drawnTriangles=0;
        root.traverse(n=>{nodes++;if(n.isMesh){meshes++;drawnTriangles+=(n.geometry.index?.count??n.geometry.attributes.position?.count??0)/3*(n.isInstancedMesh?n.count:1);}
          if(n.geometry)geometries.add(n.geometry);
          for(const m of !n.material?[]:Array.isArray(n.material)?n.material:[n.material]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}
        });
        for(const g of geometries){allGeometries.add(g);let bytes=0;const parts=[];
          for(const [name,a]of Object.entries({...g.attributes,...(g.index?{index:g.index}:{})})){const owner=a.isInterleavedBufferAttribute?a.data:a;attributes.add(owner);allAttributes.add(owner);bytes+=owner.array.byteLength;
            const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',owner.array)),b=>b.toString(16).padStart(2,'0')).join('');parts.push([name,a.itemSize,a.normalized,owner.array.constructor.name,hash]);}
          hashes.push({type:g.type,bytes,key:JSON.stringify(parts)});
        }
        for(const t of textures){allTextures.add(t);if(t.image)allImages.add(t.image);}
        return {id,nodes,meshes,drawnTriangles,owned:root.userData.__ownedResourceInspection?.(),geometries:geometries.size,materials:materials.size,attributes:attributes.size,geometryBytes:[...attributes].reduce((n,a)=>n+a.array.byteLength,0),textures:[...textures].map(t=>({name:t.name,size:imageSize(t),source:t.source.id,format:t.format,type:t.type,mipmaps:t.generateMipmaps})),hashes};
      }
      for(const {asset,placement}of townEditor.sceneView.getInstances())result.push(await inventory(asset.root,placement.id+':'+placement.assetId));
      const town=await inventory(__editor.scene,'scene');
      const duplicates=new Map();for(const g of town.hashes){const old=duplicates.get(g.key);if(old){old.count++;old.duplicateBytes+=g.bytes;}else duplicates.set(g.key,{type:g.type,bytes:g.bytes,count:1,duplicateBytes:0});}
      return {environment:townEditor.environment.get(),instances:result,town,unique:{geometries:allGeometries.size,attributes:allAttributes.size,bytes:[...allAttributes].reduce((n,a)=>n+a.array.byteLength,0),textures:allTextures.size,images:allImages.size,imageRGBABytes:[...allImages].reduce((n,i)=>n+(i.width??0)*(i.height??0)*4,0)},duplicates:[...duplicates.values()].filter(g=>g.count>1).sort((a,b)=>b.duplicateBytes-a.duplicateBytes),gpu:__editor.renderer.info.memory,pool:(await import('/town/assets/shared/snow.js')).getSnowMemoryInspection(),formal:localStorage.getItem('rainy-corner.editor.layout.v1')};
    });
    assert.equal(data.formal,null);
    const {processInfo}=await cdp.send('SystemInfo.getProcessInfo'),ids=processInfo.map(p=>p.id).filter(Number.isInteger).join(',');
    const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${ids} -ErrorAction SilentlyContinue | Select-Object Id,PrivateMemorySize64,WorkingSet64 | ConvertTo-Json -Compress; exit 0`]);
    const processes=[JSON.parse(stdout)].flat().map(p=>({type:processInfo.find(t=>t.id===p.Id)?.type,privateMiB:p.PrivateMemorySize64/1048576}));
    report.samples.push({stage,processes,...data});await save();
    console.log(JSON.stringify({stage,privateMiB:processes.reduce((n,p)=>n+p.privateMiB,0),unique:data.unique,duplicateGeometryMiB:data.duplicates.reduce((n,g)=>n+g.duplicateBytes,0)/1048576,instances:data.instances.map(i=>({id:i.id,bytes:i.geometryBytes,textures:i.textures.length,textureMiB:i.textures.reduce((n,t)=>n+t.size[0]*t.size[1]*4,0)/1048576,meshes:i.meshes}))}));
  }
  await page.waitForTimeout(1000);await sample('clear');
  if(process.argv.includes('--snow')){await page.evaluate(()=>townEditor.environment.set({weather:'snow',snowAmount:1}));await page.waitForFunction(()=>townEditor.sceneView.getInstances().every(e=>!e.asset.snow||e.asset.snow.getInspection().shown===1)&&townEditor.sceneView.getInspection().snow.shown===1,null,{timeout:90000});await sample('snow');}
  assert.deepEqual(report.errors,[]);report.completed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await save();await browser.close();}
