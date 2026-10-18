import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {glass} from '../world.js';

export const PERIODS={
  morning:{hour:8,sky:'#c5d5cb',fog:'#d5dcc9',sun:'#ffe8b2',sunPower:2.0,ambient:1.65,angle:.55,night:0},
  afternoon:{hour:14,sky:'#adc7c5',fog:'#c7d2be',sun:'#fff0d0',sunPower:2.6,ambient:1.7,angle:1.25,night:0},
  dusk:{hour:18,sky:'#ccb7a9',fog:'#d5c1aa',sun:'#f3b278',sunPower:1.8,ambient:1.2,angle:.23,night:.6},
  night:{hour:22,sky:'#142a3c',fog:'#233c49',sun:'#8baccc',sunPower:.65,ambient:.55,angle:.65,night:1}
};
export const WEATHER_TYPES=['clear','rain','hail'];
export function createEnvironment(scene,map){
  let period='dusk',weather='clear',wetness=0,night=.6,rainAmount=0,hailAmount=0;
  const root=new THREE.Group();root.name='shared-weather';scene.add(root);
  const ambient=new THREE.HemisphereLight('#d1dfd0','#67766c',1.2);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#f3b278',1.8);sun.position.set(-12,8,10);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.5,far:65});sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;sun.shadow.radius=2.5;scene.add(sun,sun.target);
  const sky=new THREE.Color(PERIODS.dusk.sky),fog=new THREE.Color(PERIODS.dusk.fog);scene.background=sky;scene.fog=new THREE.FogExp2(fog,.0045);
  const pool=Array.from({length:4},()=>{const l=new THREE.PointLight('#ffd49a',0,9,2);scene.add(l);return l;});
  const uniforms={time:{value:0},rain:{value:0},hail:{value:0},wet:{value:0}};
  // Every precipitation effect consults one roof-height field for the entire map.
  const size=128,data=new Float32Array(size*size);
  function roofHeight(r,x,z){if(r.ridge===undefined)return r.height;const across=r.ridgeAxis==='z'?Math.abs(x-r.x)/(r.w/2):Math.abs(z-r.z)/(r.d/2);return r.eave+(r.ridge-r.eave)*(1-THREE.MathUtils.clamp(across,0,1));}
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    const wx=(x+.5)/size*42-21,wz=(z+.5)/size*42-21;let y=map.heightAt(wx,wz);
    for(const r of map.roofs)if(Math.abs(wx-r.x)<r.w/2&&Math.abs(wz-r.z)<r.d/2)y=Math.max(y,roofHeight(r,wx,wz));
    data[z*size+x]=y;
  }
  const heights=new THREE.DataTexture(data,size,size,THREE.RedFormat,THREE.FloatType);heights.needsUpdate=true;heights.minFilter=heights.magFilter=THREE.NearestFilter;
  uniforms.roofs={value:heights};
  const rainCount=4800,positions=[],ends=[];
  let seed=2721;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<rainCount;i++){const x=(rand()-.5)*41.8,z=(rand()-.5)*41.8,y=rand()*12;positions.push(x,y,z,x,y,z);ends.push(0,1);}
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));rg.setAttribute('end',new THREE.Float32BufferAttribute(ends,1));
  const rm=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`uniform float time;uniform sampler2D roofs;attribute float end;varying float vFade;void main(){vec3 p=position;float floorY=texture2D(roofs,(p.xz+21.)/42.).r;p.y=floorY+mod(p.y-time*7.,12.);p.y+=end*.22;p.x+=end*.018;vFade=.32;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float rain;varying float vFade;void main(){gl_FragColor=vec4(.68,.79,.80,vFade*rain);}`});
  const rainMesh=new THREE.LineSegments(rg,rm);rainMesh.frustumCulled=false;root.add(rainMesh);
  const hg=new THREE.InstancedBufferGeometry(),ice=new THREE.IcosahedronGeometry(.038,0);hg.index=ice.index;hg.attributes=ice.attributes;
  const offset=[],phase=[];for(let i=0;i<750;i++){offset.push((rand()-.5)*41.7,0,(rand()-.5)*41.7);phase.push(rand());}
  hg.setAttribute('offset',new THREE.InstancedBufferAttribute(new Float32Array(offset),3));hg.setAttribute('phase',new THREE.InstancedBufferAttribute(new Float32Array(phase),1));hg.instanceCount=phase.length;
  const hm=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`uniform float time;uniform sampler2D roofs;attribute vec3 offset;attribute float phase;varying float shade;void main(){float p=fract(time*.64+phase);float y=p<.72?12.*pow(1.-p/.72,2.):sin((p-.72)/.28*3.14159)*.42;float floorY=texture2D(roofs,(offset.xz+21.)/42.).r;vec3 v=position+offset+vec3(0.,floorY+y+.04,0.);shade=.7+normal.y*.25;gl_Position=projectionMatrix*modelViewMatrix*vec4(v,1.);}`,fragmentShader:`uniform float hail;varying float shade;void main(){gl_FragColor=vec4(vec3(.85,.94,.97)*shade,hail*.9);}`});
  const hailMesh=new THREE.Mesh(hg,hm);hailMesh.frustumCulled=false;root.add(hailMesh);
  const circle=new THREE.RingGeometry(.88,1,24),ripples=new THREE.InstancedBufferGeometry();ripples.index=circle.index;ripples.attributes=circle.attributes;
  const rp=[],rpPhase=[];for(let i=0;i<350;i++){const x=(rand()-.5)*41.7,z=(rand()-.5)*41.7;let y=map.heightAt(x,z)+.01,sloped=false;for(const r of map.roofs)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2){y=r.height+.012;sloped=r.ridge!==undefined;}if(sloped)continue;rp.push(x,y,z);rpPhase.push(rand());}
  ripples.setAttribute('offset',new THREE.InstancedBufferAttribute(new Float32Array(rp),3));ripples.setAttribute('phase',new THREE.InstancedBufferAttribute(new Float32Array(rpPhase),1));ripples.instanceCount=rpPhase.length;
  const rippleMat=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,vertexShader:`uniform float time;attribute vec3 offset;attribute float phase;varying float fade;void main(){float age=fract(time*.7+phase);fade=pow(1.-age,2.);vec3 p=offset+vec3(position.x,0.,position.y)*(.025+age*.18);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float rain;uniform float hail;varying float fade;void main(){gl_FragColor=vec4(.78,.86,.83,fade*(rain+hail*.4)*.23);}`});
  const rippleMesh=new THREE.Mesh(ripples,rippleMat);rippleMesh.frustumCulled=false;root.add(rippleMesh);
  // Roof-edge drops use the same weather clock and intensity as the rain above.
  const dp=[],de=[],dtops=[];
  for(const r of map.roofs)for(let i=0;i<28;i++){const x=r.x+(rand()-.5)*r.w,z=r.z+r.d/2+.035,top=roofHeight(r,x,z);const y=rand()*top;dp.push(x,y,z,x,y,z);de.push(0,1);dtops.push(top,top);}
  const dripGeom=new THREE.BufferGeometry();dripGeom.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));dripGeom.setAttribute('end',new THREE.Float32BufferAttribute(de,1));dripGeom.setAttribute('ceiling',new THREE.Float32BufferAttribute(dtops,1));
  const dripMat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`uniform float time;attribute float end;attribute float ceiling;void main(){vec3 p=position;p.y=.22+mod(p.y-time*4.,ceiling-.22)+end*.08;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float rain;void main(){gl_FragColor=vec4(.82,.85,.79,rain*.28);}`});
  const drips=new THREE.LineSegments(dripGeom,dripMat);drips.frustumCulled=false;root.add(drips);
  // All glazing responds to the same precipitation uniforms; no tile owns a rain loop.
  glass.onBeforeCompile=shader=>{
    shader.uniforms.walkRain=uniforms.rain;shader.uniforms.walkTime=uniforms.time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vWalkGlass;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWalkGlass=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float walkRain;uniform float walkTime;varying vec2 vWalkGlass;').replace('#include <dithering_fragment>',`#include <dithering_fragment>
      float s=floor(vWalkGlass.x*35.);float rr=fract(sin(s*73.1)*4375.5);float line=1.-smoothstep(.008,.032,abs(fract(vWalkGlass.x*35.)-.4));float yy=fract(vWalkGlass.y+walkTime*(.03+rr*.02)+rr);gl_FragColor.rgb+=vec3(.1,.12,.12)*line*smoothstep(.7,.98,yy)*walkRain;`);
  };glass.customProgramCacheKey=()=> 'walk-glass-weather';glass.needsUpdate=true;
  const reflectorShader={uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv;varying vec2 vGround;').replace('vUv = textureMatrix','vGround=uv;vUv = textureMatrix'),fragmentShader:`uniform sampler2D tDiffuse;uniform float wet;uniform float time;uniform vec3 roadColor;varying vec4 vUv;varying vec2 vGround;void main(){vec2 uv=vUv.xy/vUv.w;uv.x+=sin(vGround.y*800.+time*2.)*.0004*wet;vec3 reflectColor=texture2D(tDiffuse,uv).rgb;float wetPatch=.65+.35*sin(vGround.x*87.)*sin(vGround.y*71.);float grain=fract(sin(dot(floor(vGround*3000.),vec2(12.9898,78.233)))*43758.5);gl_FragColor=vec4(mix(roadColor+grain*.008,reflectColor,wet*(.18+.3*wetPatch)),1.);#include <tonemapping_fragment>
      #include <colorspace_fragment>}`.replace(';#include',';\n#include')};
  reflectorShader.uniforms.wet=uniforms.wet;reflectorShader.uniforms.time=uniforms.time;reflectorShader.uniforms.roadColor={value:new THREE.Color('#667b7a')};
  const reflection=new Reflector(new THREE.PlaneGeometry(42,42),{textureWidth:768,textureHeight:768,shader:reflectorShader,multisample:0,clipBias:.003});reflection.rotation.x=-Math.PI/2;reflection.position.y=.038;root.add(reflection);
  const emissions=new Map();map.root.traverse(o=>{if(o.isMesh&&o.material?.isMeshBasicMaterial&&!o.material.map&&!o.material.transparent)emissions.set(o.material,o.material.color.clone());});
  let lastLightUpdate=-100;
  function update(dt,time,player){
    const target=PERIODS[period],storm=weather!=='clear';night=THREE.MathUtils.damp(night,target.night,2,dt);
    sky.lerp(new THREE.Color(target.sky).multiplyScalar(storm?.74:1),1-Math.exp(-dt*2));fog.lerp(new THREE.Color(target.fog).multiplyScalar(storm?.78:1),1-Math.exp(-dt*2));
    sun.color.lerp(new THREE.Color(target.sun),1-Math.exp(-dt*2));sun.intensity=THREE.MathUtils.damp(sun.intensity,target.sunPower*(storm?.45:1),2,dt);ambient.intensity=THREE.MathUtils.damp(ambient.intensity,target.ambient*(storm?.85:1),2,dt);
    const elevation=target.angle;sun.position.set(player.x-18,Math.sin(elevation)*23+3,player.z+Math.cos(elevation)*16);sun.target.position.copy(player);
    rainAmount=THREE.MathUtils.damp(rainAmount,weather==='rain'?1:0,2,dt);hailAmount=THREE.MathUtils.damp(hailAmount,weather==='hail'?1:0,2,dt);
    wetness=THREE.MathUtils.damp(wetness,storm?1:0,storm?.5:.045,dt);
    uniforms.time.value=time;uniforms.rain.value=rainAmount;uniforms.hail.value=hailAmount;uniforms.wet.value=wetness;
    reflection.material.uniforms.time.value=time;reflection.material.uniforms.wet.value=wetness;reflection.material.uniforms.roadColor.value.set('#778984').multiplyScalar(1-night*.87);
    rainMesh.visible=rainAmount>.01;hailMesh.visible=hailAmount>.01;drips.visible=rainMesh.visible;rippleMesh.visible=rainMesh.visible||hailMesh.visible;
    reflection.visible=wetness>.01;
    for(const [mat,color]of emissions)mat.color.copy(color).multiplyScalar(.45+night*.9);
    if(time-lastLightUpdate>.2){
      const near=map.lamps.map(l=>({...l,d:l.position.distanceToSquared(player)})).sort((a,b)=>a.d-b.d).slice(0,pool.length);
      pool.forEach((l,i)=>{if(near[i]){l.position.copy(near[i].position);l.color.set(near[i].color);l.intensity=near[i].strength*(.25+night*.75);}});lastLightUpdate=time;
    }
  }
  return {root,update,setPeriod(value){if(!PERIODS[value])throw new Error('Unknown time period');period=value;},setWeather(value){if(!WEATHER_TYPES.includes(value))throw new Error('Unknown weather');weather=value;},get state(){return {period,weather,hour:PERIODS[period].hour,wetness,rainAmount,hailAmount,night,clock:uniforms.time.value};},get counts(){return {weatherSystems:1,rainParticles:rainCount,hailParticles:750};}};
}
