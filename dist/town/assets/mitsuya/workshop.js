import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Resource ownership is local to this building; no world singleton or weather clock.
export function workshop(){
 const root=new THREE.Group(),materials=new Map(),geometries=new Set(),textures=new Map();
 const bands=new THREE.DataTexture(new Uint8Array([105,165,215,255]),4,1,THREE.RedFormat);bands.minFilter=bands.magFilter=THREE.NearestFilter;bands.needsUpdate=true;textures.set('toon-bands',bands);
 const ink=new THREE.LineBasicMaterial({color:'#514b46',transparent:true,opacity:.29});materials.set('ink',ink);
 function mat(color){if(!materials.has(color)){const m=new THREE.MeshToonMaterial({color,gradientMap:bands,emissive:color,emissiveIntensity:.10});m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <gradientmap_pars_fragment>',THREE.ShaderChunk.gradientmap_pars_fragment.replace('dotNL * 0.5 + 0.5','max( dotNL, 0.0 )'));};materials.set(color,m);}return materials.get(color);}
 const glass=new THREE.MeshBasicMaterial({color:'#82b9c8',transparent:true,opacity:.12,depthWrite:false,side:THREE.FrontSide,toneMapped:false});materials.set('glass',glass);
 const glow=new THREE.MeshBasicMaterial({color:'#ffe4a7',toneMapped:false});materials.set('glow',glow);
 function group(name,x=0,y=0,z=0,parent=root){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
 function mesh(geo,color,parent=root,edges=false){geometries.add(geo);const material=typeof color==='string'?mat(color):color;const m=new THREE.Mesh(geo,material);m.castShadow=!material.transparent;m.receiveShadow=true;parent.add(m);if(edges){const eg=new THREE.EdgesGeometry(geo,28);geometries.add(eg);m.add(new THREE.LineSegments(eg,ink));}return m;}
 function box(w,h,d,x,y,z,c,p=root,e=true){const m=mesh(new THREE.BoxGeometry(w,h,d),c,p,e);m.position.set(x,y,z);return m;}
 function cyl(rt,rb,h,x,y,z,c,p=root,n=20){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,n),c,p);m.position.set(x,y,z);return m;}
 function ball(rx,ry,rz,x,y,z,c,p=root){const m=mesh(new THREE.SphereGeometry(1,12,8),c,p);m.scale.set(rx,ry,rz);m.position.set(x,y,z);return m;}
 function beam(a,b,r,c,p=root){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=cyl(r,r,v.length(),(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,c,p,8);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
 function ring(r,t,x,y,z,c,p=root){const m=mesh(new THREE.TorusGeometry(r,t,6,32),c,p);m.rotation.x=Math.PI/2;m.position.set(x,y,z);return m;}
 function tube(points,r,c,p=root){const curve=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)));return mesh(new THREE.TubeGeometry(curve,18,r,6,false),c,p);}
 function solid(points,depth,c,p=root){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false}),c,p,true);}
 function texture(name,width,height,paint){if(textures.has(name))return textures.get(name);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;paint(canvas.getContext('2d'),width,height);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.set(name,t);return t;}
 function face(w,h,x,y,z,map,p=root,rotation=0){const key='map-'+map.uuid;if(!materials.has(key))materials.set(key,new THREE.MeshToonMaterial({map,gradientMap:bands,color:'#ffffff',emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.2,side:THREE.DoubleSide}));const m=mesh(new THREE.PlaneGeometry(w,h),materials.get(key),p);m.position.set(x,y,z);m.rotation.y=rotation;return m;}
 function label(name,text,bg='#f6edcf',fg='#534b3b',width=512,height=256){return texture(name,width,height,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font=`600 ${h*.53}px "Yu Mincho", "Yu Gothic", serif`;c.fillText(text,w/2,h*.53,w*.9);});}
 // Batch opaque geometry per movable semantic group; keep each glass volume sorted separately.
 function batch(g){g.updateWorldMatrix(true,true);const inv=g.matrixWorld.clone().invert(),buckets=new Map(),lines=[],transparent=[];
  g.traverse(o=>{if(o===g)return;const tr=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);if(o.isMesh){const geo=o.geometry.clone().applyMatrix4(tr);if(o.material.transparent){geometries.add(geo);const m=new THREE.Mesh(geo,o.material);m.name=o.name;m.renderOrder=2;transparent.push(m);return;}const k=o.material.uuid;if(!buckets.has(k))buckets.set(k,{m:o.material,gs:[]});buckets.get(k).gs.push(geo);}else if(o.isLineSegments){const a=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(tr);lines.push(v.x,v.y,v.z);}}});
  g.clear();for(const {m,gs} of buckets.values()){const copies=gs.map(x=>{const y=x.index?x.toNonIndexed():x.clone();if(!m.map)y.deleteAttribute('uv');return y;}),geo=mergeGeometries(copies,false);copies.forEach(x=>x.dispose());gs.forEach(x=>x.dispose());geometries.add(geo);const mesh=new THREE.Mesh(geo,m);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);}if(lines.length){const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));geometries.add(geo);g.add(new THREE.LineSegments(geo,ink));}if(transparent.length)g.add(...transparent);
 }
 let disposed=false;function dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();root.clear();}
 return {THREE,root,group,mat,mesh,box,cyl,ball,beam,ring,tube,solid,texture,face,label,glass,glow,batch,dispose,textures};
}
