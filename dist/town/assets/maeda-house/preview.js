import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createModel} from './index.js';

const canvas=document.querySelector('#world'),viewport=document.querySelector('#viewport'),fatal=document.querySelector('#fatal');
const style=document.querySelector('#viewer-style');
if(!style.textContent.trim()){const response=await fetch(new URL('./preview.css',import.meta.url)).catch(()=>null);if(response&&response.ok)style.textContent=await response.text();}

const scene=new THREE.Scene();scene.background=new THREE.Color('#e9ece2');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,160),controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.10;controls.minZoom=.55;controls.maxZoom=6;
controls.maxPolarAngle=Math.PI*.5;controls.minPolarAngle=.02;controls.autoRotateSpeed=.8;

const hemi=new THREE.HemisphereLight('#f4f8ff','#c8d2c8',1.75);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff3e2',2.3);sun.position.set(-9,15,13);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.1,far:55});
sun.shadow.bias=-.0004;sun.shadow.normalBias=.05;sun.shadow.radius=3.5;scene.add(sun);scene.add(sun.target);
const fill=new THREE.DirectionalLight('#dfe8ff',.35);fill.position.set(12,7,-12);scene.add(fill);

const floor=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:'#e3e7da',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.126;floor.receiveShadow=true;scene.add(floor);

const asset=createModel();scene.add(asset.root);

const views={
  reference:{position:[0,2.20,42],target:[0,2.35,0],height:12.4,caption:'参考机位 · 正对视线的正面，先看轮廓和比例'},
  hero:{position:[17,13,24],target:[0,2.3,0],height:14.8,caption:'完整外观 · 可从任意方向查看'},
  front:{position:[0,5.8,36],target:[0,2.5,0],height:11.6,caption:'正面 · 院门、门窗、围墙与两面坡屋脊'},
  left:{position:[-27,10,10],target:[-1,2.5,0],height:12.0,caption:'左侧 · 山墙、后坡与屋后落叶树'},
  right:{position:[27,10,10],target:[3,2.6,1.5],height:12.0,caption:'右侧 · 右翼转角与红瓦屋顶'},
  corner:{position:[12,6.2,13],target:[4.3,2.5,3.9],height:6.6,caption:'右翼转角近景 · 前伸的奶油体块与那扇窗'},
  back:{position:[-16,13,-26],target:[0,2.3,-1],height:12.0,caption:'背面 · 原图不可见部分为合理补全'},
  roof:{position:[-6.5,12,12.5],target:[1,4.1,0.5],height:8.2,caption:'屋顶近景 · 主屋顶与右翼的交接'},
  gate:{position:[0.8,3.2,13.6],target:[0.08,1.0,6.9],height:4.6,caption:'院门近景 · 石阶、院门与围墙厚度'},
  door:{position:[0.8,3.0,11.5],target:[0.08,1.7,3.2],height:4.2,caption:'大门近景 · 金色外框、双开门与门头浅篷'},
  window:{position:[-2.2,3.4,10.6],target:[-2.9,1.95,3.1],height:3.9,caption:'窗近景 · 凹入窗洞、竖格栅与窗台'},
  yard:{position:[-1.2,4.2,11.2],target:[-4.6,1.3,5.6],height:6.0,caption:'前院 · 高过围墙的灌木与围墙内侧'},
  tree:{position:[-8.5,5.8,8.5],target:[-4.2,3.4,-4.8],height:8.0,caption:'屋后落叶树 · 只从屋脊后探出枝条'},
  top:{position:[0,34,.4],target:[0,0,0],height:17,caption:'俯视 · 地块、四周围墙、屋顶与院子'}
};

let currentView='hero',frame=0,disposed=false,raf=0,night=false;

function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight,half=views[currentView].height/2;
  camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
