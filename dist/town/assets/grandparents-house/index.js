import {residentialKit} from '../shared/residential-kit.js';

export const specification=Object.freeze({id:'grandparents-house',name:'爷爷奶奶家',revision:'exterior-01-reference',plot:[18,13],front:'+Z',interior:false,independentPreview:true,reference:'references/user-exterior.jpg',dimensionsStatus:'独立低宽住宅，尺寸按参考补全'});

export function createModel(){
  const K=residentialKit(specification),{root,part,at,box,beam,ball,solid,site,wall,window,gable,roof,ridge,gutter,fence,tree,shrub,cypress,step}=K;
  const C={wall:'#b5e8d4',roof:'#cd7860',ridge:'#a85d48',white:'#eee5cc',frame:'#a37a89',glass:'#487ab7'};
  site(18,13,{grass:'#9ebc7b',pathX:.54,pathWidth:2.35,pathEnd:2.55});
  const base=part('住宅石基础');box(12.6,.26,5.6,0,.25,-.8,'#abb7ad',base,true);box(4.18,.26,1.0,4.05,.25,2.42,'#abb7ad',base);
  const openings=[{u:-2.85,y:1.81,w:2.7,h:2.15},{u:2.49,y:1.72,w:2.5,h:2.6}];
  wall('主屋正面',{x:-1.95,z:2.0,w:8.7,top:3.57,bottom:.38,color:C.wall,openings});
  window('左侧四格大窗',{x:-4.80,y:1.81,z:2.0,w:2.7,h:2.15,frame:C.frame,glass:C.glass,cols:2,rows:2});
  window('中央菱形玄关',{x:.54,y:1.72,z:2.0,w:2.5,h:2.6,frame:C.frame,glass:C.glass,cols:2,rows:2});
  const door=part('玄关菱形木格');for(const cx of [-.085,1.165]){const pts=[[cx,2.88,2.05],[cx+.43,1.72,2.05],[cx,.56,2.05],[cx-.43,1.72,2.05],[cx,2.88,2.05]];for(let i=0;i<4;i++)beam(pts[i],pts[i+1],.022,C.frame,door);box(.04,.20,.07,cx+(cx<.54?.46:-.46),1.6,2.12,'#806a65',door);}
  wall('右山墙正面',{x:4.2,z:2.85,w:4.2,top:3.57,bottom:.38,color:C.wall,openings:[{u:0,y:1.87,w:2.9,h:2.18}]});
  wall('凸山墙与主屋连接侧墙',{x:2.1,z:2.425,w:.85,top:3.62,bottom:.38,color:C.wall,rotation:-Math.PI/2});
  window('右侧大窗',{x:4.2,y:1.87,z:2.85,w:2.9,h:2.18,frame:C.frame,glass:C.glass,cols:2,rows:3});
  const diamond=part('窗侧菱形格');for(const x of [2.86,5.54]){const ps=[[x,2.69,2.91],[x+.13,2.37,2.91],[x,2.05,2.91],[x-.13,2.37,2.91],[x,2.69,2.91]];for(let i=0;i<4;i++)beam(ps[i],ps[i+1],.018,'#8b667a',diamond);}
  wall('左侧墙',{x:-6.3,z:-.8,w:5.6,top:3.57,bottom:.38,rotation:-Math.PI/2,color:C.wall,openings:[{u:0,y:1.9,w:1.5,h:1.4}]});
  window('左侧补全窗',{x:-6.3,z:-.8,y:1.9,w:1.5,h:1.4,rotation:-Math.PI/2,frame:C.frame});
  wall('右侧墙',{x:6.3,z:-.375,w:6.45,top:3.57,bottom:.38,rotation:Math.PI/2,color:C.wall,openings:[{u:1.3,y:1.85,w:1.65,h:1.45}]});
  window('右侧补全窗',{x:6.3,z:-1.675,y:1.85,w:1.65,h:1.45,rotation:Math.PI/2,frame:C.frame});
  wall('后墙',{x:0,z:-3.6,w:12.6,top:3.57,bottom:.38,rotation:Math.PI,color:C.wall,openings:[{u:-3.4,y:1.9,w:1.8,h:1.5},{u:1.4,y:1.9,w:2.0,h:1.5}]});
  for(const[x,w]of [[3.4,1.8],[-1.4,2.]])window('后侧补全窗'+x,{x,z:-3.6,y:1.9,w,h:1.5,rotation:Math.PI,frame:C.frame});
  const rz=-1.35,ry=5.50,front=2.42,side=6.66,cx=4.2,crossLeft=1.74;
  const up=.75/(3.15-rz),crossSlope=(ry+up*(front-rz)-3.56)/(side-cx);
  const mainY=(x,z)=>ry-(z-rz)*(ry-3.56)/(front-rz),crossY=(x,z)=>ry+up*(z-rz)-Math.abs(x-cx)*crossSlope;
  const returnCap=at('凸山墙侧檐封板',2.1,0,-Math.PI/2),rc=solid([[2.0,3.60],[2.85,3.60],[2.85,crossY(2.1,2.85)-.14],[2.0,Math.max(mainY(2.1,2.0),crossY(2.1,2.0))-.14]],.20,C.wall,returnCap);rc.position.z=-.20;
  const frontGable=at('薄荷色正山墙',cx,2.85),fg=solid([[-2.1,3.55],[2.1,3.55],[2.1,crossY(6.3,2.85)-.13],[0,crossY(cx,2.85)-.13],[-2.1,crossY(2.1,2.85)-.13]],.20,C.wall,frontGable);fg.position.z=-.20;
  roof('红色长前坡',[[-6.66,rz],[cx,rz],[crossLeft,front],[-6.66,front]],mainY,{color:C.roof,fascia:'#91c9c6'});
  roof('红色右谷口',[[cx,rz],[side,rz],[side,front]],mainY,{color:C.roof,fascia:C.white});
  roof('山墙左屋坡',[[cx,rz],[cx,3.15],[crossLeft,3.15],[crossLeft,front]],crossY,{color:C.ridge,fascia:C.white,axis:'x'});
  roof('山墙右屋坡',[[cx,rz],[side,front],[side,3.15],[cx,3.15]],crossY,{color:C.ridge,fascia:C.white,axis:'x'});
  roof('红色长后坡',[[-6.66,-3.98],[side,-3.98],[side,rz],[-6.66,rz]],(x,z)=>ry-(rz-z)*(ry-3.56)/(rz+3.98),{color:C.roof,fascia:'#91c9c6'});
  ridge('横向红屋脊',[-6.66,5.54,rz],[side,5.54,rz],C.ridge);
  ridge('正山墙屋脊',[cx,5.55,rz],[cx,6.30,3.18],C.ridge);
  for(const x of[-6.3,6.3]){const leftSide=x<0,end=leftSide?2.0:2.85,g=at('侧山墙封板'+x,x,0,leftSide?-Math.PI/2:Math.PI/2),u=z=>leftSide?z:-z,top=z=>(z<rz?ry-(rz-z)*(ry-3.56)/(rz+3.98):Math.max(mainY(x,z),leftSide?-Infinity:crossY(x,z)))-.14;const valley=rz+(Math.abs(x-cx)*crossSlope)/(up+(ry-3.56)/(front-rz));const zs=[-3.6,rz,...(!leftSide&&valley<end?[valley]:[]),end];const m=solid([[u(-3.6),3.55],[u(end),3.55],...zs.reverse().map(z=>[u(z),top(z)])],.20,C.wall,g);m.position.z=-.20;}
  const frontTrim=part('山墙白色厚边');beam([1.80,crossY(1.80,2.89)-.16,2.89],[4.2,crossY(4.2,2.89)-.16,2.89],.095,C.white,frontTrim);beam([4.2,crossY(4.2,2.89)-.16,2.89],[6.60,crossY(6.60,2.89)-.16,2.89],.095,C.white,frontTrim);
  roof('右窗坡雨棚',[[2.60,2.78],[5.80,2.78],[5.97,3.43],[2.43,3.43]],(x,z)=>3.18-(z-2.78)*.65,{color:'#ac6553',fascia:C.white});
  roof('玄关坡雨棚',[[-.95,1.94],[2.03,1.94],[2.19,2.67],[-1.11,2.67]],(x,z)=>3.12-(z-1.94)*.45,{color:C.roof,fascia:C.white});
  gutter('青色落水管',[[1.68,3.55,2.42],[1.67,3.26,2.43],[2.06,3.05,2.79],[2.06,.28,2.79]],'#80bdbe');
  const motif=part('山墙纹章与屋脊小饰');const triangle=solid([[-.16,4.40],[.16,4.40],[0,4.04]],.045,'#8d6473',motif);triangle.position.set(4.2,.60,2.88);
  for(const [dx,dy]of [[-.30,4.60],[-.15,4.73],[0,4.81],[.15,4.73],[.30,4.60]]){const m=ball(.035,.09,.025,4.2+dx,dy+.60,2.92,'#8d6473',motif,8);m.rotation.z=-dx;}
  beam([4.2,6.30,3.16],[4.2,6.49,3.16],.035,'#9a8954',motif);
  const curl=solid([[-.20,6.08],[-.15,5.88],[0,5.83],[.15,5.88],[.20,6.08],[.11,6.06],[.07,5.96],[-.07,5.96],[-.11,6.06]],.06,'#b4a15d',motif);curl.position.set(4.2,.66,3.13);
  step('玄关踏步',.54,2.56,2.68,.80,.25);
  const plants=part('庭院植物');tree('左后高树',-7.65,-2.5,7.4,2.3,'#319a77',plants);tree('左前圆冠树',-6.7,3.85,4.8,2.6,'#4ca858',plants);
  cypress('右后高柏',7.1,-2.8,6.8,1.25,plants);cypress('右后矮柏',8.0,-1.1,5.5,.93,plants);
  for(const[n,x,z,w,h,d,c]of [['左窗前小灌木',-3.4,3.25,1.9,1.8,1.5,'#70ad4e'],['右山墙左灌木',2.15,4.0,2.0,2.15,1.5,'#4d9b55'],['右院大灌木',6.6,4.1,3.4,2.65,1.7,'#6aa04d']])shrub(n,x,z,w,h,d,c,plants);
  function frontWall(name,x,w){const g=part(name);fence(name+'蓝灰底座',{x,z:5.52,w,h:1.15,color:'#9ec3cd'},g);box(w,.68,.21,x,1.65,5.52,'#dfd5a9',g);box(w+.04,.085,.27,x,2.03,5.52,'#9c94a1',g,true);for(let xx=x-w/2+.75;xx<x+w/2;xx+=1.30)box(.055,.66,.245,xx,1.65,5.54,'#a1969e',g);return g;}
  frontWall('左前围墙',-4.80,8.0);frontWall('右前围墙',5.37,6.86);
  fence('左侧院墙',{x:-8.80,z:-.3,w:11.8,h:1.85,rotation:-Math.PI/2,color:'#adc7c8'});
  fence('右侧院墙',{x:8.80,z:-.3,w:11.8,h:1.85,rotation:Math.PI/2,color:'#adc7c8'});
  fence('后侧院墙',{x:0,z:-6.2,w:17.6,h:1.85,rotation:Math.PI,color:'#adc7c8'});
  const gate=part('院门与砌石门柱');for(const x of [-.77,1.85]){box(.52,2.04,.49,x,1.14,5.53,'#7388a6',gate,true);box(.67,.22,.62,x,2.21,5.53,'#b5ced7',gate,true);for(let y=.35;y<2.1;y+=.39){box(.50,.015,.014,x,y,5.784,'#4d6487',gate);box(.014,.38,.014,x+(Math.round(y*10)%2?.10:-.10),y+.18,5.784,'#4d6487',gate);}}
  // Visible paired glazed entrance gates, separated from the house door behind.
  for(const cx of [-.10,1.16]){box(1.18,1.86,.085,cx,1.12,5.50,'#496ca3',gate);for(const dx of [-.59,.59])box(.07,1.96,.13,cx+dx,1.12,5.58,C.frame,gate,true);for(const y of [.17,1.1,2.07])box(1.25,.08,.13,cx,y,5.58,C.frame,gate);for(const y of [.62,1.59]){const ps=[[cx,y+.43,5.60],[cx+.42,y,5.60],[cx,y-.43,5.60],[cx-.42,y,5.60],[cx,y+.43,5.60]];for(let i=0;i<4;i++)beam(ps[i],ps[i+1],.026,C.frame,gate);}}
  return K.finish({inferred:['侧后方门窗','门与住宅间纵深','尺寸'],roofValleys:true,plot:[18,13],entryWidth:2.10});
}
