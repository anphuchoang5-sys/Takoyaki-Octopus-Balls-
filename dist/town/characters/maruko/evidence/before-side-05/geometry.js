import * as THREE from 'three';

// All geometry, including ink and facial marks, is mesh geometry. No billboards.
// Baked soft cel values use KHR_materials_unlit on export, like the Sakura assets.
export function workshop() {
  const root = new THREE.Group();
  root.name = 'maruko-static-01';
  const geometries = new Set(), materials = new Map();
  let disposed = false;
  function material(color, shaded = true) {
    const key = `${color}/${shaded}`;
    if (!materials.has(key)) {
      const m = new THREE.MeshBasicMaterial({color, vertexColors:shaded, toneMapped:false});
      m.name = `cel-${color.slice(1)}${shaded ? '' : '-ink'}`;
      materials.set(key, m);
    }
    return materials.get(key);
  }
  function add(g, color, name, {outline = 0, shade = true, parent = root} = {}) {
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    if (shade) {
      const n = g.attributes.normal, colors = [];
      for (let i=0;i<n.count;i++) {
        const d = n.getX(i)*-.3 + n.getY(i)*.65 + n.getZ(i)*.52;
        const v = .86 + .14 * THREE.MathUtils.smoothstep(d, -.65, .6);
        colors.push(v,v,v);
      }
      g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    }
    geometries.add(g);
    const m = new THREE.Mesh(g,material(color,shade));
    m.name=name; m.castShadow=true; parent.add(m);
    if (outline) {
      // Reverse real triangle winding: exported GLB retains the silhouette hull.
      const hull=g.clone(),p=hull.attributes.position,n=hull.attributes.normal;
      hull.deleteAttribute('color');
      for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*outline,p.getY(i)+n.getY(i)*outline,p.getZ(i)+n.getZ(i)*outline);
      if(!hull.index)hull.setIndex(Array.from({length:p.count},(_,i)=>i));
      const ix=hull.index.array;
      for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];
      hull.computeVertexNormals();geometries.add(hull);
      const ink = new THREE.Mesh(hull,material('#303039',false));
      ink.name=name+' · silhouette';ink.userData.outline=true;parent.add(ink);
    }
    return m;
  }
  function ellipsoid(name,p,r,color,outline=.0012,parent=root) {
    const g=new THREE.SphereGeometry(1,32,24);
    g.scale(...r);g.translate(...p);
    return add(g,color,name,{outline,parent});
  }
  function tube(name,points,r,color,outline=0,parent=root) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return add(new THREE.TubeGeometry(curve,Math.max(12,points.length*5),r,8,false),color,name,{outline,parent,shade:false});
  }
  function meshData(name,positions,indices,color,options={}) {
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
    return add(g,color,name,options);
  }
  // Closed ring surface with outward winding; rings ordered bottom -> top.
  function rings(name,rows,color,options={}) {
    const count=rows[0].length, p=rows.flat(2),ix=[];
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<count;i++) {
      const k=(i+1)%count,a=j*count+i,b=j*count+k,c=(j+1)*count+i,d=(j+1)*count+k;
      ix.push(a,c,b,b,c,d);
    }
    const bottom=rows[0].reduce((a,b)=>a.map((v,i)=>v+b[i]/count),[0,0,0]);
    const top=rows.at(-1).reduce((a,b)=>a.map((v,i)=>v+b[i]/count),[0,0,0]);
    const bi=p.length/3;p.push(...bottom);const ti=p.length/3;p.push(...top);
    for(let i=0;i<count;i++){const k=(i+1)%count;ix.push(bi,i,k);ix.push(ti,(rows.length-1)*count+k,(rows.length-1)*count+i);}
    // Profiles (and swept sleeve frames) may have opposite ring ordering.
    // A closed mesh must have positive signed volume for front-face culling.
    orientOutward(p,ix);
    return meshData(name,p,ix,color,options);
  }
  function patch(name,points,color,map,outline=.001) {
    // Convex curved patch with a central fan, welded onto the authored face/body.
    const mid=points.reduce((a,b)=>[a[0]+b[0]/points.length,a[1]+b[1]/points.length],[0,0]);
    const p=[...map(...mid)],ix=[],N=points.length,R=8;
    for(let r=1;r<=R;r++)for(const q of points)p.push(...map(mid[0]+(q[0]-mid[0])*r/R,mid[1]+(q[1]-mid[1])*r/R));
    for(let i=0;i<N;i++)ix.push(0,i+1,(i+1)%N+1);
    for(let r=0;r<R-1;r++)for(let i=0;i<N;i++){const k=(i+1)%N,a=1+r*N+i,b=1+r*N+k,c=a+N,d=b+N;ix.push(a,c,b,b,c,d);}
    // Input boundary is counterclockwise viewed from +Z.
    const m=meshData(name,p,ix,color,{shade:false});
    if(outline){const edge=[];for(let i=0;i<N;i++){const a=points[i],b=points[(i+1)%N];for(let j=0;j<5;j++)edge.push(map(a[0]+(b[0]-a[0])*j/5,a[1]+(b[1]-a[1])*j/5));}edge.push(edge[0]);tube(name+' · line',edge,outline,'#383038');}
    return m;
  }
  function ribbon(name,centers,width,color,edgeColor='#b6263f') {
    const p=[],ix=[];
    for(const c of centers)for(const side of [-1,1])p.push(c[0]+side*width/2,c[1],c[2]);
    const back=p.length/3;
    for(const c of centers)for(const side of [-1,1])p.push(c[0]+side*width/2,c[1],c[2]-(c[2]>=0?.002:-.002));
    for(let j=0;j<centers.length-1;j++) {
      const a=j*2,b=a+2;
      // Orient the outside according to the front/back of the blouse.
      if(centers[j][2]>=0)ix.push(a,b+1,b,a,a+1,b+1);else ix.push(a,b,b+1,a,b+1,a+1);
      if(centers[j][2]>=0)ix.push(back+a,back+b,back+b+1,back+a,back+b+1,back+a+1);else ix.push(back+a,back+b+1,back+b,back+a,back+a+1,back+b+1);
      ix.push(a,back+a,back+b,a,back+b,b,a+1,b+1,back+b+1,a+1,back+b+1,back+a+1);
    }
    ix.push(0,1,back+1,0,back+1,back);
    const a=back-2;ix.push(a,back+a+1,a+1,a,back+a,back+a+1);
    const m=meshData(name,p,ix,color);
    for(const side of [-1,1])tube(name+' · seam',centers.map(c=>[c[0]+side*width/2,c[1],c[2]+(c[2]>=0?.0005:-.0005)]),.00065,edgeColor);
    return m;
  }
  return {root,add,ellipsoid,tube,rings,meshData,patch,ribbon,dispose(){
    if(disposed)return;disposed=true;
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();root.clear();
  }};
}

export function orientOutward(p,ix){
  let volume=0;
  for(let i=0;i<ix.length;i+=3){const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3;volume+=p[a]*(p[b+1]*p[c+2]-p[b+2]*p[c+1])+p[a+1]*(p[b+2]*p[c]-p[b]*p[c+2])+p[a+2]*(p[b]*p[c+1]-p[b+1]*p[c]);}
  if(volume<0)for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];
}
