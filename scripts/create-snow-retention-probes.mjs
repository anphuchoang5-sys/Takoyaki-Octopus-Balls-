// Diagnosis-only source substitutions. Nothing below writes dist/ or storage.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const dir='artifacts/editor/snow-retention',relative='town/assets/shared/snow-geometry.js';
const source=await readFile(`dist/${relative}`,'utf8');
const original='const quantize=n=>{const q=Math.round(Number(n.toFixed(6))*1e6);return q===0&&n<0?-2147483648:q;};';
// The interval check falls back at decimal half ties. It deliberately keeps
// toFixed semantics, including negative zero, outside the proven fast range.
const expression=`n=>{
      const scaled=Math.abs(n)*1e6,rounded=Math.floor(scaled+.5);
      const q=scaled<2147483647&&Math.abs(scaled-(rounded-.5))>Math.max(1,scaled)*Number.EPSILON*2
        ?(n<0?-rounded:rounded):Math.round(Number(n.toFixed(6))*1e6);
      return q===0&&n<0?-2147483648:q;
    }`;
const old=n=>{const q=Math.round(Number(n.toFixed(6))*1e6);return q===0&&n<0?-2147483648:q;};
const fast=Function(`return (${expression})`)();let checked=0,seed=74123;
function check(n){assert(Object.is(old(n),fast(n)),`quantize mismatch at ${n}`);checked++;}
for(let i=0;i<500000;i++){
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=(seed/4294967296-.5)*5000;check(n);
 const half=(Math.floor(n*1e6)+.5)/1e6;
 for(const sign of [-1,1])for(const shift of [-2,-1,0,1,2])check(sign*(half+shift*Math.max(1,Math.abs(half))*Number.EPSILON));
}
for(const n of [0,-0,5e-7,-5e-7,1e-8,-1e-8,1e21,-1e21,NaN,Infinity,-Infinity])check(n);
assert.equal(source.split(original).length,2);
async function variant(name,files){
 const path=`${dir}/${name}`;await mkdir(path,{recursive:true});const manifest={};
 for(const [url,body]of Object.entries(files)){
  const file=url.replaceAll('/','__');await writeFile(`${path}/${file}`,body);
  manifest[url]={file,hash:createHash('sha256').update(body).digest('hex')};
 }
 await writeFile(`${path}/manifest.json`,JSON.stringify(manifest,null,2));
}
await variant('numeric-quantize',{[relative]:source.replace(original,`const quantize=${expression};`)});
const workerPath='town/assets/shared/snow-worker.js',worker=await readFile(`dist/${workerPath}`,'utf8');
const reset='workspace.clear();returnedBuffers.clear();hashTable=new Int32Array();vertexRemap=new Uint32Array();';
assert.equal(worker.split(reset).length,2);
await variant('keep-scratch',{[workerPath]:worker.replace(reset,'/* Diagnostic only: keep bounded serial scratch until worker termination. */')});
const collectorPath='town/assets/shared/snow.js',collector=await readFile(`dist/${collectorPath}`,'utf8');
const begin=collector.indexOf('export function collectSnowSource('),end=collector.indexOf('\nfunction acquire(',begin),oldCollector=collector.slice(begin,end);
assert(begin>=0&&end>begin);
let packedCollector=oldCollector.replace('const positions=[],parts=[];',`let positions=new Float32Array(12288),parts=new Int16Array(4096),used=0;
  const v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],cross=new THREE.Vector3(),edge=new THREE.Vector3(),center=new THREE.Vector3();
  function append(x,y,z,part){
    if(used===parts.length){const p=new Float32Array(positions.length*2),s=new Int16Array(parts.length*2);p.set(positions);s.set(parts);positions=p;parts=s;}
    positions[used*3]=x;positions[used*3+1]=y;positions[used*3+2]=z;parts[used++]=part;
  }`)
 .replace('const v=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(a,idx?idx.getX(i+k):i+k).applyMatrix4(matrix));','for(let k=0;k<3;k++)v[k].fromBufferAttribute(a,idx?idx.getX(i+k):i+k).applyMatrix4(matrix);')
 .replace('const cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area=cross.length()/2;','cross.copy(v[1]).sub(v[0]).cross(edge.copy(v[2]).sub(v[0]));const area=cross.length()/2;')
 .replace('const center=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);','center.copy(v[0]).add(v[1]).add(v[2]).multiplyScalar(1/3);')
 .replace('for(const p of v){positions.push(p.x,p.y,p.z);parts.push(part);}','for(const p of v)append(p.x,p.y,p.z,part);')
 .replace('for(const p of v){positions.push(...p);parts.push(part);}','for(const p of v)append(p[0],p[1],p[2],part);')
 .replace('return {positions:new Float32Array(positions),parts:new Int16Array(parts)};','return {positions:positions.slice(0,used*3),parts:parts.slice(0,used)};');
