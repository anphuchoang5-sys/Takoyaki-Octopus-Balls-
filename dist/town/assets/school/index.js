import * as THREE from 'three';
import {createWorkshop} from './workshop.js';

export const specification=Object.freeze({
  id:'school',
  name:'小学校',
  revision:'preview-01',
  tileSize:28,
  plot:[28,28],
  footprint:[2,2],
  front:'+Z',
  placementRotations:[0,90,180,270],
  entry:{x:0,y:0,z:6.4,facing:'+Z',clearWalkWidth:5.0},
  notes:'2x2 exterior study from the user reference. Side, rear and interior are designed completion; not registered in the editor.'
});

const C={
  ground:'#9db07d',groundDark:'#7e8f6b',yard:'#e8c39e',street:'#b9bdb6',stone:'#d3cabb',
  wall:'#f5e7a6',wallLight:'#f7edb8',trim:'#ffffff',shadow:'#c9bd7d',foundation:'#b9b4a8',
  roof:'#d9d7ce',roofDark:'#b8b5ab',parapet:'#e8e4d8',rail:'#8a969c',
  window:'#5b8bc4',windowLight:'#9fcbe0',door:'#2f3f5e',
  wallBase:'#c8d3b5',wallCap:'#e8e3d4',gate:'#3b3e3e',brick:'#9e5a3f',
  green:'#4f8f3f',greenDark:'#2f6b35',greenLight:'#6aa84f',trunk:'#6b4a35',
  flower:'#d95c6a',yellow:'#e8b84a',white:'#fff4dc'
};

