import * as THREE from 'three';

// Preview host only. D keeps ownership of the unified environment when reusing scene.js.
// These positions reproduce the original convenience store lamps, including its (.6,0,1.6) prefab offset.
const STORE_LIGHTS=[['#ffc379',12,7,-.9,2.5,-.1],['#ffd79b',8,5,2.5,2.35,1.8],['#bfe8d9',4,4,-1.5,1.9,-2.2],['#ffbe71',6,6,.3,2.65,3.6]];
export function createPreviewLighting(scene,sceneView) {
  const root=new THREE.Group();root.name='preview-daylight';scene.add(root);
  const sky=new THREE.HemisphereLight('#e4edff','#777447',1.45);root.add(sky);
  const sun=new THREE.DirectionalLight('#fff0d1',2.25);sun.position.set(-35,65,30);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00012;sun.shadow.normalBias=.025;sun.shadow.radius=3;
  Object.assign(sun.shadow.camera,{near:1,far:180,left:-65,right:65,top:65,bottom:-65});root.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#c3d7e7',.45);fill.position.set(20,14,-20);root.add(fill);
  const lamps=Array.from({length:10},()=>{const l=new THREE.PointLight('#ffcf8e',0,7,2);root.add(l);return l;});
  let shadowKey='';
  return {
    update(target,distance) {
      // Fixed pool prevents an unbounded shader light count when many copies are placed.
      const stores=sceneView.getInstances().filter(e=>e.placement.assetId==='convenience').sort((a,b)=>a.asset.root.position.distanceToSquared(target)-b.asset.root.position.distanceToSquared(target)).slice(0,2);
      lamps.forEach((l,i)=>{const store=stores[Math.floor(i/5)],spec=(store?.asset.previewLamps||STORE_LIGHTS)[i%5]; l.intensity=store&&spec?spec[1]:0;
        if(store&&spec){l.color.set(spec[0]);l.distance=spec[2]*store.asset.root.scale.x;l.position.copy(store.asset.root.localToWorld(new THREE.Vector3(spec[3],spec[4],spec[5])));}});
      const span=THREE.MathUtils.clamp(distance*.6,11,100),center=new THREE.Vector3(Math.round(target.x),0,Math.round(target.z));
      const key=`${center.x},${center.z},${Math.round(span)}`;
      if(key!==shadowKey){shadowKey=key;sun.position.copy(center).add(new THREE.Vector3(-35,65,30));sun.target.position.copy(center);
        Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;}
    },
    invalidate(){sun.shadow.needsUpdate=true;},
    getInspection(){return {shadowMap:2048,activeStoreLamps:lamps.filter(l=>l.intensity>0).length};},
    dispose(){root.removeFromParent();sun.shadow.map?.dispose();}
  };
}
