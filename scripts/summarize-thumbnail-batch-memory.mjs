import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/editor/thumbnail-batch-memory',mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
const report={protocol:{viewport:[1280,800],dpr:1,rounds:3,frameMs:6000,limitMiB:1800,protectiveStopMiB:1900,memory:'sum of CDP-listed process PrivateMemorySize64 / 1048576, stage samples',fps:'RAF callback FPS; arithmetic mean of matching stage windows'},runs:[],comparisons:[]};
for(const count of [6,12])for(const variant of ['before','after'])for(const repeat of ['a','b']){
 const label=`${variant}-${count}-${repeat}`,r=JSON.parse(await readFile(`${out}/${label}.json`,'utf8'));
 assert(r.count===count&&r.rounds===3&&r.dpr===1&&r.frameDuration===6000&&!r.bufferInstrumentation&&!r.clearGC);
 for(const s of r.samples)assert.equal(new Set(s.processes.map(p=>p.pid)).size,s.processes.length);
 const stages={};for(const p of r.performance??[])(stages[p.stage]??=[]).push({fps:p.fps,p95Ms:p.p95Ms,maxMs:p.maxMs,calls:p.render.calls,triangles:p.render.triangles});
 report.runs.push({label,count,variant,repeat,completed:r.completed??false,red:r.red,failure:r.failure??null,errors:r.errors,browser:r.browser,backend:r.backend,clearMiB:r.samples.find(s=>s.stage==='clear-steady')?.privateMiB,peakMiB:Math.max(...r.samples.map(s=>s.privateMiB)),finalMiB:r.samples.at(-1)?.privateMiB,seconds:r.samples.at(-1)?.seconds,stages,release:r.samples.filter(s=>/clear-\d-released/.test(s.stage)).map(s=>({stage:s.stage,privateMiB:s.privateMiB,pool:s.scene.pool}))});
}
for(const count of [6,12]){
 const groups=Object.fromEntries(['before','after'].map(v=>[v,report.runs.filter(r=>r.count===count&&r.variant===v)])),comparison={count};
 for(const [v,rs]of Object.entries(groups))comparison[v]={clearMiB:mean(rs.map(r=>r.clearMiB)),peakMiB:mean(rs.map(r=>r.peakMiB)),peakRange:rs.map(r=>r.peakMiB),complete:rs.filter(r=>r.completed).length,errors:rs.flatMap(r=>r.errors)};
 comparison.fps={};for(const stage of ['clear-steady','snow-steady','snow-night-steady','snow-accumulating','rain-melting']){
  // Use only windows completed in both sides of each repeat.
  const values={before:[],after:[]};for(const repeat of ['a','b']){const a=groups.before.find(r=>r.repeat===repeat).stages[stage]??[],b=groups.after.find(r=>r.repeat===repeat).stages[stage]??[],n=Math.min(a.length,b.length);values.before.push(...a.slice(0,n));values.after.push(...b.slice(0,n));}
  comparison.fps[stage]=Object.fromEntries(Object.entries(values).map(([v,x])=>[v,{windows:x.length,fps:mean(x.map(a=>a.fps)),p95Ms:mean(x.map(a=>a.p95Ms)),maxMs:Math.max(...x.map(a=>a.maxMs))}]));
 }
 report.comparisons.push(comparison);
}
await writeFile(`${out}/performance-summary.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.comparisons,null,2));
