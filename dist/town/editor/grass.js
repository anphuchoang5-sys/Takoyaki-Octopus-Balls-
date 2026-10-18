import * as THREE from 'three';
import {isActive} from './state.js';
import {ROAD_DEFINITIONS} from './roads.js';

const PULSES = 8, DENSITY = 24000;
const exits = new Map(ROAD_DEFINITIONS.map(d => [d.id, d.exits]));
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
export function hasGrassAt(layout, worldX, worldZ, tileSize = 14) {
  const x = Math.floor(worldX / tileSize + 5), z = Math.floor(worldZ / tileSize + 5);
  if (!isActive(layout.rows, x, z)) return false;
  const p = layout.instances.find(p => p.x === x && p.z === z);
  if (!p) return true;
  const dx = worldX - (x-4.5)*tileSize, dz = worldZ - (z-4.5)*tileSize;
  const angle = p.rotation * Math.PI / 180, lx = dx*Math.cos(angle)-dz*Math.sin(angle), lz = dx*Math.sin(angle)+dz*Math.cos(angle);
  const arms = exits.get(p.assetId);
  if (arms) {
    const half = 3.55 * tileSize / 14;
    if (Math.abs(lx) <= half && Math.abs(lz) <= half) return false;
    if (Math.abs(lx) <= half && ((lz < 0 && arms.includes('N')) || (lz > 0 && arms.includes('S')))) return false;
    if (Math.abs(lz) <= half && ((lx < 0 && arms.includes('W')) || (lx > 0 && arms.includes('E')))) return false;
    return true;
  }
  // The accepted convenience miniature now includes its complete paved square.
  if (p.assetId === 'convenience') return false;
  return false; // New B assets need their delivered footprint, never guessed grass-through-models.
}

