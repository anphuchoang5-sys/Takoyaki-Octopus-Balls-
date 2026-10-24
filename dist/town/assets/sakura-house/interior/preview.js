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
 const entryViews={
  'entry-reference':{p:[11.60,1.55,2.6],t:[10.65,.75,.55],zoom:.9,title:'玄关 · 鞋柜盆花与正门'},
  'entry-cabinet':{p:[11.65,1.15,1.62],t:[10.32,.48,1.60],zoom:.8,title:'玄关 · 木鞋柜正面与横向地板'},
  'entry-plant':{p:[11.13,1.31,1.38],t:[10.32,.88,.88],zoom:.95,title:'玄关 · 浅盆与花叶近看'},
  'entry-door':{p:[10.9,1.25,-2.3],t:[10.9,.9,0],zoom:.9,title:'正门 · 从门外查看'},
  'entry-inside':{p:[10.93,1.35,1.72],t:[10.90,.9,0],zoom:.72,title:'正门 · 从玄关内查看'},
  'entry-reverse':{p:[11.50,1.65,.25],t:[10.40,.45,1.20],zoom:.8,title:'玄关 · 侧后与木台阶'},
  'entry-top':{p:[10.92,12,.911],t:[10.92,0,.91],zoom:3.5,ortho:true,mode:'cut',title:'玄关 · 俯视通行空间'},
  'entry-junction':{p:[11.55,.86,2.28],t:[10.34,.23,1.70],zoom:.85,title:'玄关 · 横向地板与柜侧衔接'}
 };
 const kitchenViews={
  'kitchen-stove':{p:[7.78,1.72,1.45],t:[7.78,1.00,-1.43],zoom:1.0,title:'厨房 · 灶台参考方向',ref:'stove'},
  'kitchen-entry':{p:[8.18,1.73,-.58],t:[8.18,1.02,2.40],zoom:1.05,title:'厨房 · 橱柜与暖帘入口',ref:'front'},
  'kitchen-side':{p:[7.55,1.65,-.55],t:[9.55,1.07,1.32],zoom:.95,title:'厨房 · 日历、小架与坛子',ref:'side'},
  'kitchen-table':{p:[8.78,1.85,.90],t:[7.21,.80,.74],zoom:.68,title:'厨房 · 黄桌、橙椅与绿凳',ref:'table'},
  'kitchen-sink':{p:[7.97,1.68,-.33],t:[8.15,.86,-1.39],zoom:.8,title:'厨房 · 凹水槽、台面与燃气灶',ref:'stove'},
  'kitchen-cabinet':{p:[9.37,1.58,.68],t:[9.38,1.08,2.40],zoom:.95,title:'厨房 · 食器柜正面近看',ref:'front'},
  'kitchen-cooker':{p:[7.88,1.74,1.25],t:[7.16,1.05,2.40],zoom:.95,title:'厨房 · 圆形饭锅与门边小柜',ref:'front'},
  'kitchen-top':{p:[7.75,14,.466],t:[7.75,0,.465],zoom:2.05,ortho:true,mode:'cut',title:'厨房 · 局部后扩与通行空间',ref:'front'},
  'kitchen-rear':{p:[3.5,7,-6],t:[7.70,.7,.25],zoom:1.8,ortho:true,mode:'full',title:'厨房 · 侧后外墙与原房间连接',ref:'stove'}
 };
 const washViews={
  'wash-reference':{p:[-.30,1.60,.55],t:[1.32,.95,1.52],zoom:.86,title:'洗面室 · 参考方向'},
  'wash-basin':{p:[.70,1.57,1.30],t:[1.52,1.11,1.66],zoom:.93,title:'洗面室 · 镜子、牙刷与台盆'},
  'wash-baskets':{p:[.55,1.40,1.48],t:[1.54,1.02,.83],zoom:.83,title:'洗面室 · 篮具与折叠布料'},
  'wash-reverse':{p:[.60,1.73,2.49],t:[1.22,.85,1.12],zoom:.72,title:'洗面室 · 门口侧回看'},
  'wash-entry':{p:[.43,1.25,1.95],t:[1.38,.28,2.30],zoom:.85,title:'洗面室 · 地毯与门边鞋套机'},
  'wet-overview':{p:[.61,12,.456],t:[.61,0,.455],zoom:2.35,ortho:true,mode:'cut',title:'卫浴俯视 · 2.42×2.42 / 2.42×2.13米'},
  'bath-view':{p:[.96,1.75,.08],t:[.56,.55,-1.06],zoom:.75,title:'浴室 · 后移的浴缸与洗浴空地'},
  'wet-doors':{p:[.61,1.45,1.0],t:[.48,1.05,2.66],zoom:.75,title:'洗面室推拉门 · 勾选或取消门扇开关'},
  'bath-door':{p:[.65,1.45,-1.35],t:[.52,1.05,.25],zoom:.75,title:'浴室推拉门 · 勾选或取消门扇开关'},
  'wet-rear':{p:[-3.8,7,5.8],t:[.61,.65,.455],zoom:1.85,ortho:true,mode:'full',title:'卫浴侧后 · 外墙与相邻房间连接'}
 };
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
  if(selected==='wash'&&refTab!=='plan'){file='wash-01-anime.jpg';caption='用户动画参考 · 保留镜盆、两类篮具与地毯；卫浴扩至约2.4×2.4 / 2.4×2.1米，两门改推拉。扩建尺寸及不可见部分为确认后的补全。';source=null;}
  if(selected==='entry'&&refTab!=='plan'){file='entry-01-anime.png';caption='用户参考 · 下两图为鞋柜与盆花，右上为正门。尺寸、盆花背面、柜下收纳用途及内外颜色协调为补全；本次仅独立室内，未同步地图室外门。';source=null;}
  if(selected==='kitchen'&&refTab!=='plan'){file='kitchen-'+(kitchenViews[current]?.ref||'stove')+'.jpg';caption='用户动画参考 · 门柜与台面按可见部分制作；厨房局部后扩、具体米制尺寸和未见连接为补全。纸面图案为重绘，人物不进入模型。';source=null;}
  if(refTab==='plan')caption+=' 卫浴已按用户后续确认局部扩建，厨房也已局部后扩，原平面中的这两处尺寸不再代表当前模型。';
  const image=document.getElementById('reference-image'),link=document.getElementById('reference-image-link');image.src=globalThis.__interiorReferences?.[file]||new URL('./references/'+file,import.meta.url).href;link.href=image.src;document.getElementById('reference-caption').textContent=caption;const sourceLink=document.getElementById('reference-source');sourceLink.hidden=!source;if(source)sourceLink.href=source;else sourceLink.removeAttribute('href');
  document.querySelectorAll('[data-ref]').forEach(b=>b.classList.toggle('active',b.dataset.ref===refTab));
 }
 function resize(){const w=viewport.clientWidth,h=viewport.clientHeight,aspect=w/h;ortho.left=-6.65*aspect;ortho.right=6.65*aspect;ortho.top=6.65;ortho.bottom=-6.65;ortho.updateProjectionMatrix();perspective.aspect=aspect;perspective.updateProjectionMatrix();renderer.setSize(w,h,false);}
 function aim(p,t,zoom=1,persp=false){camera=persp?perspective:ortho;controls.object=camera;controls.target.fromArray(t);camera.position.fromArray(p);camera.zoom=zoom;camera.updateProjectionMatrix();controls.autoRotate=false;document.getElementById('rotate').classList.remove('active');controls.update();}
 function setWallMode(mode){house.setWalls(mode);document.getElementById('walls').value=mode;}
 function setView(name){if(entryViews[name])return focusEntry(name);if(kitchenViews[name])return focusKitchen(name);if(washViews[name])return focusWash(name);if(livingViews[name])return focusLiving(name);current=name;selected=null;desk=null;livingView=null;const fit=Math.min(1,viewport.clientWidth/viewport.clientHeight/1.30);
  if(name==='top'){aim([5.915,28,3.641],[5.915,0,3.64],1.22*fit);setWallMode('cut');}
  else if(name==='reference'){aim([5.915,26,9.8],[5.915,.3,3.64],1.18*fit);setWallMode('full');refTab='room';}
  else if(name==='corridor-view'){aim([10.78,1.5,3.17],[.46,1.38,3.17],1,true);setWallMode('full');}
  else if(name==='engawa-view'){aim([.455,1.35,3.96],[.455,.08,6.7],.85,true);setWallMode('full');}
  else aim([17,15,20],[5.915,.55,3.64],1.10*fit);
  house.setCeiling(false);document.getElementById('ceiling').checked=false;
  document.getElementById('view-title').textContent=({top:'整屋俯视',reference:'与主参考对应的视角','corridor-view':'从门厅看向长廊','engawa-view':'缘侧走廊 · 暖黄木地板',hero:'樱家完整室内'}[name]||'樱家完整室内');document.getElementById('view-subtitle').textContent=specification.stage;document.getElementById('room-note').textContent='中央长廊与缘侧采用玄关门厅地板样式 · 原房间、家具及通道尺寸保留';updateButtons();refreshReference();}
 function focusRoom(id){if(id==='entry')return focusEntry('entry-reference');if(id==='kitchen')return focusKitchen('kitchen-stove');if(id==='wash')return focusWash('wash-reference');const r=rooms.find(r=>r.id===id);if(!r||r.storage)throw new Error('Unknown room');selected=id;current='room';desk=null;livingView=null;const [a,b,c,d]=r.r,cx=(a+c)/2,cz=(b+d)/2,max=Math.max(c-a,d-b);const fit=Math.min(1,viewport.clientWidth/viewport.clientHeight/1.15);
  aim([cx,10,cz+5],[cx,.5,cz],Math.min(4.6,10.1/(max+1.2))*fit);house.setCeiling(false);document.getElementById('ceiling').checked=false;
  if(id==='sisters'||id==='living')setWallMode('full');
  document.getElementById('view-title').textContent=r.name;document.getElementById('view-subtitle').textContent=(r.ja||r.name)+(id==='sisters'?' · 已精修':id==='living'?' · 精修待审':['hall','corridor','engawa'].includes(id)?' · 暖黄木地板':' · 原结构样板');document.getElementById('room-note').textContent=id==='sisters'?'两张书桌、入口书柜、圆镜、玩偶与最新贴画 · 可选两张书桌近看':r.note;refTab=id==='sisters'||id==='living'?'anime':'room';updateButtons();refreshReference();}
 function focusDesk(name){if(!desks[name])throw new Error('Unknown sisters desk');const v=desks[name];selected='sisters';current='desk';desk=name;livingView=null;aim(v.p,v.t,1,true);setWallMode('full');house.setCeiling(false);document.getElementById('ceiling').checked=false;document.getElementById('view-title').textContent='姐妹房 · '+v.title;document.getElementById('view-subtitle').textContent='整屋内的实际陈设 · 拖动旋转，滚轮缩放';document.getElementById('room-note').textContent=name==='maruko'?'MoMoE贴画已加宽，重画持麦姿势与人物比例':'秀树为正方形贴画，浅蓝衣服与蓝底分开';refTab='anime';updateButtons();refreshReference();}
 function focusLiving(name){const v=livingViews[name];if(!v)throw new Error('Unknown living view');selected='living';current=name;desk=null;livingView=name;aim(v.p,v.t,v.zoom||1,true);setWallMode('full');house.setCeiling(false);document.getElementById('ceiling').checked=false;document.getElementById('view-title').textContent=v.title;document.getElementById('view-subtitle').textContent='客01—客16 · 精修待审';document.getElementById('room-note').textContent='尺寸、背面、裁切柜体和绿色摆件为补全 · 原图人物不在场景中';refTab='anime';updateButtons();refreshReference();}
 function focusWash(name){const v=washViews[name];if(!v)throw new Error('Unknown washroom view');selected='wash';current=name;desk=null;livingView=null;aim(v.p,v.t,v.zoom||1,!v.ortho);setWallMode(v.mode||'full');house.setCeiling(false);document.getElementById('ceiling').checked=false;document.getElementById('view-title').textContent=v.title;document.getElementById('view-subtitle').textContent='卫浴局部扩建 · 拖动旋转，滚轮缩放';document.getElementById('room-note').textContent='两处门沿卫浴侧墙滑开 · 走廊、其他房间与室外建筑保持原样';refTab='anime';updateButtons();refreshReference();}
 function focusKitchen(name){const v=kitchenViews[name];selected='kitchen';current=name;desk=null;livingView=null;const fit=v.ortho?1:Math.min(1,viewport.clientWidth/viewport.clientHeight/1.45);aim(v.p,v.t,(v.zoom||1)*fit,!v.ortho);setWallMode(v.mode||'full');house.setCeiling(false);document.getElementById('ceiling').checked=false;document.getElementById('view-title').textContent=v.title;document.getElementById('view-subtitle').textContent='厨房精修待审 · 拖动旋转，滚轮缩放';document.getElementById('room-note').textContent='只扩厨房后侧、调整厨房门位 · 卫浴、其他房间和走廊尺寸保持';refTab='anime';updateButtons();refreshReference();}
 function updateButtons(){document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===current));document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===selected));document.querySelectorAll('[data-desk]').forEach(b=>b.classList.toggle('active',b.dataset.desk===desk));}
 function focusEntry(name){const v=entryViews[name],changed=current!==name;selected='entry';current=name;desk=null;livingView=null;const fit=v.ortho?1:Math.min(1,viewport.clientWidth/viewport.clientHeight/1.4);aim(v.p,v.t,(v.zoom||1)*fit,!v.ortho);setWallMode(v.mode||'full');house.setCeiling(false);document.getElementById('ceiling').checked=false;if(changed){house.setDoorsOpen(false);document.getElementById('doors').checked=false;}document.getElementById('view-title').textContent=v.title;document.getElementById('view-subtitle').textContent='玄关精修待审 · 拖动旋转，滚轮缩放';document.getElementById('room-note').textContent='双扇错轨推拉 · 勾选“打开通行门扇”查看开启';refTab='anime';updateButtons();refreshReference();}
 function compare(show){document.getElementById('reference-panel').hidden=!show;document.getElementById('compare').classList.toggle('active',show);resize();if(entryViews[current])focusEntry(current);else if(kitchenViews[current])focusKitchen(current);else if(washViews[current])focusWash(current);else if(livingView)focusLiving(livingView);else if(desk)focusDesk(desk);else if(selected)focusRoom(selected);else if(!['corridor-view','engawa-view'].includes(current))setView(current);}
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-ref]').forEach(b=>b.onclick=()=>{refTab=b.dataset.ref;refreshReference();});
 document.querySelectorAll('[data-desk]').forEach(b=>b.onclick=()=>focusDesk(b.dataset.desk));
 document.getElementById('walls').onchange=e=>setWallMode(e.target.value);document.getElementById('ceiling').onchange=e=>house.setCeiling(e.target.checked);document.getElementById('doors').onchange=e=>house.setDoorsOpen(e.target.checked);document.getElementById('routes').onchange=e=>routeGroup.visible=e.target.checked;
 document.getElementById('compare').onclick=()=>compare(document.getElementById('reference-panel').hidden);document.getElementById('close-reference').onclick=()=>compare(false);document.getElementById('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;document.getElementById('rotate').classList.toggle('active',controls.autoRotate);};document.getElementById('reset').onclick=()=>{setWallMode('cut');setView('hero');};
 addEventListener('keydown',e=>{if(e.key==='Home'){setWallMode('cut');setView('hero');}if(['+','=','-'].includes(e.key)&&camera.isOrthographicCamera){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(e.key==='-'?.9:1.1),.45,15);camera.updateProjectionMatrix();}});
 new ResizeObserver(resize).observe(viewport);resize();setView(q.get('view')||'hero');if(q.get('room'))focusRoom(q.get('room'));if(q.get('desk'))focusDesk(q.get('desk'));if(q.has('compare'))compare(true);
 function render(){controls.update();scene.updateMatrixWorld(true);const show=document.getElementById('labels').checked&&!house.getViewState().ceilingVisible&&!['corridor-view','engawa-view'].includes(current)&&current!=='desk'&&!livingView&&!washViews[current]&&!kitchenViews[current]&&!entryViews[current];
  for(const {r,label} of labels){const [a,b,c,d]=r.r,p=new THREE.Vector3((a+c)/2,.16,(b+d)/2).project(camera);label.hidden=!show||!!selected&&selected!==r.id||p.z>1||p.z< -1;label.style.left=((p.x+1)/2*viewport.clientWidth)+'px';label.style.top=((-p.y+1)/2*viewport.clientHeight)+'px';}
  renderer.render(scene,camera);frames++;requestAnimationFrame(render);
 }render();
 window.__sakuraInterior={get ready(){return frames>2;},house,scene,renderer,controls,createInterior,setView,focusRoom,focusDesk,focusLiving,focusWash,focusKitchen,focusEntry,compare,setWallMode,render,
  get camera(){return camera;},inspect(){return {specification,frames,current,selected,desk,livingView,view:house.getViewState(),rooms:rooms.filter(r=>!r.storage).map(r=>({id:r.id,name:r.name,r:r.r})),connections:house.connections,entry:house.entry,furniture:house.furnitureItems,camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},stats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries}};}};
}catch(error){document.getElementById('fatal').hidden=false;document.getElementById('fatal').textContent='预览启动失败：'+error.message;console.error(error);}
