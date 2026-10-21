const allowed = {mode: ['god', 'walk'], time: ['morning', 'afternoon', 'dusk', 'night'], weather: ['clear', 'rain', 'snow']};
const methods = {mode: 'setMode', time: 'setTime', weather: 'setWeather'};

// Capability-based host adapter. Values only change after acknowledgement.
export function createRuntimeBridge() {
  let adapter = null, generation = 0;
  const values = {mode: 'god', time: null, weather: null}, pending = new Set(), listeners = new Set();
  const snapshot = () => ({values: {...values}, pending: [...pending], connected: !!adapter,
    capabilities: Object.fromEntries(Object.entries(methods).map(([key, method]) => [key, typeof adapter?.[method] === 'function']))});
  function emit(event) { for (const listener of listeners) listener({...event, state: snapshot()}); }
  return {
    syncEnvironment(value) { values.time=value.time;values.weather=value.weather;emit({type:'environment'}); },
    getState: snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    connect(next) {
      if (!next || typeof next !== 'object') throw new Error('运行层适配器无效。');
      if (pending.size) throw new Error('运行请求尚未完成，请稍后连接运行层。');
      adapter = next; generation++; emit({type: 'connection'});
      return () => { if (adapter === next) { adapter = null; generation++; pending.clear(); emit({type: 'connection'}); } };
    },
    async request(kind, value) {
      if (!allowed[kind]?.includes(value)) return {ok: false, message: '不支持的运行控制值。'};
      if (pending.has(kind)) return {ok: false, message: '该项请求正在处理中。'};
      const requestGeneration = generation;
      if (kind === 'mode' && value === 'god' && values.mode === 'god' && typeof adapter?.setMode !== 'function') return {ok: true, value, local: true};
      const handler = adapter?.[methods[kind]];
      if (typeof handler !== 'function') {
        const result = {ok: false, message: '当前能力尚未接入，场景未改变。'};
        emit({type: 'unavailable', kind, value, ...result}); return result;
      }
      pending.add(kind); emit({type: 'request', kind, value});
      try {
        const result = await handler.call(adapter, value);
        if (generation !== requestGeneration) return {ok: false, message: '运行层已断开，忽略旧响应。'};
        if (result?.ok !== true || result.value !== value) throw new Error(result?.message || '运行层未确认此变化。');
        values[kind] = value;
        emit({type: 'confirmed', kind, value});
        return {ok: true, value};
      } catch (error) { emit({type: 'failed', kind, value, message: error.message}); return {ok: false, message: error.message}; }
      finally { if (generation === requestGeneration) { pending.delete(kind); emit({type: 'settled', kind}); } }
    }
  };
}
