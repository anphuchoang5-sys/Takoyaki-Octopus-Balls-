import {workshop} from './workshop.js';

export const entrySpecification={revision:'entry-02',artApproved:false,note:'门厅改暖黄横向板缝，柜子沿墙靠近台阶；柜下收纳物、盆花背面及尺寸为补全，未同步室外建筑。'};
export const entryHallColors={floor:'#e5c34f',joint:'#b89a43',cap:'#c5a33d',riser:'#887553',post:'#8e6647'};

export function createEntryRoom(){
 const W=workshop(),{THREE,root,group,mesh,box,ellipsoid,cyl,tube,batch}=W;
 root.name='玄关精修';root.position.set(10.32,-.16,.88);root.rotation.y=Math.PI/2;
 const wood='#b28b4c',edge='#93713e',top='#b69765',dark='#775f3b';
 const cabinet=group('玄01 木鞋柜');
 for(const x of [-.49,.49])for(const z of [-.155,.155])box(.055,.15,.055,x,.075,z,edge,cabinet);
 box(1.10,.035,.40,0,.1675,0,edge,cabinet);box(1.10,.645,.025,0,.4925,-.1875,wood,cabinet);
 for(const x of [-.535,.535])box(.035,.645,.40,x,.4925,0,wood,cabinet);
 box(1.16,.045,.44,0,.8375,0,top,cabinet);box(1.10,.028,.42,0,.801,0,edge,cabinet);
 for(const [i,x,z]of[[0,-.265,.213],[1,.265,.245]]){
  box(.548,.598,.018,x,.490,z,wood,cabinet);
  for(const xx of [x-.26,x+.26])box(.012,.579,.006,xx,.490,z+.011,edge,cabinet,false);
  for(const y of [.207,.773])box(.523,.012,.006,x,y,z+.011,edge,cabinet,false);
  const hx=i===0?-.465:.465;box(.016,.11,.002,hx,.495,z+.010,dark,cabinet,false);
  for(const xx of [hx-.012,hx+.012])box(.004,.12,.004,xx,.495,z+.012,top,cabinet,false);
 }
 for(const z of [.214,.247])box(1.10,.009,.007,0,.188,z,dark,cabinet,false);
 // Restrained short marks suggest wood grain; the boards, recessed panels and rails have actual depth.
 for(const [x,y,z]of[[-.40,.70,.225],[-.19,.28,.225],[.30,.69,.257],[.44,.26,.257]])box(.002,.035,.001,x,y,z,edge,cabinet,false);
 batch(cabinet);
 const stored=group('玄03 柜下收纳');for(const [x,c]of[[-.30,'#749caf'],[.28,'#bc8ba5']]){box(.26,.09,.25,x,.045,.015,c,stored);box(.27,.012,.26,x,.096,.015,c,stored);}batch(stored);
 const plant=group('玄02 盆花');plant.position.y=.86;
 box(.53,.024,.205,0,.012,0,'#d8c14e',plant);
 for(const z of [-.115,.115]){const m=box(.595,.084,.022,0,.062,z,'#dfca58',plant);m.rotation.x=z<0?.28:-.28;}
 for(const x of [-.288,.288]){const m=box(.022,.084,.228,x,.062,0,'#dfca58',plant);m.rotation.z=x<0?-.28:.28;}
 for(const z of [-.13,.13])box(.63,.021,.024,0,.108,z,'#ead779',plant);
 for(const x of [-.303,.303])box(.024,.021,.26,x,.108,0,'#ead779',plant);
 box(.56,.012,.205,0,.084,0,'#655c3d',plant,false);
 const clumps=[[-.25,.185,.015,.105,.086,.10],[-.14,.225,-.045,.12,.112,.115],[.015,.25,-.045,.14,.12,.11],[.18,.23,-.025,.115,.10,.12],[.27,.18,.025,.095,.075,.09],[-.19,.18,.09,.115,.077,.08],[-.04,.19,.11,.13,.09,.075],[.12,.18,.10,.13,.085,.08]];
 for(const [i,[x,y,z,rx,ry,rz]]of clumps.entries()){
  tube([[x*.8,.09,z*.7],[x,.15,z],[x,y,z]],.008,'#4e8949',plant);ellipsoid(rx*.90,ry*.90,rz*.90,x,y,z,['#3e9150','#4d9c52','#579f52'][i%3],plant);
  for(let j=0;j<14;j++){const a=j*2.399+i*.7,ny=-.35+j/13*1.33,s=Math.sqrt(1-ny*ny),normal=new THREE.Vector3(Math.cos(a)*s,ny,Math.sin(a)*s),leaf=mesh(new THREE.SphereGeometry(1,12,8),['#418e4b','#529b50','#61a75a'][(i+j)%3],plant,false);leaf.scale.set(.034,.011,.052);leaf.position.set(x+normal.x*rx*.89,y+normal.y*ry*.89,z+normal.z*rz*.89);leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);}
 }
 for(const [x,y,z]of[[-.20,.285,.10],[-.07,.355,.015],[.14,.33,.035],[.265,.23,.092],[.032,.27,.17]]){
  const flower=group('花朵',plant);flower.position.set(x,y,z);flower.rotation.x=.64;
  for(let i=0;i<6;i++){const a=i*Math.PI/3,p=ellipsoid(.016,.008,.022,Math.cos(a)*.020,0,Math.sin(a)*.020,'#eaa14b',flower);p.rotation.y=-a+Math.PI/2;}
  cyl(.013,.014,.011,0,.008,0,'#f1d46b',flower,16);
 }
 batch(plant);
 // Move the finished group so batching preserves the existing cabinet/flower geometry exactly.
 root.position.z=1.18;
 return {root,specification:entrySpecification,obstacles:[{name:'玄关鞋柜',x:10.32,z:1.18,w:.50,d:1.16}],dispose:W.dispose};
}

