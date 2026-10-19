import * as THREE from 'three';
import {workshop,orientOutward} from './geometry.js';

export const specification=Object.freeze({
  id:'maruko',revision:'static-01',height:1.24,units:'metres (project design)',front:'+Z',up:'+Y',origin:'centre between soles on floor',
  outdoorScale:1,indoorScale:1,stage:'静态样板 · 长相和比例待认可',rigged:false,animations:[],
  outfit:'白色翻领长袖 / 红背带裙（前白衣、背 X）/ 白袜 / 红鞋',
});
export const joints=Object.freeze({
  neck:[0,.666,0],head:[0,.91,0],pelvis:[0,.365,0],
  leftShoulder:[.1,.64,0],leftElbow:[.154,.525,.005],leftWrist:[.19,.432,.01],leftHip:[.058,.36,0],leftKnee:[.063,.192,0],leftAnkle:[.065,.055,0],
  rightShoulder:[-.1,.64,0],rightElbow:[-.154,.525,.005],rightWrist:[-.19,.432,.01],rightHip:[-.058,.36,0],rightKnee:[-.063,.192,0],rightAnkle:[-.065,.055,0],
});

const PALETTE={skin:'#ffdbc4',hair:'#182b38',shirt:'#fffdf5',red:'#df173c',shoe:'#b6343c',blush:'#ed9b9e',ink:'#25252b'};
const faceProfile=[
  [.676,.034,.035],[.686,.11,.07],[.703,.175,.108],[.73,.225,.137],[.77,.252,.158],
  [.82,.271,.169],[.89,.277,.176],[.96,.272,.176],[1.035,.25,.161],[1.10,.212,.14],[1.16,.145,.10],[1.205,.025,.023]
];
function interpolate(rows,y){
  let j=0;while(j<rows.length-2&&rows[j+1][0]<y)j++;
  const a=rows[j],b=rows[j+1],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
  return a.slice(1).map((v,i)=>v+(b[i+1]-v)*t);
}
function smoothProfile(profile,n=72){
  const c=new THREE.CatmullRomCurve3(profile.map(([y,x,z])=>new THREE.Vector3(x,y,z)),false,'centripetal');
  return c.getPoints(n).map(p=>[p.y,p.x,p.z]);
}
const headRows=smoothProfile(faceProfile);
function faceZ(x,y){const [rx,rz]=interpolate(headRows,y);return rz*Math.pow(Math.max(.001,1-(x/rx)**2),.325);}
const torsoProfile=[[.389,.092,.056],[.42,.095,.058],[.50,.096,.061],[.58,.1,.063],[.635,.103,.059],[.66,.076,.046],[.674,.041,.033]];
const torsoRows=smoothProfile(torsoProfile,36);
function torsoZ(x,y){const [rx,rz]=interpolate(torsoRows,y);return rz*Math.sqrt(Math.max(.02,1-(x/rx)**2));}
function ellipseRows(profile,count=96,flatten=false){return profile.map(([y,rx,rz])=>Array.from({length:count},(_,i)=>{const t=i/count*Math.PI*2,c=Math.cos(t);return [rx*Math.sin(t),y,rz*(flatten?Math.sign(c)*Math.abs(c)**.65:c)];}));}

