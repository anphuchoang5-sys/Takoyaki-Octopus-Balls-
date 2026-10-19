// Shared source for the exterior doorway and the independent room. +Z faces the street.
export const entryLayout=Object.freeze({facing:'+Z',door:{x:-.325,z:2.4,width:1.27},counter:[1.62,.32,.70],jars:[[.90,1.39,.95],[1.62,1.39,.95],[2.34,1.39,.95]],colors:{post:'#bc9c51',blue:'#619dd2',wood:'#c3a258'}});

export function makeEntrance(w,p,parent){
 const {THREE,group,box,cyl,ball,beam,ring,face,texture,batch}=w,C=entryLayout.colors;
 const front=group('左售卖窗 中央入口 右玻璃陈列',0,0,0,parent),edge='#8e7949',blue='#639ed0';
 front.userData.kind='entrance';front.userData.layout=entryLayout;
 for(const x of [-2.8,-1.04,.40,3.8])box(.16,3.2,.20,x,1.92,2.4,C.post,front);
 box(6.76,.14,.22,.5,3.45,2.4,C.post,front);
 for(const z of [2.34,2.46])box(6.55,.025,.035,.5,.336,z,'#8e928a',front);
 // Wooden lower panel, transparent middle pane, blue upper transom.
 box(1.60,.99,.16,-1.92,.815,2.41,'#bea15b',front);
 for(let i=0;i<6;i++)box(.012,.89,.008,-2.63+i*.28,.80,2.495,'#927c45',front,false);
 box(1.67,.09,.44,-1.92,1.31,2.29,'#ceb574',front);
 for(const y of [1.38,2.64,3.34])box(1.64,.065,.15,-1.92,y,2.41,edge,front);
 box(1.55,.64,.018,-1.92,2.99,2.409,'#9cc8dd',front,false);
 box(1.55,1.20,.014,-1.92,2.01,2.409,w.glass,front,false);
 for(const x of [.47,2.05,3.73])box(.065,2.93,.13,x,1.84,2.40,blue,front);
 for(const y of [.39,1.29,3.30])box(3.22,.055,.13,2.10,y,2.40,blue,front);
 for(const x of [1.26,2.89])box(1.51,2.84,.012,x,1.84,2.402,w.glass,front,false);
 for(const x of [1.96,2.14])box(.035,.19,.05,x,1.65,2.48,'#677d87',front);
 batch(front);
 const stand=group('售卖窗内木柜',-1.92,.32,1.98,parent);stand.userData.kind='steamer-stand';box(1.48,.98,.82,0,.49,0,'#bca160',stand);box(1.62,.07,.94,0,1.00,0,'#ceb574',stand);for(let i=0;i<5;i++)box(.01,.83,.006,-.60+i*.30,.46,-.414,'#9a8358',stand,false);batch(stand);
 const steamer=group('售卖窗后的银色蒸笼',-1.92,1.355,2.05,parent);steamer.userData.kind='steamer';
 cyl(.42,.44,.10,0,.05,0,'#919ca1',steamer,32);
 for(let i=0;i<3;i++){const y=.15+i*.205;cyl(.43,.43,.18,0,y,0,'#bdc6c8',steamer,40);ring(.432,.018,0,y+.09,0,'#7b8d95',steamer);ring(.43,.014,0,y-.08,0,'#e0e4df',steamer);for(const x of [-.48,.48]){beam([x*.89,y,0],[x,y+.025,.04],.024,'#77878b',steamer);beam([x,y+.025,.04],[x,y+.025,.14],.025,'#8a9697',steamer);}}
 ball(.44,.07,.44,0,.68,0,'#d1d8d4',steamer);cyl(.055,.055,.045,0,.764,0,'#697c85',steamer,16);batch(steamer);

 const poster=group('包子招贴',-1.30,2.76,2.55,parent);poster.rotation.z=.10;
 const bun=texture('bun-poster',384,512,(c,W,H)=>{c.fillStyle='#c66491';c.fillRect(0,0,W,H);c.fillStyle='#fff0e9';c.textAlign='center';c.font='bold 73px "Yu Gothic",sans-serif';c.fillText('にくまん',W/2,110);c.fillText('あんまん',W/2,461);c.beginPath();c.ellipse(W/2,267,104,78,0,0,Math.PI*2);c.fill();c.strokeStyle='#bd6490';c.lineWidth=5;for(let i=0;i<4;i++){c.beginPath();c.moveTo(157+i*20,207);c.quadraticCurveTo(175+i*7,239,166+i*18,259);c.stroke();}});
 box(.57,.82,.018,0,0,0,'#c66491',poster,false);face(.57,.82,0,0,.012,bun,poster);beam([-.24,.43,0],[.24,.43,0],.012,edge,poster);batch(poster);
 const noren=group('白底蓝绿饮料分片门帘',0,0,0,parent);noren.userData.kind='noren';beam([-.98,3.32,2.57],[2.16,3.32,2.57],.022,edge,noren);
 for(let i=0;i<5;i++){
  const tex=texture('drink-noren-'+i,256,256,(c,W,H)=>{c.fillStyle='#f2f4ef';c.fillRect(0,0,W,H);c.fillStyle='#78b9d4';for(const [x,y,r] of [[40,45,14],[206,189,14],[203,45,11],[54,174,11]]){c.beginPath();c.arc(x,y,r,0,7);c.fill();}if(i===1||i===3||i===4){const drawBottle=(x,color,s)=>{c.save();c.translate(x,0);c.scale(s,1);c.fillStyle=color;c.fillRect(-14,47,28,35);c.beginPath();c.moveTo(-14,80);c.lineTo(-28,110);c.lineTo(-28,214);c.lineTo(28,214);c.lineTo(28,110);c.lineTo(14,80);c.closePath();c.fill();c.fillStyle='#d2ede0';c.fillRect(-21,140,42,35);c.restore();};drawBottle(107,'#65b391',1);if(i===1||i===4)drawBottle(177,'#5e9fcb',.76);}else{c.fillStyle='#629fcc';c.beginPath();c.moveTo(82,104);c.lineTo(176,104);c.lineTo(164,215);c.lineTo(94,215);c.closePath();c.fill();c.fillStyle='#ec947e';c.fillRect(96,128,66,43);c.strokeStyle='#688fa8';c.lineWidth=7;c.beginPath();c.moveTo(144,127);c.lineTo(172,48);c.stroke();}});
  const g=group('帘片-'+i,-.67+i*.61,3.31,2.59,noren);g.rotation.z=[-.07,.035,-.025,.06,.12][i];g.rotation.y=[.04,-.03,.06,-.07,.03][i];
  const geometry=new THREE.PlaneGeometry(.595,.59,12,8),a=geometry.attributes.position;for(let j=0;j<a.count;j++){const x=a.getX(j),y=a.getY(j),t=(.295-y)/.59;a.setXYZ(j,x,y-.295,Math.sin(x*7+i)*.028*t+.045*t*t);}geometry.computeVertexNormals();
  const m=face(.595,.59,0,0,0,tex,g);m.geometry.dispose();m.geometry=geometry;const back=m.clone();back.geometry=geometry.clone();back.position.z=-.012;g.add(back);for(const x of [-.24,.24])box(.028,.085,.022,x,-.015,-.012,'#e0e7de',g,false);batch(g);
 }
 const furnishings=group('共享入口陈设',0,0,0,parent);const counter=p.counter(1.62,.70,furnishings),jars=entryLayout.jars.map((pos,i)=>p.jar(...pos,i,furnishings));p.clearBox(1.29,1.39,.24,furnishings);p.openCylinder(2.49,1.39,.22,furnishings);
 const bottles=group('成排小瓶和袋装商品',0,0,0,furnishings);for(let i=0;i<3;i++)p.bottle(.64+i*.18,1.39,.22,['#5fa38d','#d39a68','#7aa5bd'][i%3],bottles);for(let i=0;i<3;i++)p.pack(1.88+i*.17,1.39,.20,i,bottles,.72);batch(bottles);
 const rack=group('玻璃门后的低矮零食货架',2.16,.32,1.93,furnishings);rack.userData.kind='low-rack';box(2.74,.13,.54,0,.065,0,'#92704c',rack);box(2.74,.34,.045,0,.30,-.25,'#ba965f',rack);for(const x of [-1.35,1.35])box(.055,.35,.58,x,.30,0,'#bda16b',rack);
 for(let row=0;row<2;row++){const z=-.15+row*.28,y=.27-row*.07;box(2.65,.045,.27,0,y,z,'#c2aa7a',rack);box(2.67,.10,.025,0,y+.03,z+.135,'#99754b',rack);for(let i=0;i<13;i++)p.pack(-1.20+i*.20,y+.025,z,i+row,rack,.65);for(let k=1;k<5;k++)box(.022,.17,.25,-1.35+k*.54,y+.07,z,'#a78957',rack);}batch(rack);
 const merchandise=group('门帘后与玻璃门前彩色悬挂商品',0,0,0,parent);merchandise.userData.kind='merchandise';const colors=['#4ca7db','#ef83b7','#e5c858','#7db48c','#a592cd'];
 const cards=[{x:.86,y:2.70,w:.57,h:.75,c:0,z:2.23},{x:1.52,y:2.62,w:.53,h:.78,c:3,z:2.24},{x:2.20,y:2.72,w:.65,h:.87,c:1,z:2.53},{x:2.91,y:2.72,w:.57,h:.93,c:2,z:2.23},{x:3.50,y:2.67,w:.61,h:.80,c:2,z:2.55}];
 for(let i=0;i<cards.length;i++){const {x,y,w:width,h,c,z}=cards[i],g=group('彩色挂板-'+i,x,y,z,merchandise);g.rotation.z=[-.025,.028,-.035,.04,-.02][i];g.userData.kind='hanging-card';box(width,h,.025,0,0,0,colors[c],g);beam([0,h/2+.03,0],[0,3.34-y,0],.007,'#8b8975',g);box(width*.92,.075,.035,0,h/2-.055,.02,['#d75d91','#49a28b','#d17889'][i%3],g,false);for(let k=0;k<5;k++)box(.027,.025,.003,-width*.34+k*width*.16,h/2-.052,.04,'#fff4dc',g,false);
  const cols=i===2?2:3,rows=i===2?2:3;for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const xx=(col-(cols-1)/2)*(width*.87/cols),yy=h*.25-row*(h*.72/rows),pw=width*.75/cols,ph=h*.57/rows;box(pw,ph,.047,xx,yy,.048,'#f2eee7',g,false);box(pw*1.07,.018,.053,xx,yy+ph*.48,.048,'#d7dfe2',g,false);const candy=ball(pw*.30,ph*.34,.017,xx,yy,.080,colors[(row+col+i)%5],g);candy.rotation.z=.24*((row+col)%3-1);box(pw*.50,.013,.005,xx,yy-ph*.39,.080,colors[(i+2)%5],g,false);}batch(g);
 }
 const pegboard=group('入口后方小包装墙',.65,2.49,1.64,merchandise);box(.65,.65,.025,.20,.20,-.035,'#8e90b7',pegboard);for(const x of [-.06,.46])beam([x,.53,0],[x,.88,0],.008,'#8a8173',pegboard);for(let row=0;row<3;row++)for(let col=0;col<3;col++){box(.18,.17,.04,col*.20,row*.19,0,['#67b6ad','#8d8dce','#dbb766'][(col+row)%3],pegboard);box(.11,.045,.006,col*.20,row*.19,.024,'#eeece4',pegboard,false);}batch(pegboard);
 return {front,noren,merchandise,furnishings,steamer,counter,jars,signature:entryLayout};
}

