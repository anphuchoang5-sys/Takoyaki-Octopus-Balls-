import * as THREE from 'three';
import { toon, tube, canvasMap } from '../world.js';

function part(geometry,material,parent,x=0,y=0,z=0,scale=null){
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);if(scale)mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function ball(r,mat,parent,x,y,z,scale){return part(new THREE.SphereGeometry(r,20,14),mat,parent,x,y,z,scale);}
function capsule(r,h,mat,parent,x,y,z){return part(new THREE.CapsuleGeometry(r,h,5,12),mat,parent,x,y,z);}
function joint(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}

export function createTraveler(){
  const root=new THREE.Group();root.name='traveler';
  const body=joint(root,0,0,0),skin=toon('#eec6a5',.12),hair=toon('#40352f'),coat=toon('#dfb550'),trim=toon('#9b783e'),pants=toon('#415661'),shoe=toon('#685949'),sole=toon('#d8cbaa'),cream=toon('#f0ddae'),ink=toon('#2c3336');
  const torso=ball(.27,coat,body,0,.98,0,[1,1.26,.77]);
  capsule(.21,.12,coat,body,0,.79,0).scale.set(1.11,1,.87);
  // The stitching, buttons and pockets make the small silhouette readable up close.
  tube([[0,.72,.19],[0,1.15,.185]],.008,trim,body);
  for(let y of [.81,.96,1.1])ball(.017,cream,body,.025,y,.207);
  for(let side of [-1,1]){const p=part(new THREE.BoxGeometry(.12,.1,.025),trim,body,side*.16,.85,.16);p.rotation.z=-side*.15;tube([[side*.1,.88,.184],[side*.21,.86,.166]],.007,cream,body);}
  capsule(.09,.12,skin,body,0,1.23,0);
  const head=joint(body,0,1.48,0);
  ball(.295,skin,head,0,0,0,[1,1.06,.91]);
  for(let side of [-1,1]){
    ball(.061,skin,head,side*.282,-.014,0,[.65,1,.7]);
    ball(.031,ink,head,side*.1,.015,.259,[.8,1.22,.42]);
    ball(.008,cream,head,side*.1-.006,.025,.271);
    ball(.038,toon('#d89d85',.14),head,side*.169,-.065,.226,[1,.38,.12]);
    tube([[side*.07,.096,.256],[side*.13,.104,.242]],.011,hair,head,true);
  }
  ball(.027,skin,head,0,-.033,.278,[.65,.7,.8]);
  tube([[-.035,-.099,.262],[0,-.111,.268],[.035,-.099,.262]],.007,trim,head,true);
  part(new THREE.SphereGeometry(.308,24,16,0,Math.PI*2,0,Math.PI*.51),hair,head,0,.035,-.015,[1,1,.98]);
  part(new THREE.SphereGeometry(.31,24,16,Math.PI,Math.PI,0,2.35),hair,head,0,.02,-.014,[1,1.03,.98]);
  for(let i=0;i<7;i++){
    const x=-.25+i*.075;const bang=ball(.085,hair,head,x,.115+Math.sin(i)*.015,.216,[.67,1.33,.6]);bang.rotation.z=(i-3)*-.15;
  }
  for(let side of [-1,1]){ball(.094,hair,head,side*.249,-.003,.06,[.67,1.6,.8]);ball(.08,hair,head,side*.23,-.105,-.08,[.7,1.1,.8]);}
  // A small linen collar and a soft hood; the hood rises in precipitation.
  const collar=part(new THREE.TorusGeometry(.122,.035,8,24),cream,body,0,1.23,.014);collar.rotation.x=Math.PI/2;
  const downHood=ball(.22,coat,body,0,1.15,-.16,[1,.38,.75]);
  const upHood=joint(body,0,1.48,-.025);
  part(new THREE.SphereGeometry(.337,24,16,Math.PI,Math.PI,0,Math.PI),coat,upHood,0,.015,0,[1,1.05,1]);
  part(new THREE.SphereGeometry(.337,24,10,0,Math.PI*2,0,.75),coat,upHood,0,.015,0,[1,1.05,1]);
  upHood.visible=false;
  // Soft backpack with flap, straps, a stitched patch and hanging zipper.
  ball(.2,toon('#63847d'),body,0,.99,-.225,[.91,1.17,.44]);
  ball(.17,toon('#78978b'),body,0,1.12,-.277,[1,.49,.39]);
  part(new THREE.BoxGeometry(.09,.06,.015),cream,body,0,.99,-.321);
  for(let side of [-1,1])tube([[side*.16,.8,-.14],[side*.23,1.03,-.03],[side*.17,1.22,-.10],[side*.12,1.14,-.27]],.019,toon('#53736d'),body,true);
  tube([[.14,1.02,-.29],[.17,.94,-.31],[.16,.89,-.31]],.009,trim,body);
  const arms=[],legs=[],knees=[];
  for(let side of [-1,1]){
    const arm=joint(body,side*.255,1.10,0);arm.rotation.z=side*.12;
    capsule(.075,.19,coat,arm,0,-.125,0);capsule(.067,.095,coat,arm,0,-.287,.015);
    capsule(.07,.027,trim,arm,0,-.355,.015);ball(.068,skin,arm,0,-.402,.018,[.77,1,.85]);arms.push(arm);
    const leg=joint(body,side*.112,.645,0);capsule(.087,.16,pants,leg,0,-.135,0);const knee=joint(leg,0,-.26,0);
    capsule(.075,.13,pants,knee,0,-.105,0);ball(.098,shoe,knee,0,-.245,.055,[.83,.78,1.5]);
    ball(.1,sole,knee,0,-.294,.06,[.87,.25,1.53]);
    for(let j=0;j<3;j++)tube([[-.044,-.202+j*.018,.102],[.044,-.202+j*.018,.102]],.005,cream,knee);
    legs.push(leg);knees.push(knee);
  }
  const shadowMap=canvasMap(128,128,c=>{const g=c.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'#162c3290');g.addColorStop(1,'#162c3200');c.fillStyle=g;c.fillRect(0,0,128,128);});
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.85),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;root.add(shadow);
  let phase=0,blend=0;
  function update(dt,time,speed,weather){
    const moving=speed>.06;const running=speed>3.25;blend=THREE.MathUtils.damp(blend,moving?1:0,12,dt);phase+=dt*(running?12.5:8.7)*(moving?1:0);
    const gait=Math.sin(phase),stride=running?.73:.48;
    legs.forEach((leg,i)=>{const sign=i===0?1:-1;leg.rotation.x=gait*stride*sign*blend;knees[i].rotation.x=Math.max(0,-gait*sign)*.52*blend;});
    arms.forEach((arm,i)=>{arm.rotation.x=gait*(running?.65:.36)*(i===0?-1:1)*blend;arm.rotation.z=(i===0?-1:1)*.12;});
    body.position.y=Math.abs(Math.sin(phase))*blend*(running?.055:.026)+Math.sin(time*2.1)*.008*(1-blend);
    body.rotation.z=Math.sin(phase)*.025*blend;torso.rotation.x=running?.08*blend:0;head.rotation.y=Math.sin(time*.7)*.055*(1-blend);
    upHood.visible=weather!=='clear';downHood.visible=!upHood.visible;
  }
  return {root,update,height:1.85,radius:.24,get gait(){return blend>.1?'walking':'idle';}};
}
