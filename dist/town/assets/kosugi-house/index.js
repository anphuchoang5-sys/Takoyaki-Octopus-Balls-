import {residentialKit} from '../shared/residential-kit.js';

export const specification=Object.freeze({id:'kosugi-house',name:'小衫家',revision:'exterior-01-reference',plot:[14,12],front:'+Z',interior:false,independentPreview:true,reference:'references/user-exterior.jpg',dimensionsStatus:'名称沿用用户写法；院落和侧后尺寸为补全'});

export function createModel(){
  const K=residentialKit(specification),{root,part,at,box,beam,ball,solid,site,wall,window,gable,roof,ridge,gutter,woodSiding,fence,tree,shrub,step}=K;
  const C={wood:'#b0a06c',trim:'#7e6b4a',roof:'#875e62',eave:'#eee6ba',glass:'#657fba'};
  site(14,12,{grass:'#a8be80',pathX:1.68,pathWidth:1.80,pathEnd:2.4});
  const foundation=part('高低屋基础');box(4.8,.25,5.9,1.7,.245,-.45,'#a4a992',foundation,true);box(4.05,.25,4.8,-2.72,.245,-.85,'#a4a992',foundation,true);
  const highOpen=[{u:-.2,y:4.88,w:1.76,h:1.51},{u:0,y:1.37,w:1.95,h:2.04}];
  const front=wall('高屋正面木墙',{x:1.70,z:2.50,w:4.80,top:6.25,bottom:.37,color:C.wood,openings:highOpen});
  woodSiding(front,{w:4.8,bottom:.37,top:6.25,openings:highOpen,color:'#a18d5b',spacing:.40});
  gable('奶油色正山墙',{x:1.7,z:2.50,w:4.8,eave:6.25,ridge:7.44,color:'#f0e9bf'});
  window('二楼六格木窗',{x:1.5,y:4.88,z:2.5,w:1.76,h:1.51,frame:'#795c52',glass:C.glass,cols:2,rows:3});
  const shutter=part('二楼右木板窗扇');box(.99,1.61,.09,2.91,4.88,2.56,'#b49a69',shutter,true);for(let x=2.46;x<3.4;x+=.15)box(.013,1.56,.014,x,4.88,2.613,'#806b4d',shutter);for(let i=0;i<6;i++){const x=2.49+i*.14;beam([x,4.40,2.622],[x+.018,5.36,2.622],.003,'#95815a',shutter);}
  window('玄关竖格门',{x:1.7,y:1.37,z:2.50,w:1.95,h:2.04,frame:C.trim,glass:'#687ba5',cols:2,rows:1,bars:true});
  roof('高屋门头雨棚',[[.43,2.44],[2.97,2.44],[3.05,3.09],[.35,3.09]],(x,z)=>2.74-(z-2.44)*.38,{color:C.roof,fascia:C.eave});
  const lamp=part('玄关半圆灯');ball(.18,.09,.065,1.7,2.46,2.68,'#a9cbd9',lamp,14);box(.37,.045,.14,1.7,2.52,2.68,'#696b5b',lamp);
  const sideOpen=[{u:-.9,y:4.85,w:1.25,h:1.4},{u:1.0,y:1.8,w:1.3,h:1.4}];
  const right=wall('高屋右木墙',{x:4.1,z:-.45,w:5.9,top:6.25,bottom:.37,color:C.wood,rotation:Math.PI/2,openings:sideOpen});woodSiding(right,{w:5.9,bottom:.37,top:6.25,openings:sideOpen,color:'#a18d5b'});
  window('右上补全窗',{x:4.1,z:.45,y:4.85,w:1.25,h:1.4,rotation:Math.PI/2,frame:C.trim,rows:2});
  window('右下补全窗',{x:4.1,z:-1.45,y:1.8,w:1.3,h:1.4,rotation:Math.PI/2,frame:C.trim});
  const left=wall('高屋左上木墙',{x:-.70,z:-.45,w:5.9,top:6.25,bottom:3.05,color:C.wood,rotation:-Math.PI/2,openings:[{u:0,y:4.9,w:1.25,h:1.25}]});woodSiding(left,{w:5.9,bottom:3.05,top:6.25,openings:[{u:0,y:4.9,w:1.25,h:1.25}],color:'#a18d5b'});
  window('高屋左上补全窗',{x:-.70,z:-.45,y:4.9,w:1.25,h:1.25,rotation:-Math.PI/2,frame:C.trim});
  for(const[name,z,w]of [['高屋左前下墙',2.025,.95],['高屋左后下墙',-3.325,.15]]){const g=wall(name,{x:-.70,z,w,top:3.05,bottom:.37,color:C.wood,rotation:-Math.PI/2});woodSiding(g,{w,bottom:.37,top:3.05,color:'#a18d5b'});}
  const rearOpen=[{u:-.3,y:4.9,w:1.6,h:1.4},{u:.5,y:1.8,w:1.2,h:1.3}];
  const rear=wall('高屋后木墙',{x:1.7,z:-3.4,w:4.8,top:6.25,bottom:.37,color:C.wood,rotation:Math.PI,openings:rearOpen});woodSiding(rear,{w:4.8,bottom:.37,top:6.25,openings:rearOpen,color:'#a18d5b'});
  window('后上补全窗',{x:2.0,z:-3.4,y:4.9,w:1.6,h:1.4,rotation:Math.PI,frame:C.trim,rows:2});window('后下补全窗',{x:1.2,z:-3.4,y:1.8,w:1.2,h:1.3,rotation:Math.PI,frame:C.trim});
  gable('后奶油山墙',{x:1.7,z:-3.4,w:4.8,eave:6.25,ridge:7.44,color:'#e7dfb6',rotation:Math.PI});
  const highY=x=>7.48-Math.abs(x-1.7)*(7.48-6.20)/2.76;
  roof('高屋左坡',[[-1.06,-3.76],[1.7,-3.76],[1.7,2.86],[-1.06,2.86]],(x,z)=>highY(x),{color:C.roof,fascia:C.eave,axis:'x'});
  roof('高屋右坡',[[1.7,-3.76],[4.46,-3.76],[4.46,2.86],[1.7,2.86]],(x,z)=>highY(x),{color:C.roof,fascia:C.eave,axis:'x'});
  ridge('高屋纵向屋脊',[1.7,7.52,-3.78],[1.7,7.52,2.91],'#715458');
  const crest=part('三瓣脊头与通风孔');for(const[dx,dy,r]of [[-.18,7.54,.12],[0,7.66,.16],[.18,7.54,.12]])ball(r,r,.06,1.7+dx,dy,2.91,'#7b5c5e',crest,12);for(const dx of [-.15,0,.15]){const m=box(.065,.16,.025,1.7+dx,6.98,2.52,'#50494e',crest);m.rotation.z=-dx*1.8;}
  const lowOpen=[{u:-.58,y:1.24,w:1.78,h:1.42},{u:1.05,y:1.29,w:.87,h:1.65}];
  const low=wall('左附屋正面木墙',{x:-2.72,z:1.55,w:4.04,top:2.57,bottom:.37,color:C.wood,openings:lowOpen});woodSiding(low,{w:4.04,bottom:.37,top:2.57,openings:lowOpen,color:'#a18d5b',spacing:.32});
  window('附屋双窗',{x:-3.30,z:1.55,y:1.24,w:1.78,h:1.42,frame:C.trim,glass:C.glass,cols:2,rows:2});
  window('附屋格栅门',{x:-1.67,z:1.55,y:1.29,w:.87,h:1.65,frame:C.trim,glass:'#687ba5',cols:1,bars:true});
  const lowLeft=wall('附屋左木墙',{x:-4.74,z:-.85,w:4.8,top:2.57,bottom:.37,color:C.wood,rotation:-Math.PI/2,openings:[{u:0,y:1.5,w:1.2,h:1.1}]});woodSiding(lowLeft,{w:4.8,bottom:.37,top:2.57,openings:[{u:0,y:1.5,w:1.2,h:1.1}],color:'#a18d5b'});window('附屋左补全窗',{x:-4.74,z:-.85,y:1.5,w:1.2,h:1.1,rotation:-Math.PI/2,frame:C.trim});
  const lowBack=wall('附屋后木墙',{x:-2.72,z:-3.25,w:4.04,top:2.57,bottom:.37,color:C.wood,rotation:Math.PI});woodSiding(lowBack,{w:4.04,bottom:.37,top:2.57,color:'#a18d5b'});
  roof('低附屋前长坡',[[-5.05,-1.45],[-.70,-1.45],[-.70,1.91],[-5.05,1.91]],(x,z)=>4.12-(z+1.45)*.44,{color:'#9c6a6a',fascia:'#82705b'});
  roof('低附屋后坡',[[-5.05,-3.60],[-.70,-3.60],[-.70,-1.45],[-5.05,-1.45]],(x,z)=>4.12-(-1.45-z)*.685,{color:'#9c6a6a',fascia:'#82705b'});
  const lowCap=at('附屋左山墙封板',-4.74,0,-Math.PI/2),cap=solid([[-3.25,2.55],[1.55,2.55],[1.55,2.67],[-1.45,3.99],[-3.25,2.757]],.20,C.wood,lowCap);cap.position.z=-.20;
  ridge('低附屋屋脊',[-5.05,4.15,-1.45],[-.70,4.15,-1.45],'#80585b');
  gutter('黄色前落水管',[[-.99,6.19,2.85],[-.99,6.04,2.9],[-.70,5.93,2.64],[-.70,.30,2.64]],'#b9a355');
  step('门前踏步',1.7,2.83,2.05,.63,.22);
  const plants=part('庭院植物');tree('右侧高低分枝树',5.45,1.22,5.35,2.35,'#85be56',plants);tree('左后圆树',-5.95,-2.0,4.70,1.65,'#69b46a',plants);
  shrub('左前高灌木',-5.28,3.0,2.4,3.20,1.6,'#89bb56',plants);shrub('附屋窗下小灌木',-3.25,3.4,1.45,1.35,1.2,'#69a24f',plants);shrub('门边低灌木',-.9,3.4,1.3,1.3,1.1,'#57976c',plants);
  const gateZ=4.85;
  function blockWall(name,x,w){const g=part(name);fence(name+'下部',{x,z:gateZ,w,h:1.33,color:'#8eb7bf',style:'block'},g);const blocks=Math.round(w/.72),bw=w/blocks;for(let i=0;i<blocks;i++){const bx=x-w/2+(i+.5)*bw;box(bw-.018,.19,.20,bx,1.57,gateZ,'#93bdc3',g);box(bw-.018,.045,.20,bx,1.75,gateZ,'#9ec6cd',g);for(const dx of [-bw/2+.04,bw/2-.04])box(.07,.16,.20,bx+dx,1.67,gateZ,'#93bdc3',g);for(const dx of [-.19,0,.19]){const cut=solid([[-.045,0],[.045,0],[.075,.07],[0,.12],[-.075,.07]],.205,'#607b89',g);cut.position.set(bx+dx,1.61,gateZ-.102);}}box(w+.04,.055,.26,x,1.82,gateZ,'#96aaa9',g,true);return g;}
  blockWall('左前蓝灰花砖墙',-2.73,8.10);blockWall('右前蓝灰花砖墙',4.75,3.70);
  fence('左侧院墙',{x:-6.80,z:-.38,w:10.45,h:1.65,rotation:-Math.PI/2,color:'#9ab9bb',style:'block'});fence('右侧院墙',{x:6.80,z:-.38,w:10.45,h:1.65,rotation:Math.PI/2,color:'#9ab9bb',style:'block'});fence('后院墙',{x:0,z:-5.62,w:13.6,h:1.65,rotation:Math.PI,color:'#9ab9bb',style:'block'});
  const gate=part('弧顶木院门与石门柱');for(const x of [.68,2.72])box(.33,2.05,.35,x,1.145,gateZ,'#b5c4b7',gate,true);
  for(let x=.87;x<2.57;x+=.14){const top=2.02+.22*Math.sin((x-.87)/1.70*Math.PI);box(.126,top-.14,.10,x,(top+.14)/2,gateZ,'#a39554',gate,true);}
  box(.13,.29,.025,2.72,1.72,gateZ+.19,'#e5e3d0',gate);beam([1.73,1.01,gateZ+.07],[1.73,1.20,gateZ+.07],.019,'#615b3c',gate);
  const streetLamp=part('院外弯颈路灯');beam([5.68,.12,5.52],[5.68,4.40,5.52],.047,'#81958b',streetLamp);box(.15,.85,.14,5.68,.545,5.52,'#9bafa1',streetLamp,true);beam([5.68,4.40,5.52],[6.10,4.79,5.52],.038,'#81958b',streetLamp);const shade=ball(.37,.075,.105,5.94,4.66,5.52,'#e8edd6',streetLamp,16);shade.rotation.z=.68;
  return K.finish({inferred:['侧后方与院落纵深','米制尺寸','路灯背面'],plot:[14,12],entryWidth:1.71,lightGeometryOnly:true});
}
