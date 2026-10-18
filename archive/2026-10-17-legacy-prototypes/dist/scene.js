import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { world, batchStatic, canvasMap } from './world.js';
import { buildStore, updateStore, doors } from './store.js';
import { buildStreet, updateStreet } from './street.js';
import { buildWeather, updateWeather } from './weather.js';

const canvas=document.getElementById('world');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){document.getElementById('failure').hidden=false;throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#122330');scene.fog=new THREE.Fog('#122330',42,80);scene.add(world);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,240);
const initial=new THREE.Vector3(18,13.2,22.5);
camera.position.copy(initial);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.55,0);controls.enableDamping=true;controls.dampingFactor=.065;
controls.rotateSpeed=.55;controls.zoomSpeed=.85;controls.panSpeed=.65;controls.minDistance=7;controls.maxDistance=46;
controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.485;controls.enablePan=true;controls.screenSpacePanning=true;
controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
controls.update();
scene.add(new THREE.HemisphereLight('#9fc2de','#32434d',.9));
const moon=new THREE.DirectionalLight('#9bc7e8',1.18);moon.position.set(-6,13,5);moon.castShadow=true;
moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:34});
moon.shadow.bias=-.0002;moon.shadow.normalBias=.045;moon.shadow.radius=3;scene.add(moon);
const rim=new THREE.DirectionalLight('#6b9ca9',.55);rim.position.set(6,7,-8);scene.add(rim);
buildStreet();buildStore();batchStatic();buildWeather();
// A soft studio floor grounds the single square miniature in the night.
const backgroundFloor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#152936',roughness:1}));
backgroundFloor.rotation.x=-Math.PI/2;backgroundFloor.position.y=-.751;backgroundFloor.receiveShadow=true;scene.add(backgroundFloor);
const contactMap=canvasMap(256,256,c=>{const g=c.createRadialGradient(128,128,30,128,128,127);g.addColorStop(0,'#000000bb');g.addColorStop(.6,'#00000088');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,256,256);});
const contact=new THREE.Mesh(new THREE.PlaneGeometry(23,23),new THREE.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false,opacity:.65}));contact.rotation.x=-Math.PI/2;contact.position.y=-.742;scene.add(contact);
const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples)});
const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.27,.42,1.08);composer.addPass(bloom);composer.addPass(new OutputPass());
const finish=new ShaderPass({uniforms:{tDiffuse:{value:null}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float v=smoothstep(.18,.85,length(vUv-.5));c*=1.-v*.21;float noise=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);c+=(noise-.5)*.008;gl_FragColor=vec4(c,1.);}`});composer.addPass(finish);
let lastFitScale=1;
function frameToViewport(reset=false){
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  const fitScale=Math.max(1,1.30/camera.aspect);controls.maxDistance=46*fitScale;
  if(reset){controls.enableDamping=false;controls.update();camera.position.copy(initial);controls.target.set(0,1.55,0);camera.position.sub(controls.target).multiplyScalar(fitScale).add(controls.target);controls.update();controls.enableDamping=true;}
  else{camera.position.sub(controls.target).multiplyScalar(fitScale/lastFitScale).add(controls.target);controls.update();}
  lastFitScale=fitScale;
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
}
frameToViewport(true);
addEventListener('resize',()=>frameToViewport(false));
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('keydown',e=>{
  if(e.key==='Home'){frameToViewport(true);e.preventDefault();return;}
  const offset=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(offset);
  if(e.key==='ArrowLeft')spherical.theta-=.1;else if(e.key==='ArrowRight')spherical.theta+=.1;
  else if(e.key==='ArrowUp')spherical.phi=Math.max(controls.minPolarAngle,spherical.phi-.08);
  else if(e.key==='ArrowDown')spherical.phi=Math.min(controls.maxPolarAngle,spherical.phi+.08);
  else if(e.key==='+'||e.key==='=')spherical.radius=Math.max(controls.minDistance,spherical.radius*.9);
  else if(e.key==='-')spherical.radius=Math.min(controls.maxDistance,spherical.radius*1.1);else return;
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();e.preventDefault();
});
let elapsed=0,last=performance.now(),frameCount=0,renderStats={};
renderer.info.autoReset=false;
document.addEventListener('visibilitychange',()=>{last=performance.now();});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function animate(now){
  const dt=Math.max((now-last)/1000,0);last=now;
  if(!document.hidden){elapsed+=dt*(reduced?.35:1);controls.update();
    // Bound panning to the miniature, preserving freedom of observation.
    const oldTarget=controls.target.clone();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-6,6);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-6,6);controls.target.y=THREE.MathUtils.clamp(controls.target.y,.1,6);
    camera.position.add(controls.target.clone().sub(oldTarget));scene.fog.near=camera.position.distanceTo(controls.target)+20;scene.fog.far=scene.fog.near+65;updateStore(elapsed);updateStreet(elapsed);updateWeather(elapsed);renderer.info.reset();composer.render();renderStats={...renderer.info.render};frameCount++;
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
// Read-only scene diagnostics support repeatable browser verification without UI.
Object.defineProperty(window,'__rainyCorner',{value:{
  get ready(){return frameCount>2;},get frames(){return frameCount;},get elapsed(){return elapsed;},
  get camera(){return camera.position.toArray();},get target(){return controls.target.toArray();},
  get doorGap(){return doors.length?doors[1].position.x-doors[0].position.x:0;},
  get stats(){return {...renderStats,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};},
  get bounds(){return {squareBase:14,zoom:[controls.minDistance,controls.maxDistance]};}
}});
