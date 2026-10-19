import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createRiggedMaruko,boneGuide,testPoses,setTestPose,rigBones,refreshRig} from './rig.js';

try{
 const canvas=document.querySelector('#world'),stage=canvas.parentElement;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f0eee7');
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.015,160),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.dampingFactor=.12;controls.minZoom=.1;controls.maxZoom=12;controls.maxPolarAngle=Math.PI*.94;
 controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.PAN};
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshBasicMaterial({color:'#f0eee7',toneMapped:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.003;scene.add(floor);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
 const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(69,64,53,.2)');gradient.addColorStop(1,'rgba(69,64,53,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(.46,.25),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,toneMapped:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.001;scene.add(contact);
 const actor=createRiggedMaruko();scene.add(actor.root);
 let glbRoot=null,source='editable',view='quarter',half=.81,pose='neutral',amount=1,frames=0,helper=null,loadToken=0;
 const current=()=>source==='glb'?glbRoot:actor.root;
 const eachSkeleton=(root,fn)=>{const all=new Set();root?.traverse(o=>{if(o.isSkinnedMesh)all.add(o.skeleton);});for(const skeleton of all)fn(skeleton);};
 function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h,fit=Math.max(half,.37/aspect);camera.left=-fit*aspect;camera.right=fit*aspect;camera.top=fit;camera.bottom=-fit;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
 function setView(name='quarter'){
  controls.enableDamping=false;controls.update();controls.enableDamping=true;view=name;
  const close=name==='face'||name==='side-face';half=close?.335:.81;
  const y=close?.956:.625,dir=({front:[0,0,6],quarter:[2.6,.35,6],side:[6,0,0],'left-side':[-6,0,0],back:[0,0,-6],face:[0,0,6],'side-face':[6,0,0]})[name]||[2.6,.35,6];
  controls.target.set(0,y,0);camera.position.copy(controls.target).add(new THREE.Vector3(...dir));camera.zoom=1;resize();controls.update();
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
 }
 function rebuildHelper(){
  if(helper){scene.remove(helper);helper.geometry.dispose();helper.material.dispose();}
  helper=new THREE.SkeletonHelper(current());helper.material.depthTest=false;helper.material.transparent=true;helper.material.opacity=.85;helper.renderOrder=10;helper.visible=document.querySelector('#show-bones').checked;scene.add(helper);
 }
 function syncSliders(){
  const bone=rigBones(current())[document.querySelector('#bone').value];
  for(const axis of ['x','y','z']){const value=Math.round(THREE.MathUtils.radToDeg(bone.rotation[axis]));document.querySelector('#r'+axis).value=value;document.querySelector('#r'+axis+'-value').textContent=value+'°';}
 }
 function setPose(name,value=1){
  pose=name;amount=value;setTestPose(current(),name,value);
  document.querySelector('#pose-caption').textContent=testPoses[name].label;
  document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',b.dataset.pose===name));
  document.querySelector('#strength').disabled=false;document.querySelector('#strength').value=Math.round(value*100);document.querySelector('#strength-value').textContent=Math.round(value*100)+'%';syncSliders();
 }
 async function setSource(next){
  const token=++loadToken,rotations=Object.fromEntries(Object.entries(rigBones(current())).map(([name,b])=>[name,b.quaternion.clone()]));
  if(next==='glb'&&!glbRoot){
   const {GLTFLoader}=await import('./tools/GLTFLoader.js');const data=await new GLTFLoader().loadAsync('./maruko-rigged.glb');
   if(token!==loadToken){disposeLoaded(data.scene);return;}glbRoot=data.scene;scene.add(glbRoot);
  }
  source=next;actor.root.visible=next==='editable';if(glbRoot)glbRoot.visible=next==='glb';
  for(const [name,bone] of Object.entries(rigBones(current())))if(rotations[name])bone.quaternion.copy(rotations[name]);refreshRig(current());
  document.querySelector('#source').textContent=next==='glb'?'返回可编辑骨骼版':'查看骨骼 GLB';document.querySelector('#source-status').textContent=next==='glb'?'正在查看：实际骨骼 GLB 回读':'正在查看：可编辑骨骼版';rebuildHelper();syncSliders();
 }
 function disposeLoaded(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [].concat(o.material))materials.add(m);}});eachSkeleton(root,s=>s.dispose());for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();}
 for(const [name,preset] of Object.entries(testPoses)){const button=document.createElement('button');button.dataset.pose=name;button.textContent=preset.label;button.onclick=()=>setPose(name,1);document.querySelector('#poses').append(button);}
 for(const item of boneGuide.filter(b=>b.control&&b.name!=='root')){const option=document.createElement('option');option.value=item.name;option.textContent=item.label;document.querySelector('#bone').append(option);}
 document.querySelector('#bone').value='left_forearm';document.querySelector('#bone').onchange=syncSliders;
 document.querySelector('#strength').oninput=e=>setPose(pose,Number(e.target.value)/100);
 document.querySelector('#show-bones').onchange=e=>helper.visible=e.target.checked;
 for(const axis of ['x','y','z'])document.querySelector('#r'+axis).oninput=e=>{
  const bone=rigBones(current())[document.querySelector('#bone').value];bone.rotation[axis]=THREE.MathUtils.degToRad(Number(e.target.value));refreshRig(current());pose='custom';document.querySelector('#pose-caption').textContent='单关节检查';document.querySelector('#strength').disabled=true;document.querySelectorAll('[data-pose]').forEach(b=>b.classList.remove('active'));syncSliders();
 };
 document.querySelector('#neutral').onclick=()=>setPose('neutral',1);
 document.querySelector('#source').onclick=()=>setSource(source==='editable'?'glb':'editable').catch(e=>{document.querySelector('#source-status').textContent='GLB 加载失败：'+e.message;console.error(e);});
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelector('#full').onclick=()=>setView('quarter');
 addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();setView('quarter');}});
 new ResizeObserver(resize).observe(stage);if(new URLSearchParams(location.search).has('clean'))document.body.classList.add('clean');
 rebuildHelper();setView(new URLSearchParams(location.search).get('view')||'quarter');setPose('neutral');
 function draw(){controls.update();renderer.render(scene,camera);frames++;requestAnimationFrame(draw);}draw();
 window.__marukoRig={get ready(){return frames>2;},actor,scene,camera,controls,renderer,createRiggedMaruko,setView,setPose,setSource,get displayedRoot(){return current();},get helper(){return helper;},inspect(){return {source,view,pose,amount,frames,bones:Object.keys(rigBones(current())).length,animations:0,camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom}};}};
}catch(e){document.querySelector('#fatal').hidden=false;document.querySelector('#fatal').textContent='骨骼预览启动失败：'+e.message;console.error(e);}
