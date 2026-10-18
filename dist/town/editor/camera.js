import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export function createEditorCamera({canvas,state,sceneView}) {
  const camera=new THREE.PerspectiveCamera(36,1,.08,700), controls=new OrbitControls(camera,canvas);
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.PAN};
  controls.enableDamping=true; controls.dampingFactor=.085; controls.rotateSpeed=.65; controls.zoomSpeed=.8; controls.panSpeed=.7;
  controls.minDistance=3.8; controls.maxDistance=500; controls.minPolarAngle=.12; controls.maxPolarAngle=Math.PI*.475; controls.screenSpacePanning=false;
  let flight=null,focusedId=null,editing=false,interacting=false,lastMotion=-Infinity;
  const markMotion=()=>{lastMotion=performance.now();};
  const isBusy=()=>interacting||!!flight||performance.now()-lastMotion<160;
  function fly(position,target,immediate=false) {
    controls.update();
    if(immediate) { camera.position.copy(position); controls.target.copy(target); controls.update(); flight=null; }
    else flight={from:camera.position.clone(),fromTarget:controls.target.clone(),to:position.clone(),target:target.clone(),elapsed:0};
  }
  function overview({immediate=false,top=false}={}) {
    focusedId=null;
    const layout=state.getLayout(); let minX=10,maxX=-1,minZ=10,maxZ=-1;
    layout.rows.forEach((r,z)=>{if(r.length){minX=Math.min(minX,r.start);maxX=Math.max(maxX,r.start+r.length-1);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}});
    if(maxX<0){minX=2;maxX=7;minZ=2;maxZ=7;}
    const target=new THREE.Vector3(((minX+maxX)/2-4.5)*14,0,((minZ+maxZ)/2-4.5)*14);
    const direction=top?new THREE.Vector3(0,1,.001):new THREE.Vector3(.78,1.10,1.36).normalize();
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right).normalize(),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    let distance=20;
    for(const x of [(minX-5)*14,(maxX-4)*14]) for(const z of [(minZ-5)*14,(maxZ-4)*14]) {
      const offset=new THREE.Vector3(x,0,z).sub(target),depth=offset.dot(direction);
      distance=Math.max(distance,depth+Math.abs(offset.dot(up))/(tan*.78),depth+Math.abs(offset.dot(right))/(tan*camera.aspect*.82));
    }
    fly(target.clone().addScaledVector(direction,distance),target,immediate);
  }
  function focus(id,{immediate=false}={}) {
    const entry=sceneView.getInstances().find(e=>e.placement.id===id); if(!entry)return false;
    focusedId=id;
    const target=entry.asset.root.localToWorld(new THREE.Vector3(...(entry.asset.focus?.target||[0,1.8,0])));
    const angle=entry.placement.rotation*Math.PI/180;
    const direction=new THREE.Vector3(...(entry.asset.focus?.direction||[.7,.55,1.3])).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),angle);
    fly(target.clone().addScaledVector(direction,entry.asset.focus?.distance||21),target,immediate); return true;
  }
  const startInteraction=()=>{flight=null;interacting=true;markMotion();};
  const endInteraction=()=>{interacting=false;markMotion();};
  controls.addEventListener('start',startInteraction);controls.addEventListener('end',endInteraction);controls.addEventListener('change',markMotion);
  return {
    camera,controls,overview,focus,isBusy,
    setEditing(enabled) {
      if(editing===!!enabled)return;editing=!!enabled;
      controls.mouseButtons.LEFT=editing?null:THREE.MOUSE.ROTATE;
      controls.mouseButtons.RIGHT=editing?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;
      markMotion();
    },
    resize(width,height) { camera.aspect=width/height;camera.updateProjectionMatrix();markMotion(); },
    update(dt) {
      if(flight){flight.elapsed+=dt;const t=Math.min(1,flight.elapsed/.65),ease=t*t*(3-2*t);
        camera.position.lerpVectors(flight.from,flight.to,ease);controls.target.lerpVectors(flight.fromTarget,flight.target,ease); if(t===1)flight=null;}
      controls.update();
      const old=controls.target.clone();controls.target.x=THREE.MathUtils.clamp(controls.target.x,-85,85);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-85,85);controls.target.y=THREE.MathUtils.clamp(controls.target.y,.1,6);camera.position.add(controls.target.clone().sub(old));
      // Preserve depth precision for the thin road paint when viewing a whole 10x10 map.
      const distance=camera.position.distanceTo(controls.target);
      camera.near=Math.max(.08,distance*.01);camera.far=Math.max(250,distance+240);camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    },
    getInspection(){return {position:camera.position.toArray(),target:controls.target.toArray(),distance:camera.position.distanceTo(controls.target),focusedId,flying:!!flight,editing,interacting,busy:isBusy()};},
    dispose(){controls.removeEventListener('start',startInteraction);controls.removeEventListener('end',endInteraction);controls.removeEventListener('change',markMotion);controls.dispose();}
  };
}
