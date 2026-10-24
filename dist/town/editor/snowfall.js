import * as THREE from 'three';
const random=s=>{const n=Math.sin(s*127.1+311.7)*43758.5453;return n-Math.floor(n);};
function flakeGeometry(){
  const p=[];
  function bar(ax,ay,bx,by,width){
    const length=Math.hypot(bx-ax,by-ay),dx=-(by-ay)/length*width,dy=(bx-ax)/length*width;
    p.push(ax+dx,ay+dy,0,ax-dx,ay-dy,0,bx-dx,by-dy,0,ax+dx,ay+dy,0,bx-dx,by-dy,0,bx+dx,by+dy,0);
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a);bar(0,0,c,s,.045);
    for(const side of [-1,1])bar(c*.57,s*.57,c*.79-s*.22*side,s*.79+c*.22*side,.032);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}
// Host supplied elapsed time. The first contact ends this flake's current fall.
export function createSnowfall(scene,{surfaces,state,tileSize=14}){
  const geometry=flakeGeometry(),material=new THREE.MeshBasicMaterial({color:'#f4f9ff',transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide});
  let mesh=null,flakes=[],visible=false,samples=[],generation=0;
  const dummy=new THREE.Object3D();
  const contact={point:[0,0,0],normal:[0,0,0],instanceId:null,assetId:null,surface:null};
  function rebuild(){
    if(mesh)mesh.removeFromParent();flakes=[];
    const rows=state.getLayout().rows;
    for(let z=0;z<10;z++)for(let x=rows[z].start;x<rows[z].start+rows[z].length;x++)for(let i=0;i<96;i++){
      const seed=(z*10+x)*96+i+1;
      flakes.push({x:(x-5+random(seed))*tileSize,z:(z-5+random(seed+70001))*tileSize,
        speed:.9+random(seed+130001)*.65,phase:random(seed+180001)*40,size:.07+random(seed+220001)*.13,seed,cycle:-1,landed:false});
    }
    mesh?.dispose();mesh=new THREE.InstancedMesh(geometry,material,flakes.length);mesh.name='全镇六角飘雪';mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.visible=visible;scene.add(mesh);generation++;
  }
  function update(seconds){
    if(!visible||!mesh)return;samples=[];
    for(let i=0;i<flakes.length;i++){
      const f=flakes[i],duration=24/f.speed,age=(seconds+f.phase)%duration,cycle=Math.floor((seconds+f.phase)/duration);
      if(cycle!==f.cycle){f.cycle=cycle;f.landed=false;}
      const x=f.x+Math.sin(seconds*.67+f.seed)*.28,z=f.z+Math.sin(seconds*.43+f.seed*.7)*.20,y=22-age*f.speed;
      // Contact already ended this fall. Keep the inspected samples current;
      // other hidden flakes cannot become visible again until their next cycle.
      const hit=(!f.landed||i%7===0)?surfaces.sampleInto(x,z,contact):null;
      if(!f.landed&&(!hit||y-f.size<=hit.point[1]))f.landed=true;
      dummy.position.set(x,y,z);dummy.rotation.set(.45+Math.sin(f.seed)*.5,seconds*.25+f.seed,seconds*.15+f.seed*.4);
      dummy.scale.setScalar(f.landed?0:f.size);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      if(i%7===0)samples.push({x,y,z,size:f.size,visible:!f.landed,hitY:hit?.point[1]??null,surface:hit?.surface});
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  return {rebuild,update,setVisible(value){visible=value;if(mesh)mesh.visible=value;},
    getInspection:()=>({visible,count:flakes.length,generation,samples}),
    dispose(){mesh?.removeFromParent();mesh?.dispose();geometry.dispose();material.dispose();flakes=[];}};
}
