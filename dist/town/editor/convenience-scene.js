import {THREE, world, batchStatic, halo} from '../../world.js';
import {buildStreet, updateStreet} from '../../street.js';
import {createBuildingInstance,TILE_SIZE} from '../assets/shared/instances.js';
import {createModel} from '../assets/convenience/index.js';
import {addConvenienceSnow} from '../assets/convenience/snow.js';
import {nightStrength} from '../assets/shared/environment-rules.js';

// C's composition adapter. The authored building and street files stay untouched.
// The original miniature has a 14.25-wide outer lip; retain it all inside one 14-wide cell.
const SCALE=TILE_SIZE/14.25;
const STORE_LAMPS=[['#ffc379',12,7,-1.5,2.5,-1.7],['#ffd79b',8,5,1.9,2.35,.2],['#bfe8d9',4,4,-2.1,1.9,-3.8],['#ffbe71',6,6,-.3,2.65,2]];
let streetTemplate=null,streetLamps=[],streetObstacles=[];

function getStreet() {
  if(streetTemplate)return streetTemplate;
  if(world.children.length)throw new Error('Original street composition requires the empty construction group.');
  buildStreet();
  const root=new THREE.Group();root.name='original-convenience-street';
  for(const child of [...world.children])root.add(child);
  root.updateMatrixWorld(true);
  // Keep small authored prop groups separately identifiable through static batching.
  const propLocations=[['vending-machine',-5.15,.78],['bicycle',3.88,-.95],['umbrella-rack',.96,2.06],['aircon-side',-4.85,-1.25],['aircon-back',-1.3,-5.2],['a-board',-1.55,2.26]];
  for(const [name,x,z] of propLocations) {
    const prop=root.children.find(n=>n.isGroup&&Math.abs(n.position.x-x)<.001&&Math.abs(n.position.z-z)<.001);
    if(!prop)throw new Error(`Original street prop missing: ${name}`);
    prop.name=name;prop.userData.dynamic=true;
  }
  // Collision boxes are derived from actual ground-level meshes, before batching.
  // This excludes pavement, overhead cables and signs. D still owns character/path tests.
  const objects=[];root.traverse(n=>{if(n.isMesh&&!n.material?.transparent)objects.push(n);});
  for(const node of objects) {
    node.geometry.computeBoundingBox();const b=node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
    if(b.min.y>.65||b.max.y<.45||b.max.y-b.min.y<.08)continue;
    streetObstacles.push({x:(b.min.x+b.max.x)/2,z:(b.min.z+b.max.z)/2,w:b.max.x-b.min.x,d:b.max.z-b.min.z,height:b.max.y});
  }
  const lights=[];root.traverse(n=>{if(n.isLight)lights.push(n);});
  for(const light of lights) {const p=light.getWorldPosition(new THREE.Vector3());streetLamps.push(['#'+light.color.getHexString(),light.intensity,light.distance,p.x,p.y,p.z]);light.removeFromParent();}
  const pole=root.children.find(n=>n.isGroup&&Math.abs(n.position.x+5.87)<.001&&Math.abs(n.position.z-2.9)<.001);
  if(pole){pole.name='convenience-street-lamp';pole.userData.dynamic=true;}
  halo(-.4,2.5,1.8,'#ffda96',5,.065,root);
  batchStatic(root);streetTemplate=root;return root;
}

export function createConvenienceScene() {
  const asset=createBuildingInstance('convenience',0,createModel),building=asset.root;
  building.name='original-convenience-building';building.position.set(-.6,0,-1.6);
  const root=new THREE.Group();root.name='complete-convenience-corner';root.scale.setScalar(SCALE);
  root.add(getStreet().clone(true),building);
  const shifted=items=>items.map(item=>({...item,x:item.x-.6,z:item.z-1.6}));
  asset.root=root; // The original update closure still owns this instance's building/doors.
  asset.colliders=[...shifted(asset.colliders),...streetObstacles.map(b=>({...b}))];
  asset.occluders=shifted(asset.occluders);asset.roofs=shifted(asset.roofs);
  asset.floors=[{x:0,z:0,w:14.25,d:14.25,height:.078},{x:-1.2,z:-1.765,w:11.4,d:10.31,height:.25},...shifted(asset.floors)];
  asset.lamps=shifted(asset.lamps);
  asset.previewLamps=[...STORE_LAMPS,...streetLamps];
  asset.focus={target:[0,1.6,0],distance:33};
  asset.updateDecorations=updateStreet;
  const pole=root.getObjectByName('convenience-street-lamp'),owned=[],optical=[];
  pole?.traverse(n=>{if(n.isSprite)optical.push(n);if(n.isMesh&&n.material?.emissiveIntensity>0){n.material=n.material.clone();owned.push([n.material,n.material.emissiveIntensity]);}});
  let environment={time:'afternoon',weather:'clear'};
  asset.setEnvironment=next=>{environment={...environment,...next};const strength=nightStrength(environment.time);
    optical.forEach(n=>n.visible=strength>0);owned.forEach(([m,intensity])=>m.emissiveIntensity=intensity*strength);return {...environment};};
  asset.getLightingDescriptors=()=>asset.previewLamps.map((s,i)=>({id:i<4?`business-${i}`:'street-lamp',type:'point',color:s[0],intensity:s[1]*(i<4?1:nightStrength(environment.time)),distance:s[2],position:s.slice(3),decay:2}));
  const dispose=asset.dispose?.bind(asset);asset.dispose=()=>{owned.forEach(([m])=>m.dispose());dispose?.();};
  asset.setEnvironment(environment);
  return addConvenienceSnow(asset);
}
