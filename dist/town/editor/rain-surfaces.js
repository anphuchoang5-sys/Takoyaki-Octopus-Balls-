import * as THREE from 'three';
import {isActive} from './state.js';

// Physical meshes only. B's environment subtree contains optical effects and local drips,
// not building surfaces. Transparent windows/beam/pools must never become rain roofs.
export function isRainSurface(node, root) {
  if (!node.isMesh || node.isInstancedMesh) return false;
  for (let p = node; p && p !== root; p = p.parent) {
    if (!p.visible || p.name === '樱家外部环境响应') return false;
  }
  return true;
}
const solid = material => material && !material.transparent && material.depthWrite !== false;

// Cache the real local triangles in XZ bins. Queries interpolate the sloping surface;
// a rectangular roof envelope would incorrectly cover courtyards and roof corners.
function indexModel(root, binSize) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(), bins = new Map();
  let triangles = 0;
  const key = (x, z) => `${x},${z}`;
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
        const normal = new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
        if (normal.y < 0) normal.negate();
        const triangle = {a,b,c,denominator,normal}; triangles++;
        const xs = v.map(p=>p.x), zs = v.map(p=>p.z);
        for (let x = Math.floor(Math.min(...xs)/binSize); x <= Math.floor(Math.max(...xs)/binSize); x++) {
          for (let z = Math.floor(Math.min(...zs)/binSize); z <= Math.floor(Math.max(...zs)/binSize); z++) {
            const id = key(x,z); if (!bins.has(id)) bins.set(id, []); bins.get(id).push(triangle);
          }
        }
      }
    }
  });
  return {triangles, sample(x,z) {
    let result = null;
    for (const t of bins.get(key(Math.floor(x/binSize),Math.floor(z/binSize))) || []) {
      const {a,b,c,denominator} = t;
      const u = ((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/denominator;
      const v = ((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/denominator, w = 1-u-v;
      if (u < -1e-9 || v < -1e-9 || w < -1e-9) continue;
      const y = u*a.y+v*b.y+w*c.y;
      if (y >= 0 && (!result || y > result.y)) result = {y,normal:t.normal};
    }
    return result;
  }};
}

export function createRainSurfaces({state, sceneView, tileSize = 14}) {
  const cache = new Map(); let rows = [], cells = new Map(), revision = 0;
  function rebuild() {
    rows = state.getLayout().rows; cells = new Map();
    for (const {placement,asset} of sceneView.getInstances()) {
      asset.root.updateWorldMatrix(true,true);
      const key = `${placement.assetId}:${asset.specification?.revision || '1'}`;
      if (!cache.has(key)) cache.set(key,indexModel(asset.root,tileSize/20));
      cells.set(`${placement.x},${placement.z}`,{placement, index:cache.get(key), matrix:asset.root.matrixWorld.clone(),
        inverse:asset.root.matrixWorld.clone().invert(), normalMatrix:new THREE.Matrix3().getNormalMatrix(asset.root.matrixWorld)});
    }
    revision++;
  }
  function sample(x,z) {
    const cellX = Math.floor(x/tileSize+5), cellZ = Math.floor(z/tileSize+5);
    if (!isActive(rows,cellX,cellZ)) return null;
    const entry = cells.get(`${cellX},${cellZ}`);
    if (entry) {
      const local = new THREE.Vector3(x,0,z).applyMatrix4(entry.inverse), hit = entry.index.sample(local.x,local.z);
      if (hit) {
        const point = new THREE.Vector3(local.x,hit.y,local.z).applyMatrix4(entry.matrix);
        return {point:point.toArray(),normal:hit.normal.clone().applyMatrix3(entry.normalMatrix).normalize().toArray(),
          instanceId:entry.placement.id,assetId:entry.placement.assetId,surface:'model'};
      }
    }
    return {point:[x,0,z],normal:[0,1,0],instanceId:null,assetId:null,surface:'terrain'};
  }
  return {rebuild,sample,getInspection:()=>({revision,indices:[...cache].map(([asset, index])=>({asset,triangles:index.triangles}))}),
    dispose(){cache.clear();cells.clear();}};
}
