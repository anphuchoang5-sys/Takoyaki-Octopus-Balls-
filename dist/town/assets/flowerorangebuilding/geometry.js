import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Per-instance resources. Nothing here owns a renderer, a clock or town state.
export function createWorkshop() {
  const root = new THREE.Group(), materials = new Map(), geometries = new Set();
  const ink = new THREE.LineBasicMaterial({color:'#514b44', transparent:true, opacity:.32});
  materials.set('ink', ink);
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness:.92, metalness:0}));
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
  function beam(a,b,r,c,p=root,r2=r){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=cylinder(r2,r,v.length(),0,0,0,c,p,10);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
  function line(points,r,c,p=root){const curve=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)));return mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),r,6,false),c,p);}
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
  function clipPolygon(points,axis,limit,greater){
    const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ia=greater?a[axis]>=limit:a[axis]<=limit,ib=greater?b[axis]>=limit:b[axis]<=limit;
      if(ia)out.push(a);if(ia!==ib){const t=(limit-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}
    return out;
  }
  function curvedTile(x,z,w,d,height,color,p){
    const points=[],n=4,at=(i,j,under=false)=>{const u=i/n,v=j,xx=x+.008+u*(w-.016),zz=z+.005+v*(d-.010)+Math.sin(u*Math.PI)*.018*v;return [xx,height(xx,zz)+.021+Math.sin(u*Math.PI)*.021+v*.011-(under?.041:0),zz];};
    const add=(a,b,c)=>points.push(...a,...b,...c);
    for(let i=0;i<n;i++){
      add(at(i,0),at(i,1),at(i+1,1));add(at(i,0),at(i+1,1),at(i+1,0));
      add(at(i,0,true),at(i+1,1,true),at(i,1,true));add(at(i,0,true),at(i+1,0,true),at(i+1,1,true));
      add(at(i,0),at(i+1,0),at(i+1,0,true));add(at(i,0),at(i+1,0,true),at(i,0,true));
      add(at(i,1),at(i,1,true),at(i+1,1,true));add(at(i,1),at(i+1,1,true),at(i+1,1));
    }
    for(const i of [0,n]){const reverse=i===n,a=at(i,0),b=at(i,1),c=at(i,1,true),d0=at(i,0,true);if(reverse){add(a,b,c);add(a,c,d0);}else{add(a,c,b);add(a,d0,c);}}
    const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.computeVertexNormals();mesh(geo,color,p);
  }
  function roofFacet(points,height,{color='#bf502e',tileW=.49,tileD=.34,axis='z'}={},p=root){
    slab(points,height,.11,'#775747',p,true);
    const minX=Math.min(...points.map(v=>v[0])),maxX=Math.max(...points.map(v=>v[0])),minZ=Math.min(...points.map(v=>v[1])),maxZ=Math.max(...points.map(v=>v[1]));
    let count=0;
    for(let x=minX;x<maxX-.001;x+=tileW)for(let z=minZ;z<maxZ-.001;z+=tileD){
      let tile=points.map(v=>[...v]);for(const [a,v,g] of [[0,x+.008,true],[0,x+tileW-.008,false],[1,z+.005,true],[1,z+tileD-.005,false]])tile=clipPolygon(tile,a,v,g);
      tile=tile.filter((a,i)=>!tile.slice(0,i).some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6));
      if(tile.length<3||Math.abs(THREE.ShapeUtils.area(tile.map(v=>new THREE.Vector2(...v))))<.0001)continue;
      const tint=new THREE.Color(color).offsetHSL(0,0,(Math.floor((Math.sin(x*47+z*29)+1)*2.49)-2)*.009).getHexString();
      // Shallow tile bodies have staggered heights, not deep brick-like ribs.
      const full=tile.length===4&&Math.abs(Math.abs(THREE.ShapeUtils.area(tile.map(v=>new THREE.Vector2(...v))))-(tileW-.016)*(tileD-.010))<1e-6;
      if(full&&axis==='z')curvedTile(x,z,tileW,tileD,height,'#'+tint,p);
      else slab(tile,(xx,zz)=>height(xx,zz)+.029+.012*((axis==='z'?(zz-z)/tileD:(xx-x)/tileW)),.033,'#'+tint,p);
      count++;
    }
    p.userData.tiles=(p.userData.tiles||0)+count;
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
  return {THREE,root,materials,geometries,group,mesh,material,box,ball,cylinder,beam,line,solid,slab,roofFacet,batch,dispose};
}
