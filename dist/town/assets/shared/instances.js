import {THREE,batchStatic} from '../../../world.js';

export const TILE_SIZE=14;
const cache=new Map();

// Shared by the full asset library and the editor's convenience-only import.
// Geometry is cached; each returned building owns its cloned doors and animation state.
export function createBuildingInstance(type,variant,createModel){
  const key=type+':'+(type==='home'?variant%2:0);
  if(!cache.has(key)){
    const asset=createModel(variant);
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
