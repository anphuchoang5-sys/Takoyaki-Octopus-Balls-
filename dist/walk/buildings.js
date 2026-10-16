import { THREE,world,box,cyl,sphere,tube,group,toon,glow,white,dark,metal,glass,face,label,batchStatic } from '../world.js';
import { buildStore } from '../store.js';

export const TILE_SIZE=14;
export const BUILDING_TYPES=['convenience','cafe','bookshop','home','garden'];
const cache=new Map();
const warm=glow('#f6ce86',1.0);
function bounds(x,z,w,d,height){return {x,z,w,d,height};}
function tree(parent,x,z,size=1,tint='#7b9e77'){
  cyl(.12*size,.19*size,1.5*size,x,.8*size,z,toon('#897359'),parent,9);
  for(const [dx,dy,dz,r]of [[0,2.1,0,.85],[-.45,1.8,.1,.6],[.38,1.87,-.12,.65]]){
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r*size,1),toon(tint));crown.position.set(x+dx*size,dy*size,z+dz*size);crown.scale.y=1.15;crown.castShadow=true;parent.add(crown);
  }
}
function planter(parent,x,z){cyl(.26,.19,.34,x,.34,z,toon('#b68769'),parent,10);for(let i=0;i<6;i++){const a=i*2.4;sphere(.18,x+Math.cos(a)*.14,.67+Math.sin(i)*.08,z+Math.sin(a)*.14,toon('#71917b'),parent).scale.set(.7,1.4,.7);}}
function bench(parent,x,z,rotation=0){const g=group(x,.17,z,rotation,parent);for(let i=0;i<4;i++)box(1.65,.065,.13,0,.44,-.2+i*.15,toon('#ad8a5e'),g);for(let i=0;i<3;i++)box(1.65,.11,.06,0,.67+i*.13,-.29,toon('#ad8a5e'),g);for(let xx of [-.59,.59]){box(.075,.43,.5,xx,.2,0,dark,g);box(.06,.6,.07,xx,.64,-.31,dark,g);}}
function window(parent,x,y,z,w,h,side=0){
  const g=group(x,y,z,side,parent);box(w+.14,h+.14,.09,0,0,0,toon('#537a72'),g);
  box(w,h,.018,0,0,.056,warm,g,false);box(w-.11,h-.1,.018,0,0,.069,toon('#506963',.15),g,false);
  for(let dx of [-w/2,w/2,0])box(.04,h,.055,dx,0,.09,white,g,false);box(w,.04,.055,0,0,.09,white,g,false);
  // A lit strip remains visible around drawn curtains at night.
  for(let dx of [-w*.29,w*.29])box(w*.3,h*.89,.016,dx,0,.084,toon('#d1bfa0',.15),g,false);
}
function sign(parent,text,sub,w,x,y,z,color='#527d70'){
  box(w+.14,.69,.1,x,y,z,toon(color),parent);face(w,.57,x,y,z+.058,label(text,sub,'#efdfb9',color,768,192),parent);
}
function bakeryOrBooks(type){
  const root=new THREE.Group(),cafe=type==='cafe';const wall=toon(cafe?'#dcc9ab':'#c2c3af'),accent=toon(cafe?'#8e6350':'#526e78');
  box(7.3,.18,5.8,0,.24,0,toon('#c4bd9f'),root);box(7,3.25,5.5,0,1.9,0,wall,root);
  // Recessed shopfront with real counters and shelves behind broad glazing.
  box(6.7,2.55,.12,0,1.66,2.79,toon('#565d53'),root);box(6.3,2.26,.08,0,1.73,2.87,toon('#c7b28b',.16),root);
  for(let x of [-2.0,1.8]){
    box(2.35,1.8,.55,x,1.45,3.08,toon('#8d7658'),root);
    for(let row=0;row<3;row++){
      const y=.73+row*.5;box(2.29,.055,.63,x,y,3.08,white,root);
      for(let col=0;col<10;col++){
        const xx=x-.98+col*.215;
        if(cafe){sphere(.082,xx,y+.1,3.2,toon(col%2?'#c08b52':'#d6aa66'),root).scale.set(1.15,.65,.72);}
        else{const m=box(.12,.28+(col%3)*.035,.2,xx,y+.18,3.22,toon(['#9b6456','#6f8e7d','#c5ab76','#8399a0'][col%4]),root,false);m.rotation.z=(col%4-1.5)*.04;box(.08,.016,.004,xx,y+.2,3.324,white,root,false);}
      }
    }
    box(2.45,2.27,.012,x,1.7,3.43,glass,root,false);
    for(let xx of [x-1.22,x+1.22])box(.065,2.43,.06,xx,1.73,3.47,accent,root);
  }
  box(.85,2.4,.08,0,1.61,3.43,accent,root);box(.65,1.63,.015,0,1.83,3.48,glass,root,false);box(.04,.32,.06,.27,1.57,3.52,metal,root);
  box(7.6,.18,6.5,0,3.61,.2,accent,root);
  for(let i=0;i<19;i++){const awning=box(.4,.06,1.1,-3.6+i*.4,3.01,3.73,toon(i%2?'#e8d5a5':cafe?'#9e7762':'#5c8981'),root,false);awning.rotation.x=.14;box(.4,.18,.055,-3.6+i*.4,2.85,4.24,toon(i%2?'#e8d5a5':cafe?'#9e7762':'#5c8981'),root,false);}
  sign(root,cafe?'喫茶 こもれび':'雨待書房',cafe?'KOMOREBI COFFEE & BREAD':'BOOKS · OLD & NEW',4.6,0,3.72,3.12,cafe?'#775846':'#486f72');
  for(let x of [-3.2,3.2])planter(root,x,4.45);
  if(cafe){for(let x of [-1.95,1.85]){cyl(.5,.5,.07,x,.92,4.63,toon('#a78a63'),root,18);cyl(.04,.08,.72,x,.53,4.63,metal,root);for(let dx of [-.68,.68]){cyl(.24,.24,.06,x+dx,.57,4.63,toon('#b19b73'),root,14);cyl(.035,.06,.4,x+dx,.36,4.63,metal,root);}}}
  else {bench(root,-1.55,4.65);face(.46,.63,1.7,.83,4.4,label('古本市','本と、ひと休み。','#dfc79d','#5e735f',256,350),root);}
  for(let x of [-2,0,2])box(.12,.05,2.5,x,2.83,2.05,warm,root,false);
  tree(root,-4.7,-3.8,1.15);tree(root,4.7,-3.8,.9);
  return {root,colliders:[bounds(0,.2,7.4,6.6,4),...(cafe?[bounds(-1.95,4.63,1.9,.9,1),bounds(1.85,4.63,1.9,.9,1)]:[bounds(-1.55,4.65,1.7,.7,1)])],occluders:[bounds(0,.15,7.5,6.4,4)],roofs:[bounds(0,.35,7.8,7.8,3.8)],lamps:[{x:-1.7,y:2.4,z:3.7},{x:1.7,y:2.4,z:3.7}],floors:[]};
}
function house(variant){
  const root=new THREE.Group();const wall=toon(variant%2?'#c5c7b0':'#d4bca4'),roof=toon(variant%2?'#5c7776':'#806f67');
  box(6.8,.24,6.6,0,.29,-.6,toon('#a3a896'),root);box(6.5,5.15,6.3,0,2.92,-.6,wall,root);
  box(6.65,.12,6.4,0,3.12,-.6,white,root);
  const cross=new THREE.Shape();cross.moveTo(-3.65,0);cross.lineTo(0,1.8);cross.lineTo(3.65,0);cross.closePath();
  const r=new THREE.Mesh(new THREE.ExtrudeGeometry(cross,{depth:7.15,bevelEnabled:false}),roof);r.position.set(0,5.49,-4.16);r.castShadow=true;root.add(r);
  for(let x of [-2.15,1.95])for(let y of [1.96,4.24])window(root,x,y,2.58,1.6,1.35);
  for(let z of [-2.7,.6])window(root,3.26,4.24,z,1.45,1.3,Math.PI/2);
  box(.95,2.1,.08,0,1.49,2.6,toon('#7c8070'),root);box(.55,.85,.015,0,1.79,2.647,toon('#afc3ad',.12),root);box(.04,.23,.05,.29,1.39,2.67,metal,root);
  for(let i=0;i<3;i++)box(1.5,.12,1.1-i*.25,0,.19+i*.12,3.06-i*.12,toon('#adae99'),root);
  box(1.65,.16,1.2,0,2.65,2.93,roof,root);
  box(.25,.25,.06,.93,2.15,2.7,warm,root,false);
  // Tiny balcony with vertical rails and a clothes pole.
  box(2.2,.13,1.0,-2.07,3.41,2.97,roof,root);tube([[-3.16,4.13,3.45],[-.98,4.13,3.45]],.033,metal,root);
  for(let i=0;i<12;i++)box(.025,.7,.025,-3.14+i*.195,3.77,3.45,metal,root,false);
  for(let x of [-4.25,4.25]){
    box(.75,.35,6.6,x,.33,-.65,toon('#a3aa8d'),root);
    for(let i=0;i<10;i++)sphere(.35,x,.75,-3.6+i*.66,toon('#7c9874'),root).scale.y=1.15;
  }
  box(.37,.52,.3,-1.35,.93,3.7,toon('#a47561'),root);cyl(.035,.035,.64,-1.35,.48,3.7,metal,root);
  face(.32,.18,-1.35,.99,3.86,label('POST','','#a47561','#eddfbd'),root);
  tree(root,3.9,4.2,1.1);planter(root,.95,3.75);
  return {root,colliders:[bounds(0,-.4,6.8,7,7.3),bounds(-4.25,-.65,.8,6.6,1),bounds(4.25,-.65,.8,6.6,1),bounds(3.9,4.2,.65,.65,3)],occluders:[bounds(0,-.6,7.3,7,7.3)],roofs:[{...bounds(0,-.6,7.3,7.2,7.29),ridge:7.29,eave:5.49,ridgeAxis:'z'}],lamps:[{x:0,y:2.2,z:3.4}],floors:[]};
}
function garden(){
  const root=new THREE.Group();box(9.1,.05,9.1,0,.2,0,toon('#9fae83'),root);box(2,.02,9.2,0,.234,0,toon('#c5bfa0'),root);box(9.2,.02,1.8,0,.235,0,toon('#c5bfa0'),root);
  for(const [x,z,s,t] of [[-3.4,-3.3,1.4,'#82a384'],[3.5,-3,1.3,'#799b7e'],[-3.7,3.3,1.1,'#a2b18d'],[3.4,3.5,1.1,'#cdad96']])tree(root,x,z,s,t);
  bench(root,-2.7,1.6,Math.PI);bench(root,2.7,-1.7);
  for(const [x,z] of [[-2,-2],[2,2]]){
    box(1.5,.25,1.4,x,.32,z,toon('#ab9c7e'),root);
    for(let i=0;i<24;i++){const a=i*2.4,rr=.1+(i%5)*.12;const xx=x+Math.cos(a)*rr,zz=z+Math.sin(a)*rr;cyl(.011,.011,.2,xx,.55,zz,toon('#6c8a67'),root,5);sphere(.055,xx,.67,zz,toon(i%3?'#e1c18f':'#d39988'),root);}
  }
  cyl(.7,.8,.22,0,.36,0,toon('#a5b2a4'),root,20);cyl(.53,.53,.025,0,.48,0,toon('#8da9a2'),root,24);cyl(.12,.18,.46,0,.68,0,toon('#b9c1ae'),root,12);
  return {root,colliders:[bounds(0,0,1.5,1.5,1),bounds(-2.7,1.6,1.8,.7,1.2),bounds(2.7,-1.7,1.8,.7,1.2),bounds(-2,-2,1.5,1.4,.7),bounds(2,2,1.5,1.4,.7),...[[ -3.4,-3.3],[3.5,-3],[-3.7,3.3],[3.4,3.5]].map(([x,z])=>bounds(x,z,.45,.45,3))],occluders:[],roofs:[],lamps:[{x:-4.5,y:3.2,z:-4.5}],floors:[]};
}
function convenience(){
  // Adapt the existing authored model once; instances retain their own door transforms.
  if(world.children.length)throw new Error('Convenience prefab requires the isolated, empty construction group.');
  buildStore();const root=new THREE.Group(),content=new THREE.Group();content.position.set(.6,0,1.6);root.add(content);
  for(const child of [...world.children]){if(child.isLight||child.isSprite)child.removeFromParent();else content.add(child);}
  return {root,
    colliders:[bounds(0,-3.0,7.8,.2,3.9),bounds(-3.8,0,.2,6,3.9),bounds(3.8,0,.2,6,3.9),bounds(-2.2,3.03,3.2,.16,3),bounds(2.59,3.03,2.42,.16,3),bounds(-2.3,.5,.9,1.85,1.9),bounds(-.45,.5,.9,1.85,1.9),bounds(2.78,1.46,1.3,2.25,1.5),bounds(-1.4,-2.57,4.3,.85,2.7),bounds(1.82,-.7,1.05,1.3,1.5)],
    occluders:[bounds(0,0,8.2,6.5,4.1)],roofs:[bounds(0,.1,8.4,6.9,4.02)],lamps:[{x:-1,y:2.5,z:.0},{x:2,y:2.4,z:2.1},{x:0,y:2.7,z:3.65}],floors:[{x:0,z:0,w:7.7,d:6.1,height:.395}]};
}
export function createBuilding(type,variant=0){
  if(!BUILDING_TYPES.includes(type))throw new Error(`Unknown building type: ${type}`);
  const key=type+':'+(type==='home'?variant%2:0);
  if(!cache.has(key)){
    const asset=type==='convenience'?convenience():type==='home'?house(variant):type==='garden'?garden():bakeryOrBooks(type);
    batchStatic(asset.root);cache.set(key,asset);
  }
  const asset=cache.get(key),root=asset.root.clone(true),doorNodes=[];
  root.traverse(o=>{if(o.userData.closedX!==undefined)doorNodes.push(o);});
  let open=0;
  return {type,root,colliders:asset.colliders,occluders:asset.occluders,roofs:asset.roofs,lamps:asset.lamps,floors:asset.floors,
    update(dt,player){if(!doorNodes.length)return;const entrance=root.localToWorld(new THREE.Vector3(.45,0,3.08));const near=Math.hypot(player.x-entrance.x,player.z-entrance.z)<1.85;open=THREE.MathUtils.damp(open,near?1:0,5,dt);for(const d of doorNodes)d.position.x=d.userData.closedX+d.userData.side*open*.78;},
    get doorOpen(){return open;}
  };
}
