import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createInterior,specification} from './index.js';
import {rooms,routes,sources} from './plan.js';

try {
 const style=document.getElementById('viewer-style');if(!style.textContent){const response=await fetch(new URL('./preview.css',import.meta.url));if(!response.ok)throw new Error('室内预览样式未加载');style.textContent=await response.text();}
 const q=new URLSearchParams(location.search);if(q.has('capture'))document.documentElement.classList.add('capture');
 const canvas=document.getElementById('world'),viewport=document.getElementById('viewport');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e6eadd');
 const house=createInterior();scene.add(house.root);
 const ortho=new THREE.OrthographicCamera(-10,10,7,-7,.05,160),perspective=new THREE.PerspectiveCamera(60,1,.04,160);let camera=ortho;
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.12;controls.minZoom=.45;controls.maxZoom=15;controls.minDistance=.4;controls.maxDistance=55;controls.maxPolarAngle=Math.PI*.495;controls.autoRotateSpeed=.6;
 const bg=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshBasicMaterial({color:'#e6eadd'}));bg.rotation.x=-Math.PI/2;bg.position.set(5.9,-.63,3.6);scene.add(bg);
 const routeGroup=new THREE.Group();routeGroup.name='viewer-route-guides';scene.add(routeGroup);const routeMat=new THREE.LineDashedMaterial({color:'#578d89',dashSize:.13,gapSize:.07,depthTest:false,transparent:true,opacity:.8});
 for(const points of Object.values(routes)){const geo=new THREE.BufferGeometry().setFromPoints(points.map(([x,z])=>new THREE.Vector3(x,.07,z)));const line=new THREE.Line(geo,routeMat);line.computeLineDistances();line.renderOrder=5;routeGroup.add(line);}routeGroup.visible=false;
 let current='hero',selected=null,refTab='plan',frames=0;
 const labelRoot=document.getElementById('room-labels'),labels=[];
 for(const r of rooms.filter(r=>!r.storage)){const button=document.createElement('button');button.dataset.room=r.id;button.textContent=r.name;button.onclick=()=>focusRoom(r.id);document.getElementById('room-buttons').append(button);
  const label=document.createElement('span');label.className='room-label';label.textContent=r.name;labelRoot.append(label);labels.push({r,label});
 }
 const anime={living:['anime-living.png','动画截图 · 襖门黄土色带与木走廊'],kitchen:['anime-kitchen.jpg','动画截图 · 绿色厨房与柜体'],sisters:['anime-sisters.jpg','动画截图 · 粉色墙面、绿色书架与书桌'],grandparents:['anime-grandparents.jpg','动画截图 · 障子与松纹襖；纹样留待精修']};
 function refreshReference(){let file='01-plan.jpg',caption='主参考的平面图。本轮按它的房间连接、比例和主要家具位置搭建。',source=sources.layout;
  if(refTab==='room'){const r=rooms.find(r=>r.id===selected);file=r?.ref||'03-whole.jpg';caption=r?`${r.name} · 主参考对应视角。${r.note}`:'主参考的整屋三维俯视。使用“参考视角”对照整体空间。';}
  if(refTab==='anime'){const a=anime[selected||'living'];if(a){[file,caption]=a;source=sources.details;}else {file=rooms.find(r=>r.id===selected)?.ref||'03-whole.jpg';caption='当前房间暂显示主参考；本阶段未把文章中的作者三维图当作动画截图。';}}
  const image=document.getElementById('reference-image'),link=document.getElementById('reference-image-link');image.src=globalThis.__interiorReferences?.[file]||new URL('./references/'+file,import.meta.url).href;link.href=image.src;document.getElementById('reference-caption').textContent=caption;document.getElementById('reference-source').href=source;
  document.querySelectorAll('[data-ref]').forEach(b=>b.classList.toggle('active',b.dataset.ref===refTab));
 }
 function resize(){const w=viewport.clientWidth,h=viewport.clientHeight,aspect=w/h;ortho.left=-6.65*aspect;ortho.right=6.65*aspect;ortho.top=6.65;ortho.bottom=-6.65;ortho.updateProjectionMatrix();perspective.aspect=aspect;perspective.updateProjectionMatrix();renderer.setSize(w,h,false);}
 function aim(p,t,zoom=1,persp=false){camera=persp?perspective:ortho;controls.object=camera;controls.target.fromArray(t);camera.position.fromArray(p);camera.zoom=zoom;camera.updateProjectionMatrix();controls.autoRotate=false;document.getElementById('rotate').classList.remove('active');controls.update();}
 function setWallMode(mode){house.setWalls(mode);document.getElementById('walls').value=mode;}
 function setView(name){current=name;selected=null;const fit=Math.min(1,viewport.clientWidth/viewport.clientHeight/1.30);
  if(name==='top'){aim([5.915,28,3.641],[5.915,0,3.64],1.22*fit);setWallMode('cut');}
  else if(name==='reference'){aim([5.915,26,9.8],[5.915,.3,3.64],1.18*fit);setWallMode('full');refTab='room';}
  else if(name==='corridor-view'){aim([10.78,1.5,3.17],[.46,1.38,3.17],1,true);setWallMode('full');}
  else aim([17,15,20],[5.915,.55,3.64],1.10*fit);
  house.setCeiling(false);document.getElementById('ceiling').checked=false;
  document.getElementById('view-title').textContent=({top:'整屋俯视',reference:'与主参考对应的视角','corridor-view':'从门厅看向长廊',hero:'整屋结构'}[name]||'整屋结构');document.getElementById('view-subtitle').textContent='第一阶段 · 房间连接与家具体量';document.getElementById('room-note').textContent='入口、中央长廊、缘侧与各房间 · 统一比例';updateButtons();refreshReference();}
 function focusRoom(id){const r=rooms.find(r=>r.id===id);if(!r||r.storage)throw new Error('Unknown room');selected=id;current='room';const [a,b,c,d]=r.r,cx=(a+c)/2,cz=(b+d)/2,max=Math.max(c-a,d-b);const fit=Math.min(1,viewport.clientWidth/viewport.clientHeight/1.15);
  aim([cx,10,cz+5],[cx,.5,cz],Math.min(4.6,10.1/(max+1.2))*fit);house.setCeiling(false);document.getElementById('ceiling').checked=false;
  document.getElementById('view-title').textContent=r.name;document.getElementById('view-subtitle').textContent=r.ja||r.name;document.getElementById('room-note').textContent=r.note;refTab='room';updateButtons();refreshReference();}
 function updateButtons(){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===current));document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===selected));}
 function compare(show){document.getElementById('reference-panel').hidden=!show;document.getElementById('compare').classList.toggle('active',show);resize();if(selected)focusRoom(selected);else if(current!=='corridor-view')setView(current);}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-ref]').forEach(b=>b.onclick=()=>{refTab=b.dataset.ref;refreshReference();});
 document.getElementById('walls').onchange=e=>setWallMode(e.target.value);document.getElementById('ceiling').onchange=e=>house.setCeiling(e.target.checked);document.getElementById('doors').onchange=e=>house.setDoorsOpen(e.target.checked);document.getElementById('routes').onchange=e=>routeGroup.visible=e.target.checked;
 document.getElementById('compare').onclick=()=>compare(document.getElementById('reference-panel').hidden);document.getElementById('close-reference').onclick=()=>compare(false);document.getElementById('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;document.getElementById('rotate').classList.toggle('active',controls.autoRotate);};document.getElementById('reset').onclick=()=>{setWallMode('cut');setView('hero');};
 addEventListener('keydown',e=>{if(e.key==='Home'){setWallMode('cut');setView('hero');}if(['+','=','-'].includes(e.key)&&camera.isOrthographicCamera){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(e.key==='-'?.9:1.1),.45,15);camera.updateProjectionMatrix();}});
 new ResizeObserver(resize).observe(viewport);resize();setView(q.get('view')||'hero');if(q.get('room'))focusRoom(q.get('room'));if(q.has('compare'))compare(true);
 function render(){controls.update();scene.updateMatrixWorld(true);const show=document.getElementById('labels').checked&&!house.getViewState().ceilingVisible&&current!=='corridor-view';
  for(const {r,label} of labels){const [a,b,c,d]=r.r,p=new THREE.Vector3((a+c)/2,.16,(b+d)/2).project(camera);label.hidden=!show||!!selected&&selected!==r.id||p.z>1||p.z< -1;label.style.left=((p.x+1)/2*viewport.clientWidth)+'px';label.style.top=((-p.y+1)/2*viewport.clientHeight)+'px';}
  renderer.render(scene,camera);frames++;requestAnimationFrame(render);
 }render();
 window.__sakuraInterior={get ready(){return frames>2;},house,scene,renderer,controls,createInterior,setView,focusRoom,compare,setWallMode,render,
  get camera(){return camera;},inspect(){return {specification,frames,current,selected,view:house.getViewState(),rooms:rooms.filter(r=>!r.storage).map(r=>({id:r.id,name:r.name,r:r.r})),connections:house.connections,entry:house.entry,furniture:house.furnitureItems,camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},stats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries}};}};
}catch(error){document.getElementById('fatal').hidden=false;document.getElementById('fatal').textContent='预览启动失败：'+error.message;console.error(error);}