export function makeStreetProps(w,parent){
 const {THREE,group,box,cyl,beam,solid,face,texture,batch}=w;
 const freezer=group('浅蓝冰淇淋柜',2.20,.045,3.70,parent);freezer.userData.kind='freezer';for(const x of [-1.08,1.08])for(const z of [-.51,.51])box(.11,.08,.12,x,.04,z,'#597880',freezer);
 box(2.65,.89,1.46,0,.525,0,'#90bfd4',freezer);box(2.69,.06,1.49,0,.98,0,'#648a9c',freezer);
 for(const x of [-1.325,1.29]){const side=solid([[-.73,.99],[-.73,1.49],[.73,1.02]],.035,'#a9c7d6',freezer);side.rotation.y=-Math.PI/2;side.position.x=x+.035;}
 const angle=Math.atan(.47/1.46),lid=box(2.59,.045,Math.hypot(1.46,.47),0,1.255,0,'#b5cbd4',freezer);lid.rotation.x=angle;box(2.68,.25,.045,0,1.58,-.73,'#94b3c4',freezer);box(2.72,.035,.065,0,1.715,-.73,'#5c7d91',freezer);
 for(const x of [-1.31,1.31])beam([x,1.02,.74],[x,1.49,-.74],.025,'#587d96',freezer);box(.23,.035,.06,0,1.052,.65,'#6c8799',freezer);
 const label=texture('icecream-front',1536,512,(c,W,H)=>{c.fillStyle='#e9f1ec';c.fillRect(0,0,W,H);c.fillStyle='#ce629b';c.textAlign='center';c.font='bold 195px "Yu Gothic",Meiryo,sans-serif';c.fillText('アイスクリーム',W/2,232,W*.97);c.strokeStyle='#ce629b';c.lineWidth=5;c.strokeText('アイスクリーム',W/2,232,W*.97);c.fillStyle='#27afdc';c.beginPath();c.moveTo(0,H);for(let x=0;x<=W;x+=5)c.lineTo(x,355+Math.sin(x/125)*42);c.lineTo(W,H);c.fill();for(let k=0;k<8;k++){c.beginPath();c.ellipse(80+k*190,282+(k%2)*25,13,19,.2,0,7);c.fill();}});face(2.59,.82,0,.545,.738,label,freezer);box(2.70,.065,.07,0,.12,.75,'#518cae',freezer);box(.065,.085,.055,.18,1.067,.76,'#ccb65b',freezer);batch(freezer);
 // Upright loose roll: slats follow a spiral in plan, ending in an unrolled flap.
 const blind=group('右侧竖靠松卷竹帘',4.32,.045,1.87,parent);blind.userData.kind='gathered-blind';blind.userData.design='Along the right side wall, behind the front facade; coil section and ties completed from the reference silhouette';blind.rotation.set(0,Math.PI/2,.045,'ZYX');
 const roll=[];for(let i=0;i<76;i++){const t=i/75,a=Math.PI+3.5*Math.PI*(1-t),r=.065+.205*t;roll.push([Math.cos(a)*r,Math.sin(a)*r*.84]);}
 roll.push([-.282,.038],[-.294,.078],[-.318,.116],[-.352,.146],[-.391,.169],[-.433,.184],[-.477,.191]);
 roll.forEach(([x,z],i)=>cyl(.015,.016,3.18,x,1.59,z,['#c1ae65','#b2a05a','#cdbb74','#bba766'][i%4],blind,8));
 for(const y of [.075,.80,1.65,2.50,3.105]){const curve=new THREE.CatmullRomCurve3(roll.map(([x,z])=>new THREE.Vector3(x,y,z)));w.mesh(new THREE.TubeGeometry(curve,160,.008,5,false),'#94834e',blind);}
 for(const y of [.43,1.55,2.69]){for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;beam([.289*Math.cos(a),y,.245*Math.sin(a)],[.289*Math.cos(b),y,.245*Math.sin(b)],.011,'#88794f',blind);}beam([-.075,y-.025,.244],[-.025,y+.022,.252],.016,'#88794f',blind);beam([-.045,y,.252],[-.09,y-.15,.261],.010,'#88794f',blind);beam([-.035,y,.251],[.01,y-.105,.262],.010,'#88794f',blind);}
 blind.updateWorldMatrix(true,true);blind.position.y+=.045-new THREE.Box3().setFromObject(blind,true).min.y;batch(blind);
 const boxes=group('右侧货箱',4.60,.045,.64,parent);boxes.userData.kind='cargo-boxes';box(1.04,1.18,1.04,0,.59,0,'#8e7777',boxes);box(1.10,.05,1.08,0,1.195,0,'#ab9290',boxes);box(.96,.42,.94,.03,1.43,-.03,'#bc9b75',boxes);for(const y of [.15,.99])box(.86,.04,.03,0,y,.534,'#7c6a63',boxes);for(const x of [-.44,.44])box(.035,.36,.025,x,1.44,.455,'#927f64',boxes);
 const cargo=texture('cargo-markings',384,128,(c,W,H)=>{c.fillStyle='#b39686';c.fillRect(0,0,W,H);c.fillStyle='#e0d3bf';for(let i=0;i<5;i++){c.fillRect(26+i*65,40,44,13);c.fillRect(35+i*65,55,16,25);}});face(.84,.25,.03,1.44,.453,cargo,boxes);batch(boxes);
 const bench=group('门前低矮长凳',-1.97,.045,4.12,parent);bench.userData.kind='bench';for(const x of [-.93,.93])for(const z of [-.18,.18])box(.105,.43,.10,x,.215,z,'#946f61',bench);for(const z of [-.17,.02,.21])box(2.30,.085,.17,0,.48,z,'#b68c79',bench);for(const z of [-.20,.20])box(2.05,.12,.06,0,.35,z,'#997465',bench);batch(bench);
 const dog=group('木制狗屋',-5.40,.045,2.57,parent);dog.userData.kind='doghouse';dog.rotation.y=Math.PI/2;dog.userData.doorFacing='+X toward shop';box(1.38,.075,1.43,0,.0375,0,'#a48d58',dog);box(1.38,.96,.07,0,.52,-.68,'#c0a46a',dog);const rear=solid([[-.69,1.0],[.69,1.0],[0,1.47]],.07,'#c0a46a',dog);rear.position.z=-.715;for(const x of [-.655,.655])box(.07,.96,1.34,x,.52,0,'#c9b06f',dog);
 for(const x of [-.694,.694])for(let row=0;row<4;row++)box(.008,.010,.31+(row%2)*.18,x,.22+row*.18,-.20+(row%3)*.12,'#ab925d',dog,false);
 const shape=new THREE.Shape();shape.moveTo(-.69,.06);shape.lineTo(-.69,1.0);shape.lineTo(0,1.47);shape.lineTo(.69,1.0);shape.lineTo(.69,.06);shape.lineTo(.34,.06);shape.lineTo(.34,.60);shape.absarc(0,.60,.34,0,Math.PI,false);shape.lineTo(-.34,.06);shape.closePath();const portal=w.mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false}),'#cbb477',dog,true);portal.position.z=.63;
 box(1.12,.79,.012,0,.47,-.637,'#665b4e',dog);for(let row=0;row<4;row++)for(const side of [-1,1])box(.24,.012,.01,side*.51,.19+row*.20,.708,'#a38b58',dog,false);const slope=.47/.69;for(const side of [-1,1]){const r=box(.86*Math.sqrt(1+slope*slope),.06,1.61,side*.38,1.48-slope*.38,0,'#b875a5',dog);r.rotation.z=-side*Math.atan(slope);}beam([0,1.50,-.82],[0,1.50,.82],.035,'#916d96',dog);batch(dog);
 return {freezer,blind,boxes,bench,dog};
}