assert(!packedCollector.includes('positions.push'));
await variant('packed-source',{[collectorPath]:collector.replace(oldCollector,packedCollector)});
const checkedCollector=oldCollector.replace('export function collectSnowSource','function referenceCollector')+'\n'+packedCollector.replace('export function collectSnowSource','function packedCollector')+`
export function collectSnowSource(...args){
 const a=referenceCollector(...args),b=packedCollector(...args);
 for(const k of ['positions','parts']){if(a[k].length!==b[k].length)throw Error('Source length changed');for(let i=0;i<a[k].length;i++)if(!Object.is(a[k][i],b[k][i]))throw Error('Source data changed at '+k+i);}
 globalThis.__sourceChecks=(globalThis.__sourceChecks||0)+1;return b;
}`;
await variant('verify-packed-source',{[collectorPath]:collector.replace(oldCollector,checkedCollector)});
await writeFile(`${dir}/quantize-differential.json`,JSON.stringify({checked,pass:true,sourceHash:createHash('sha256').update(source).digest('hex'),formalChanged:false},null,2));
console.log({checked,pass:true,variants:['numeric-quantize','keep-scratch','packed-source','verify-packed-source'],formalChanged:false});
if(process.argv.includes('--geometry')){
 const uri=p=>pathToFileURL(`${process.cwd()}/${p}`).href;
 const load=body=>import('data:text/javascript;base64,'+Buffer.from(body.replaceAll('../../../vendor/three.module.js',uri('dist/vendor/three.module.js')).replaceAll('./snow-surfaces.js',uri('dist/town/assets/shared/snow-surfaces.js'))).toString('base64'));
 const before=await load(source),after=await load(source.replace(original,`const quantize=${expression};`));
 const {decodePreparedSnow}=await import('../dist/town/assets/shared/snow-prepared.js');
 const entries=JSON.parse(await readFile('artifacts/editor/snow-startup/prepared-data.json','utf8')),frames=[];
 const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
 for(const entry of entries){
  let config=await readFile(`dist/town/assets/${entry.assetId}/snow.js`,'utf8');
  config=config.replace("import {attachSnow,surfacePart} from '../shared/snow.js';",`import {surfacePart} from '${uri('dist/town/assets/shared/snow.js')}';const attachSnow=(_,c)=>c;`).replace("new URL('./snow-support.bin.gz',import.meta.url).href","null");
  const factory=Object.values(await import('data:text/javascript;base64,'+Buffer.from(config).toString('base64')))[0];
  const options={minNormal:.15,groundBounds:[-7,7,-7,7],...factory({specification:{revision:'test'}})};
  const raw=gunzipSync(await readFile(`dist/town/assets/${entry.assetId}/snow-support.bin.gz`));
  const prepared=decodePreparedSnow(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),entry.fingerprint);
  const a=before.createSurfaceSnow(options,prepared,new Map()),b=after.createSurfaceSnow(options,prepared,new Map());
  for(const amount of [.005,.12,.4,.75,1,.45]){
   a.setAmount(amount);b.setAmount(amount);const x=a.takeFrame(undefined,true),y=b.takeFrame(undefined,true);
   for(const field of ['positions','normals','colors','indices','parts','topIndices'])assert.equal(hash(x[field]),hash(y[field]),`${entry.assetId}/${amount}/${field}`);
   assert.deepEqual(x.groups,y.groups);frames.push({asset:entry.assetId,amount,exact:true});a.releaseFrame();b.releaseFrame();
  }
  a.dispose();b.dispose();
 }
 await writeFile(`${dir}/quantize-geometry.json`,JSON.stringify({frames,pass:true},null,2));console.log({geometryFrames:frames.length,exact:true});
}
