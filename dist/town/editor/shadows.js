import * as THREE from 'three';
const materialFields=['visible','version','side','shadowSide','wireframe','wireframeLinewidth','linewidth','alphaTest','alphaToCoverage','clipShadows','clipIntersection','displacementScale','displacementBias'];
const lightFields=['angle','distance','decay'];
const cameraFields=['near','far','left','right','top','bottom','zoom','fov','aspect','filmGauge','filmOffset'];

// Compare exact depth-pass inputs, not elapsed time or an approximate camera threshold.
// The retained sequence is overwritten/truncated each frame; deleted resources are not owned here.
function snapshot(){
  const values=[];let at=0,changed=false,revision=0;
  return {begin(){at=0;changed=false;revision=0;},value(v){if(!Object.is(values[at],v)){values[at]=v;changed=true;revision++;}at++;},
    array(a){this.value(a.length);for(let i=0;i<a.length;i++)this.value(a[i]);},
    end(){if(at!==values.length)changed=true;values.length=at;return changed;},clear(){values.length=0;},size:()=>values.length,revision:()=>revision};
}

export function createShadowUpdates({scene,camera,renderer}){
  const casters=snapshot(),lights=new Map(),seenGeometry=new WeakMap(),seenMaterial=new WeakMap();
  const changedGeometry=new WeakMap(),changedMaterial=new WeakMap(),objects=new Map(),changedBounds=[];
  let epoch=0,dirty=true,volatile=false,frames=0,requestedMaps=0,lastMaps=0,casterCount=0;
  const base=THREE.Object3D.prototype;
  function attribute(a){
    casters.value(a);if(!a)return;
    casters.value(a.version);casters.value(a.count);casters.value(a.itemSize);casters.value(a.normalized);
    if(a.isInterleavedBufferAttribute){casters.value(a.data);casters.value(a.data.version);casters.value(a.offset);casters.value(a.data.stride);}
  }
  function sphere(s){casters.value(!!s);if(s){casters.value(s.center.x);casters.value(s.center.y);casters.value(s.center.z);casters.value(s.radius);}}
  function planes(list){casters.value(list?.length);if(list)for(const p of list){casters.value(p.normal.x);casters.value(p.normal.y);casters.value(p.normal.z);casters.value(p.constant);}}
  function texture(t){
    casters.value(t);if(!t)return;
    if(t.matrixAutoUpdate)t.updateMatrix();
    casters.value(t.version);casters.value(t.source?.version);casters.value(t.channel);casters.array(t.matrix.elements);
    casters.value(t.wrapS);casters.value(t.wrapT);casters.value(t.flipY);
    if(t.isVideoTexture||t.isRenderTargetTexture)volatile=true;
  }
  function geometry(g){
    casters.value(g);if(seenGeometry.get(g)===epoch)return;seenGeometry.set(g,epoch);
    const before=casters.revision();
    attribute(g.index);
    for(const name in g.attributes){casters.value(name);attribute(g.attributes[name]);}
    for(const name in g.morphAttributes){casters.value(name);for(const a of g.morphAttributes[name])attribute(a);}
    casters.value(g.morphTargetsRelative);casters.value(g.drawRange.start);casters.value(g.drawRange.count);
    casters.value(g.groups.length);for(const group of g.groups){casters.value(group.start);casters.value(group.count);casters.value(group.materialIndex);}
    sphere(g.boundingSphere);
    if(casters.revision()!==before)changedGeometry.set(g,epoch);
  }
  function material(m){
    casters.value(m);if(!m||seenMaterial.get(m)===epoch)return;seenMaterial.set(m,epoch);
    const before=casters.revision();
    // These are the source fields copied by three r180's getDepthMaterial().
    for(const key of materialFields)casters.value(m[key]);
    texture(m.map);texture(m.alphaMap);texture(m.displacementMap);planes(m.clippingPlanes);
    if(casters.revision()!==before)changedMaterial.set(m,epoch);
  }
  function worldBounds(object,target){
    // Match Three's shadow frustum test, including InstancedMesh bounds.
    if(!object.frustumCulled)return null;
    let bound;
    if(object.boundingSphere!==undefined){if(object.boundingSphere===null)object.computeBoundingSphere();bound=object.boundingSphere;}
    else{if(object.geometry.boundingSphere===null)object.geometry.computeBoundingSphere();bound=object.geometry.boundingSphere;}
    if(!bound)return null;
    target.copy(bound).applyMatrix4(object.matrixWorld);
    return Number.isFinite(target.radius)&&Number.isFinite(target.center.lengthSq())?target:null;
  }
  function visit(object){
    if(object.isLight&&object.castShadow&&object.shadow&&object.layers.test(camera.layers)){
      let record=lights.get(object);
      if(!record){record={state:snapshot(),epoch:0,auto:object.shadow.autoUpdate};lights.set(object,record);}
      record.epoch=epoch;
    }
    if(!object.layers.test(camera.layers)||!(object.isMesh||object.isLine||object.isPoints)||!(object.castShadow||(renderer.shadowMap.type===THREE.VSMShadowMap&&object.receiveShadow)))return;
    const before=casters.revision();
    casterCount++;casters.value(object);casters.array(object.matrixWorld.elements);casters.value(object.frustumCulled);
    geometry(object.geometry);
    const list=object.material;if(Array.isArray(list)){casters.value(list.length);for(const m of list)material(m);}else material(list);
    if(object.isInstancedMesh){casters.value(object.count);attribute(object.instanceMatrix);attribute(object.instanceColor);texture(object.morphTexture);sphere(object.boundingSphere);}
    if(object.morphTargetInfluences)casters.array(object.morphTargetInfluences);
    if(object.isSkinnedMesh||object.isBatchedMesh||object.customDepthMaterial||object.customDistanceMaterial||object.onBeforeShadow!==base.onBeforeShadow||object.onAfterShadow!==base.onAfterShadow)volatile=true;
    let record=objects.get(object);
    const sharedChanged=changedGeometry.get(object.geometry)===epoch||(Array.isArray(list)?list.some(m=>changedMaterial.get(m)===epoch):changedMaterial.get(list)===epoch);
    if(!record||casters.revision()!==before||sharedChanged){
      if(record){changedBounds.push(record.bound?record.previous.copy(record.bound):null);}
      else{record={current:new THREE.Sphere(),previous:new THREE.Sphere(),bound:null,epoch:0};objects.set(object,record);}
      record.bound=worldBounds(object,record.current);changedBounds.push(record.bound);
    }
    record.epoch=epoch;
  }
  function lightChanged(light,record){
    const s=record.state,shadow=light.shadow,c=shadow.camera;s.begin();
    s.array(light.matrixWorld.elements);if(light.target)s.array(light.target.matrixWorld.elements);
    for(const key of lightFields)s.value(light[key]);
    for(const key of cameraFields)s.value(c[key]);
    // Three updates the shadow camera/matrix inside the depth pass. Observe that
    // derived state on the following frame too, before declaring the map stable.
    s.array(c.projectionMatrix.elements);s.array(c.matrixWorld.elements);s.array(shadow.matrix.elements);
    s.array(c.up.toArray(lightUp));s.value(c.layers.mask);s.value(c.coordinateSystem);
    s.value(shadow.mapSize.x);s.value(shadow.mapSize.y);s.value(shadow.focus);s.value(shadow.aspect);s.value(shadow.radius);s.value(shadow.blurSamples);
    return s.end();
  }
  const lightUp=[0,0,0];
  function update(){
    // Must run after doors, decorations and asynchronous snow have applied their current transforms.
    scene.updateMatrixWorld();epoch++;frames++;volatile=false;casterCount=0;casters.begin();changedBounds.length=0;
    casters.value(camera.layers.mask);casters.value(renderer.shadowMap.type);casters.value(renderer.localClippingEnabled);planes(renderer.clippingPlanes);
    const globalChanged=casters.revision()>0;
    scene.traverseVisible(visit);
    casters.end();
    for(const [object,record]of objects)if(record.epoch!==epoch){changedBounds.push(record.bound);objects.delete(object);}
    const changed=globalChanged||dirty||volatile||renderer.shadowMap.needsUpdate;lastMaps=0;
    for(const [light,record]of lights){
      if(record.epoch!==epoch){light.shadow.autoUpdate=record.auto;record.state.clear();lights.delete(light);continue;}
      const ownChanged=lightChanged(light,record),s=light.shadow;
      // A moved/removed caster must invalidate its previous footprint too.
      // Point lights have several frusta; keep their conservative invalidation.
      const affected=changedBounds.length>0&&(light.isPointLight||changedBounds.some(bound=>!bound||s.getFrustum().intersectsSphere(bound)));
      s.autoUpdate=false;s.needsUpdate=!!(s.needsUpdate||changed||ownChanged||affected||!s.map);
      if(s.needsUpdate)lastMaps++;
    }
    renderer.shadowMap.needsUpdate=lastMaps>0;requestedMaps+=lastMaps;dirty=false;
  }
  return {update,invalidate(){dirty=true;},
    getInspection:()=>({frames,requestedMaps,lastMaps,casterCount,trackedLights:lights.size,retainedValues:casters.size(),volatile}),
    dispose(){casters.clear();objects.clear();changedBounds.length=0;for(const [light,r]of lights){light.shadow.autoUpdate=r.auto;r.state.clear();}lights.clear();}};
}
