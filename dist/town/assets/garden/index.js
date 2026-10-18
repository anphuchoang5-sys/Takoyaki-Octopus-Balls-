import { THREE,box,cyl,sphere,tube,group,toon,glow,white,dark,metal,glass,face,label } from '../../../world.js';
import {bounds,tree,bench} from '../shared/building-parts.js';

export function createModel(){
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