export function makeLandscape(w,parent){
 const {THREE,group,box,ball,solid,batch}=w,g=group('14×14 草地与门前石板路',0,0,0,parent);g.userData.kind='landscape';
 g.userData.zones={frontStone:[-6.975,6.975,3.45,6.975],entryStone:[-2.90,4.05,2.40,3.45],grass:'sides and rear',reference:'D pink blossoms and low shrubs; existing rear-left low shrub flowered at user request on 2026-10-19; hidden bloom distribution designed'};
 box(14,.14,14,0,-.07,0,'#8d9f78',g);
 // Coplanar grass and stone are separate solids; no transparent lawn overlays.
 function patch(x0,x1,z0,z1,c){box(x1-x0,.045,z1-z0,(x0+x1)/2,.0225,(z0+z1)/2,c,g,false);}
 patch(-6.975,6.975,-6.975,2.4,'#a6bd76');patch(-6.975,-2.9,2.4,3.45,'#aac17b');patch(4.05,6.975,2.4,3.45,'#a0b872');
 function pave(x0,x1,z0,z1,rows){const colors=['#bcc6ce','#b4c1cd','#c4cbd1','#b8c3cc','#c1c8ce'],step=1.39,d=(z1-z0)/rows;box(x1-x0,.020,z1-z0,(x0+x1)/2,.010,(z0+z1)/2,'#929f9e',g,false);
  for(let row=0;row<rows;row++)for(let col=-1;col<12;col++){const start=x0+col*step+(row%2)*step*.5,lo=Math.max(x0,start),hi=Math.min(x1,start+step);if(hi-lo<.035)continue;box(hi-lo-.024,.025,d-.023,(lo+hi)/2,.0325,z0+(row+.5)*d,colors[(col+row*3+15)%5],g,false);}
 }
 pave(-6.975,6.975,3.45,6.975,4);pave(-2.90,4.05,2.4,3.45,2);
 let seed=153;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 // Short tufts preserve the clear shop threshold and leave props readable.
 for(let i=0;i<160;i++){const x=-6.65+rand()*13.3,z=-6.65+rand()*9.9;
  if(x>-3.02&&x<4.02&&z>-2.62&&z<2.63)continue;
  if(x>-6.25&&x<-4.55&&z>1.60&&z<3.43)continue;
  if(x>3.82&&x<5.20&&z>-.02&&z<2.52)continue;
  if(z>2.40&&x>-2.95&&x<4.10)continue;
  const tuft=group('低草簇',x,.045,z,g);for(let k=0;k<3;k++){const h=.065+rand()*.13,blade=solid([[-.024,0],[-.008,h*.61],[.040,h],[.026,h*.40],[.020,0]],.006,['#8aab5e','#9db96b','#c0d18b'][(i+k)%3],tuft);blade.clear();blade.rotation.y=k*1.05+rand();blade.rotation.z=(rand()-.5)*.5;}batch(tuft);
 }
 function shrub(name,x,z,r,h,flowering=false){const plant=group(name,x,.045,z,g);const lobes=[[-.38,.18,.63,.71],[.15,0,.75,1],[.52,.12,.51,.64]];
  lobes.forEach(([dx,dz,scale,tall],j)=>{const rx=r*scale,ry=h*tall*.5,zz=dz*r,xx=dx*r;ball(rx,ry,rx*.72,xx,ry,zz,['#719a58','#7da45c','#88ac61'][j],plant);for(let k=0;k<7;k++){const angle=-1.05+k*.30,up=.25+(k%3)*.18,py=ry+up*ry,fac=Math.sqrt(1-up*up);const leaf=ball(.015,.045,.008,xx+Math.sin(angle)*rx*fac,py,zz+Math.cos(angle)*rx*.72*fac+.004,['#b3c878','#a2bf6b'][k%2],plant);leaf.rotation.z=.12*Math.sin(k);}});batch(plant);
  if(flowering){
   // Short, solid blossoms follow the existing leaf canopy; no tall stalks or new mound.
   const surfaces=lobes.map(([dx,dz,scale,tall])=>({x:dx*r,z:dz*r,rx:r*scale,ry:h*tall*.5,rz:r*scale*.72}));
   const petalGeometry=new THREE.SphereGeometry(1,8,6),normalAxis=new THREE.Vector3(0,0,1);let count=0;
   function petal(rx,ry,rz,x,y,z,color,parent){const m=w.mesh(petalGeometry,color,parent);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
   surfaces.forEach((s,j)=>{const n=[23,36,18][j];for(let i=0;i<n;i++){
    const up=.12+.87*(i+.5)/n,a=i*2.399963+j*.81,side=Math.sqrt(1-up*up),dx=Math.cos(a)*side,dz=Math.sin(a)*side;
    const p=new THREE.Vector3(s.x+dx*s.rx,s.ry+up*s.ry,s.z+dz*s.rz);
    if(surfaces.some((other,k)=>k!==j&&((p.x-other.x)/other.rx)**2+((p.y-other.ry)/other.ry)**2+((p.z-other.z)/other.rz)**2<1.04))continue;
    const normal=new THREE.Vector3(dx/s.rx,up/s.ry,dz/s.rz).normalize();p.addScaledVector(normal,.017);
    const head=group('低灌木粉色小花',p.x,p.y,p.z,plant);head.quaternion.setFromUnitVectors(normalAxis,normal);head.rotateZ(a);
    const size=.80+.22*((i*7+j*3)%11)/10,color=['#e8a5c5','#efb8d1','#e59bbc','#f2ccdc'][(i+j)%4];
    petal(.025,.025,.015,0,0,-.016,'#719a58',head);
    for(let k=0;k<8;k++){const t=k*Math.PI/4,part=petal(.017*size,.038*size,.008,Math.sin(t)*.029*size,Math.cos(t)*.029*size,0,color,head);part.rotation.z=-t;}
    petal(.016*size,.016*size,.011,0,0,.008,'#e9d78b',head);count++;
   }});
   plant.userData={kind:'flowering-shrub',flowerCount:count,reference:'D anime pink flowers; placement on existing low shrub chosen by user; hidden distribution designed'};batch(plant);
  }
  return plant;
 }
 shrub('参考右侧矮灌木',5.94,.40,.76,.89);shrub('后方低灌木补全',1.90,-4.65,.90,.61);
 const floweringShrub=shrub('左后草丛补全',-4.54,-3.95,.58,.47,true);floweringShrub.removeFromParent();
 batch(g);
 g.add(floweringShrub);
 return g;
}
