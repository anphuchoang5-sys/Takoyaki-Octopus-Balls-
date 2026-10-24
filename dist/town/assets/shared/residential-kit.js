import * as THREE from 'three';
import {createWorkshop} from '../flowerorangebuilding/geometry.js';

// Exterior art only. Reuses the existing, unchanged per-instance geometry workshop.
// No renderer, clock, snow registration or host-owned light is created here.
export function residentialKit(specification) {
  const W=createWorkshop(),{root,group,box,beam,ball,cylinder,solid,slab,line,material}=W;
  root.name=specification.name;
  const parts={},contacts=[];
  function part(name,parent=root){const g=group(name,parent);parts[name]=g;return g;}
  function at(name,x,z,rotation=0,parent=root){const g=part(name,parent);g.position.set(x,0,z);g.rotation.y=rotation;return g;}
  const green=['#5f934d','#6ca34e','#7caf50','#85b65b','#679c59'];
  function crown(rx,ry,rz,x,y,z,color,parent,seed){
    const geo=new THREE.SphereGeometry(1,24,16),a=geo.attributes.position;
    for(let i=0;i<a.count;i++){const px=a.getX(i),py=a.getY(i),pz=a.getZ(i),f=1+.025*Math.sin(px*7+seed)*Math.cos(py*6-seed)*Math.sin(pz*8+seed);a.setXYZ(i,px*f,py*f,pz*f);}
    geo.computeVertexNormals();const m=W.mesh(geo,color,parent);m.position.set(x,y,z);m.scale.set(rx,ry,rz);return m;
  }
  function shrub(name,x,z,w,h,d,color=green[1],parent=root){
    const g=part(name,parent),base=.13;
    cylinder(.055,.085,h*.63,x,base+h*.3,z,'#7c7450',g,7);
    for(let i=0;i<9;i++){
      const a=i*2.3999,r=i===0?0:.29;
      const px=x+Math.cos(a)*w*r,pz=z+Math.sin(a)*d*r;
      const py=base+h*(i===0?.63:.40+((i*3)%5)*.045);
      const col=new THREE.Color(color).offsetHSL(0,0,(i%3-1)*.019);
      crown(w*.28,h*(i===0?.36:.28),d*.30,px,py,pz,'#'+col.getHexString(),g,i);
    }
    // Small leaf pairs follow crown surface instead of flat billboards.
    for(let i=0;i<13;i++){
      const a=i*2.3999,px=x+Math.cos(a)*w*.25,pz=z+Math.sin(a)*d*.26,py=base+h*(.74+.11*Math.sin(i*1.7));
      const leaf=ball(.024,.075,.017,px,py,pz,'#c2d276',g,6);leaf.rotation.z=.3*Math.sin(a);
    }
    return g;
  }
  function tree(name,x,z,h,w,color='#72a754',parent=root){
    const g=part(name,parent),trunk='#847251';
    beam([x,.12,z],[x+.09,h*.72,z-.12],.17,trunk,g,.08);
    for(let i=0;i<5;i++){const a=i*2.25;beam([x,h*(.24+i*.055),z],[x+Math.cos(a)*w*.31,h*(.60+i%2*.13),z+Math.sin(a)*w*.28],.095,trunk,g,.035);}
    for(let i=0;i<14;i++){const a=i*2.3999;crown(w*(i===0?.37:.28),h*.16,w*.28,x+Math.cos(a)*w*.25,h*(.62+(i%4)*.078),z+Math.sin(a)*w*.23,'#'+new THREE.Color(color).offsetHSL(0,0,(i%4-1.5)*.014).getHexString(),g,i);}
    for(let i=0;i<28;i++){const a=i*2.4,y=h*(.63+(i%5)*.058),px=x+Math.cos(a)*w*.43,pz=z+Math.sin(a)*w*.43;const l=ball(.035,.09,.022,px,y,pz,'#c3d67b',g,6);l.rotation.z=.4*Math.sin(a);}
    return g;
  }
  function cypress(name,x,z,h,w,parent=root){const g=part(name,parent);beam([x,.12,z],[x,h*.8,z],.11,'#766f4a',g,.035);for(let i=0;i<7;i++){const t=i/6;ball(w*(.52-.37*t),h*.20,w*(.46-.32*t),x+Math.sin(i)*.07,h*(.25+t*.58),z,'#'+new THREE.Color('#398976').offsetHSL(0,0,(i%3)*.025).getHexString(),g,10);}return g;}
  function site(w,d,{grass='#b0c37f',pathX=0,pathWidth=1.8,pathEnd=2.5}={}){
    const g=part('地块与通道');box(w,.22,d,0,-.02,0,'#d6ceb5',g,true);box(w-.08,.035,d-.08,0,.1025,0,grass,g);
    const pathStart=d/2-.1,dep=pathStart-pathEnd;
    box(pathWidth,.04,dep,pathX,.14,(pathStart+pathEnd)/2,'#d6d0b9',g);
    for(let z=pathEnd+.55;z<pathStart;z+=.82)box(pathWidth-.06,.009,.018,pathX,.165,z,'#bbb8a5',g);
    // Sparse tufts along plot edges; individual blades rest on the lawn.
    for(let i=0;i<80;i++){const t=i/79,x=-w/2+.25+t*(w-.5),z=d/2-.18;if(Math.abs(x-pathX)<pathWidth*.6)continue;for(let k=0;k<3;k++)beam([x+k*.035,.12,z],[x+k*.055-.025,.20+(i%4)*.015,z-.02],.009,green[i%green.length],g,.004);}
    for(const t of [.09,.19,.37,.74,.86,.93]){const x=(t-.5)*(w-.5),z=d/2-.16;if(Math.abs(x-pathX)<pathWidth*.6)continue;for(let k=0;k<3;k++){const xx=x+k*.10,y=.24+(k%2)*.05;beam([xx,.12,z],[xx,y,z],.006,'#6e984e',g,.004);for(let j=0;j<5;j++)ball(.025,.018,.012,xx+Math.cos(j*1.257)*.024,y+Math.sin(j*1.257)*.025,z,['#f2de7e','#ecd6d4','#f4f0da'][k],g,6);ball(.013,.013,.013,xx,y,z+.01,'#cbb953',g,6);}}
    return g;
  }
  function wall(name,{x,z,w,top,bottom=.16,color='#dce8df',rotation=0,openings=[],depth=.20},parent=root){
    const g=at(name,x,z,rotation,parent),xs=[-w/2,w/2],ys=[bottom,top];
    for(const o of openings){xs.push(o.u-o.w/2,o.u+o.w/2);ys.push(o.y-o.h/2,o.y+o.h/2);}
    const X=[...new Set(xs)].sort((a,b)=>a-b),Y=[...new Set(ys)].sort((a,b)=>a-b);
    for(let i=0;i<X.length-1;i++)for(let j=0;j<Y.length-1;j++){
      const xx=(X[i]+X[i+1])/2,yy=(Y[j]+Y[j+1])/2;
      if(xx<-w/2||xx>w/2||yy<bottom||yy>top||openings.some(o=>Math.abs(xx-o.u)<o.w/2-1e-6&&Math.abs(yy-o.y)<o.h/2-1e-6))continue;
      box(X[i+1]-X[i],Y[j+1]-Y[j],depth,xx,yy,-depth/2,color,g);
    }
    return g;
  }
  function window(name,{x,y,z,w,h,rotation=0,frame='#d7e2dc',glass='#4e86c3',cols=2,rows=1,shutter=false,bars=false},parent=root){
    const g=at(name,x,z,rotation,parent),f=.075;
    box(w+.04,h+.04,.04,0,y,-.185,'#414c55',g);
    box(w-.10,h-.10,.028,0,y,-.115,glass,g);
    for(const xx of [-w/2,w/2]){box(f,h+f,.17,xx,y,-.015,frame,g,true);box(.025,h-.06,.15,xx+(xx<0?.047:-.047),y,-.115,'#a7b9ba',g);}
    for(const yy of [y-h/2,y+h/2])box(w+.10,f,.19,0,yy,-.005,frame,g,true);
    box(w+.20,.07,.27,0,y-h/2-.045,.025,frame,g,true);
    for(let i=1;i<cols;i++)box(.047,h-.06,.08,-w/2+w*i/cols,y,-.025,frame,g);
    for(let i=1;i<rows;i++)box(w-.05,.047,.08,0,y-h/2+h*i/rows,-.025,frame,g);
    for(let i=0;i<cols;i++){const xx=-w/2+(i+.5)*w/cols;beam([xx-w/cols*.20,y-h*.15,-.097],[xx+w/cols*.12,y+h*.14,-.097],.006,'#3970a5',g);beam([xx-w/cols*.12,y-h*.19,-.096],[xx+w/cols*.15,y+h*.07,-.096],.003,'#8eb6db',g);}
    if(shutter){const sx=w/2+.10+w*.22;box(w*.43,h+.10,.085,sx,y,-.04,'#bba77c',g,true);for(let yy=y-h/2;yy<y+h/2;yy+=.13)box(w*.40,.025,.018,sx,yy,.01,'#a79570',g);}
    if(bars)for(let xx=-w/2+.14;xx<w/2;xx+=.19)box(.028,h,.055,xx,y,.15,frame,g);
    return g;
  }
  function gable(name,{x,z,w,eave,ridge,depth=.18,color='#e4ecdf',rotation=0},parent=root){
    const g=at(name,x,z,rotation,parent);const m=solid([[-w/2,eave],[w/2,eave],[0,ridge]],depth,color,g);m.position.z=-depth;return g;
  }
  function roof(name,points,height,{color='#ab6151',style='sheet',tileW=.43,tileD=.34,axis='z',fascia='#ddd9c5'}={},parent=root){
    const g=part(name,parent);
    if(style==='tiles')W.roofFacet(points,height,{color,tileW,tileD,axis},g);
    else {
      slab(points,height,.13,color,g,true);
      const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
      const minZ=Math.min(...points.map(p=>p[1])),maxZ=Math.max(...points.map(p=>p[1]));
      // Clip actual standing seams to the polygon, including cross-roof valleys.
      const fixed=axis==='x'?1:0,other=1-fixed;
      const intersect=(v)=>{const hits=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[fixed]<=v&&b[fixed]>v)||(b[fixed]<=v&&a[fixed]>v))hits.push(a[other]+(b[other]-a[other])*(v-a[fixed])/(b[fixed]-a[fixed]));}return hits.sort((a,b)=>a-b);};
      for(let v=(fixed?minZ:minX)+.38;v<(fixed?maxZ:maxX)-.02;v+=.64){const hits=intersect(v);for(let k=0;k+1<hits.length;k+=2){const a=hits[k]+.01,b=hits[k+1]-.01,pa=fixed?[a,v]:[v,a],pb=fixed?[b,v]:[v,b];if(b>a)beam([pa[0],height(...pa)+.012,pa[1]],[pb[0],height(...pb)+.012,pb[1]],.010,'#'+new THREE.Color(color).multiplyScalar(.78).getHexString(),g);}}
      g.userData.extent=[minZ,maxZ];
    }
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];beam([a[0],height(...a)-.095,a[1]],[b[0],height(...b)-.095,b[1]],.045,fascia,g);}
    return g;
  }
  function ridge(name,a,b,color,parent=root){const g=part(name,parent);beam(a,b,.085,color,g);const len=new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));for(let t=0;t<len;t+=.46){const p=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),t/len);ball(.09,.09,.09,...p.toArray(),color,g,8);}return g;}
  function gutter(name,points,color,parent=root){const g=part(name,parent);line(points,.045,color,g);for(let i=1;i<points.length;i+=2){const p=points[i];box(.12,.08,.06,p[0],p[1],p[2]-.015,color,g);}return g;}
  function railing(name,{x,z,w,bottom,h=.80,depth=.14,color='#e7e5d4'},parent=root){const g=part(name,parent);for(const yy of [bottom+.035,bottom+h])box(w,.06,depth,x,yy,z,color,g);for(let xx=x-w/2+.035;xx<x+w/2;xx+=.23)box(.035,h,depth*.7,xx,bottom+h/2,z,color,g);return g;}
  function fence(name,{x,z,w,h=1.6,rotation=0,color='#c5d2d2',style='board'},parent=root){
    const g=at(name,x,z,rotation,parent);box(w,h,.20,0,.12+h/2,0,color,g);
    box(w+.06,.075,.27,0,.12+h+.035,0,'#a8aaa7',g,true);
    for(let y=.12+.35;y<.12+h-.1;y+=.36)box(w,.015,.014,0,y,.108,'#'+new THREE.Color(color).multiplyScalar(.80).getHexString(),g);
    if(style==='block')for(let x=-w/2+.65;x<w/2;x+=.65)box(.014,h-.10,.012,x,.12+h/2,.108,'#7f9ba4',g);
    return g;
  }
  function woodSiding(wallGroup,{w,bottom,top,openings=[],color='#ab9b63',spacing=.40}){
    const g=part(wallGroup.name+'木板',wallGroup);
    const segments=(y)=>{let spans=[[-w/2+.015,w/2-.015]];for(const o of openings)if(y>o.y-o.h/2-.02&&y<o.y+o.h/2+.02)spans=spans.flatMap(([a,b])=>[[a,Math.min(b,o.u-o.w/2-.015)],[Math.max(a,o.u+o.w/2+.015),b]].filter(([a,b])=>b-a>.01));return spans;};
    for(let y=bottom+.05;y<top;y+=spacing){for(const [a,b]of segments(y)){box(b-a,.017,.017,(a+b)/2,y,.013,'#88784f',g);}}
    for(let x=-w/2+.04;x<w/2;x+=.84){let spans=[[bottom,top]];for(const o of openings)if(x>o.u-o.w/2-.06&&x<o.u+o.w/2+.06)spans=spans.flatMap(([a,b])=>[[a,Math.min(b,o.y-o.h/2-.05)],[Math.max(a,o.y+o.h/2+.05),b]].filter(([a,b])=>b-a>.02));for(const[a,b]of spans)box(.045,b-a,.04,x,(a+b)/2,.030,color,g);}
    return g;
  }
  function step(name,x,z,w,d,h=.20,parent=root){const g=part(name,parent);box(w,h,d,x,.12+h/2,z,'#bbb9a5',g,true);contacts.push({name,ground:.12,bottom:.12});return g;}
  function finish(extra={}){
    // Batch only immediate semantic groups; resources remain instance-local.
    for(const g of [...root.children])if(g.isGroup)W.batch(g);
    root.updateMatrixWorld(true);
    const env={time:'afternoon',weather:'clear',snowAmount:0};
    return {root,specification,dispose:W.dispose,colliders:[],floors:[],roofs:[],lamps:[],
      setEnvironment(patch){const next={...env,...patch};if(!['morning','afternoon','dusk','night'].includes(next.time)||!['clear','rain','snow'].includes(next.weather)||!Number.isFinite(next.snowAmount)||next.snowAmount<0||next.snowAmount>1)throw new Error('Invalid environment');Object.assign(env,next);},
      getEnvironment:()=>({...env,localLights:false,snowImplemented:false,weatherEffectsImplemented:false}),getLightingDescriptors:()=>[],
      getInspection:()=>({specification,contacts,...extra})};
  }
  return {...W,part,at,site,wall,window,gable,roof,ridge,gutter,railing,fence,woodSiding,tree,shrub,cypress,step,finish};
}
