import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {kitchenArt} from './kitchen-art.js';
export const kitchenColors={wall:'#73cba7',floor:'#b0dca6',skirt:'#4b7d78'};
export const kitchenSpecification={id:'sakura-kitchen',revision:'kitchen-02',artApproved:false,main:[6.37,0,10.01,2.73],extension:[5.46,-1.8,10.01,0],note:'后扩与门外落脚处为补全；饭锅按用户确认改为圆形；绿凳移至桌左侧，饭锅柜靠近门框，冰箱前杂物移除。'};
export function createKitchen(){
 const root=new THREE.Group();root.name='厨房精修';const resources=new Set(),materials=new Map(),entries=[],obstacles=[],wallDecor=[],dishItems=[],art=kitchenArt(THREE,resources);
 const C={wood:'#9b914b',edge:'#746a3d',light:'#b4a45b',blue:'#6d9bc1',metal:'#9caeb6',dark:'#4a5a5e',cream:'#f4edcd',table:'#e7c859',chair:'#ce853d'};
 const ink=new THREE.LineBasicMaterial({color:'#514e3c',transparent:true,opacity:.43,toneMapped:false});resources.add(ink);
 const group=(name,parent=root)=>{const g=new THREE.Group();g.name=name;parent.add(g);return g;};
 function mat(c,map=null,glass=false){const key=c+'|'+map+'|'+glass;if(!materials.has(key)){const m=new THREE.MeshBasicMaterial({color:c,vertexColors:true,map:map?art(map):null,transparent:glass,opacity:glass?.36:1,depthWrite:!glass,side:glass?THREE.DoubleSide:THREE.FrontSide,toneMapped:false});materials.set(key,m);resources.add(m);}return materials.get(key);}
 function mesh(geo,c,g,edge=false,map=null,glass=false){resources.add(geo);const m=new THREE.Mesh(geo,mat(c,map,glass));g.add(m);if(edge){const e=new THREE.EdgesGeometry(geo,35);resources.add(e);m.add(new THREE.LineSegments(e,ink));}return m;}
 function box(g,w,h,d,x,y,z,c,edge=true){const m=mesh(new THREE.BoxGeometry(w,h,d),c,g,edge);m.position.set(x,y,z);return m;}
 function cyl(g,rt,rb,h,x,y,z,c,open=false){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,24,1,open),c,g);m.position.set(x,y,z);return m;}
 function ell(g,rx,ry,rz,x,y,z,c){const m=mesh(new THREE.SphereGeometry(1,20,14),c,g);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
 function tube(g,p,r,c,closed=false){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.map(v=>new THREE.Vector3(...v)),closed),Math.max(16,p.length*5),r,8,closed),c,g);}
 function ring(g,r,t,x,y,z,c,rx=Math.PI/2){const m=mesh(new THREE.TorusGeometry(r,t,8,32),c,g);m.position.set(x,y,z);m.rotation.x=rx;return m;}
 function plane(g,w,h,x,y,z,map,ry=0){const m=mesh(new THREE.PlaneGeometry(w,h),'#ffffff',g,false,map);m.position.set(x,y,z);m.rotation.y=ry;return m;}
 function rounded(g,w,h,d,r,x,y,z,c){const s=new THREE.Shape(),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:5});geo.translate(0,0,-d/2);const m=mesh(geo,c,g,true);m.position.set(x,y,z);return m;}
 function part(id,name,x,z,rot,fn,footprint=null,grounded=false,wall=false){const g=group(id+' '+name);g.position.set(x,0,z);g.rotation.y=rot;g.userData={checklist:id,room:'kitchen'};fn(g);entries.push({id,name,group:g,grounded});if(footprint){const [w,d]=footprint,c=Math.abs(Math.cos(rot)),s=Math.abs(Math.sin(rot));obstacles.push({name:g.name,x,z,w:w*c+d*s,d:d*c+w*s});}if(wall)wallDecor.push(g);return g;}
 function lathe(g,p,x,y,z,c){const m=mesh(new THREE.LatheGeometry(p.map(v=>new THREE.Vector2(...v)),24),c,g);m.position.set(x,y,z);return m;}
 function bowl(g,x,y,z,r,h,c='#dce6cd'){lathe(g,[[.002,0],[r*.48,0],[r*.55,.008],[r,h*.88],[r,h],[r-.007,h],[r*.47,.019],[.002,.019]],x,y,z,c);ring(g,r-.003,.003,x,y+h,z,'#9eb6c1');}
 function plate(g,x,y,z,r,c='#e8ecd8'){bowl(g,x,y,z,r,.017,c);}
 function cup(g,x,y,z,r=.037,h=.10,c='#d9e5dd'){lathe(g,[[.002,0],[r*.80,0],[r,.01],[r,h],[r-.005,h],[r-.006,.014],[.002,.014]],x,y,z,c);ring(g,r-.002,.0025,x,y+h,z,'#a5bdc5');}
 function bottle(g,x,y,z,r,h,c){lathe(g,[[.002,0],[r*.9,0],[r,.015],[r,h*.69],[r*.4,h*.83],[r*.36,h],[.002,h]],x,y,z,c);cyl(g,r*.43,r*.43,.024,x,y+h+.012,z,'#56856b');}
 function pull(g,x,y,z,w=.055){box(g,w+.018,.085,.007,x,y,z,'#c1c4b0',false);box(g,w,.064,.009,x,y,z+.005,'#566d79',false);box(g,w-.014,.047,.009,x,y,z+.010,'#a0b2c0',false);}
 function cupboard(g,w,h,d,noTop=false){box(g,w,.06,d,0,.03,0,C.edge);box(g,w-.03,h-.09,.035,0,h/2,-d/2+.017,C.wood);for(const x of [-w/2+.025,w/2-.025])box(g,.05,h-.06,d,x,h/2+.03,0,C.wood);if(!noTop)box(g,w,.036,d,0,h-.018,0,C.light);for(const s of [-1,1]){box(g,w/2-.025,h-.11,.026,s*w/4,h/2+.025,d/2-.004,C.wood);pull(g,s*.055,h*.68,d/2+.014);}}
 function tin(g,x,y,z,r,h,c){cyl(g,r,r,h,x,y+h/2,z,c);cyl(g,r+.003,r+.003,.013,x,y+h+.0065,z,c);ring(g,r,.002,x,y+h*.48,z,'#7e8177');}
 function teapot(g,x,y,z){ell(g,.085,.067,.074,x,y+.068,z,'#a57d4d');cyl(g,.060,.068,.012,x,y+.134,z,'#977047');ell(g,.012,.012,.012,x,y+.152,z,C.edge);tube(g,[[x+.055,y+.075,z],[x+.108,y+.078,z],[x+.133,y+.115,z]],.018,'#a57d4d');tube(g,[[x-.060,y+.112,z],[x-.11,y+.13,z],[x-.12,y+.055,z],[x-.065,y+.04,z]],.009,C.edge);}
 // The fridge is deliberately low, with a single door and a vented plinth.
 part('厨01','奶油色矮冰箱与顶箱',6.70,-1.39,0,g=>{
  rounded(g,.66,1.20,.61,.025,0,.66,0,C.cream);box(g,.63,.12,.60,0,.06,0,'#8b9698');for(let x=-.285;x<.30;x+=.025)box(g,.006,.10,.006,x,.062,.305,'#55656d',false);
  rounded(g,.63,1.12,.035,.016,0,.678,.32,C.cream);box(g,.027,.49,.035,-.246,.79,.357,C.blue);ell(g,.017,.025,.020,-.246,1.035,.357,C.blue);plane(g,.145,.19,.105,.91,.341,'note');
  for(let i=0;i<8;i++){const t=i*Math.PI/4;ell(g,.013,.020,.006,.105+.026*Math.cos(t),1.045+.026*Math.sin(t),.348,'#e7bc4a');}ell(g,.018,.019,.008,.105,1.045,.355,'#ca8b34');
  box(g,.68,.033,.64,0,1.277,0,'#b2925c');rounded(g,.58,.15,.51,.015,0,1.367,0,'#6fb660');box(g,.60,.032,.53,0,1.458,0,'#91c26d');rounded(g,.52,.22,.43,.022,0,1.577,-.015,'#6496cf');box(g,.52,.008,.006,0,1.54,.204,'#486e9e',false);
 },[.68,.65],true);
 part('厨02','水槽柜与连续备餐台',8.02,-1.40,0,g=>{
  cupboard(g,1.85,.79,.64,true);box(g,.014,.035,.66,.932,.825,0,'#a7c5cd');
  // Separate slabs around a 0.79 x 0.43 m cavity: there is no solid top under it.
  const sx=-.38;box(g,.15,.035,.66,-.85,.825,0,'#a7c5cd');box(g,.89,.035,.66,.48,.825,0,'#a7c5cd');for(const z of [-.283,.283])box(g,.81,.035,.094,sx,.825,z,'#a7c5cd');
  for(const x of [sx-.395,sx+.395])box(g,.02,.19,.47,x,.72,0,'#7da1b5');for(const z of [-.225,.225])box(g,.79,.19,.02,sx,.72,z,'#799dad');box(g,.78,.02,.44,sx,.632,0,'#8fb0bf');cyl(g,.025,.025,.003,sx+.1,.644,.035,C.dark);ring(g,.029,.004,sx+.1,.646,.035,'#c4d5d5');
  box(g,1.85,.085,.025,0,.86,-.32,C.metal);tube(g,[[sx,.85,-.27],[sx,1.06,-.27],[sx,1.095,-.13],[sx,1.01,-.06]],.014,C.metal);cyl(g,.025,.028,.045,sx,.918,-.27,C.dark);box(g,.105,.012,.018,sx,.943,-.27,C.metal);ell(g,.027,.010,.021,sx,1.07,-.27,C.metal);
  cup(g,sx-.21,.645,.015,.075,.14,'#6eab62');for(let i=0;i<4;i++)plate(g,.57,.844+i*.018,.055,.13);for(let i=0;i<3;i++){const p=group('槽中碟子',g);p.position.set(sx+.13+i*.041,.665,.03);p.rotation.z=.35;plate(p,0,0,0,.084);}
 },[1.85,.66],true);
 part('厨03','低灶柜与蓝灰双眼燃气灶',9.45,-1.40,0,g=>{
  cupboard(g,.94,.64,.65);box(g,.98,.19,.65,0,.745,0,'#9aafbf');box(g,.98,.035,.66,0,.854,0,'#b8cbd7');
  for(const x of [-.27,.27]){cyl(g,.10,.10,.012,x,.879,-.015,'#748898');ring(g,.115,.007,x,.891,-.015,'#53636e');for(let i=0;i<4;i++){const a=i*Math.PI/2,t=box(g,.083,.013,.015,x+Math.cos(a)*.097,.902,-.015+Math.sin(a)*.097,'#4d5d64',false);t.rotation.y=-a;}}
  for(let x=-.061;x<.075;x+=.026)box(g,.011,.006,.24,x,.877,-.015,'#697b8b',false);
  rounded(g,.29,.082,.013,.015,.055,.75,.335,'#6f8494');rounded(g,.245,.056,.010,.009,.055,.75,.345,'#445e71');
  for(const x of [-.39,-.22,.36]){const n=cyl(g,.031,.031,.022,x,.75,.351,'#f0e6c7');n.rotation.x=Math.PI/2;box(g,.007,.047,.008,x,.75,.366,'#ae9b58',false);}for(let y=.70;y<.81;y+=.027)box(g,.006,.008,.28,-.494,y,-.02,'#566b75',false);
 },[.99,.67],true);
 part('厨04','窗台洗剂海绵与调味瓶',8.03,-1.69,0,g=>{
  box(g,1.86,.055,.24,0,1.055,0,'#d0dfc4');box(g,1.86,.035,.018,0,1.023,.125,kitchenColors.skirt);
  bottle(g,-.62,1.083,.017,.051,.26,'#e4cf72');box(g,.059,.068,.006,-.62,1.21,.066,'#d9eee0',false);
  rounded(g,.15,.026,.11,.010,-.38,1.096,.025,'#5e985c');ell(g,.055,.017,.036,-.38,1.118,.025,'#dec86b');
  bottle(g,.60,1.083,0,.054,.35,'#d7bd76');bottle(g,.76,1.083,0,.056,.39,'#494d4f');box(g,.096,.082,.106,.76,1.345,0,'#884c5a',false);
 },null,false,true);
 part('厨05','燃气阀与悬挂厨具',9.43,-1.72,0,g=>{
  rounded(g,.65,.055,.028,.020,-.03,1.75,0,'#d2d78a');for(let i=0;i<4;i++){const x=-.28+i*.165;ell(g,.014,.014,.019,x,1.75,.02,'#5d9656');tube(g,[[x,1.75,.04],[x,1.70,.055],[x,1.66,.04]],.004,C.dark);cyl(g,.011,.011,.24,x,1.52,.04,'#79a558');}
  ell(g,.046,.011,.052,-.28,1.365,.056,C.metal);tube(g,[[-.28,1.40,.04],[-.28,1.37,.07]],.006,C.metal);box(g,.075,.058,.011,-.115,1.355,.04,C.metal);
  for(let i=0;i<4;i++){const x=.05,t=i*Math.PI/2;tube(g,[[x,1.40,.04],[x+.034*Math.cos(t),1.30,.04+.034*Math.sin(t)],[x,1.265,.04],[x-.034*Math.cos(t),1.30,.04-.034*Math.sin(t)],[x,1.40,.04]],.0025,C.metal);}
  for(const x of [.204,.222])cyl(g,.003,.004,.39,x,1.39,.04,'#b89a59');
  tube(g,[[.40,1.0,.02],[.40,1.07,.02],[.34,1.07,.02]],.018,C.dark);box(g,.085,.01,.017,.39,1.115,.02,C.metal);tube(g,[[.34,1.07,.02],[.30,1.03,.07],[.33,.90,.10]],.010,'#677b75');
  tube(g,[[.40,2.32,0],[.40,1.53,0]],.0025,C.dark);tube(g,[[.40,1.53,0],[.373,1.48,0],[.427,1.48,0],[.40,1.53,0]],.004,C.metal);
 },null,false,true);
 part('厨06','棕色三角边地毯',8.30,-.71,0,g=>{box(g,2.20,.012,.51,0,.006,0,'#9d794c',false);const p=plane(g,2.18,.49,0,.0122,0,'runner');p.rotation.x=-Math.PI/2;for(const s of [-1,1])for(let z=-.235;z<.24;z+=.018)box(g,.055,.003,.004,s*1.121,.004,z,'#82633f',false);},null,true);
 // Front reference: olive frame, 3 upper shelves + 2 lower shelves, 3 drawers, 2 bottom doors.
 part('厨07','蓝玻璃食器柜与顶箱',9.39,2.41,Math.PI,g=>{
  const w=1.07,d=.43;box(g,w,.06,d,0,.03,0,C.edge);box(g,w,.035,d,0,1.92,0,C.light);box(g,w-.04,1.86,.023,0,.96,-.203,'#678aba');for(const x of [-.513,.513])box(g,.044,1.88,d,x,.98,0,C.wood);
  for(const y of [.09,.48,.65,1.15,1.90])box(g,1.04,.035,.41,0,y,0,C.wood);
  for(const s of [-1,1]){box(g,.492,.365,.026,s*.252,.285,.215,C.wood);box(g,.013,.09,.018,s*.035,.34,.239,C.edge,false);}
  for(const x of [-.35,0,.35]){box(g,.333,.14,.029,x,.57,.216,C.wood);box(g,.10,.021,.025,x,.57,.243,'#d9c878');}
  for(const [lo,hi,levels]of[[.68,1.13,[.695,.91]],[1.18,1.88,[1.195,1.425,1.66]]]){
   for(const y of levels.slice(1))box(g,1.0,.017,.38,0,y-.009,0,'#83a7b7');
   for(const x of [-.254,.254]){box(g,.016,hi-lo,.02,x===-.254?-.495:.495,(lo+hi)/2,.229,C.wood);const pane=mesh(new THREE.PlaneGeometry(.487,hi-lo),'#6895e1',g,false,null,true);pane.position.set(x,(lo+hi)/2,.239+(x>0?.008:0));}
   box(g,.017,hi-lo,.030,0,(lo+hi)/2,.239,C.light,false);for(const x of [-.458,.458]){box(g,.013,.072,.009,x,lo+.09,.258,'#c3d3bc',false);box(g,.026,.008,.009,x+(x<0?.006:-.006),lo+.054,.258,'#c3d3bc',false);}
   for(const [i,y]of levels.entries())for(let col=0;col<4;col++){const x=-.365+col*.245,type=(i*3+col+(lo<1?2:0))%5;if(type===0){const count=3+(i+col)%3;for(let n=0;n<count;n++)bowl(g,x,y+n*.022,.055,.083,.029,'#becfd6');dishItems.push({type:'stack',count,y});}else if(type===1){cup(g,x-.040,y,.065,.033,.13,'#b9ced9');cup(g,x+.044,y,.065,.031,.105,'#d5e0da');dishItems.push({type:'cups',count:2,y});}else if(type===2){bowl(g,x,y,.06,.077,.065,'#c9d9da');bowl(g,x,y+.028,.06,.079,.065,'#c9d9da');dishItems.push({type:'bowls',count:2,y});}else if(type===3){lathe(g,[[.002,0],[.054,0],[.067,.022],[.067,.10],[.051,.13],[.002,.13]],x,y,.045,'#c3d4da');cyl(g,.054,.058,.012,x,y+.135,.045,'#d4dedb');ell(g,.014,.01,.014,x,y+.15,.045,'#b0c7d0');dishItems.push({type:'covered',count:1,y});}else{for(let n=0;n<4;n++)plate(g,x,y+n*.017,.06,.093);dishItems.push({type:'plates',count:4,y});}}
   for(const [x,y]of[[.20,hi-.09],[-.30,lo+.09]])tube(g,[[x-.02,y-.02,.253],[x+.018,y+.022,.253]],.002,'#a0badf');
  }
  box(g,.51,.085,.32,-.21,1.98,-.015,'#7d8241');box(g,.43,.07,.29,-.21,2.057,-.015,'#a5ad60');box(g,.34,.18,.31,.295,2.025,-.02,'#dec1c1');const band=box(g,.35,.031,.002,.295,2.02,.137,'#bb8b8c',false);band.rotation.z=.18;
 },[1.07,.46],true);
 part('厨08','柜旁白袋与提篮',8.79,2.41,Math.PI/2,g=>{
  ell(g,.075,.125,.033,0,1.46,.027,'#e4eada');tube(g,[[-.045,1.56,.03],[-.03,1.70,.03],[.018,1.72,.03],[.050,1.57,.03]],.007,'#e4eada');tube(g,[[0,1.72,.015],[0,1.75,.005]],.005,C.dark);for(const x of [-.036,.023])tube(g,[[x,1.54,.055],[x*.7,1.45,.059],[x*.6,1.39,.05]],.002,'#b7c3ae');
  ell(g,.078,.10,.036,0,.86,.033,'#bd9f5c');for(let y=.80;y<.94;y+=.017)tube(g,[[-.064,y,.053],[0,y-.01,.071],[.064,y,.053]],.0025,'#8f7949');tube(g,[[-.055,.92,.04],[-.050,1.04,.04],[.04,1.045,.04],[.055,.92,.04]],.007,'#a28850');
 },null,false,true);
 part('厨09','三层家用架与容器',9.69,1.46,-Math.PI/2,g=>{
  for(const x of [-.32,.32])for(const z of [-.16,.16]){cyl(g,.019,.019,.065,x,.0325,z,'#6b7167');box(g,.025,.75,.025,x,.4425,z,'#a5aea0');}
  for(const y of [.10,.42,.78]){box(g,.72,.026,.40,0,y,0,'#e5dfbd');for(const z of [-.20,.20])box(g,.74,.037,.023,0,y+.008,z,'#aa8955');}
  tin(g,-.23,.793,-.065,.052,.16,'#a27d72');tin(g,-.09,.793,-.07,.049,.18,'#aab7b7');cyl(g,.127,.127,.016,-.14,.811,.065,'#b58f84');ell(g,.025,.009,.02,-.14,.829,.065,'#8e7168');teapot(g,.21,.793,.065);
  ell(g,.065,.095,.055,.09,.875,-.08,'#f4efdb');tube(g,[[.063,.91,-.025],[.06,.84,-.01]],.002,'#c6c7b7');
  plate(g,-.19,.434,.04,.105,'#9abed0');for(const [x,z]of[[-.235,.05],[-.14,.04]])ell(g,.045,.033,.041,x,.48,z,'#c1a357');
  bowl(g,.19,.434,.02,.12,.095,'#ba9d63');for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(g,[[.19+Math.cos(a)*.075,.45,.02+Math.sin(a)*.075],[.19+Math.cos(a+.3)*.12,.523,.02+Math.sin(a+.3)*.12]],.003,'#856d40');}for(let i=0;i<3;i++)ell(g,.038,.065,.04,.13+i*.06,.54,.02,'#d7c461');
  for(const [x,c]of[[-.19,'#b5c0bd'],[.16,'#bcda83']]){lathe(g,[[.002,0],[.065,0],[.078,.03],[.065,.12],[.026,.18],[.025,.23],[.002,.23]],x,.113,0,c);tube(g,[[x+.03,.30,0],[x+.08,.28,0],[x+.085,.22,0],[x+.055,.21,0]],.007,c);}
 },[.74,.43],true);
 part('厨10','白盖棕釉坛子',9.64,.86,0,g=>{lathe(g,[[.002,0],[.085,0],[.126,.055],[.14,.20],[.11,.29],[.084,.31],[.078,.31],[.10,.20],[.076,.018],[.002,.018]],0,0,0,'#8f6e5a');cyl(g,.091,.10,.021,0,.322,0,'#e9e9d6');ell(g,.058,.012,.055,0,.341,0,'#dedcca');for(let i=0;i<13;i++){const t=i*Math.PI*2/13;ell(g,.011,.035+(i%3)*.012,.011,Math.cos(t)*.12,.21,Math.sin(t)*.12,'#5c5045');}},[.29,.29],true);
 part('厨11','饭锅与白布小柜',7.16,2.40,Math.PI,g=>{
  box(g,.69,.06,.43,0,.03,0,C.edge);box(g,.64,.70,.024,0,.40,-.203,'#56727a');for(const x of [-.327,.327])box(g,.036,.72,.43,x,.42,0,C.wood);box(g,.65,.027,.40,0,.10,0,C.wood);box(g,.025,.62,.40,0,.41,0,C.wood);box(g,.72,.035,.46,0,.7975,0,'#e8eedf');
  const geo=new THREE.PlaneGeometry(.69,.69,24,18),p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,.017*Math.cos(x*70));if(y<-.32)p.setY(i,y+.008+.012*Math.cos(x*70));}geo.computeVertexNormals();const cloth=mesh(geo,'#ffffff',g,false,'cloth');cloth.position.set(0,.434,.246);
  // Circular body and lid in every view; the anime front silhouette is perspective-compressed.
  for(const x of [-.125,.125])for(const z of [-.125,.125])cyl(g,.018,.018,.025,x,.8275,z,'#59696b');
  for(const [r,h,y,c]of[[.216,.045,.8625,'#99a7aa'],[.205,.28,1.02,'#b6a448'],[.22,.05,1.185,'#98a4a9']]){const m=mesh(new THREE.CylinderGeometry(r,r,h,64),c,g);m.position.y=y;}
  ell(g,.212,.022,.212,0,1.21,0,'#a6b1b4');ring(g,.217,.003,0,1.209,0,'#7e9096');
  for(let i=0;i<28;i++){const a=i*Math.PI*2/28;cyl(g,.002,.002,.264,Math.cos(a)*.205,1.02,Math.sin(a)*.205,'#827840');}
  tube(g,[[-.14,1.224,0],[-.13,1.30,0],[.13,1.30,0],[.14,1.224,0]],.014,'#7a888c');box(g,.072,.032,.018,0,1.14,.211,'#647d80');
 },[.74,.49],true);
 part('厨12','厚黄餐桌',7.25,.70,0,g=>{box(g,1.34,.055,.81,0,.7425,0,C.table);for(const z of [-.34,.34])box(g,1.22,.10,.035,0,.665,z,'#c7a53d');for(const x of [-.59,.59])box(g,.035,.10,.71,x,.665,0,'#c7a53d');for(const x of [-.57,.57])for(const z of [-.31,.31])box(g,.060,.64,.060,x,.32,z,'#c6a442');},[1.34,.81],true);
 for(const [i,x,z,rot]of[[1,6.93,.05,0],[2,7.57,.05,0],[3,6.93,1.35,Math.PI],[4,7.57,1.35,Math.PI]])part('厨13-'+i,'橙面木餐椅',x,z,rot,g=>{box(g,.37,.036,.37,0,.425,0,C.chair);for(const x of [-.15,.15])for(const z of [-.15,.15])box(g,.032,.407,.032,x,.2035,z,'#b4983e');for(const x of [-.155,.155]){cyl(g,.017,.017,.49,x,.64,-.17,'#c3a142');ell(g,.02,.018,.02,x,.903,-.17,'#c3a142');}rounded(g,.29,.225,.023,.035,0,.763,-.17,C.chair);},[.38,.40],true);
 part('厨14','绿圆凳',8.15,.45,0,g=>{for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=Math.cos(a)*.13,z=Math.sin(a)*.13;tube(g,[[x,.413,z],[x*1.15,.013,z*1.15]],.012,'#637e78');cyl(g,.015,.016,.014,x*1.15,.007,z*1.15,'#566963');}ring(g,.15,.013,0,.16,0,'#647c78');lathe(g,[[.055,0],[.19,0],[.19,.035],[.055,.035],[.055,0]],0,.405,0,'#68a465');},[.40,.40],true);
 // Calendar and pinned drawings remain flat paper; cloth and bag silhouettes have real depth.
 part('厨15','富士山日历与毛巾',9.939,.15,-Math.PI/2,g=>{box(g,.39,.55,.010,0,1.60,0,'#e9e8d5');plane(g,.375,.535,0,1.60,.006,'calendar');box(g,.39,.014,.020,0,1.876,0,'#c5d1bc');box(g,.26,.44,.010,.43,1.65,0,'#98b6c9');const towel=box(g,.15,.43,.018,.43,1.69,.02,'#d391aa',false);towel.rotation.z=-.025;box(g,.15,.055,.019,.43,1.54,.025,'#b56c87',false);},null,false,true);
 part('厨16','入口暖帘与深青门框',8.175,2.652,Math.PI,g=>{for(const x of [-.5625,.5625])box(g,.037,2.08,.033,x,1.04,0,kitchenColors.skirt);box(g,1.16,.045,.05,0,2.055,0,kitchenColors.skirt);tube(g,[[-.55,2.015,.02],[.55,2.015,.02]],.007,'#856f49');for(let i=0;i<3;i++){const geo=new THREE.PlaneGeometry(.363,.37,18,10),p=geo.attributes.position;for(let j=0;j<p.count;j++){const x=p.getX(j),y=p.getY(j);p.setZ(j,.008*Math.cos(x*47));if(y<-.17)p.setY(j,y+.008*Math.cos(x*85));}geo.computeVertexNormals();const m=mesh(geo,'#f0df74',g);m.position.set((i-1)*.373,1.825,.03);for(let n=0;n<10;n++)ell(g,.018,.009,.007,(i-1)*.373-.168+n*.037,1.638,.03,'#6b9863');}for(const x of [-.36,.36]){tube(g,[[x,1.99,.04],[x-.023,2.01,.04],[x-.023,1.98,.04],[x+.023,2.01,.04],[x+.023,1.98,.04],[x,1.99,.04]],.004,'#679759');}},null,false,true);
 part('厨17','饭锅上方小窗与纸画',6.97,2.657,Math.PI,g=>{
  box(g,.61,.55,.014,0,1.70,0,'#a8c9d7');for(const x of [-.31,.31])box(g,.022,.58,.03,x,1.70,.012,kitchenColors.skirt);box(g,.65,.035,.13,0,1.415,.055,C.metal);box(g,.034,.04,.027,0,1.447,.03,C.dark);
  for(const [x,y,w,h,map]of[[.39,1.22,.12,.16,'note'],[.46,1.16,.11,.14,'note'],[.41,.94,.16,.18,'flower']]){box(g,w,h,.004,x,y,0,'#f0eeda',false);plane(g,w-.004,h-.004,x,y,.003,map);}
 },null,false,true);
 part('厨18','桌旁贴画与地面纸袋',6.441,.60,Math.PI/2,g=>{
  box(g,.23,.25,.026,.15,2.03,0,'#e0e7c7');for(let y=1.94;y<2.14;y+=.038)box(g,.195,.009,.030,.15,y,.017,'#829b81',false);
  for(const [z,y,w,h,map]of[[0,1.62,.36,.30,'animal'],[.38,1.60,.16,.22,'flower']]){box(g,w,h,.006,z,y,0,'#e5e4c8');plane(g,w-.009,h-.009,z,y,.004,map);}
 },null,false,true);
 // Kitchen-only skins cover the actual shared-wall faces, without replacing the other room side.
 part('厨20','绿色内墙饰面与踢脚线',0,0,0,g=>{
  for(const [x,z,d]of[[6.439,1.33,2.80],[9.945,1.365,2.73],[9.945,-.90,1.80],[5.525,-.90,1.80]]){box(g,.004,2.35,d,x,1.175,z,kitchenColors.wall,false);box(g,.008,.065,d,x,.0325,z,kitchenColors.skirt,false);}
  for(const [a,b,z]of[[6.37,6.65,2.663],[7.29,7.60,2.663],[8.75,10.01,2.663],[5.46,6.437,-.069]]){box(g,b-a,2.35,.004,(a+b)/2,1.175,z,kitchenColors.wall,false);box(g,b-a,.065,.008,(a+b)/2,.0325,z,kitchenColors.skirt,false);}
  for(const [y,h]of[[.71,1.42],[2.16,.38]])box(g,.64,h,.004,6.97,y,2.663,kitchenColors.wall,false);box(g,.64,.065,.008,6.97,.0325,2.663,kitchenColors.skirt,false);
  box(g,1.15,.27,.004,8.175,2.215,2.663,kitchenColors.wall,false);
 },null,false,true);
 // New rear door swings out to a local lowered landing; it is not connected to the outdoor asset.
 const rear=group('厨21 后门与门外落脚处'),landing=group('后门台阶',rear);const leaf=group('厨房后门扇',rear);leaf.position.set(5.59,0,-1.8);
 box(leaf,.72,1.99,.040,.36,1.005,0,'#765b4d');box(leaf,.60,.61,.018,.36,1.48,.026,'#a2cbd9');box(leaf,.60,.61,.018,.36,1.48,-.026,'#a2cbd9');box(leaf,.72,.27,.044,.36,.145,0,'#9dabae');for(const s of [-1,1])ell(leaf,.025,.025,.024,.64,.96,s*.043,'#bfc6b8');
 for(const x of [5.57,6.33])box(landing,.04,2.05,.15,x,1.025,-1.80,'#765b4d');box(landing,.80,.045,.15,5.95,2.0275,-1.80,'#765b4d');
 box(landing,.77,.16,.45,5.95,-.08,-2.03,'#9eaaab');box(landing,.79,.025,.12,5.95,-.012,-1.77,'#bcbcac');
 wallDecor.push(rear);entries.push({id:'厨21',name:'后门与局部落脚处',group:rear});
 function finish(g){root.updateMatrixWorld(true);g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),buckets=new Map(),lines=[];g.traverse(o=>{if(o.isMesh){const tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),geo=o.geometry.clone().applyMatrix4(tr),n=geo.attributes.normal,colors=[];for(let i=0;i<n.count;i++){const v=new THREE.Vector3().fromBufferAttribute(n,i).transformDirection(g.matrixWorld),shade=THREE.MathUtils.clamp(.94+v.y*.045+v.z*.018-v.x*.028,.85,1);colors.push(shade,shade,shade);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(n.count*2),2));if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(geo);}else if(o.isLineSegments){const p=o.geometry.attributes.position,tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(tr);lines.push(v.x,v.y,v.z);}}});g.clear();for(const [material,gs]of buckets){const flat=gs.map(a=>a.index?a.toNonIndexed():a.clone()),geo=mergeGeometries(flat,false);gs.forEach(a=>a.dispose());flat.forEach(a=>a.dispose());resources.add(geo);g.add(new THREE.Mesh(geo,material));}if(lines.length){const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));resources.add(geo);g.add(new THREE.LineSegments(geo,ink));}}
 entries.filter(e=>e.id!=='厨21').forEach(e=>finish(e.group));finish(leaf);finish(landing);let disposed=false;
 function setDoorsOpen(v){leaf.rotation.y=v?Math.PI/2:0;root.updateMatrixWorld(true);}
 function audit(){root.updateMatrixWorld(true);const sink=entries.find(e=>e.id==='厨02').group,ray=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0),0,3).intersectObject(sink,true).find(v=>v.object.isMesh)?.point.y;return {sinkDepth:ray(7.64,-1.117)-ray(7.64,-1.40),entryClearWidth:1.15-.037,dishes:dishItems.reduce((a,d)=>a+d.count,0),sinkTop:.8425,stoveTop:.8715,stoveBase:.64,notes:kitchenSpecification.note};}
 return {root,entries,obstacles,wallDecor,resources,specification:kitchenSpecification,setDoorsOpen,audit,setWallMode(mode){wallDecor.forEach(g=>g.visible=mode==='full');},dispose(){if(disposed)return;disposed=true;resources.forEach(r=>r.dispose());root.removeFromParent();root.clear();}};
}
