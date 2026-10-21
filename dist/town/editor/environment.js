// One host clock; environment never enters layout undo history.
export const DEFAULT_ENVIRONMENT = Object.freeze({time:'afternoon',weather:'clear',snowAmount:0});
export const TIMES = ['morning','afternoon','dusk','night'];
export const WEATHERS = ['clear','rain','snow'];
export function validateEnvironment(input, base=DEFAULT_ENVIRONMENT) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('环境必须是对象。');
  const value={...base,...input};
  if (!TIMES.includes(value.time)||!WEATHERS.includes(value.weather)||
      !Number.isFinite(value.snowAmount)||value.snowAmount<0||value.snowAmount>1)
    throw new Error('环境时段、天气或雪量无效，雪量必须在 0～1。');
  return {time:value.time,weather:value.weather,snowAmount:value.snowAmount};
}
export function createEnvironmentState(initial=DEFAULT_ENVIRONMENT) {
  let value=validateEnvironment(initial),elapsed=0;
  const listeners=new Set(),get=()=>({...value});
  function set(patch) {
    const next=validateEnvironment(patch,value);
    if (JSON.stringify(next)===JSON.stringify(value)) return get();
    const previous=get();value=next;
    try {for(const fn of listeners)fn(get(),previous);}
    catch(error){value=previous;for(const fn of listeners){try{fn(get(),next);}catch{}}throw error;}
    return get();
  }
  return {get,set,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    advance(seconds) {
      if (!Number.isFinite(seconds)||seconds<elapsed) throw new Error('环境需要单调递增的累计秒数。');
      const dt=seconds-elapsed;elapsed=seconds;
      if(dt) set({snowAmount:Math.max(0,Math.min(1,value.snowAmount+dt*(value.weather==='snow'?1/60:value.weather==='rain'?-1/60:-1/300)))});
      return get();
    },get elapsedSeconds(){return elapsed;}};
}
