import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeSistersArt} from './sisters-art.js';

export function sistersKit(){
 const root=new THREE.Group();root.name='姐妹房精修';
 const resources=new Set(),materials=new Map(),art=makeSistersArt(THREE,resources);
 const ink=new THREE.LineBasicMaterial({color:'#68515a',transparent:true,opacity:.36,toneMapped:false});resources.add(ink);
 const entries=[];
 function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
 function material(color,map=null,transparent=false){
  const key=color+'|'+map+'|'+transparent;
  if(!materials.has(key)){const m=new THREE.MeshBasicMaterial({color,vertexColors:true,map:map?art(map):null,side:THREE.DoubleSide,toneMapped:false,transparent,opacity:transparent?.18:1,depthWrite:!transparent});resources.add(m);materials.set(key,m);}
  return materials.get(key);
 }
 function mesh(geometry,c,g,edge=false,map=null){
  resources.add(geometry);const m=new THREE.Mesh(geometry,material(c,map));g.add(m);
  if(edge){const e=new THREE.EdgesGeometry(geometry,32);resources.add(e);m.add(new THREE.LineSegments(e,ink));}
  return m;
 }
 function box(g,w,h,d,x,y,z,c,edge=true,map=null){const m=mesh(new THREE.BoxGeometry(w,h,d),c,g,edge,map);m.position.set(x,y,z);return m;}
 function rounded(g,w,h,d,r,x,y,z,c,rx=0,map=null){
  const s=new THREE.Shape(),a=-w/2,b=-h/2;
  s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
  const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:6});geo.translate(0,0,-d/2);
  const m=mesh(geo,c,g,false,map);m.position.set(x,y,z);m.rotation.x=rx;return m;
 }
 function ell(g,rx,ry,rz,x,y,z,c){const m=mesh(new THREE.SphereGeometry(1,18,12),c,g);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
 function cyl(g,rt,rb,h,x,y,z,c,open=false,map=null){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,24,1,open),c,g,false,map);m.position.set(x,y,z);return m;}
 function tube(g,points,r,c){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],p[2]||0))),Math.max(10,points.length*6),r,8,false),c,g);}
 function ring(g,r,t,x,y,z,c,rx=0){const m=mesh(new THREE.TorusGeometry(r,t,8,48),c,g);m.position.set(x,y,z);m.rotation.x=rx;return m;}
 function plane(g,w,h,x,y,z,c,map,rx=0,ry=0){const m=mesh(new THREE.PlaneGeometry(w,h),c,g,false,map);m.position.set(x,y,z);m.rotation.set(rx,ry,0);return m;}
 function polygon(g,pts,depth,x,y,z,c){const shape=new THREE.Shape();shape.moveTo(...pts[0]);for(const p of pts.slice(1))shape.lineTo(...p);shape.closePath();const m=mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),c,g,true);m.position.set(x,y,z);return m;}
 function part(id,name,anchor,build,parent=root){const g=group(id+' '+name,parent);g.userData={checklist:id,room:'sisters'};if(anchor){g.position.set(...anchor.slice(0,3));g.rotation.y=anchor[3]||0;}build(g);entries.push({id,name,group:g});return g;}
 function finish(){
  root.updateMatrixWorld(true);
  for(const {group:g} of entries){
   const inv=g.matrixWorld.clone().invert(),buckets=new Map(),lines=[];
   g.traverse(o=>{if(o.isMesh){
    const transform=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),geo=o.geometry.clone().applyMatrix4(transform),norm=geo.attributes.normal,colors=[];
    for(let i=0;i<norm.count;i++){const n=new THREE.Vector3().fromBufferAttribute(norm,i).transformDirection(g.matrixWorld),v=THREE.MathUtils.clamp(.88+n.y*.1+n.z*.045-n.x*.06,.73,1);colors.push(v,v,v);}
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(norm.count*2),2));
    const side=g.userData.checklist==='房02'?(o.position.z<3.8?'north':o.position.z>7.1?'south':o.position.x<4.7?'west':'east'):null;
    const k=o.material.uuid+(side||'');if(!buckets.has(k))buckets.set(k,{mat:o.material,gs:[],side});buckets.get(k).gs.push(geo);
   }else if(o.isLineSegments){const p=o.geometry.attributes.position,tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(tr);lines.push(v.x,v.y,v.z);}}});
   g.clear();for(const {mat,gs,side} of buckets.values()){const flat=gs.map(a=>a.index?a.toNonIndexed():a.clone()),geo=mergeGeometries(flat,false);gs.forEach(a=>a.dispose());flat.forEach(a=>a.dispose());resources.add(geo);const m=new THREE.Mesh(geo,mat);if(side)m.userData.wallside=side;g.add(m);}
   if(lines.length){const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));resources.add(geo);g.add(new THREE.LineSegments(geo,ink));}
  }
 }
 let disposed=false;
 return {THREE,root,resources,entries,group,mesh,material,box,rounded,ell,cyl,tube,ring,plane,polygon,part,finish,dispose(){if(disposed)return;disposed=true;for(const r of resources)r.dispose();root.removeFromParent();root.clear();}};
}
