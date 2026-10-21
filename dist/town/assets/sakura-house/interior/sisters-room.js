import {sistersKit} from './sisters-kit.js';

export const sistersSpecification={id:'sakura-sisters-room',revision:'sisters-02',units:'metres',bounds:[4.55,3.64,8.19,7.28],artApproved:false,reference:'用户四张参考图；以动画部分为主',supplement:'尺寸、背面、遮挡部分及离开人物手中的书和笔的摆位为补全'};

export function createSistersRoom(){
 const K=sistersKit(),{THREE,root,group,box,rounded,ell,cyl,tube,ring,plane,polygon,part}=K;
 const walls=group('姐妹房内侧饰面与墙挂'),loose=group('可收起的地面散落物');
 const C={ink:'#70535b',wood:'#af885d',edge:'#94724f',green:'#4f977a',orange:'#df8747',pink:'#efb8b5',purple:'#ae779b',paper:'#f5efd7',red:'#ac3655',cream:'#eee9b8'};
 const S=[4.965,0,6.18,Math.PI/2],M=[7.78,0,6.13,-Math.PI/2];
 const offset=(a,x,y,z)=>[a[0]+Math.cos(a[3])*x+Math.sin(a[3])*z,a[1]+y,a[2]-Math.sin(a[3])*x+Math.cos(a[3])*z,a[3]];
 function obj(id,name,a,fn,parent=root){return part(id,name,a,fn,parent);}
 function star(g,x,y,z,r,c){
  const pts=[];for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rr=i%2?r*.43:r;pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}polygon(g,pts,.002,x,y,z,c);
 }
 function book(g,x,y,z,w,h,d,c,lean=0){
  const b=group('单本书',g);b.position.set(x,y,z);b.rotation.z=lean;
  box(b,w-.009,h-.012,d-.01,0,h/2,-.004,C.paper,false);
  for(const side of [-1,1])box(b,.005,h,d,side*(w-.005)/2,h/2,0,c,false);
  box(b,w,h,.009,0,h/2,d/2,c);
  for(const yy of [h*.15,h*.22,h*.86])box(b,w*.83,.004,.002,0,yy,d/2+.005,'#dfdfcc',false);
  if(w>.045)box(b,w*.2,h*.3,.002,-w*.19,h*.6,d/2+.006,'#dacfc4',false);
  const motif=parseInt(c.slice(1),16)%3;
  if(motif===0)tube(b,[[-w*.25,h*.78,d/2+.006],[0,h*.69,d/2+.006],[w*.25,h*.78,d/2+.006],[-w*.25,h*.78,d/2+.006]],.0013,'#d8d5c9');
  else if(motif===1)ring(b,w*.15,.0014,0,h*.075,d/2+.006,'#dad7c8');
 }
 function books(g,x,y,z,count,width,h,d,palette){
  let at=x;for(let i=0;i<count;i++){const w=width*(.8+(i%3)*.2);book(g,at+w/2,y,z,w,h*(.92+(i%4)*.024),d,palette[i%palette.length],i===count-1?.025:0);at+=w+.005;}
 }
 function flatBook(g,x,y,z,w,d,h,c){box(g,w,h-.008,d-.008,x,y+h/2,z,C.paper,false);for(const yy of [y+.002,y+h-.002])box(g,w+.008,.004,d,x,yy,z,c);box(g,.008,h,d,x-w/2,y+h/2,z,c,false);}
 function openBook(g,w,d,x,y,z,map='pages'){
  box(g,w,.009,d,x,y+.004,z,'#91a9bd',false);
  const geo=new THREE.PlaneGeometry(w-.006,d-.008,20,2);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const u=Math.abs(p.getX(i))/(w/2);p.setY(i,.011+.014*Math.sin(u*Math.PI*.88));}geo.computeVertexNormals();
  const m=K.mesh(geo,'#ffffff',g,false,map);m.position.set(x,y,z);
  tube(g,[[x,y+.015,z-d/2],[x,y+.012,z],[x,y+.015,z+d/2]],.0015,'#c0ad8b');
 }
 function rack(g,w,x,y,z){
  box(g,w,.022,.17,x,y+.011,z,C.wood);for(const s of [-1,1])box(g,.018,.22,.17,x+s*(w-.018)/2,y+.12,z,C.wood);
  box(g,w,.075,.016,x,y+.043,z-.078,C.edge);
 }
 function schoolbag(g,scale=1){
  const h=group('皮书包',g);h.scale.setScalar(scale);const c=C.red;
  box(h,.26,.025,.19,0,.014,0,c);for(const x of [-.124,.124])box(h,.016,.29,.19,x,.157,0,c);
  box(h,.25,.29,.016,0,.157,-.087,c);box(h,.25,.24,.018,0,.13,.087,c);
  box(h,.21,.155,.035,0,.10,.116,'#bf4560');box(h,.14,.064,.003,0,.08,.135,'#f0e0cf');
  box(h,.11,.012,.004,0,.183,.1,'#edd9c9');
  for(let i=0;i<3;i++)book(h,-.075+i*.064,.07,-.004,.05,.25-i*.012,.13,['#98b9ae','#e3c38a','#b2b9d7'][i]);
  tube(h,[[-.13,.30,-.084],[-.13,.33,-.16],[-.13,.23,-.24],[-.13,.08,-.28]],.009,c);
  tube(h,[[.13,.30,-.084],[.13,.33,-.16],[.13,.23,-.24],[.13,.08,-.28]],.009,c);
  const flap=new THREE.PlaneGeometry(.26,.29,1,12),p=flap.attributes.position;
  for(let i=0;i<p.count;i++){const t=(p.getY(i)+.145)/.29;p.setXYZ(i,p.getX(i),.30+.03*Math.sin(t*Math.PI)-t*.20,-.085-t*.20);}flap.computeVertexNormals();
  K.mesh(flap,c,h);
  for(const x of [-.105,.105])tube(h,[[x,.24,-.102],[x,.16,-.14],[x,.015,-.14],[x,.01,-.09]],.011,'#932f4b');
 }
 function bear(g,s=1,color='#ac805a',panda=false){
  const b=group(panda?'熊猫玩偶':'坐熊',g);b.scale.setScalar(s);
  ell(b,.11,.13,.085,0,.135,0,panda?'#f0edd5':color);ell(b,.10,.09,.078,0,.29,0,panda?'#f0edd5':color);
  for(const v of [-1,1]){ell(b,.034,.035,.024,v*.073,.365,0,panda?'#53525a':color);ell(b,.045,.087,.045,v*.105,.17,0,panda?'#53525a':color);ell(b,.049,.043,.063,v*.064,.045,.055,panda?'#53525a':color);}
  for(const v of [-1,1]){
   if(panda)ell(b,.035,.043,.009,v*.04,.295,.071,'#57555c');
   ell(b,.006,.009,.003,v*.037,.30,.082,panda?'#e8e5cf':'#634936');
   if(!panda){ell(b,.024,.028,.003,v*.064,.045,.114,'#d3a078');for(let i=-1;i<=1;i++)ell(b,.005,.006,.003,v*.064+i*.014,.071,.102,'#72523e');}
  }
  ell(b,.013,.008,.007,0,.269,.08,'#624a41');tube(b,[[0,.267,.085],[0,.252,.084],[.015,.245,.079]],.0028,'#624a41');
 }
 function doll(g,princess=false){
  const c=princess?'#e59ac9':'#cf75a7';ell(g,.025,.035,.019,0,.26,.002,'#eec6b6');
  ell(g,.036,.041,.026,0,.275,-.01,'#815a58');
  ell(g,.024,.033,.009,0,.259,.019,'#f4cab7');
  cyl(g,.026,.035,.062,0,.204,0,c);
  cyl(g,princess?.031:.023,princess?.11:.064,.12,0,.12,0,c);
  if(princess){for(const x of [-.047,.047])ell(g,.065,.065,.055,x,.09,0,'#ecb2d5');}
  for(const x of [-.014,.014]){cyl(g,.006,.006,.053,x,.035,0,'#f5ceb8');ell(g,.014,.006,.022,x,.009,.01,'#955a8c');}
  tube(g,[[-.025,.22,0],[-.047,.193,.012],[-.026,.17,.019]],.007,'#f1c6b6');
  tube(g,[[.025,.22,0],[.047,.193,.012],[.026,.17,.019]],.007,'#f1c6b6');
  for(const x of [-.008,.008])ell(g,.0025,.003,.0015,x,.26,.029,'#624c50');
  if(!princess){polygon(g,[[-.033,.304],[-.03,.336],[0,.318],[.028,.336],[.032,.304]],.009,0,0,0,'#c676b0');cyl(g,.047,.047,.007,0,.004,0,'#a678ac');}
 }
 function pouch(g,c,starColor=null){
  ell(g,.06,.093,.033,0,.09,0,c);cyl(g,.025,.043,.045,0,.20,0,c);
  tube(g,[[-.025,.21,0],[-.035,.258,0],[0,.25,0],[.025,.27,0],[.025,.216,0]],.005,c);
  tube(g,[[-.035,.182,.018],[0,.189,.029],[.034,.183,.018]],.003,'#5f7b8e');
  if(starColor)star(g,0,.09,.034,.028,starColor);
 }
 // Interior-only veneers: kept separate from shared walls and never edit the neighbour's face.
 obj('房01','粉色细地面',[0,0,0],g=>box(g,3.508,.009,3.508,6.37,.003,5.46,'#efc6be',false));
 obj('房02','姐妹房内侧墙面及踢脚',[0,0,0],g=>{
  const wall=(w,h,d,x,y,z)=>box(g,w,h,d,x,y,z,C.pink,false);
  for(const [a,b] of [[4.62,6.02],[6.96,8.12]]){wall(b-a,2.45,.006,(a+b)/2,1.225,3.706);box(g,b-a,.075,.015,(a+b)/2,.041,3.716,C.purple,false);}
  wall(.94,.42,.006,6.49,2.24,3.706);
  wall(.006,2.45,3.5,8.124,1.225,5.46);box(g,.014,.075,3.5,8.117,.041,5.46,C.purple,false);
  wall(.006,2.45,1.91,4.616,1.225,6.255);
  wall(.006,.42,1.47,4.616,2.24,4.565);
  wall(.006,2.45,.12,4.616,1.225,3.77);
  box(g,.014,.075,1.91,4.623,.041,6.255,C.purple,false);
  for(const [a,b] of [[4.62,5.5],[7.23,8.12]])wall(b-a,2.45,.006,(a+b)/2,1.225,7.214);
  wall(1.73,.85,.006,6.365,.425,7.214);wall(1.73,.45,.006,6.365,2.225,7.214);
  box(g,3.5,.075,.015,6.37,.041,7.207,C.purple,false);
  for(const x of [6.025,6.955])box(g,.043,2.08,.022,x,1.04,3.722,C.purple,false);
  box(g,.97,.045,.022,6.49,2.058,3.722,C.purple,false);
 },walls);
 // Cabinet wall. Front of both shelves is +Z.
 const G=[5.24,0,3.93,0],O=[7.54,0,3.945,0];
 obj('柜01','姐姐绿色四层书柜',G,g=>{
  box(g,1.0,1.56,.035,0,.79,-.158,'#3f796b');
  for(const x of [-.48,.48])box(g,.04,1.58,.36,x,.79,0,C.green);
  for(const y of [.045,.39,.77,1.15,1.56])box(g,.98,.035,.36,0,y,0,C.green);
  box(g,1.02,.055,.37,0,.036,0,'#4c8c73');
 });
 obj('柜02','高柜上两层与底层书本',G,g=>{
  books(g,-.45,1.174,.008,15,.051,.337,.265,['#8ebdb8','#8baeb4','#a6b6a1','#b9b58c','#cf8ca8','#8298a9','#aa697e','#cb8ba1','#b97088','#d59289','#dcaa62','#e7b265','#d7a25a','#d8a655','#dc9455']);
  books(g,-.45,.794,.008,14,.055,.328,.26,['#7ba4b6','#82a8b5','#8fa8a2','#9eaf94','#b3b18b','#ccaa71','#cc9b83','#ca8c99','#c88099','#d69aae','#d899b4','#bd8ba7','#a48baf','#ad8aac']);
  books(g,-.21,.067,.015,11,.055,.298,.26,['#8da77c','#87a078','#7d9875','#7d9d86','#7b9c96','#83a9b8','#8cacbd','#a7a5b9','#9b86ad','#a085ad','#967c9e']);
 });
 obj('柜03','黄色提手收纳篮',G,g=>{
  box(g,.27,.23,.265,-.30,.523,.015,'#d3b875');
  box(g,.285,.023,.278,-.30,.644,.015,'#e0c58a');
  for(let y=.44;y<.62;y+=.025)box(g,.268,.004,.004,-.30,y,.15,'#ab905d',false);
  tube(g,[[-.36,.656,0],[-.36,.687,0],[-.24,.687,0],[-.24,.656,0]],.008,'#8c775a');
 });
 obj('柜04','粉色毛线篮和织针',G,g=>{
  box(g,.24,.012,.23,-.004,.421,.02,'#dc8eaa');for(const z of [-.09,.13])box(g,.24,.12,.014,-.004,.482,z,'#e49bb5');
  for(const x of [-.12,.112])box(g,.015,.12,.23,x,.482,.02,'#df93af');
  for(let x=-.09;x<.1;x+=.039)for(const y of [.46,.5])box(g,.021,.009,.002,x,y,.139,'#a5668b',false);
  for(const [x,z,c] of [[-.052,.02,'#974c70'],[.05,.055,'#587aaf']]){
   ell(g,.072,.072,.065,x,.579,z,c);for(let k=-2;k<=2;k++)tube(g,[[x-.056,.57+k*.01,z+.035],[x,.59+k*.011,z+.063],[x+.05,.58+k*.01,z+.035]],.0025,c==='#974c70'?'#b36988':'#7695c3');
  }
  tube(g,[[.018,.56,.01],[.06,.72,-.015]],.003,'#b9c1b0');tube(g,[[.045,.55,0],[.095,.71,-.025]],.003,'#a8b9b3');
 });
 obj('柜05','叠放蓝盒和白星',G,g=>{
  box(g,.265,.15,.27,.305,.493,.015,'#83b2c9');box(g,.277,.023,.283,.305,.58,.015,'#95bfd2');
  box(g,.23,.13,.24,.305,.655,.005,'#8caec8');box(g,.246,.021,.257,.305,.73,.005,'#a1c2d8');star(g,.245,.49,.152,.037,'#d4e5e3');
 });
 obj('柜06','底层黄绿盒子',G,g=>{for(const [y,h,w] of [[.065,.12,.18],[.195,.15,.16]]){box(g,w,h,.26,-.349,y+h/2,0,'#bbbd62');box(g,w+.013,.018,.27,-.349,y+h+.004,0,'#ced17a');}});
 obj('柜07','柜顶粉色收纳盒',G,g=>{box(g,.35,.15,.285,-.25,1.66,-.005,'#c38ea7');box(g,.37,.025,.30,-.25,1.747,-.005,'#d6a4bb');});
 obj('柜08','紫色束口圆袋',G,g=>{
  ell(g,.165,.108,.12,-.25,1.865,-.005,'#a68aa7');cyl(g,.047,.062,.065,-.25,1.993,-.005,'#a68aa7');
  for(let i=0;i<5;i++)ell(g,.018,.035,.018,-.30+i*.025,2.025,-.005,'#a68aa7');
  for(let i=0;i<5;i++)tube(g,[[-.39+i*.06,1.865,.07],[-.36+i*.06,1.81,.102],[-.33+i*.06,1.87,.07]],.005,'#cbb39f');
 });
 obj('柜09','柜顶紫棕色圆脸玩偶',offset(G,0,.015,0),g=>{
  ell(g,.10,.12,.068,.23,1.699,.015,'#ac758e');
  for(const x of [.125,.335]){ell(g,.025,.064,.026,x,1.713,.025,'#a66f8a');ell(g,.025,.023,.022,x,1.658,.04,'#ecd6c7');}
  for(const x of [.159,.301])ell(g,.05,.044,.063,x,1.607,.07,'#916478');
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2;ell(g,.033,.033,.019,.23+Math.sin(a)*.101,1.894+Math.cos(a)*.105,.014,'#927184');}
  ell(g,.095,.101,.032,.23,1.893,.035,'#f3e4c9');
  for(const x of [.2,.26])ell(g,.004,.006,.002,x,1.907,.067,'#6c5553');
  tube(g,[[.202,1.864,.067],[.23,1.852,.07],[.258,1.866,.067]],.0027,'#88636b');
  for(const x of [.212,.234])ell(g,.018,.02,.007,x,1.981,.046,'#aa8a69');
  polygon(g,[[-.042,.022],[0,0],[-.042,-.018]],.007,.23,1.79,.074,'#825468');
  polygon(g,[[.042,.022],[0,0],[.042,-.018]],.007,.23,1.79,.074,'#825468');
 });
 obj('柜10','高柜侧边蓝色星星束口袋',offset(G,.538,.66,.04),g=>{pouch(g,'#6da6c8','#427bb0');tube(g,[[0,.26,0],[-.03,.29,-.015],[-.045,.29,-.015]],.004,'#80765e');});
 obj('柜11','门旁粉色爱心贴纸',[5.876,1.39,3.715],g=>{
  polygon(g,[[0,-.08],[-.079,-.002],[-.084,.039],[-.06,.07],[-.024,.073],[0,.045],[.024,.073],[.06,.07],[.084,.039],[.079,-.002]],.003,0,0,0,'#ba6d9f');
  polygon(g,[[0,-.065],[-.067,0],[-.071,.036],[-.052,.058],[-.025,.059],[0,.03],[.025,.059],[.052,.058],[.071,.036],[.067,0]],.003,0,0,.004,'#e7a1ce');
 },walls);
 obj('柜12','靠地白色小面板',[5.885,.22,3.72],g=>{box(g,.095,.13,.014,0,0,0,'#e7ddd1');box(g,.072,.105,.008,0,0,.01,'#fbf3e4');},walls);
 obj('柜13','小丸子橘红矮柜和两只抽屉',O,g=>{
  box(g,.96,.99,.028,0,.505,-.166,'#d0743e');for(const x of [-.46,.46])box(g,.04,.99,.37,x,.505,0,C.orange);
  for(const y of [.04,.26,.62,1.0])box(g,.94,.03,.37,0,y,0,C.orange);
  for(const x of [-.231,.231]){box(g,.444,.18,.032,x,.147,.186,'#e28c4e');cyl(g,.026,.026,.018,x,.148,.213,'#f7deb0').rotation.x=Math.PI/2;}
  box(g,.98,.042,.388,0,1.0,0,'#e89b58');
 });
 obj('柜14','矮柜上层书与平放书堆',O,g=>{
  books(g,-.425,.641,.012,3,.045,.30,.25,['#8aaabd','#aa91b3','#b5a9c2']);book(g,-.231,.641,.012,.048,.31,.25,'#7ba3a0',-.11);
  for(let i=0;i<5;i++)flatBook(g,-.035,.641+i*.031,.015,.22,.245,.029,['#b9c9d2','#cad2da','#aebcc9','#d2d8d9','#aebfcc'][i]);
  box(g,.22,.098,.245,-.035,.845,.015,'#80b7b1');
  books(g,.126,.641,.012,6,.046,.31,.25,['#9abbb0','#80a09d','#bdc579','#aaba7f','#b48fa7','#af8aab']);
 });
 obj('柜15','矮柜下层左侧书本',O,g=>{books(g,-.424,.279,.016,5,.044,.302,.25,['#8eb6a3','#759c8e','#c2c9a2','#b3bc86','#80a7b2']);book(g,-.16,.279,.018,.045,.299,.25,'#a7bcb1',-.13);});
 obj('柜16','一高一矮两只木偶',O,g=>{
  for(const [x,h] of [[-.035,.276],[.098,.231]]){cyl(g,.027,.037,h*.64,x,.279+h*.32,.065,'#d8bd77');ell(g,.043,.045,.038,x,.279+h*.80,.065,'#e3c983');for(const yy of [.32,.365,.412])if(yy<.279+h*.62)ring(g,.034,.003,x,yy,.065,'#a9895e',Math.PI/2);for(const s of [-1,1])ell(g,.0028,.0038,.002,x+s*.015,.279+h*.83,.102,'#75684a');tube(g,[[x-.012,.279+h*.71,.102],[x,.279+h*.69,.104],[x+.012,.279+h*.72,.102]],.002,'#a08354');}
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ell(g,.004,.007,.002,-.035+Math.sin(a)*.014,.321+Math.cos(a)*.014,.102,'#96734a');}
 });
 obj('柜17','粉色圆圈敞口收纳盒',O,g=>{
  box(g,.245,.015,.26,.303,.289,.006,'#da85a8');for(const x of [.185,.421])box(g,.012,.205,.26,x,.391,.006,'#d887aa');
  box(g,.245,.205,.012,.303,.391,-.118,'#dc8daf');box(g,.245,.205,.012,.303,.391,.136,'#ffffff',true,'outlined-circles');
  ell(g,.08,.067,.068,.273,.497,.012,'#937b9b');ell(g,.058,.045,.061,.364,.487,-.02,'#729192');
 });
 obj('柜18','透明展示盒里的粉裙娃娃',O,g=>{
  box(g,.304,.022,.268,-.30,1.034,0,'#b5759b');box(g,.31,.025,.275,-.30,1.453,0,'#b47a9e');
  for(const x of [-.442,-.158])for(const z of [-.123,.123])box(g,.012,.405,.012,x,1.243,z,'#bd8fae',false);
  const d=group('展盒娃娃',g);d.position.set(-.30,1.046,.012);d.scale.setScalar(1.16);doll(d,true);
  const mat=K.material('#dfd7ef',null,true);
  for(const [w,h,x,y,z,ry] of [[.282,.388,-.3,1.244,.126,0],[.248,.388,-.448,1.244,0,Math.PI/2],[.248,.388,-.152,1.244,0,Math.PI/2]]){
   const p=plane(g,w,h,x,y,z,'#ffffff',null,0,ry);p.material=mat;
  }
  tube(g,[[-.428,1.36,.13],[-.39,1.42,.13]],.0027,'#e8dfef');
 });
 obj('柜19','柜顶棕色坐熊',offset(O,.05,1.023,.022),g=>bear(g,1.06));
 obj('柜20','柜顶独立粉裙娃娃',offset(O,.342,1.023,.03),g=>{g.scale.setScalar(1.12);doll(g);});
 obj('柜21','矮柜旁星星翻盖小挂袋',[6.995,.77,3.728],g=>{
  polygon(g,[[-.053,0],[-.07,.075],[-.047,.123],[0,.145],[.047,.123],[.07,.075],[.053,0]],.018,0,0,0,'#b5709a');
  ell(g,.057,.053,.012,0,.098,.024,'#d697bd');star(g,0,.105,.039,.035,'#e7b5d5');ell(g,.007,.007,.003,0,.035,.024,'#ebbed2');
 },walls);
 obj('柜22','门边白色图钉纸条',[7.009,1.265,3.719],g=>{const p=box(g,.106,.143,.003,0,0,0,'#faf0e3',false);p.rotation.z=.13;ell(g,.006,.006,.004,-.013,.073,.004,'#856b60');},walls);
 // Sister's desk: green cloth, wooden checked chair, mirror (explicitly confirmed by user).
 obj('姐01','姐姐木书桌',S,g=>{
  box(g,1.15,.048,.62,0,.716,0,C.wood);
  for(const x of [-.535,.535])box(g,.045,.692,.55,x,.346,0,C.edge);
  box(g,1.07,.11,.032,0,.64,-.265,C.wood);
  box(g,.31,.65,.54,.371,.325,0,C.wood);for(const y of [.13,.337,.544]){box(g,.285,.192,.022,.371,y,.284,'#bb9469');box(g,.085,.015,.008,.371,y+.018,.299,'#776c55');}
 });
 obj('姐02','绿色薄桌布',S,g=>{box(g,1.128,.006,.596,0,.743,0,'#79ad91',false);box(g,1.128,.012,.004,0,.738,.298,'#659c80',false);});
 obj('姐03','绿色格纹木椅',offset(S,-.08,0,.54),g=>{
  for(const x of [-.16,.16])for(const z of [-.16,.16])box(g,.037,.43,.037,x,.215,z,'#a28a59');
  box(g,.37,.045,.36,0,.422,0,'#ad945f');box(g,.345,.041,.334,0,.461,0,'#ffffff',true,'checked');
  for(const x of [-.16,.16])box(g,.037,.49,.037,x,.64,.16,'#a28a59');
  box(g,.32,.265,.035,0,.724,.16,'#ffffff',true,'checked');box(g,.36,.031,.047,0,.877,.16,'#b59a67');
 });
 obj('姐04','姐姐书立和彩色书',S,g=>{rack(g,.55,.205,.748,-.197);books(g,-.045,.771,-.186,10,.045,.31,.13,['#7ba88a','#8fada0','#99b4c6','#bdc4c1','#b3bfd1','#d391b3']);});
 obj('姐05','姐姐桌上打开的红书包',offset(S,-.19,.748,.032),g=>schoolbag(g,.85));
 obj('姐06','蓝封面厚书',S,g=>{flatBook(g,-.425,.749,.08,.19,.258,.035,'#8badd4');});
 obj('姐07','蓝色圆镜与绿色镜架',S,g=>{
  cyl(g,.057,.065,.018,.407,.757,.184,'#609450');cyl(g,.009,.009,.11,.407,.817,.184,'#669852');
  ring(g,.106,.008,.407,.96,.184,'#64994d');const m=cyl(g,.101,.101,.009,.407,.96,.184,'#73a8ce');m.rotation.x=Math.PI/2;
  tube(g,[[.294,.96,.183],[.31,.892,.183],[.407,.861,.183],[.503,.892,.183],[.52,.96,.183]],.007,'#72a057');
  tube(g,[[.362,.987,.192],[.39,1.017,.192]],.002,'#a1c7df');tube(g,[[.383,.984,.192],[.413,1.017,.192]],.0015,'#9ac3df');
 });
 obj('姐08','秀树蓝底墙贴',[4.626,1.49,6.16,Math.PI/2],g=>{box(g,.44,.44,.004,0,0,0,'#efe2cf');plane(g,.42,.42,0,0,.003,'#ffffff','hideki');},walls);
 obj('姐09','局部绿色方格纸',[4.626,1.765,6.61,Math.PI/2],g=>{box(g,.18,.26,.003,0,0,0,'#d4ddbd');plane(g,.17,.249,0,0,.002,'#ffffff','grid-note');},walls);
 const T=[4.955,0,6.988,Math.PI/2];
 obj('姐10','窗边小桌',T,g=>{
  box(g,.43,.035,.60,0,.752,0,'#c6ab6a');for(const x of [-.19,.19])box(g,.032,.73,.55,x,.365,0,'#6da98f');box(g,.40,.025,.55,0,.15,0,'#6da98f');
 });
 obj('姐11','窗边熊猫玩偶',offset(T,-.07,.77,-.085),g=>bear(g,.76,'#f0e7c9',true));
 obj('姐12','白色长圆叶状玩偶',T,g=>{
  ell(g,.16,.086,.085,.025,.858,.14,'#f2f0d5');
  for(const x of [-.08,-.025,.04,.095])ell(g,.035,.012,.047,x,.782,.172,'#7fa56b');
  ell(g,.004,.006,.003,.116,.868,.211,'#8b8d6c');ell(g,.004,.006,.003,.139,.868,.192,'#8b8d6c');
 });
 obj('姐13','绿色纸巾盒与抽纸',T,g=>{
  box(g,.13,.085,.10,.123,.811,-.197,'#72a25e');box(g,.073,.003,.025,.123,.855,-.197,'#587c57',false);
  polygon(g,[[-.032,0],[-.048,.037],[-.052,.072],[-.022,.057],[-.008,.09],[.009,.066],[.037,.08],[.025,.027]],.003,.123,.856,-.197,'#faf5e2');
 });
 obj('姐14','原窗内侧木框蓝玻璃与橙黄帘',[0,0,0],g=>{
  // Inward trim only. The existing opening and exterior-facing window are retained.
  for(const x of [5.506,6.365,7.224])box(g,.03,1.15,.022,x,1.425,7.19,C.wood);
  for(const y of [.85,2.0])box(g,1.75,.035,.045,6.365,y,7.186,C.wood);
  for(const x of [5.935,6.794])box(g,.825,1.08,.007,x,1.425,7.201,'#7da9c4',false);
  tube(g,[[5.36,2.10,7.14],[7.38,2.10,7.14]],.012,'#aa815a');
  for(const x0 of [5.40,7.33])for(let j=0;j<6;j++){
   const x=x0+(j-2.5)*.026;for(const [y,h,c] of [[1.96,.22,'#d6a058'],[1.73,.24,'#efcd6f'],[1.49,.24,'#d99d53'],[1.25,.24,'#ecd071'],[1.04,.18,'#d29a53']])box(g,.029,h,.024,x,y,7.118+Math.sin(j*1.2)*.022,c,false);
  }
 },walls);
 // Maruko's desk: the upper animation reference determines colours and construction.
 obj('丸01','黄色桌面与橘色木架',M,g=>{
  box(g,1.15,.048,.62,0,.716,0,'#bb9267');box(g,1.15,.008,.62,0,.744,0,'#edda82',false);
  for(const x of [-.54,.54])for(const z of [-.262,.262])box(g,.043,.692,.043,x,.346,z,'#cd925f');
 });
 obj('丸02','右侧三层奶油色抽屉',M,g=>{
  box(g,.335,.67,.556,.37,.335,0,'#c89666');for(const [y,h] of [[.14,.262],[.373,.192],[.576,.192]]){
   box(g,.31,h,.024,.37,y,.289,C.cream);cyl(g,.027,.027,.017,.37,y+.014,.31,'#dc9969').rotation.x=Math.PI/2;
  }
 });
 obj('丸03','桌下浅色横板',M,g=>box(g,.75,.095,.026,-.172,.644,.255,'#eee5b7'));
 obj('丸04','橙色圆底旋转椅',offset(M,-.09,0,.54),g=>{
  ring(g,.215,.014,0,.022,0,'#9fa6aa',Math.PI/2);
  cyl(g,.036,.045,.27,0,.178,0,'#9fa6aa');
  for(let i=0;i<4;i++){const a=i*Math.PI/2;tube(g,[[0,.065,0],[Math.sin(a)*.10,.055,Math.cos(a)*.10],[Math.sin(a)*.204,.023,Math.cos(a)*.204]],.012,'#a4a9ab');}
  tube(g,[[.035,.27,0],[.076,.275,0]],.009,'#899197');ell(g,.019,.012,.012,.084,.275,0,'#929aa0');
  rounded(g,.39,.36,.07,.035,0,.393,0,'#dd9460',-Math.PI/2);
  for(const x of [-.105,.105])tube(g,[[x,.37,.213],[x,.72,.213],[x*.9,.742,.213]],.012,'#a8acb0');
  tube(g,[[-.095,.742,.213],[.095,.742,.213]],.012,'#a8acb0');
  rounded(g,.405,.25,.065,.033,0,.67,.165,'#e29a69');
  rounded(g,.37,.322,.015,.029,0,.435,0,'#e5a16c',-Math.PI/2);
 });
 obj('丸05','格纹灯罩与木灯座',M,g=>{
  cyl(g,.077,.084,.022,-.40,.76,-.195,'#b89771');cyl(g,.013,.017,.095,-.40,.818,-.195,'#af8a64');
  cyl(g,.065,.112,.21,-.40,.957,-.195,'#ffffff',true,'lamp');
  ring(g,.065,.003,-.40,1.062,-.195,'#bf936c',Math.PI/2);ring(g,.112,.003,-.40,.852,-.195,'#c68d67',Math.PI/2);
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2;ell(g,.014,.010,.006,-.40+Math.sin(a)*.111,.851,-.195+Math.cos(a)*.111,'#dfa36c');}
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;ell(g,.009,.007,.005,-.40+Math.sin(a)*.065,1.06,-.195+Math.cos(a)*.065,'#dfa36c');}
  ell(g,.025,.031,.025,-.40,.90,-.195,'#fff5cf');
 });
 obj('丸06','桌左红色长笔盒',M,g=>{rounded(g,.068,.20,.032,.026,-.439,.77,.171,'#ce526d',-Math.PI/2);box(g,.05,.002,.003,-.439,.787,.228,'#9c3e5d',false);});
 obj('丸07','展开的练习本',M,g=>openBook(g,.26,.225,-.185,.751,.14));
 obj('丸08','摊开的课本',M,g=>openBook(g,.305,.226,.103,.751,.14));
 obj('丸09','放在练习本的铅笔',M,g=>{tube(g,[[-.245,.783,.133],[-.137,.783,.217]],.0035,'#797061');tube(g,[[-.137,.783,.217],[-.125,.783,.226]],.0025,'#cfb787');});
 obj('丸10','木制书立',M,g=>rack(g,.39,.20,.749,-.208));
 obj('丸11','书立里的彩色书',M,g=>books(g,.025,.774,-.206,8,.042,.295,.136,['#c97fa9','#d7c8b1','#7eaaa0','#7fbaaa','#b9c7aa','#dfc076','#81a4c6','#7798bd']));
 obj('丸12','紫色笔筒和铅笔',M,g=>{
  const c=cyl(g,.034,.029,.085,.45,.796,.043,'#af5a91',true);cyl(g,.028,.028,.007,.45,.757,.043,'#9f4c81');
  for(const [dx,dz,h,color] of [[-.015,-.007,.14,'#75a0a9'],[.003,-.008,.153,'#d6ba78'],[.012,.007,.125,'#ca7ca7'],[-.005,.011,.137,'#9296ad']]){
   tube(g,[[.45+dx,.773,.043+dz],[.45+dx*1.5,.773+h,.043+dz*1.4]],.0032,color);
   ell(g,.003,.006,.003,.45+dx*1.5,.778+h,.043+dz*1.4,'#e9d2a6');
  }
 });
 const east=(z,y)=>[8.114,y,z,-Math.PI/2];
 obj('丸13','MoMoE 画像',[...east(5.39,1.47)],g=>{box(g,.44,.48,.012,0,0,0,'#f5e5d8');plane(g,.412,.452,0,0,.007,'#ffffff','momoe');},walls);
 obj('丸14','相反朝向的两面三角旗',east(5.93,1.91),g=>{
  polygon(g,[[-.24,.035],[.21,.12],[.21,-.045]],.004,0,0,0,'#d07bb5');
  tube(g,[[-.19,.036,.006],[.179,.10,.006],[.179,-.021,.006],[-.19,.036,.006]],.0026,'#f5cce1');
  tube(g,[[.04,.012,.006],[.092,.077,.006],[.12,.048,.006],[.15,.075,.006],[.174,-.009,.006]],.003,'#f2d5e4');
  polygon(g,[[-.22,-.16],[-.22,-.32],[.24,-.27]],.004,0,0,0,'#93b96e');
  tube(g,[[-.195,-.185,.006],[-.195,-.296,.006],[.179,-.267,.006],[-.195,-.185,.006]],.0028,'#dbd987');
  for(let i=0;i<9;i++){tube(g,[[.216,.11-i*.018,.003],[.243,.11-i*.018,.003]],.0018,'#b478a7');tube(g,[[-.225,-.16-i*.019,.003],[-.25,-.16-i*.019,.003]],.0018,'#719672');}
 },walls);
 obj('丸15','粉色郁金香小画',east(6.39,1.48),g=>{box(g,.227,.20,.013,0,0,0,'#cf90ae');plane(g,.206,.182,0,0,.008,'#ffffff','tulip');},walls);
 obj('丸16','蓝鱼七八月挂历',east(6.88,1.69),g=>{
  box(g,.383,.509,.003,0,0,0,'#f4e9dd',false);plane(g,.378,.504,0,0,.002,'#ffffff','calendar');
  tube(g,[[-.204,.262,.004],[.204,.262,.004]],.004,'#8a9195');
  tube(g,[[-.02,.264,0],[0,.285,0],[.02,.264,0]],.0025,'#8c8284');
 },walls);
 obj('丸17','桌左地面的红书包',offset(M,-.80,.012,.35),g=>schoolbag(g,.95));
 obj('丸18','桌右圆点带盖收纳箱',offset(M,.84,0,-.017),g=>{
  box(g,.455,.405,.57,0,.206,0,'#ffffff',true,'dots');box(g,.465,.048,.595,0,.435,0,'#ffffff',true,'dots');
  box(g,.454,.01,.572,0,.408,0,'#a575ab',false);
 });
 // Loose props keep the entry route clear and are optional in the viewer.
 obj('地01','摊开的彩色杂志',[5.86,.012,5.47,-.28],g=>openBook(g,.27,.20,0,0,0,'magazine'),loose);
 obj('地02','黄色绿色零食袋',[6.76,.052,6.19,-.4],g=>{
  const pos=[],uv=[],ix=[],nx=8,nz=10,stride=(nx+1)*(nz+1);
  for(let side=0;side<2;side++)for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const u=i/nx,v=j/nz,lift=Math.pow(Math.max(0,Math.sin(u*Math.PI)*Math.sin(v*Math.PI)),.65);
   pos.push((u-.5)*.23,side?-.042-.001*lift:-.026+.06*lift+.002*Math.sin(u*23)*(1-lift),(v-.5)*.32);uv.push(u,1-v);
  }
  for(let s=0;s<2;s++)for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=s*stride+j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;ix.push(a,c,b,b,c,d);}
  const perimeter=[];for(let i=0;i<=nx;i++)perimeter.push(i);for(let j=1;j<=nz;j++)perimeter.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)perimeter.push(nz*(nx+1)+i);for(let j=nz-1;j>0;j--)perimeter.push(j*(nx+1));
  for(let i=0;i<perimeter.length;i++){const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];ix.push(a,b,a+stride,b,b+stride,a+stride);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();K.mesh(geo,'#ffffff',g,false,'snack');
  box(g,.208,.008,.023,0,-.026,-.151,'#a7c28b',false);box(g,.205,.007,.022,0,-.026,.151,'#bdd396',false);
  ell(g,.07,.006,.018,0,-.025,.167,'#96754b');
 },loose);
 obj('地03','掉落的几片零食',[6.77,.012,6.43,.2],g=>{for(const [x,z,r] of [[-.07,0,.019],[.025,.045,.022],[.07,-.02,.018]])ell(g,r,.002,r*.73,x,.003,z,'#e2c46e');},loose);
 obj('地04','白色长耳兔玩偶',[6.91,.064,5.73,-.65],g=>{
  ell(g,.068,.061,.11,0,0,0,'#f5eee3');ell(g,.065,.055,.058,0,.01,.132,'#f5eee3');
  for(const s of [-1,1]){ell(g,.022,.016,.092,s*.046,.025,.237,'#f5eee3');ell(g,.011,.008,.059,s*.046,.04,.247,'#e8c5c7');ell(g,.027,.024,.05,s*.054,-.032,-.09,'#f2e8dd');ell(g,.065,.019,.025,s*.085,.005,.047,'#f4ece1');ell(g,.003,.004,.002,s*.023,.043,.181,'#8b7c77');}
  ell(g,.005,.003,.003,0,.028,.188,'#a48c84');ell(g,.027,.025,.029,0,.01,-.12,'#f5eee3');
 },loose);
 obj('地05','地面两本彩色杂志',[7.03,.013,6.65,.21],g=>{
  flatBook(g,0,0,0,.19,.24,.016,'#a1bdce');flatBook(g,.02,.018,.025,.19,.24,.013,'#d8a1bc');
  plane(g,.185,.23,.02,.049,.025,'#ffffff','cover',-Math.PI/2);
 },loose);
 const obstacles=[
  {name:'姐姐高柜',x:5.24,z:3.93,w:1.02,d:.37},{name:'小丸子矮柜',x:7.54,z:3.945,w:.98,d:.388},
  {name:'姐姐书桌',x:S[0],z:S[2],w:.62,d:1.15},{name:'小丸子书桌',x:M[0],z:M[2],w:.62,d:1.15},
  {name:'姐姐椅子',x:S[0]+.54,z:S[2]+.08,w:.40,d:.40},{name:'小丸子椅子',x:M[0]-.54,z:M[2]-.09,w:.46,d:.46},
  {name:'窗边小桌',x:T[0],z:T[2],w:.60,d:.43},{name:'圆点收纳箱',x:M[0]+.017,z:M[2]+.84,w:.595,d:.465}
 ];
 obj('房03','家具接地柔影',[0,0,0],g=>{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d'),gr=ctx.createRadialGradient(64,64,10,64,64,64);gr.addColorStop(0,'rgba(113,72,86,.20)');gr.addColorStop(.6,'rgba(113,72,86,.09)');gr.addColorStop(1,'rgba(113,72,86,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,128,128);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;K.resources.add(map);const mat=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false});K.resources.add(mat);
  for(const o of obstacles){const m=plane(g,o.w*1.22,o.d*1.1,o.x,.0085,o.z,'#ffffff',null,-Math.PI/2);m.material=mat;}
 });
 K.finish();
 root.userData={room:'sisters',specification:sistersSpecification,excluded:[{id:'地06',reason:'参考底边两处棕色尖角无法辨认，按方案不补造'}]};
 return {root,specification:sistersSpecification,entries:K.entries,obstacles,walls,loose,setLoose(v){loose.visible=!!v;},setWallMode(mode){walls.visible=mode==='full'||mode==='outer-hidden';},dispose:K.dispose};
}
