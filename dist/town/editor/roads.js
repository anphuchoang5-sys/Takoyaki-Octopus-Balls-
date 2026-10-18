import * as THREE from 'three';

export const ROAD_DEFINITIONS = [
  {id: 'road-straight', name: '直路', exits: ['N', 'S']},
  {id: 'road-corner', name: '转角', exits: ['N', 'E']},
  {id: 'road-tee', name: '丁字路', exits: ['N', 'E', 'W']},
  {id: 'road-cross', name: '十字路', exits: ['N', 'E', 'S', 'W']}
];
const cache = new Map();
const asphalt = new THREE.MeshStandardMaterial({color: '#74858a', roughness: 1});
const shoulder = new THREE.MeshStandardMaterial({color: '#c4c4ae', roughness: 1});
const paint = new THREE.MeshBasicMaterial({color: '#f1e7c6'});
function slab(root, w, d, x, z, y, material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z); mesh.receiveShadow = true; root.add(mesh);
}
function surface(root, exits, width, tileSize, y, material) {
  slab(root, width, width, 0, 0, y, material);
  const length = (tileSize - width) / 2, offset = (tileSize + width) / 4;
  for (const exit of exits) {
    const vertical = exit === 'N' || exit === 'S';
    slab(root, vertical ? width : length, vertical ? length : width,
      vertical ? 0 : (exit === 'E' ? offset : -offset), vertical ? (exit === 'S' ? offset : -offset) : 0, y, material);
  }
}
export function createRoad(id, tileSize = 14) {
  const definition = ROAD_DEFINITIONS.find(item => item.id === id);
  if (!definition) throw new Error(`未知道路：${id}`);
  const key = `${id}:${tileSize}`;
  if (!cache.has(key)) {
    const root = new THREE.Group(); root.name = id;
    const scale = tileSize / 14;
    surface(root, definition.exits, 6.7 * scale, tileSize, .015, shoulder);
    surface(root, definition.exits, 6 * scale, tileSize, .028, asphalt);
    for (const exit of definition.exits) for (const distance of [4.3, 6.3]) {
      const vertical = exit === 'N' || exit === 'S';
      slab(root, (vertical ? .10 : 1) * scale, (vertical ? 1 : .10) * scale,
        vertical ? 0 : (exit === 'E' ? distance : -distance) * scale,
        vertical ? (exit === 'S' ? distance : -distance) * scale : 0, .037, paint);
    }
    if (id === 'road-straight') for (const z of [-2.1, 0, 2.1]) slab(root, .10 * scale, scale, 0, z * scale, .037, paint);
    if (id === 'road-corner') {
      // A fixed turn cue belongs to this asset; neighbours never mutate it.
      slab(root, .10 * scale, 2 * scale, 0, -scale, .037, paint);
      slab(root, 2 * scale, .10 * scale, scale, 0, .037, paint);
    }
    cache.set(key, root);
  }
  return {root: cache.get(key).clone(true), colliders: [], occluders: [], roofs: [], lamps: [], floors: [], update() {}};
}