export function createMaruko(){
  const W=workshop(),{root,ellipsoid,tube,rings,meshData,patch,ribbon}=W;
  root.userData={specification:{...specification},jointGuide:joints,referenceNote:'二维宣传插图优先；SOFVIPS 仅辅助体积，非原始三视图。尺寸和曲面为项目补全。'};
  // Short child limbs. The hidden upper legs are present beneath the skirt.
  for(const s of [-1,1]){
    const leg=s<0?'right':'left';
    const rows=smoothProfile([[.045,.023,.023],[.075,.025,.025],[.13,.025,.026],[.19,.026,.027],[.25,.029,.029],[.35,.033,.032]],34);
    const legRings=ellipseRows(rows,48).map(r=>r.map(([x,y,z])=>[x+s*(.058+(.35-y)*.025),y,z]));
    rings(leg+' leg',legRings,PALETTE.skin,{outline:.001});
    const sock=ellipseRows([[.032,.027,.027],[.065,.027,.027],[.12,.027,.028],[.13,.028,.028]],48).map(r=>r.map(([x,y,z])=>[x+s*.065,y,z]));
    rings(leg+' white sock',sock,PALETTE.shirt,{outline:.0009});
    tube(leg+' sock top',Array.from({length:49},(_,i)=>[s*.065+.028*Math.sin(i/48*Math.PI*2),.129,.028*Math.cos(i/48*Math.PI*2)]),.0008,'#b4adb0');
    // Rounded pumps, low gloss; sole is flat at Y=0, not an ellipsoid touching at a point.
    const foot=(x,y,z)=>{const a=s*.23;return [s*.065+x*Math.cos(a)+(z+.023)*Math.sin(a),y,(z+.023)*Math.cos(a)-x*Math.sin(a)];};
    const shoeRings=ellipseRows([[.001,.043,.071],[.008,.046,.077],[.02,.048,.078],[.038,.045,.072],[.05,.034,.055],[.058,.016,.026]],64).map(r=>r.map(v=>foot(...v)));
    rings(leg+' red shoe',shoeRings,PALETTE.shoe,{outline:.0008});
    tube(leg+' sole seam',Array.from({length:65},(_,i)=>foot(.0455*Math.sin(i/64*Math.PI*2),.008,.075*Math.cos(i/64*Math.PI*2))),.0012,'#73383f');
  }
  rings('white blouse',ellipseRows(torsoRows,72),PALETTE.shirt,{outline:.0013});
  ellipsoid('neck',[0,.677,0],[.035,.045,.032],PALETTE.skin,.001);
  // Sleeves are continuous curved volumes, with no toy shoulder seams.
  for(const s of [-1,1]){
    const side=s<0?'right':'left';
    const curve=new THREE.CatmullRomCurve3([[s*.087,.626,0],[s*.13,.586,0],[s*.155,.525,.005],[s*.19,.435,.01]].map(p=>new THREE.Vector3(...p)));
    const frames=curve.computeFrenetFrames(40,false),rows=[];
    for(let i=40;i>=0;i--){const t=i/40,p=curve.getPointAt(t),r=.025+.012*(1-t);rows.push(Array.from({length:40},(_,j)=>{const a=j/40*Math.PI*2;return p.clone().addScaledVector(frames.normals[i],r*Math.sin(a)).addScaledVector(frames.binormals[i],r*Math.cos(a)).toArray();}));}
    // Winding is checked geometrically; normals should point away from the sleeve axis.
    const sleeve=rings(side+' long sleeve',rows,PALETTE.shirt,{outline:.0011});
    ellipsoid(side+' rounded shoulder',[s*.094,.624,0],[.038,.035,.036],PALETTE.shirt,0);
    const palm=new THREE.Group();palm.name=side+' hand';root.add(palm);palm.position.set(s*.196,.411,.012);palm.rotation.z=s*.31;
    ellipsoid(side+' palm',[0,0,0],[.023,.029,.014],PALETTE.skin,.0008,palm);
    for(let f=0;f<4;f++)ellipsoid(side+' finger '+f,[(f-1.5)*.009,-.024-(f===1||f===2?.005:0),.002],[.006,.016,.008],PALETTE.skin,.00045,palm);
    ellipsoid(side+' thumb',[-s*.022,-.004,.004],[.009,.017,.011],PALETTE.skin,.0006,palm);
  }
  // Complete skirt volume with a closed modesty underside and rounded hem.
  const N=112,skirtProfile=[[.397,.101,.065],[.38,.108,.069],[.345,.126,.077],[.29,.155,.089],[.235,.185,.103],[.208,.196,.109]];
  const skirtRows=[];
  for(const [y,rx,rz] of [...skirtProfile].reverse())skirtRows.push(Array.from({length:N},(_,i)=>{const t=i/N*Math.PI*2,f=1+.016*Math.cos(t*12)*((.397-y)/.189);return [Math.sin(t)*rx*f,y+.019*Math.sin(t)**2*((.397-y)/.189)**2,Math.cos(t)*rz*f];}));
  rings('red skirt · full bell',skirtRows,PALETTE.red,{outline:.0012});
  // A dark inset under the hem covers the construction cap and reads as fabric thickness.
  const hem=Array.from({length:113},(_,i)=>{const t=i/112*Math.PI*2,f=1+.016*Math.cos(t*12);return [.195*Math.sin(t)*f,.208+.019*Math.sin(t)**2,.108*Math.cos(t)*f];});
  tube('rolled skirt hem',hem,.002,'#a9273d');
  const waistRows=ellipseRows([[.387,.104,.067],[.408,.099,.064]],80);
  rings('waistband',waistRows,'#c80f35',{outline:.0009});
  for(let f=0;f<10;f++){
    const a=(f+.5)/10*Math.PI*2,pts=[];
    for(let j=0;j<=16;j++){const t=j/16,y=.373-.145*t,[rx,rz]=interpolate([...skirtProfile].reverse(),y);pts.push([Math.sin(a)*(rx+.0008),y+.019*Math.sin(a)**2*((.397-y)/.189)**2,Math.cos(a)*(rz+.0008)]);}
    tube('skirt pleat '+f,pts,.0011,'#ac2540');
  }
  // Two front straps with white blouse in between; X straps on the back.
  for(const s of [-1,1]){
    const front=[],back=[];
    for(let i=0;i<=32;i++){const t=i/32,y=.406+t*.249,x=s*(.061-.006*t);front.push([x,y,torsoZ(x,y)+.0035]);const bx=s*(.064*(1-t)-.055*t);back.push([bx,y,-torsoZ(bx,y)-.0035-(s>0?.0015:0)]);}
    ribbon((s<0?'right':'left')+' front suspender',front,.014,PALETTE.red);
    ribbon((s<0?'left':'right')+' back X suspender',back,.016,PALETTE.red);
    const shoulder=[];for(let j=0;j<=24;j++){const t=j/24,a=t*Math.PI;shoulder.push([s*.055,.655+Math.sin(a)*.019,Math.cos(a)*.037]);}
    ribbon('suspender over shoulder '+s,shoulder,.014,PALETTE.red);
  }
  // Collar band and two pointed, raised front leaves.
  const collar=ellipseRows([[.652,.039,.035],[.676,.037,.033]],64);
  rings('white collar band',collar,'#fffef8',{outline:.0008});
  for(const s of [-1,1]){
    let points=[[s*.032,.674],[s*.067,.651],[s*.052,.604],[0,.643],[0,.657]];
    if(s>0)points=points.reverse();
    // Subdivided panel follows the blouse; sewn outer edge stays above the straps.
    const area=points.reduce((a,p,i)=>a+p[0]*points[(i+1)%points.length][1]-points[(i+1)%points.length][0]*p[1],0);if(area<0)points.reverse();
    patch('pointed collar '+s,points,'#fffef8',(x,y)=>[x,y,torsoZ(x,y)+.009],.0011);
  }
  // Face silhouette follows the broad lower face of the 2D source, not a toy sphere.
  const head=ellipseRows(headRows,128,true).map(row=>row.map(([x,y,z],i)=>{const c=Math.cos(i/128*Math.PI*2),lift=.078*((1-c)/2)**1.8*(1-THREE.MathUtils.smoothstep(y,.80,1.0));return [x,y+lift,z];}));
  rings('head · full skin volume',head,PALETTE.skin,{outline:.0015});
  for(const s of [-1,1]){
    ellipsoid('ear '+s,[s*.267,.811,.062],[.024,.038,.026],PALETTE.skin,.001);
    tube('ear fold '+s,[[s*.274,.825,.083],[s*.28,.814,.085],[s*.272,.801,.084]],.0012,'#c68b7c');
  }
  // A continuous thick hair cap with an authored zigzag front edge and complete back.
  const bangs=[[-.30,.919],[-.279,.955],[-.252,.928],[-.235,1.006],[-.20,.948],[-.168,1.046],[-.113,.961],[-.065,1.096],[0,.968],[.065,1.096],[.113,.968],[.168,1.046],[.20,.945],[.235,1.006],[.252,.928],[.279,.955],[.30,.919]];
  function edge(theta){const a=Math.abs(theta);if(a<=1.20){const x=Math.sin(theta)*.32;return interpolate(bangs,x)[0];}if(a<1.45)return THREE.MathUtils.lerp(.919,.785,(a-1.2)/.25);return .785-.075*Math.sin((a-1.45)/(Math.PI-1.45)*Math.PI/2)**2;}
  const angleList=Array.from({length:160},(_,i)=>-Math.PI+i/160*Math.PI*2);
  for(const [x] of bangs){const a=Math.asin(x/.32);if(Math.abs(a)<1.2)angleList.push(a);}
  const angles=[...new Set(angleList.map(a=>Number(a.toFixed(10))))].sort((a,b)=>a-b);
  const A=angles.length,R=44,p=[],ix=[];
  function hairPoint(theta,t,inside){const y=1.239-(1.239-edge(theta))*t*t;const factor=y>.9?Math.sqrt(Math.max(0,1-((y-.9)/.339)**2)):1+.035*Math.min(1,(.9-y)/.12);const rx=.322*factor*(inside?.955:1),rz=.225*factor*(inside?.955:1);return [Math.sin(theta)*rx,y-(inside?.007:0),Math.cos(theta)*rz-.018];}
  // Distinct poles avoid degenerate triangles at the crown.
  p.push(0,1.239,-.018);
  for(let j=1;j<=R;j++)for(const a of angles)p.push(...hairPoint(a,j/R,false));
  for(let i=0;i<A;i++)ix.push(0,1+(i+1)%A,1+i);
  for(let j=0;j<R-1;j++)for(let i=0;i<A;i++){const k=(i+1)%A,a=1+j*A+i,b=1+j*A+k,c=a+A,d=b+A;ix.push(a,b,c,b,d,c);}
  const innerPole=p.length/3;p.push(0,1.232,-.018);const innerStart=p.length/3;
  for(let j=1;j<=R;j++)for(const a of angles)p.push(...hairPoint(a,j/R,true));
  for(let i=0;i<A;i++)ix.push(innerPole,innerStart+i,innerStart+(i+1)%A);
  for(let j=0;j<R-1;j++)for(let i=0;i<A;i++){const k=(i+1)%A,a=innerStart+j*A+i,b=innerStart+j*A+k,c=a+A,d=b+A;ix.push(a,c,b,b,c,d);}
  for(let i=0;i<A;i++){const k=(i+1)%A,a=1+(R-1)*A+i,b=1+(R-1)*A+k,c=innerStart+(R-1)*A+i,d=innerStart+(R-1)*A+k;ix.push(a,c,b,b,c,d);}
  orientOutward(p,ix);
  meshData('hair · continuous bob and zigzag fringe',p,ix,PALETTE.hair,{outline:.001});
  // Marks conform to the face surface in model coordinates, including the highlights.
  const fmap=(x,y,offset=.0018)=>[x,y,faceZ(x,y)+offset];
  function disc(name,x,y,rx,ry,color){const pts=Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2;return [x+rx*Math.cos(a),y+ry*Math.sin(a)];});patch(name,pts,color,(a,b)=>fmap(a,b),0);}
  for(const s of [-1,1]){
    disc('black eye '+s,s*.092,.891,.028,.0285,'#171a20');
    const pts=Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return [s*.092+.009+.0075*Math.cos(a),.901+.0075*Math.sin(a)];});
    patch('eye glint '+s,pts,'#fffef8',(x,y)=>fmap(x,y,.003),0);
    disc('blush '+s,s*.213,.782,.027,.026,PALETTE.blush);
    const brow=[];for(let i=0;i<=18;i++){const t=i/18;brow.push(fmap(s*(.076+.076*t),.956+.032*Math.sin(t*Math.PI*.9),.003));}tube('eyebrow '+s,brow,.0021,PALETTE.ink);
  }
  const mouth=[];
  // CCW boundary: a shallow sloping top and a small rounded open smile.
  for(let i=0;i<=18;i++){const t=i/18;mouth.push([-.048+.096*t,.781+.009*t-.005*Math.sin(Math.PI*t)]);}
  for(let i=1;i<=30;i++){const a=i/30*Math.PI;mouth.push([.048*Math.cos(a),.785-.05*Math.sin(a)]);}
  mouth.reverse();patch('open smile',mouth,'#c96772',(x,y)=>fmap(x,y,.0025),.0024);
  // Centre of the two sole footprints, with the outline bottom exactly on Y=0.
  const soleZ=.023*Math.cos(.23),floorOffset=.0002;
  for(const child of root.children){child.position.y-=floorOffset;child.position.z-=soleZ;}
  const localJoints=Object.fromEntries(Object.entries(joints).map(([k,v])=>[k,[v[0],v[1]-floorOffset,v[2]-soleZ]]));
  root.userData.jointGuide=localJoints;
  return {root,specification,joints:localJoints,dispose:W.dispose};
}
