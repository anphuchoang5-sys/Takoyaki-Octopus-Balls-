// Real Three.js snowflake and shadow-update seams; the browser pixel checks are separate.
import * as THREE from 'three';
import {createSnowfall} from '../dist/town/editor/snowfall.js';
import {createShadowUpdates} from '../dist/town/editor/shadows.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/editor/snow-query-render-cost',label=process.argv[2]??'regressions';
assert(/^[a-z0-9-]+$/.test(label));await mkdir(out,{recursive:true});
const report={checks:[]};
async function check(name,run){try{report.checks.push({name,pass:true,...await run()});}catch(e){report.checks.push({name,pass:false,error:e.message});}}
const manifest=JSON.parse(await readFile(`${out}/before-source/manifest.json`,'utf8'));
const oldPath=`${out}/reference-snowfall.mjs`;
await writeFile(oldPath,await readFile(`${out}/before-source/${manifest['town/editor/snowfall.js'].file}`));
const {createSnowfall:referenceSnowfall}=await import('../'+oldPath);
await check('landed flakes skip only queries whose result cannot affect state or inspection',()=>{
 const state={getLayout:()=>({rows:Array.from({length:10},(_,i)=>({start:3,length:i>=3&&i<7?3:0}))})};
 let seconds=0;const counters=[0,0],scenes=[new THREE.Scene(),new THREE.Scene()];
 const systems=[referenceSnowfall,createSnowfall].map((factory,i)=>factory(scenes[i],{state,surfaces:{sampleInto(x,z,out){counters[i]++;if(x< -25&&seconds>40&&seconds<60)return null;out.point[1]=10+Math.sin(x+seconds*.05)*3;out.surface=seconds>50?'snow-model':'model';return out;}}}));
 systems.forEach(s=>{s.rebuild();s.setVisible(true);});
 for(let frame=0;frame<240;frame++){
  seconds=frame*.43;systems.forEach(s=>s.update(seconds));
  assert.deepEqual(systems[1].getInspection(),systems[0].getInspection());
  assert.deepEqual(scenes[1].children[0].instanceMatrix.array,scenes[0].children[0].instanceMatrix.array);
  if(frame===110)systems.forEach(s=>s.rebuild());
 }
 systems.forEach(s=>s.dispose());assert(counters[1]<counters[0]*.9,`Unnecessary landed queries: ${counters[1]} / ${counters[0]}`);
 return {referenceQueries:counters[0],currentQueries:counters[1],identicalFrames:240};
});
function rig(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),renderer={shadowMap:{type:THREE.PCFShadowMap,needsUpdate:false},localClippingEnabled:false,clippingPlanes:[]};
 const lights=[0,30].map(x=>{const l=new THREE.SpotLight(0xffffff,1,25,.4);l.position.set(x,10,0);l.target.position.set(x,0,0);l.castShadow=true;l.shadow.map={};scene.add(l,l.target);return l;});
 const g=new THREE.BoxGeometry(),m=new THREE.MeshStandardMaterial(),a=new THREE.Mesh(g,m);a.castShadow=true;scene.add(a);
 const updates=createShadowUpdates({scene,camera,renderer});
 function tick(){updates.update();const dirty=lights.map(l=>l.shadow.needsUpdate);for(const l of lights){if(l.shadow.needsUpdate)l.shadow.updateMatrices(l);l.shadow.needsUpdate=false;}renderer.shadowMap.needsUpdate=false;return dirty;}
 const settle=()=>{for(let i=0;i<3;i++)tick();assert.deepEqual(tick(),[false,false]);};settle();
 return {scene,lights,a,g,m,updates,tick,settle};
}
await check('local geometry change redraws only the intersecting shadow',()=>{const r=rig();r.g.attributes.position.needsUpdate=true;assert.deepEqual(r.tick(),[true,false]);r.updates.dispose();});
await check('movement invalidates both the old and new shadow footprint',()=>{const r=rig();r.a.position.x=30;assert.deepEqual(r.tick(),[true,true]);r.settle();r.scene.remove(r.a);assert.deepEqual(r.tick(),[false,true]);r.updates.dispose();});
await check('shared geometry and material changes invalidate every affected instance',()=>{
 const r=rig(),b=new THREE.Mesh(r.g,r.m);b.castShadow=true;b.position.x=30;r.scene.add(b);r.settle();
 r.g.attributes.position.needsUpdate=true;assert.deepEqual(r.tick(),[true,true]);r.settle();r.m.side=THREE.DoubleSide;assert.deepEqual(r.tick(),[true,true]);r.updates.dispose();
});
await check('nonculled and custom shadow objects keep conservative redraw',()=>{const r=rig();r.a.frustumCulled=false;r.settle();r.g.attributes.position.needsUpdate=true;assert.deepEqual(r.tick(),[true,true]);r.a.onBeforeShadow=()=>{};assert.deepEqual(r.tick(),[true,true]);r.updates.dispose();});
await check('visibility, layer changes, additions and light movement clear previous shadows',()=>{
 const r=rig();r.a.visible=false;assert.deepEqual(r.tick(),[true,false]);r.settle();r.a.visible=true;assert.deepEqual(r.tick(),[true,false]);r.settle();r.a.layers.set(1);assert.deepEqual(r.tick(),[true,false]);r.settle();r.a.layers.set(0);assert.deepEqual(r.tick(),[true,false]);r.settle();r.lights[1].position.x=0;assert(r.tick()[1]);r.updates.dispose();
});
report.pass=report.checks.every(c=>c.pass);await writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
