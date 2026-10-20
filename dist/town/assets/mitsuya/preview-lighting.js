import * as THREE from 'three';

// Preview HOST adapter. A town host should use its own bounded light pool instead.
// Never run this adapter and the town pool for the same building simultaneously.
export function createMitsuyaPreviewLighting(scene,assets){
  const group=new THREE.Group();group.name='mitsuya-preview-host-lights';scene.add(group);
  const entries=assets.map(asset=>({asset,lights:asset.getLightingDescriptors().map(spec=>{
    const light=new THREE.SpotLight();
    light.name=spec.id;group.add(light,light.target);
    light.shadow.mapSize.set(spec.shadowMapSize,spec.shadowMapSize);
    return light;
  })}));
  const scale=new THREE.Vector3();
  let disposed=false;
  function update(){
    if(disposed)return;
    for(const {asset,lights} of entries){
      asset.root.updateWorldMatrix(true,false);
      const specs=asset.getLightingDescriptors();
      let visible=true;for(let node=asset.root;node;node=node.parent)visible&&=node.visible;
      const multiplier=asset.root.getWorldScale(scale).x;
      lights.forEach((light,i)=>{
        const spec=specs[i];light.visible=visible&&!!spec;
        if(!spec)return;
        light.color.set(spec.color);light.intensity=spec.intensity;light.distance=spec.distance*multiplier;
        light.angle=spec.angle;light.penumbra=spec.penumbra;light.decay=spec.decay;
        light.castShadow=spec.castShadow;light.shadow.bias=spec.shadowBias;
        light.shadow.normalBias=spec.shadowNormalBias;light.shadow.camera.near=spec.shadowNear;
        light.position.fromArray(spec.position).applyMatrix4(asset.root.matrixWorld);
        light.target.position.fromArray(spec.target).applyMatrix4(asset.root.matrixWorld);
      });
    }
  }
  function inspect(){
    return entries.map(({asset,lights})=>({space:asset.space,state:asset.getEnvironment(),
      lights:lights.map(light=>({id:light.name,visible:light.visible,position:light.position.toArray(),
        target:light.target.position.toArray(),intensity:light.intensity,distance:light.distance,
        angle:light.angle,penumbra:light.penumbra,shadowReady:!!light.shadow.map}))}));
  }
  update();
  return {update,inspect,
    dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const {lights} of entries)for(const light of lights)light.dispose();group.clear();}};
}
