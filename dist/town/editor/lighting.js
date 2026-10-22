import * as THREE from 'three';
const PERIODS={
  morning:{sky:'#c9e6ed',hemi:'#dcecff',ground:'#818b72',ambient:1.5,sun:'#fff0d6',power:1.9,fill:.48,position:[-52,28,38]},
  afternoon:{sky:'#d9e3da',hemi:'#e4edff',ground:'#777447',ambient:1.45,sun:'#fff0d1',power:2.25,fill:.45,position:[-35,65,30]},
  dusk:{sky:'#b8a6b6',hemi:'#cec8e1',ground:'#77738a',ambient:1.1,sun:'#ffd2a4',power:1.05,fill:.4,position:[-62,16,25]},
  night:{sky:'#253d61',hemi:'#9eb9e5',ground:'#6b7999',ambient:.95,sun:'#adc5eb',power:.48,fill:.32,position:[-35,48,-30]}
};
// Fixed host pool. New descriptors take precedence over legacy preview data.
export function createPreviewLighting(scene,sceneView) {
  const root=new THREE.Group();root.name='town-lighting';scene.add(root);
  const sky=new THREE.HemisphereLight(),sun=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight('#c3d7e7');
  fill.position.set(20,14,-20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00012;sun.shadow.normalBias=.025;sun.shadow.radius=3;
  Object.assign(sun.shadow.camera,{near:1,far:220,left:-65,right:65,top:65,bottom:-65});root.add(sky,sun,sun.target,fill);
  const lamps=Array.from({length:10},()=>{const l=new THREE.PointLight('#ffcf8e',0,7,2);root.add(l);return l;});
  const spots=Array.from({length:4},()=>{const l=new THREE.SpotLight('#ffd8a6',0,4.3,Math.PI*.39,.8,1.5);l.shadow.mapSize.set(1024,1024);root.add(l,l.target);return l;});
  function setShadow(light,enabled){
    if(!enabled){
      light.castShadow=false;
      if(light.shadow){light.shadow.map?.dispose();light.shadow.mapPass?.dispose();light.shadow.map=null;light.shadow.mapPass=null;}
    }else if(!light.castShadow){light.castShadow=true;light.shadow.needsUpdate=true;}
  }
  let environment={time:'afternoon',weather:'clear'},demand={point:0,spot:0},assignments=[];
  function setEnvironment(next){
    environment={...environment,...next};const p=PERIODS[environment.time],cloud=environment.weather==='clear'?1:.83;
    scene.background.set(p.sky);if(scene.fog)scene.fog.color.set(p.sky);
    sky.color.set(p.hemi);sky.groundColor.set(p.ground);sky.intensity=p.ambient;
    sun.color.set(p.sun);sun.intensity=p.power*cloud;fill.intensity=p.fill;
  }
  setEnvironment(environment);
  function update(target,distance){
    const instances=sceneView.getInstances().slice().sort((a,b)=>a.asset.root.position.distanceToSquared(target)-b.asset.root.position.distanceToSquared(target));
    const descriptors=instances.flatMap(({placement,asset})=>{
      asset.root.updateWorldMatrix(true,false);
      const list=asset.getLightingDescriptors?.()??(asset.previewLamps||[]).map((s,i)=>({id:`legacy-${i}`,type:asset.previewLampStyle==='downlight'?'spot':'point',color:s[0],intensity:s[1],distance:s[2],position:s.slice(3),target:[s[3],.4,s[5]]}));
      return list.filter(d=>d.intensity>0).map(d=>({asset,placement,d}));
    });
    demand={point:descriptors.filter(e=>e.d.type==='point').length,spot:descriptors.filter(e=>e.d.type==='spot').length};assignments=[];
    for(const [type,pool] of [['point',lamps],['spot',spots]]){
      const entries=descriptors.filter(e=>e.d.type===type);
      pool.forEach((l,i)=>{
        const entry=entries[i];l.intensity=entry?.d.intensity||0;l.userData.instanceId=entry?.placement.id||null;
        if(!entry){setShadow(l,false);return;}
        const {asset,placement,d}=entry;l.color.set(d.color);l.distance=d.distance*asset.root.getWorldScale(new THREE.Vector3()).x;l.decay=d.decay??2;
        l.position.copy(asset.root.localToWorld(new THREE.Vector3(...d.position)));
        if(type==='spot'){
          l.target.position.copy(asset.root.localToWorld(new THREE.Vector3(...d.target)));
          l.angle=d.angle??Math.PI*.39;l.penumbra=d.penumbra??.8;setShadow(l,d.castShadow!==false);
          l.shadow.bias=d.shadowBias??-.0002;l.shadow.normalBias=d.shadowNormalBias??.012;l.shadow.camera.near=d.shadowNear??.06;
        }
        assignments.push({instanceId:placement.id,id:d.id,type,position:l.position.toArray(),target:type==='spot'?l.target.position.toArray():null,intensity:l.intensity});
      });
    }
    const span=THREE.MathUtils.clamp(distance*.6,11,100),center=new THREE.Vector3(Math.round(target.x),0,Math.round(target.z));
    sun.position.copy(center).add(new THREE.Vector3(...PERIODS[environment.time].position));sun.target.position.copy(center);
    Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();
  }
  return{setEnvironment,update,invalidate(){sun.shadow.needsUpdate=true;},
    getInspection:()=>({environment:{...environment},pointLimit:10,downlightLimit:4,activeStoreLamps:lamps.filter(l=>l.intensity>0).length,activeDownlights:spots.filter(l=>l.intensity>0).length,demand,assignments,ambient:sky.intensity,sun:sun.intensity}),
    dispose(){root.removeFromParent();sun.shadow.dispose();spots.forEach(l=>l.shadow.dispose());}};
}
