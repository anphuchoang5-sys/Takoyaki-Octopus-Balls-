import {workshop} from './workshop.js';

export const washSpecification={id:'sakura-washroom',revision:'wash-02',bounds:[-.60,.31,1.82,2.73],reference:'wash-01-anime.jpg',artApproved:false,supplement:'按用户确认局部扩建卫浴、改两处推拉门；尺寸及隐藏结构为补全，门边设备按用户说明作鞋套机'};
export const washColors={floor:'#d7ae4c',wall:'#f2d596'};

export function createWashRoom(){
 const W=workshop(),{THREE,root,group,mesh,box,cyl,ellipsoid,tube,batch}=W;
 root.name='洗面室精修';const entries=[],obstacles=[],wallDecor=[];
 const C={wood:'#856749',dark:'#61503e',yellow:'#e2ce7e',ceramic:'#f5f0d8',basin:'#a7c5ca',metal:'#a1b4b7',edge:'#758a90',wicker:'#bf8d34',rim:'#d6ae58',green:'#68a86a'};
 const anchor=[1.49,0,1.60,-Math.PI/2];
 function part(id,name,at,fn,footprint=null,wall=false){const g=group(id+' '+name);g.position.set(...at.slice(0,3));g.rotation.y=at[3]||0;g.userData={room:'wash',checklist:id};fn(g);batch(g);entries.push({id,name,group:g});if(wall)wallDecor.push(g);if(footprint){const [w,d]=footprint,c=Math.abs(Math.cos(g.rotation.y)),s=Math.abs(Math.sin(g.rotation.y));obstacles.push({name:g.name,x:at[0],z:at[2],w:w*c+d*s,d:d*c+w*s});}return g;}
 function outline(w,d,r){r=Math.min(r,w/2,d/2);const s=new THREE.Shape(),x=-w/2,y=-d/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+d-r);s.quadraticCurveTo(x+w,y+d,x+w-r,y+d);s.lineTo(x+r,y+d);s.quadraticCurveTo(x,y+d,x,y+d-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
 function slab(g,w,d,r,h,x,y,z,color,hole=null){const shape=outline(w,d,r);if(hole){const p=outline(hole[0],hole[1],hole[2]);const pts=p.getPoints(5).map(v=>new THREE.Vector2(v.x+(hole[3]||0),v.y-(hole[4]||0)));shape.holes.push(new THREE.Path(pts));}const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:6});geo.rotateX(-Math.PI/2);const m=mesh(geo,color,g,false);m.position.set(x,y,z);return m;}
 function loop(w,d,r,y){const points=[];for(const [x,z,a] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<=6;i++){const t=a+i*Math.PI/12;points.push([x+Math.cos(t)*r,y,z+Math.sin(t)*r]);}return points;}
 function rim(g,w,d,r,y,t,color,x=0,z=0){const pts=loop(w,d,r,y).map(p=>[p[0]+x,p[1],p[2]+z]);pts.push(pts[0]);tube(pts,t,color,g);}
 function cup(g,x,z,color){const points=[[.001,0],[.029,0],[.033,.008],[.039,.113],[.034,.113],[.028,.013],[.001,.013]].map(p=>new THREE.Vector2(...p));const m=mesh(new THREE.LatheGeometry(points,24),color,g,false);m.position.set(x,.811,z);const ring=mesh(new THREE.TorusGeometry(.0365,.0025,6,28),color,g,false);ring.rotation.x=Math.PI/2;ring.position.set(x,.924,z);}
 function brush(g,x,y,z,color){box(.009,.14,.008,x,y+.07,z,color,g,false);box(.015,.035,.010,x,y+.154,z,color,g,false);for(let k=0;k<5;k++)box(.014,.0035,.010,x,y+.141+k*.006,z+.008,'#eeeede',g,false);}

 // Four cabinet walls leave room for a real recessed basin instead of a painted patch.
 part('洗01','暖黄台面与棕木洗手柜',anchor,g=>{
  box(.69,.055,.47,0,.0275,0,C.dark,g);box(.68,.03,.45,0,.075,0,C.wood,g);
  for(const x of [-.334,.334])box(.032,.65,.47,x,.405,0,C.wood,g);
  box(.63,.65,.025,0,.405,-.223,C.dark,g);box(.63,.61,.029,0,.405,.225,'#947653',g);
  box(.012,.60,.005,0,.405,.243,'#6f5942',g,false);
  for(const x of [-.045,.045])box(.014,.056,.014,x,.54,.248,'#c1ad79',g,false);
  slab(g,.74,.53,.012,.057,0,.754,0,C.yellow,[.54,.40,.064,.055,.015]);
  slab(g,.56,.42,.065,.017,.055,.811,.015,C.ceramic,[.45,.30,.065,0,0]);
  const upper=loop(.45,.30,.065,.817),lower=loop(.30,.17,.048,.682),p=[],ix=[];
  for(const a of [...upper,...lower])p.push(a[0]+.055,a[1],a[2]+.015);
  const n=upper.length;for(let i=0;i<n;i++){const j=(i+1)%n;ix.push(i,j+n,j,i,i+n,j+n);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();mesh(geo,C.basin,g,false);
  slab(g,.302,.172,.048,.01,.055,.673,.015,'#b6ced0');
  cyl(.027,.027,.003,.055,.685,.015,'#768d91',g,24);const drain=mesh(new THREE.TorusGeometry(.024,.003,6,28),'#c6d4d0',g,false);drain.rotation.x=Math.PI/2;drain.position.set(.055,.687,.015);
  for(const x of [-.009,0,.009])box(.002,.001,.026,.055+x,.689,.015,'#4d686e',g,false);
 },[.74,.53]);
 part('洗02','弯管水龙头和台面杯具',anchor,g=>{
  cyl(.035,.035,.018,.12,.831,-.208,'#a4b9ba',g);tube([[.12,.84,-.208],[.12,.965,-.208],[.12,.994,-.17],[.12,.987,-.075],[.12,.963,-.054]],.013,'#c6d5cf',g);
  box(.064,.012,.016,.12,.956,-.22,'#d7dfd5',g,false);
  cup(g,-.278,.15,'#75b6d5');cup(g,-.277,-.085,'#65a580');
  brush(g,-.289,.882,-.081,'#dfc674');brush(g,-.269,.885,-.087,'#d87982');
 });
 part('洗03','竖向蓝色薄边镜子',anchor,g=>{
  box(.623,1.02,.009,.045,1.60,-.255,'#60758c',g,false);box(.61,1.008,.003,.045,1.60,-.248,'#617ec4',g,false);
  const shape=new THREE.Shape();shape.moveTo(-.257,1.10);shape.lineTo(-.122,1.10);shape.lineTo(.22,2.104);shape.lineTo(.087,2.104);shape.closePath();const glint=mesh(new THREE.ShapeGeometry(shape),'#8098d8',g,false);glint.position.z=-.2455;
  const shape2=new THREE.Shape();shape2.moveTo(-.049,1.10);shape2.lineTo(.014,1.10);shape2.lineTo(.349,2.083);shape2.lineTo(.349,2.104);shape2.lineTo(.292,2.104);shape2.closePath();const light=mesh(new THREE.ShapeGeometry(shape2),'#6e8bcf',g,false);light.position.z=-.2454;
 },null,true);
 part('洗04','墙挂牙刷架与五支牙刷',anchor,g=>{
  const plate=outline(.286,.072,.006);for(let i=0;i<5;i++){const hole=new THREE.Path();hole.absarc(.043+i*.0576-.16,0,.0067,0,Math.PI*2,true);plate.holes.push(hole);}const plateGeo=new THREE.ExtrudeGeometry(plate,{depth:.012,bevelEnabled:false,curveSegments:8});plateGeo.rotateX(-Math.PI/2);const holder=mesh(plateGeo,'#e4e7d9',g,false);holder.position.set(.16,1.279,-.198);
  for(const x of [.026,.294]){box(.012,.065,.014,x,1.31,-.237,'#8ea6ab',g,false);box(.012,.012,.058,x,1.286,-.21,'#e4e7d9',g,false);}
  ['#b75669','#8da872','#dfd9a3','#6c99c1','#d97c91'].forEach((c,i)=>brush(g,.043+i*.0576,1.1545,-.198,c));
 },null,true);
 part('洗05','墙挂金属篮与折叠布料',[1.49,0,.83,-Math.PI/2],g=>{
  for(const z of [-.24,.014]){box(.49,.012,.012,0,1.32,z,C.metal,g,false);box(.49,.012,.012,0,1.435,z,C.metal,g,false);}
  for(const x of [-.239,.239]){box(.012,.012,.264,x,1.32,-.113,C.metal,g,false);box(.012,.012,.264,x,1.435,-.113,C.metal,g,false);}
  for(let x=-.225;x<.24;x+=.045){box(.006,.115,.007,x,1.378,.014,'#b1bec0',g,false);box(.006,.007,.247,x,1.323,-.113,C.edge,g,false);}
  for(const x of [-.239,.239])for(let z=-.21;z<.01;z+=.046)box(.006,.115,.006,x,1.378,z,C.metal,g,false);
  for(const x of [-.215,.215]){tube([[x,1.438,.012],[x,1.59,-.246]],.0035,C.edge,g);const hook=mesh(new THREE.TorusGeometry(.012,.003,6,18),C.edge,g,false);hook.position.set(x,1.601,-.25);const screw=cyl(.004,.004,.014,x,1.611,-.259,C.edge,g,10);screw.rotation.x=Math.PI/2;}
  function cloth(w,d,y,h,color){const geo=new THREE.BoxGeometry(w,h,d,12,6,8),p=geo.attributes.position,r=.023,core=new THREE.Vector3(w/2-r,h/2-r,d/2-r),v=new THREE.Vector3(),q=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);q.copy(v).clamp(core.clone().negate(),core);const offset=v.clone().sub(q).normalize().multiplyScalar(r);q.add(offset);if(q.y>0)q.y+=.004*Math.cos(q.x*9)*Math.cos(q.z*12);p.setXYZ(i,q.x,q.y+h/2,q.z);}geo.computeVertexNormals();const m=mesh(geo,color,g,false);m.position.set(0,y,-.111);rim(g,w-.004,d-.004,.023,y+h*.45,.0022,color==='#b2ce82'?'#93af69':'#88aeb8',0,-.111);}
  cloth(.447,.236,1.329,.065,'#9ec4d1');cloth(.451,.240,1.394,.058,'#abcdd5');cloth(.456,.244,1.452,.077,'#b2ce82');
 },null,true);
 part('洗06','敞口编织篮与金属落地架',[1.425,0,.80,-Math.PI/2],g=>{
  for(const x of [-.205,.205])for(const z of [-.183,.183])box(.014,.52,.014,x,.26,z,C.edge,g,false);
  for(const x of [-.205,.205])box(.014,.014,.38,x,.075,0,C.metal,g,false);
  for(const z of [-.183,.183])box(.424,.014,.014,0,.075,z,C.metal,g,false);
  for(let x=-.175;x<.19;x+=.058)box(.009,.012,.366,x,.075,0,C.edge,g,false);
  for(const z of [-.173,.173])box(.412,.018,.015,0,.237,z,C.edge,g,false);
  slab(g,.352,.297,.024,.018,0,.24,0,'#ae7e31');
  const bottom=loop(.35,.295,.025,.258),top=loop(.444,.374,.035,.535),n=bottom.length,p=[],ix=[];
  for(const v of [...bottom,...top])p.push(...v);for(let i=0;i<n;i++){const j=(i+1)%n;ix.push(i,i+n,j,j,i+n,j+n);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();mesh(geo,C.wicker,g,false);
  // An inner shell gives the basket actual wall thickness and a visible interior.
  const innerBottom=loop(.330,.275,.025,.262),innerTop=loop(.424,.354,.032,.535),p2=[],ix2=[];for(const v of [...innerBottom,...innerTop])p2.push(...v);for(let i=0;i<n;i++){const j=(i+1)%n;ix2.push(i,j,i+n,j,j+n,i+n);}const gi=new THREE.BufferGeometry();gi.setAttribute('position',new THREE.Float32BufferAttribute(p2,3));gi.setIndex(ix2);gi.computeVertexNormals();mesh(gi,'#c89b47',g,false);
  rim(g,.442,.372,.035,.535,.014,C.rim);
  for(let y=.285;y<.518;y+=.028){const t=(y-.258)/.277;rim(g,.35+.094*t+.003,.295+.079*t+.003,.026+.009*t,y,.0022,'#b1853c');}
  for(let x=-.155;x<=.155;x+=.044){for(const sign of [-1,1])tube([[x*.8,.266,sign*.150],[x,.40,sign*.168],[x*1.18,.521,sign*.187]],.0025,'#d0a44d',g);}
  for(const sign of [-1,1])for(let z=-.11;z<=.12;z+=.048)tube([[sign*.177,.266,z*.8],[sign*.198,.40,z],[sign*.224,.521,z*1.17]],.0025,'#d0a44d',g);
 },[.474,.404]);
 part('洗07','绿黄回环长地毯',[.82,0,1.60,0],g=>{
  slab(g,.72,1.65,.19,.008,0,0,0,C.green);
  slab(g,.63,1.55,.16,.0008,0,.0082,0,'#efd16b',[.51,1.43,.12,0,0]);
  slab(g,.37,1.29,.11,.0008,0,.0082,0,'#efd16b',[.25,1.17,.077,0,0]);
  slab(g,.10,1.02,.05,.0008,0,.0082,0,'#efd16b');
 });
 part('洗08','门边矮式鞋套机',[1.49,0,2.30,-Math.PI/2],g=>{
  slab(g,.34,.40,.039,.035,0,0,0,'#5d6a6d');slab(g,.342,.398,.037,.070,0,.035,0,'#a5b5b5');
  const lid=outline(.281,.337,.022);for(const x of [-.065,.065])lid.holes.push(new THREE.Path(outline(.078,.228,.033).getPoints(6).map(p=>new THREE.Vector2(p.x+x,p.y))));const lidGeo=new THREE.ExtrudeGeometry(lid,{depth:.008,bevelEnabled:false,curveSegments:6});lidGeo.rotateX(-Math.PI/2);const top=mesh(lidGeo,'#ae6670',g,false);top.position.y=.105;
  for(const x of [-.065,.065])slab(g,.078,.228,.033,.001,x,.105,0,'#4d555e');
  slab(g,.070,.059,.012,.001,.065,.106,.079,'#c3d9d7');
 },[.342,.40]);
 const lining=part('洗09','洗面室内侧暖黄饰面',[0,0,0],g=>{
  const col=washColors.wall;
  box(.008,2.45,2.30,1.752,1.225,1.52,col,g,false);
  for(const [z0,z1] of [[.37,1.36],[2.08,2.67]])box(.008,2.45,z1-z0,-.532,1.225,(z0+z1)/2,col,g,false);
  box(.008,1.13,.72,-.532,.565,1.72,col,g,false);box(.008,.49,.72,-.532,2.205,1.72,col,g,false);
  for(const [z,a,b] of [[.374,.52,1.36],[2.666,.45,1.4]]){box(a+.54,2.45,.008,(a-.54)/2,1.225,z,col,g,false);box(1.76-b,2.45,.008,(b+1.76)/2,1.225,z,col,g,false);box(b-a,.42,.008,(a+b)/2,2.24,z,col,g,false);}
 },null,true);
 function setWallMode(mode){for(const g of wallDecor)g.visible=mode==='full';}
 return {root,entries,obstacles,wallDecor,lining,specification:washSpecification,setWallMode,dispose:W.dispose};
}
