import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createMap} from './map.js';
import {createTraveler} from './character.js';
import {createEnvironment} from './environment.js';

const canvas=document.getElementById('world');let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){document.getElementById('error').hidden=false;throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.06,150);
const map=createMap();scene.add(map.root);
const traveler=createTraveler();scene.add(traveler.root);const spawn=new THREE.Vector3(.45,map.heightAt(.45,5.1),5.1);traveler.root.position.copy(spawn);traveler.root.rotation.y=Math.PI;
const environment=createEnvironment(scene,map);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({color:'#8a9b8a',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.4;scene.add(ground);
const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples)});
const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.23,.4,1.18);composer.addPass(bloom);composer.addPass(new OutputPass());
const keys=new Set();let yaw=.18,pitch=.32,distance=7.4,overview=false,cameraInitialized=false;
const pointer=new Map(),touchMove=new THREE.Vector2();
const timeKeys={Digit1:'morning',Digit2:'afternoon',Digit3:'dusk',Digit4:'night'};
function reset(){traveler.root.position.copy(spawn);traveler.root.rotation.y=Math.PI;yaw=.18;pitch=.32;distance=7.4;overview=false;cameraInitialized=false;keys.clear();touchMove.set(0,0);}
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(timeKeys[e.code])environment.setPeriod(timeKeys[e.code]);
  else if(e.code==='KeyR')environment.setWeather('rain');else if(e.code==='KeyH')environment.setWeather('hail');else if(e.code==='KeyC')environment.setWeather('clear');
  else if(e.code==='Home')reset();else if(e.code==='KeyV'&&!e.repeat){overview=!overview;cameraInitialized=false;}
  else keys.add(e.code);
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Home'].includes(e.code))e.preventDefault();
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();touchMove.set(0,0);pointer.clear();});
canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);pointer.set(e.pointerId,{startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,move:e.pointerType==='touch'&&e.clientX<innerWidth*.45});});
canvas.addEventListener('pointermove',e=>{const p=pointer.get(e.pointerId);if(!p)return;if(p.move){touchMove.set((e.clientX-p.startX)/65,(e.clientY-p.startY)/65);if(touchMove.length()>1)touchMove.normalize();}else{yaw-=(e.clientX-p.x)*.005;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-p.y)*.004,.05,1.05);}p.x=e.clientX;p.y=e.clientY;});
function release(e){const p=pointer.get(e.pointerId);if(p?.move)touchMove.set(0,0);pointer.delete(e.pointerId);}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),3.0,12);e.preventDefault();},{passive:false});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);cameraInitialized=false;});
const viewTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3(),direction=new THREE.Vector3(),ray=new THREE.Ray(),hit=new THREE.Vector3();
let last=performance.now(),time=0,frames=0,speed=0,walked=0;
document.addEventListener('visibilitychange',()=>{last=performance.now();keys.clear();touchMove.set(0,0);});
function updateCamera(dt){
  viewTarget.copy(traveler.root.position).add(new THREE.Vector3(0,1.13,0));
  if(overview){viewTarget.set(0,1,0);desiredCamera.set(35,38,45);if(camera.aspect<1)desiredCamera.multiplyScalar(1/camera.aspect);}
  else {
    desiredCamera.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(viewTarget);
    ray.origin.copy(viewTarget);ray.direction.copy(desiredCamera).sub(viewTarget).normalize();let safe=distance;
    for(const b of map.occluders){if(ray.intersectBox(b,hit)){const d=hit.distanceTo(viewTarget)-.22;if(d>0&&d<safe)safe=d;}}
    if(safe<distance)desiredCamera.copy(ray.direction).multiplyScalar(Math.max(1.0,safe)).add(viewTarget);
    desiredCamera.y=Math.max(desiredCamera.y,map.heightAt(desiredCamera.x,desiredCamera.z)+.35);
  }
  if(!cameraInitialized){camera.position.copy(desiredCamera);cameraInitialized=true;}else camera.position.lerp(desiredCamera,1-Math.exp(-dt*11));
  camera.lookAt(viewTarget);
}
function animate(now){
  const dt=Math.min(Math.max((now-last)/1000,0),.05);last=now;
  if(!document.hidden){
    time+=dt;
    if(keys.has('KeyQ'))yaw+=dt*1.8;if(keys.has('KeyE'))yaw-=dt*1.8;
    let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x;
    let z=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-touchMove.y;
    forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));direction.copy(forward).multiplyScalar(z).addScaledVector(right,x);if(direction.length()>1)direction.normalize();
    const targetSpeed=direction.length()*(keys.has('ShiftLeft')||keys.has('ShiftRight')?4.4:2.5);
    speed=THREE.MathUtils.damp(speed,targetSpeed,10,dt);
    const previous=traveler.root.position.clone();
    if(direction.lengthSq()>.001&&!overview){direction.normalize();map.move(traveler.root.position,direction.x*speed*dt,direction.z*speed*dt,traveler.radius);
      const desiredYaw=Math.atan2(direction.x,direction.z),delta=THREE.MathUtils.euclideanModulo(desiredYaw-traveler.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;traveler.root.rotation.y+=delta*(1-Math.exp(-dt*12));}
    const moved=traveler.root.position.distanceTo(previous);walked+=moved;const realSpeed=dt?moved/dt:0;
    traveler.update(dt,time,realSpeed,environment.state.weather);map.update(dt,traveler.root.position);environment.update(dt,time,traveler.root.position);updateCamera(dt);composer.render();frames++;
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
Object.defineProperty(window,'__walk',{value:{get ready(){return frames>3;},get frames(){return frames;},get state(){return {player:traveler.root.position.toArray(),facing:traveler.root.rotation.y,walked,gait:traveler.gait,environment:environment.state,overview,camera:camera.position.toArray(),tiles:map.placements,weatherSystems:environment.counts.weatherSystems,doors:map.buildings.filter(b=>b.type==='convenience').map(b=>({id:b.id,openness:b.doorOpen}))};}}});
