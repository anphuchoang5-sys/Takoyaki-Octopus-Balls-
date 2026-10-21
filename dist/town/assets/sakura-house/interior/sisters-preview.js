import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createInterior} from './index.js';
import {createSistersRoom,sistersSpecification} from './sisters-room.js';

try {
 const style=document.getElementById('sisters-style');if(!style.textContent)style.textContent=await(await fetch(new URL('./sisters-preview.css',import.meta.url))).text();
 const query=new URLSearchParams(location.search);if(query.has('capture'))document.documentElement.classList.add('capture');
 const canvas=document.getElementById('world'),viewport=document.getElementById('viewport');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#efe5dc');
 const house=createInterior(),room=house.sisters;room.setWallMode('full');scene.add(room.root);
 // The old closet remains part of this room's real plan. Only its existing door/frame are shown here.
 const closet=new THREE.Group();closet.name='预览沿用原壁橱门';
 for(const name of ['door:sisters-closets:3.83','frame:sisters-closets']){
  const original=house.root.getObjectByName(name);if(original)closet.add(original.clone(true));
 }scene.add(closet);
 const corridor=new THREE.Group();corridor.name='仅预览的门外走廊参照';
 function contextBox(w,h,d,x,y,z,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,z);corridor.add(m);return m;}
 contextBox(.895,.05,.84,6.49,-.027,3.235,'#d3ac78');
 for(let z=2.88;z<3.64;z+=.19)contextBox(.895,.002,.008,6.49,.001,z,'#b58d61');
 const corridorBackdrop=contextBox(.895,2.45,.015,6.49,1.225,2.815,'#f0e7cc');scene.add(corridor);
 const base=new THREE.Mesh(new THREE.BoxGeometry(3.64,.12,3.64),new THREE.MeshBasicMaterial({color:'#c4a398'}));base.position.set(6.37,-.061,5.46);scene.add(base);
 const camera=new THREE.PerspectiveCamera(43,1,.025,100),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.25;controls.maxDistance=16;controls.maxPolarAngle=Math.PI*.49;
 const views={
  room:{p:[10.3,5.7,10.5],t:[6.37,.88,5.46],title:'姐妹房 · 整体',ref:2},
  top:{p:[6.37,8.9,5.461],t:[6.37,0,5.46],title:'姐妹房 · 家具与通道',ref:2},
  cabinets:{p:[6.39,2.22,8.15],t:[6.39,1.03,3.96],title:'入口两边 · 绿色高柜与橘色矮柜',ref:2},
  sakiko:{p:[8.20,2.2,5.0],t:[4.98,.95,6.42],title:'姐姐书桌 · 格纹木椅与圆镜',ref:3},
  maruko:{p:[4.20,1.85,6.13],t:[7.70,1.02,6.13],title:'小丸子书桌 · 黄色桌面与橙色椅子',ref:4},
  reverse:{p:[2.8,4.2,1.45],t:[6.37,.8,5.50],title:'侧面与背面 · 可继续旋转查看',ref:2},
  dolls:{p:[7.15,1.91,5.14],t:[7.53,1.21,3.97],title:'矮柜近景 · 展示盒、坐熊与娃娃',ref:1},
  mirror:{p:[6.85,1.65,6.05],t:[4.99,1.0,6.42],title:'姐姐桌近景 · 圆镜与窗边玩偶',ref:3},
  loose:{p:[6.42,3.4,6.75],t:[6.43,.03,5.93],title:'地面近景 · 杂志、零食与长耳玩偶',ref:1}
 };
 let current='room',ref=2,frames=0;
 function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 function reference(n){
  ref=Number(n);const files=['sisters-01-cabinets.jpg','sisters-02-room.jpg','sisters-03-sakiko.jpg','sisters-04-maruko.jpg'],file=files[ref-1];
  document.getElementById('reference-image').src=globalThis.__sistersReferences?.[file]||new URL('./references/'+file,import.meta.url).href;
  document.getElementById('reference-caption').textContent=['图一：以上半部动画核对书柜、挂袋和散落物。','图二：柜子墙全貌、门旁贴纸及房间两侧摆位。','图三：姐姐书桌；桌上的蓝色圆形物按用户决定做圆镜。','图四：以上半部动画核对小丸子的书桌、墙贴和收纳箱。'][ref-1];
  document.querySelectorAll('[data-ref]').forEach(b=>b.classList.toggle('active',Number(b.dataset.ref)===ref));
 }
 function setView(name){current=views[name]?name:'room';const v=views[current];camera.position.fromArray(v.p);controls.target.fromArray(v.t);camera.zoom=1;camera.updateProjectionMatrix();controls.update();document.getElementById('view-title').textContent=v.title;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===current));reference(v.ref);}
 function applyWalls(){
  const auto=document.getElementById('auto-walls').checked;
  const hidden=auto?new Set(current==='top'?['north','south','west','east']:[...(camera.position.x<4.55?['west']:camera.position.x>8.19?['east']:[]),...(camera.position.z<3.64?['north']:camera.position.z>7.28?['south']:[])]):new Set();
  for(const e of room.entries){
   if(e.id==='房02'){for(const m of e.group.children){m.visible=!m.userData.wallside||!hidden.has(m.userData.wallside);}}
   else if(e.group.parent===room.walls){const p=e.group.position,side=e.id==='姐14'?'south':p.x<4.7?'west':p.x>8?'east':'north';e.group.visible=!hidden.has(side);}
  }
  closet.visible=!hidden.has('west');
  corridor.visible=!hidden.has('north');
  corridorBackdrop.visible=current==='cabinets';
 }
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-ref]').forEach(b=>b.onclick=()=>reference(b.dataset.ref));
 document.getElementById('loose').onchange=e=>room.setLoose(e.target.checked);
 function compare(show){document.getElementById('reference-panel').hidden=!show;document.getElementById('compare').textContent=show?'收起参考对照':'打开参考对照';resize();}
 document.getElementById('compare').onclick=()=>compare(document.getElementById('reference-panel').hidden);document.getElementById('close-reference').onclick=()=>compare(false);document.getElementById('reset').onclick=()=>setView('room');
 addEventListener('keydown',e=>{if(e.key==='Home')setView('room');});
 new ResizeObserver(resize).observe(viewport);resize();setView(query.get('view')||'room');if(query.has('compare'))compare(true);
 function render(){controls.update();applyWalls();renderer.render(scene,camera);frames++;requestAnimationFrame(render);}render();
 window.__sisters={get ready(){return frames>2;},room,house,scene,camera,controls,renderer,views,setView,compare,reference,createSistersRoom,createInterior,
  inspect(){return {specification:sistersSpecification,current,frames,entries:room.entries.map(e=>({id:e.id,name:e.name})),camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},loose:room.loose.visible,stats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}};}};
}catch(e){document.getElementById('fatal').hidden=false;document.getElementById('fatal').textContent='预览启动失败：'+e.message;console.error(e);}
