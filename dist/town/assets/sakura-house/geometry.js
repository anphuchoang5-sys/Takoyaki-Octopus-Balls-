import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// All GPU resources belong to one asset. No imports from the town's mutable world.
export function createWorkshop(){
  const root=new THREE.Group();root.name='sakura-house';
  const materials=new Map(),geometries=new Set(),textures=new Set();
  const ink=new THREE.LineBasicMaterial({color:'#41465c',transparent:true,opacity:.58,toneMapped:false});materials.set('ink',ink);
  // Authored cel colors: broad, fixed value steps preserve the animation palette.
  // Geometry is fully volumetric; the preview's lighting cannot wash the blue panes grey.
  function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshBasicMaterial({color,vertexColors:true,toneMapped:false}));return materials.get(color);}
  function mesh(geometry,material,parent=root,edges=false){
    geometries.add(geometry);const m=new THREE.Mesh(geometry,typeof material==='string'?mat(material):material);m.castShadow=true;m.receiveShadow=true;parent.add(m);
    if(edges){const g=new THREE.EdgesGeometry(geometry,36);geometries.add(g);m.add(new THREE.LineSegments(g,ink));}return m;
  }
  function group(name,x=0,y=0,z=0,rotation=0,parent=root){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);return g;}
  function box(w,h,d,x,y,z,c,parent=root,edges=false){const m=mesh(new THREE.BoxGeometry(w,h,d),c,parent,edges);m.position.set(x,y,z);return m;}
  function cylinder(rt,rb,h,x,y,z,c,parent=root,sides=12){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,sides),c,parent);m.position.set(x,y,z);return m;}
  function ellipsoid(rx,ry,rz,x,y,z,c,parent=root){const m=mesh(new THREE.IcosahedronGeometry(1,2),c,parent);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
  function beam(a,b,r,c,parent=root){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);const m=cylinder(r,r,v.length(),0,0,0,c,parent,8);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
  function tube(points,r,c,parent=root){const p=points.map(v=>new THREE.Vector3(...v));const path=new THREE.CurvePath();for(let i=1;i<p.length;i++)path.add(new THREE.LineCurve3(p[i-1],p[i]));return mesh(new THREE.TubeGeometry(path,Math.max(4,p.length*3),r,8,false),c,parent);}
  function solid(points,depth,c,parent=root){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});return mesh(g,c,parent,true);}
  function surface(points,c,parent=root){const p=points.map(v=>new THREE.Vector3(...v));const a=[];for(let i=1;i<p.length-1;i++)for(const v of [p[0],p[i],p[i+1]])a.push(v.x,v.y,v.z);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));g.computeVertexNormals();return mesh(g,c,parent);}
  function plaque(text,w,h,x,y,z,parent=root){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#f1f2df';c.fillRect(0,0,512,256);c.fillStyle='#484852';c.font='600 130px "Yu Gothic",Meiryo,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,132);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);const material=new THREE.MeshBasicMaterial({map,toneMapped:false});materials.set('plaque'+materials.size,material);const m=mesh(new THREE.PlaneGeometry(w,h),material,parent);m.position.set(x,y,z);return m;}
  function finish(){
    root.updateMatrixWorld(true);const components=[];
    for(const child of root.children){const b=new THREE.Box3().setFromObject(child);components.push({name:child.name,min:b.min.toArray(),max:b.max.toArray()});}
    const buckets=new Map(),linePositions=[];
    root.traverse(o=>{if(o.isMesh){const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{material:o.material,items:[]});const g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(o.material.vertexColors){const n=g.attributes.normal,colors=[];for(let i=0;i<n.count;i++){const light=n.getY(i)*.75+n.getZ(i)*.3-n.getX(i)*.22;const value=light>.35?1:light>-.35?.94:.84;colors.push(value,value,value);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}buckets.get(key).items.push(g);}else if(o.isLineSegments){const p=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);linePositions.push(v.x,v.y,v.z);}}});
    root.clear();for(const {material,items} of buckets.values()){const copies=items.map(g=>{const n=g.index?g.toNonIndexed():g.clone();if(!material.map)n.deleteAttribute('uv');g.dispose();return n;});const geometry=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());geometries.add(geometry);const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;root.add(m);}
    if(linePositions.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));geometries.add(g);root.add(new THREE.LineSegments(g,ink));}
    // UVs survive on the separate mapped-material batches used by nameplates.
    root.userData.components=components;
  }
  function dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();for(const t of textures)t.dispose();root.removeFromParent();root.clear();}
  return {THREE,root,mat,mesh,group,box,cylinder,ellipsoid,beam,tube,solid,surface,plaque,finish,dispose,geometries,materials};
}