function setView(name){
  if(!views[name])throw new Error('Unknown view '+name);
  currentView=name;const v=views[name];
  controls.autoRotate=false;controls.reset();camera.zoom=1;
  camera.position.fromArray(v.position);controls.target.fromArray(v.target);
  camera.lookAt(controls.target);controls.update();resize();
  document.querySelector('#caption').textContent=v.caption;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  document.querySelector('#rotate').setAttribute('aria-pressed','false');
}
function reference(open){
  document.querySelector('#reference-panel').hidden=!open;
  document.body.classList.toggle('comparing',open);
  document.querySelector('#reference-toggle').setAttribute('aria-pressed',String(open));
  document.querySelector('#reference-toggle').textContent=open?'关闭原图对照':'打开原图对照';
  if(open){
    setView('reference');
    camera.zoom=.58;camera.updateProjectionMatrix();
    const halfW=views.reference.height/2*(viewport.clientWidth/viewport.clientHeight)/.58, dx=-halfW*.30;
    camera.position.x+=dx;controls.target.x+=dx;controls.update();
  }else resize();
}
function clean(value=true){document.body.classList.toggle('clean',value);reference(false);resize();}
function setTime(value){
  night=value==='night';
  asset.setEnvironment({time:value});
  document.querySelector('#time-toggle').textContent='窗户暖光：'+(night?'开':'关');
  document.querySelector('#time-toggle').setAttribute('aria-pressed',String(night));
}
function onKey(e){if(e.key==='Home'){setView('hero');e.preventDefault();}if(e.key==='Escape')reference(false);}
const handlers=[];
function bind(selector,handler){const el=document.querySelector(selector);el.addEventListener('click',handler);handlers.push([el,handler]);}
document.querySelectorAll('[data-view]').forEach(b=>{const h=()=>setView(b.dataset.view);b.addEventListener('click',h);handlers.push([b,h]);});
bind('#reset',()=>setView('hero'));
bind('#reference-toggle',()=>reference(document.querySelector('#reference-panel').hidden));
bind('#reference-close',()=>reference(false));
bind('#time-toggle',()=>setTime(night?'afternoon':'night'));
bind('#rotate',()=>{controls.autoRotate=!controls.autoRotate;document.querySelector('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));});
bind('#plants-toggle',()=>{
  const g=asset.root.getObjectByName('庭院花木');g.visible=!g.visible;
  document.querySelector('#plants-toggle').textContent='花木：'+(g.visible?'显示':'隐藏');
  document.querySelector('#plants-toggle').setAttribute('aria-pressed',String(g.visible));
});
window.addEventListener('resize',resize);window.addEventListener('keydown',onKey);
setView(new URL(location.href).searchParams.get('view')||'hero');

function render(){if(disposed)return;controls.update();renderer.render(scene,camera);frame++;raf=requestAnimationFrame(render);}render();

function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);
  handlers.forEach(([el,h])=>el.removeEventListener('click',h));
  window.removeEventListener('resize',resize);window.removeEventListener('keydown',onKey);
  controls.dispose();asset.dispose();floor.geometry.dispose();floor.material.dispose();sun.shadow.dispose();renderer.dispose();scene.clear();
}
window.__maeda={
  ready:true,asset,scene,camera,renderer,controls,createModel,setView,reference,clean,setTime,dispose,
  measure:name=>{
    const o=asset.root.getObjectByName(name);
    if(o){const b=new THREE.Box3().setFromObject(o);return {min:b.min.toArray(),max:b.max.toArray()};}
    const part=(asset.root.userData.design.parts||[]).find(p=>p.name===name);
    return part?{min:part.min,max:part.max}:null;
  },
  inspect:()=>{
    const box=new THREE.Box3().setFromObject(asset.root);
    return {view:currentView,frame,night,
      bounds:{min:box.min.toArray(),max:box.max.toArray()},
      size:box.getSize(new THREE.Vector3()).toArray(),
      camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},
      render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},
      environment:asset.getEnvironment(),
      design:asset.root.userData.design};
  }
};
window.__street=window.__maeda;
window.addEventListener('error',e=>{fatal.hidden=false;fatal.textContent='预览未能加载：'+e.message;});
