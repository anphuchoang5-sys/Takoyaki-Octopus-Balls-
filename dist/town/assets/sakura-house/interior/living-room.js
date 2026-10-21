import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {livingArt} from './living-art.js';

export const livingSpecification={id:'sakura-living-room',revision:'living-02',bounds:[8.19,3.64,11.83,7.28],artApproved:false,reference:'用户客厅动画截图及后续45°/密集餐具/六块坐垫指示',supplement:'尺寸、背面、裁切柜体右侧、绿色摆件身份与餐具具体数量为补全；坐垫按用户确定的三边各两块'};
export const livingColors={wall:'#f5df8e',floor:'#f2e5ab',floorLine:'#c5b57d'};
export function createLivingRoom(){
 const root=new THREE.Group();root.name='客厅精修';const resources=new Set(),materials=new Map(),entries=[],obstacles=[],dishItems=[],art=livingArt(THREE,resources);
 const ink=new THREE.LineBasicMaterial({color:'#564735',transparent:true,opacity:.45,toneMapped:false});resources.add(ink);
 const C={wood:'#997449',edge:'#775936',light:'#b58d52',dark:'#504938',red:'#d56b5c',metal:'#c7c9bd',blue:'#93b2bd'};
 const group=(name,parent=root)=>{const g=new THREE.Group();g.name=name;parent.add(g);return g;};
 function mat(color,map=null,glass=false){const key=color+'|'+map+'|'+glass;if(!materials.has(key)){const m=new THREE.MeshBasicMaterial({color,vertexColors:true,map:map?art(map):null,transparent:glass,opacity:glass?.13:1,depthWrite:!glass,side:glass?THREE.DoubleSide:THREE.FrontSide,toneMapped:false});materials.set(key,m);resources.add(m);}return materials.get(key);}
 function mesh(geometry,color,parent,edge=false,map=null,glass=false){resources.add(geometry);const m=new THREE.Mesh(geometry,mat(color,map,glass));parent.add(m);if(edge){const e=new THREE.EdgesGeometry(geometry,35);resources.add(e);m.add(new THREE.LineSegments(e,ink));}return m;}
 function box(g,w,h,d,x,y,z,c,edge=true){const m=mesh(new THREE.BoxGeometry(w,h,d),c,g,edge);m.position.set(x,y,z);return m;}
 function round(g,w,h,d,r,x,y,z,c,rx=0){const s=new THREE.Shape(),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:5});geo.translate(0,0,-d/2);const m=mesh(geo,c,g,true);m.position.set(x,y,z);m.rotation.x=rx;return m;}
 function cyl(g,rt,rb,h,x,y,z,c,open=false,map=null){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,24,1,open),c,g,false,map);m.position.set(x,y,z);return m;}
 function ell(g,rx,ry,rz,x,y,z,c){const m=mesh(new THREE.SphereGeometry(1,24,16),c,g);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
 function tube(g,pts,r,c,closed=false){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),closed),Math.max(16,pts.length*6),r,8,closed),c,g);}
 function ring(g,r,t,x,y,z,c,rx=0){const m=mesh(new THREE.TorusGeometry(r,t,8,40),c,g);m.position.set(x,y,z);m.rotation.x=rx;return m;}
 function plane(g,w,h,x,y,z,c,map=null,glass=false){const m=mesh(new THREE.PlaneGeometry(w,h),c,g,false,map,glass);m.position.set(x,y,z);return m;}
 function polygon(g,pts,z,c){const shape=new THREE.Shape();shape.moveTo(...pts[0]);pts.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();const m=mesh(new THREE.ShapeGeometry(shape),c,g);m.position.z=z;return m;}
 function part(id,name,anchor,fn,footprint=null){const g=group(id+' '+name);g.userData={checklist:id,room:'living'};g.position.set(...anchor.slice(0,3));g.rotation.y=anchor[3]||0;fn(g);entries.push({id,name,group:g});if(footprint){const [w,d]=footprint,c=Math.abs(Math.cos(g.rotation.y)),s=Math.abs(Math.sin(g.rotation.y));obstacles.push({name:g.name,x:anchor[0],z:anchor[2],w:w*c+d*s,d:d*c+w*s});}return g;}
 function book(g,x,y,z,w,h,d,c,lean=0){const b=group('书本',g);b.position.set(x,y,z);b.rotation.z=lean;box(b,w-.008,h-.018,d-.008,0,h/2,-.004,'#e7e2ca',false);for(const xx of [-w/2+.002,w/2-.002])box(b,.004,h,d,xx,h/2,0,c,false);box(b,w,h,.008,0,h/2,d/2-.004,c);box(b,w,.015,.012,0,.04,d/2+.001,c,false);box(b,.004,h,.013,-w/2+.002,h/2,d/2,c,false);}
 function drawer(g,x,y,z,w,h){box(g,w,h,.032,x,y,z,C.wood);box(g,w-.042,h-.035,.008,x,y,z+.02,'#ad8852');const k=cyl(g,.014,.014,.019,x,y,z+.035,C.edge);k.rotation.x=Math.PI/2;}
 function bowl(g,x,y,z,r,h,c){const pts=[[.002,0],[r*.55,0],[r*.58,.012],[r,h*.75],[r,h],[r-.009,h],[r*.5,.025],[.002,.025]].map(p=>new THREE.Vector2(...p));const geo=new THREE.LatheGeometry(pts,24);const m=mesh(geo,c,g);m.position.set(x,y,z);ring(g,r-.004,.004,x,y+h,z,'#b5ccd0',Math.PI/2);}
 function tumbler(g){
 const r=.055,h=.154,pts=[[.002,0],[r*.79,0],[r*.86,.008],[r,h],[r-.004,h],[r*.78,.010],[.002,.010]].map(p=>new THREE.Vector2(...p));
  const m=mesh(new THREE.LatheGeometry(pts,24),'#b9d6dc',g,false,null,true);
  if(!materials.has('tumbler')){const material=mat('#b9d6dc',null,true).clone();material.opacity=.34;materials.set('tumbler',material);resources.add(material);}m.material=materials.get('tumbler');
  ring(g,r-.002,.0022,0,h,0,'#c2d9d8',Math.PI/2);ring(g,r*.81,.002,0,.006,0,'#91b9c3',Math.PI/2);
 }
 // Square table: the supplied view establishes shape, approximate metres are a project choice.
 part('客05','方形矮桌',[10.01,0,5.52],g=>{box(g,1.34,.055,1.34,0,.3425,0,'#704d36');box(g,1.325,.012,1.325,0,.376,0,'#c59942');box(g,1.185,.003,1.185,0,.384,0,'#a85f31',false);for(const x of [-.565,.565])for(const z of [-.565,.565])box(g,.066,.315,.066,x,.1575,z,'#49483b');for(const z of [-.58,.58])box(g,1.18,.07,.035,0,.29,z,'#73543c');for(const x of [-.58,.58])box(g,.035,.07,1.18,x,.29,0,'#73543c');},[1.34,1.34]);
 const tvAnchor=[8.78,0,4.26,Math.PI/4];
 part('客07','电视柜与一排书本',tvAnchor,g=>{
  box(g,.84,.045,.48,0,.0225,0,C.edge);box(g,.84,.034,.48,0,.425,0,C.light);box(g,.82,.38,.026,0,.23,-.225,C.wood);
  for(const x of [-.399,.399])box(g,.042,.38,.47,x,.23,0,C.wood);box(g,.035,.355,.44,-.11,.225,0,C.edge);box(g,.8,.025,.44,0,.065,0,C.wood);
  drawer(g,-.256,.158,.24,.25,.15);drawer(g,-.256,.325,.24,.25,.15);
  const cols=['#8b88af','#b4bbd3','#83aebd','#b8cfda','#d8a5b7','#80a88a','#e3c975','#c88f9d'];let x=-.06;
  cols.forEach((c,i)=>{const w=[.049,.043,.046,.052,.039,.055,.037,.043][i];book(g,x+w/2,.078,.029,w,.286+(i%3)*.013,.30,c,i===0?.04:0);x+=w+.007;});
 },[.84,.48]);
 part('客06','红色老式电视与环形天线',[tvAnchor[0],.442,tvAnchor[2],tvAnchor[3]],g=>{
  round(g,.79,.56,.43,.018,0,.30,0,C.red);for(const x of [-.28,.28])box(g,.052,.02,.28,x,.01,0,C.edge,false);
  round(g,.60,.448,.021,.035,-.061,.302,.227,'#443f38');round(g,.537,.382,.012,.044,-.061,.302,.242,'#869fa2');
  // The user requested a switched-off black CRT; retain the real curved surface.
  const geo=new THREE.PlaneGeometry(.507,.352,16,12),pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i)/.2535,y=pos.getY(i)/.176;pos.setZ(i,.012*(1-x*x)*(1-y*y));}geo.computeVertexNormals();const screen=mesh(geo,'#202427',g);screen.position.set(-.061,.302,.254);
  box(g,.116,.47,.017,.319,.301,.229,'#484943');const dial=cyl(g,.039,.039,.016,.319,.463,.249,'#9aada7');dial.rotation.x=Math.PI/2;const dial2=cyl(g,.029,.029,.019,.319,.463,.260,'#4c5552');dial2.rotation.x=Math.PI/2;box(g,.005,.037,.005,.319,.463,.272,'#bec7ba',false);
  for(let i=0;i<6;i++)box(g,.092,.008,.008,.319,.183+i*.028,.245,'#bac4b8',false);for(const y of [.093,.373]){const knob=cyl(g,.009,.009,.009,.319,y,.247,'#acb6a9');knob.rotation.x=Math.PI/2;}
  box(g,.013,.071,.235,-.400,.456,-.015,'#a6b1a9');box(g,.012,.039,.188,-.408,.456,-.015,'#424945');for(let i=0;i<5;i++)box(g,.007,.077,.009,-.401,.106,-.11+i*.031,'#5d4840',false);
  // Rear casing, connector and ventilation remain real geometry when rotated.
  round(g,.50,.34,.10,.05,0,.29,-.25,'#ae594d');for(let i=0;i<8;i++)box(g,.26,.008,.007,0,.19+i*.023,-.305,'#68493d',false);
  ell(g,.073,.031,.055,0,.594,0,'#b2b5ad');
  for(const s of [-1,1])tube(g,[[s*.025,.605,-.025],[s*.26,.644,-.16],[s*.35,.639,-.12],[s*.35,.623,-.02],[s*.26,.614,.056],[s*.018,.604,.025]],.006,'#c6c8bd',true);
 },[.81,.55]);
 part('客08','电视左侧敞口小桶',[8.53,0,4.94],g=>{
  cyl(g,.152,.117,.30,0,.15,0,'#ffffff',true,'bucket');const inner=mesh(new THREE.CylinderGeometry(.142,.109,.285,24,1,true),'#7c654b',g);inner.material=mat('#7c654b');inner.material.side=THREE.DoubleSide;inner.position.y=.1575;
  cyl(g,.111,.111,.012,0,.014,0,'#6c5944');ring(g,.149,.009,0,.303,0,'#b79a6c',Math.PI/2);ring(g,.118,.005,0,.012,0,C.edge,Math.PI/2);
 },[.32,.32]);
 const cabAnchor=[11.51,0,5.26,-Math.PI/2],cabH=1.22;
 part('客09','木框玻璃餐具柜与餐具',cabAnchor,g=>{
  const w=1.27,d=.44;box(g,w,.045,d,0,.0225,0,C.edge);box(g,w,.042,d,0,cabH-.021,0,C.light);box(g,w-.05,cabH-.08,.025,0,cabH/2,-d/2+.013,C.edge);
  for(const x of [-w/2+.025,w/2-.025])box(g,.05,cabH-.04,d,x,cabH/2,0,C.wood);box(g,w-.07,.045,d-.01,0,.63,0,C.wood);
  for(const y of [.68,.91])box(g,w-.09,.02,d-.045,0,y,0,'#a5865f');box(g,.026,.54,.39,0,.919,-.005,C.wood);
  // Two rows per shelf; every bundle stays in one half, clear of the central divider.
  const shelves=[
   {y:.69,rear:[['碗',6],['盘',9],['茶杯',3],['玻璃杯',1],['玻璃杯',1],['玻璃杯',1],['茶杯',3],['玻璃杯',1]],front:[['碗',5],['茶杯',2],['碗',5],['茶杯',2],['玻璃杯',1],['茶杯',2],['玻璃杯',1],['筷筒',1]]},
   {y:.92,rear:[['碗',6],['盘',9],['茶杯',3],['玻璃杯',1],['玻璃杯',1],['茶杯',3],['玻璃杯',1],['茶杯',3]],front:[['茶杯',2],['碗',5],['茶杯',2],['玻璃杯',1],['碗',5],['茶杯',2],['玻璃杯',1],['茶杯',2]]}
  ];
  for(const [shelf,layout] of shelves.entries())for(const row of ['rear','front'])layout[row].forEach(([kind,count],i)=>{
   const b=group(kind+(count>1?'叠放':''),g),x=[-.50,-.36,-.22,-.08,.08,.22,.36,.50][i];b.position.set(x,layout.y,row==='rear'?-.10:.075);
   if(kind==='碗')for(let j=0;j<count;j++)bowl(b,0,j*.023,0,.067,.043,j%2?'#8daab9':'#a9bec6');
   else if(kind==='盘')for(let j=0;j<count;j++)bowl(b,0,j*.012,0,.071,.026,j%2?'#a0b8c4':'#b5c9cb');
   else if(kind==='茶杯')for(let j=0;j<count;j++){bowl(b,0,j*.042,0,.056,.080,j%2?'#b4c8cd':'#92aebb');ring(b,.050,.002,0,.064+j*.042,0,'#c4d4d2',Math.PI/2);}
   else if(kind==='玻璃杯')tumbler(b);
   else{
    bowl(b,0,0,0,.039,.082,'#b1a078');
    for(let j=0;j<8;j++){const a=j*Math.PI/4,rr=j%2?.015:.022,px=Math.cos(a)*rr,pz=Math.sin(a)*rr;tube(b,[[px,.027,pz],[px*1.12,.095,pz*1.12],[px*1.28,.166+(j%3)*.009,pz*1.28]],.0022,j%2?'#8c603a':'#bf965e');}
   }
   // Preserve measured geometry bounds before material batching, for shelf/contact inspection.
   g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),bounds=new THREE.Box3();b.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)));}});
   dishItems.push({kind,count,chopsticks:kind==='筷筒'?8:0,shelf,row,min:bounds.min.toArray(),max:bounds.max.toArray()});
  });
  for(const x of [-.303,.303]){
   for(const dx of [-.274,.274])box(g,.038,.51,.025,x+dx,.925,.225,C.wood);
   for(const yy of [.686,1.165])box(g,.585,.034,.025,x,yy,.225,C.wood);
   plane(g,.510,.445,x,.925,.232,'#9fc6d2',null,true);
   for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])polygon(g,[[x+sx*.257,.925+sy*.225],[x+sx*.210,.925+sy*.225],[x+sx*.257,.925+sy*.173]],.244,C.wood);
   box(g,.012,.071,.018,x+(x<0?.24:-.24),.925,.250,C.edge);
  }
  // The cropped right side is a conservative continuation, documented as a supplement.
  for(const x of [-.428,-.068]){box(g,.325,.515,.035,x,.346,.23,C.wood);box(g,.27,.445,.009,x,.346,.252,C.light);box(g,.013,.068,.015,x+.11,.36,.263,C.edge);}
  for(let i=0;i<3;i++)drawer(g,.393,.17+i*.169,.237,.36,.152);
 },[1.27,.46]);
 part('客10','柜顶达摩及编织容器',[cabAnchor[0],cabH,cabAnchor[2],cabAnchor[3]],g=>{
  const d=group('红色达摩',g);d.position.set(-.34,0,0);ell(d,.135,.171,.119,0,.171,0,'#b6523d');
  // Face conforms to a curved shell and leaves the surrounding red body visible.
  const geo=new THREE.PlaneGeometry(.210,.185,24,16),p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)/.135,y=(p.getY(i)+.036)/.171;p.setZ(i,.005+.119*Math.sqrt(Math.max(.01,1-x*x-y*y)));}geo.computeVertexNormals();const f=mesh(geo,'#ffffff',d,false,'daruma');f.material=mat('#ffffff','daruma');f.material.transparent=true;f.position.y=.207;
  for(const x of [-.063,0,.063]){const geo=new THREE.PlaneGeometry(.014,.043,2,6),p=geo.attributes.position;for(let i=0;i<p.count;i++){const px=p.getX(i)+x,py=p.getY(i)+.065;p.setXYZ(i,px,py,.002+.119*Math.sqrt(Math.max(.01,1-(px/.135)**2-((py-.171)/.171)**2)));}geo.computeVertexNormals();mesh(geo,'#786044',d);}
  const b=group('编织容器与绿色物体',g);b.position.set(.18,0,0);cyl(b,.102,.078,.13,0,.065,0,'#bc965d',true);cyl(b,.075,.075,.012,0,.01,0,C.edge);
  for(let y=.015;y<.13;y+=.014)ring(b,.078+y*.184,.004,0,y,0,'#d5b576',Math.PI/2);
  for(let i=0;i<18;i++){const a=i*Math.PI/9;tube(b,[[Math.cos(a)*.08,.008,Math.sin(a)*.08],[Math.cos(a)*.102,.13,Math.sin(a)*.102]],.0035,'#92734b');}
  ell(b,.082,.082,.074,0,.135,0,'#718d59');for(let i=0;i<7;i++){const a=i*Math.PI*2/7,pts=[];for(let j=0;j<13;j++){const t=.10+j*.13;pts.push([Math.cos(a)*.084*Math.sin(t),.135+.084*Math.cos(t),Math.sin(a)*.076*Math.sin(t)]);}tube(b,pts,.003,'#415f45');}
 });
 const cushionAnchors=[[9.63,0,6.49],[10.40,0,6.49],[9.04,0,5.15,Math.PI/2],[9.04,0,5.89,Math.PI/2],[10.95,0,5.15,-Math.PI/2],[10.95,0,5.89,-Math.PI/2]];
 for(const [i,anchor] of cushionAnchors.entries())part('客11-'+(i+1),'蓝灰色坐垫',anchor,g=>{
  if(i>=2)g.scale.z=.96;
  round(g,.51,.49,.055,.045,0,.030,0,'#91b4bd',Math.PI/2);box(g,.43,.005,.41,0,.059,0,'#9ebfc3',false);
  for(const z of [-.225,.225])tube(g,[[-.20,.044,z],[0,.046,z],[.20,.044,z]],.0028,'#587d83');
  for(const sx of [-1,1])for(const sz of [-1,1])for(const t of [-1,1])tube(g,[[sx*.227,.026,sz*.218],[sx*.267,.027,sz*.252],[sx*(.282+t*.008),.014,sz*(.264-t*.01)]],.0035,'#636650');
 },[.59,i>=2?.54:.56]);
 function decorateDoor(parent,pw,ph){
  parent.userData.checklist='客04';const g=group('客04 白底尖角横纹与圆拉手',parent);
  box(g,pw-.071,ph-.08,.003,pw/2,ph/2+.025,.0245,'#f1f3e8',false);
  polygon(g,[[.037,.93],[pw-.038,.84],[.037,.70]],.027,'#b9983e');
  polygon(g,[[.037,.59],[pw-.038,.56],[pw-.038,.26],[.037,.32]],.027,'#b9983e');
  const rim=cyl(g,.043,.043,.008,.112,1.03,.031,'#786149');rim.rotation.x=Math.PI/2;const inset=cyl(g,.030,.030,.006,.112,1.03,.037,'#4f4939');inset.rotation.x=Math.PI/2;
  // Preserve the existing corridor-facing appearance, which the new frame does not show.
  box(g,pw,.24,.003,pw/2,.83,-.024,'#b59b51',false);box(g,.045,.08,.027,pw-.08,1.03,-.035,C.edge);
  finishGroup(g);
 }
 function finishGroup(g){root.updateMatrixWorld(true);g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),buckets=new Map(),lines=[];
  g.traverse(o=>{if(o.isMesh){const tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),geo=o.geometry.clone().applyMatrix4(tr),n=geo.attributes.normal,colors=[];for(let i=0;i<n.count;i++){const v=new THREE.Vector3().fromBufferAttribute(n,i).transformDirection(g.matrixWorld),shade=THREE.MathUtils.clamp(.91+v.y*.075+v.z*.035-v.x*.045,.79,1);colors.push(shade,shade,shade);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(n.count*2),2));const k=o.material.uuid;if(!buckets.has(k))buckets.set(k,{material:o.material,gs:[]});buckets.get(k).gs.push(geo);}else if(o.isLineSegments){const p=o.geometry.attributes.position,tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(tr);lines.push(v.x,v.y,v.z);}}});
  g.clear();for(const {material,gs} of buckets.values()){const flat=gs.map(a=>a.index?a.toNonIndexed():a.clone()),geo=mergeGeometries(flat,false);gs.forEach(a=>a.dispose());flat.forEach(a=>a.dispose());resources.add(geo);g.add(new THREE.Mesh(geo,material));}if(lines.length){const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));resources.add(geo);g.add(new THREE.LineSegments(geo,ink));}
 }
 entries.forEach(e=>finishGroup(e.group));let disposed=false;
 return {root,specification:livingSpecification,entries,obstacles,dishItems,resources,decorateDoor,dispose(){if(disposed)return;disposed=true;resources.forEach(r=>r.dispose());root.removeFromParent();root.clear();}};
}
