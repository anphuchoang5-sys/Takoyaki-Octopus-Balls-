import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createModel} from './index.js';

const canvas=document.querySelector('#world'),viewport=document.querySelector('#viewport'),fatal=document.querySelector('#fatal');
const style=document.querySelector('#viewer-style');
if(!style.textContent.trim()){const response=await fetch(new URL('./preview.css',import.meta.url));if(!response.ok)throw new Error('Preview stylesheet failed');style.textContent=await response.text();}
const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece0');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.OrthographicCamera(-10,10,6,-6,.1,140),controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.10;controls.minZoom=.6;controls.maxZoom=5;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.04;controls.autoRotateSpeed=.8;
const hemi=new THREE.HemisphereLight('#f3f8ff','#c6d2d1',1.8);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff4e4',2.4);sun.position.set(-7,13,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.1,far:45});sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e1e7d8',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.126;floor.receiveShadow=true;scene.add(floor);
const asset=createModel();scene.add(asset.root);
const views={
  hero:{position:[15,11,20],target:[0,2.0,.4],height:12.4,caption:'完整外观 · 可从任意方向查看'},
  reference:{position:[.03,5.5,42],target:[0,2.94,.0],height:8.8,caption:'接近原图的正面机位 · 先看轮廓与比例'},
  front:{position:[0,5.2,35],target:[0,2.8,0],height:9.1,caption:'正面 · 院门、花墙和高低屋面'},
  left:{position:[-25,9,9],target:[-1,2.3,0],height:10.4,caption:'左侧 · 曲干庭院树与低屋面'},
  right:{position:[25,10,10],target:[.8,2.2,-.1],height:10.5,caption:'右侧 · 遮挡后的连接与树丛'},
  back:{position:[-15,12,-23],target:[0,2.0,-.4],height:11.5,caption:'背面 · 原图不可见部分为合理补全'},
  top:{position:[0,32,.3],target:[0,0,0],height:16,caption:'俯视 · 屋顶连接、庭院与通道'},
  roof:{position:[-9,13,14],target:[-.2,4.1,-.1],height:7.3,caption:'屋面近景 · 瓦片厚度与山墙谷口'},
  gate:{position:[3.5,4.5,16],target:[-1,1.65,5.35],height:4.6,caption:'院门近景 · 黄褐坡顶、木栅与门前花盆'},
  balcony:{position:[8,6.7,18],target:[2.6,3.82,1.3],height:3.6,caption:'阳台近景 · 三个挂盆、百叶与凹窗'}
};
let currentView='hero',frame=0,disposed=false,raf=0;
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight,half=views[currentView].height/2;camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
function setView(name){if(!views[name])throw new Error('Unknown view '+name);currentView=name;const v=views[name];controls.autoRotate=false;controls.reset();camera.zoom=1;camera.position.fromArray(v.position);controls.target.fromArray(v.target);camera.lookAt(controls.target);controls.update();resize();document.querySelector('#caption').textContent=v.caption;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));document.querySelector('#rotate').setAttribute('aria-pressed','false');}
function reference(open){document.querySelector('#reference-panel').hidden=!open;document.body.classList.toggle('comparing',open);document.querySelector('#reference-toggle').setAttribute('aria-pressed',String(open));document.querySelector('#reference-toggle').textContent=open?'关闭原图对照':'打开原图对照';if(open)setView('reference');else resize();}
function clean(value=true){document.body.classList.toggle('clean',value);reference(false);resize();}
function onKey(e){if(e.key==='Home'){setView('hero');e.preventDefault();}if(e.key==='Escape')reference(false);}
function onResize(){resize();}
const handlers=[];
function bind(selector,handler){const el=document.querySelector(selector);el.addEventListener('click',handler);handlers.push([el,handler]);}
document.querySelectorAll('[data-view]').forEach(b=>{const h=()=>setView(b.dataset.view);b.addEventListener('click',h);handlers.push([b,h]);});
bind('#reset',()=>setView('hero'));bind('#reference-toggle',()=>reference(document.querySelector('#reference-panel').hidden));bind('#reference-close',()=>reference(false));
bind('#rotate',()=>{controls.autoRotate=!controls.autoRotate;document.querySelector('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));});
bind('#plants-toggle',()=>{const g=asset.root.getObjectByName('庭院花木');g.visible=!g.visible;document.querySelector('#plants-toggle').textContent='花木：'+(g.visible?'显示':'隐藏');document.querySelector('#plants-toggle').setAttribute('aria-pressed',String(g.visible));});
window.addEventListener('resize',onResize);window.addEventListener('keydown',onKey);
if(globalThis.__flowerReference)document.querySelector('#reference-image').src=globalThis.__flowerReference;
setView(new URL(location.href).searchParams.get('view')||'hero');
function render(){if(disposed)return;controls.update();renderer.render(scene,camera);frame++;raf=requestAnimationFrame(render);}render();
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);handlers.forEach(([el,h])=>el.removeEventListener('click',h));window.removeEventListener('resize',onResize);window.removeEventListener('keydown',onKey);controls.dispose();asset.dispose();floor.geometry.dispose();floor.material.dispose();sun.shadow.dispose();renderer.dispose();scene.clear();}
window.__flower={ready:true,asset,scene,camera,renderer,controls,createModel,setView,reference,clean,dispose,inspect:()=>({view:currentView,frame,disposed,bounds:new THREE.Box3().setFromObject(asset.root),camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},environment:asset.getEnvironment()})};
window.addEventListener('error',e=>{fatal.hidden=false;fatal.textContent='预览未能加载：'+e.message;});