export function createGrass({tileSize = 14} = {}) {
  const root = new THREE.Group(); root.name = 'living-grass';
  const pulses = Array.from({length: PULSES}, () => new THREE.Vector4(0, 0, -100, 0));
  const directions = Array.from({length: PULSES}, () => new THREE.Vector2());
  const uniforms = {uGrassTime: {value: 0}, uWindPulses: {value: pulses}, uWindDirections: {value: directions}, uBreeze: {value: 1}};
  let mesh = null, key = '', layout = null, pulseIndex = 0, lastEmit = -100, emitted = 0, bladeCount = 0;
  const material = new THREE.MeshStandardMaterial({color: '#72904b', roughness: 1, side: THREE.DoubleSide});
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute vec2 aRoot; attribute vec4 aShape; attribute float aTone;
      uniform float uGrassTime; uniform float uBreeze; uniform vec4 uWindPulses[${PULSES}]; uniform vec2 uWindDirections[${PULSES}];
      varying float vBladeTip; varying float vBladeTone;
      ${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      vec3 objectNormal = normalize(vec3(sin(aShape.x)*.22, .96, cos(aShape.x)*.22));`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      float tip = position.y;
      float wave = sin(uGrassTime*1.5 + aRoot.x*.7 + aRoot.y*.4 + aShape.w)*.10*uBreeze;
      vec2 bend = vec2(wave, wave*.45);
      for(int i=0;i<${PULSES};i++) {
        float age = uGrassTime-uWindPulses[i].z;
        float radius = 1.5 + max(age,0.0)*1.6;
        vec2 delta = aRoot-uWindPulses[i].xy;
        float envelope = exp(-dot(delta,delta)/(radius*radius))*exp(-max(age,0.0)*2.2);
        if(age>=0.0 && age<2.8) bend += uWindDirections[i]*uWindPulses[i].w*envelope;
      }
      float force = min(length(bend), 1.5);
      vec3 transformed = vec3(aRoot.x, .012, aRoot.y);
      transformed.xz += vec2(cos(aShape.x),sin(aShape.x))*position.x*aShape.z;
      transformed.y += tip*aShape.y*(1.0-force*.38*tip);
      transformed.xz += (bend*aShape.y*1.6 + vec2(sin(aShape.x),cos(aShape.x))*.055)*tip*tip;
      vBladeTip=tip; vBladeTone=aTone;`);
    shader.fragmentShader = `varying float vBladeTip; varying float vBladeTone;\n${shader.fragmentShader}`;
    // A grass blade has translucent foliage on both sides. Keep the upward canopy
    // normal on its back face, rather than lighting it as an upside-down opaque sheet.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
      THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(.82, 1.16, vBladeTip) * vBladeTone;`);
  };
  material.customProgramCacheKey = () => 'c-grass-v2-2';
  function rebuild(next) {
    layout = next;
    const nextKey = JSON.stringify([next.rows, next.instances.map(p => [p.assetId,p.x,p.z,p.rotation])]);
    if (key === nextKey) return; key = nextKey;
    const roots = [], shapes = [], tones = [];
    // Deterministic positions prevent the lawn visibly reshuffling after edits/undo.
    for (let z=0; z<10; z++) for (let x=0; x<10; x++) if (isActive(next.rows,x,z)) {
      const random = seeded(5831 + z*113 + x*7919);
      for (let i=0; i<DENSITY; i++) {
        const wx=(x-5+random())*tileSize, wz=(z-5+random())*tileSize;
        const yaw=random()*Math.PI*2, height=.45+random()*.585, width=.022+random()*.027, phase=random()*6.28, tone=.92+random()*.18;
        if (!hasGrassAt(next,wx,wz,tileSize)) continue;
        roots.push(wx,wz); shapes.push(yaw,height,width,phase); tones.push(tone);
      }
    }
    if (mesh) { root.remove(mesh); mesh.geometry.dispose(); }
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,-.34,.42,0,.34,.42,0,-.16,.78,0,.16,.78,0,0,1,0],3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({length:7},()=>[0,0,1]).flat(),3));
    geometry.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);
    geometry.setAttribute('aRoot',new THREE.InstancedBufferAttribute(new Float32Array(roots),2));
    geometry.setAttribute('aShape',new THREE.InstancedBufferAttribute(new Float32Array(shapes),4));
    geometry.setAttribute('aTone',new THREE.InstancedBufferAttribute(new Float32Array(tones),1));
    bladeCount = roots.length/2; geometry.instanceCount=bladeCount;
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-73,0,-73),new THREE.Vector3(73,1.1,73));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(),104);
    mesh = new THREE.Mesh(geometry,material); mesh.name='instanced-grass-blades'; mesh.receiveShadow=true; mesh.frustumCulled=false; root.add(mesh);
  }
  return {
    root, rebuild,
    update(time) { uniforms.uGrassTime.value=time; },
    stroke(from,to) {
      const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),time=uniforms.uGrassTime.value;
      if (!layout || length<.025 || time-lastEmit<.032 || !hasGrassAt(layout,to.x,to.z,tileSize)) return false;
      const index=pulseIndex++%PULSES; pulses[index].set(to.x,to.z,time,Math.min(1.2,.45+length*.20));
      directions[index].set(dx/length,dz/length); lastEmit=time; emitted++; return true;
    },
    sampleWind(x,z) {
      const result=new THREE.Vector2(),time=uniforms.uGrassTime.value;
      pulses.forEach((p,i)=>{const age=time-p.z,r=1.5+Math.max(age,0)*1.6;
        if(age>=0&&age<2.8) result.addScaledVector(directions[i],p.w*Math.exp(-((x-p.x)**2+(z-p.y)**2)/(r*r))*Math.exp(-age*2.2));});
      return {x:result.x,z:result.y};
    },
    getInspection() { return {bladeCount,emitted,time:uniforms.uGrassTime.value,lastPulse:pulses[(pulseIndex+PULSES-1)%PULSES].toArray(),lastDirection:directions[(pulseIndex+PULSES-1)%PULSES].toArray()}; },
    dispose() { mesh?.geometry.dispose(); material.dispose(); root.clear(); }
  };
}

export function createLawnMaterial() {
  const material=new THREE.MeshStandardMaterial({color:'#728650',roughness:1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=`varying vec3 vLawnWorld;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLawnWorld=(modelMatrix*vec4(position,1.0)).xyz;');
    shader.fragmentShader=`varying vec3 vLawnWorld;\n${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
      float fine=fract(sin(dot(floor(vLawnWorld.xz*24.0),vec2(12.9898,78.233)))*43758.5453);
      float patches=sin(vLawnWorld.x*.43+sin(vLawnWorld.z*.55))*sin(vLawnWorld.z*.61)*.08;
      diffuseColor.rgb*=.91+fine*.16+patches;`);
  };
  material.customProgramCacheKey=()=> 'c-lawn-v2'; return material;
}
