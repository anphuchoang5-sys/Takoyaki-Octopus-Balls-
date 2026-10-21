// Pure layout model. Coordinates are zero-based; rotations are degrees around +Y.
export const FORMAT = 'rainy-corner-layout';
export const VERSION = 1;
export const LIMIT = 10;
export const MAX_FILE_BYTES = 1024 * 1024;
const copy = value => structuredClone(value);
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export function emptyLayout() {
  return { format: FORMAT, version: VERSION,
    rows: Array.from({length: LIMIT}, (_, z) => ({start: z >= 2 && z < 8 ? 2 : 0, length: z >= 2 && z < 8 ? 6 : 0})),
    instances: [] };
}

export function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length !== LIMIT) fail('地图必须包含 10 行定义。');
  return rows.map((row, z) => {
    if (!object(row) || !integer(row.start, 0, 9) || !integer(row.length, 0, 10) || row.start + row.length > LIMIT)
      fail(`第 ${z + 1} 行无效：起点为 0–9，长度为 0–10，起点＋长度不能超过 10。`);
    return {start: row.start, length: row.length};
  });
}

export function isActive(rows, x, z) {
  return integer(x, 0, 9) && integer(z, 0, 9) && x >= rows[z].start && x < rows[z].start + rows[z].length;
}

export function validateLayout(input, assetIds) {
  if (!object(input) || input.format !== FORMAT) fail('不是雨待町布局文件。');
  if (input.version !== VERSION) fail(`不支持布局版本 ${String(input.version)}；当前支持版本 ${VERSION}。`);
  const rows = validateRows(input.rows);
  if (!Array.isArray(input.instances) || input.instances.length > 100) fail('实例列表无效，最多 100 个。');
  const ids = new Set(), cells = new Set();
  const instances = input.instances.map(p => {
    if (!object(p) || typeof p.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(p.id)) fail('实例 ID 无效。');
    if (ids.has(p.id)) fail(`实例 ID 重复：${p.id}`);
    ids.add(p.id);
    if (typeof p.assetId !== 'string' || !assetIds.has(p.assetId)) fail(`未知或尚未交付的素材：${String(p.assetId)}`);
    if (!isActive(rows, p.x, p.z)) fail(`实例 ${p.id} 的坐标越界或位于地图外。`);
    if (![0, 90, 180, 270].includes(p.rotation)) fail(`实例 ${p.id} 的方向必须为 0、90、180 或 270°。`);
    const cell = `${p.x},${p.z}`;
    if (cells.has(cell)) fail(`重复占格：(${p.x}, ${p.z})。`);
    cells.add(cell);
    return {id: p.id, assetId: p.assetId, x: p.x, z: p.z, rotation: p.rotation};
  });
  return {format: FORMAT, version: VERSION, rows, instances};
}

export function parseLayout(text, assetIds) {
  if (typeof text !== 'string' || text.length > MAX_FILE_BYTES) fail('布局文件过大或不是文本。');
  let value;
  try { value = JSON.parse(text); } catch { fail('布局文件不是有效 JSON。'); }
  return validateLayout(value, assetIds);
}

