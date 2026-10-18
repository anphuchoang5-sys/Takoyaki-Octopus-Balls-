import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };
export const world = new THREE.Group();
export const dynamic = [];
let seed = 73105;
export function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const bands = new THREE.DataTexture(new Uint8Array([0, 125, 195, 255]), 4, 1, THREE.RedFormat);
bands.minFilter = bands.magFilter = THREE.NearestFilter; bands.needsUpdate = true;
const materials = new Map();
export function toon(color, emissive = 0) {
  const key = color + ':' + emissive;
  if (!materials.has(key)) {
    const material=new THREE.MeshToonMaterial({ color, gradientMap: bands, emissive: color, emissiveIntensity: emissive });
    // Keep toon bands, but reject light arriving from behind an opaque surface.
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <gradientmap_pars_fragment>',THREE.ShaderChunk.gradientmap_pars_fragment.replace('dotNL * 0.5 + 0.5','max( dotNL, 0.0 )'));};
    materials.set(key,material);
  }
  return materials.get(key);
}
export function glow(color, strength = 1) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false }); }
export const metal = toon('#64828a');
export const dark = toon('#243c48');
export const white = toon('#e0ddc8', .08);
export const outline = new THREE.LineBasicMaterial({ color: '#122735', transparent: true, opacity: .58 });
export const glass = new THREE.MeshPhongMaterial({ color: '#a3e1db', transparent: true, opacity: .11, shininess: 130, specular: '#b6eae1', side: THREE.DoubleSide, depthWrite: false });
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const edgeCache = new Map();
function add(mesh, parent, edges) {
  mesh.castShadow = !mesh.material.transparent; mesh.receiveShadow = true;
  parent.add(mesh);
  if (edges) {
    let e = edgeCache.get(mesh.geometry.uuid);
    if (!e) { e = new THREE.EdgesGeometry(mesh.geometry, 28); edgeCache.set(mesh.geometry.uuid, e); }
    mesh.add(new THREE.LineSegments(e, outline));
  }
  return mesh;
}
export function box(w, h, d, x, y, z, material, parent = world, edges = true) {
  const mesh = new THREE.Mesh(unitBox, material?.isMaterial ? material : toon(material));
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d); return add(mesh, parent, edges);
}
export function cyl(rt, rb, h, x, y, z, material, parent = world, sides = 12, edges = false) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material?.isMaterial ? material : toon(material));
  mesh.position.set(x, y, z); return add(mesh, parent, edges);
}
export function sphere(r, x, y, z, material, parent = world) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), material?.isMaterial ? material : toon(material));
  mesh.position.set(x, y, z); return add(mesh, parent, false);
}
export function tube(points, radius, material, parent = world, smooth = false) {
  const p = points.map(v => new THREE.Vector3(...v));
  const curve = smooth ? new THREE.CatmullRomCurve3(p) : new THREE.CurvePath();
  if (!smooth) for (let i = 0; i < p.length - 1; i++) curve.add(new THREE.LineCurve3(p[i], p[i + 1]));
  return add(new THREE.Mesh(new THREE.TubeGeometry(curve, smooth ? 28 : Math.max(1, p.length - 1) * 3, radius, 6, false), material?.isMaterial ? material : toon(material)), parent, false);
}
export function group(x = 0, y = 0, z = 0, rotation = 0, parent = world, animated = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotation; g.userData.dynamic = animated; parent.add(g); return g;
}
export function canvasMap(w, h, draw) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; return map;
}
export function face(w, h, x, y, z, texture, parent = world, rotation = 0, brightness = 1) {
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false, color: new THREE.Color().setScalar(brightness) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.position.set(x, y, z); mesh.rotation.y = rotation; parent.add(mesh); return mesh;
}
export function label(text, subtitle = '', bg = '#e9e1c7', fg = '#326c68', w = 512, h = 192) {
  return canvasMap(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textAlign = 'center';
    c.font = `700 ${Math.floor(h * .39)}px "Yu Gothic", "Meiryo", sans-serif`; c.fillText(text, w / 2, h * (subtitle ? .53 : .64));
    if (subtitle) { c.font = `500 ${Math.floor(h * .15)}px "Yu Gothic", sans-serif`; c.fillText(subtitle, w / 2, h * .84); }
  });
}
export function point(color, intensity, distance, x, y, z, parent = world) {
  const l = new THREE.PointLight(color, intensity, distance, 2); l.position.set(x, y, z); parent.add(l); return l;
}
export function halo(x, y, z, color, size, opacity = .18, parent = world) {
  const map = canvasMap(128, 128, c => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, '#ffffff'); g.addColorStop(.12, '#ffffff99'); g.addColorStop(1, '#ffffff00'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, opacity, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sprite.position.set(x, y, z); sprite.scale.set(size, size, 1); parent.add(sprite); return sprite;
}
export function groundGlow(x, z, sx, sz, color, opacity) {
  const map = canvasMap(128, 128, c => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, '#ffffffff'); g.addColorStop(.4, '#ffffff66'); g.addColorStop(1, '#ffffff00'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .045, z); world.add(m); return m;
}
// Consolidate static geometry while retaining all animated doors, rain and lights.
export function batchStatic(root = world) {
  root.updateMatrixWorld(true);
  const buckets = new Map(); const remove = [];
  root.traverse(obj => {
    if ((!obj.isMesh && !obj.isLineSegments) || Array.isArray(obj.material) || obj.material.transparent) return;
    for (let p = obj; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const key = `${obj.type}:${obj.material.uuid}:${obj.castShadow}:${obj.geometry.index ? 'indexed' : 'unindexed'}`;
    if (!buckets.has(key)) buckets.set(key, { material: obj.material, lines: obj.isLineSegments, shadow: obj.castShadow, items: [] });
    const g = obj.geometry.clone(); g.applyMatrix4(obj.matrixWorld); buckets.get(key).items.push(g); remove.push(obj);
  });
  // Outline children inherit their transform; bake them before removing their meshes.
  const outlines = [];
  for (const obj of remove) for (const child of obj.children) if (child.isLineSegments) { const g = child.geometry.clone(); g.applyMatrix4(child.matrixWorld); outlines.push(g); }
  for (const obj of remove) obj.removeFromParent();
  for (const b of buckets.values()) {
    const geometry = mergeGeometries(b.items, false); b.items.forEach(g => g.dispose());
    const mesh = b.lines ? new THREE.LineSegments(geometry, b.material) : new THREE.Mesh(geometry, b.material);
    mesh.castShadow = b.shadow; mesh.receiveShadow = true; root.add(mesh);
  }
  if (outlines.length) { root.add(new THREE.LineSegments(mergeGeometries(outlines), outline)); outlines.forEach(g => g.dispose()); }
}
