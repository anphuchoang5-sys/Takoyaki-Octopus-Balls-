import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export async function createResidentialPreview(createModel,config){
 const style=document.getElementById('viewer-style');
 if(!style.textContent.trim()){const r=await fetch(new URL('./residential-preview.css',import.meta.url));if(!r.ok)throw new Error('样式加载失败');style.textContent=await r.text();}
 const canvas=document.querySelector('#world'),viewport=document.querySelector('#viewport'),scene=new THREE.Scene();scene.background=new THREE.Color('#e8eddf');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const camera=new THREE.OrthographicCamera(-10,10,7,-7,.1,180),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.12;controls.minZoom=.45;controls.maxZoom=8;controls.minPolarAngle=.03;controls.maxPolarAngle=Math.PI*.485;controls.autoRotateSpeed=.65;
 const hemi=new THREE.HemisphereLight('#f2f7ff','#bbc99b',2.05);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#fff4df',2.4);sun.position.set(-10,17,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:60});sun.shadow.bias=-.00013;sun.shadow.normalBias=.028;sun.shadow.radius=3;scene.add(sun,sun.target);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({color:'#62715f',opacity:.15}));ground.rotation.x=-Math.PI/2;ground.position.y=-.145;ground.receiveShadow=true;scene.add(ground);
 const asset=createModel();scene.add(asset.root);
 const width=asset.specification.plot[0],height=config.height||12;
 const views={hero:{position:[width*.92,13,width*1.30],target:[0,3.05,0],height:height+1.8},reference:{position:[0,4.7,46],target:[0,3.75,0],height:config.referenceHeight||9.9},front:{position:[0,6,40],target:[0,3.4,0],height:11.4},left:{position:[-28,11,9],target:[0,3.0,0],height:height+1},right:{position:[28,11,9],target:[0,3.0,0],height:height+1},back:{position:[-18,13,-27],target:[0,3.0,-.6],height:height+1},top:{position:[0,40,.02],target:[0,0,0],height:width+1.6},roof:config.roof,detail:config.detail,gate:config.gate};
 const labels={hero:'立体全景',reference:'参考角度',front:'正面',left:'左侧',right:'右侧',back:'背面 · 根据结构补全',top:'俯视布局',roof:'屋面连接与檐口厚度',detail:config.detailLabel,gate:'院门与地面接触'};
 let current='hero',frame=0,raf=0,disposed=false;
 function resize(){const w=viewport.clientWidth,h=viewport.clientHeight,full=['hero','reference','front','left','right','back','top'].includes(current),half=Math.max(views[current].height/2,full?width*.57/(w/h):0);camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
 function setView(name){if(!views[name])throw new Error('未知机位 '+name);current=name;controls.autoRotate=false;controls.reset();camera.zoom=1;camera.position.fromArray(views[name].position);controls.target.fromArray(views[name].target);camera.lookAt(controls.target);controls.update();resize();document.querySelector('#caption').textContent=labels[name];document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));document.querySelector('#rotate').setAttribute('aria-pressed','false');}
 function reference(open){document.querySelector('#reference-panel').hidden=!open;document.querySelector('#compare').setAttribute('aria-pressed',String(open));if(open)setView('reference');else resize();}
 function clean(on=true){document.body.classList.toggle('clean',on);reference(false);resize();}
 const bindings=[];function bind(id,fn){const el=document.querySelector(id);el.addEventListener('click',fn);bindings.push([el,fn]);}
 document.querySelectorAll('[data-view]').forEach(b=>{const fn=()=>setView(b.dataset.view);b.addEventListener('click',fn);bindings.push([b,fn]);});
 bind('#compare',()=>reference(document.querySelector('#reference-panel').hidden));bind('#close-reference',()=>reference(false));bind('#reset',()=>setView('hero'));bind('#rotate',()=>{controls.autoRotate=!controls.autoRotate;document.querySelector('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));});bind('#plants',()=>{const g=asset.root.getObjectByName('庭院植物');g.visible=!g.visible;document.querySelector('#plants').setAttribute('aria-pressed',String(g.visible));document.querySelector('#plants').textContent=g.visible?'植物：显示':'植物：隐藏';});
 if(globalThis.__residentialReference)document.querySelector('#reference-image').src=globalThis.__residentialReference;
 const onKey=e=>{if(e.key==='Home'){e.preventDefault();setView('hero');}if(e.key==='Escape')reference(false);};window.addEventListener('resize',resize);window.addEventListener('keydown',onKey);
 function measure(name){const o=asset.root.getObjectByName(name);if(!o)return null;const b=new THREE.Box3().setFromObject(o);return{min:b.min.toArray(),max:b.max.toArray()};}
 function inspect(){const b=new THREE.Box3().setFromObject(asset.root);return{specification:asset.specification,current,frame,bounds:{min:b.min.toArray(),max:b.max.toArray()},camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},design:asset.getInspection()};}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);bindings.forEach(([el,fn])=>el.removeEventListener('click',fn));window.removeEventListener('resize',resize);window.removeEventListener('keydown',onKey);controls.dispose();asset.dispose();ground.geometry.dispose();ground.material.dispose();sun.shadow.dispose();renderer.dispose();scene.clear();}
 setView(new URL(location.href).searchParams.get('view')||'hero');
 function render(){if(disposed)return;controls.update();renderer.render(scene,camera);frame++;raf=requestAnimationFrame(render);}render();
 window.__house={ready:true,asset,createModel,scene,renderer,camera,controls,views,setView,reference,clean,measure,inspect,dispose};
 window.addEventListener('error',e=>{const el=document.querySelector('#fatal');el.hidden=false;el.textContent='预览加载失败：'+e.message;});
 return window.__house;
}
