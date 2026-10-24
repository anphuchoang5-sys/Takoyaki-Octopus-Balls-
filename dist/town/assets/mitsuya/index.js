import {addMitsuyaSnow} from './snow.js';
import {workshop} from './workshop.js';
import {makeProps,palette as P} from './props.js';
import {makeEntrance,makeStreetProps,makeLandscape,entryLayout} from './facade.js';
import {createEnvironment,environmentSupport} from './environment.js';

export const specification=Object.freeze({id:'mitsuya',revision:'anime-facade-night-10',name:'甘味処 みつや',plot:[14,14],body:[6.6,4.8],interior:[7.4,6.2],floorHeight:.32,ceilingHeight:3.52,entry:{x:-.325,y:.32,z:2.4,facing:'+Z',clearWalkWidth:1.27},space:'Separate street exterior and independent compact shop interior; shared entrance prop source',referenceStatus:{D:'user color anime screenshot viewed; primary exterior',A:'image viewed; selected indoor furniture reference, complete shop plan unconfirmed',B:'image connection timed out; user item description only',C:'superseded where D shows a different structure'}});

export function createModel({space='exterior'}={}){
 const interior=space==='interior',w=workshop(),{THREE,root,group,box,cyl,beam,solid,face,texture,batch}=w,p=makeProps(w);
 root.name=interior?'mitsuya-independent-interior':'mitsuya-street-exterior';root.userData.specification=specification;root.userData.space=space;
 const width=interior?7.4:6.6,depth=interior?6.2:4.8,cx=.5,frontZ=2.4,backZ=frontZ-depth,cz=(frontZ+backZ)/2,leftX=cx-width/2,rightX=cx+width/2;
 if(!interior)makeLandscape(w,root);
 const foundation=group('店体基础');box(width+.12,.275,depth+.12,cx,.1825,cz,'#aaa9a5',foundation);batch(foundation);
 const floor=group('紫灰斑点营业区地面');box(width-.12,.055,depth-.12,cx,.2925,cz,P.floor,floor);
 const floorMap=texture('floor-speckles',1024,768,(c,W,H)=>{c.fillStyle='#aaa6bb';c.fillRect(0,0,W,H);let seed=734;for(let k=0;k<2700;k++){seed=(seed*1664525+1013904223)>>>0;const x=(seed%10000)/10000*W;seed=(seed*1664525+1013904223)>>>0;const y=(seed%10000)/10000*H;c.fillStyle=['#8e8da9','#bab6c8','#c2becf'][k%3];c.fillRect(x,y,1+k%3,1+k%2);}});
 const fp=face(width-.13,depth-.13,cx,.321,cz,floorMap,floor);fp.rotation.x=-Math.PI/2;batch(floor);
 const walls={},roof=group('完整灰蓝屋顶与绿色檐口'),ceiling=group('完整天花与梁架');
 function wall(name,x,z,length,rotation,opening){const g=group(name,x,.32,z);g.rotation.y=rotation;walls[name]=g;const h=3.2,color=interior?'#c8ad86':'#bfa161';
  if(opening){const {w:ow,h:oh,y:oy,offset=0}=opening;for(const side of [-1,1]){const lo=side<0?-length/2:offset+ow/2,hi=side<0?offset-ow/2:length/2;box(hi-lo,h,.14,(lo+hi)/2,h/2,0,color,g);}box(ow,oy-oh/2,.14,offset,(oy-oh/2)/2,0,color,g);box(ow,h-oy-oh/2,.14,offset,(h+oy+oh/2)/2,0,color,g);box(ow-.07,oh-.07,.024,offset,oy,0,'#548aca',g,false);for(const xx of [offset-ow/2,offset,offset+ow/2])box(.065,oh+.12,.18,xx,oy,0,'#a78c57',g);for(const yy of [oy-oh/2,oy+oh/2])box(ow+.1,.065,.18,offset,yy,0,'#a78c57',g);for(const xx of [-.16,.06]){const m=box(.018,oh*.78,.004,offset+xx,oy,.016,'#83a9d5',g,false);m.rotation.z=-.13;}}
  else box(length,h,.14,0,h/2,0,color,g);
  for(let x=-length/2+.12;x<length/2;x+=.29){if(opening&&Math.abs(x-(opening.offset||0))<opening.w/2){const low=opening.y-opening.h/2;for(const zz of [-.076,.076])box(.009,low,.004,x,low/2,zz,'#a38b65',g,false);}else for(const zz of [-.076,.076])box(.009,h,.004,x,h/2,zz,'#a38b65',g,false);}for(const zz of [-.09,.09]){box(length,.10,.035,0,.07,zz,'#9a815b',g);box(length,.09,.035,0,3.13,zz,'#b09664',g);}batch(g);return g;
 }
 wall('左墙',leftX,cz,depth,-Math.PI/2,interior?null:{w:1.10,h:.94,y:1.98,offset:.35});
 wall('右墙',rightX,cz,depth,Math.PI/2,{w:.85,h:1.09,y:2.14,offset:interior?-2.1:-1.13});
 wall('背墙',cx,backZ,width,Math.PI,{w:1.45,h:.92,y:2.07,offset:.72});
 // Recessed purple-gray backdrop visible through the entry, with an actual room behind it.
 if(!interior){const lining=group('内侧紫灰墙面',0,0,0,walls['背墙']);box(width-.22,3.0,.018,0,1.56,-.110,'#7f7f9e',lining);for(let i=0;i<3;i++)box(.22,.56,.025,-.62+i*.55,1.72,-.135,['#b5a3ac','#a8a1ba','#8c94b7'][i],lining);batch(lining);const innerLeft=group('窗口内侧紫灰墙面',0,0,0,walls['左墙']);box(depth-.18,3.0,.018,0,1.56,-.110,'#7f7f9e',innerLeft);batch(innerLeft);}
 const entrance=makeEntrance(w,p,root);
 if(interior){for(const x of [-3.0,4.0])box(.40,3.2,.14,x,1.92,2.4,'#c8ad86',entrance.front);}
 const furnishings=entrance.furnishings;
 if(interior){p.slopedDisplay(2.65,-1.65,furnishings);p.table(-2.83,-1.10,furnishings);[-.05,-1.10,-2.15].forEach((z,i)=>p.stool(-2.03,z,i===0?'#c96a68':'#618dab',furnishings));}
 const menu=group('いちご メロン ミルク 口味单',leftX+.10,2.43,-.55,root);menu.rotation.y=Math.PI/2;
 box(.65,.94,.025,0,0,0,'#eee9da',menu);const menuMap=texture('flavors',384,512,(c,W,H)=>{c.fillStyle='#f0eedf';c.fillRect(0,0,W,H);c.fillStyle='#545965';c.textAlign='center';c.font='600 76px "Yu Gothic", Meiryo,sans-serif';['いちご','メロン','ミルク'].forEach((s,i)=>{c.save();c.translate(W/2,123+i*140);c.rotate([-.02,.025,-.01][i]);c.fillText(s,0,0);c.restore();});});face(.62,.91,0,0,.017,menuMap,menu);for(const x of [-.265,.265])for(const y of [-.395,.395])w.ball(.013,.013,.006,x,y,.023,'#8a897c',menu);batch(menu);
 const fixtures=group('暖灯实体'),lampPositions=[{x:1.25,y:3.10,z:.7},{x:-1.65,y:3.10,z:interior?-1.6:-.75}];for(const l of lampPositions){beam([l.x,3.43,l.z],[l.x,l.y+.10,l.z],.012,'#87775d',fixtures);cyl(.11,.28,.13,l.x,l.y+.08,l.z,'#7c9a8e',fixtures,24);cyl(.239,.239,.022,l.x,l.y+.008,l.z,w.glow,fixtures,24);w.ball(.06,.06,.06,l.x,l.y-.025,l.z,w.glow,fixtures);}batch(fixtures);
 box(width-.05,.09,depth-.05,cx,3.475,cz,'#d8c8aa',ceiling);for(let x=leftX+.2;x<rightX;x+=1.5)box(.10,.11,depth-.1,x,3.38,cz,'#a48e67',ceiling);batch(ceiling);
 let street=null;
 if(!interior){
  const ridgeY=5.79,halfDepth=2.97,slope=.755,angle=Math.atan(slope),roofWidth=7.64;
  for(const side of [-1,1]){const deck=box(roofWidth,.075,halfDepth*Math.sqrt(1+slope*slope),cx,ridgeY-slope*halfDepth/2,side*halfDepth/2,'#bbc4d4',roof);deck.rotation.x=side*angle;
   for(let col=0;col<12;col++){const x=cx-roofWidth/2+(col+.5)*roofWidth/12;const panel=box(roofWidth/12-.014,.018,halfDepth*Math.sqrt(1+slope*slope)-.04,x,ridgeY-slope*halfDepth/2+.046,side*halfDepth/2,['#c2cad8','#c6ccda','#bec8d7'][col%3],roof,false);panel.rotation.x=side*angle;
    for(let row=1;row<7;row++){const z=side*(row*halfDepth/7);const seam=box(.51,.008,.016,x,ridgeY-slope*Math.abs(z)+.061,z,'#aab5c9',roof,false);seam.rotation.x=side*angle;}
   }
   for(const x of [cx-roofWidth/2,cx+roofWidth/2]){const edge=box(.07,.11,(halfDepth+.07)*Math.sqrt(1+slope*slope),x,ridgeY-slope*halfDepth/2+.016,side*halfDepth/2,'#7e899f',roof);edge.rotation.x=side*angle;}
   box(roofWidth+.12,.105,.17,cx,3.545,side*halfDepth,'#5baf90',roof);box(roofWidth+.07,.035,.19,cx,3.60,side*halfDepth,'#81c49f',roof);
  }
  box(roofWidth+.03,.075,.105,cx,5.84,0,'#8f9ab0',roof);for(let x=-3.1;x<4.2;x+=.40)box(.014,.006,.12,x,5.88,0,'#75869e',roof,false);
  for(const x of [-2.8,3.8]){const gable=solid([[-2.4,3.52],[2.4,3.52],[2.4,3.978],[0,5.79],[-2.4,3.978]],.15,'#9bbdd0',roof);gable.rotation.y=Math.PI/2;gable.position.x=x-.075;for(let i=0;i<3;i++)box(.012,.16,.045,x+(x<0?-.081:.081),4.88-i*.045,-.1+i*.12,'#6c8fa9',roof,false);}
  for(const z of [-2.4,2.4])box(6.6,.46,.10,.5,3.75,z,'#a5b9c3',roof);for(const x of [-1.15,2.03]){box(.055,.42,.055,x,4.11,2.48,'#858c97',roof);beam([x,4.78,2.45],[x,4.59,1.65],.025,'#858c97',roof);}const sign=group('前屋面 甘味処 みつや 招牌',.44,4.53,2.50,roof);sign.rotation.x=-.025;sign.userData.kind='roof-sign';
  box(4.27,1.19,.065,0,0,0,'#89829d',sign);box(4.15,1.09,.019,0,0,.043,'#e5e4eb',sign);box(4.04,1.01,.014,0,0,.060,'#f0eff0',sign);
  const signMap=texture('mitsuya-sign',1536,610,(c,W,H)=>{c.fillStyle='#f1f0f2';c.fillRect(0,0,W,H);c.fillStyle='#8c8791';c.textAlign='center';c.textBaseline='middle';c.font='600 128px "Yu Mincho",serif';c.save();c.translate(110,145);c.rotate(-.09);c.fillText('甘',0,0);c.restore();c.fillText('味',210,260);c.fillText('処',110,383);c.font='600 438px "UD Digi Kyokasho N-R", "Yu Kyokasho", "Yu Mincho",serif';[['み',535,-.025],['つ',944,.012],['や',1300,-.025]].forEach(([s,x,r])=>{c.save();c.translate(x,330);c.rotate(r);c.fillText(s,0,0);c.strokeStyle='#8c8791';c.lineWidth=3.5;c.strokeText(s,0,0);c.restore();});});face(4.02,1.00,0,0,.070,signMap,sign);batch(sign);batch(roof);
  street=makeStreetProps(w,root);
 }
 const utilities=group('侧背排水与收边');if(!interior){for(const x of [-2.96,3.96]){w.tube([[x,3.53,-2.95],[x,3.18,-2.55],[x,.37,-2.55],[x+.10,.25,-2.62]],.037,'#6aa78c',utilities);for(const y of [.7,1.7,2.7])box(.10,.035,.10,x,y,-2.52,'#728e79',utilities);}batch(utilities);}
 const counts={jars:3,slopedDisplays:interior?1:0,counters:1,tables:interior?1:0,stools:interior?3:0,hangingCards:5,freezers:interior?0:1,doghouses:interior?0:1,benches:interior?0:1};
 root.userData.design={facade:'D color anime screenshot; projected proportions, not measured official dimensions',interior:'A furniture and palette; expanded compact room designed for this project',back:'Designed depth, rear window, hidden structure, room layout and lights',counts,entrySignature:entryLayout,entryObjectIds:[entrance.counter.uuid,...entrance.jars.map(j=>j.uuid)]};
 let cut=false,roofVisible=true;function setCutaway(value){cut=!!value;Object.values(walls).forEach(g=>g.visible=!cut);menu.visible=!cut;utilities.visible=!cut;return cut;}
 function setInspection(view){setCutaway(false);if(['inside','top','looking-out','table'].includes(view)){walls['背墙'].visible=false;walls['右墙'].visible=false;cut=true;}else if(['counter','jars'].includes(view)){walls['左墙'].visible=false;walls['背墙'].visible=false;cut=true;}menu.visible=walls['左墙'].visible;utilities.visible=!cut;}
 function setRoof(value){roofVisible=!!value;roof.visible=ceiling.visible=fixtures.visible=roofVisible;return roofVisible;}
 w.finish();
 const environment=createEnvironment(root,{lampPositions,glow:w.glow,glass:w.glass});
 const asset = {root,specification,space,roof,ceiling,walls,front:entrance.front,furnishings,fixtures,entrance,street,lamps:lampPositions,previewLamps:lampPositions.map(l=>['#ffd8a6',8,4.3,l.x,l.y-.08,l.z]),floors:[{x:cx,z:cz,w:width-.12,d:depth-.12,height:.32}],entry:specification.entry,setCutaway,setInspection,setRoof,getViewState:()=>({cutaway:cut,roof:roofVisible}),environmentSupport,setEnvironment:environment.setEnvironment,getEnvironment:environment.inspect,getLightingDescriptors:environment.getLightingDescriptors,dispose(){environment.dispose();w.dispose();},textures:w.textures};
  return interior ? asset : addMitsuyaSnow(asset);
}
