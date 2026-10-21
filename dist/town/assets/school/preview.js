import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createModel,specification} from './index.js';

try{
  const canvas=document.getElementById('world');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;

  const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe9e0');
  const camera=new THREE.PerspectiveCamera(30,1,.1,260);
  camera.position.set(-30,18,46);
  const controls=new OrbitControls(camera,canvas);
  controls.target.set(0,5.5,0);controls.enableDamping=true;controls.dampingFactor=.08;
  controls.minDistance=16;controls.maxDistance=105;controls.maxPolarAngle=Math.PI*.495;controls.autoRotateSpeed=.55;

  const hemi=new THREE.HemisphereLight('#fff8ea','#a8b7a0',1.15);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff0d2',2.2);sun.position.set(-18,28,22);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:90});
  sun.shadow.bias=-.00035;sun.shadow.normalBias=.028;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight('#dce9ec',.5);fill.position.set(18,12,-22);scene.add(fill);

  const ground=new THREE.Mesh(new THREE.PlaneGeometry(320,320),new THREE.MeshStandardMaterial({color:'#c9d6b9',roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);

  const school=createModel();scene.add(school.root);
  const porch=new THREE.PointLight('#ffb96a',0,18,2);porch.position.set(0,3.4,5.6);scene.add(porch);

  const views={
    hero:{p:[-30,18,46],t:[0,5.5,0]},
    front:{p:[0,9,58],t:[0,5.5,0]},
    tower:{p:[0,12.5,24],t:[0,9.6,3]},
    entrance:{p:[0,5.2,22],t:[0,2.7,4.2]},
    gate:{p:[0,4.5,26],t:[0,1.8,10]},
    roof:{p:[-14,18,20],t:[0,8.5,0]},
    top:{p:[0,70,.01],t:[0,0,0]}
  };
  let currentView='hero',time='afternoon',frames=0;

  function setTime(next){
    time=next;
    school.setEnvironment({time});
    const night=time==='night',dusk=time==='dusk',morning=time==='morning';
    scene.background.set(night?'#17233d':dusk?'#d8b4a2':morning?'#e8eee0':'#dfe9e0');
    ground.material.color.set(night?'#26334a':dusk?'#b7b29a':morning?'#d5e0c8':'#c9d6b9');
    hemi.intensity=night?.5:dusk?.82:morning?1.05:1.15;
    sun.intensity=night?.22:dusk?1.15:morning?1.8:2.2;
    fill.intensity=night?.18:dusk?.38:.5;
    porch.intensity=night?9:dusk?3.2:0;
    renderer.toneMappingExposure=night?1.22:dusk?1.08:1.02;
    renderer.shadowMap.needsUpdate=true;
    document.body.classList.toggle('night',night);
    document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('active',b.dataset.time===time));
    const label=document.getElementById('time-label');
    if(label)label.textContent=({morning:'早晨',afternoon:'午后',dusk:'黄昏',night:'夜晚'}[time])+' · '+(night?'窗光与门廊灯':dusk?'开始亮灯':'日光');
  }
  function setView(name){
    currentView=name;
    const v=views[name]||views.hero;
    controls.autoRotate=false;
    document.getElementById('rotate')?.classList.remove('active');
    camera.position.fromArray(v.p);controls.target.fromArray(v.t);controls.update();
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    const cap=document.getElementById('caption');
    if(cap)cap.textContent=({
      hero:'立体全景 · 2×2 校园',
      front:'正立面 · 三层窗列与钟楼',
      tower:'钟楼近景 · 钟面与竖向窗带',
      entrance:'入口门廊 · 台阶与双门',
      gate:'校门近景 · 围墙、校牌与花池',
      roof:'屋顶 · 女儿墙与栏杆',
      top:'28 × 28 · 校园俯视'
    }[name]||'');
    renderer.shadowMap.needsUpdate=true;
  }
  function resize(){
    const w=innerWidth,h=innerHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    renderer.shadowMap.needsUpdate=true;
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>setTime(b.dataset.time)));
  document.getElementById('reset')?.addEventListener('click',()=>{setView('hero');setTime('afternoon');});
  document.getElementById('rotate')?.addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.classList.toggle('active',controls.autoRotate);});
  document.getElementById('reference-toggle')?.addEventListener('click',e=>{
    const panel=document.getElementById('reference-panel');
    panel.hidden=!panel.hidden;
    e.currentTarget.setAttribute('aria-pressed',String(!panel.hidden));
    e.currentTarget.textContent=panel.hidden?'打开原图对照':'收起原图对照';
  });
  document.getElementById('reference-close')?.addEventListener('click',()=>{
    document.getElementById('reference-panel').hidden=true;
    const b=document.getElementById('reference-toggle');b.setAttribute('aria-pressed','false');b.textContent='打开原图对照';
  });
  addEventListener('resize',resize);
  addEventListener('keydown',e=>{
    if(e.key==='Home'){setView('hero');e.preventDefault();}
    else if(e.key==='+'){camera.zoom=Math.min(2,camera.zoom*1.08);camera.updateProjectionMatrix();e.preventDefault();}
    else if(e.key==='-'){camera.zoom=Math.max(.65,camera.zoom*.92);camera.updateProjectionMatrix();e.preventDefault();}
  });

  const query=new URLSearchParams(location.search);
  if(query.has('clean'))document.body.classList.add('clean');
  resize();
  setTime(query.get('time')||'afternoon');
  setView(query.get('view')||'hero');
  function draw(){controls.update();renderer.render(scene,camera);frames++;requestAnimationFrame(draw);}
  draw();

  function boundsAt(degrees){
    const originalRot=school.root.rotation.y,originalPos=school.root.position.clone();
    school.root.position.set(0,0,0);school.root.rotation.y=degrees*Math.PI/180;school.root.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(school.root);
    school.root.rotation.y=originalRot;school.root.position.copy(originalPos);school.root.updateMatrixWorld(true);
    return {degrees,min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()};
  }
  function inspect(){
    const b=new THREE.Box3().setFromObject(school.root);
    return {
      specification,frames,view:currentView,time,environment:school.getEnvironmentState(),
      bounds:{min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()},
      rotations:[0,90,180,270].map(boundsAt),
      stats:{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}
    };
  }
  window.__school={get ready(){return frames>2;},school,scene,camera,renderer,controls,inspect,setView,setTime,boundsAt};
}catch(error){
  const box=document.getElementById('fatal');
  if(box){box.hidden=false;box.textContent='预览启动失败：'+error.message;}
  console.error(error);
}
