import {createWorkshop} from './geometry.js';
import {createGarden} from './garden.js';

export const specification=Object.freeze({id:'flowerorangebuilding',name:'花满橙瓦屋',revision:'exterior-01',tileSize:14,front:'+Z',placementRotations:[0,90,180,270],interior:false,reference:'references/user-exterior.jpg'});
const C={wall:'#e2eeee',trim:'#b9c8c5',shadow:'#77888d',roof:'#bf502e',ridge:'#a7462b',wood:'#987335',woodLight:'#bc9348',shutter:'#d4b249',blue:'#6399e7',blueDark:'#4878b5',windowFrame:'#d8e2d5',ground:'#98ad77',stone:'#c2c8bd',wallBase:'#869ba7'};

export function createModel(){
  const W=createWorkshop(),{THREE,root,group,box,beam,cylinder,solid,line,slab,roofFacet,batch}=W;
  root.name=specification.id;root.userData.specification=specification;
  W.material(C.blue).emissive.set(C.blue);W.material(C.blue).emissiveIntensity=.12;
  const site=group('地块与院内通道'),walls=group('白墙与凹入窗洞'),roof=group('橙瓦组合屋面'),details=group('门窗与阳台'),fence=group('砌块围墙与门屋'),plants=group('庭院花木');
  const windows=[],roofSurfaces=[];
  box(14,.20,14,0,-.02,0,'#74856b',site,true);
  box(13.90,.025,13.90,0,.0675,0,C.ground,site);
  // The street is outside the plot. This is only the entry apron and garden path.
  box(2.93,.13,1.07,-1.05,.145,5.94,C.stone,site,true);
  box(2.87,.065,.29,-1.05,.1125,6.57,'#a9b2b0',site,true);
  box(2.82,.055,.27,-1.05,.1075,6.80,'#b6bfbc',site,true);
  for(let z=5.5;z>3.05;z-=.42)box(1.32,.035,.395,-1.2,.098,z,'#c7c4ad',site,true);
  for(let x=-1.9;x>=-3.2;x-=.4)box(.38,.035,.75,x,.098,3.35,'#c7c4ad',site,true);
  box(4.7,.24,5.0,1.70,.20,-.45,'#a9b8b5',site,true);
  box(4.55,.23,4.7,-2.925,.195,-.25,'#a9b8b5',site,true);

  function wallPanel(name,x0,x1,y0,y1,z,openings=[],parent=walls){
    const g=group(name,parent),cuts=[x0,x1,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])].filter(x=>x>=x0&&x<=x1).sort((a,b)=>a-b);
    const piece=(a,b,lo,hi)=>{if(b-a>.001&&hi-lo>.001)box(b-a,hi-lo,.19,(a+b)/2,(lo+hi)/2,z-.095,C.wall,g);};
    for(let i=1;i<cuts.length;i++){const a=cuts[i-1],b=cuts[i],mid=(a+b)/2,o=openings.find(o=>mid>o.x-o.w/2&&mid<o.x+o.w/2);if(o){piece(a,b,y0,o.y-o.h/2);piece(a,b,o.y+o.h/2,y1);}else piece(a,b,y0,y1);}
    box(x1-x0,.055,.215,(x0+x1)/2,y0+.04,z-.09,C.trim,g);
    return g;
  }
  function window(name,x,y,z,w,h,{shutter,rotation=0,parent=details}={}){
    const g=group(name,parent);g.position.set(x,y,z);g.rotation.y=rotation;
    // Glass sits behind the exterior face; all four reveals are real solid pieces.
    box(w,h,.025,0,0,-.115,C.shadow,g);
    box(w-.10,h-.10,.018,0,0,-.085,C.blue,g);
    for(const dx of [-1,1])box(.065,h+.09,.22,dx*(w/2+.008),0,-.045,C.windowFrame,g,true);
    for(const dy of [-1,1])box(w+.12,.06,.23,0,dy*(h/2+.006),-.035,C.windowFrame,g,true);
    box(.044,h,.06,0,0,-.026,C.windowFrame,g,true);
    box(w+.18,.045,.30,0,-h/2-.045,.005,'#b7c4c0',g,true);
    for(const dx of [-.25,.25]){const r=box(.015,h*.23,.004,dx*w,h*.22,-.072,'#86b5e0',g);r.rotation.z=-.4;}
    if(shutter){const sx=shutter==='left'?-w/2-.31:w/2+.31,sw=.50;
      box(sw,h+.06,.09,sx,0,.01,'#a88938',g,true);
      for(const dx of [-1,1])box(.045,h+.11,.11,sx+dx*(sw/2),0,.025,C.shutter,g,true);
      for(const dy of [-1,1])box(sw+.04,.05,.11,sx,dy*(h/2+.025),.025,C.shutter,g,true);
      for(let yy=-h/2+.085;yy<h/2-.02;yy+=.10){const slat=box(sw-.07,.078,.07,sx,yy,.065,C.shutter,g);slat.rotation.x=.16;}
      box(.035,.10,.045,sx,0,.11,'#8d773c',g);
    }
    windows.push({name,center:[x,y,z],width:w,height:h,recess:.085});return g;
  }
  const upper=[{x:.73,y:3.88,w:1.29,h:1.02},{x:2.72,y:3.90,w:1.40,h:1.16}];
  wallPanel('二层正面',-.65,4.05,2.94,4.72,1.12,upper);
  window('二层左窗与左百叶',.73,3.88,1.12,1.29,1.02,{shutter:'left'});
  window('二层右窗与右百叶',2.72,3.90,1.12,1.40,1.16,{shutter:'right'});
  box(.19,4.4,4.05,-.555,2.52,-.955,C.wall,walls);
  box(.19,4.4,4.05,3.955,2.52,-.955,C.wall,walls);
  for(const x of [-.555,3.955])box(.19,2.25,1.0,x,1.445,1.55,C.wall,walls);
  const back=group('背立面补全',walls);back.position.z=-3.05;back.rotation.y=Math.PI;
  wallPanel('背面窗洞',-4.05,.65,.32,4.72,0,[{x:-2.8,y:3.8,w:1.05,h:.95},{x:-.55,y:1.5,w:1.0,h:1.0}],back);
  window('背面二层补全窗',-2.8,3.8,0,1.05,.95,{parent:back});window('背面一层补全窗',-.55,1.5,0,1,1,{parent:back});
  const lower=[{x:1.49,y:1.48,w:1.26,h:1.20},{x:2.88,y:1.48,w:1.26,h:1.20}];
  wallPanel('一层正面',-.65,4.05,.32,2.57,2.05,lower);
  window('一层左玻璃窗',1.49,1.48,2.05,1.26,1.20);window('一层右玻璃窗',2.88,1.48,2.05,1.26,1.20);
  // Left low wing and the front-facing little gable are separate connected volumes.
  box(.19,2.23,4.7,-5.105,1.435,-.25,C.wall,walls);
  box(4.55,2.23,.19,-2.925,1.435,-2.505,C.wall,walls);
  const westGable=solid([[-2.60,2.55],[-.40,3.92],[2.10,2.55]],.18,C.wall,walls);westGable.rotation.y=-Math.PI/2;westGable.position.x=-5.02;
  wallPanel('左侧低屋正面',-5.20,-.65,.32,2.55,2.10,[{x:-3.15,y:1.35,w:2.1,h:1.9}]);
  box(3.24,.17,.78,-3.15,.235,2.53,'#a6b4ae',site,true);
  wallPanel('山墙前廊左墙',-4.77,-4.20,.32,2.55,2.93);
  wallPanel('山墙前廊右墙',-2.10,-1.53,.32,2.55,2.93);
  const gable=solid([[-4.77,2.55],[-3.15,3.35],[-1.53,2.55]],.18,C.wall,walls);gable.position.z=2.74;
  box(.17,2.23,.92,-4.685,1.435,2.50,C.wall,walls);box(.17,2.23,.92,-1.615,1.435,2.50,C.wall,walls);
  // A shaded entry recess with a floor, ceiling and back wall, rather than a flat door decal.
  box(2.10,2.02,.14,-3.15,1.33,2.20,'#69756a',details);
  for(const x of [-4.20,-3.15,-2.10])box(.07,2.0,.10,x,1.34,2.70,C.wood,details,true);
  for(const y of [.35,2.34])box(2.17,.07,.12,-3.15,y,2.70,C.wood,details,true);
  for(let x=-4.08;x<-2.15;x+=.18)box(.033,1.90,.055,x,1.34,2.68,'#c4a562',details);
  box(2.08,1.89,.025,-3.15,1.34,2.60,'#7194a2',details);
  box(.13,.045,.04,-3.06,1.27,2.76,'#606953',details);
  box(3.30,.06,1.0,-3.15,2.47,2.65,C.trim,walls);

  function facet(name,points,height,options={}){const g=group(name,roof);roofFacet(points,height,options,g);roofSurfaces.push({name,points,heightAtVertices:points.map(p=>height(...p))});return g;}
  // The main roof's short side slopes are an explicit reconstruction of the hidden roof volume.
  const x0=-1.15,x1=4.55,zf=1.70,zb=-3.55,zr=-.925,yr=6.25,ye=4.79,rx0=-.64,rx1=4.04;
  facet('主屋顶前坡',[[x0,zf],[x1,zf],[rx1,zr],[rx0,zr]],(x,z)=>yr-(yr-ye)*(z-zr)/(zf-zr));
  facet('主屋顶后坡补全',[[x1,zb],[x0,zb],[rx0,zr],[rx1,zr]],(x,z)=>yr-(yr-ye)*(zr-z)/(zr-zb));
  facet('主屋顶左侧短坡补全',[[x0,zf],[rx0,zr],[x0,zb]],x=>ye+(yr-ye)*(x-x0)/(rx0-x0),{axis:'x'});
  facet('主屋顶右侧短坡补全',[[x1,zb],[rx1,zr],[x1,zf]],x=>ye+(yr-ye)*(x1-x)/(x1-rx1),{axis:'x'});
  for(let x=rx0;x<rx1-.00001;x+=.36){const c=cylinder(.085,.085,Math.min(.354,rx1-x),x+Math.min(.354,rx1-x)/2,yr+.04,zr,C.ridge,roof,12);c.rotation.z=Math.PI/2;}
  for(const z of [zf,zb])box(x1-x0+.04,.09,.10,(x0+x1)/2,ye-.045,z,'#b1954f',roof,true);
  const lowHeight=(x,z)=>3.92-(z+.40)*(1.37/3.15),valleyZ=-.40+(3.92-3.35)/(1.37/3.15);
  facet('左低屋前坡及真实谷口',[[-5.30,-.40],[-.65,-.40],[-.65,2.75],[-1.53,2.75],[-3.15,valleyZ],[-4.77,2.75],[-5.30,2.75]],lowHeight);
  facet('左低屋后坡补全',[[-5.30,-2.92],[-.65,-2.92],[-.65,-.40],[-5.30,-.40]],(x,z)=>3.92-(1.37/2.52)*(-.40-z));
  facet('前向山墙左瓦坡',[[-4.77,3.13],[-3.15,3.13],[-3.15,valleyZ],[-4.77,2.75]],x=>3.35-(3.35-2.55)*Math.abs(x+3.15)/1.62,{axis:'x',tileW:.34,tileD:.40});
  facet('前向山墙右瓦坡',[[-3.15,3.13],[-1.53,3.13],[-1.53,2.75],[-3.15,valleyZ]],x=>3.35-(3.35-2.55)*Math.abs(x+3.15)/1.62,{axis:'x',tileW:.34,tileD:.40});
  beam([-4.8,2.52,3.15],[-3.15,3.35,3.15],.045,C.ridge,roof);beam([-3.15,3.35,3.15],[-1.50,2.52,3.15],.045,C.ridge,roof);
  beam([-4.8,2.44,3.13],[-3.15,3.27,3.13],.035,C.trim,roof);beam([-3.15,3.27,3.13],[-1.50,2.44,3.13],.035,C.trim,roof);
  facet('玄关低雨檐',[[-4.52,2.83],[-1.78,2.83],[-1.78,3.58],[-4.52,3.58]],(x,z)=>2.59-(z-2.83)*.36,{tileD:.30});
  facet('二层下方一层雨檐',[[-.70,1.10],[4.35,1.10],[4.35,2.51],[-.70,2.51]],(x,z)=>3.02-(z-1.10)*.30);
  // Low right extension seen through the foliage; its depth and rear wall are inferred.
  box(1.3,2.22,3.0,4.70,1.43,-.42,C.wall,walls);
  for(const z of [-1.92,1.01]){const wedge=solid([[4.05,2.54],[4.05,3.9],[5.35,2.691],[5.35,2.54]],.08,C.wall,walls);wedge.position.z=z;}
  facet('右侧低附屋',[ [4.05,-2.10],[5.58,-2.10],[5.58,1.32],[4.05,1.32] ],x=>3.9-(x-4.05)*.93,{axis:'x',tileW:.34,tileD:.43});
  // Gutters and drainpipes are modest hidden-structure completion.
  for(const x of [-.53,3.92])line([[x,4.65,-3.08],[x,4.35,-3.20],[x,.25,-3.20]],.035,'#9da99e',details);

  const balcony=group('二层浅阳台',details);
  box(2.25,.13,.86,2.67,3.015,1.51,'#b7c4c2',balcony,true);
  box(2.26,.055,.07,2.67,3.71,1.96,'#d4dbd2',balcony,true);
  box(2.26,.05,.07,2.67,3.14,1.96,'#aebdbb',balcony);
  for(let x=1.56;x<=3.79;x+=.145)box(.025,.57,.035,x,3.425,1.96,'#c5d3d0',balcony);
  for(const x of [1.56,3.78]){box(.055,.64,.055,x,3.42,1.96,'#8b9b9c',balcony);box(.045,.055,.81,x,3.71,1.56,'#c6d2cf',balcony);for(let z=1.22;z<1.9;z+=.16)box(.026,.57,.027,x,3.425,z,'#bdcaca',balcony);beam([x,2.78,1.14],[x,2.96,1.82],.045,'#a3b2b1',balcony);}

  function wallRun(x0,x1,z){
    box(x1-x0,.49,.25,(x0+x1)/2,.325,z,C.wallBase,fence,true);
    for(let row=0;row<3;row++){
      const bottom=.57+row*.37;
      let x=x0;while(x<x1-.001){const width=Math.min(row%2&&x===x0?.63:1.27,x1-x);box(width-.008,.355,.24,x+width/2,bottom+.1775,z,'#dfe9e3',fence);x+=width;}
    }
    box(x1-x0+.025,.08,.31,(x0+x1)/2,1.72,z,'#d3e0d9',fence,true);
  }
  wallRun(-6.85,-2.49,5.47);wallRun(.52,6.85,5.47);
  // Return walls give the enclosure real depth without closing the gate path.
  for(const x of [-6.72,6.72]){box(.22,1.58,10.98,x,.87,-.12,'#c7d7ca',fence);box(.28,.07,11.02,x,1.695,-.12,'#d5dfcd',fence);}
  box(13.44,1.30,.22,0,.73,-5.61,'#bdcdbd',fence);box(13.50,.065,.27,0,1.4125,-5.61,'#d5dfcd',fence);
  for(const x of [-2.40,.43])box(.15,2.30,.18,x,1.36,5.49,C.wood,fence,true);
  box(2.98,.16,.22,-.985,2.49,5.49,C.woodLight,fence,true);
  const gate=group('木栅院门',fence);
  for(const x of [-1.52,.30])box(.11,1.98,.105,x,1.25,5.55,C.wood,gate,true);
  for(const y of [.29,1.02,2.19])box(1.89,.10,.11,-.61,y,5.55,C.wood,gate,true);
  for(let x=-1.40;x<.24;x+=.14)box(.047,1.82,.065,x,1.25,5.55,'#b28d45',gate);
  for(let x=-2.28;x<-1.62;x+=.13)box(.046,2.10,.065,x,1.32,5.49,C.woodLight,fence);
  box(.72,.075,.11,-1.98,.88,5.50,C.wood,fence);
  cylinder(.045,.045,.06,.18,1.11,5.63,'#534f35',gate,12).rotation.x=Math.PI/2;
  box(.43,.045,.065,-.37,1.64,5.59,C.wood,gate,true);
  const gateRoof=group('黄褐色门屋小坡顶',fence),gx0=-2.72,gx1=.75,gr=2.91,ge=2.56;
  roofFacet([[gx0,5.44],[gx1,5.44],[gx1,6.04],[gx0,6.04]],(x,z)=>gr-(z-5.44)*(gr-ge)/.60,{color:'#b3993f',tileW:.45,tileD:.22},gateRoof);
  roofFacet([[gx0,4.84],[gx1,4.84],[gx1,5.44],[gx0,5.44]],(x,z)=>gr-(5.44-z)*(gr-ge)/.60,{color:'#b3993f',tileW:.45,tileD:.22},gateRoof);
  box(gx1-gx0,.075,.085,(gx0+gx1)/2,gr,5.44,'#927e34',gateRoof,true);
  for(const x of [-2.40,.43])beam([x,2.30,5.49],[x,2.59,5.91],.045,C.wood,fence);

  const garden=createGarden(W,plants);garden.build();
  // Preserve semantic bounds for targeted inspection even after reducing draw calls.
  root.updateMatrixWorld(true);
  const components=root.children.map(g=>g.name);
  for(const g of root.children)batch(g);
  root.updateMatrixWorld(true);
  root.userData.design={mainHeight:6.25,front:'+Z',gateCenter:[-.985,.21,5.49],windows,potSupports:garden.supports,roofSurfaces,hiddenStructure:'Rear elevations, depths, short side roof slopes, low right wing connection and house entry reconstructed.',components};
  let state={time:'afternoon',weather:'clear',snowAmount:0},disposed=false;
  const asset={root,specification,roof,entry:{x:-.985,y:.21,z:5.49,facing:'+Z',clearWalkWidth:1.6},floors:[{x:0,z:0,w:14,d:14,height:.08}],
    environmentSupport:{time:['morning','afternoon','dusk','night'],weather:['clear','rain','snow'],weatherEffects:false,snow:false,lighting:false},
    setEnvironment(patch={}){if(disposed)return;const next={...state,...patch};if(!['morning','afternoon','dusk','night'].includes(next.time)||!['clear','rain','snow'].includes(next.weather)||!Number.isFinite(next.snowAmount)||next.snowAmount<0||next.snowAmount>1)throw new Error('Invalid flowerorangebuilding environment');state={time:next.time,weather:next.weather,snowAmount:next.snowAmount};},
    getEnvironment:()=>({...state,weatherEffectsImplemented:false,snowImplemented:false,localLightingImplemented:false,disposed}),
    getLightingDescriptors:()=>[],
    dispose(){if(disposed)return;disposed=true;W.dispose();}
  };
  return asset;
}
