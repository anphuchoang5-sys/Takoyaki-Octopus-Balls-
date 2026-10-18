import {parseLayout, emptyLayout} from './state.js';
export const STORAGE_KEY = 'rainy-corner.editor.layout.v1';

// Never overwrite an unreadable/unknown-version saved layout on startup.
export function readSavedLayout(storage, assetIds) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return {layout: emptyLayout(), status: '新地图 · 操作后自动保存', blocked: false};
    try { return {layout: parseLayout(raw, assetIds), status: '已恢复本机存档', blocked: false}; }
    catch (error) { return {layout: emptyLayout(), raw, status: `旧存档未覆盖：${error.message}`, blocked: true}; }
  } catch (error) { return {layout: emptyLayout(), status: `无法读取本机存档：${error.message}`, blocked: true}; }
}

export function connectAutosave(state, storage, {blocked = false, onStatus = () => {}} = {}) {
  function save() {
    if (blocked) { onStatus({ok: false, blocked: true, message: '自动保存暂停：旧存档已保留，请导出当前布局或明确替换旧存档。'}); return false; }
    try { storage.setItem(STORAGE_KEY, state.exportJSON()); onStatus({ok: true, blocked: false, message: '已自动保存到此浏览器'}); return true; }
    catch (error) { onStatus({ok: false, blocked: false, message: `自动保存失败，请导出布局：${error.message}`}); return false; }
  }
  const unsubscribe = state.subscribe(save);
  return {save, replacePreservedSave() { blocked = false; return save(); }, dispose: unsubscribe};
}