export function addEntryFloor(W,g){
 const {box,cyl}=W;box(1.82,.002,1.82,10.92,-.161,.91,'#c5c7c4',g,false);
 let seed=7261;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<180;i++){const x=10.08+random()*1.68,z=.07+random()*1.68,r=.0018+random()*.0025;cyl(r,r,.00025,x,-.159875,z,i%3===0?'#adb3b1':'#b9bebb',g,6);}
}

// Runs within the house workshop so door materials/geometries keep its existing ownership.
export function addEntryDoor(W,cg,len,height){
 const {THREE,group,box,mesh,batch}=W,frame='#c1ccd3',edge='#869ba8',ph=height-.055,pw=(len-.075)/2+.012;
 const rails=group('玄关门双轨',cg);
 for(const x of [.018,len-.018])box(.048,height+.02,.026,x,height/2,-.086,frame,rails);
 box(len,.055,.15,len/2,height-.01,0,frame,rails);
 box(len,.012,.15,len/2,.006,0,edge,rails);
 for(const z of [-.040,.040]){box(len,.009,.008,len/2,.0165,z,'#647885',rails,false);box(len,.009,.011,len/2,height-.036,z,'#647885',rails,false);}
 batch(rails);const motion=[];
 for(let i=0;i<2;i++){
  const leaf=group('玄关门扇 '+i,cg),p=group('玄关门板几何',leaf),bottom=.025,split=.56,top=bottom+ph;
  for(const x of [.022,pw-.022])box(.044,ph,.052,x,bottom+ph/2,0,frame,p);
  for(const y of [bottom+.022,split,top-.022])box(pw,.044,.052,pw/2,y,0,frame,p);
  box(pw-.085,split-bottom-.055,.021,pw/2,(split+bottom)/2,0,'#b8c6cf',p);
  // A shallow inner panel is visible from the room without changing the outer steel-coloured face.
  box(pw-.105,split-bottom-.075,.006,pw/2,(split+bottom)/2,.014,'#a28a64',p,false);
  const glass=mesh(new THREE.PlaneGeometry(pw-.082,top-split-.066),'#586fb1',p,false);glass.position.set(pw/2,(top+split)/2,0);
  glass.material=new THREE.MeshBasicMaterial({color:'#586fb1',vertexColors:true,transparent:true,opacity:.94,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});W.materialSet.add(glass.material);
  for(let j=1;j<8;j++){const x=.042+(pw-.084)*j/8;box(.012,top-split-.04,.033,x,(top+split)/2,0,edge,p,false);box(.005,top-split-.04,.003,x-.004,(top+split)/2,-.019,'#d4dbe1',p,false);}
  for(const y of [split+(top-split)*.36,split+(top-split)*.72])box(pw-.07,.014,.038,pw/2,y,0,edge,p,false);
  const hx=i===0?.057:pw-.057;for(const side of [-1,1]){box(.017,.13,.002,hx,.91,side*.027,'#526777',p,false);for(const x of [hx-.013,hx+.013])box(.004,.142,.003,x,.91,side*.028,frame,p,false);}
  const closedPosition=[.035+i*(pw-.024),0,i===0?-.040:.040],openPosition=[.035,0,closedPosition[2]];
  leaf.position.fromArray(closedPosition);leaf.userData={motion:'slide',closedPosition,openPosition,travel:closedPosition[0]-.035,room:'entry'};batch(p);motion.push({leaf,closedPosition,openPosition,angle:0,closed:false});
 }
 return motion;
}