export function createModel(){
  const W=createWorkshop();
  const {root,group,box,ball,cylinder,beam,plane,solid,texture,face,batch,dispose}=W;
  const site=group('校园地面');
  const main=group('校舍主体');
  const facade=group('正立面与窗');
  const tower=group('中央钟楼');
  const roof=group('平屋顶与栏杆');
  const entrance=group('入口门廊');
  const gate=group('校门与围墙');
  const plants=group('绿篱与树');
  const windows=[];

  const glassMat=new THREE.MeshStandardMaterial({color:C.window,roughness:.32,metalness:.04,emissive:'#000000',emissiveIntensity:0});
  const clockMat=new THREE.MeshBasicMaterial({map:null,transparent:true,toneMapped:false,side:THREE.DoubleSide});
  const ringMat=new THREE.MeshBasicMaterial({color:'#3c3f43',side:THREE.DoubleSide,toneMapped:false});
  const extraMaterials=[glassMat,clockMat,ringMat];

  // --- ground -------------------------------------------------------------
  box(27.9,.24,27.9,0,-.02,0,C.groundDark,site,true);
  box(27.8,.05,27.8,0,.035,0,C.ground,site);
  box(27.9,.06,3.8,0,.075,11.95,C.street,site);
  box(27,.06,7,0,.075,6.5,C.yard,site);
  box(27,.04,.7,0,.08,9.65,C.green,site);
  box(28,.03,.16,0,.09,10.02,'#d8dad2',site);
  box(7.0,.12,.55,0,.06,5.55,C.stone,site,true);
  box(6.6,.12,.55,0,.12,5.95,C.stone,site,true);
  box(6.2,.12,.55,0,.18,6.35,C.stone,site,true);

  // --- main volume --------------------------------------------------------
  box(24,.5,7,0,.25,-.5,C.foundation,main,true);
  box(.3,8.3,7,-12,4.15,-.5,C.wall,main,true);
  box(.3,8.3,7,12,4.15,-.5,C.wall,main,true);
  box(24,8.3,.3,0,4.15,-4,C.wall,main,true);
  box(24.4,.16,7.4,0,8.28,-.5,C.trim,main,true);

  // side annex
  box(1.7,5.4,4.0,-12.85,2.7,.4,C.wall,main,true);
  box(1.9,.2,4.2,-12.85,5.4,.4,C.trim,main,true);
  box(1.8,.12,4.1,-12.85,5.55,.4,C.parapet,main,true);
  box(.55,1.7,.08,-12.85,3.0,2.42,C.shadow,main);
  box(.45,1.55,.04,-12.85,3.0,2.46,glassMat,main);
  box(.65,.08,.16,-12.85,3.85,2.48,C.trim,main,true);

  // --- facade strips with real window holes -------------------------------
  function wallStrip(name,x0,x1,y0,y1,openings,z=3.0,parent=facade){
    const g=group(name,parent);
    const cuts=[...new Set([x0,x1,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])])].sort((a,b)=>a-b);
    for(let i=1;i<cuts.length;i++){
      const a=cuts[i-1],b=cuts[i];if(b-a<.001)continue;
      const mid=(a+b)/2,o=openings.find(o=>mid>=o.x-o.w/2&&mid<=o.x+o.w/2);
      if(o){
        const bottom=o.y-o.h/2,top=o.y+o.h/2;
        if(bottom>y0+.001)box(b-a,bottom-y0,.26,(a+b)/2,(y0+bottom)/2,z-.13,C.wall,g);
        if(top<y1-.001)box(b-a,y1-top,.26,(a+b)/2,(top+y1)/2,z-.13,C.wall,g);
      }else box(b-a,y1-y0,.26,(a+b)/2,(y0+y1)/2,z-.13,C.wall,g);
    }
    return g;
  }
  function windowUnit(parent,{x,y,z=3.0,w,h,open=false}){
    const g=group('窗',parent);
    box(w,h,.06,x,y,z-.09,'#2c3548',g);
    box(w-.05,h-.05,.02,x,y,z-.04,glassMat,g);
    box(w+.14,.06,.06,x,y+h/2+.03,z+.04,C.trim,g,true);
    box(w+.14,.06,.06,x,y-h/2-.03,z+.04,C.trim,g,true);
    box(.06,h,.06,x-w/2-.03,y,z+.04,C.trim,g,true);
    box(.06,h,.06,x+w/2+.03,y,z+.04,C.trim,g,true);
    box(.028,h-.04,.02,x,y,z+.055,C.trim,g);
    box(w-.04,.028,.02,x,y-h/6,z+.055,C.trim,g);
    box(w-.04,.028,.02,x,y+h/6,z+.055,C.trim,g);
    box(w+.26,.06,.14,x,y-h/2-.1,z+.04,C.trim,g,true);
    if(open){
      const pane=box(w*.42,h*.46,.02,x-w*.24,y+h*.22,z-.015,glassMat,g);
      pane.rotation.y=-.55;
    }
    windows.push({x,y,w,h});
    return g;
  }

  const bays=[-11.1,-9.2,-7.3,-5.4,-3.5,3.5,5.4,7.3,9.2,11.1];
  const floors=[
    {y:1.8,y0:.5,y1:3.1},
    {y:4.4,y0:3.1,y1:5.7},
    {y:7.0,y0:5.7,y1:8.3}
  ];
  for(const [fi,f] of floors.entries()){
    const openings=bays.map(x=>({x,y:f.y,w:1.7,h:1.9}));
    if(fi===0)openings.push({x:0,y:1.6,w:5.2,h:3.0});
    wallStrip(`正面第${fi+1}层窗洞`, -12,12,f.y0,f.y1,openings);
    for(const [bi,x] of bays.entries())windowUnit(facade,{x,y:f.y,w:1.5,h:1.6,open:(fi===1&&bi===3)||(fi===2&&bi===6)});
    box(24,.2,.32,0,f.y1,3.02,'#ffffff',facade,true);
  }

  function sideWindow(x,y,z,side){
    const g=group('侧窗',facade);g.position.set(x,y,z);g.rotation.y=side*Math.PI/2;
    box(1.35,1.4,.05,0,0,0,'#2c3548',g);
    box(1.25,1.3,.02,0,0,.03,glassMat,g);
    box(1.5,.07,.06,0,.72,.03,C.trim,g,true);
    box(1.5,.07,.06,0,-.72,.03,C.trim,g,true);
    box(.07,1.4,.06,-.72,0,.03,C.trim,g,true);
    box(.07,1.4,.06,.72,0,.03,C.trim,g,true);
    box(.03,1.28,.02,0,0,.05,C.trim,g);
    box(1.25,.03,.02,0,0,.05,C.trim,g);
    box(1.55,.06,.14,0,-.78,.04,C.trim,g,true);
  }
  for(const f of floors)for(const z of [-2.4,0,2.4])sideWindow(12.16,f.y,z,1);
  sideWindow(-12.16,7.0,-2.4,-1);sideWindow(-12.16,7.0,0,-1);sideWindow(-12.16,7.0,2.4,-1);
  sideWindow(-12.16,4.4,-2.4,-1);

  // --- entrance -----------------------------------------------------------
  box(2.4,3.0,.10,0,1.5,3.04,C.door,entrance,true);
  for(const x of [-1.2,1.2])box(.1,2.9,.08,x,1.45,3.10,C.trim,entrance,true);
  for(const y of [.35,1.5,2.65])box(2.4,.07,.08,0,y,3.10,C.trim,entrance,true);
  box(1.1,2.7,.02,0,1.45,3.11,glassMat,entrance);
  box(5.2,.24,2.0,0,3.5,4.35,C.trim,entrance,true);
  box(5.4,.1,.3,0,3.36,5.35,C.trim,entrance,true);
  for(const x of [-2.1,2.1]){
    cylinder(.18,.18,3.3,x,1.65,4.95,C.trim,entrance,14);
    box(.48,.14,.48,x,3.27,4.95,C.trim,entrance,true);
    box(.45,.16,.45,x,.08,4.95,C.stone,entrance,true);
  }

  // --- clock tower --------------------------------------------------------
  box(3.2,8.4,3.0,0,7.4,2.4,C.wall,tower,true);
  box(.35,3.2,3.0,-1.425,1.6,2.4,C.wall,tower,true);
  box(.35,3.2,3.0,1.425,1.6,2.4,C.wall,tower,true);
  box(2.5,3.2,.2,0,1.6,2.9,C.wall,tower,true);
  box(3.4,.2,3.3,0,11.65,2.4,C.trim,tower,true);
  box(3.3,.4,3.2,0,11.4,2.4,C.parapet,tower,true);
  box(1.65,4.7,.06,0,5.9,3.92,C.shadow,tower);
  box(1.5,4.55,.04,0,5.9,3.96,glassMat,tower);
  for(const y of [3.9,5.3,6.7,8.1])box(1.5,.06,.06,0,y,3.99,C.trim,tower);
  for(const x of [-.7,0,.7])box(.045,4.5,.06,x,5.9,3.99,C.trim,tower);
  box(2.4,.14,.1,0,8.45,3.98,C.trim,tower,true);

  const clockMap=texture('school-clock',512,512,(c,w,h)=>{
    c.clearRect(0,0,w,h);
    c.fillStyle='#f7f3e7';c.beginPath();c.arc(256,256,238,0,Math.PI*2);c.fill();
    c.strokeStyle='#3c3f43';c.lineWidth=10;c.stroke();
    c.fillStyle='#3c3f43';c.textAlign='center';c.textBaseline='middle';c.font='600 40px Georgia,serif';
    for(let i=1;i<=12;i++){const a=i/12*Math.PI*2-Math.PI/2;c.fillText(String(i),256+Math.cos(a)*188,256+Math.sin(a)*188);}
    c.strokeStyle='#3c3f43';c.lineCap='round';
    c.lineWidth=15;c.beginPath();c.moveTo(256,256);const ha=(10+8/60)/12*Math.PI*2-Math.PI/2;c.lineTo(256+Math.cos(ha)*104,256+Math.sin(ha)*104);c.stroke();
    c.lineWidth=9;c.beginPath();c.moveTo(256,256);const ma=8/60*Math.PI*2-Math.PI/2;c.lineTo(256+Math.cos(ma)*160,256+Math.sin(ma)*160);c.stroke();
    c.beginPath();c.arc(256,256,14,0,Math.PI*2);c.fillStyle='#3c3f43';c.fill();
  });
  clockMat.map=clockMap;clockMat.needsUpdate=true;
  const clock=new THREE.Mesh(new THREE.CircleGeometry(.95,48),clockMat);
  clock.position.set(0,9.9,3.99);tower.add(clock);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.93,1.06,48),ringMat);
  ring.position.set(0,9.9,3.985);tower.add(ring);
  cylinder(.035,.035,1.4,0,12.35,2.4,C.rail,tower,8);

  // --- roof, parapet and railing -----------------------------------------
  box(24.4,.14,7.4,0,8.36,-.5,C.roof,roof,true);
  for(const z of [-4.02,3.1])box(24.3,.3,.2,0,8.51,z,C.parapet,roof,true);
  for(const x of [-12.1,12.1])box(.2,.3,7.2,x,8.51,-.5,C.parapet,roof,true);
  for(const z of [-4.0,3.08]){
    for(let x=-11.9;x<=11.9;x+=.55)box(.025,.55,.025,x,8.85,z,C.rail,roof);
    box(24,.04,.04,0,9.14,z,C.rail,roof,true);
  }
  for(const x of [-12.05,12.05]){
    for(let z=-3.9;z<=3.0;z+=.6)box(.025,.55,.025,x,8.85,z,C.rail,roof);
    box(.04,.04,7.1,x,9.14,-.5,C.rail,roof,true);
  }

  // --- gate, wall and sign ------------------------------------------------
  const wallZ=10.0;
  function wallRun(x0,x1){
    const w=x1-x0;
    box(w,1.3,.32,(x0+x1)/2,.65,wallZ,C.wallBase,gate,true);
    box(w-.02,.13,.42,(x0+x1)/2,1.33,wallZ,C.wallCap,gate,true);
    for(let x=x0+.6;x<x1;x+=1.2)box(.025,1.1,.02,x,.65,wallZ+.175,C.greenDark,gate);
  }
  wallRun(-13.99,-3);wallRun(3,13.99);
  for(const x of [-3,3]){
    box(.4,2.05,.42,x,1.025,wallZ,C.wallCap,gate,true);
    box(.5,.14,.52,x,2.03,wallZ,C.trim,gate,true);
  }
  for(const side of [-1,1]){
    const cx=side*1.5;
    box(2.7,.08,.1,cx,1.75,wallZ,C.gate,gate,true);
    box(2.7,.08,.1,cx,.22,wallZ,C.gate,gate,true);
    for(let x=side=== -1?-2.75:.25;side<0?x<-0.25:x<2.75;x+=.28)box(.07,1.6,.08,x,.93,wallZ,C.gate,gate);
  }
  // Inset returns beside the gate make a planter alcove on each side.
  for(const side of [-1,1]){
    box(.3,1.3,1.0,side*3.15,.65,9.5,C.wallBase,gate,true);
    box(.4,.13,1.05,side*3.15,1.33,9.5,C.wallCap,gate,true);
    box(1.0,1.3,.3,side*3.65,.65,9.0,C.wallBase,gate,true);
    box(1.1,.13,.4,side*3.65,1.33,9.0,C.wallCap,gate,true);
    box(.95,.55,.7,side*3.9,.3,10.35,C.brick,gate,true);
    for(let i=0;i<6;i++)ball(.3,.26,.26,side*3.9-.35+i*.14,.76,10.35,[C.green,C.greenDark,C.greenLight][i%3],gate);
    for(let i=0;i<4;i++)ball(.065,.065,.065,side*3.9-.25+i*.16,.98,10.35,C.flower,gate);
  }
  // Small side door on the right wall.
  box(.9,1.25,.06,5.8,.625,wallZ+.18,C.gate,gate,true);
  for(const x of [-.48,.48])box(.07,1.3,.09,5.8+x,.65,wallZ+.2,C.trim,gate,true);
  box(1.0,.08,.1,5.8,1.28,wallZ+.2,C.trim,gate,true);
  for(let x=5.45;x<6.2;x+=.18)box(.035,1.1,.03,x,.62,wallZ+.22,C.gate,gate);
  box(1.1,.08,.55,5.8,.04,10.4,C.stone,gate,true);

  // --- perimeter walls, moss and planting --------------------------------
  function sideWall(x){
    box(.3,1.3,23.8,x,.65,-1.9,C.wallBase,gate,true);
    box(.38,.13,23.9,x,1.33,-1.9,C.wallCap,gate,true);
    for(let z=-13.2;z<9.5;z+=1.2)box(.02,1.1,.025,x+(x<0?-.17:.17),.65,z,C.greenDark,gate);
  }
  sideWall(-13.8);sideWall(13.8);
  box(27.6,1.3,.32,0,.65,-13.8,C.wallBase,gate,true);
  box(27.8,.13,.42,0,1.33,-13.8,C.wallCap,gate,true);
  for(let x=-13.2;x<13.5;x+=1.2)box(.025,1.1,.02,x,.65,-13.62,C.greenDark,gate);
  function mossRun(x0,z0,x1,z1,count=22){
    const dx=x1-x0,dz=z1-z0;
    box(Math.max(.12,Math.abs(dx)),.035,Math.max(.12,Math.abs(dz)),(x0+x1)/2,.055,(z0+z1)/2,'#6f8f4a',plants);
    for(let i=0;i<count;i++){
      const t=(i+.5)/count;
      ball(.1+((i*7)%3)*.045,.05,.1+((i*5)%3)*.045,x0+dx*t,.075,z0+dz*t,i%2?'#7d9e55':'#8faa5f',plants);
    }
  }
  mossRun(-13.5,9.72,-3.2,9.72);mossRun(3.2,9.72,13.5,9.72);
  mossRun(-13.5,10.24,-3.2,10.24);mossRun(3.2,10.24,13.5,10.24);
  mossRun(-13.55,-13.5,-13.55,9.5);mossRun(13.55,-13.5,13.55,9.5);
  mossRun(-13.5,-13.55,13.5,-13.55);

  function hedge(x,z,r){
    const g=group('绿篱',plants);
    ball(r,r*.65,r,x,.7,z,C.green,g);
    ball(r*.8,r*.45,r*.8,x+.3,1.1,z+.1,C.greenLight,g);
    ball(r*.55,r*.35,r*.55,x-.2,1.25,z-.1,C.greenDark,g);
  }
  for(const x of [-12.2,-10.8,-9.4,-8.0,-6.6,-5.2,5.2,6.6,8.0,9.4,10.8,12.2])hedge(x,8.7,.82+((Math.abs(x)%2)*.14));
  function tree(x,z,size){
    const g=group('树',plants);
    cylinder(.18*size,.28*size,3.4*size,x,1.7*size,z,C.trunk,g,9);
    for(const [dx,dy,dz,r] of [[0,3.8,0,1.5],[-.8,3.4,.2,1.0],[.7,3.5,-.2,1.0],[0,4.5,.1,1.0]]){
      ball(r*size,r*.62*size,r*size,x+dx*size,dy*size,z+dz*size,C.greenDark,g);
      ball(r*.75*size,r*.45*size,r*.75*size,x+(dx+.2)*size,(dy+.25)*size,z+(dz+.1)*size,C.green,g);
    }
  }
  tree(-10.4,7.4,1.25);tree(10.4,7.4,1.2);
  tree(-7.0,8.0,.85);tree(7.0,8.0,.8);
  for(const [x,z,r] of [[-9.6,4.8,.55],[-8.4,5.3,.75],[-7.2,4.7,.45],[9.6,4.8,.55],[8.4,5.3,.75],[7.2,4.7,.45]])hedge(x,z,r);
  tree(-6.2,5.4,.55);tree(6.2,5.4,.55);
  function conifer(x,z,size=1){
    const g=group('针叶树',plants);
    cylinder(.1*size,.18*size,2.2*size,x,1.1*size,z,C.trunk,g,8);
    for(let i=0;i<4;i++){
      const r=(1.0-i*.2)*size,y=(2.0+i*.55)*size;
      ball(r,r*.55,r,x,y,z,C.greenDark,g);
      ball(r*.7,r*.4,r*.7,x+.08,y+.18,z,C.green,g);
    }
  }
  conifer(-4.6,6.1,1.05);conifer(4.6,6.1,1.05);

  // thin trim must not cast shadows; static shadow map is cached in the viewer.
  root.traverse(o=>{
    if(!o.isMesh)return;
    const geo=o.geometry;
    if(!geo.boundingBox)geo.computeBoundingBox();
    const size=geo.boundingBox.getSize(new THREE.Vector3());
    if(Math.min(size.x,size.y,size.z)<.12)o.castShadow=false;
  });
  for(const g of [site,main,facade,tower,roof,entrance,gate,plants])batch(g);
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  root.userData.specification=specification;
  root.userData.design={
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    facadeBays:bays.length,
    windows:windows.length,
    footprint:'2x2 / 28x28',
    reference:'User school reference image; side, rear and interior are designed completion',
    clockTime:'10:08'
  };

  let time='afternoon';
  const times=['morning','afternoon','dusk','night'];
  function setEnvironment(patch={}){
    if(patch.time!==undefined){
      if(!times.includes(patch.time))throw new Error(`未知时段：${patch.time}`);
      time=patch.time;
    }
    const night=time==='night',dusk=time==='dusk';
    glassMat.emissive.set(night?'#ffb45e':dusk?'#ffc27a':'#000000');
    glassMat.emissiveIntensity=night?.38:dusk?.16:0;
    return {time};
  }
  function getEnvironmentState(){return {time,windowEmissive:glassMat.emissiveIntensity};}
  const asset={
    root,type:'school',specification,
    colliders:[
      {x:0,z:-.5,w:24,d:7,height:8.3},
      {x:-12.85,z:.4,w:1.7,d:4,height:5.4},
      {x:0,z:4.4,w:6.6,d:2.5,height:3.8},
      {x:0,z:10,w:28,d:.4,height:1.8},
      {x:-13.8,z:-1.9,w:.4,d:23.8,height:1.4},
      {x:13.8,z:-1.9,w:.4,d:23.8,height:1.4},
      {x:0,z:-13.8,w:27.8,d:.4,height:1.4}
    ],
    occluders:[
      {x:0,z:-.5,w:24.2,d:7.2,height:11.8},
      {x:0,z:10,w:28,d:.5,height:1.8},
      {x:-13.8,z:-1.9,w:.5,d:24,height:1.4},
      {x:13.8,z:-1.9,w:.5,d:24,height:1.4},
      {x:0,z:-13.8,w:28,d:.5,height:1.4}
    ],
    roofs:[],lamps:[],
    floors:[{x:0,z:0,w:28,d:28,height:.06}],
    entry:specification.entry,
    setEnvironment,getEnvironmentState,
    getLightingDescriptors:()=>[],
    dispose(){extraMaterials.forEach(m=>m.dispose());dispose();}
  };
  setEnvironment({time:'afternoon'});
  return asset;
}
