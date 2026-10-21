import * as THREE from 'three';
import {MAX_FILE_BYTES} from './state.js';
import {worldToCell} from './scene.js';
import {editorShell} from './ui-shell.js';
import {hasGrassAt} from './grass.js';

export function mountEditorUI({host, canvas, camera, state, sceneView, assets, pendingBuildings, thumbnails, runtime, documentAPI=state, onOverview = () => {}, onFocus = () => {}, onEditingChange = () => {}, isCameraBusy = () => false}) {
  host.innerHTML = editorShell;
  const $ = id => host.querySelector(`#${id}`);
  $('viewport').prepend(canvas);
  const cleanup = [], assetById = new Map(assets.map(a => [a.id, a]));
  let tool = null, selectedId = null, rotation = 0, movingId = null, plan = null, hover = null, down = null, disposed = false, editingOpen = false, lastPlacedId = null, messageTimer;
  let windAnchor = null, editingNotified = null;
  const resetWind = () => { windAnchor = null; };
  function on(target, type, listener, options) { target.addEventListener(type, listener, options); cleanup.push(() => target.removeEventListener(type, listener, options)); }
  function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); $('message').classList.add('visible'); clearTimeout(messageTimer); messageTimer=setTimeout(()=>$('message').classList.remove('visible'),error?6500:3200); }
  function guarded(action) { try { return action(); } catch (error) { message(error.message, true); return false; } }
  function download(text, name) {
    const url = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function clearPlan() { plan = null; $('shape-impact').hidden = true; sceneView.showShape(null); }
  function current() { return state.getLayout().instances.find(p => p.id === selectedId); }
  function isEditing() { const r = runtime.getState(); return editingOpen && r.values.mode === 'god' && !r.pending.includes('mode'); }
  function requireEditing() { if (!isEditing()) { message('当前不能编辑，请等待模式切换完成或返回上帝视角。', true); return false; } return true; }
  function paintSelection() {
    const p = current(); if (!p) selectedId = null;
    const active = movingId ? assetById.get(p?.assetId) : assetById.get(tool);
    $('selection-title').textContent = active ? `${movingId ? '搬动' : '放置'} · ${active.name}` : p ? assetById.get(p.assetId).name : '尚未选择素材';
    $('selection-detail').textContent = active ? `${rotation}° · 点击空格确认，Esc 取消` : p ? `坐标 (${p.x}, ${p.z}) · ${p.rotation}°` : '点击已有素材可选中编辑';
    $('rotate').disabled = !isEditing() || (!p && !tool);
    $('move').disabled = $('delete').disabled = !isEditing() || !p || !!tool || !!movingId;
    $('undo').disabled = !isEditing() || !state.canUndo;
    $('select-tool').classList.toggle('active', !tool && !movingId);
    host.querySelectorAll('[data-asset]').forEach(card => { const active = card.dataset.asset === tool; card.classList.toggle('selected', active); card.setAttribute('aria-pressed', String(active)); });
    sceneView.select(selectedId);
  }
  function cancelTool() { tool = null; movingId = null; down = null; resetWind(); sceneView.preview(); paintSelection(); }
  function setEditing(enabled) {
    const focusId=lastPlacedId || selectedId;
    editingOpen=!!enabled; clearPlan(); cancelTool(); selectedId=null; sceneView.select(null); fillRows();
    $('workbench').hidden=$('edit-controls').hidden=!editingOpen; $('enter-editor').hidden=editingOpen;
    $('enter-editor').setAttribute('aria-expanded',String(editingOpen)); host.classList.toggle('editing',editingOpen);
    $('scene-hint').classList.add('dismissed'); refreshRuntime();
    if(enabled && runtime.getState().values.mode==='walk')showPanel('environment');
    if(!enabled) {clearTimeout(messageTimer);$('message').classList.remove('visible');if(focusId)onFocus(focusId);} lastPlacedId=null;
  }
  function showPanel(name) {
    for(const button of host.querySelectorAll('[data-panel]')) { const active=button.dataset.panel===name;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active)); }
    for(const panel of ['assets','shape','environment','save']) $('panel-'+panel).hidden=panel!==name;
    if(name==='shape')onOverview();
  }
  on($('enter-editor'),'click',()=>setEditing(true)); on($('exit-editor'),'click',()=>setEditing(false));
  host.querySelectorAll('[data-panel]').forEach(button=>on(button,'click',()=>showPanel(button.dataset.panel)));
  function choose(assetId) {
    if (!requireEditing()) return;
    clearPlan(); resetWind(); selectedId = null; movingId = null; tool = assetId; rotation = 0; sceneView.preview(); paintSelection();
    message(`已选择${assetById.get(assetId).name}，点击草地或拖入地图。`);
  }
  $('building-count').textContent = `${assets.filter(asset => asset.category === 'building').length} 件可用`;
  for (const asset of assets) {
    const card = document.createElement('button'); card.className = `asset-card ${asset.category}`; card.dataset.asset = asset.id; card.draggable = true;
    card.setAttribute('aria-label', asset.name); card.setAttribute('aria-pressed', 'false');
    const img = document.createElement('img'); img.src = thumbnails.get(asset.id); img.alt = `${asset.name}真实模型缩略图`; img.draggable = false;
    const name = document.createElement('strong'); name.textContent = asset.name;
    const note = document.createElement('span'); note.textContent = asset.note || '1 格 · 可旋转';
    card.append(img, name, note); $(asset.category === 'building' ? 'buildings' : 'roads').append(card);
    on(card, 'click', () => choose(asset.id));
    on(card, 'dragstart', event => {
      if (!isEditing()) { event.preventDefault(); return; }
      choose(asset.id); event.dataTransfer.setData('application/x-rainy-corner-asset', asset.id); event.dataTransfer.effectAllowed = 'copy';
    });
    on(card, 'dragend', () => { resetWind(); sceneView.preview(); hover = null; });
  }
  for (const name of pendingBuildings) {
    const row = document.createElement('div'); row.className = 'pending-row'; const label = document.createElement('span'); label.textContent = name;
    const status = document.createElement('small'); status.textContent = '待接入'; row.append(label, status); $('pending-assets').append(row);
  }
  for (let z = 0; z < 10; z++) {
    const row = document.createElement('div'); row.className = 'shape-row';
    row.innerHTML = `<div class="row-map"><b>${String(z + 1).padStart(2, '0')}</b><span class="mini-row">${'<i></i>'.repeat(10)}</span></div><input id="start-${z}" aria-label="第${z + 1}行起点" type="number" min="1" max="10" step="1"><input id="length-${z}" aria-label="第${z + 1}行格数" type="number" min="0" max="10" step="1">`;
    $('rows').append(row);
    for (const input of row.querySelectorAll('input')) on(input, 'input', () => { clearPlan(); updateMiniRow(z); });
  }
  function readRows() { return Array.from({length: 10}, (_, z) => ({start: $('start-'+z).valueAsNumber - 1, length: $('length-'+z).valueAsNumber})); }
  function updateMiniRow(z) {
    const start = $('start-'+z).valueAsNumber - 1, length = $('length-'+z).valueAsNumber;
    const valid = Number.isInteger(start) && Number.isInteger(length) && start >= 0 && start < 10 && length >= 0 && length <= 10 && start + length <= 10;
    const row = $('start-'+z).closest('.shape-row'); row.classList.toggle('invalid', !valid);
    for (const input of row.querySelectorAll('input')) input.setAttribute('aria-invalid', String(!valid));
    row.querySelectorAll('.mini-row i').forEach((cell, x) => cell.classList.toggle('enabled', valid && x >= start && x < start + length));
  }
  function fillRows() { state.getLayout().rows.forEach((row, z) => { $('start-'+z).value = row.start + 1; $('length-'+z).value = row.length; updateMiniRow(z); }); }
  function refresh() {
    resetWind(); clearPlan(); fillRows(); paintSelection();
    const layout = state.getLayout(); $('map-count').textContent = `${layout.rows.reduce((n, r) => n + r.length, 0)} 格土地 / ${layout.instances.length} 件素材`;
    $('empty-note').hidden = layout.instances.length > 0;
  }
  cleanup.push(state.subscribe(() => { sceneView.preview(); refresh(); }));
  on($('preview-shape'), 'click', () => guarded(() => {
    if (!requireEditing()) return; cancelTool();
    plan = state.previewShape(readRows()); sceneView.showShape(plan);
    $('shape-impact').hidden = false;
    $('impact-description').textContent = `移除 ${plan.removedCells.length} 格，新增 ${plan.addedCells.length} 格；影响 ${plan.affected.length} 件素材。确认后可整体撤销。`;
    $('affected-list').replaceChildren();
    for (const p of plan.affected) { const li = document.createElement('li'); li.textContent = `${assetById.get(p.assetId).name} · (${p.x}, ${p.z})`; $('affected-list').append(li); }
    $('apply-shape').textContent = plan.affected.length ? `确认并移除 ${plan.affected.length} 件素材` : '确认轮廓变化';
    message('已显示影响范围，请确认或取消。');
  }));
  on($('apply-shape'), 'click', () => guarded(() => { if (!requireEditing() || !plan) return; state.applyShape(plan, {confirmAffected: true}); clearPlan(); message('地图轮廓已更新，可以一步撤销。'); }));
  on($('cancel-shape'), 'click', () => { clearPlan(); fillRows(); message('已取消轮廓变化。'); });
  function rotate() {
    if (!requireEditing()) return;
    if (tool || movingId) { rotation = (rotation + 90) % 360; updateHover(); paintSelection(); message(`预览方向 ${rotation}°`); }
    else if (selectedId) { state.rotate(selectedId); message('已旋转 90°。'); }
  }
  function startMove() {
    if (!requireEditing()) return;
    const p = current(); if (!p) return;
    clearPlan(); resetWind(); tool = null; movingId = p.id; rotation = p.rotation; updateHover(); paintSelection(); message('选择目标空格；确认前原有位置保持不变。');
  }
  function remove() { if (!requireEditing() || !selectedId) return; state.remove(selectedId); cancelTool(); message('已删除；可撤销恢复。'); }
  function undo() { if (!requireEditing()) return; cancelTool(); if (state.undo()) message('已撤销上一步布局变化。'); }
  on($('select-tool'), 'click', () => { cancelTool(); message('点击已有素材可选中，拖动也可搬动。'); });
  on($('rotate'), 'click', () => guarded(rotate)); on($('move'), 'click', () => guarded(startMove));
  on($('delete'), 'click', () => guarded(remove)); on($('undo'), 'click', () => guarded(undo));

  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function aim(event) {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return worldToCell(hit.x, hit.z, sceneView.tileSize);
  }
  function pick(event, cellFallback = true) {
    const cell = aim(event);
    const hits = raycaster.intersectObjects(sceneView.getInstances().map(item => item.asset.root), true);
    for (const hit of hits) {
      // Ignore nonphysical glow, the broad default line hit tolerance and buried base edges.
      if(!hit.object.isMesh || hit.point.y<-.01 || hit.object.material?.blending===THREE.AdditiveBlending)continue;
      let node = hit.object; while (node) { if (node.userData.instanceId) return state.getLayout().instances.find(p => p.id === node.userData.instanceId); node = node.parent; }
    }
    return cell && cellFallback ? state.at(cell.x, cell.z) : null;
  }
  function updateHover() {
    if (!hover || plan || !isEditing()) { sceneView.preview(); return; }
    const p = current(), assetId = movingId ? p?.assetId : tool;
    $('coordinates').textContent = `坐标 (${hover.x}, ${hover.z})${assetId ? ` · ${rotation}°` : ''}`;
    if (!assetId) { sceneView.preview(); return; }
    const check = state.canPlace(assetId, hover.x, hover.z, movingId);
    sceneView.preview({assetId, ...hover, rotation, valid: check.ok});
    $('coordinates').textContent += check.ok ? ' · 可放置' : ' · '+check.reason;
  }
  function commitAt(cell, event) {
    if (!cell || !requireEditing()) return;
    if (plan) { message('请先确认或取消地图轮廓预览。', true); return; }
    if (movingId) {
      state.move(movingId, cell.x, cell.z, rotation); movingId = null; sceneView.preview(); paintSelection(); message('已搬动，实例 ID 保持不变。');
    } else if (tool) { const placed=state.place(tool, cell.x, cell.z, rotation); lastPlacedId=placed.id; message('已放置。完成布置后可双击建筑细看。'); }
    else {
      const p = event ? pick(event) : state.at(cell.x, cell.z); selectedId = p?.id || null; paintSelection();
      message(p ? `已选择${assetById.get(p.assetId).name}。` : '未摆放素材的启用格是可行走草地。');
    }
  }
  function hoverWind(event) {
    const r=runtime.getState();
    if(event.pointerType!=='mouse'||event.buttons!==0||down||tool||movingId||plan||r.values.mode!=='god'||r.pending.includes('mode')||isCameraBusy()||!hover) { resetWind();return; }
    // A visible model blocks the ray even if its ground projection would be grass.
    if(!hasGrassAt(state.getLayout(),hit.x,hit.z,sceneView.tileSize)||pick(event,false)) {resetWind();return;}
    const now=performance.now(),next=hit.clone();
    const sameMatrix=(a,b)=>a.elements.every((value,i)=>Math.abs(value-b.elements[i])<.0001);
    if(windAnchor && now-windAnchor.time<300 && sameMatrix(windAnchor.view,camera.matrixWorld) && sameMatrix(windAnchor.projection,camera.projectionMatrix)) {
      sceneView.grass.stroke(windAnchor.point,next);
    }
    // Never connect strokes across a camera move, UI crossing, pause or mode change.
    windAnchor={point:next,time:now,view:camera.matrixWorld.clone(),projection:camera.projectionMatrix.clone()};
  }
  on(canvas, 'pointermove', event => guarded(() => {
    hover = aim(event);
    if (down?.instance && !down.dragged && Math.hypot(event.clientX-down.x, event.clientY-down.y) > 7) {
      selectedId = down.instance.id; startMove(); down.dragged = true;
    }
    hoverWind(event); updateHover();
  }));
  on(canvas, 'pointerleave', () => { resetWind(); if (!down) { hover = null; sceneView.preview(); } });
  on(canvas, 'wheel', resetWind, {passive:true});
  on(canvas, 'pointerdown', event => {
    resetWind();
    if (event.button !== 0 || plan) return;
    if (!isEditing()) {
      canvas.focus();$('scene-hint').classList.add('dismissed');return;
    }
    canvas.focus(); canvas.setPointerCapture(event.pointerId);
    down = {x: event.clientX, y: event.clientY, instance: !tool && !movingId ? pick(event) : null, dragged: false};
  });
  on(canvas, 'pointerup', event => guarded(() => {
    resetWind();
    if (event.button !== 0 || !down) return;
    const rect = canvas.getBoundingClientRect(), inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    down = null;
    if (!isEditing()) return;
    if (inside) commitAt(aim(event), event); else { cancelTool(); message('已取消搬动，原位置未改变。'); }
  }));
  on(canvas, 'pointercancel', () => { cancelTool(); });
  on(canvas,'dblclick',event=>{if(event.button===0&&!tool&&!movingId&&runtime.getState().values.mode==='god'){const p=pick(event,false);if(p)onFocus(p.id);}});
  on(canvas, 'dragover', event => {
    resetWind();
    if (!event.dataTransfer.types.includes('application/x-rainy-corner-asset') || !isEditing()) return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; hover = aim(event); updateHover();
  });
  on(canvas, 'drop', event => guarded(() => {
    resetWind();
    event.preventDefault(); const id = event.dataTransfer.getData('application/x-rainy-corner-asset');
    if (!assetById.has(id) || !requireEditing()) { message('无法导入未知拖放素材。', true); return; }
    tool = id; movingId = null; selectedId = null; commitAt(aim(event)); sceneView.preview(); paintSelection();
  }));
  on(document, 'keydown', event => guarded(() => {
    if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if(event.key==='Home'){event.preventDefault();onOverview();return;}
    if(!isEditing())return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.key === 'Escape') { if(tool||movingId||plan){clearPlan();fillRows();cancelTool();message('已取消当前预览。');}else setEditing(false); }
    else if (event.key.toLowerCase() === 'r') { event.preventDefault(); rotate(); }
    else if (event.key.toLowerCase() === 'm') { event.preventDefault(); startMove(); }
    else if (event.key === 'Delete') { event.preventDefault(); remove(); }
  }));
  on(window, 'blur', () => { down = null; resetWind(); sceneView.preview(); });
  on($('view-toggle'), 'click', () => onOverview({top:true}));
  on($('view-overview'), 'click', () => onOverview());
  on($('export'), 'click', () => { download(documentAPI.exportJSON(), '小丸子小镇-街区-v2.json'); message('已导出布局文件。'); });
  on($('import'), 'click', () => { if (requireEditing()) $('import-file').click(); });
  on($('import-file'), 'change', async () => {
    const file = $('import-file').files[0]; $('import-file').value = ''; if (!file) return;
    if (file.size > MAX_FILE_BYTES) { message('布局文件不能超过 1 MB；当前布局未改变。', true); return; }
    try {
      const text = await file.text(); if (disposed || !requireEditing()) return;
      documentAPI.importJSON(text); cancelTool(); message('已导入布局，可撤销回到导入前。');
    } catch (error) { message(`导入失败，当前布局未改变：${error.message}`, true); }
  });
  function refreshRuntime() {
    resetWind();
    const snapshot = runtime.getState(), busy = snapshot.pending.includes('mode');
    $('god').classList.toggle('active', snapshot.values.mode === 'god'); $('walk').classList.toggle('active', snapshot.values.mode === 'walk');
    $('walk').querySelector('small').textContent = snapshot.capabilities.mode ? '' : '待接入';
    $('enter-editor').querySelector('span').textContent=snapshot.values.mode==='walk'?'环境与视角':'布置街区';
    $('god').disabled = $('walk').disabled = busy;
    for (const key of ['time', 'weather']) { $(key).value = snapshot.values[key] || ''; $(key).disabled = !snapshot.capabilities[key] || snapshot.pending.includes(key); }
    $('runtime-status').textContent = [['weather','晴雨'],['time','时间'],['mode','散步']].map(([key,label])=>`${label}${snapshot.capabilities[key]?'已接入':'待接入'}`).join(' · ') + (busy ? ' · 模式切换中' : '');
    for (const id of ['preview-shape', 'apply-shape', 'import']) $(id).disabled = !isEditing();
    host.querySelectorAll('.shape-row input').forEach(input => { input.disabled = !isEditing(); });
    const editing=isEditing();
    if(editingNotified!==editing) { down=null;editingNotified=editing;onEditingChange(editing); }
    canvas.setAttribute('aria-label',editing
      ?'三维街区布置。左键选择或放置，左键拖动建筑，右键环绕，中键平移，滚轮缩放。不按键掠过草地起风，操作镜头或素材时暂停新风。'
      :'三维街区观赏。左键拖动环绕，右键或中键平移，滚轮缩放，双击建筑聚焦。不按键掠过草地起风。');
    sceneView.setEditing(editing); paintSelection();
  }
  async function request(kind, value) {
    cancelTool(); clearPlan(); const result = await runtime.request(kind, value);
    if (disposed) return;
    message(result.ok ? '运行层已确认切换。' : result.message, !result.ok); refreshRuntime();
  }
  on($('god'), 'click', () => request('mode', 'god')); on($('walk'), 'click', () => request('mode', 'walk'));
  for (const key of ['time', 'weather']) on($(key), 'change', () => { if ($(key).value) request(key, $(key).value); else refreshRuntime(); });
  cleanup.push(runtime.subscribe(refreshRuntime));
  refresh(); refreshRuntime();
  return {
    message, download, setEditing, showPanel,
    setSaveStatus(text, failed = false) { $('save-status').textContent = text; $('save-status').classList.toggle('save-error', failed); $('enter-editor').classList.toggle('save-error',failed); if(failed)message(text,true); },
    setRecovery({raw, replace}) {
      $('replace-save').hidden = false;
      on($('replace-save'), 'click', () => {
        if (window.confirm('确认用当前地图替换保留的旧存档？建议先下载旧存档备份。')) {
          if (replace()) { $('replace-save').hidden = true; $('backup-save').hidden = true; }
        }
      });
      if (typeof raw === 'string') { $('backup-save').hidden = false; on($('backup-save'), 'click', () => download(raw, '小丸子小镇-存档备份.json')); }
    },
    getSelection() { return {tool, selectedId, movingId, rotation, editingOpen}; },
    dispose() { disposed = true;clearTimeout(messageTimer); for (const remove of cleanup) remove(); }
  };
}
