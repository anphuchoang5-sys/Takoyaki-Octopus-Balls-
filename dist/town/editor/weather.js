import * as THREE from 'three';
import {createRainSurfaces} from './rain-surfaces.js';

const TOP = 22, SPEED = 25, SPLASH_SECONDS = .30, STRATA = 12;
const random = seed => { const n = Math.sin(seed*127.1+311.7)*43758.5453; return n-Math.floor(n); };

function splashGeometry() {
  const points = [], triangle = (a,b,c) => points.push(...a,...b,...c);
  // Broken expanding ring plus four small rising arcs, drawn on the hit surface normal.
  for (let i=0;i<24;i++) {
    if (i%6 === 0) continue;
    const a=i/24*Math.PI*2,b=(i+1)/24*Math.PI*2;
    const p=(t,r)=>[Math.cos(t)*r,0,Math.sin(t)*r];
    triangle(p(a,.78),p(a,1),p(b,1));triangle(p(a,.78),p(b,1),p(b,.78));
  }
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2, p=(r,y,side)=>[Math.cos(a)*r-Math.sin(a)*side,y,Math.sin(a)*r+Math.cos(a)*side];
    triangle(p(.35,0,-.09),p(.8,1,0),p(.35,0,.09));
  }
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  return geometry;
}

// One town clock supplied by the host; no private RAF/timer. Layout is read-only here.
export function createTownWeather({scene,state,sceneView,tileSize=14}) {
  const root = new THREE.Group(); root.name = '全镇统一降雨'; root.visible = false; scene.add(root);
  const surfaces = createRainSurfaces({state,sceneView,tileSize});
  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial({color:'#d1e6ee',transparent:true,opacity:.60,depthWrite:false});
  const rain = new THREE.LineSegments(lineGeometry,lineMaterial);rain.frustumCulled=false;root.add(rain);
  const splash = splashGeometry();
  const splashMaterial = new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{uTime:{value:0}},
    vertexShader:`
      attribute vec3 aPoint; attribute vec3 aNormal; attribute vec2 aTiming;
      uniform float uTime; varying float vAlpha;
      void main(){
        float age=mod(uTime+aTiming.x,aTiming.y+0.30)-aTiming.y;
        float t=clamp(age/0.30,0.0,1.0);
        vAlpha=step(0.0,age)*(1.0-t)*0.75;
        vec3 tangent=normalize(cross(aNormal,vec3(0.0,0.0,1.0)));
        vec3 bitangent=normalize(cross(tangent,aNormal));
        float radius=mix(0.055,0.25,t);
        vec3 point=aPoint+aNormal*(0.018+position.y*sin(t*3.14159)*0.16)
          +(tangent*position.x+bitangent*position.z)*radius;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.0);
      }`,
    fragmentShader:`varying float vAlpha;void main(){if(vAlpha<0.01)discard;gl_FragColor=vec4(0.72,0.87,0.91,vAlpha);}`});
  const splashes = new THREE.Mesh(splash,splashMaterial);splashes.frustumCulled=false;root.add(splashes);
  let weather='clear',elapsed=0,dirty=true,columns=[],positions=new Float32Array(),layoutRevision=0;

  function rebuild() {
    surfaces.rebuild();columns=[];
    const rows=state.getLayout().rows;
    for(let z=0;z<rows.length;z++)for(let x=rows[z].start;x<rows[z].start+rows[z].length;x++){
      for(let i=0;i<STRATA*STRATA;i++){
        const seed=(z*10+x)*STRATA*STRATA+i+1;
        const px=(x-5+(i%STRATA+.12+random(seed)*.76)/STRATA)*tileSize;
        const pz=(z-5+(Math.floor(i/STRATA)+.12+random(seed+90001)*.76)/STRATA)*tileSize;
        const hit=surfaces.sample(px,pz),fallTime=(TOP-hit.point[1])/SPEED;
        columns.push({...hit,fallTime,offset:random(seed+180001)*(fallTime+SPLASH_SECONDS)});
      }
    }
    positions=new Float32Array(columns.length*6);
    lineGeometry.dispose();lineGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    splash.dispose();
    splash.setAttribute('aPoint',new THREE.InstancedBufferAttribute(new Float32Array(columns.flatMap(c=>c.point)),3));
    splash.setAttribute('aNormal',new THREE.InstancedBufferAttribute(new Float32Array(columns.flatMap(c=>c.normal)),3));
    splash.setAttribute('aTiming',new THREE.InstancedBufferAttribute(new Float32Array(columns.flatMap(c=>[c.offset,c.fallTime])),2));
    splash.instanceCount=columns.length;dirty=false;layoutRevision++;
  }
  function phase(column) { return (elapsed+column.offset)%(column.fallTime+SPLASH_SECONDS); }
  function update(seconds) {
    if(!Number.isFinite(seconds)||seconds<0)throw new Error('天气累计秒数无效。');
    elapsed=seconds;splashMaterial.uniforms.uTime.value=seconds;
    if(weather!=='rain')return;
    if(dirty)rebuild();
    for(let i=0;i<columns.length;i++){
      const c=columns[i],age=phase(c),[x,y,z]=c.point,falling=age<c.fallTime;
      // The head never goes below the first contact; an impacted streak collapses.
      const head=falling?Math.max(y,TOP-age*SPEED):y,tail=falling?Math.min(TOP,head+.68):head;
      positions.set([x,head,z,x,tail,z],i*6);
    }
    lineGeometry.attributes.position.needsUpdate=true;
  }
  function setWeather(value) {
    if(!['clear','rain'].includes(value))return{ok:false,message:'本轮仅支持晴天和下雨。'};
    weather=value;sceneView.setEnvironment({weather:value});root.visible=value==='rain';
    update(elapsed);return{ok:true,value};
  }
  const unsubscribe=state.subscribe(()=>{dirty=true;if(weather==='rain')update(elapsed);});
  return {root,setWeather,update,
    sampleSurface(x,z){if(dirty){surfaces.rebuild();}return surfaces.sample(x,z);},
    getInspection(){return{weather,elapsedSeconds:elapsed,visible:root.visible,layoutRevision,columns:columns.length,
      falling:weather==='rain'?columns.filter(c=>phase(c)<c.fallTime).length:0,
      splashing:weather==='rain'?columns.filter(c=>phase(c)>=c.fallTime).length:0,surfaces:surfaces.getInspection()};},
    getRainSamples(){return columns.map((c,i)=>({...c,headY:positions[i*6+1],tailY:positions[i*6+4],splashing:weather==='rain'&&phase(c)>=c.fallTime}));},
    dispose(){unsubscribe();root.removeFromParent();lineGeometry.dispose();lineMaterial.dispose();splash.dispose();splashMaterial.dispose();surfaces.dispose();columns=[];}
  };
}
