import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createMaruko,specification} from './model.js';
import {createModel as createHouse} from '../../assets/sakura-house/index.js';
import {createInterior} from '../../assets/sakura-house/interior/index.js';
import {createConvenienceScene} from '../../editor/convenience-scene.js';

try {
  const canvas=document.querySelector('#world'),stage=canvas.parentElement;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f0eee7');
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.015,160);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.12;
  controls.minZoom=.1;controls.maxZoom=12;controls.maxPolarAngle=Math.PI*.94;
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.PAN};
  scene.add(new THREE.HemisphereLight('#fff9ec','#afb9ad',1.4));
  const sun=new THREE.DirectionalLight('#fff7e5',1.5);sun.position.set(-4,8,6);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:35});sun.shadow.normalBias=.012;sun.shadow.bias=-.0002;sun.shadow.radius=4;scene.add(sun);
  const ground=new THREE.Group();scene.add(ground);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshBasicMaterial({color:'#f0eee7',toneMapped:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;ground.add(floor);
  const shade=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.ShadowMaterial({opacity:.12}));shade.rotation.x=-Math.PI/2;shade.position.y=-.002;shade.receiveShadow=true;ground.add(shade);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(69,64,53,.2)');gradient.addColorStop(1,'rgba(69,64,53,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(.46,.25),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.001;ground.add(contact);
  const character=createMaruko();scene.add(character.root);
  const assets={},placement=new THREE.Vector3();let source='editable',glbRoot=null,mode='studio',view='quarter',half=.82,frames=0,loadToken=0;
  const names={studio:'人物样板 · 1.24 m',house:'樱家门口 · 原资产 / 人物 1.00 倍',store:'AME MART · 原资产 / 人物 1.00 倍',interior:'樱家室内 · 门框 2.03 m / 人物 1.24 m'};
  function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h,fitHalf=Math.max(half,.37/aspect);camera.left=-fitHalf*aspect;camera.right=fitHalf*aspect;camera.top=fitHalf;camera.bottom=-fitHalf;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
  function currentRoot(){return source==='glb'?glbRoot:character.root;}
  function updatePlacement(){character.root.position.copy(placement);character.root.scale.setScalar(1);if(glbRoot){glbRoot.position.copy(placement);glbRoot.scale.setScalar(1);}character.root.visible=source==='editable';if(glbRoot)glbRoot.visible=source==='glb';}
  function seatOnDisplaySurface(asset){
    // Static display placement only, not a movement/collision controller.
    asset.root.updateMatrixWorld(true);const meshes=[];asset.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
    const ray=new THREE.Raycaster(),heights=[];
    for(const x of [-.065,.065])for(const z of [-.04,.04]){ray.set(new THREE.Vector3(placement.x+x,placement.y+.3,placement.z+z),new THREE.Vector3(0,-1,0));ray.far=1;const hit=ray.intersectObjects(meshes,false)[0];if(hit)heights.push(hit.point.y);}
    if(heights.length===4)placement.y=Math.max(...heights);
  }
  function stopDamping(){controls.enableDamping=false;controls.update();controls.enableDamping=true;}
  function setView(name='quarter'){
    stopDamping();view=name;const close=name==='face'||name==='side-face';half=close?.335:.81;
    const y=placement.y+(close?.956:.625),target=new THREE.Vector3(placement.x,y,placement.z);
    let dir=({front:[0,0,6],quarter:[2.6,.35,6],side:[6,0,0],'left-side':[-6,0,0],back:[0,0,-6],face:[0,0,6],'side-face':[6,0,0]})[name]||[2.6,.35,6];
    if(mode!=='studio'){
      half=close?.335:1.45;
      if(!close)target.y=placement.y+1.02;
      // Keep the indoor camera inside its room and the exterior camera inside the yard.
      dir=({front:[0,.15,1.8],quarter:[1.5,.65,1.8],side:[1.8,.1,0],'left-side':[-1.8,.1,0],back:[0,.1,-1.8],face:[0,0,1.3],'side-face':[1.3,0,0]})[name]||[1.5,.65,1.8];
    }
    camera.position.copy(target).add(new THREE.Vector3(...dir));controls.target.copy(target);camera.zoom=1;resize();controls.update();
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  }
  function setScene(name){
    mode=name;
    for(const asset of Object.values(assets))asset.root.visible=false;
    ground.visible=name==='studio';scene.background.set(name==='studio'?'#f0eee7':'#e5e9db');placement.set(0,0,0);
    if(name==='house'){
      if(!assets.house){assets.house=createHouse();assets.house.root.position.set(3.3,0,-2.95);scene.add(assets.house.root);}
      assets.house.root.visible=true;placement.y=.355;
    }else if(name==='store'){
      if(!assets.store){assets.store=createConvenienceScene();assets.store.root.position.set(0,0,-3.3);scene.add(assets.store.root);}
      assets.store.root.visible=true;placement.set(0,.25,0);
    }else if(name==='interior'){
      if(!assets.interior){assets.interior=createInterior();assets.interior.root.position.set(-6.45,0,-4.25);assets.interior.setWalls('full');assets.interior.setCeiling(false);assets.interior.setDoorsOpen(true);scene.add(assets.interior.root);}
      assets.interior.root.visible=true;placement.set(0,0,0);
    }
    if(name!=='studio')seatOnDisplaySurface(assets[name]);
    updatePlacement();document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('active',b.dataset.scene===mode));
    document.querySelector('#wall-option').hidden=name!=='interior';document.querySelector('#caption').textContent=names[name];setView(name==='studio'?'quarter':'front');
  }
  function wide(){stopDamping();half=mode==='studio'?1.0:mode==='interior'?5:9;camera.zoom=1;controls.target.set(mode==='house'?2.5:0,mode==='studio'?.62:1,mode==='studio'?0:-2.5);camera.position.copy(controls.target).add(new THREE.Vector3(mode==='studio'?2:9,mode==='studio'?1:12,mode==='studio'?6:16));resize();controls.update();view='wide';}
  async function setSource(next){
    const token=++loadToken;
    if(next==='glb'&&!glbRoot){
      const {GLTFLoader}=await import('./tools/GLTFLoader.js');
      const data=await new GLTFLoader().loadAsync('./maruko.glb');
      if(token!==loadToken){data.scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});return;}
      glbRoot=data.scene;glbRoot.traverse(o=>{if(o.isMesh)o.castShadow=!o.userData.outline;});scene.add(glbRoot);
    }
    source=next;updatePlacement();document.querySelector('#model-source').textContent=next==='glb'?'返回可编辑模型':'查看导出的 GLB';document.querySelector('#status').textContent=(next==='glb'?'正在查看：GLB 回读':'正在查看：可编辑模型')+' · 无动画';
  }
  const refs=['01-front.webp','02-sofvips-front.jpg','03-sofvips-side.jpg','04-sofvips-back.jpg','05-user-side.jpg'];
  function reference(i){document.querySelector('#reference-image').src='./references/'+refs[i];document.querySelector('#reference-note').textContent=i===0?'主参考：授权活动宣传插图。决定长相、正面轮廓与配色；不是动画原始设定稿。':i===4?'本轮侧面主参考：你提供的动画画面截图。采用头部轮廓、鼻额转折、单眼、耳位和发尾；仍穿白上衣红背带裙。':'辅助：同款 SOFVIPS 公仔照片，用于观察体积；黄色上衣、塑料高光与关节接缝不采用。';}
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>setScene(b.dataset.scene));
  document.querySelector('#reset').onclick=()=>setView('quarter');
  document.querySelector('#scene-wide').onclick=wide;
  document.querySelector('#model-source').onclick=()=>setSource(source==='editable'?'glb':'editable').catch(e=>{document.querySelector('#status').textContent='GLB 尚不可用：'+e.message;console.error(e);});
  document.querySelector('#cut-walls').onchange=e=>assets.interior?.setWalls(e.target.checked?'cut':'full');
  document.querySelector('#reference').onclick=()=>{const p=document.querySelector('#reference-panel');p.hidden=!p.hidden;if(!p.hidden)reference(0);};
  document.querySelectorAll('[data-reference]').forEach(b=>b.onclick=()=>reference(Number(b.dataset.reference)));
  addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();setView('quarter');}});
  new ResizeObserver(resize).observe(stage);
  if(new URLSearchParams(location.search).has('clean'))document.body.classList.add('clean');
  setScene('studio');document.querySelector('#status').textContent='正在查看：可编辑模型 · 无动画';
  const requestedView=new URLSearchParams(location.search).get('view');if(requestedView)setView(requestedView);
  function draw(){controls.update();renderer.render(scene,camera);frames++;requestAnimationFrame(draw);}draw();
  window.__maruko={get ready(){return frames>2;},character,createMaruko,scene,camera,controls,renderer,assets,setView,setScene,setSource,wide,get displayedRoot(){return currentRoot();},inspect(){return {specification,frames,scene:mode,view,source,placement:placement.toArray(),scale:currentRoot().scale.toArray(),camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},stats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}};}};
}catch(e){document.querySelector('#fatal').hidden=false;document.querySelector('#fatal').textContent='预览启动失败：'+e.message;console.error(e);}
