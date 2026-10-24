// Offline, read-only inputs. A new summary filename is required on each run.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='artifacts/editor/memory-independent-20261024',name=process.argv[2]??'summary';
assert(/^[a-z0-9-]+$/.test(name));
const MiB=1048576,mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
const summary={created:new Date().toISOString(),residency:[],delivery:[],integrity:[],audit:{samples:0,duplicatePidSamples:0,missingPidSamples:0,nonNullFormal:0},historical:[]};
for(const f of await readdir(dir)){
 if(!f.endsWith('.json'))continue;const r=JSON.parse(await readFile(`${dir}/${f}`,'utf8'));if(!r.label||!r.samples)continue;
 for(const s of r.samples){summary.audit.samples++;if(new Set(s.processes.map(p=>p.pid)).size!==s.processes.length)summary.audit.duplicatePidSamples++;if(s.missingIds?.length)summary.audit.missingPidSamples++;if(s.scene?.formal!=null)summary.audit.nonNullFormal++;}
 const item={label:r.label,count:r.count,kind:r.kind,variant:r.variant,completed:r.completed??false,failure:r.failure??null,errors:r.errors,samples:r.samples.map(s=>({stage:s.stage,privateMiB:s.privateMiB,gpuMiB:s.processes.filter(p=>p.type==='GPU').reduce((n,p)=>n+p.privateMiB,0),rendererMiB:s.processes.filter(p=>p.type==='renderer').reduce((n,p)=>n+p.privateMiB,0),mainHeapMiB:s.main.usedSize/MiB,mainBackingMiB:s.main.backingStorageSize/MiB,workers:s.workers?.map(w=>({heapMiB:w.usedSize/MiB,backingMiB:w.backingStorageSize/MiB})),pool:s.scene?.pool}))};
 if(typeof r.inventory==='object'){
  const {scene,instances,targets}=r.inventory;
  item.inventory={scene:{...scene,images:undefined},instances:instances.map(i=>({...i,images:undefined})),targets,unusedSeparateBytes:instances.reduce((s,i)=>s+(i.owned?.unusedBytes??0),0)};
  // Logical payload only: RGBA16F=8 bytes, RGBA8=4; assume D24/32 depth=4.
  // Excludes alignment, driver copies/default canvas. Not an actual VRAM reading.
  item.inventory.estimatedTargetMiB=targets.filter(t=>t.allocated).reduce((s,t)=>{const color=t.textures.reduce((n,x)=>n+(x.type===1016?8:4),0);return s+t.width*t.height*(color+(t.depthBuffer?4:0))*(t.samples?t.samples+1:1);},0)/MiB;
 }
 if(r.label.startsWith('delivery-')){
  item.phases=[];for(let i=1;i<r.samples.length;i++){
   const cur=r.samples[i],prev=r.samples[i-1],a=cur.scene.sourceChecks,b=prev.scene.sourceChecks;if(!a||!b)continue;
   const metrics={};for(const [k,m]of Object.entries(a.metrics)){const before=b.metrics[k]??{count:0,totalMs:0,totalBytes:0};const count=m.count-before.count,totalMs=m.totalMs-before.totalMs;metrics[k]={count,totalMs,meanMs:count?totalMs/count:0,totalMiB:(m.totalBytes-before.totalBytes)/MiB};}
   const gpu=a.gpu.ms.slice(b.gpu.ms.length),deliveries=a.deliveries.slice(b.deliveries.length),sorted=[...gpu].sort((a,b)=>a-b);
   item.phases.push({stage:cur.stage,intervalSeconds:cur.seconds-prev.seconds,raf:r.performance?.find(p=>p.stage===cur.stage),metrics,gpu:{available:a.gpu.available,count:gpu.length,meanMs:mean(gpu),p95Ms:sorted[Math.floor(sorted.length*.95)]??null,disjoint:a.gpu.disjoint-b.gpu.disjoint},deliveries:{count:deliveries.length,reused:deliveries.filter(d=>d.reused).length,meanReceiveMs:mean(deliveries.map(d=>d.ms)),maxIncomingMiB:deliveries.length?Math.max(...deliveries.map(d=>d.incomingBytes/MiB)):null,worker:deliveries.filter(d=>d.worker).map(d=>({key:d.key,amount:d.amount,...d.worker}))}});
  }summary.delivery.push(item);
 }else summary.residency.push(item);
}
const integrity=JSON.parse(await readFile('artifacts/editor/snow-transient/final-integrity.json','utf8'));
for(const x of integrity.runtime){const current=createHash('sha256').update(await readFile(x.file)).digest('hex');summary.integrity.push({file:x.file,expected:x.after,current,unchanged:current===x.after});}
for(const label of ['before-6','before-6-repeat','after-6','after-6-repeat','before-12','before-12-repeat','after-12','after-12-repeat']){
 const r=JSON.parse(await readFile(`artifacts/editor/snow-transient/${label}.json`,'utf8'));summary.historical.push({label,count:r.count,peakMiB:Math.max(...r.samples.map(s=>s.privateMiB)),clear:r.samples.filter(s=>s.stage==='clear-steady').map(s=>s.privateMiB),completed:r.completed??false,errors:r.errors});
}
await writeFile(`${dir}/${name}.json`,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file:`${dir}/${name}.json`,residency:summary.residency.length,delivery:summary.delivery.length,audit:summary.audit,integrity:summary.integrity.every(x=>x.unchanged)}));
for(const r of summary.delivery)console.log(JSON.stringify({label:r.label,phases:r.phases.filter(p=>['snow-accumulating','rain-melting'].includes(p.stage)).map(p=>({...p,deliveries:{...p.deliveries,worker:undefined},raf:{fps:p.raf?.fps,p95Ms:p.raf?.p95Ms,work:p.raf?.work}}))}));
