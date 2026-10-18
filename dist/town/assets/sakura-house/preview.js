import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createModel,specification} from './index.js';
import {createModel as createStore} from '../convenience/index.js';
import {batchStatic} from '../../../world.js';

try{
  const canvas=document.getElementById('world'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e7ebdf');
  const camera=new THREE.OrthographicCamera(-12,12,10,-10,.1,180);camera.position.set(16,14,22);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.4,0);controls.enableDamping=true;controls.dampingFactor=.09;controls.minZoom=.65;controls.maxZoom=8;controls.maxPolarAngle=Math.PI*.495;controls.autoRotateSpeed=.65;
  const ambient=new THREE.HemisphereLight('#fff9ef','#aab7a5',1.35);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff3dc',2.25);sun.position.set(-8,15,12);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-28,right:28,top:23,bottom:-23,near:1,far:65});sun.shadow.bias=-.00015;sun.shadow.normalBias=.018;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight('#e3edec',.7);fill.position.set(8,8,-12);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:'#dce3d0',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.18;ground.receiveShadow=true;scene.add(ground);
  const house=createModel();scene.add(house.root);
  // This is the unchanged authored store, at scale 1, built only in this isolated viewer.
  const shop=createStore();batchStatic(shop.root);shop.root.visible=false;scene.add(shop.root);
  const shopPlot=new THREE.Mesh(new THREE.BoxGeometry(14,.16,14),new THREE.MeshToonMaterial({color:'#b7bca7'}));shopPlot.position.y=-.08;shopPlot.receiveShadow=true;shopPlot.visible=false;scene.add(shopPlot);
  let comparison=false,currentView='hero',frames=0,environment={time:'afternoon',weather:'clear'},fixedSeconds=null;
  const views={hero:{p:[-16,13,20],t:[0,2.1,0],zoom:1},reference:{p:[-24.5,6.1,31.6],t:[-.5,4.15,-.4],zoom:2.05},front:{p:[0,6.4,28],t:[0,2.6,0],zoom:1.11},left:{p:[-28,8,0],t:[0,2.6,0],zoom:1.1},right:{p:[28,8,0],t:[0,2.6,0],zoom:1.1},back:{p:[0,8,-28],t:[0,2.6,0],zoom:1.1},top:{p:[0,35,.001],t:[0,0,0],zoom:1.03},roof:{p:[-11,12,14],t:[-.6,3.1,-.3],zoom:1.65},entry:{p:[-12,6,14],t:[-4.1,1.5,3.3],zoom:2.5},garden:{p:[-10,10,15],t:[.3,1.4,4.8],zoom:2.2},'rear-detail':{p:[10,9,-15],t:[1.5,2,-4],zoom:1.65}};
  views.lamp={p:[-13,11,12],t:[-6.1,2.5,1.65],zoom:1.9};
  views.drips={p:[-12,5.4,11],t:[-4.2,1.9,2.6],zoom:3};
  function refreshEnvironment(){
    const n=environment.time==='night',d=environment.time==='dusk',r=environment.weather==='rain';
    scene.background.set(n?'#1e2b48':d?'#c7a2a2':r?'#9eaebd':currentView==='reference'?'#9bceff':'#e7ebdf');
    ground.material.color.set(n?'#26334a':d?'#9c9681':r?'#a0b2af':'#dce3d0');
    ambient.intensity=n?.65:d?1.05:1.35;sun.intensity=n?.38:d?1.3:r?1.1:2.25;fill.intensity=n?.3:.7;
    document.body.classList.toggle('night',n);renderer.shadowMap.needsUpdate=true;
  }
  function setEnvironment(next){
    const result=house.setEnvironment(next);environment={time:result.time,weather:result.weather};refreshEnvironment();
    document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('active',b.dataset.time===environment.time));
    document.querySelectorAll('[data-weather]').forEach(b=>b.classList.toggle('active',b.dataset.weather===environment.weather));
    document.getElementById('state-label').textContent=({morning:'早晨',afternoon:'午后',dusk:'黄昏',night:'夜晚'}[environment.time])+' · '+(environment.weather==='rain'?'檐下滴雨':'晴天');
    return result;
  }
  function resize(){const w=innerWidth,h=innerHeight,aspect=w/h,half=comparison?12.3:9.4;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.shadowMap.needsUpdate=true;}
  function setView(name){currentView=name;const v=views[name]||views.hero;controls.autoRotate=false;document.getElementById('rotate').classList.remove('active');scene.background.set(name==='reference'?'#9bceff':'#e7ebdf');ground.visible=name!=='reference';
    controls.target.fromArray(v.t);camera.position.fromArray(v.p);camera.zoom=comparison?.94:v.zoom*(name==='reference'?Math.min(1,innerWidth/innerHeight/(16/9)):1);
    if(comparison){controls.target.set(0,1.2,0);camera.position.set(14,18,31);}camera.updateProjectionMatrix();controls.update();
    refreshEnvironment();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));document.getElementById('caption').textContent=comparison?'樱家　／　AME MART　·　原始比例 · 便利店维持原有外观':({lamp:'灯泡 · 下方光束 · 地面圆光',drips:'檐口聚水 · 落滴 · 涟漪',reference:'接近原图 · 西端山墙与南面长立面',hero:'樱家 · 完整外观与院子',front:'南 · 长立面与玄关',left:'西 · 山墙与无栏杆院门',right:'东 · 侧附屋与植栽',back:'北 · 后侧立面',top:'14 × 14 · 地块俯视',roof:'连续屋脊、薄瓦与檐口',entry:'玄关、雨棚与内凹门窗',garden:'围墙、门牌与院内植栽','rear-detail':'后侧补全 · 胜手口与排水'}[name]||'樱家');}
  function compare(value){comparison=value;house.root.position.x=value?-7.35:0;shop.root.position.x=value?7.35:0;shopPlot.position.x=shop.root.position.x;shop.root.visible=shopPlot.visible=value;document.getElementById('compare').classList.toggle('active',value);resize();setView('hero');renderer.shadowMap.needsUpdate=true;}
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(comparison)compare(false);setView(b.dataset.view);}));
  document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>setEnvironment({time:b.dataset.time}));
  document.querySelectorAll('[data-weather]').forEach(b=>b.onclick=()=>setEnvironment({weather:b.dataset.weather}));
  document.getElementById('compare').onclick=()=>compare(!comparison);document.getElementById('reset').onclick=()=>{compare(false);setView('hero');};document.getElementById('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;document.getElementById('rotate').classList.toggle('active',controls.autoRotate);};
  addEventListener('resize',resize);addEventListener('keydown',e=>{if(e.key==='Home'){compare(false);setView('hero');e.preventDefault();}else if(['+','=','-'].includes(e.key)){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(e.key==='-'?.9:1.1),controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){const v=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(v);if(e.key==='ArrowLeft')s.theta-=.08;if(e.key==='ArrowRight')s.theta+=.08;if(e.key==='ArrowUp')s.phi=Math.max(.04,s.phi-.06);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI*.495,s.phi+.06);camera.position.copy(controls.target).add(v.setFromSpherical(s));controls.update();e.preventDefault();}});
  if(new URLSearchParams(location.search).has('clean'))document.body.classList.add('clean');
  resize();setView(new URLSearchParams(location.search).get('view')||'hero');
  const query=new URLSearchParams(location.search);setEnvironment({time:query.get('time')||'afternoon',weather:query.get('weather')||'clear'});
  const start=performance.now();function draw(){house.updateEnvironment(fixedSeconds??(performance.now()-start)/1000);controls.update();renderer.render(scene,camera);frames++;requestAnimationFrame(draw);}draw();
  function inspect(){return {specification,frames,view:currentView,comparison,environment:house.getEnvironmentState(),camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},tileCount:house.root.userData.tileCount,openings:house.root.userData.openings,components:house.root.userData.components,design:house.root.userData.design,stats:{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},houseScale:house.root.scale.toArray(),shopScale:shop.root.scale.toArray()};}
  window.__sakura={get ready(){return frames>2;},house,shop,scene,camera,renderer,controls,createModel,inspect,setView,compare,setEnvironment,setElapsed(seconds){fixedSeconds=seconds;if(seconds!==null)house.updateEnvironment(seconds);},
    boundsAt(degrees){const original=house.root.rotation.y,position=house.root.position.clone();house.root.position.set(0,0,0);house.root.rotation.y=degrees*Math.PI/180;house.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(house.root);house.root.rotation.y=original;house.root.position.copy(position);house.root.updateMatrixWorld(true);return {degrees,min:bounds.min.toArray(),max:bounds.max.toArray()};}};
}catch(error){document.getElementById('fatal').hidden=false;document.getElementById('fatal').textContent='预览启动失败：'+error.message;console.error(error);}



