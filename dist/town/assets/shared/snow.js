import * as THREE from 'three';
import {indexPackedTriangles} from './snow-surfaces.js';

// One preparation per live model revision; immutable frames are reference counted.
// Materials and replacement parts belong to each instance. Zero snow starts no worker.
const sources=new Map(),jobs=new Map(),receivers=new Map();let surfaceRevision=0,activeJob=null,worker=null,nextToken=0;
function sharedWorker(){
  if(worker)return worker;
  worker=new Worker(new URL('./snow-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
    const entry=receivers.get(data.token);
    if(entry)entry.receive(data);
    // Deleted jobs still occupy the one worker until their result arrives.
    // Keep the queue bounded during rapid move/delete/undo operations.
    else if(activeJob?.token===data.token&&data.type!=='progress')finished(activeJob);
  };
  worker.onerror=event=>{for(const entry of receivers.values())entry.fail(event.message);};
  return worker;
}
function dispatch(){
  if(activeJob||!jobs.size)return;
  const [entry,start]=jobs.entries().next().value;jobs.delete(entry);
  if(sources.get(entry.key)!==entry){queueMicrotask(dispatch);return;}
  activeJob=entry;start();
}
function schedule(entry,start,firstFrame=false){
  if(firstFrame){const pending=[...jobs];jobs.clear();jobs.set(entry,start);for(const [e,run]of pending)if(e!==entry)jobs.set(e,run);}
  else jobs.set(entry,start);
  queueMicrotask(dispatch);
}
function finished(entry){if(activeJob===entry)activeJob=null;queueMicrotask(dispatch);}
function recycle(arrays){if(worker)worker.postMessage({type:'recycle',arrays},Object.values(arrays).map(a=>a.buffer));}
function releaseFrame(frame){
  frame.geometry.dispose();frame.lookups.clear();
  const arrays={positions:frame.geometry.attributes.position.array,normals:frame.geometry.attributes.normal.array,colors:frame.geometry.attributes.color.array,indices:frame.geometry.index.array,top:frame.top,parts:frame.parts};
  recycle(arrays);
}
function destroy(entry){
  jobs.delete(entry);receivers.delete(entry.token);worker?.postMessage({type:'release',token:entry.token});
  entry.frames.forEach(releaseFrame);entry.frames.clear();
  entry.batch=[];sources.delete(entry.key);
  if(!sources.size){worker?.terminate();worker=null;activeJob=null;}
  if(activeJob!==entry)queueMicrotask(dispatch);
}
export const getSnowMemoryInspection=()=>({sources:sources.size,workers:worker?1:0,queued:jobs.size,active:activeJob?.key??null,
  clients:[...sources.values()].reduce((n,e)=>n+e.clients.size,0),frames:[...sources.values()].reduce((n,e)=>n+e.frames.size,0)});
export const getSnowRevision=()=>surfaceRevision;
export const snowMaterial=()=>new THREE.MeshStandardMaterial({color:'#f6fafc',roughness:.98,metalness:0,vertexColors:true});
export function collectSnowSource(root,choose,groundBounds){
  root.updateWorldMatrix(true,true);
  const positions=[],parts=[];
  root.traverse(node=>{
    if(!node.isMesh||node.isInstancedMesh)return;
    for(let p=node;p&&p!==root;p=p.parent)if(!p.visible||p.userData.snowLayer||p.name==='樱家外部环境响应')return;
    const g=node.geometry,a=g.attributes.position;if(!a)return;
    // Local ancestry avoids cancellation noise from map translation/rotation;
    // support data and its fingerprint must be independent of instance placement.
    const matrix=new THREE.Matrix4();for(let p=node;p&&p!==root;p=p.parent)matrix.premultiply(p.matrix);
    const idx=g.index,count=idx?.count??a.count;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    const groups=Array.isArray(node.material)?g.groups:[{start:0,count,materialIndex:0}];
    const ancestry=[];for(let p=node;p&&p!==root;p=p.parent)ancestry.push(p.name);
    for(const group of groups){
      const material=materials[group.materialIndex];if(!material||material.transparent||material.depthWrite===false)continue;
      const end=Math.min(count,group.start+group.count,g.drawRange.start+g.drawRange.count);
      for(let i=Math.max(group.start,g.drawRange.start);i+2<end;i+=3){
        const v=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(a,idx?idx.getX(i+k):i+k).applyMatrix4(matrix));
        const cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area=cross.length()/2;
        if(cross.y<=1e-8)continue;
        const center=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);
        const part=area>.00005?choose({center,normal:cross.normalize(),color:material.color,name:ancestry.join('/'),vertices:v}):-1;
        for(const p of v){positions.push(p.x,p.y,p.z);parts.push(part);}
      }
    }
  });
  // The formal scene has a continuous row slab at y=0 under every building.
  // Include that real support beneath a recessed model lip, only in the source.
  if(groundBounds){
    const [a,b,c,d]=groundBounds,v=[[a,0,c],[a,0,d],[b,0,d],[a,0,c],[b,0,d],[b,0,c]];
    const part=choose({center:new THREE.Vector3((a+b)/2,0,(c+d)/2),normal:new THREE.Vector3(0,1,0),name:'plot-ground',vertices:[],color:null});
    for(const p of v){positions.push(...p);parts.push(part);}
  }
  return {positions:new Float32Array(positions),parts:new Int16Array(parts)};
}
function acquire(key,root,choose,options){
  if(sources.has(key))return sources.get(key);
  const source=collectSnowSource(root,choose,options.groundBounds),token=++nextToken;
  const entry={key,token,clients:new Set(),ready:false,busy:false,error:null,stats:{},frames:new Map(),batch:[]};sources.set(key,entry);receivers.set(token,entry);
  const prune=entry.prune=()=>{for(const [a,f] of entry.frames)if(!f.refs){releaseFrame(f);entry.frames.delete(a);}};
  entry.pump=()=>{
    if(!entry.ready||entry.busy||entry.error)return;
    const first=[...entry.clients].find(c=>c.desired>0&&c.frame?.amount!==c.desired);if(!first)return;
    const amount=first.desired;
    const cached=entry.frames.get(amount);
    if(cached){[...entry.clients].filter(c=>c.desired===amount).forEach(c=>c.install(cached));prune();entry.pump();return;}
    entry.busy=true;schedule(entry,()=>{
      const current=[...entry.clients].find(c=>c.desired>0&&c.frame?.amount!==c.desired);
      if(!current){entry.busy=false;finished(entry);return;}
      // Read the latest request when the job actually starts, not when queued.
      entry.batch=[...entry.clients].filter(c=>c.desired===current.desired);
      sharedWorker().postMessage({type:'amount',token,amount:current.desired});
    },!entry.frames.size);
  };
  const failed=entry.fail=message=>{entry.error=message;entry.busy=false;finished(entry);console.error(`积雪准备失败 (${key}): ${message}`);};
  entry.receive=data=>{
    if(data.type==='error'){failed(data.message);return;}entry.stats=data.stats;
    if(data.type==='progress')return;
    if(data.type==='ready'){entry.ready=true;finished(entry);entry.pump();return;}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));geometry.setAttribute('color',new THREE.BufferAttribute(data.colors,3));
    geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
    for(const g of data.groups)geometry.addGroup(g.start,g.count,g.materialIndex);geometry.computeBoundingSphere();
    const frame={amount:data.amount,geometry,top:data.top,parts:data.parts,lookups:new Map(),refs:0,stats:data.stats};
    entry.frames.set(data.amount,frame);entry.busy=false;
    // Show intermediate completed geometry, unless this client explicitly thawed to zero.
    for(const c of entry.batch)if(entry.clients.has(c)&&c.desired>0)c.install(frame);
    entry.batch=[];prune();finished(entry);entry.pump();
  };
  schedule(entry,()=>sharedWorker().postMessage({type:'init',token,...source,options},[source.positions.buffer,source.parts.buffer]));return entry;
}
export function createSnowLayer(root,{key,parts,choose,step=.25,sourceRoot=root,groundBounds=null,preparedURL=null}){
  const group=new THREE.Group();group.name='真实表面通用积雪';group.userData.snowLayer=true;root.add(group);
  const materials=parts.map(()=>snowMaterial()),empty=new THREE.BufferGeometry();
  const mesh=new THREE.Mesh(empty,materials);mesh.name='surface-snow';mesh.castShadow=!parts.every(p=>p.kind==='map');mesh.receiveShadow=true;mesh.visible=false;group.add(mesh);
  const replacements=new Map();let entry=null,amount=0,disposed=false;
  const client={desired:0,frame:null,install(frame){
    if(client.frame===frame)return;if(client.frame)client.frame.refs--;client.frame=frame;frame.refs++;surfaceRevision++;mesh.geometry=frame.geometry;mesh.visible=amount>0;
  }};
  const options={id:key,parts,step,groundBounds,minNormal:.15,preparedURL};
  function prepare(){if(!entry){entry=acquire(key,sourceRoot,choose,options);entry.clients.add(client);}}
  function release(){
    if(client.frame)client.frame.refs--;client.frame=null;mesh.geometry=empty;mesh.visible=false;
    if(entry){entry.clients.delete(client);entry.prune();if(!entry.clients.size)destroy(entry);entry=null;}
  }
  function setAmount(value){
    if(!Number.isFinite(value)||value<0||value>1)throw new RangeError('snowAmount 必须在 0～1 之间');if(disposed)return;
    if(value===0&&amount>0)surfaceRevision++;amount=value;client.desired=value===0?0:Math.round(value*200)/200||.005;
    for(const part of replacements.values())part.setAmount(value);
    if(!value){release();return;}
    prepare();
    mesh.visible=!!client.frame;entry.pump();
  }
  function sample(x,z){
    if(!amount||disposed)return null;let best=null;const frame=client.frame;
    if(frame&&mesh.visible){
      const disabled=[...replacements.keys()].sort(),mask=disabled.join('|');
      if(!frame.lookups.has(mask)){
        frame.lookups.set(mask,indexPackedTriangles(frame.top,frame.parts,new Set(disabled.map(id=>parts.findIndex(p=>p.id===id)))));
      }
      best=frame.lookups.get(mask).sample(x,z);
    }
    for(const p of replacements.values()){const hit=p.sample(x,z);if(hit&&(!best||hit.y>best.y))best=hit;}return best;
  }
  return {root:group,setAmount,sample,prepare,
    // Maintenance input for the offline preparation tool, collected only on demand.
    getPreparationSource:()=>({source:collectSnowSource(sourceRoot,choose,groundBounds),options}),
    replacePart(id,factory){
      const index=parts.findIndex(p=>p.id===id);if(index<0)throw new Error(`未知承雪部位：${id}`);
      const next=factory?.({snowAmount:amount});
      if(next&&(!next.root||typeof next.setAmount!=='function'||typeof next.sample!=='function'||typeof next.dispose!=='function'))throw new Error('专属雪层必须提供 root/setAmount/sample/dispose');
      next?.setAmount(amount);replacements.get(id)?.root.removeFromParent();replacements.get(id)?.dispose();replacements.delete(id);
      if(next){next.root.userData.snowLayer=true;group.add(next.root);replacements.set(id,next);}materials[index].visible=!next;surfaceRevision++;
    },
    getInspection:()=>({...client.frame?.stats,coverageRatio:mesh.visible?client.frame?.stats.coverageRatio??0:0,maxThickness:mesh.visible?client.frame?.stats.maxThickness??0:0,amount,shown:mesh.visible?client.frame?.amount??0:0,ready:entry?.ready??!amount,busy:entry?.busy??false,error:entry?.error??null,preparation:entry?.stats,
      parts:parts.map(p=>({id:p.id,mode:replacements.has(p.id)?'specialized':'generic'})),sharedClients:entry?.clients.size??0,
      memory:entry?{frames:entry.frames.size,inFlight:entry.busy?1:0,geometryBytes:[...entry.frames.values()].reduce((s,f)=>s+Object.values(f.geometry.attributes).reduce((n,a)=>n+a.array.buffer.byteLength,0)+(f.geometry.index?.array.byteLength||0)+f.top.byteLength+f.parts.byteLength,0),queryVariants:[...entry.frames.values()].reduce((s,f)=>s+f.lookups.size,0)}:null}),
    dispose(){
      if(disposed)return;disposed=true;group.removeFromParent();replacements.forEach(p=>p.dispose());replacements.clear();materials.forEach(m=>m.dispose());empty.dispose();
      release();
    }};
}
export const surfacePart=(id,kind='roof',maxDepth=.34)=>({id,kind,maxDepth,minNormal:kind==='shrub'?.12:.25,
  scale:kind==='shrub'?.12:.25,fillRadius:kind==='shrub'?.15:.13,fillLimit:kind==='shrub'?.15:.08});
