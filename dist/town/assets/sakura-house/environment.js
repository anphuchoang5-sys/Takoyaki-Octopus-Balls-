import * as THREE from 'three';

// One controller per asset; the caller supplies the town state and elapsed seconds.
// No renderer, timer, global light or shared material is mutated here.
export function createEnvironment(root,{lampMouth}){
  const times=['morning','afternoon','dusk','night'];
  const weathers=['clear','rain','hail','wind','leaves'];
  const materials=new Set(),geometries=new Set(),base=[];
  root.traverse(o=>{if(o.material?.color&&!base.some(b=>b.material===o.material))base.push({material:o.material,color:o.material.color.clone(),hex:o.material.color.getHexString()});});
  const effects=new THREE.Group();effects.name='樱家外部环境响应';root.add(effects);
  const night=new THREE.Group();night.name='灯泡、梯形光束与地面圆光';effects.add(night);
  const rain=new THREE.Group();rain.name='屋檐聚水、落滴与落地涟漪';effects.add(rain);
  function material(options){const m=new THREE.MeshBasicMaterial({toneMapped:false,...options});materials.add(m);return m;}
  function mesh(g,m,parent){geometries.add(g);const o=new THREE.Mesh(g,m);parent.add(o);return o;}
  // Clip the light at the plot boundary instead of squeezing its natural spread.
  // Source positions are already in the asset's local space; rotations follow root.
  function clipLightToPlot(source,closeCuts=false){
    const p=source.attributes.position,index=source.index,count=index?.count||p.count,out=[];
    for(let i=0;i<count;i+=3){
      let polygon=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).toArray());
      for(const axis of [0,2])for(const side of [-1,1]){
        const limit=side*7,next=[];
        for(let j=0;j<polygon.length;j++){
          const a=polygon[j],b=polygon[(j+1)%polygon.length],insideA=(a[axis]-limit)*side<=0,insideB=(b[axis]-limit)*side<=0;
          if(insideA)next.push(a);
          if(insideA!==insideB){const t=(limit-a[axis])/(b[axis]-a[axis]);next.push(a.map((v,k)=>v+(b[k]-v)*t));}
        }
        polygon=next;
      }
      for(let j=1;j<polygon.length-1;j++)out.push(...polygon[0],...polygon[j],...polygon[j+1]);
    }
    if(closeCuts)for(const axis of [0,2])for(const side of [-1,1]){
      const points=new Map();for(let i=0;i<out.length;i+=3)if(Math.abs(out[i+axis]-side*7)<1e-6){const v=new THREE.Vector3(...out.slice(i,i+3));points.set(v.toArray().map(n=>n.toFixed(6)).join(','),v);}
      const rim=[...points.values()];if(rim.length<3)continue;
      const center=rim.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).divideScalar(rim.length),axes=axis===0?['y','z']:['x','y'];
      rim.sort((a,b)=>Math.atan2(a[axes[1]]-center[axes[1]],a[axes[0]]-center[axes[0]])-Math.atan2(b[axes[1]]-center[axes[1]],b[axes[0]]-center[axes[0]]));
      for(let i=0;i<rim.length;i++){const a=rim[i],b=rim[(i+1)%rim.length],normal=a.clone().sub(center).cross(b.clone().sub(center));if(normal.lengthSq()<1e-14)continue;if(normal.getComponent(axis)*side>0)out.push(...center,...a,...b);else out.push(...center,...b,...a);}
    }
    source.dispose();const clipped=new THREE.BufferGeometry();clipped.setAttribute('position',new THREE.Float32BufferAttribute(out,3));clipped.computeVertexNormals();return clipped;
  }
  const bulbMaterial=material({color:'#fffbd7'});
  const bulb=mesh(new THREE.SphereGeometry(.073,12,8),bulbMaterial,effects);
  bulb.name='灯罩中央灯泡';bulb.position.set(-6.42,4.515,-.768);bulb.scale.set(1,1.25,1);
  const halo=mesh(new THREE.SphereGeometry(.14,16,12),material({color:'#fff5ad',transparent:true,opacity:.14,depthWrite:false}),night);
  halo.position.copy(bulb.position);
  // A circular frustum presents the requested trapezoid from every viewing angle.
  // Project the actual shade opening normal to the ground: its aim determines
  // both the rightward beam tilt and the circular footprint, without a guessed offset.
  const origin=lampMouth.center,aim=lampMouth.axisX.clone().cross(lampMouth.axisZ).normalize();
  const foot=origin.clone().addScaledVector(aim,(.091-origin.y)/aim.y),poolRadius=1.6,poolReach=1.6;
  const beamGeometry=new THREE.BufferGeometry(),vertices=[],indices=[];
  for(let j=0;j<2;j++)for(let i=0;i<32;i++){
    const a=i*Math.PI*2/32;
    // The upper ellipse is taken from the full tilted shade opening, not the bulb.
    // Broaden both sides in the direction of the inclined beam. The ground
    // footprint stretches with this spread; the approved central aim stays fixed.
    const p=j?new THREE.Vector3(foot.x+Math.cos(a)*poolRadius,foot.y,foot.z+Math.sin(a)*poolReach):origin.clone().addScaledVector(lampMouth.axisX,Math.cos(a)*lampMouth.radiusX).addScaledVector(lampMouth.axisZ,Math.sin(a)*lampMouth.radiusZ);
    vertices.push(p.x,p.y,p.z);
  }
  for(let i=0;i<32;i++){const n=(i+1)%32;indices.push(i,n,32+n,i,32+n,32+i);}
  for(let i=1;i<31;i++){indices.push(0,i+1,i,32,32+i,33+i);}
  beamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));beamGeometry.setIndex(indices);beamGeometry.computeVertexNormals();
  const beam=mesh(clipLightToPlot(beamGeometry,true),material({color:'#fff2af',transparent:true,opacity:.22,side:THREE.FrontSide,depthWrite:false}),night);
  beam.name='向下展开的动画式光束';beam.renderOrder=2;
  beam.userData.mouth={width:lampMouth.radiusX*2,depth:lampMouth.radiusZ*2,center:origin.toArray(),axisX:lampMouth.axisX.toArray(),axisZ:lampMouth.axisZ.toArray(),aim:aim.toArray(),foot:foot.toArray(),poolRadius,poolReach};
  const poolMaterial=material({color:'#ffed9e',transparent:true,opacity:.48,depthWrite:false});
  const pool=mesh(clipLightToPlot(new THREE.CircleGeometry(poolRadius,48).rotateX(-Math.PI/2).translate(foot.x,foot.y,foot.z)),poolMaterial,night);pool.name='地面圆形光斑';pool.renderOrder=1;
  const core=mesh(clipLightToPlot(new THREE.CircleGeometry(1.1,40).rotateX(-Math.PI/2).translate(foot.x,foot.y+.002,foot.z)),material({color:'#fff7c0',transparent:true,opacity:.18,depthWrite:false}),night);core.renderOrder=1;
  // Subtle warm spill at the entry, lying above the solid step.
  const entry=mesh(new THREE.PlaneGeometry(1.35,.56),material({color:'#ffe7a0',transparent:true,opacity:.23,depthWrite:false}),night);
  entry.rotation.x=-Math.PI/2;entry.position.set(-3.3,.358,2.95);

  const anchors=[];
  function anchor(x,y,z,ground=.071){anchors.push({x,y,z,ground});}
  for(const x of [-5.05,-4.5,-1.95,-1.3,-.65,0,3.32,4.08])anchor(x,2.91,3.305);
  for(let i=0;i<13;i++)anchor(-5.04+i*.744,2.91,-4.105);
  for(const x of [-3.95,-3.52,-3.08,-2.65])anchor(x,2.75,3.315,.198);
  for(const x of [.82,1.4,1.98,2.56])anchor(x,2.615,3.315);
  for(let i=0;i<8;i++)anchor(-5.315,2.62,-1.96+i*.54);
  for(let i=0;i<7;i++)anchor(6.09,2.71,-2.65+i*.83);
  const water=material({color:'#beddf6',transparent:true,opacity:.86,depthWrite:false});
  function instances(g,m,count){geometries.add(g);const o=new THREE.InstancedMesh(g,m,count);o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.frustumCulled=false;rain.add(o);return o;}
  const beads=instances(new THREE.SphereGeometry(1,8,6),water,anchors.length);
  beads.name='檐口逐渐变大的水珠';
  const drops=instances(new THREE.SphereGeometry(1,8,6),water,anchors.length);drops.name='脱离檐口的落滴';
  const splashGeometry=new THREE.TorusGeometry(1,.065,4,16);splashGeometry.rotateX(Math.PI/2);
  const splashes=instances(splashGeometry,material({color:'#b1d8ee',transparent:true,opacity:.53,depthWrite:false}),anchors.length);splashes.name='落点小涟漪';
  const dummy=new THREE.Object3D(),sample=[];
  let state={time:'afternoon',weather:'clear'},elapsed=0,disposed=false;
  function place(batch,i,x,y,z,sx,sy,sz){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);}
  function update(seconds){
    if(disposed)return;
    if(!Number.isFinite(seconds)||seconds<0)throw new Error('樱家需要非负的外部 elapsedSeconds。');
    elapsed=seconds;if(!rain.visible)return;
    sample.length=0;
    anchors.forEach((a,i)=>{
      const fallTime=Math.sqrt(2*(a.y-a.ground)/9.8),period=1.24+fallTime+(i%4)*.11;
      const phase=(seconds+i*.367)%period,grow=Math.min(phase/.88,1);
      const falling=phase>=.88&&phase<.88+fallTime,impact=phase-.88-fallTime;
      const radius=phase<.88?.012+.03*grow: .008;
      place(beads,i,a.x,a.y-radius*.9,a.z,radius,radius*(.7+grow*.8),radius);
      const t=phase-.88,y=falling?a.y-4.9*t*t:a.ground;
      const sy=falling?.05+Math.min(.06,t*.1):0;
      place(drops,i,a.x,y,a.z,falling?.023:0,sy,falling?.023:0);
      const splash=impact>=0&&impact<.23,progress=impact/.23,spread=splash?.035+progress*.13:0;
      place(splashes,i,a.x,a.ground+.005,a.z,spread,splash?.5*(1-progress):0,spread);
      if(i<8)sample.push({index:i,phase:Number(phase.toFixed(3)),beadRadius:radius,falling,y,splash});
    });
    for(const batch of [beads,drops,splashes]){batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();}
  }
  function setEnvironment(next={}){
    if(disposed)return;
    const value={time:next.time??state.time,weather:next.weather??state.weather};
    if(!times.includes(value.time)||!weathers.includes(value.weather))throw new Error('樱家环境值无效，保留现有状态。');
    state=value;
    const isNight=state.time==='night',isDusk=state.time==='dusk';
    night.visible=isNight||isDusk;rain.visible=state.weather==='rain';
    const tint=new THREE.Color(isNight?'#667fae':isDusk?'#e6b99e':state.time==='morning'?'#fff1d9':'#ffffff');
    if(rain.visible)tint.multiply(new THREE.Color(isNight?'#dbe4f6':'#ccd9eb'));
    for(const {material:m,color,hex}of base){
      m.color.copy(color).multiply(tint);
      if(['2633cf','354be8','242966'].includes(hex)&&night.visible)m.color.set(hex==='2633cf'?'#ffdb89':hex==='354be8'?'#f2bc65':'#b68c50');
      if(hex==='fff2b0'&&night.visible)m.color.set('#fff4bb');
    }
    bulbMaterial.color.set(night.visible?'#fffde8':'#e9e5bb');
    beam.material.opacity=isNight?.22:.11;poolMaterial.opacity=isNight?.5:.26;
    water.color.set(isNight?'#a9c9f0':'#beddf6');update(elapsed);
    return inspect();
  }
  function inspect(){return {...state,elapsedSeconds:elapsed,lightsOn:night.visible,rainOn:rain.visible,dripSources:anchors.length,unsupportedWeatherEffect:!['clear','rain'].includes(state.weather),samples:sample.map(s=>({...s}))};}
  // Initialise even the hidden rain buffers so bounds never include unit spheres at origin.
  update(0);setEnvironment();
  return {setEnvironment,update,inspect,dispose(){if(disposed)return;disposed=true;effects.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