export function createEditorState({assetIds, initial = emptyLayout(), idFactory = () => `i-${crypto.randomUUID()}`, onSubscriberError = error => console.error('Editor layout subscriber failed', error)} = {}) {
  const known = new Set(assetIds);
  let layout = validateLayout(initial, known), revision = 0;
  const history = [], listeners = new Set(), plans = new WeakSet();
  const getLayout = () => copy(layout);
  function publish(reason,undoContext) {
    revision++;
    for (const listener of listeners) {
      try { listener({reason, revision, layout: getLayout(), canUndo: history.length > 0,undoContext}); }
      catch (error) { onSubscriberError(error); }
    }
  }
  function commit(next, reason,undoContext) {
    const checked = validateLayout(next, known);
    if (JSON.stringify(checked) === JSON.stringify(layout)&&!undoContext) return false;
    history.push({layout,undoContext});
    if (history.length > 100) history.shift();
    layout = checked;
    publish(reason);
    return true;
  }
  function instance(id) {
    const p = layout.instances.find(p => p.id === id);
    if (!p) fail('该实例已不存在。');
    return p;
  }
  function canPlace(assetId, x, z, ignoreId = null) {
    if (!known.has(assetId)) return {ok: false, reason: '素材未知或尚未交付。'};
    if (!isActive(layout.rows, x, z)) return {ok: false, reason: '这里是地图外，请选择启用的草地格。'};
    const occupant = layout.instances.find(p => p.x === x && p.z === z && p.id !== ignoreId);
    if (occupant) return {ok: false, reason: '此格已占用。请先选择并搬动或删除原有素材。', occupant: copy(occupant)};
    return {ok: true};
  }
  function requireSpace(assetId, x, z, ignoreId) {
    const check = canPlace(assetId, x, z, ignoreId);
    if (!check.ok) fail(check.reason);
  }
  return {
    getLayout, get revision() { return revision; }, get canUndo() { return history.length > 0; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    canPlace,
    at(x, z) { const p = layout.instances.find(p => p.x === x && p.z === z); return p ? copy(p) : null; },
    place(assetId, x, z, rotation = 0) {
      requireSpace(assetId, x, z);
      const p = {id: idFactory(), assetId, x, z, rotation};
      commit({...layout, instances: [...layout.instances, p]}, 'place');
      return copy(p);
    },
    move(id, x, z, rotation = instance(id).rotation) {
      const p = instance(id);
      requireSpace(p.assetId, x, z, id);
      return commit({...layout, instances: layout.instances.map(item => item.id === id ? {...item, x, z, rotation} : item)}, 'move');
    },
    rotate(id) {
      instance(id);
      return commit({...layout, instances: layout.instances.map(p => p.id === id ? {...p, rotation: (p.rotation + 90) % 360} : p)}, 'rotate');
    },
    remove(id) { instance(id); return commit({...layout, instances: layout.instances.filter(p => p.id !== id)}, 'delete'); },
    previewShape(rows) {
      const checked = validateRows(rows);
      const removedCells = [], addedCells = [];
      for (let z = 0; z < LIMIT; z++) for (let x = 0; x < LIMIT; x++) {
        if (isActive(layout.rows, x, z) && !isActive(checked, x, z)) removedCells.push({x, z});
        if (!isActive(layout.rows, x, z) && isActive(checked, x, z)) addedCells.push({x, z});
      }
      const plan = {revision, rows: checked, affected: layout.instances.filter(p => !isActive(checked, p.x, p.z)).map(copy), removedCells, addedCells};
      // A plan is a frozen, revision-bound token. A caller cannot forge a destructive confirmation.
      for (const list of [plan.rows, plan.affected, plan.removedCells, plan.addedCells]) {
        for (const item of list) Object.freeze(item);
        Object.freeze(list);
      }
      Object.freeze(plan); plans.add(plan);
      return plan;
    },
    applyShape(plan, {confirmAffected = false} = {}) {
      if (!plans.has(plan) || plan.revision !== revision) fail('布局已变化，请重新预览地图形状。');
      if (plan.affected.length && !confirmAffected) fail('变化影响已有素材，请先确认影响范围。');
      plans.delete(plan);
      return commit({...layout, rows: plan.rows, instances: layout.instances.filter(p => isActive(plan.rows, p.x, p.z))}, 'shape');
    },
    loadLayout(input,{undoContext}={}) { return commit(input, 'load',undoContext); },
    importJSON(text) { return commit(parseLayout(text, known), 'import'); },
    exportJSON() { return JSON.stringify(layout, null, 2); },
    undo() {
      if (!history.length) return false;
      const entry=history.pop();layout = entry.layout; publish('undo',entry.undoContext); return true;
    }
  };
}
