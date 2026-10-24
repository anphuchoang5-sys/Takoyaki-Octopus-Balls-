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
  let environment={time:'afternoon',weather:'clear'},demand={point:0,spot:0};
  const pointEntries=[],spotEntries=[],scale=new THREE.Vector3(),position=new THREE.Vector3(),center=new THREE.Vector3(),sunOffset=new THREE.Vector3();
  const pools=[['point',lamps,pointEntries],['spot',spots,spotEntries]];
  function setEnvironment(next){
    environment={...environment,...next};const p=PERIODS[environment.time],cloud=environment.weather==='clear'?1:.83;
    scene.background.set(p.sky);if(scene.fog)scene.fog.color.set(p.sky);
    sky.color.set(p.hemi);sky.groundColor.set(p.ground);sky.intensity=p.ambient;
    sun.color.set(p.sun);sun.intensity=p.power*cloud;fill.intensity=p.fill;
  }
  setEnvironment(environment);
  function update(target,distance){
    const instances=sceneView.getInstances().sort((a,b)=>a.asset.root.position.distanceToSquared(target)-b.asset.root.position.distanceToSquared(target));
    demand.point=0;demand.spot=0;
    function offer(asset,placement,d){
      if(!(d.intensity>0)||(d.type!=='point'&&d.type!=='spot'))return;
      const i=demand[d.type]++,entries=d.type==='point'?pointEntries:spotEntries,limit=d.type==='point'?lamps.length:spots.length;
      if(i>=limit)return;
      const entry=entries[i]??(entries[i]={});entry.asset=asset;entry.placement=placement;entry.d=d;
    }
    for(const {placement,asset}of instances){
      asset.root.updateWorldMatrix(true,false);
      // Descriptors remain live: an asset may animate them without changing the environment.
      const list=asset.getLightingDescriptors?.();
      if(list!=null){for(const d of list)offer(asset,placement,d);}
      else for(let i=0;i<(asset.previewLamps?.length||0);i++){
        const s=asset.previewLamps[i];offer(asset,placement,{id:`legacy-${i}`,type:asset.previewLampStyle==='downlight'?'spot':'point',color:s[0],intensity:s[1],distance:s[2],position:s.slice(3),target:[s[3],.4,s[5]]});
      }
    }
    pointEntries.length=Math.min(demand.point,lamps.length);spotEntries.length=Math.min(demand.spot,spots.length);
    for(const [type,pool,entries] of pools){
      pool.forEach((l,i)=>{
        const entry=entries[i];l.intensity=entry?.d.intensity||0;l.userData.instanceId=entry?.placement.id||null;l.userData.descriptorId=entry?.d.id;
        if(!entry){setShadow(l,false);return;}
        const {asset,d}=entry;l.color.set(d.color);l.distance=d.distance*asset.root.getWorldScale(scale).x;l.decay=d.decay??2;
        l.position.copy(asset.root.localToWorld(position.fromArray(d.position)));
        if(type==='spot'){
          l.target.position.copy(asset.root.localToWorld(position.fromArray(d.target)));
          l.angle=d.angle??Math.PI*.39;l.penumbra=d.penumbra??.8;setShadow(l,d.castShadow!==false);
          l.shadow.bias=d.shadowBias??-.0002;l.shadow.normalBias=d.shadowNormalBias??.012;
          const near=d.shadowNear??.06;if(l.shadow.camera.near!==near){l.shadow.camera.near=near;l.shadow.camera.updateProjectionMatrix();}
        }
      });
    }
    const span=THREE.MathUtils.clamp(distance*.6,11,100);center.set(Math.round(target.x),0,Math.round(target.z));
    sun.position.copy(center).add(sunOffset.fromArray(PERIODS[environment.time].position));sun.target.position.copy(center);
    Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});sun.shadow.camera.updateProjectionMatrix();
  }
  return{setEnvironment,update,invalidate(){sun.shadow.needsUpdate=true;},
    getInspection:()=>({environment:{...environment},pointLimit:10,downlightLimit:4,activeStoreLamps:lamps.filter(l=>l.intensity>0).length,activeDownlights:spots.filter(l=>l.intensity>0).length,demand:{...demand},
      assignments:pools.flatMap(([type,pool])=>pool.filter(l=>l.intensity>0).map(l=>({instanceId:l.userData.instanceId,id:l.userData.descriptorId,type,position:l.position.toArray(),target:type==='spot'?l.target.position.toArray():null,intensity:l.intensity}))),ambient:sky.intensity,sun:sun.intensity}),
    dispose(){pointEntries.length=spotEntries.length=0;root.removeFromParent();sun.shadow.dispose();spots.forEach(l=>l.shadow.dispose());}};
}
