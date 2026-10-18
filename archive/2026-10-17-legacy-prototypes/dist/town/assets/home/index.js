import { THREE,box,cyl,sphere,tube,group,toon,glow,white,dark,metal,glass,face,label } from '../../../world.js';
import {warm,bounds,tree,planter,window} from '../shared/building-parts.js';

export function createModel(variant=0){
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
