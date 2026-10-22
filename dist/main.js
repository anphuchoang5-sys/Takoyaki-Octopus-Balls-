import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createEditorState} from './town/editor/state.js';
import {ASSETS,PENDING_BUILDINGS,assetIds,createAsset,TILE_SIZE} from './town/editor/catalog.js';
import {createEditorScene,renderThumbnails,cellToWorld} from './town/editor/scene.js';
import {readSavedLayout,connectAutosave} from './town/editor/persistence.js';
import {createRuntimeBridge} from './town/editor/runtime.js';
import {createEditorCamera} from './town/editor/camera.js';
import {createPreviewLighting} from './town/editor/lighting.js';
import {mountEditorUI} from './town/editor/ui.js';
import {createTownWeather} from './town/editor/weather.js';
import {createEnvironmentState} from './town/editor/environment.js';
import {createTownDocument} from './town/editor/document.js';
import {REVIEW_STORAGE_KEY,REVIEW_TOWN} from './editor-preview/snow-review.js';

try {
  const styleResponse=await fetch(new URL('./town/editor/editor.css',import.meta.url));
  if(!styleResponse.ok)throw new Error('无法加载编辑器样式');
  const style=document.createElement('style');style.textContent=await styleResponse.text();document.head.append(style);
  const reviewMode=new URLSearchParams(location.search).get('review')==='snow';
  const storage={getItem:key=>reviewMode?(localStorage.getItem(REVIEW_STORAGE_KEY)??JSON.stringify(REVIEW_TOWN)):localStorage.getItem(key),
    setItem:(key,value)=>localStorage.setItem(reviewMode?REVIEW_STORAGE_KEY:key,value)};
  const saved=readSavedLayout(storage,assetIds),state=createEditorState({assetIds,initial:saved.layout}),runtime=createRuntimeBridge();
  const environment=createEnvironmentState(saved.environment),townDocument=createTownDocument({state,environment,assetIds,onApplied:()=>autosave.save()});
  const sceneView=createEditorScene({state,createAsset,tileSize:TILE_SIZE});
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d9e3da');scene.fog=new THREE.Fog('#d9e3da',180,430);scene.add(sceneView.root);
  const weather=createTownWeather({scene,state,sceneView,tileSize:TILE_SIZE});
  const setPrecipitation=weather.setWeather;

  const canvas=document.createElement('canvas');canvas.id='editor-world';canvas.tabIndex=0;
  // Scene edges use the four-sample offscreen target below. The output canvas
  // only receives a full-screen pass, so a second MSAA buffer adds no detail.
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.info.autoReset=false;
  const cameraRig=createEditorCamera({canvas,state,sceneView}),camera=cameraRig.camera;
  const lighting=createPreviewLighting(scene,sceneView);
  let environmentDirty=false;
  function applyEnvironment(next,previous={}){
    sceneView.setEnvironment(next);
    if(next.time!==previous.time||next.weather!==previous.weather){lighting.setEnvironment(next);setPrecipitation(next.weather);runtime.syncEnvironment(next);}
    environmentDirty=true;
  }
  const stopEnvironment=environment.subscribe(applyEnvironment);applyEnvironment(environment.get());
  weather.setWeather=value=>{try{environment.set({weather:value});return{ok:true,value};}catch(error){return{ok:false,message:error.message};}};
  runtime.connect({setTime(value){environment.set({time:value});return{ok:true,value};},setWeather(value){environment.set({weather:value});return{ok:true,value};}});

  // A neutral stage below the island catches its shadow; it is never valid map terrain.
  const stage=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#bbc8b6',roughness:1}));
  stage.rotation.x=-Math.PI/2;stage.position.y=-1.04;stage.receiveShadow=true;scene.add(stage);
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples)});
  const composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.13,.35,1.2));composer.addPass(new OutputPass());
  const thumbnails=renderThumbnails(ASSETS,createAsset,TILE_SIZE);
  const ui=mountEditorUI({host:document.getElementById('editor'),canvas,camera,state,sceneView,assets:ASSETS,pendingBuildings:PENDING_BUILDINGS,thumbnails,runtime,documentAPI:townDocument,
    onOverview:options=>cameraRig.overview(options),onFocus:id=>cameraRig.focus(id),onEditingChange:enabled=>cameraRig.setEditing(enabled),isCameraBusy:()=>cameraRig.isBusy()});
  const autosave=connectAutosave(state,storage,{blocked:saved.blocked,serialize:townDocument.exportJSON,canSave:()=>!townDocument.applying,onStatus:result=>ui.setSaveStatus(result.message,!result.ok)});
  ui.setSaveStatus(saved.status,saved.blocked);
  if(reviewMode)document.getElementById('scene-hint').textContent='雪景审看 · 使用独立存档 · 建筑雪层为待美术接手的初稿';
  let lastSave=0;const flushSave=()=>{if(environmentDirty){autosave.save();environmentDirty=false;}};
  const visibility=()=>{last=performance.now();if(document.hidden)flushSave();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',flushSave);
  if(saved.blocked)ui.setRecovery({raw:saved.raw,replace:()=>autosave.replacePreservedSave()});
  const stopState=state.subscribe(()=>{lighting.invalidate();renderer.shadowMap.needsUpdate=true;});
  const stopRuntime=runtime.subscribe(event=>{cameraRig.controls.enabled=event.state.values.mode==='god'&&!event.state.pending.includes('mode');});
  let frames=0,stopped=false,frameId,last=performance.now(),time=0;
  function resize(){const rect=canvas.parentElement.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);composer.setSize(rect.width,rect.height);cameraRig.resize(rect.width,rect.height);}
  const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
  const first=state.getLayout().instances.find(p=>p.assetId==='convenience');
  if(first&&!reviewMode)cameraRig.focus(first.id,{immediate:true});else cameraRig.overview({immediate:true});
  function draw(now){if(stopped)return;const elapsedDt=Math.max(0,(now-last)/1000),dt=Math.min(.05,elapsedDt);last=now;
    if(!document.hidden){time+=elapsedDt;environment.advance(time);cameraRig.update(dt);sceneView.update(time);weather.update(time);lighting.update(cameraRig.controls.target,camera.position.distanceTo(cameraRig.controls.target));
      const viewDistance=camera.position.distanceTo(cameraRig.controls.target);scene.fog.near=viewDistance+80;scene.fog.far=viewDistance+280;
      // Door animation belongs to the original asset and responds to a close view at its entrance.
      const virtualVisitor=camera.position.clone();if(camera.position.distanceTo(cameraRig.controls.target)>15)virtualVisitor.set(9999,0,9999);
      for(const {asset}of sceneView.getInstances())asset.update?.(dt,virtualVisitor);
      renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();frames++;
      if(time-lastSave>=1){flushSave();lastSave=time;}
      const snowStatus=document.getElementById('snow-status');if(snowStatus)snowStatus.textContent=`积雪 ${Math.round(environment.get().snowAmount*100)}% · ${environment.get().weather==='snow'?'正在积雪':environment.get().snowAmount?'正在融雪':'无积雪'}`;}
    frameId=requestAnimationFrame(draw);
  }
  frameId=requestAnimationFrame(draw);
  window.townEditor=Object.freeze({state,sceneView,runtime,weather,environment,exportJSON:townDocument.exportJSON,importJSON:input=>{const result=townDocument.importJSON(input);autosave.save();return result;},root:sceneView.root,getLayout:state.getLayout,loadLayout:input=>state.loadLayout(input),onLayoutChange:listener=>state.subscribe(listener),
    connectRuntime:adapter=>runtime.connect(adapter),requestMode:mode=>runtime.request('mode',mode),setTime:value=>runtime.request('time',value),setWeather:value=>runtime.request('weather',value),
    setEditing:enabled=>ui.setEditing(enabled),focusInstance:id=>cameraRig.focus(id),showOverview:options=>cameraRig.overview(options),
    dispose(){stopped=true;flushSave();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',flushSave);stopEnvironment();townDocument.dispose();cancelAnimationFrame(frameId);observer.disconnect();stopState();stopRuntime();autosave.dispose();ui.dispose();cameraRig.dispose();lighting.dispose();weather.dispose();sceneView.dispose();stage.geometry.dispose();stage.material.dispose();for(const pass of composer.passes)pass.dispose?.();composer.dispose();renderer.dispose();}});
  function screenWorld(x,y,z){const v=new THREE.Vector3(x,y,z).project(camera),rect=canvas.getBoundingClientRect();return{x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};}
  window.__editor={environment,scene,camera,cameraRig,renderer,
    advanceEnvironment(seconds){time+=seconds;environment.advance(time);sceneView.update(time);weather.update(time);lighting.update(cameraRig.controls.target,camera.position.distanceTo(cameraRig.controls.target));},
    get ready(){return frames>2;},get inspection(){return{environment:environment.get(),frames,layout:state.getLayout(),scene:sceneView.getInspection(),selection:ui.getSelection(),runtime:runtime.getState(),weather:weather.getInspection(),camera:cameraRig.getInspection(),lighting:lighting.getInspection(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
    screenCell(x,z){const p=cellToWorld(x,z,TILE_SIZE);return screenWorld(p.x,.01,p.z);},screenWorld,
    modelStats(){return sceneView.getInstances().map(({placement,asset})=>{let vertices=0,meshes=0;const textures=new Set();asset.root.traverse(node=>{if(node.isMesh){meshes++;vertices+=node.geometry.attributes.position.count;for(const mat of Array.isArray(node.material)?node.material:[node.material])if(mat.map)textures.add(mat.map.uuid);}});return{id:placement.id,assetId:placement.assetId,vertices,meshes,textures:textures.size};});}};
}catch(error){const fatal=document.getElementById('fatal');fatal.hidden=false;fatal.textContent=`编辑器未能启动：${error.message}。已有存档不会在启动失败时被覆盖。`;console.error(error);}
