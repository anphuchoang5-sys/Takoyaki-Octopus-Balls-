import { THREE,box,cyl,sphere,tube,group,toon,glow,white,dark,metal,glass,face,label } from '../../../world.js';
import {warm,bounds,tree,planter,bench,sign} from '../shared/building-parts.js';

export function createModel(){
  const root=new THREE.Group(),cafe=true;const wall=toon(cafe?'#dcc9ab':'#c2c3af'),accent=toon(cafe?'#8e6350':'#526e78');
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
