import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Per-instance resources for this building only. No renderer, clock or town state.
export function createWorkshop() {
  const root = new THREE.Group(), materials = new Map(), geometries = new Set();
  const ink = new THREE.LineBasicMaterial({color:'#4a4038', transparent:true, opacity:.28});
  materials.set('ink', ink);
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness:.9, metalness:0}));
    return materials.get(color);
  }
  function group(name, parent=root) { const g=new THREE.Group();g.name=name;parent.add(g);return g; }
  function mesh(geo, color, parent=root, outline=false) {
    geometries.add(geo);
    const m=new THREE.Mesh(geo, typeof color==='string'?material(color):color);
    m.castShadow=m.receiveShadow=true;parent.add(m);
    if(outline){const e=new THREE.EdgesGeometry(geo,32);geometries.add(e);m.add(new THREE.LineSegments(e,ink));}
    return m;
  }
  function box(w,h,d,x,y,z,c,p=root,outline=false){const m=mesh(new THREE.BoxGeometry(w,h,d),c,p,outline);m.position.set(x,y,z);return m;}
  function ball(rx,ry,rz,x,y,z,c,p=root,segments=12){const m=mesh(new THREE.SphereGeometry(1,segments,8),c,p);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
  function cylinder(rt,rb,h,x,y,z,c,p=root,sides=12){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,sides),c,p);m.position.set(x,y,z);return m;}
  function beam(a,b,r,c,p=root,r2=r){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=cylinder(r2,r,v.length(),0,0,0,c,p,8);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
  function line(points,r,c,p=root){const curve=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)));return mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),r,5,false),c,p);}
  function solid(points,depth,c,p=root){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false}),c,p);}
  function slab(points,height,thickness,c,p=root,outline=false){
    const ring=points.map(([x,z])=>new THREE.Vector2(x,z)),faces=THREE.ShapeUtils.triangulateShape(ring,[]),vertices=[];
    const top=i=>[points[i][0],height(points[i][0],points[i][1]),points[i][1]],bottom=i=>{const v=top(i);v[1]-=thickness;return v;};
    const add=(a,b,c)=>{const ab=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),ac=new THREE.Vector3(...c).sub(new THREE.Vector3(...a));if(ab.cross(ac).lengthSq()>1e-14)vertices.push(...a,...b,...c);};
    for(const f of faces){let [a,b,c]=f;const va=new THREE.Vector3(...top(a)),vb=new THREE.Vector3(...top(b)),vc=new THREE.Vector3(...top(c));if(vb.sub(va).cross(vc.sub(va)).y<0)[b,c]=[c,b];add(top(a),top(b),top(c));add(bottom(c),bottom(b),bottom(a));}
    const ccw=THREE.ShapeUtils.area(ring)>0;
    for(let a=0;a<points.length;a++){const b=(a+1)%points.length;if(ccw){add(top(a),bottom(b),bottom(a));add(top(a),top(b),bottom(b));}else{add(top(b),bottom(a),bottom(b));add(top(b),top(a),bottom(a));}}
    const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return mesh(g,c,p,outline);
  }
  function batch(g){
    g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),buckets=new Map(),lines=[];
    g.traverse(o=>{if(o===g)return;const transform=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);
      if(o.isMesh){const k=o.material.uuid;if(!buckets.has(k))buckets.set(k,{material:o.material,geos:[]});const geo=o.geometry.clone().applyMatrix4(transform);buckets.get(k).geos.push(geo);}
      else if(o.isLineSegments){const a=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(transform);lines.push(v.x,v.y,v.z);}}
    });
    g.clear();for(const {material,geos} of buckets.values()){const copies=geos.map(geo=>{const n=geo.index?geo.toNonIndexed():geo.clone();n.deleteAttribute('uv');return n;});const merged=mergeGeometries(copies,false);copies.forEach(o=>o.dispose());geos.forEach(o=>o.dispose());mesh(merged,material,g);}
    if(lines.length){const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));geometries.add(geo);g.add(new THREE.LineSegments(geo,ink));}
  }
  let disposed=false;
  function dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();root.clear();}
  return {THREE,root,materials,geometries,group,mesh,material,box,ball,cylinder,beam,line,solid,slab,batch,dispose};
}
