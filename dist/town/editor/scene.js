import * as THREE from 'three';
import {isActive, LIMIT} from './state.js';
import {createGrass, createLawnMaterial} from './grass.js';

export function cellToWorld(x, z, tileSize) { return {x: (x - 4.5) * tileSize, z: (z - 4.5) * tileSize}; }
export function worldToCell(x, z, tileSize) { return {x: Math.floor(x / tileSize + 5), z: Math.floor(z / tileSize + 5)}; }
function disposeOwned(group) {
  group.traverse(node => {
    node.geometry?.dispose();
    if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose();
  });
  group.clear();
}
function flat(w, d, color, opacity = 1, y = .06) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({color, transparent: opacity < 1, opacity, depthWrite: opacity === 1, side: THREE.DoubleSide}));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; return mesh;
}

// Scene and asset lifecycle only; the host supplies environment and the single town clock.
export function createEditorScene({state, createAsset, tileSize = 14}) {
  const root = new THREE.Group(); root.name = 'town-editor';
  const ground = new THREE.Group(), grid = new THREE.Group(), models = new THREE.Group(), hints = new THREE.Group();
  const grass = createGrass({tileSize});
  root.add(ground, grass.root, grid, models, hints);
  const instances = new Map();
  let environment = {weather: 'clear'}, elapsedSeconds = 0;
  let rowsKey = '', selectedId = null, ghost = null, ghostId = null, editing = true, plan = null;
  const selection = flat(tileSize * .96, tileSize * .96, '#e7bc67', .32, 1.10);
  const cursor = flat(tileSize * .94, tileSize * .94, '#5bbf9f', .45, 1.12);
  cursor.visible = selection.visible = false; hints.add(selection, cursor);
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), tileSize * .36, '#fff4c9', tileSize * .10, tileSize * .08);
  arrow.visible = false; hints.add(arrow);
  const impact = new THREE.Group(); hints.add(impact);

  function rebuildGround(rows) {
    disposeOwned(ground); disposeOwned(grid);
    for (let z = 0; z < LIMIT; z++) {
      const row = rows[z]; if (!row.length) continue;
      // One slab per continuous row: identical edge coordinates, no gaps or inset tiles.
      const center = cellToWorld(row.start + (row.length - 1) / 2, z, tileSize);
      const soil = new THREE.MeshStandardMaterial({color: '#69714d', roughness: 1});
      const slab = new THREE.Mesh(new THREE.BoxGeometry(row.length * tileSize, 1.0, tileSize), [soil,soil,createLawnMaterial(),soil,soil,soil]);
      slab.position.set(center.x, -.5, center.z); slab.receiveShadow = true; ground.add(slab);
    }
    const segments = [], edges = new Set();
    function edge(x1, z1, x2, z2) {
      const key = `${x1},${z1}:${x2},${z2}`; if (edges.has(key)) return; edges.add(key);
      segments.push(x1, 1.08, z1, x2, 1.08, z2);
    }
    for (let z = 0; z < LIMIT; z++) for (let x = 0; x < LIMIT; x++) if (isActive(rows, x, z)) {
      const p = cellToWorld(x, z, tileSize), h = tileSize / 2;
      edge(p.x-h, p.z-h, p.x+h, p.z-h); edge(p.x-h, p.z+h, p.x+h, p.z+h);
      edge(p.x-h, p.z-h, p.x-h, p.z+h); edge(p.x+h, p.z-h, p.x+h, p.z+h);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
    grid.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color: '#e5e7c7', transparent: true, opacity: .55})));
  }
  function sync() {
    const layout = state.getLayout(), key = JSON.stringify(layout.rows);
    if (key !== rowsKey) { rebuildGround(layout.rows); rowsKey = key; }
    grass.rebuild(layout);
    const live = new Set(layout.instances.map(p => p.id));
    for (const [id, asset] of instances) if (!live.has(id)) { asset.root.removeFromParent(); asset.dispose?.(); instances.delete(id); }
    for (const p of layout.instances) {
      let asset = instances.get(p.id);
      if (asset && asset.assetId !== p.assetId) { asset.root.removeFromParent(); asset.dispose?.(); instances.delete(p.id); asset = null; }
      if (!asset) {
        asset = createAsset(p.assetId); asset.assetId = p.assetId;
        asset.setEnvironment?.(environment); asset.updateEnvironment?.(elapsedSeconds);
        asset.root.userData.instanceId = p.id; models.add(asset.root); instances.set(p.id, asset);
      }
      const point = cellToWorld(p.x, p.z, tileSize);
      asset.root.position.set(point.x, 0, point.z); asset.root.rotation.y = p.rotation * Math.PI / 180;
    }
    root.updateMatrixWorld(true); select(selectedId); showShape(null);
  }
  function select(id) {
    selectedId = id;
    const p = state.getLayout().instances.find(p => p.id === id);
    selection.visible = editing && !!p;
    if (p) { const point = cellToWorld(p.x, p.z, tileSize); selection.position.set(point.x, 1.10, point.z); }
  }
  function clearGhost() {
    if (ghost) {
      ghost.root.removeFromParent();
      // Dispose preview material copies first, then let an independent asset release its originals.
      // Shared-cache factories have no instance dispose and keep their geometry/textures alive.
      ghost.root.traverse(node => { if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose(); });
      ghost.dispose?.();
    }
    ghost = null; ghostId = null;
  }
  function preview({assetId, x, z, rotation = 0, valid = true} = {}) {
    if (!assetId || !Number.isInteger(x) || !Number.isInteger(z) || !editing) {
      if (ghost) ghost.root.visible = false; cursor.visible = arrow.visible = false; return;
    }
    if (ghostId !== assetId) {
      clearGhost(); ghost = createAsset(assetId); ghostId = assetId;
      ghost.setEnvironment?.(environment); ghost.updateEnvironment?.(elapsedSeconds);
      ghost.root.traverse(node => {
        if (!node.material) return;
        const clone = material => { const m = material.clone(); m.transparent = true; m.opacity = .48; m.depthWrite = false; return m; };
        node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
      });
      hints.add(ghost.root);
    }
    const point = cellToWorld(x, z, tileSize);
    ghost.root.visible = true; ghost.root.position.set(point.x, .12, point.z); ghost.root.rotation.y = rotation * Math.PI / 180;
    cursor.visible = arrow.visible = true; cursor.material.color.set(valid ? '#4cae94' : '#df7664'); cursor.position.set(point.x, 1.12, point.z);
    arrow.position.set(point.x, 6, point.z); arrow.setDirection(new THREE.Vector3(Math.sin(rotation * Math.PI / 180), 0, Math.cos(rotation * Math.PI / 180)));
  }
  function showShape(next) {
    plan = next; disposeOwned(impact);
    if (!next) return;
    for (const [cells, color] of [[next.removedCells, '#d76c59'], [next.addedCells, '#49a886']]) for (const cell of cells) {
      const mesh = flat(tileSize * .97, tileSize * .97, color, .6, 1.13), p = cellToWorld(cell.x, cell.z, tileSize);
      mesh.position.set(p.x, 1.13, p.z); impact.add(mesh);
    }
    for (const cell of next.affected) {
      const point = cellToWorld(cell.x, cell.z, tileSize), half = tileSize / 2;
      // Box3Helper computes its own transform from its box; supply world-space bounds.
      const frame = new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(point.x-half, 0, point.z-half), new THREE.Vector3(point.x+half, 9, point.z+half)), '#ffd384');
      impact.add(frame);
    }
  }
  sync(); const unsubscribe = state.subscribe(sync);
  return {
    root, tileSize, sync, select, preview, showShape, grass,
    setEnvironment({weather}) {
      if (!['clear','rain'].includes(weather)) throw new Error('编辑场景仅支持晴天和下雨。');
      environment = {weather};
      for (const asset of instances.values()) asset.setEnvironment?.(environment);
      // Recreate a preview on its next pointer update, keeping B's original material references valid.
      clearGhost();
    },
    update(time) {
      elapsedSeconds = time; grass.update(time);
      for(const asset of instances.values()) { asset.updateDecorations?.(time); asset.updateEnvironment?.(time); }
      ghost?.updateEnvironment?.(time);
    },
    setEditing(enabled) { editing = !!enabled; grid.visible = hints.visible = editing; if (!editing) preview(); select(selectedId); },
    getInstances() { return state.getLayout().instances.map(p => ({placement: p, asset: instances.get(p.id)})); },
    containsCell(x, z) { return isActive(state.getLayout().rows, x, z); },
    getGroundHeight(x, z) { const cell = worldToCell(x, z, tileSize); return isActive(state.getLayout().rows, cell.x, cell.z) ? 0 : null; },
    getInspection() { return {instances: instances.size, groundRows: ground.children.length, grass: grass.getInspection(), gridVisible: grid.visible, previewVisible: !!ghost?.root.visible,
      previewAsset: ghostId, previewRotation: ghost ? ghost.root.rotation.y * 180 / Math.PI : null, shapePreview: !!plan,
      impactBounds: impact.children.filter(node => node.isBox3Helper || node.type === 'Box3Helper').map(node => ({min: node.box.min.toArray(), max: node.box.max.toArray()}))}; },
    dispose() { unsubscribe(); root.removeFromParent(); clearGhost(); grass.dispose(); disposeOwned(ground); disposeOwned(grid); disposeOwned(impact);
      selection.geometry.dispose(); selection.material.dispose(); cursor.geometry.dispose(); cursor.material.dispose(); arrow.dispose();
      for(const asset of instances.values())asset.dispose?.();models.clear();instances.clear(); }
  };
}

