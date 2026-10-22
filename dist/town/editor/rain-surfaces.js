import * as THREE from 'three';
import {isActive} from './state.js';
import {indexPackedTriangles} from '../assets/shared/snow-surfaces.js';

// Physical meshes only. B's environment subtree contains optical effects and local drips,
// not building surfaces. Transparent windows/beam/pools must never become rain roofs.
export function isRainSurface(node, root) {
  if (!node.isMesh || node.isInstancedMesh) return false;
  for (let p = node; p && p !== root; p = p.parent) {
    if (!p.visible || p.userData.snowLayer || p.name === '樱家外部环境响应') return false;
  }
  return true;
}
const solid = material => material && !material.transparent && material.depthWrite !== false;

// Cache the real local triangles in XZ bins. Queries interpolate the sloping surface;
// a rectangular roof envelope would incorrectly cover courtyards and roof corners.
function indexModel(root, binSize) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), positions = [];
  root.traverse(node => {
    if (!isRainSurface(node, root)) return;
    const geometry = node.geometry, position = geometry?.attributes.position;
    if (!position) return;
    const transform = new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld);
    const index = geometry.index, count = index ? index.count : position.count;
    const groups = Array.isArray(node.material) ? geometry.groups : [{start: 0, count, materialIndex: 0}];
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const group of groups) {
      if (!solid(materials[group.materialIndex])) continue;
      const start = Math.max(group.start, geometry.drawRange.start);
      const end = Math.min(count, group.start + group.count, geometry.drawRange.start + geometry.drawRange.count);
      for (let i = start; i + 2 < end; i += 3) {
        const v = [0,1,2].map(k => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i+k) : i+k).applyMatrix4(transform));
        const [a,b,c] = v, denominator = (b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
        if (Math.abs(denominator) < 1e-9) continue;
        for(const p of v)positions.push(p.x,p.y,p.z);
      }
    }
  });
  // Preserve the original transformed double precision coordinates and rain
  // tolerances; share the compact query index instead of object/Vector3 graphs.
  const triangles=positions.length/9,index=indexPackedTriangles(new Float64Array(positions),new Int16Array(triangles),new Set(),binSize,{epsilon:1e-9,minArea:1e-9,minY:0,upward:true});
  return {triangles,sampleInto:index.sampleInto};
}

export function createRainSurfaces({state, sceneView, tileSize = 14}) {
  const cache = new Map(); let rows = [], cells = new Map(), revision = 0;
  const local=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3();
  const modelHit={y:0,normal:new THREE.Vector3(),part:0},snowHit={y:0,normal:new THREE.Vector3(),part:0},groundHit={y:0,normal:new THREE.Vector3(),part:0};
  function rebuild() {
    rows = state.getLayout().rows; cells = new Map();
    for (const {placement,asset} of sceneView.getInstances()) {
      asset.root.updateWorldMatrix(true,true);
      const key = `${placement.assetId}:${asset.specification?.revision || '1'}`;
      if (!cache.has(key)) cache.set(key,indexModel(asset.root,tileSize/20));
      cells.set(placement.z*10+placement.x,{placement, asset, index:cache.get(key), matrix:asset.root.matrixWorld.clone(),
        inverse:asset.root.matrixWorld.clone().invert(), normalMatrix:new THREE.Matrix3().getNormalMatrix(asset.root.matrixWorld)});
    }
    revision++;
  }
  function sampleInto(x,z,out) {
    const cellX = Math.floor(x/tileSize+5), cellZ = Math.floor(z/tileSize+5);
    if (!isActive(rows,cellX,cellZ)) return null;
    const entry = cells.get(cellZ*10+cellX);
    if (entry) {
      local.set(x,0,z).applyMatrix4(entry.inverse);
      let hit=entry.index.sampleInto(local.x,local.z,modelHit),isSnow=false;
      const snow=entry.asset.snow?.sampleInto(local.x,local.z,snowHit);
      if(snow&&(!hit||snow.y>hit.y)){hit=snow;isSnow=true;}
      out.instanceId=entry.placement.id;out.assetId=entry.placement.assetId;
      if(entry.placement.assetId.startsWith('road-')){
        const ground=sceneView.sampleGroundSnowInto?.(x,z,groundHit);
        if(ground&&(!hit||ground.y>hit.y)){out.point[0]=x;out.point[1]=ground.y;out.point[2]=z;ground.normal.toArray(out.normal);out.surface='snow-terrain';return out;}
      }
      if (hit) {
        point.set(local.x,hit.y,local.z).applyMatrix4(entry.matrix).toArray(out.point);
        normal.copy(hit.normal).applyMatrix3(entry.normalMatrix).normalize().toArray(out.normal);
        out.surface=isSnow?'snow-model':'model';return out;
      }
    }
    const snow=sceneView.sampleGroundSnowInto?.(x,z,groundHit);
    out.point[0]=x;out.point[1]=snow?.y||0;out.point[2]=z;
    if(snow)snow.normal.toArray(out.normal);else{out.normal[0]=0;out.normal[1]=1;out.normal[2]=0;}
    out.instanceId=null;out.assetId=null;out.surface=snow?'snow-terrain':'terrain';return out;
  }
  const sample=(x,z)=>sampleInto(x,z,{point:[0,0,0],normal:[0,0,0],instanceId:null,assetId:null,surface:null});
  return {rebuild,sample,sampleInto,getInspection:()=>({revision,indices:[...cache].map(([asset, index])=>({asset,triangles:index.triangles}))}),
    dispose(){cache.clear();cells.clear();}};
}
