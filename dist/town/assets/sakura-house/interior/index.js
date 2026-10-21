import {workshop} from './workshop.js';
import {createSistersRoom} from './sisters-room.js';
import {createLivingRoom,livingColors} from './living-room.js';
import {rooms,walls,connections,routes,entry,HEIGHT,WALL,sources} from './plan.js';

export const specification={id:'sakura-house-interior',revision:'interior-03-living',title:'按参考方案复原樱家',stage:'客厅精修待审 · 姐妹房保留 · 其余结构样板',units:'metres',independentScene:true,officialLayout:false};
export function createInterior(){
 const W=workshop(),{THREE,root,group,box,cyl,ellipsoid,tube,batch}=W;
 const floors=group('房间地面'),fullWalls=group('完整墙体'),cutWalls=group('剖视低墙'),doors=group('门扇'),ceilings=group('完整天花顶盖'),furniture=group('主要家具'),storageShelves=group('壁橱层板',furniture);
 const wallParts=[],obstacles=[],doorLeaves=[],furnitureItems=[];
 const living=createLivingRoom();
 const C={wood:'#a9784d',dark:'#705742',trim:'#927052',wall:'#f0e7cc',paper:'#f6efd4',green:'#6c8e74',mint:'#8dcba6',pink:'#e9b9b5',metal:'#b1c2c1',blue:'#638db2'};
 function addObj(name,x,z,rot,fn,footprint=null){const g=group(name,furniture),floor=rooms.find(r=>x>r.r[0]&&x<r.r[2]&&z>r.r[1]&&z<r.r[3]),y=floor?.y||0;g.position.set(x,y,z);g.rotation.y=rot;fn(g);batch(g);furnitureItems.push({name,position:[x,y,z],rotation:rot});if(footprint){const [w,d]=footprint,c=Math.abs(Math.cos(rot)),s=Math.abs(Math.sin(rot));obstacles.push({name,x,z,w:w*c+d*s,d:d*c+w*s});}return g;}
 const base=group('独立室内底座');box(10.25,.34,7.52,4.995,-.27,3.64,'#b8afa1',base);box(1.94,.34,5.58,10.98,-.27,4.61,'#b8afa1',base);box(1.94,.34,1.94,10.98,-.43,.85,'#b8afa1',base);box(2.06,.34,1.03,.91,-.27,-.455,'#b8afa1',base);box(2.06,.34,1.03,.91,-.27,7.735,'#b8afa1',base);batch(base);
 function tatami(r,g){const [x0,z0,x1,z1]=r.r,wi=x1-x0-.13,de=z1-z0-.13,x=x0+.065,z=z0+.065;let tiles=[];
  if(r.floor==='tatami8'){const a=wi/4,b=de/4;tiles=[[0,0,2*a,b],[2*a,0,2*a,b],[0,b,a,2*b],[3*a,b,a,2*b],[a,b,2*a,b],[a,2*b,2*a,b],[0,3*b,2*a,b],[2*a,3*b,2*a,b]];}
  else if(r.floor==='tatami6'){const a=wi/4,b=de/3;tiles=[[0,0,2*a,b],[2*a,0,2*a,b],[0,b,a,2*b],[a,b,2*a,b],[a,2*b,2*a,b],[3*a,b,a,2*b]];}
  else {const a=wi/3,b=de/4;tiles=[[0,0,a,2*b],[0,2*b,a,2*b],[a,0,2*a,b],[a,b,a,2*b],[2*a,b,a,2*b],[a,3*b,2*a,b]];}
  for(const [tx,tz,w,d] of tiles){box(w-.013,.052,d-.013,x+tx+w/2,-.026,z+tz+d/2,r.color,g,false);const border=r.id==='living'?livingColors.floorLine:r.id==='sisters'?'#af8d94':'#78896a';
   for(const dx of [-1,1])box(.026,.004,d-.012,x+tx+w/2+dx*(w-.04)/2,.002,z+tz+d/2,border,g,false);
   // Fine geometry rhythm is retained in source; no flat room-photo textures.
   if(r.id==='living'){for(let v=.07;v<d;v+=.095)for(const dx of [.025,w-.055])box(.028,.001,.004,x+tx+dx,.003,z+tz+v,'#aaa078',g,false);}
   else for(let v=.06;v<d;v+=.085)box(w-.075,.002,.003,x+tx+w/2,.001,z+tz+v,r.id==='sisters'?'#d8b6b5':'#bec493',g,false);
  }
 }
 for(const r of rooms){const [a,b,c,d]=r.r,w=c-a,dep=d-b,y=r.y||0,g=group('floor:'+r.id,floors);g.userData={room:r.id};
  box(w,.1,dep,(a+c)/2,y-.052,(b+d)/2,r.color,g,false);
  if(r.floor.startsWith('tatami')&&r.id!=='sisters')tatami(r,g);
  else if(r.floor==='wood'){for(let z=b+.16;z<d;z+=.20)box(w-.03,.003,.008,(a+c)/2,y+.001,z,'#b58d61',g,false);for(let z=b+.06,k=0;z<d;z+=.6,k++)for(let x=a+.5+(k%2)*.65;x<c;x+=1.4)box(.006,.003,.19,x,y+.001,z,'#bd966a',g,false);}
  else if(r.floor==='tile'){for(let x=a+.23;x<c;x+=.24)box(.008,.002,dep,x,y+.001,(b+d)/2,'#e3e6d9',g,false);for(let z=b+.23;z<d;z+=.24)box(w,.002,.008,(a+c)/2,y+.001,z,'#e3e6d9',g,false);}
  batch(g);
  const ceiling=group('ceiling:'+r.id,ceilings);box(w,.10,dep,(a+c)/2,HEIGHT+.07,(b+d)/2,'#e1c9a5',ceiling);for(let x=a+.6;x<c;x+=.61)box(.022,.015,dep,x,HEIGHT+.012,(b+d)/2,'#b49a78',ceiling,false);batch(ceiling);
 }
 // The genkan is a genuine lowered floor, with a single riser into the raised hall.
 const step=group('玄关上框台阶');box(1.70,.16,.14,10.92,-.08,1.82,C.dark,step);box(1.74,.045,.20,10.92,.012,1.88,C.wood,step);batch(step);
 function wallColor(x,z){const r=rooms.find(r=>x>r.r[0]&&x<r.r[2]&&z>r.r[1]&&z<r.r[3]);return r?.id==='sisters'?C.pink:r?.id==='kitchen'?C.mint:r?.id==='bath'?'#bdcfd7':r?.id==='parents'?'#ece0b1':C.wall;}
 function wallBox(w,a,b,y0,y1,c,g,thick=WALL,offset=0){if(b-a<.001||y1-y0<.001)return;const x=w.axis==='x'?(a+b)/2:w.at+offset,z=w.axis==='x'?w.at+offset:(a+b)/2;return box(w.axis==='x'?b-a:thick,y1-y0,w.axis==='x'?thick:b-a,x,(y0+y1)/2,z,c,g);}
 function chunk(w,a,b,y0,y1,g){wallBox(w,a,b,y0,y1,C.wall,g);const mid=(a+b)/2;for(const s of [-1,1]){const side=w.at+s*.15,color=wallColor(w.axis==='x'?mid:side,w.axis==='x'?side:mid),inside=w.axis==='x'?side>3.64&&side<7.28:side>8.19&&side<11.83;
   // Split only the living-facing skin at its room boundaries; all other faces retain their prior colour.
   const cuts=inside?[a,...(w.axis==='x'?[8.19,11.83]:[3.64,7.28]).filter(v=>v>a&&v<b),b]:[a,b];
   for(let i=1;i<cuts.length;i++){const lo=cuts[i-1],hi=cuts[i],m=(lo+hi)/2,x=w.axis==='x'?m:side,z=w.axis==='x'?side:m,isLiving=x>8.19&&x<11.83&&z>3.64&&z<7.28;wallBox(w,lo,hi,y0,y1,isLiving?livingColors.wall:color,g,.006,s*(WALL/2+.003));}
  }if(y0===0)wallBox(w,a,b,0,.08,C.trim,g,WALL+.014);}
 function panel(w,o,g,kind){const len=o.b-o.a,h=o.h,base=o.sill;
  for(const p of [o.a+.025,o.b-.025])wallBox(w,p-.025,p+.025,base,base+h,C.trim,g,WALL+.025);
  wallBox(w,o.a,o.b,base-.025,base+.025,C.trim,g,WALL+.045);wallBox(w,o.a,o.b,base+h-.025,base+h+.025,C.trim,g,WALL+.025);
  const shoji=kind==='shoji-window';wallBox(w,o.a+.05,o.b-.05,base+.05,base+h-.05,shoji?C.paper:'#92b6cf',g,.035);
  wallBox(w,(o.a+o.b)/2-.018,(o.a+o.b)/2+.018,base,base+h,C.trim,g,.06);
  for(let y=base+(shoji?.27:h*.55);y<base+h-.1;y+=shoji?.26:h)wallBox(w,o.a,o.b,y-.012,y+.012,C.trim,g,.06);
  if(shoji)for(let a=o.a+.28;a<o.b;a+=.28)wallBox(w,a-.009,a+.009,base,base+h,C.trim,g,.06);
 }
 function door(w,o){if(o.kind==='open')return;const len=o.b-o.a,hinge=o.kind==='hinge',closed=o.kind==='closet',isEntry=o.kind==='entry',shoji=o.kind==='shoji';
  const x=w.axis==='x'?o.a:w.at,z=w.axis==='x'?w.at:o.a,frame=group('frame:'+w.id,fullWalls);for(const v of [o.a+.018,o.b-.018])wallBox(w,v-.025,v+.025,o.sill,o.sill+o.h+.035,C.trim,frame,WALL+.025);wallBox(w,o.a,o.b,o.sill+o.h-.025,o.sill+o.h+.035,C.trim,frame,WALL+.025);batch(frame);frame.userData.wall=w.id;wallParts.push({group:frame,outer:w.outer||false});
  const cg=group('door:'+w.id+':'+o.a,doors);cg.position.set(x,o.sill,z);cg.rotation.y=w.axis==='x'?0:-Math.PI/2;
  const n=hinge?1:2,pw=(len-.075)/n,ph=o.h-.07;
  for(let i=0;i<n;i++){const leaf=group('门扇 '+i,cg);const p=group('门板几何',leaf);let pc=isEntry?'#b5c7c5':shoji?C.paper:rColor(w.id);
   box(pw,ph,.045,pw/2,ph/2+.025,0,pc,p);
   for(const xx of [.02,pw-.02])box(.035,ph,.06,xx,ph/2+.025,0,C.trim,p,false);
   for(const yy of [.04,ph+.01])box(pw,.04,.06,pw/2,yy,0,C.trim,p,false);
   if(shoji||isEntry){for(let xx=.20;xx<pw;xx+=.20)box(.016,ph,.062,xx,ph/2+.025,0,C.trim,p,false);for(let yy=.25;yy<ph;yy+=.26)box(pw,.016,.062,pw/2,yy,0,C.trim,p,false);}
   else if(w.id==='living-corridor'){living.decorateDoor(p,pw,ph);}
   else if(!hinge){box(pw,.24,.05,pw/2,.83,0,'#b4ad79',p,false);}
   else {box(pw-.13,ph-.22,.05,pw/2,ph/2+.025,0,'#c69d70',p);}
   if(w.id!=='living-corridor')box(.045,.08,.085,pw-.08,1.03,.01,C.dark,p);batch(p);
   const closedPosition=[.035+i*pw,0,i*.052];leaf.position.fromArray(closedPosition);
   const stackRight=w.id==='parents-corridor'||w.id==='grandparents-corridor'||w.id==='grandparents-engawa';
   const openPosition=hinge?[.035,0,0]:[.035+(stackRight?pw:0),0,i*.064];
   if(hinge){const room=rooms.find(r=>r.id===o.room),side=room?(((w.axis==='x'?(room.r[1]+room.r[3])/2:(room.r[0]+room.r[2])/2)-w.at)>0?1:-1):1;doorLeaves.push({leaf,closedPosition,openPosition,angle:w.axis==='x'?-side*Math.PI/2:side*Math.PI/2,closed});}
   else doorLeaves.push({leaf,closedPosition,openPosition,angle:0,closed});
  }
 }
 function rColor(id){return id==='living-corridor'?'#faf0c3':id.includes('sisters')?'#f1d6cf':'#f5eac9';}
 for(const w of walls){const g=group('wall:'+w.id,fullWalls),low=group('cut:'+w.id,cutWalls),open=[...(w.open||[])].sort((a,b)=>a.a-b.a);let at=w.a;
  for(const o of open){chunk(w,at,o.a,0,HEIGHT,g);chunk(w,at,o.a,0,.42,low);if(o.sill){chunk(w,o.a,o.b,0,o.sill,g);chunk(w,o.a,o.b,0,Math.min(.42,o.sill),low);}chunk(w,o.a,o.b,o.sill+o.h,HEIGHT,g);
   if(o.kind.includes('window'))panel(w,o,g,o.kind);else door(w,o);at=o.b;
  }chunk(w,at,w.b,0,HEIGHT,g);chunk(w,at,w.b,0,.42,low);wallBox(w,w.a,w.b,HEIGHT-.10,HEIGHT,C.trim,g,WALL+.02);batch(g);batch(low);wallParts.push({group:g,outer:!!w.outer});
 }
 // Furniture bodies use boards, legs, inset fronts and hollow basins even in this structure pass.
 function cabinet(g,w,h,d,color=C.wood,open=false,noTop=false){box(w,h,.055,0,h/2,-d/2+.025,color,g);for(const x of [-w/2+.025,w/2-.025])box(.05,h,d,x,h/2,0,color,g);for(const y of noTop?[.06]:[.06,h])box(w,.055,d,0,y,0,color,g);
  if(open){for(let y=.38;y<h-.1;y+=.35)box(w-.08,.035,d-.02,0,y,0,color,g);for(let k=0;k<5;k++){const hh=.19+(k%3)*.035;box(.075,hh,.16,-w*.32+k*.11,.08+hh/2,d*.12,['#e1c477','#a5b8aa','#cba49d','#91adbd','#e2d4ac'][k],g);}}
  else for(const s of [-1,1]){box(w/2-.045,h-.15,.045,s*w/4,h/2+.02,d/2,color,g);box(.025,.095,.04,s*.07,h*.56,d/2+.04,C.dark,g);}
  for(const x of [-w*.36,w*.36])for(const z of [-d*.30,d*.30])box(.06,.08,.06,x,.04,z,C.dark,g,false);
 }
 function table(g,w,d,h,color=C.wood){box(w,.065,d,0,h-.0325,0,color,g);box(w-.09,.08,d-.09,0,h-.10,0,C.trim,g,false);for(const x of [-w/2+.09,w/2-.09])for(const z of [-d/2+.09,d/2-.09])box(.055,h-.065,.055,x,(h-.065)/2,z,C.trim,g);}
 function chair(g,c='#a68158'){box(.39,.05,.39,0,.42,0,c,g);for(const x of [-.155,.155])for(const z of [-.155,.155])box(.035,.43,.035,x,.215,z,C.dark,g,false);for(const x of [-.155,.155])box(.035,.44,.035,x,.63,-.16,c,g,false);box(.35,.18,.035,0,.78,-.16,c,g);}
 function desk(g){table(g,1.02,.61,.72,'#6f9d8c');box(.32,.59,.56,-.31,.315,0,'#bb9a71',g);for(let y=.19;y<.65;y+=.19){box(.27,.16,.025,-.31,y,.29,'#ceb38e',g);box(.09,.018,.025,-.31,y,.315,C.dark,g,false);}box(.98,.32,.07,0,.9,-.26,'#a98b61',g);box(.98,.035,.21,0,1.04,-.19,'#bb9a71',g);}
 furniture.add(living.root);obstacles.push(...living.obstacles);
 for(const e of living.entries)furnitureItems.push({name:e.name,checklist:e.id,room:'living',position:e.group.position.toArray(),rotation:e.group.rotation.y});
 const sisters=createSistersRoom();furniture.add(sisters.root);obstacles.push(...sisters.obstacles);
 for(const e of sisters.entries)furnitureItems.push({name:e.name,checklist:e.id,room:'sisters',position:e.group.position.toArray(),rotation:e.group.rotation.y});
 addObj('父母房衣柜',2.18,.55,Math.PI/2,g=>cabinet(g,.85,1.78,.46,'#a17d59'),[.85,.46]);
 addObj('父母房镜台',2.25,2.34,Math.PI,g=>{table(g,.70,.40,.56);box(.49,.83,.045,0,.99,-.16,C.trim,g);box(.40,.72,.022,0,.99,-.132,'#b4cdcb',g);},[.70,.40]);
 addObj('祖父母房南窗低柜',1.75,6.94,Math.PI,g=>cabinet(g,.88,.52,.42,'#a48256'),[.88,.42]);
 // Kitchen footprint follows the adopted plan; appliance shapes/color reference animation.
 addObj('厨房冰箱',6.78,.43,0,g=>{box(.64,1.58,.65,0,.79,0,'#d7e4cc',g);for(const [y,h] of [[1.30,.48],[.53,.91]]){box(.60,h,.035,0,y,.342,'#e3eacb',g);box(.028,.20,.04,-.22,y,.38,C.trim,g);}box(.6,.04,.60,0,.04,0,C.dark,g);},[.64,.65]);
 addObj('水槽与灶台',8.50,.42,0,g=>{cabinet(g,2.45,.79,.65,'#a3bf8c',false,true);
  // Sink recess: separate rim strips around an actual cavity.
  box(.37,.045,.65,-1.04,.83,0,C.metal,g);box(1.08,.045,.65,.685,.83,0,C.metal,g);box(.98,.045,.10,-.35,.83,-.275,C.metal,g);box(.98,.045,.10,-.35,.83,.275,C.metal,g);
  box(.98,.24,.025,-.35,.705,-.217,'#8ca7aa',g);box(.98,.24,.025,-.35,.705,.217,'#8ca7aa',g);for(const x of [-.83,.13])box(.025,.24,.46,x,.705,0,'#8ca7aa',g);box(.96,.03,.44,-.35,.595,0,'#879fa3',g);
  tube([[-.5,.85,-.24],[-.5,1.10,-.24],[-.5,1.13,-.1],[-.5,1.02,-.04]],.018,'#cbd7cf',g);
  box(.83,.10,.56,.74,.90,0,'#eee4c0',g);for(const x of [.51,.99]){cyl(.11,.11,.015,x,.962,0,'#5c675f',g);box(.27,.014,.025,x,.978,0,C.dark,g,false);box(.025,.014,.27,x,.978,0,C.dark,g,false);}
 },[2.45,.65]);
 addObj('厨房餐桌',7.14,1.93,0,g=>table(g,1.22,.70,.71,'#d7c177'),[1.22,.70]);
 for(const x of [6.83,7.45])for(const [z,rot] of [[1.34,0],[2.49,Math.PI]])addObj('厨房餐椅',x,z,rot,g=>chair(g,'#be975f'),[.39,.39]);
 addObj('厨房东侧小柜',9.75,1.63,-Math.PI/2,g=>cabinet(g,.78,.78,.34,'#bdc58a'),[.78,.34]);
 addObj('厨房入口食器架',9.50,2.47,Math.PI,g=>cabinet(g,.70,1.42,.32,'#afad74',true),[.70,.32]);
 addObj('玄关鞋柜',10.32,.88,Math.PI/2,g=>{cabinet(g,.95,.77,.40,'#aa8d67');},[.95,.40]);
 // Plumbing blockouts keep basin openings, wall thickness and support volumes.
 addObj('洗衣机',.37,1.73,0,g=>{box(.56,.80,.57,0,.4,0,'#e1e7df',g);box(.5,.04,.48,0,.82,0,'#c1d1c9',g);box(.34,.02,.33,0,.845,.035,'#a2bdb9',g);},[.56,.57]);
 addObj('洗面台',1.46,1.89,-Math.PI/2,g=>{cabinet(g,.58,.72,.46,'#b8c8be');box(.62,.07,.50,0,.76,0,'#edf0dc',g);box(.40,.018,.30,0,.80,0,'#a5c5c4',g);tube([[0,.79,-.16],[0,.99,-.16],[0,.99,0]],.016,'#c1ccc1',g);box(.54,.66,.04,0,1.32,-.24,C.trim,g);box(.47,.59,.02,0,1.32,-.212,'#b9d1d0',g);},[.58,.46]);
 addObj('浴缸',.91,-.38,0,g=>{const w=1.48,d=.87,h=.58;box(w,.09,d,0,.045,0,'#b0d6cd',g);for(const x of [-w/2+.055,w/2-.055])box(.11,h,d,x,h/2,0,'#b0d6cd',g);for(const z of [-d/2+.055,d/2-.055])box(w-.20,h,.11,0,h/2,z,'#b0d6cd',g);box(w-.21,.015,d-.21,0,.10,0,'#87acb3',g);for(const z of [-d/2,d/2])box(w+.04,.04,.10,0,h,z,'#d6e4d9',g);},[1.48,.87]);
 addObj('洗浴凳',.31,.46,0,g=>table(g,.25,.22,.20,'#d5c393'),[.25,.22]);
 addObj('厕所洁具',1.18,7.72,Math.PI/2,g=>{box(.64,.035,.39,0,.02,0,'#e2e7d7',g);ellipsoid(.25,.045,.135,0,.055,0,'#849e95',g);ellipsoid(.10,.12,.18,-.25,.10,0,'#e2e7d7',g);},[.64,.39]);
 addObj('厕所有支撑的洗手小盆',1.56,7.95,Math.PI,g=>{box(.26,.72,.22,0,.36,0,'#d6dfcb',g);box(.29,.045,.26,0,.74,0,'#ebeddc',g);},[.29,.26]);
 // Closet intermediate shelves, retained separately from sliding doors.
 for(const r of rooms.filter(r=>r.storage)){const g=group('closet-shelves:'+r.id,storageShelves),[a,b,c,d]=r.r;box(c-a-.13,.05,d-b-.13,(a+c)/2,.95,(b+d)/2,'#c5a87f',g);batch(g);}
 let wallMode='cut',ceilingVisible=false,doorsOpen=true;
 function setWalls(mode){if(!['cut','full','outer-hidden','hidden'].includes(mode))throw new Error('Unknown wall mode');wallMode=mode;fullWalls.visible=mode==='full'||mode==='outer-hidden';cutWalls.visible=mode==='cut';for(const p of wallParts)p.group.visible=!(mode==='outer-hidden'&&p.outer);doors.visible=mode==='full'||mode==='outer-hidden';storageShelves.visible=mode==='full'||mode==='outer-hidden';sisters.setWallMode(mode);return mode;}
 function setCeiling(v){ceilingVisible=!!v;ceilings.visible=ceilingVisible;return ceilingVisible;}
 function setDoorsOpen(v){doorsOpen=!!v;for(const d of doorLeaves){const open=doorsOpen&&!d.closed;d.leaf.position.fromArray(open?d.openPosition:d.closedPosition);d.leaf.rotation.y=open?d.angle:0;}root.updateMatrixWorld(true);}
 setWalls('cut');setCeiling(false);setDoorsOpen(true);
 root.userData={specification,rooms:rooms.map(r=>({id:r.id,name:r.name,bounds:r.r})),entry,connections,sources};
 return {root,specification,rooms,walls,connections,routes,entry,obstacles,furnitureItems,fullWalls,cutWalls,ceilings,doors,sisters,living,setWalls,setCeiling,setDoorsOpen,
  getViewState:()=>({wallMode,ceilingVisible,doorsOpen}),dispose(){living.dispose();sisters.dispose();W.dispose();}};
}
