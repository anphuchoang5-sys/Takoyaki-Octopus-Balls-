import * as THREE from 'three';

export const environmentSupport=Object.freeze({
  times:Object.freeze(['morning','afternoon','dusk','night']),
  weathers:Object.freeze(['clear','rain','snow','hail','wind','leaves']),
  weatherEffects:false
});

// One controller per factory instance. It owns no Light, geometry, clock or scene.
export function createEnvironment(root,{lampPositions,glow,glass}){
  const originals=new Map();
  root.traverse(node=>{
    for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){
      if(!originals.has(material))originals.set(material,{
        color:material.color?.clone(),opacity:material.opacity,
        emissiveIntensity:material.emissiveIntensity
      });
    }
  });
  let state={time:'afternoon',weather:'clear'},disposed=false;
  function inspect(){
    return {...state,night:state.time==='night',lighting:state.time==='night'?'night':state.time==='dusk'?'dusk':'day',
      weatherEffectsImplemented:false,weatherEffect:'none',snowImplemented:false,disposed};
  }
  function getLightingDescriptors(){
    if(disposed)return [];
    const strength=state.time==='night'?1:state.time==='dusk'?.45:0;
    return lampPositions.map((p,i)=>({
      id:i===0?'counter-pendant':'room-pendant',type:'spot',color:'#ffd8a6',
      intensity:8+strength*(i===0?5:3),
      distance:4.3+strength*(i===0?1.2:.65),
      position:[p.x,p.y-.08,p.z],
      // Aim the existing counter pendant slightly toward the doorway. Real walls
      // and the lintel clip its warm spill; no floating decal or luminous portal.
      target:[p.x-strength*.48,.4,p.z+strength*(i===0?.90:.18)],
      angle:Math.PI*.39,penumbra:.8+strength*.15,decay:1.5,
      castShadow:true,shadowMapSize:1024,shadowNear:.06,
      shadowBias:-.0002,shadowNormalBias:.012
    }));
  }
  function setEnvironment(next={}){
    if(disposed)return inspect();
    if(!next||typeof next!=='object'||Array.isArray(next))throw new TypeError('みつや环境参数必须是对象。');
    const value={time:next.time??state.time,weather:next.weather??state.weather};
    if(!environmentSupport.times.includes(value.time)||!environmentSupport.weathers.includes(value.weather))
      throw new RangeError('みつや环境值无效，保留现有状态。');
    state=value;
    const strength=state.time==='night'?1:state.time==='dusk'?.45:0;
    for(const [material,base] of originals){
      if(base.color)material.color.copy(base.color);
      material.opacity=base.opacity;
      // Normal objects are lit by the host's real lights at night. Preserve the
      // original daytime toon fill exactly instead of multiplying current values.
      if(base.emissiveIntensity!==undefined)material.emissiveIntensity=base.emissiveIntensity*(1-strength);
      if(material===glow)material.color.lerp(new THREE.Color('#fff0cf'),strength);
      if(material===glass){material.color.lerp(new THREE.Color('#779cb9'),strength);material.opacity=base.opacity-strength*.025;}
      if(material.isLineBasicMaterial)material.opacity=base.opacity-strength*.045;
    }
    return inspect();
  }
  setEnvironment();
  return {setEnvironment,inspect,getLightingDescriptors,
    dispose(){if(disposed)return;disposed=true;originals.clear();}};
}