// Render the same factory as the scene, with a single temporary WebGL context for all cards.
export function renderThumbnails(assets, createAsset, tileSize = 14) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
  renderer.setSize(280, 190); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-10, 10, 6.8, -6.8, .1, 100);
  camera.position.set(17, 19, 24); camera.lookAt(0, .8, 0);
  scene.add(new THREE.HemisphereLight('#e4edff', '#777447', 1.45));
  const light = new THREE.DirectionalLight('#fff0d1', 2.25); light.position.set(-10, 25, 20); scene.add(light);
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(tileSize, .5, tileSize), new THREE.MeshStandardMaterial({color: '#9caf83'}));
  pedestal.position.y = -.25; scene.add(pedestal);
  const thumbnails = new Map();
  try {
    for (const asset of assets) {
      const model = createAsset(asset.id); scene.add(model.root);
      try {
        camera.position.fromArray(model.thumbnail?.position || [17,19,24]);
        camera.lookAt(new THREE.Vector3(...(model.thumbnail?.target || [0,.8,0])));
        renderer.render(scene, camera); thumbnails.set(asset.id, renderer.domElement.toDataURL('image/png'));
      } finally { scene.remove(model.root); model.dispose?.(); }
    }
  } finally { pedestal.geometry.dispose(); pedestal.material.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
  return thumbnails;
}