export function attachSnow(asset,config){
  const snow=createSnowLayer(asset.root,{groundBounds:[-7,7,-7,7],...config}),set=asset.setEnvironment?.bind(asset),dispose=asset.dispose?.bind(asset);
  let environment={time:'afternoon',weather:'clear',snowAmount:0},disposed=false;
  asset.snow=snow;asset.setSnowSurface?.(snow.sample);
  asset.setEnvironment=patch=>{
    if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('建筑环境参数无效。');const next={...environment,...patch};
    if(!['morning','afternoon','dusk','night'].includes(next.time)||!['clear','rain','snow','hail','wind','leaves'].includes(next.weather))throw new Error('建筑环境值无效。');
    if(!Number.isFinite(next.snowAmount)||next.snowAmount<0||next.snowAmount>1)throw new Error('建筑雪量无效。');
    if(next.snowAmount!==environment.snowAmount)snow.setAmount(next.snowAmount);
    if(next.time!==environment.time||next.weather!==environment.weather)set?.(next);
    environment=next;return {...next,snowImplemented:true};
  };
  for(const key of ['getEnvironment','getEnvironmentState']){const inspect=asset[key]?.bind(asset);if(inspect)asset[key]=()=>({...inspect(),...environment,snowImplemented:true,snow:snow.getInspection()});}
  asset.dispose=()=>{if(disposed)return;disposed=true;snow.dispose();dispose?.();};return asset;
}
