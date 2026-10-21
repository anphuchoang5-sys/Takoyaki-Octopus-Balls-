import {validateLayout, emptyLayout, MAX_FILE_BYTES} from './state.js';
import {validateEnvironment,DEFAULT_ENVIRONMENT} from './environment.js';
export const STORAGE_KEY = 'rainy-corner.editor.layout.v1';
export function parseTown(input,assetIds,current=DEFAULT_ENVIRONMENT) {
  if(typeof input==='string'){
    if(input.length>MAX_FILE_BYTES)throw new Error('存档文件过大。');
    try{input=JSON.parse(input);}catch{throw new Error('存档不是有效 JSON。');}
  }
  if(input?.format==='rainy-corner-layout')return{layout:validateLayout(input,assetIds),environment:validateEnvironment(current),legacy:true};
  if(input?.format!=='maruko-town'||input.version!==2)throw new Error('不支持的街区存档格式或版本。');
  if(!input.environment||!['time','weather','snowAmount'].every(k=>Object.hasOwn(input.environment,k)))throw new Error('环境存档缺少必要字段。');
  return{layout:validateLayout(input.layout,assetIds),environment:validateEnvironment(input.environment),legacy:false};
}
export const exportTown=(layout,environment)=>JSON.stringify({format:'maruko-town',version:2,layout,environment:validateEnvironment(environment)},null,2);

// Never overwrite an unreadable/unknown-version saved layout on startup.
export function readSavedLayout(storage, assetIds) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return {layout: emptyLayout(), status: '新地图 · 操作后自动保存', blocked: false};
    try { return {...parseTown(raw, assetIds), status: '已恢复本机存档', blocked: false}; }
    catch (error) { return {layout: emptyLayout(), raw, status: `旧存档未覆盖：${error.message}`, blocked: true}; }
  } catch (error) { return {layout: emptyLayout(), status: `无法读取本机存档：${error.message}`, blocked: true}; }
}

export function connectAutosave(state, storage, {blocked = false, onStatus = () => {},serialize=state.exportJSON,canSave=()=>true} = {}) {
  function save() {
    if(!canSave())return false;
    if (blocked) { onStatus({ok: false, blocked: true, message: '自动保存暂停：旧存档已保留，请导出当前布局或明确替换旧存档。'}); return false; }
    try { storage.setItem(STORAGE_KEY, serialize()); onStatus({ok: true, blocked: false, message: '已自动保存到此浏览器'}); return true; }
    catch (error) { onStatus({ok: false, blocked: false, message: `自动保存失败，请导出布局：${error.message}`}); return false; }
  }
  const unsubscribe = state.subscribe(save);
  return {save, replacePreservedSave() { blocked = false; return save(); }, dispose: unsubscribe};
}
