import { THREE,box,cyl,sphere,tube,group,toon,glow,white,dark,metal,glass,face,label } from '../../../world.js';

export const warm=glow('#f6ce86',1.0);
export function bounds(x,z,w,d,height){return {x,z,w,d,height};}
export function tree(parent,x,z,size=1,tint='#7b9e77'){
  cyl(.12*size,.19*size,1.5*size,x,.8*size,z,toon('#897359'),parent,9);
  for(const [dx,dy,dz,r]of [[0,2.1,0,.85],[-.45,1.8,.1,.6],[.38,1.87,-.12,.65]]){
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r*size,1),toon(tint));crown.position.set(x+dx*size,dy*size,z+dz*size);crown.scale.y=1.15;crown.castShadow=true;parent.add(crown);
  }
}
export function planter(parent,x,z){cyl(.26,.19,.34,x,.34,z,toon('#b68769'),parent,10);for(let i=0;i<6;i++){const a=i*2.4;sphere(.18,x+Math.cos(a)*.14,.67+Math.sin(i)*.08,z+Math.sin(a)*.14,toon('#71917b'),parent).scale.set(.7,1.4,.7);}}
export function bench(parent,x,z,rotation=0){const g=group(x,.17,z,rotation,parent);for(let i=0;i<4;i++)box(1.65,.065,.13,0,.44,-.2+i*.15,toon('#ad8a5e'),g);for(let i=0;i<3;i++)box(1.65,.11,.06,0,.67+i*.13,-.29,toon('#ad8a5e'),g);for(let xx of [-.59,.59]){box(.075,.43,.5,xx,.2,0,dark,g);box(.06,.6,.07,xx,.64,-.31,dark,g);}}
export function window(parent,x,y,z,w,h,side=0){
  const g=group(x,y,z,side,parent);box(w+.14,h+.14,.09,0,0,0,toon('#537a72'),g);
  box(w,h,.018,0,0,.056,warm,g,false);box(w-.11,h-.1,.018,0,0,.069,toon('#506963',.15),g,false);
  for(let dx of [-w/2,w/2,0])box(.04,h,.055,dx,0,.09,white,g,false);box(w,.04,.055,0,0,.09,white,g,false);
  // A lit strip remains visible around drawn curtains at night.
  for(let dx of [-w*.29,w*.29])box(w*.3,h*.89,.016,dx,0,.084,toon('#d1bfa0',.15),g,false);
}
export function sign(parent,text,sub,w,x,y,z,color='#527d70'){
  box(w+.14,.69,.1,x,y,z,toon(color),parent);face(w,.57,x,y,z+.058,label(text,sub,'#efdfb9',color,768,192),parent);
}
