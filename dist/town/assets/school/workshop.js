import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Private workshop for the 28x28 school study. No renderer, clock or town state.
export function createWorkshop(){
  const root=new THREE.Group();root.name='school';
  const materials=new Map(),geometries=new Set(),textures=new Map();
  const ink=new THREE.LineBasicMaterial({color:'#5b554b',transparent:true,opacity:.30,toneMapped:false});
  materials.set('ink',ink);

  function material(color){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0}));
    return materials.get(color);
  }
  function mesh(geometry,color,parent=root,outline=false){
    geometries.add(geometry);
    const m=new THREE.Mesh(geometry,typeof color==='string'?material(color):color);
    m.castShadow=!m.material.transparent;m.receiveShadow=true;parent.add(m);
    if(outline){
      const e=new THREE.EdgesGeometry(geometry,32);geometries.add(e);
      m.add(new THREE.LineSegments(e,ink));
    }
    return m;
  }
  function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
  function box(w,h,d,x,y,z,color,parent=root,outline=false){const m=mesh(new THREE.BoxGeometry(w,h,d),color,parent,outline);m.position.set(x,y,z);return m;}
  function ball(rx,ry,rz,x,y,z,color,parent=root,segments=10){const m=mesh(new THREE.SphereGeometry(1,segments,7),color,parent);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
  function cylinder(rt,rb,h,x,y,z,color,parent=root,sides=12){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,sides),color,parent);m.position.set(x,y,z);return m;}
  function beam(a,b,r,color,parent=root){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=cylinder(r,r,v.length(),0,0,0,color,parent,8);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
  function plane(w,h,x,y,z,color,parent=root,rotationY=0){const m=mesh(new THREE.PlaneGeometry(w,h),color,parent);m.position.set(x,y,z);m.rotation.y=rotationY;return m;}
  function solid(points,depth,color,parent=root,outline=false){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false}),color,parent,outline);}
  function texture(name,w,h,paint){
    if(textures.has(name))return textures.get(name);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    paint(canvas.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    textures.set(name,t);return t;
  }
  function face(w,h,x,y,z,map,parent=root,rotation=0){
    const key='map-'+map.uuid;
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({map,roughness:.9,metalness:0,side:THREE.DoubleSide}));
    const m=mesh(new THREE.PlaneGeometry(w,h),materials.get(key),parent);m.position.set(x,y,z);m.rotation.y=rotation;return m;
  }

  function batch(g){
    g.updateWorldMatrix(true,true);
    const inv=g.matrixWorld.clone().invert(),buckets=new Map(),lines=[],transparent=[];
    g.traverse(o=>{
      if(o===g)return;
      const tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);
      if(o.isMesh){
        const geo=o.geometry.clone().applyMatrix4(tr);
        if(o.material.transparent){
          geometries.add(geo);
          const m=new THREE.Mesh(geo,o.material);m.name=o.name;m.renderOrder=2;m.castShadow=false;m.receiveShadow=false;transparent.push(m);
        }else{
          const k=o.material.uuid;
          if(!buckets.has(k))buckets.set(k,{material:o.material,items:[]});
          buckets.get(k).items.push(geo);
        }
      }else if(o.isLineSegments){
        const a=o.geometry.attributes.position,v=new THREE.Vector3();
        for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(tr);lines.push(v.x,v.y,v.z);}
      }
    });
    g.clear();
    for(const {material,items} of buckets.values()){
      const copies=items.map(geo=>{const n=geo.index?geo.toNonIndexed():geo.clone();if(!material.map)n.deleteAttribute('uv');geo.dispose();return n;});
      const merged=mergeGeometries(copies,false);copies.forEach(c=>c.dispose());geometries.add(merged);
      const m=new THREE.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;g.add(m);
    }
    if(lines.length){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
      geometries.add(geo);g.add(new THREE.LineSegments(geo,ink));
    }
    if(transparent.length)g.add(...transparent);
  }

  let disposed=false;
  function dispose(){
    if(disposed)return;disposed=true;
    for(const g of geometries)g.dispose();
    for(const m of materials.values())m.dispose();
    for(const t of textures.values())t.dispose();
    root.removeFromParent();root.clear();
  }
  return {THREE,root,group,mesh,material,box,ball,cylinder,beam,plane,solid,texture,face,batch,dispose};
}
