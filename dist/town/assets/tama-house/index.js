import {residentialKit} from '../shared/residential-kit.js';
import {tamaDetails} from './exterior-details.js';

export const specification=Object.freeze({id:'tama-house',name:'小玉家',revision:'exterior-02-gable',plot:[16,14],front:'+Z',interior:false,independentPreview:true,reference:'references/user-exterior.jpg',dimensionsStatus:'按侧面与正面关系补全，未确认地图占地'});

export function createModel(){
  const K=residentialKit(specification),{part,at,box,beam,ball,wall,window,ridge,gutter,step}=K;
  const D=tamaDetails(K),C={wall:'#e0edf8',trim:'#e7f0f5',glass:'#3c78ce'};
  const lawn=D.lawn();
  const base=part('矩形主体基础');box(8.6,.23,6.2,0,.235,0,'#b2c1cb',base);
  const frontOpen=[{u:-1.9,y:4.68,w:2.0,h:1.23},{u:2.1,y:4.48,w:2.5,h:2.03},{u:-2.5,y:1.54,w:1.5,h:2.35},{u:1.9,y:1.7,w:3.0,h:1.87}];
  wall('主屋正面',{x:0,z:3.1,w:8.6,top:5.9,bottom:.35,color:C.wall,openings:frontOpen});
  window('二楼中央双窗',{x:-1.9,y:4.68,z:3.1,w:2,h:1.23,frame:C.trim,glass:C.glass});
  D.guard('中央细护栏',{x:-1.9,z:3.12,y:3.98,w:2.16});
  window('阳台落地窗',{x:2.1,y:4.48,z:3.1,w:2.5,h:2.03,frame:C.trim,glass:C.glass,cols:2,rows:2});
  const shutter=part('阳台右侧木百叶');box(.63,2.08,.11,3.76,4.49,3.14,'#bbaa82',shutter);
  for(let y=3.49;y<5.53;y+=.13)box(.60,.023,.025,3.76,y,3.21,'#9e8f70',shutter);
  window('一楼宽窗',{x:1.9,y:1.7,z:3.1,w:3,h:1.87,frame:C.trim,glass:C.glass,cols:3});
  window('玄关门',{x:-2.5,y:1.54,z:3.1,w:1.5,h:2.35,frame:C.trim,glass:'#5c90b9',cols:2});
  const door=part('门内木板');box(.67,1.66,.035,-2.13,1.28,3.04,'#ad805d',door);box(.035,.19,.06,-2.37,1.24,3.13,'#716044',door);
  // The gable and its window belong to the LEFT wall, perpendicular to the front.
  wall('左侧山墙立面',{x:-4.3,z:0,w:6.2,top:5.9,bottom:.35,color:C.wall,rotation:-Math.PI/2,openings:[{u:.1,y:4.72,w:3.3,h:1.38}]});
  window('左侧山墙双窗',{x:-4.3,z:.1,y:4.72,w:3.3,h:1.38,rotation:-Math.PI/2,frame:C.trim,glass:C.glass});
  D.guard('左侧细护栏',{x:-4.32,z:.1,y:3.95,w:3.48,rotation:-Math.PI/2});
  wall('右侧墙',{x:4.3,z:0,w:6.2,top:5.9,bottom:.35,color:C.wall,rotation:Math.PI/2,openings:[{u:0,y:4.5,w:1.6,h:1.2},{u:-.6,y:1.8,w:1.4,h:1.3}]});
  window('右侧补全上窗',{x:4.3,z:0,y:4.5,w:1.6,h:1.2,rotation:Math.PI/2,frame:C.trim,glass:C.glass});
  window('右侧补全下窗',{x:4.3,z:.6,y:1.8,w:1.4,h:1.3,rotation:Math.PI/2,frame:C.trim,glass:C.glass});
  wall('后墙',{x:0,z:-3.1,w:8.6,top:5.9,bottom:.35,color:C.wall,rotation:Math.PI,openings:[{u:-2.3,y:4.5,w:1.6,h:1.2},{u:2.3,y:4.5,w:1.6,h:1.2},{u:0,y:1.8,w:1.4,h:1.3}]});
  for(const[x,y,w,h]of [[2.3,4.5,1.6,1.2],[-2.3,4.5,1.6,1.2],[0,1.8,1.4,1.3]])window('后侧补全窗'+x,{x,z:-3.1,y,w,h,rotation:Math.PI,frame:C.trim,glass:C.glass});
  const ridgeY=7.75,slope=.55,roofY=(x,z)=>ridgeY-slope*Math.abs(z),left=-4.68,right=4.68;
  // Two continuous roof planes. A deeper front eave over the balcony stays coplanar.
  D.blueRoof('蓝瓦主前坡',[[left,0],[right,0],[right,4.35],[.48,4.35],[.48,3.60],[left,3.60]],roofY);
  D.blueRoof('蓝瓦主后坡',[[left,-3.60],[right,-3.60],[right,0],[left,0]],roofY);
  ridge('唯一长屋脊',[left,7.79,0],[right,7.79,0],'#3959a2');
  for(const x of [-4.3,4.3]){
    const g=at('侧面三角封板'+x,x,0,x<0?-Math.PI/2:Math.PI/2);
    const cap=K.solid([[-3.1,5.88],[3.1,5.88],[3.1,roofY(0,3.1)-.145],[0,ridgeY-.145],[-3.1,roofY(0,-3.1)-.145]],.20,C.wall,g);cap.position.z=-.20;
    const trim=at('蓝色山墙包边'+x,x<0?left-.02:right+.02,0,x<0?-Math.PI/2:Math.PI/2);
    const shape=[[-3.6,roofY(0,3.6)+.015],[0,ridgeY+.015],[3.6,roofY(0,3.6)+.015],[3.6,roofY(0,3.6)-.22],[0,ridgeY-.22],[-3.6,roofY(0,3.6)-.22]];
    K.solid(shape,.065,'#3f6ac4',trim);
    for(const z of [-3.59,3.59])beam([z,roofY(0,3.6)-.225,.07],[0,ridgeY-.225,.07],.025,C.trim,trim);
  }
  const vents=at('左山墙通风孔',-4.305,0,-Math.PI/2);
  for(let i=-1;i<=1;i++){const m=box(.075,.27-Math.abs(i)*.04,.02,i*.17,6.83,.01,'#455f91',vents);m.rotation.z=-i*.15;}
  const ornament=at('山墙脊端瓦',left-.07,0,-Math.PI/2);for(const[u,y]of [[-.10,7.82],[0,7.90],[.10,7.82]])ball(.085,.10,.065,u,y,.03,'#3b57a0',ornament,10);
  D.blueRoof('一楼连续蓝瓦雨檐',[[-4.42,3.00],[4.65,3.00],[4.65,4.65],[-4.42,4.65]],(x,z)=>3.30-(z-3)*.26);
  const balcony=part('右侧阳台');box(3.8,.16,1.15,2.45,3.45,3.65,'#d6e3ef',balcony);box(3.65,.03,1.05,2.45,3.545,3.65,'#8ea6ca',balcony);
  const rail=(x1,z1,x2,z2)=>{for(const y of [3.64,4.39])beam([x1,y,z1],[x2,y,z2],.028,C.trim,balcony);const d=Math.hypot(x2-x1,z2-z1),n=Math.ceil(d/.19);for(let i=0;i<=n;i++){const t=i/n;beam([x1+(x2-x1)*t,3.64,z1+(z2-z1)*t],[x1+(x2-x1)*t,4.39,z1+(z2-z1)*t],.014,C.trim,balcony);}};
  rail(.57,4.18,4.33,4.18);rail(.57,3.12,.57,4.18);rail(4.33,3.12,4.33,4.18);
  const posts=[];
  for(const x of [.57,4.33]){const z=4.18,bottom=3.37,top=roofY(x,z)-.14;box(.09,top-bottom,.09,x,(bottom+top)/2,z,C.trim,balcony);posts.push({x,z,bottom,top});}
  // Rain gutter joins the visible corner and returns to the wall before descending.
  gutter('正面檐沟',[[-4.62,5.66,3.63],[-2,5.66,3.63],[.43,5.66,3.63]],'#a77b56');
  gutter('转角棕色落水管',[[-4.53,5.66,3.63],[-4.48,5.43,3.54],[-4.37,5.24,3.20],[-4.37,.20,3.20]],'#ad7d55');
  gutter('后侧落水管',[[4.49,5.66,-3.63],[4.39,5.3,-3.22],[4.39,.20,-3.22]],'#ad7d55');
  const entry=part('玄关格栅');for(let x=-4.12;x<-3.46;x+=.17)box(.039,2.35,.07,x,1.53,3.32,C.trim,entry);
  step('门前必要踏步',-2.5,3.43,1.75,.65,.20);
  const plants=part('庭院植物');D.leafyTree(plants);
  const bushes=[
    ['左墙后深绿灌木',-6.32,2.9,2.32,3.15,2.0,'#669e50',11],
    ['左墙前低灌木',-6.70,5.1,1.5,2.6,1.0,'#729f43',23],
    ['左门边高灌木',-5.90,4.2,1.7,2.85,1.5,'#82ad51',31],
    ['左门边矮灌木',-5.80,5.55,.9,1.8,.75,'#5d9d4c',37],
    ['中央窗前灌木',.15,4.96,2.20,2.18,1.45,'#87ae40',47],
    ['右侧后灌木',5.78,2.4,2.4,2.75,2.0,'#8cb347',51],
    ['右窗前灌木',5.55,4.54,2.55,2.05,1.9,'#79a742',61]
  ];
  for(const args of bushes)D.bush(...args,plants);
  const rearTree=D.branchTree(plants);
  D.pinkWall('粉色前墙左',-6.675,6.2,2.55,1.80);
  D.pinkWall('粉色前墙右',2.675,6.2,10.55,1.80);
  D.pinkWall('粉色左院墙',-7.8,-.225,12.55,1.80,-Math.PI/2);
  D.pinkWall('粉色右院墙',7.8,-.225,12.55,1.80,Math.PI/2);
  D.pinkWall('粉色后院墙',0,-6.65,15.9,1.80,Math.PI);
  const gate=part('加宽灰门柱与半开木门');
  for(const x of [-5.15,-2.85])box(.48,2.08,.43,x,1.16,6.20,'#aab9c1',gate);
  box(.18,.27,.026,-2.85,1.69,6.43,'#f2f2eb',gate);
  const leaf=at('院门门扇',-4.90,6.17,1.30,gate);
  for(let x=.045;x<1.80;x+=.12)box(.105,1.70,.08,x,.97,0,'#a39c52',leaf);
  for(const y of [.49,1.44])box(1.80,.07,.10,.90,y,-.06,'#8a824a',leaf);
  plants.updateWorldMatrix(true,true);
  const plantBounds=Object.fromEntries(plants.children.map(g=>{const b=new K.THREE.Box3().setFromObject(g);return[g.name,{min:b.min.toArray(),max:b.max.toArray()}];}));
  return K.finish({inferred:['侧后墙窗','庭院纵深','米制尺寸'],roofValleys:false,plot:[16,14],entryWidth:1.82,
    structure:{body:{min:[-4.3,.35,-3.1],max:[4.3,5.9,3.1]},ridge:{axis:'x',z:0,y:ridgeY,count:1},mainSlopes:2,roofSlope:slope,balconyPosts:posts},
    garden:{lawn,rearTree,plantBounds,bushes:bushes.map(([name,x,z,w,h,d,color])=>({name,x,z,w,h,d,color}))}});
}
