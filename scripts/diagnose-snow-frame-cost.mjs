// Generate isolated request substitutions, then reuse the audited benchmark driver.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const arg=(k,d)=>process.argv.find(v=>v.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const version=arg('version','current'),variant=arg('variant','base'),count=Number(arg('count',6)),label=arg('label',`delivery-${version}-${variant}-${count}`);
const out=arg('out','artifacts/editor/snow-query-render-cost'),dir=`${out}/${label}-source`,glTiming=process.argv.includes('--gl-timing');
assert(['current','previous'].includes(version));assert(['base','no-shadows'].includes(variant));assert(/^[a-z0-9-]+$/.test(label));
await mkdir(dir,{recursive:false});
let files;
const source=arg('source','artifacts/editor/snow-query-render-cost/before-source');
const old=JSON.parse(await readFile(`${source}/manifest.json`,'utf8')),manifest={};
const replace=(body,from,to)=>{assert.equal(body.split(from).length,2,`Probe anchor must be unique: ${from}`);return body.replace(from,to);};
files=Object.keys(old);
for(const url of files){
 let body=await readFile(`${source}/${old[url].file}`,'utf8');
 const before=createHash('sha256').update(body).digest('hex');
 if(url==='main.js'){
  body=`globalThis.__sourceChecks={metrics:{},deliveries:[],gpu:{available:false,ms:[],disjoint:0},note:'Instrumented diagnostic, not benchmark; metrics overlap where nested'};
globalThis.__diagAdd=(name,ms,bytes=0)=>{const all=__sourceChecks.metrics,m=all[name]??(all[name]={count:0,totalMs:0,maxMs:0,totalBytes:0,maxBytes:0});m.count++;m.totalMs+=ms;m.maxMs=Math.max(m.maxMs,ms);m.totalBytes+=bytes;m.maxBytes=Math.max(m.maxBytes,bytes);};
globalThis.__diagTime=(name,run)=>{const t=performance.now();try{return run();}finally{__diagAdd(name,performance.now()-t);}};
`+body;
  for(const [from,to]of [
   ['shadows.update();renderer.info.reset();',"__diagTime('shadowScan',()=>shadows.update());renderer.info.reset();"],
   ['try{composer.render();}',"try{__diagTime('renderSubmit',()=>composer.render());}"],
   ['environment.advance(time);cameraRig.update(dt);sceneView.update(time);weather.update(time);lighting.update(cameraRig.controls.target,camera.position.distanceTo(cameraRig.controls.target));',"__diagTime('environment',()=>environment.advance(time));cameraRig.update(dt);__diagTime('sceneUpdate',()=>sceneView.update(time));__diagTime('weather',()=>weather.update(time));__diagTime('lighting',()=>lighting.update(cameraRig.controls.target,camera.position.distanceTo(cameraRig.controls.target)));"],
  ])body=replace(body,from,to);
  if(variant==='no-shadows')body=replace(body,'renderer.shadowMap.enabled=true','renderer.shadowMap.enabled=false');
  body=replace(body,'const cameraRig=createEditorCamera',`const diagGL=renderer.getContext(),diagExt=diagGL.getExtension('EXT_disjoint_timer_query_webgl2'),diagQueries=[];
  __sourceChecks.gpu.available=!!diagExt;
  function diagGpuBegin(){if(!diagExt)return null;while(diagQueries.length&&diagGL.getQueryParameter(diagQueries[0],diagGL.QUERY_RESULT_AVAILABLE)){const q=diagQueries.shift();if(!diagGL.getParameter(diagExt.GPU_DISJOINT_EXT)){if(__sourceChecks.gpu.ms.length<20000)__sourceChecks.gpu.ms.push(diagGL.getQueryParameter(q,diagGL.QUERY_RESULT)/1e6);}else __sourceChecks.gpu.disjoint++;diagGL.deleteQuery(q);}if(diagQueries.length>=8)return null;const q=diagGL.createQuery();diagGL.beginQuery(diagExt.TIME_ELAPSED_EXT,q);return q;}
  const cameraRig=createEditorCamera`);
  body=replace(body,"try{__diagTime('renderSubmit',()=>composer.render());}finally{scene.matrixWorldAutoUpdate=autoUpdate;}","const diagQuery=diagGpuBegin();try{__diagTime('renderSubmit',()=>composer.render());}finally{if(diagQuery){diagGL.endQuery(diagExt.TIME_ELAPSED_EXT);diagQueries.push(diagQuery);}scene.matrixWorldAutoUpdate=autoUpdate;}");
  if(glTiming)body=replace(body,'__sourceChecks.gpu.available=!!diagExt;',`__sourceChecks.gpu.available=!!diagExt;
  for(const name of ['bufferData','bufferSubData']){const original=diagGL[name].bind(diagGL);diagGL[name]=(...args)=>{const t=performance.now();try{return original(...args);}finally{const offset=name==='bufferData'?1:2,src=args[offset],length=args[offset+2],sourceOffset=args[offset+1]??0;const bytes=typeof src==='number'?src:src?.byteLength?(length?length*(src.BYTES_PER_ELEMENT||1):src.byteLength-sourceOffset*(src.BYTES_PER_ELEMENT||1)):0;__diagAdd('gl.'+name,performance.now()-t,bytes);}};}`);
 }
 if(url==='town/assets/shared/snow.js'){
  body=replace(body,'function updateGeometry(geometry,data,reuse){','function updateGeometry(geometry,data,reuse){const diagStart=performance.now();');
  body=replace(body,'geometry.computeBoundingSphere();','geometry.computeBoundingSphere();globalThis.__diagAdd?.("geometryCopyBounds",performance.now()-diagStart);');
  body=replace(body,"const installing=new Set(entry.batch.filter",`const diagStart=performance.now(),diagIncoming=Object.values(data).filter(a=>ArrayBuffer.isView(a)).reduce((s,a)=>s+a.byteLength,0);
    const installing=new Set(entry.batch.filter`);
  body=replace(body,'entry.batch=[];prune();finished(entry);entry.pump();',`entry.batch=[];prune();finished(entry);entry.pump();
    globalThis.__diagAdd?.('receiveInstall',performance.now()-diagStart,diagIncoming);
    const diag=globalThis.__sourceChecks;if(diag&&diag.deliveries.length<3000)diag.deliveries.push({at:performance.now(),key,amount:data.amount,ms:performance.now()-diagStart,reused:!!previous,incomingBytes:diagIncoming,frames:entry.frames.size,geometryBytes:Object.values(geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0)+geometry.index.array.byteLength,worker:data.stats.__diag});`);
 }
 if(url==='town/assets/shared/snow-surfaces.js'){
  body=replace(body,'  const count=indices?indices.length/3:data.length/9;','  const diagStart=performance.now();const count=indices?indices.length/3:data.length/9;');
  body=replace(body,'  return {sampleInto,sample:(x,z)=>sampleInto(x,z,{y:0,normal:new THREE.Vector3(),part:0})};',`  globalThis.__diagAdd?.('queryIndex',performance.now()-diagStart,offsets.byteLength+entries.byteLength+cursor.byteLength);
  return {sampleInto,sample:(x,z)=>sampleInto(x,z,{y:0,normal:new THREE.Vector3(),part:0})};`);
 }
 if(url==='town/assets/shared/snow-geometry.js'){
  body=replace(body,'inspect:()=>({...lastStats})','inspect:()=>({...lastStats,__diagPreparedBytes:[vertexData,faces,shared,occlusions].reduce((s,a)=>s+(a?.byteLength||0),0)})');
 }
 if(url==='town/assets/shared/snow-worker.js'){
  body=replace(body,'const stats=snow.setAmount(data.amount),frame=indexedFrame(snow.takeFrame(outputBuffer,true)),{positions,normals,colors,topIndices,parts,indices}=frame;',`const diagStart=performance.now(),stats=snow.setAmount(data.amount),diagGenerated=performance.now(),frame=indexedFrame(snow.takeFrame(outputBuffer,true)),{positions,normals,colors,topIndices,parts,indices}=frame;
    stats.__diag={generateMs:diagGenerated-diagStart,packMs:performance.now()-diagGenerated,preparedBytes:[...models.values()].reduce((s,m)=>s+(m.inspect().__diagPreparedBytes||0),0),workspaceBytes:[...workspace.values()].reduce((s,a)=>s+(a.data?.byteLength||0),0),recycleBytes:[...returnedBuffers.values()].reduce((s,a)=>s+a.byteLength,0),hashBytes:hashTable.byteLength+vertexRemap.byteLength,transferBytes:[positions,normals,colors,topIndices,parts,indices].reduce((s,a)=>s+a.byteLength,0)};`);
 }
 const file=url.replaceAll('/','__');await writeFile(`${dir}/${file}`,body,{flag:'wx'});manifest[url]={file,before,hash:createHash('sha256').update(body).digest('hex')};
}
await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const args=['scripts/diagnose-snow-memory.mjs','--bench',`--count=${count}`,'--limit=1800','--frame-ms=6000','--dynamic',`--rounds=${arg('rounds',1)}`,'--frame-work',`--source-dir=${dir}`,`--out=${out}`,`--label=${label}`];
console.log(JSON.stringify({command:['node',...args],instrumented:true}));
const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',resolve);});
process.exitCode=code??1;
