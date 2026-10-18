import { THREE,box,cyl,tube,toon,glow,metal,face,label,batchStatic } from '../world.js';
import {createBuilding,TILE_SIZE} from './buildings.js';

// A placement refers to a catalog asset and a grid slot. Weather never lives here.
export const PLACEMENTS=[
  {id:'north-west-home',type:'home',grid:[-1,-1],turn:0,variant:0},
  {id:'north-books',type:'bookshop',grid:[0,-1],turn:0},
  {id:'north-east-home',type:'home',grid:[1,-1],turn:3,variant:1},
  {id:'west-cafe',type:'cafe',grid:[-1,0],turn:1},
  {id:'ame-mart',type:'convenience',grid:[0,0],turn:0},
  {id:'east-home',type:'home',grid:[1,0],turn:3,variant:0},
  {id:'south-west-garden',type:'garden',grid:[-1,1],turn:0},
  {id:'south-garden',type:'garden',grid:[0,1],turn:2},
  {id:'south-east-cafe',type:'cafe',grid:[1,1],turn:2}
];
const asphalt=new THREE.MeshStandardMaterial({color:'#788b8c',roughness:.9,metalness:.1});
const paint=toon('#e2dfc4'),paver=toon('#b2b8a5');
function transformedRect(r,placement){
  const angle=placement.turn*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
  return {...r,x:placement.grid[0]*TILE_SIZE+r.x*c+r.z*s,z:placement.grid[1]*TILE_SIZE-r.x*s+r.z*c,w:Math.abs(r.w*c)+Math.abs(r.d*s),d:Math.abs(r.w*s)+Math.abs(r.d*c),height:r.height,ridgeAxis:r.ridgeAxis?(placement.turn%2?'x':'z'):undefined};
}
function toBox(r){return new THREE.Box3(new THREE.Vector3(r.x-r.w/2,.05,r.z-r.d/2),new THREE.Vector3(r.x+r.w/2,r.height,r.z+r.d/2));}
export function createMap(){
  const root=new THREE.Group(),ground=new THREE.Group();root.add(ground);
  const buildings=[],colliders=[],occluders=[],roofs=[],lamps=[],floors=[];
  const occupied=new Set();
  box(42.35,.36,42.35,0,-.19,0,toon('#6a817a'),ground);
  for(const p of PLACEMENTS){
    const slot=p.grid.join(',');if(occupied.has(slot))throw new Error('Duplicate map slot '+slot);occupied.add(slot);
    const x=p.grid[0]*TILE_SIZE,z=p.grid[1]*TILE_SIZE;
    box(14,.04,14,x,.015,z,asphalt,ground,false);box(11.25,.16,11.25,x,.115,z,paver,ground);
    // Paving joints stop at the standard curb, leaving both half-roads to meet.
    for(let i=0;i<19;i++){
      const d=-5.4+i*.6;box(.013,.005,11,x+d,.2,z,toon('#9da996'),ground,false);box(11,.005,.013,x,.201,z+d,toon('#9da996'),ground,false);
    }
    for(let i=0;i<19;i++)for(let side of [-1,1]){
      box(.57,.18,.16,x-5.4+i*.6,.11,z+side*5.65,toon('#c3c7b3'),ground);
      box(.16,.18,.57,x+side*5.65,.11,z-5.4+i*.6,toon('#c3c7b3'),ground);
    }
    for(let side of [-1,1]){box(11.35,.01,.08,x,.04,z+side*5.82,toon('#465e5c'),ground,false);box(.08,.01,11.35,x+side*5.82,.04,z,toon('#465e5c'),ground,false);}
    const asset=createBuilding(p.type,p.variant||0);asset.root.position.set(x,0,z);asset.root.rotation.y=p.turn*Math.PI/2;root.add(asset.root);asset.id=p.id;buildings.push(asset);
    for(const r of asset.colliders)colliders.push(toBox(transformedRect(r,p)));
    for(const r of asset.occluders)occluders.push(toBox(transformedRect(r,p)));
    for(const r of asset.roofs)roofs.push(transformedRect(r,p));
    for(const r of asset.floors)floors.push(transformedRect(r,p));
    for(const l of asset.lamps){const v=new THREE.Vector3(l.x,l.y,l.z).applyAxisAngle(new THREE.Vector3(0,1,0),p.turn*Math.PI/2).add(new THREE.Vector3(x,0,z));lamps.push({position:v,strength:10,color:'#ffd49a'});}
    const lx=x+5.06,lz=z+5.05;
    cyl(.04,.075,3.5,lx,1.94,lz,toon('#5b7772'),ground,9);
    tube([[lx,3.68,lz],[lx,3.88,lz],[lx-.44,3.88,lz],[lx-.55,3.7,lz]],.032,metal,ground,true);
    box(.46,.08,.24,lx-.51,3.66,lz,toon('#45635e'),ground);box(.38,.02,.19,lx-.51,3.61,lz,glow('#ffe0a4',1.3),ground,false);
    lamps.push({position:new THREE.Vector3(lx-.51,3.5,lz),strength:12,color:'#ffce8c'});
    colliders.push(toBox({x:lx,z:lz,w:.22,d:.22,height:4}));
    face(.68,.23,lx,2.43,lz+.09,label('雨待町 '+(p.grid[0]+2)+'丁目','','#527d70','#efe3bd'),ground);
  }
  // Mark the shared intersections, rather than duplicating a crossing per building.
  for(let x of [-7,7])for(let z of [-7,7]){
    for(let i=0;i<5;i++){
      box(.31,.008,2.05,x-1+i*.5,.047,z-2.95,paint,ground,false);
      box(2.05,.008,.31,x+2.95,.047,z-1+i*.5,paint,ground,false);
    }
  }
  for(let axis of [-7,7])for(let i=-19;i<=19;i+=3){box(.04,.008,1.2,axis,.047,i,paint,ground,false);box(1.2,.008,.04,i,.047,axis,paint,ground,false);}
  batchStatic(ground);
  root.updateMatrixWorld(true);
  function blocked(x,z,radius){
    if(Math.abs(x)>20.6-radius||Math.abs(z)>20.6-radius)return true;
    return colliders.some(b=>{const xx=THREE.MathUtils.clamp(x,b.min.x,b.max.x),zz=THREE.MathUtils.clamp(z,b.min.z,b.max.z);return (x-xx)**2+(z-zz)**2<radius**2;});
  }
  function heightAt(x,z){
    for(const r of floors)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)return r.height;
    const lx=x-Math.round(x/TILE_SIZE)*TILE_SIZE,lz=z-Math.round(z/TILE_SIZE)*TILE_SIZE;
    return Math.abs(lx)<5.76&&Math.abs(lz)<5.76?.205:.05;
  }
  function move(position,dx,dz,radius){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
    for(let i=0;i<steps;i++){if(!blocked(position.x+dx/steps,position.z,radius))position.x+=dx/steps;if(!blocked(position.x,position.z+dz/steps,radius))position.z+=dz/steps;}
    position.y=heightAt(position.x,position.z);
  }
  return {root,buildings,colliders,occluders,roofs,lamps,asphalt,heightAt,blocked,move,update(dt,player){for(const b of buildings)b.update(dt,player);},get placements(){return PLACEMENTS.map(p=>({...p,grid:[...p.grid]}));}};
}
