import {createWorkshop} from './geometry.js';
import {createEnvironment} from './environment.js';

export const specification=Object.freeze({id:'sakura-house',name:'さくら家 · 樱家',tileSize:14,front:'+Z',placementRotations:[0,90,180,270],revision:'exterior-04-roof',interior:false});
const C={wall:'#ee8fae',seam:'#c87691',frame:'#d8e8eb',gable:'#edf7f4',green:'#169ba4',edge:'#66677c',roof:'#c4c3c9',roofBed:'#83818f',tileLine:'#a4a1ad',wood:'#78836b',foundation:'#b1b5b6',fence:'#d0eee0',fenceJoint:'#879e9b',earth:'#ddd1b5',glass:'#2633cf',glassLight:'#354be8',leaf:'#249b39',leafLight:'#41ba36',leafDark:'#197c3d',trunk:'#72764d'};

export function createModel(){
  const W=createWorkshop(),{THREE,root,group,box,cylinder,ellipsoid,beam,tube,solid,plaque}=W;
  const openings=[];let tileCount=0;
  const yard=group('14×14 地块与转折入户小径');
  box(14,.16,14,0,-.08,0,'#a3b79b',yard,true);
  box(13.8,.045,13.8,0,.0225,0,C.earth,yard);
  box(8.2,.015,1.8,.5,.053,4.7,'#99c96e',yard);
  box(1.2,.015,6,-5.7,.053,-.6,'#99c96e',yard);
  for(const [x,z,w,d]of [[-4.75,3.55,3,1.35],[-3.3,3.2,1.55,1.1]])box(w,.04,d,x,.065,z,'#d8d6c7',yard);
  const base=group('连续房屋基础');
  box(8.5,.38,6.2,-.45,.235,-.4,C.foundation,base,true);
  box(1.8,.38,5.5,4.7,.235,-.05,C.foundation,base,true);
  for(const [x,z,r]of [[-4.8,-1.2,-Math.PI/2],[.8,-3.61,Math.PI],[5.71,-1.2,Math.PI/2]]){
    const v=group('床下通风',x,.24,z,r,base);box(.5,.13,.03,0,0,0,C.edge,v);
    for(let i=0;i<5;i++)box(.018,.12,.04,-.2+i*.1,0,.018,C.frame,v);
  }
  function window(parent,o,side){
    const {x,w,h,y}=o,g=group(o.door?'内凹玄关或胜手口':'深蓝玻璃与薄窗框',x,y,0,0,parent);
    openings.push({side,x,w,h,y,backingDepth:.24,type:o.door?'door':'window',horizontalBars:o.door?0:(o.bars?.length||1)});
    box(w,h,.03,0,0,-.24,'#242966',g);
    for(const xx of [-w/2,w/2])box(.06,h+.1,.28,xx,0,-.03,C.frame,g,true);
    for(const yy of [-h/2,h/2])box(w+.1,.055,.28,0,yy,-.03,C.frame,g,true);
    box(w-.07,h-.07,.035,0,0,-.115,C.glass,g);
    if(!o.door)box(w-.08,h*.6,.018,0,-h*.2,-.091,C.glassLight,g);
    box(.045,h,.065,0,0,-.065,C.frame,g);
    if(o.door){for(let i=1;i<6;i++)box(.026,h-.09,.06,-w/2+i*w/6,0,-.06,C.frame,g);box(.032,.19,.08,.12,-.12,.015,C.edge,g);}
    else for(const level of (o.bars||[.14]))box(w,.04,.065,0,h*level,-.06,C.frame,g);
    box(w+.16,.075,.37,0,-h/2-.025,.005,C.frame,g,true);
    if(o.awning){const a=box(w+.48,.065,.68,0,h/2+.19,.24,C.green,g,true);a.rotation.x=.1;
      box(w+.48,.07,.045,0,h/2+.15,.58,'#247c92',g);
      for(const xx of [-w/2,w/2])beam([xx,h/2-.02,.12],[xx,h/2+.15,.5],.018,C.edge,g);}
  }
  function wall(name,length,x,z,rotation,holes,top=2.95){
    const g=group(name,x,0,z,rotation),bottom=.42;
    const edges=[...new Set([-length/2,length/2,...holes.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])])].sort((a,b)=>a-b);
    for(let i=1;i<edges.length;i++){const a=edges[i-1],b=edges[i],cx=(a+b)/2;
      const o=holes.find(o=>cx>o.x-o.w/2&&cx<o.x+o.w/2);
      for(const [lo,hi]of (o?[[bottom,o.y-o.h/2],[o.y+o.h/2,top]]:[[bottom,top]]))if(hi>lo+.001)box(b-a,hi-lo,.18,cx,(lo+hi)/2,0,C.wall,g);
    }
    for(let xx=-length/2+.12;xx<length/2;xx+=.29){const o=holes.find(o=>Math.abs(xx-o.x)<o.w/2+.025);
      for(const [lo,hi]of (o?[[bottom,o.y-o.h/2],[o.y+o.h/2,top]]:[[bottom,top]]))if(hi>lo)box(.012,hi-lo,.01,xx,(lo+hi)/2,.096,C.seam,g);
    }
    box(length,.055,.22,0,.45,.015,C.frame,g);box(length,.065,.22,0,top-.02,.015,'#67c58d',g);
    for(const xx of [-length/2+.04,length/2-.04])box(.07,top-bottom,.22,xx,(top+bottom)/2,.015,'#f4a0ba',g);
    for(const o of holes)window(g,o,name);return g;
  }
  wall('南面长立面与偏左玄关',8.5,-.45,2.7,0,[{x:-2.85,y:1.54,w:1.48,h:2.12,door:true,awning:true},{x:2.15,y:1.78,w:2.05,h:1.37,awning:true}]);
  wall('西端山墙窗',6.2,-4.7,-.4,-Math.PI/2,[{x:.35,y:1.62,w:3.4,h:1.7,awning:true,bars:[.14,-.19]}]);
  wall('东端封闭墙',6.2,3.8,-.4,Math.PI/2,[]);
  wall('北面补全',8.5,-.45,-3.5,Math.PI,[{x:-2.4,y:1.53,w:1,h:2.1,door:true},{x:0,y:1.92,w:1.6,h:.84},{x:2.4,y:1.63,w:1.9,h:1.35}]);
  wall('低附屋正面小窗',1.8,4.7,2.7,0,[{x:0,y:1.98,w:1.02,h:.86}],2.65);
  wall('低附屋后墙',1.8,4.7,-2.8,Math.PI,[],2.65);
  wall('低附屋东面小窗',5.5,5.6,-.05,Math.PI/2,[{x:0,y:2,w:.82,h:.66}],2.65);
  const roof=group('连续切妻屋顶与轻薄瓦片');
  const ridgeZ=-.4,peak=4.9,eave=3.02;
  const roofY=z=>peak-Math.abs(z-ridgeZ)*(peak-eave)/3.65;
  for(const [x,r]of [[-4.7,-Math.PI/2],[3.8,Math.PI/2]]){
    const g=group('端部山墙',x,0,ridgeZ,r,roof);
    solid([[-3.1,2.93],[3.1,2.93],[3.1,roofY(2.7)],[0,peak],[-3.1,roofY(2.7)]],.15,C.gable,g);
    for(const xx of [-.17,0,.17])box(.075,.25,.035,xx,3.97,.17,'#525883',g);
  }
  // Closed wedges: no roof valley, crossing ridge or hidden intersecting wing.
  function slab(xa,xb,za,zb,yFn,depth,color,parent=roof){
    const v=[[xa,yFn(xa,za),za],[xb,yFn(xb,za),za],[xb,yFn(xb,zb),zb],[xa,yFn(xa,zb),zb]];
    const points=[...v,...v.map(([x,y,z])=>[x,y-depth,z])].flat();
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    g.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);g.computeVertexNormals();
    return W.mesh(g,color,parent);
  }
  // Continuous grey bedding shows only in the narrow downslope channels.
  // Overlapping closed tiles keep the original roof slope and eave position.
  slab(-5.2,4.3,-4.05,ridgeZ,(_,z)=>roofY(z),.15,C.roofBed);
  slab(-5.2,4.3,ridgeZ,3.25,(_,z)=>roofY(z),.15,C.roofBed);
  function tile(a,b,near,far,map,parent,mark=false){
    const points=[],indices=[],side=Math.sign(far-near),segments=6;
    function point(u,t){
      const across=a+(b-a)*u,run=near+(far-near)*t-side*.025*Math.sin(u*Math.PI)*t;
      const p=map(across,run);p[1]+=.026+.014*Math.sin(u*Math.PI)+.014*t;return p;
    }
    for(let layer=0;layer<2;layer++)for(let t=0;t<2;t++)for(let k=0;k<=segments;k++){
      const p=point(k/segments,t);if(layer)p[1]-=.021;points.push(...p);
    }
    const stride=segments+1,lower=stride*2;
    function quad(a,b,c,d,up){
      const p=i=>new THREE.Vector3().fromArray(points,i*3),normal=p(b).sub(p(a)).cross(p(c).sub(p(a)));
      if(up!==undefined&&(normal.y>0)!==up)[b,d]=[d,b];indices.push(a,b,c,a,c,d);
    }
    for(let k=0;k<segments;k++){
      quad(k,k+1,stride+k+1,stride+k,true);
      quad(lower+k,lower+stride+k,lower+stride+k+1,lower+k+1,false);
      const f=[k,lower+k,lower+k+1,k+1],e=[stride+k,stride+k+1,lower+stride+k+1,lower+stride+k];
      // Side winding follows the already oriented top; geometry is closed.
      const first=map(a,near),second=map(b,near),third=map(b,far);
      const positive=new THREE.Vector3(...second).sub(new THREE.Vector3(...first)).cross(new THREE.Vector3(...third).sub(new THREE.Vector3(...first))).y>0;
      if(!positive){f.reverse();e.reverse();}quad(...f);quad(...e);
    }
    const left=[0,stride,lower+stride,lower],right=[segments,lower+segments,lower+stride+segments,stride+segments];
    const va=new THREE.Vector3(...map(b,near)).sub(new THREE.Vector3(...map(a,near))),vb=new THREE.Vector3(...map(b,far)).sub(new THREE.Vector3(...map(a,near)));
    if(va.cross(vb).y<0){left.reverse();right.reverse();}quad(...left);quad(...right);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();W.mesh(geometry,C.roof,parent);
    // Fine, slightly curved overlap marks remain lighter than the long channels.
    const line=[];for(let k=0;k<=6;k++){const p=point(.09+.82*k/6,.975);p[1]+=.003;line.push(p);}
    for(let k=1;k<line.length;k++)beam(line[k-1],line[k],.0045,C.tileLine,parent);
    if(mark){const p=point(.66,.79),q=point(.91,.79);p[1]+=.003;q[1]+=.003;beam(p,q,.0035,C.tileLine,parent);}
  }
  for(const side of [-1,1])for(let row=0;row<7;row++)for(let col=0;col<12;col++){
    const near=ridgeZ+side*(row*3.65/7-(row?.025:0)),far=ridgeZ+side*(row+1)*3.65/7;
    const xa=-5.2+col*9.5/12+.024,xb=-5.2+(col+1)*9.5/12-.024;
    tile(xa,xb,near,far,(x,z)=>[x,roofY(z),z],roof,(row+col)%3===1);tileCount++;
  }
  for(const x of [-5.2,4.3])for(const end of [-4.05,3.25])beam([x,peak+.015,ridgeZ],[x,eave+.015,end],.065,C.edge,roof);
  for(const z of [-4.05,3.25])box(9.5,.13,.09,-.45,eave-.045,z,C.edge,roof,true);
  beam([-5.2,peak+.02,ridgeZ],[4.3,peak+.02,ridgeZ],.075,C.edge,roof);
  for(let x=-5.12;x<4.3;x+=.4){const cap=cylinder(.073,.073,.376,x,peak+.045,ridgeZ,C.roof,roof,16);cap.rotation.z=Math.PI/2;const joint=cylinder(.074,.074,.014,x-.188,peak+.045,ridgeZ,C.roofBed,roof,16);joint.rotation.z=Math.PI/2;}
  const annex=group('右侧低附屋斜屋顶'),annexY=x=>3.07-(x-3.82)*.145;
  slab(3.82,6.04,-3.15,3.2,x=>annexY(x),.12,C.roofBed,annex);
  for(const z of [-3.15,3.2]){beam([3.82,annexY(3.82),z],[6.04,annexY(6.04),z],.06,C.edge,annex);
    const g=group('附屋屋檐下封板',0,0,z,0,annex);solid([[3.82,2.62],[5.6,2.62],[5.6,annexY(5.6)-.12],[3.82,annexY(3.82)-.12]],.1,C.wall,g);}
  box(.16,.14,5.5,5.6,2.71,-.05,C.wall,annex);
  for(let row=0;row<3;row++)for(let col=0;col<12;col++){
    const near=3.82+row*2.22/3-(row?.025:0),far=3.82+(row+1)*2.22/3;
    tile(-3.15+col*6.35/12+.024,-3.15+(col+1)*6.35/12-.024,near,far,(z,x)=>[x,annexY(x),z],annex,(row+col)%3===1);
  }
  const vent=group('参考可见的蓝灰排气筒');
  box(.52,.12,.5,5.55,2.86,1.4,'#7392aa',vent,true);
  box(.3,.95,.34,5.55,3.3,1.4,'#8db1ca',vent,true);
  const elbow=box(.3,.6,.34,5.62,3.98,1.4,'#8db1ca',vent,true);elbow.rotation.z=-.24;
  const hood=box(.76,.25,.55,5.69,4.3,1.4,'#8db1ca',vent,true);hood.rotation.z=-.12;
  box(.31,.04,.36,5.55,3.5,1.4,'#607f9e',vent);
  const drains=group('绿色檐沟与落水管');
  for(const z of [-4.05,3.25])box(9.55,.085,.095,-.45,2.88,z,'#55bd81',drains,true);
  for(const [x,z,y]of [[-4.9,3.25,2.88],[-4.9,-4.05,2.88],[6.04,3.2,2.69]]){
    tube([[x,y,z],[x,y-.25,z-.12],[x,.24,z-.12],[x,.13,z+.08]],.036,'#55bd81',drains);
    for(const yy of [.8,1.8])box(.1,.035,.1,x,yy,z-.12,C.edge,drains);
  }
  const entry=group('偏置玄关的门槛与台阶');
  box(1.85,.15,.95,-3.3,.12,3.05,'#bdc5c5',entry,true);
  box(1.65,.16,.58,-3.3,.275,2.94,'#d0d6d6',entry,true);
  box(1.52,.065,.24,-3.3,.39,2.75,C.edge,entry,true);
  const enclosure=group('浅绿围墙与无栏杆转折院门');
  function fence(name,length,x,z,r){
    const g=group(name,x,0,z,r,enclosure);
    box(length,1.47,.2,0,.785,0,C.fence,g,true);
    for(const y of [.54,1.03])box(length,.015,.212,0,y,0,C.fenceJoint,g);
    const n=Math.round(length/.92);for(let i=1;i<n;i++)box(.014,1.47,.213,-length/2+i*length/n,.785,0,C.fenceJoint,g);
    box(length+.025,.035,.225,0,1.54,0,'#d9f1e4',g,true);return g;
  }
  fence('西侧长墙',8.85,-6.45,-2.025,-Math.PI/2);
  fence('转角开放院口右侧围墙',12.05,.425,5.7,0);
  fence('东侧围墙',12.15,6.45,-.375,Math.PI/2);
  fence('后围墙',12.9,0,-6.45,Math.PI);
  const address=group('院门旁门牌信箱',-5.13,0,5.825,0,enclosure);
  box(.65,.28,.045,0,1.3,0,'#edf4de',address,true);plaque('さくら',.59,.22,0,1.3,.025,address);
  box(.56,.41,.09,0,.84,.015,'#d6e8d3',address,true);
  box(.4,.035,.015,0,.74,.07,'#526f8b',address);plaque('〒',.17,.14,0,.94,.066,address);
  const planting=group('高树、成片灌木和阔叶矮树');
  function shrub(x,z,w,h,d,color=C.leaf){
    const baseColor=new THREE.Color(color),dark=baseColor.clone().multiplyScalar(.69).getStyle(),light=baseColor.clone().lerp(new THREE.Color('#8fd94c'),.32).getStyle();
    cylinder(.035,.065,h*.35,x,.045+h*.175,z,C.trunk,planting,7);
    ellipsoid(w*.42,h*.28,d*.43,x,.045+h*.28,z,dark,planting);
    ellipsoid(w*.46,h*.36,d*.45,x,.045+h*.49,z,color,planting);
    for(const [dx,dy,dz,s,c]of [[-.27,.53,0,.37,color],[.27,.55,.03,.35,dark],[-.1,.74,-.06,.35,light],[.13,.8,0,.31,light],[.05,.48,.24,.36,color]])ellipsoid(w*s,h*.29,d*s,x+w*dx,.045+h*dy,z+d*dz,c,planting);
    for(let i=0;i<8;i++){const a=i*2.4;const mark=ellipsoid(.018,.07,.014,x+Math.sin(a)*w*.3,h*(.5+(i%3)*.16),z+d*.43,C.leafLight,planting);mark.rotation.z=Math.sin(a)*.3;}
  }
  for(const args of [[-5.7,1.4,1,1.15,1.05,C.leafDark],[-5.67,-4.8,1.08,2.85,1.5,'#36b52d'],[-5.7,-3.5,.95,2.45,1.28,'#34ae2c'],[-4.5,4.82,1.6,2.1,1.15],[-3.2,4.9,1.85,2.5,1.15],[-1.85,4.9,1.45,2.05,1.2],[5,4.6,1.4,2,1.18,'#167c50'],[4.3,-5.3,.9,.65,.85,C.leafDark]])shrub(...args);
  function broadleaf(x,z,h){
    cylinder(.045,.075,h*.88,x,.045+h*.44,z,C.trunk,planting,9);
    for(let layer=0;layer<2;layer++)for(let i=0;i<7;i++){
      const leaf=group('折面阔叶',x,h*(.69+layer*.22),z,i*Math.PI*2/7+layer*.35,planting);
      const verts=[0,0,0,-.21,.28,.42,0,.65,.85,.21,.28,.42,0,.20,.38],indices=[0,2,1,0,3,2,0,1,4,1,2,4,2,3,4,3,0,4];
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();W.mesh(g,i%2?'#61c55c':'#3ca76f',leaf);
      beam([0,.008,0],[0,.66,.84],.009,'#268854',leaf);
    }
  }
  broadleaf(.75,4.55,1.8);broadleaf(2.2,4.65,1.55);
  for(const [x,z]of [[-1,5.1],[3.4,5.1],[5.6,3.75]])for(let i=0;i<5;i++){
    const g=group('墙脚草丛',x,.06,z,i*1.3,planting);solid([[-.08,0],[.04,.3+i*.025],[.06,0]],.025,i%2?C.leaf:C.leafLight,g);
  }
  const tree=group('高出屋脊的后院落叶树',5.25,.045,-3.95,0,planting);
  tree.scale.set(.85,.92,.95); function taper(a,b,ra,rb,parent=tree){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);
    const m=cylinder(rb,ra,v.length(),0,0,0,C.trunk,parent,9);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
  }
  const trunk=[[0,0,0],[-.06,1.6,.03],[.03,3,0],[-.08,4.15,.06],[.07,5.25,0]],r=[.36,.32,.27,.22,.14];
  for(let i=1;i<trunk.length;i++)taper(trunk[i-1],trunk[i],r[i-1],r[i]);
  const tips=[[-2.8,6.75,-.22],[-1.7,7.2,.36],[.05,7.55,-.48],[.8,7.1,.5],[1.42,6.6,-.1],[-3.2,5.9,.6],[1.65,5.65,.4],[-.35,6.8,1]];
  tips.forEach((tip,i)=>{
    const start=[-.06,3.8+(i%3)*.36,.03],fork=[tip[0]*.52,5.03+(i%3)*.23,tip[2]*.62];
    taper(start,fork,.17,.105);taper(fork,tip,.105,.029);
    for(let j=0;j<5;j++){const t=.25+j*.15,a=fork.map((v,k)=>v+(tip[k]-v)*t),b=[a[0]+(j%2?1:-1)*(.24+j*.025),a[1]+.38+(j%2)*.12,a[2]+Math.sin(i*2+j)*.24];taper(a,b,.04,.016);
      taper(b,[b[0]+(j%2?-.13:.16),b[1]+.24,b[2]-.12],.016,.007);
      if(j<3)taper(b,[b[0]-.2,b[1]+.2,b[2]+.16],.015,.006);}
  });
  for(const [a,b,c]of [[[0,3.7,0],[-1.1,4.9,.5],[-2.45,5.8,.9]],[[0,4.1,0],[.7,5.05,-.4],[1.35,6.3,-.65]],[[-.05,4.3,.05],[-.55,5.65,-.65],[-1.15,7,-.9]]]){
    taper(a,b,.19,.1);taper(b,c,.1,.026);
    for(let j=0;j<3;j++){const p=b.map((v,k)=>v+(c[k]-v)*(j+1)/4);taper(p,[p[0]-.25,p[1]+.5,p[2]+.22],.036,.01);}
  }
  const service=group('后侧少量补全设施');
  box(1.2,.15,.8,1.95,.12,-3.85,'#bdc5c5',service,true);
  box(1.1,.16,.43,1.95,.275,-3.66,'#d0d6d6',service,true);
  box(.55,.12,.5,2.7,.105,-4.4,'#b5c8c5',service,true);box(.4,.025,.35,2.7,.17,-4.4,'#647d87',service);
  tube([[2.82,.15,-4.6],[2.82,.95,-4.6],[2.82,.95,-4.38]],.024,C.frame,service);
  box(.26,.35,.12,5.73,1.65,-1.3,'#b5c8c5',service,true);tube([[5.73,2.5,-1.3],[5.73,1.82,-1.3]],.018,C.edge,service);
  // User-approved exterior stays intact. This pole stands outside the west wall,
  // inside the same plot; its arm and shade are attached three-dimensional parts.
  const streetLamp=group('院外左侧电杆与电灯',-6.78,0,-1.8);
  box(.29,.28,.3,0,.14,0,'#8b9eaa',streetLamp,true);
  box(.21,6.15,.23,0,3.075,0,'#9db3c0',streetLamp,true);
  box(.24,.16,2.2,0,5.61,0,'#7f9b6a',streetLamp,true);
  for(const z of [-.88,-.57,.57,.88]){
    cylinder(.035,.035,.17,0,5.76,z,'#747d81',streetLamp,8);
    cylinder(.065,.06,.11,0,5.855,z,'#e4ece5',streetLamp,10);
    ellipsoid(.065,.075,.065,0,5.91,z,'#e4ece5',streetLamp);
    cylinder(.082,.082,.025,0,5.84,z,'#d4e0da',streetLamp,10);
  }
  for(const y of [4.81,5.59])box(.24,.065,.26,0,y,0,'#74868d',streetLamp,true);
  tube([[0,4.81,0],[.13,4.81,.27],[.36,4.8,.7],[.36,4.76,.77]],.032,'#818f84',streetLamp);
  const shade=group('倾斜喇叭形浅黄色灯罩',.36,4.65,.88,0,streetLamp);shade.rotation.x=-.85;
  cylinder(.055,.24,.28,0,0,0,'#dbe0bc',shade,20).scale.z=1.25;
  cylinder(.245,.245,.028,0,-.14,0,'#a2af9d',shade,20).scale.z=1.25;
  cylinder(.219,.219,.014,0,-.158,0,'#fff2b0',shade,20).scale.z=1.25;
  const tag=box(.14,.28,.025,.055,1.12,.137,'#e8e3c9',streetLamp,true);tag.rotation.z=-.24;
  shade.updateWorldMatrix(true,false);
  const lampMouth={center:shade.localToWorld(new THREE.Vector3(0,-.172,0)),axisX:new THREE.Vector3(1,0,0).transformDirection(shade.matrixWorld),axisZ:new THREE.Vector3(0,0,1).transformDirection(shade.matrixWorld),radiusX:.222,radiusZ:.2775};
  W.finish();
  const environment=createEnvironment(root,{lampMouth});
  root.userData.specification=specification;root.userData.tileCount=tileCount;root.userData.openings=openings;
  root.userData.design={roof:'single-gable',gate:{axis:'corner',x:-6.45,z:4.05,width:3.3,frontReturnGap:.85,railings:false},door:{x:-3.3,z:2.7,normal:'+Z'},roofTop:5.02,treeTop:7.5,windowColor:C.glass,westWindowBars:2,entranceTuftsRemoved:true,shrubTones:3,treeTrunkRadius:.36};
  const b=(x,z,w,d,height)=>({x,z,w,d,height});
  return {root,type:'sakura-house',specification,colliders:[b(-.45,-.4,8.5,6.2,2.95),b(4.7,-.05,1.8,5.5,2.65),b(-6.45,-2.025,.2,8.85,1.56),b(.425,5.7,12.05,.2,1.56),b(6.45,-.375,.2,12.15,1.56),b(0,-6.45,12.9,.2,1.56)],occluders:[b(-.45,-.4,9.5,7.3,5.02),b(4.93,.025,2.22,6.35,3.1)],roofs:[],lamps:[],floors:[{x:0,z:0,w:14,d:14,height:.045}],setEnvironment:environment.setEnvironment,updateEnvironment:environment.update,getEnvironmentState:environment.inspect,dispose(){environment.dispose();W.dispose();}};
}


