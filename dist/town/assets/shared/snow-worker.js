import * as THREE from '../../../vendor/three.module.js';
import {createSurfaceSnow,mixVertexHash} from './snow-geometry.js';
import {snowSourceFingerprint,decodePreparedSnow} from './snow-prepared.js';
// A single heap reuses temporary computation memory across model revisions.
const models=new Map(),workspace=new Map();
const returnedBuffers=new Map();
function outputBuffer(name,Type,length){
  const old=returnedBuffers.get(name);
  // A small shop/ground frame must not retain a large house's entire allocation.
  if(old?.length>=length&&old.length<=Math.max(1024,length*1.25)){returnedBuffers.delete(name);return old.subarray(0,length);}
  if(old&&old.length<length)returnedBuffers.delete(name);
  return new Type(length);
}
let hashTable=new Int32Array(),vertexRemap=new Uint32Array();
let loadingToken=null,cancelled=false;
// Exact bitwise vertex sharing. Triangle order, groups, positions and shading are
// unchanged; only duplicate GPU/transfer attributes are removed.
function indexedFrame(frame){
  const arrays=[frame.positions,frame.normals,frame.colors],bits=arrays.map(a=>new Uint32Array(a.buffer,a.byteOffset,a.length));
  const count=arrays[0].length/3;let capacity=16;while(capacity<count*1.25)capacity*=2;
  if(hashTable.length<capacity)hashTable=new Int32Array(capacity);
  if(vertexRemap.length<count)vertexRemap=new Uint32Array(count);
  const table=hashTable.subarray(0,capacity);table.fill(-1);
  const remap=vertexRemap,indices=outputBuffer('indices',Uint32Array,frame.indices.length);let unique=0;
  for(let i=0;i<count;i++){
    let hash=2166136261;
    for(const a of bits)for(let j=0;j<3;j++)hash=Math.imul(hash^a[i*3+j],16777619);
    hash=mixVertexHash(hash);
    let slot=hash&(capacity-1);
    while(table[slot]>=0){
      const other=table[slot];let equal=true;
      for(const a of bits)for(let j=0;j<3;j++)if(a[i*3+j]!==a[other*3+j])equal=false;
      if(equal)break;slot=(slot+1)&(capacity-1);
    }
    if(table[slot]<0){table[slot]=i;remap[i]=unique++;}else remap[i]=remap[table[slot]];
  }
  for(let i=0;i<indices.length;i++)indices[i]=remap[frame.indices[i]];
  const packed=['positions','normals','colors'].map(name=>outputBuffer(name,Float32Array,unique*3));
  for(let i=0;i<count;i++)for(let a=0;a<arrays.length;a++)for(let j=0;j<3;j++)packed[a][remap[i]*3+j]=arrays[a][i*3+j];
  return {...frame,positions:packed[0],normals:packed[1],colors:packed[2],indices};
}
self.onmessage=async({data})=>{
  const token=data.token,send=(message,transfer)=>self.postMessage({token,...message},transfer);
  try{
    if(data.type==='recycle'){
      if([...models.values()].every(s=>s.getAmount()===1))return;
      for(const [name,array]of Object.entries(data.arrays)){
        const full=new array.constructor(array.buffer),old=returnedBuffers.get(name);
        if(!old||old.length<full.length)returnedBuffers.set(name,full);
      }
      return;
    }
    if(data.type==='release'){if(loadingToken===token)cancelled=true;models.get(token)?.dispose();models.delete(token);return;}
    if(data.type==='init'){
      loadingToken=token;cancelled=false;let prepared,preparationFallback=null;
      const started=performance.now();
      if(data.options.preparedURL){
        try{
          const fingerprint=await snowSourceFingerprint(data,data.options);
          const response=await fetch(data.options.preparedURL,{signal:AbortSignal.timeout(4000)});
          if(!response.ok)throw new Error(`HTTP ${response.status}`);
          const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
          prepared=decodePreparedSnow(buffer,fingerprint);
          prepared.bakePreparationMs=prepared.preparationMs;prepared.preparationMs=performance.now()-started;
        }catch(error){preparationFallback=error.message;}
      }
      if(cancelled){loadingToken=null;send({type:'ready',stats:{cancelled:true}});return;}
      let root,geometry,material;
      if(!prepared){
        root=new THREE.Group();geometry=new THREE.BufferGeometry();material=new THREE.MeshBasicMaterial();
        geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
        geometry.setAttribute('snowPart',new THREE.BufferAttribute(data.parts,1));root.add(new THREE.Mesh(geometry,material));
      }
      const snow=createSurfaceSnow({...data.options,preparationMode:prepared?'asset':'generated',preparationFallback,progress:stats=>send({type:'progress',stats}),root},prepared,workspace);
      geometry?.dispose();material?.dispose();loadingToken=null;
      models.set(token,snow);send({type:'ready',stats:snow.inspect()});return;
    }
    const snow=models.get(token);if(!snow)return;
    const stats=snow.setAmount(data.amount),frame=indexedFrame(snow.takeFrame(outputBuffer)),{positions,normals,colors,top,parts,indices}=frame;
    snow.releaseFrame();
    stats.uniqueVertices=positions.length/3;
    send({type:'mesh',amount:data.amount,...frame,stats},
      [positions.buffer,normals.buffer,colors.buffer,top.buffer,parts.buffer,indices.buffer]);
    // Full snow is stationary. Retain its actual displayed surface and prepared
    // support, but no generation scratch or unused transport allocations.
    if(data.amount===1&&[...models.values()].every(s=>s.getAmount()===1)){
      workspace.clear();returnedBuffers.clear();hashTable=new Int32Array();vertexRemap=new Uint32Array();
    }
  }catch(error){send({type:'error',message:error.stack});}
};
