import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function workshop(){
 const root=new THREE.Group(),geometrySet=new Set(),materialSet=new Set(),cache=new Map();
 root.name='sakura-interior-01-layout';
 const ink=new THREE.LineBasicMaterial({color:'#554b45',transparent:true,opacity:.42,toneMapped:false});materialSet.add(ink);
 function material(color){if(!cache.has(color)){const m=new THREE.MeshBasicMaterial({color,vertexColors:true,toneMapped:false});cache.set(color,m);materialSet.add(m);}return cache.get(color);}
 function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
 function mesh(geo,c,parent,edge=true){geometrySet.add(geo);const m=new THREE.Mesh(geo,material(c));parent.add(m);m.castShadow=m.receiveShadow=true;if(edge){const eg=new THREE.EdgesGeometry(geo,35);geometrySet.add(eg);m.add(new THREE.LineSegments(eg,ink));}return m;}
 function box(w,h,d,x,y,z,c,parent,edge=true){const m=mesh(new THREE.BoxGeometry(w,h,d),c,parent,edge);m.position.set(x,y,z);return m;}
 function cyl(rt,rb,h,x,y,z,c,parent,sides=20){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,sides),c,parent,false);m.position.set(x,y,z);return m;}
 function ellipsoid(rx,ry,rz,x,y,z,c,parent){const m=mesh(new THREE.SphereGeometry(1,20,12),c,parent,false);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
 function tube(points,r,c,parent){const p=points.map(v=>new THREE.Vector3(...v)),curve=new THREE.CatmullRomCurve3(p);return mesh(new THREE.TubeGeometry(curve,16,r,8,false),c,parent,false);}
 // Batch only within one semantic object, so walls, doors and ceilings remain independently editable.
 function batch(g){root.updateMatrixWorld(true);const inv=g.matrixWorld.clone().invert(),buckets=new Map(),lines=[];
  g.traverse(o=>{if(o===g)return;const tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);
   if(o.isMesh){const a=o.geometry.clone().applyMatrix4(tr),n=a.attributes.normal,colors=[];for(let i=0;i<n.count;i++){const dot=n.getY(i)*.76+n.getZ(i)*.2-n.getX(i)*.29;const v=dot>.4?1:dot>-.3?.94:.83;colors.push(v,v,v);}a.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));a.deleteAttribute('uv');const k=o.material.uuid;if(!buckets.has(k))buckets.set(k,{m:o.material,gs:[]});buckets.get(k).gs.push(a);}
   else if(o.isLineSegments){const a=o.geometry.attributes.position,p=new THREE.Vector3();for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(tr);lines.push(p.x,p.y,p.z);}}
  });g.clear();for(const {m,gs} of buckets.values()){const copies=gs.map(a=>a.index?a.toNonIndexed():a.clone()),geo=mergeGeometries(copies,false);copies.forEach(a=>a.dispose());gs.forEach(a=>a.dispose());geometrySet.add(geo);const m1=new THREE.Mesh(geo,m);m1.castShadow=m1.receiveShadow=true;g.add(m1);}
  if(lines.length){const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));geometrySet.add(geo);g.add(new THREE.LineSegments(geo,ink));}
 }
 let disposed=false;function dispose(){if(disposed)return;disposed=true;geometrySet.forEach(g=>g.dispose());materialSet.forEach(m=>m.dispose());root.removeFromParent();root.clear();}
 return {THREE,root,group,mesh,box,cyl,ellipsoid,tube,batch,dispose,geometrySet,materialSet};
}
