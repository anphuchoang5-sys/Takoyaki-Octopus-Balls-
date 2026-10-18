import {THREE,batchStatic} from '../../world.js';
import {createModel as createConvenience} from './convenience/index.js';
import {createModel as createCafe} from './cafe/index.js';
import {createModel as createBookshop} from './bookshop/index.js';
import {createModel as createHome} from './home/index.js';
import {createModel as createGarden} from './garden/index.js';

export const TILE_SIZE=14;
export const BUILDING_TYPES=['convenience','cafe','bookshop','home','garden'];
const cache=new Map();

export function createBuilding(type,variant=0){
  if(!BUILDING_TYPES.includes(type))throw new Error(`Unknown building type: ${type}`);
  const key=type+':'+(type==='home'?variant%2:0);
  if(!cache.has(key)){
    const asset=type==='convenience'?createConvenience():type==='home'?createHome(variant):type==='garden'?createGarden():type==='cafe'?createCafe():createBookshop();
    batchStatic(asset.root);cache.set(key,asset);
  }
  const asset=cache.get(key),root=asset.root.clone(true),doorNodes=[];
  root.traverse(o=>{if(o.userData.closedX!==undefined)doorNodes.push(o);});
  let open=0;
  return {type,root,colliders:asset.colliders,occluders:asset.occluders,roofs:asset.roofs,lamps:asset.lamps,floors:asset.floors,
    update(dt,player){if(!doorNodes.length)return;const entrance=root.localToWorld(new THREE.Vector3(.45,0,3.08));const near=Math.hypot(player.x-entrance.x,player.z-entrance.z)<1.85;open=THREE.MathUtils.damp(open,near?1:0,5,dt);for(const d of doorNodes)d.position.x=d.userData.closedX+d.userData.side*open*.78;},
    get doorOpen(){return open;}
  };
}
