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
 let current='hero',selected=null,refTab='plan',frames=0,desk=null,livingView=null;
 const livingViews={
  'living-reference':{p:[10.01,2.46,7.15],t:[10.01,.72,4.95],zoom:.64,title:'客厅 · 动画参考机位'},
  'living-tv':{p:[10.05,1.57,5.76],t:[8.78,.65,4.28],title:'客厅 · 电视、书本与小桶'},
  'living-cabinet':{p:[9.67,1.70,6.60],t:[11.51,.80,5.52],title:'客厅 · 餐具柜与摆件',reference:'living-03-cabinet.jpg'},
  'living-cabinet-front':{p:[8.55,1.80,5.24],t:[11.51,.90,5.24],zoom:1.12,title:'客厅 · 碗柜正面与日历',reference:'living-03-cabinet.jpg'},
  'living-window':{p:[9.95,1.42,4.73],t:[9.95,1.30,7.20],zoom:1.35,title:'客厅 · 窗框窗帘正面',reference:'living-04-window.jpg'},
  'living-reverse':{p:[9.42,2.23,3.93],t:[10.25,.67,6.06],title:'客厅 · 侧后查看'}
 };
 const desks={
  maruko:{p:[5.05,1.95,6.13],t:[7.70,1.04,6.13],title:'小丸子书桌',reference:'sisters-04-maruko.jpg',caption:'用户参考 · 以上半部动画核对书桌、MoMoE贴画和墙面装饰。'},
  sakiko:{p:[7.4,1.95,5.3],t:[4.98,1.04,6.42],title:'姐姐书桌',reference:'sisters-03-sakiko.jpg',caption:'用户动画参考 · 圆镜、窗边陈设与方形秀树贴画；秀树脸部按用户要求留空。'}
 };
 const labelRoot=document.getElementById('room-labels'),labels=[];
 for(const r of rooms.filter(r=>!r.storage)){const button=document.createElement('button');button.dataset.room=r.id;button.textContent=r.name;button.onclick=()=>focusRoom(r.id);document.getElementById('room-buttons').append(button);
  const label=document.createElement('span');label.className='room-label';label.textContent=r.name;labelRoot.append(label);labels.push({r,label});
 }
 const anime={living:['living-01-anime.jpg','用户动画参考 · 浅黄客厅、红电视与书柜、方桌、推拉门和餐具柜'],kitchen:['anime-kitchen.jpg','动画截图 · 绿色厨房与柜体'],sisters:['anime-sisters.jpg','动画截图 · 粉色墙面、绿色书架与书桌'],grandparents:['anime-grandparents.jpg','动画截图 · 障子与松纹襖；纹样留待精修']};
 function refreshReference(){let file='01-plan.jpg',caption='主参考的平面图。本轮按它的房间连接、比例和主要家具位置搭建。',source=sources.layout;
  if(refTab==='room'){const r=rooms.find(r=>r.id===selected);file=r?.ref||'03-whole.jpg';caption=r?`${r.name} · 主参考对应视角。${r.note}`:'主参考的整屋三维俯视。使用“参考视角”对照整体空间。';}
  if(refTab==='anime'){const a=anime[selected||'living'];if(a){[file,caption]=a;source=sources.details;}else {file=rooms.find(r=>r.id===selected)?.ref||'03-whole.jpg';caption='当前房间暂显示主参考；本阶段未把文章中的作者三维图当作动画截图。';}}
  if(selected==='sisters'&&refTab==='anime'){file=desk?desks[desk].reference:'sisters-02-room.jpg';caption=desk?desks[desk].caption:'用户动画参考 · 入口两侧书柜与粉色姐妹房陈设。';source=null;}
  if(selected==='living'&&refTab==='anime'){source=null;const ref=livingViews[livingView]?.reference;if(ref){file=ref;caption=ref==='living-04-window.jpg'?'用户动画参考 · 两根内部横档、米白束帘及下部两道粉带。':'用户动画参考 · 碗柜四格、木框拉手、柜左日历；柜顶被裁切。';}}
  const image=document.getElementById('reference-image'),link=document.getElementById('reference-image-link');image.src=globalThis.__interiorReferences?.[file]||new URL('./references/'+file,import.meta.url).href;link.href=image.src;document.getElementById('reference-caption').textContent=caption;const sourceLink=document.getElementById('reference-source');sourceLink.hidden=!source;if(source)sourceLink.href=source;else sourceLink.removeAttribute('href');
  document.querySelectorAll('[data-ref]').forEach(b=>b.classList.toggle('active',b.dataset.ref===refTab));
 }
 function resize(){const w=viewport.clientWidth,h=viewport.clientHeight,aspect=w/h;ortho.left=-6.65*aspect;ortho.right=6.65*aspect;ortho.top=6.65;ortho.bottom=-6.65;ortho.updateProjectionMatrix();perspective.aspect=aspect;perspective.updateProjectionMatrix();renderer.setSize(w,h,false);}
 function aim(p,t,zoom=1,persp=false){camera=persp?perspective:ortho;controls.object=camera;controls.target.fromArray(t);camera.position.fromArray(p);camera.zoom=zoom;camera.updateProjectionMatrix();controls.autoRotate=false;document.getElementById('rotate').classList.remove('active');controls.update();}
 function setWallMode(mode){house.setWalls(mode);document.getElementById('walls').value=mode;}
 function setView(name){if(livingViews[name])return focusLiving(name);current=name;selected=null;desk=null;livingView=null;const fit=Math.min(1,viewport.clientWidth/viewport.clientHeight/1.30);
  if(name==='top'){aim([5.915,28,3.641],[5.915,0,3.64],1.22*fit);setWallMode('cut');}
  else if(name==='reference'){aim([5.915,26,9.8],[5.915,.3,3.64],1.18*fit);setWallMode('full');refTab='room';}
  else if(name==='corridor-view'){aim([10.78,1.5,3.17],[.46,1.38,3.17],1,true);setWallMode('full');}
  else aim([17,15,20],[5.915,.55,3.64],1.10*fit);
  house.setCeiling(false);document.getElementById('ceiling').checked=false;
  document.getElementById('view-title').textContent=({top:'整屋俯视',reference:'与主参考对应的视角','corridor-view':'从门厅看向长廊',hero:'樱家完整室内'}[name]||'樱家完整室内');document.getElementById('view-subtitle').textContent=specification.stage;document.getElementById('room-note').textContent='入口、长廊与十二处空间 · 客厅精修待审，姐妹房保留，其余结构样板';updateButtons();refreshReference();}
 function focusRoom(id){const r=rooms.find(r=>r.id===id);if(!r||r.storage)throw new Error('Unknown room');selected=id;current='room';desk=null;livingView=null;const [a,b,c,d]=r.r,cx=(a+c)/2,cz=(b+d)/2,max=Math.max(c-a,d-b);const fit=Math.min(1,viewport.clientWidth/viewport.clientHeight/1.15);
  aim([cx,10,cz+5],[cx,.5,cz],Math.min(4.6,10.1/(max+1.2))*fit);house.setCeiling(false);document.getElementById('ceiling').checked=false;
  if(id==='sisters'||id==='living')setWallMode('full');
  document.getElementById('view-title').textContent=r.name;document.getElementById('view-subtitle').textContent=(r.ja||r.name)+(id==='sisters'?' · 已精修':id==='living'?' · 精修待审':' · 原结构样板');document.getElementById('room-note').textContent=id==='sisters'?'两张书桌、入口书柜、圆镜、玩偶与最新贴画 · 可选两张书桌近看':r.note;refTab=id==='sisters'||id==='living'?'anime':'room';updateButtons();refreshReference();}
 function focusDesk(name){if(!desks[name])throw new Error('Unknown sisters desk');const v=desks[name];selected='sisters';current='desk';desk=name;livingView=null;aim(v.p,v.t,1,true);setWallMode('full');house.setCeiling(false);document.getElementById('ceiling').checked=false;document.getElementById('view-title').textContent='姐妹房 · '+v.title;document.getElementById('view-subtitle').textContent='整屋内的实际陈设 · 拖动旋转，滚轮缩放';document.getElementById('room-note').textContent=name==='maruko'?'MoMoE贴画已加宽，重画持麦姿势与人物比例':'秀树为正方形贴画，浅蓝衣服与蓝底分开';refTab='anime';updateButtons();refreshReference();}
 function focusLiving(name){const v=livingViews[name];if(!v)throw new Error('Unknown living view');selected='living';current=name;desk=null;livingView=name;aim(v.p,v.t,v.zoom||1,true);setWallMode('full');house.setCeiling(false);document.getElementById('ceiling').checked=false;document.getElementById('view-title').textContent=v.title;document.getElementById('view-subtitle').textContent='客01—客16 · 精修待审';document.getElementById('room-note').textContent='尺寸、背面、裁切柜体和绿色摆件为补全 · 原图人物不在场景中';refTab='anime';updateButtons();refreshReference();}
 function updateButtons(){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===current));document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===selected));document.querySelectorAll('[data-desk]').forEach(b=>b.classList.toggle('active',b.dataset.desk===desk));}
 function compare(show){document.getElementById('reference-panel').hidden=!show;document.getElementById('compare').classList.toggle('active',show);resize();if(livingView)focusLiving(livingView);else if(desk)focusDesk(desk);else if(selected)focusRoom(selected);else if(current!=='corridor-view')setView(current);}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-ref]').forEach(b=>b.onclick=()=>{refTab=b.dataset.ref;refreshReference();});
 document.querySelectorAll('[data-desk]').forEach(b=>b.onclick=()=>focusDesk(b.dataset.desk));
 document.getElementById('walls').onchange=e=>setWallMode(e.target.value);document.getElementById('ceiling').onchange=e=>house.setCeiling(e.target.checked);document.getElementById('doors').onchange=e=>house.setDoorsOpen(e.target.checked);document.getElementById('routes').onchange=e=>routeGroup.visible=e.target.checked;
 document.getElementById('compare').onclick=()=>compare(document.getElementById('reference-panel').hidden);document.getElementById('close-reference').onclick=()=>compare(false);document.getElementById('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;document.getElementById('rotate').classList.toggle('active',controls.autoRotate);};document.getElementById('reset').onclick=()=>{setWallMode('cut');setView('hero');};
 addEventListener('keydown',e=>{if(e.key==='Home'){setWallMode('cut');setView('hero');}if(['+','=','-'].includes(e.key)&&camera.isOrthographicCamera){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(e.key==='-'?.9:1.1),.45,15);camera.updateProjectionMatrix();}});
 new ResizeObserver(resize).observe(viewport);resize();setView(q.get('view')||'hero');if(q.get('room'))focusRoom(q.get('room'));if(q.get('desk'))focusDesk(q.get('desk'));if(q.has('compare'))compare(true);
 function render(){controls.update();scene.updateMatrixWorld(true);const show=document.getElementById('labels').checked&&!house.getViewState().ceilingVisible&&current!=='corridor-view'&&current!=='desk'&&!livingView;
  for(const {r,label} of labels){const [a,b,c,d]=r.r,p=new THREE.Vector3((a+c)/2,.16,(b+d)/2).project(camera);label.hidden=!show||!!selected&&selected!==r.id||p.z>1||p.z< -1;label.style.left=((p.x+1)/2*viewport.clientWidth)+'px';label.style.top=((-p.y+1)/2*viewport.clientHeight)+'px';}
  renderer.render(scene,camera);frames++;requestAnimationFrame(render);
 }render();
 window.__sakuraInterior={get ready(){return frames>2;},house,scene,renderer,controls,createInterior,setView,focusRoom,focusDesk,focusLiving,compare,setWallMode,render,
  get camera(){return camera;},inspect(){return {specification,frames,current,selected,desk,livingView,view:house.getViewState(),rooms:rooms.filter(r=>!r.storage).map(r=>({id:r.id,name:r.name,r:r.r})),connections:house.connections,entry:house.entry,furniture:house.furnitureItems,camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},stats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries}};}};
}catch(error){document.getElementById('fatal').hidden=false;document.getElementById('fatal').textContent='预览启动失败：'+error.message;console.error(error);}
