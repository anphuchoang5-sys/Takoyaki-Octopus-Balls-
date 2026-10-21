import * as THREE from '../../../vendor/three.module.js';
const eps=1e-8;
export function triangle(a,b,c){
  const normal=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize();
  const denom=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
  return {a,b,c,normal,denom,minX:Math.min(a.x,b.x,c.x),maxX:Math.max(a.x,b.x,c.x),minZ:Math.min(a.z,b.z,c.z),maxZ:Math.max(a.z,b.z,c.z)};
}
export function weights(t,x,z){
  if(Math.abs(t.denom)<1e-12)return null;
  const u=((t.b.z-t.c.z)*(x-t.c.x)+(t.c.x-t.b.x)*(z-t.c.z))/t.denom;
  const v=((t.c.z-t.a.z)*(x-t.c.x)+(t.a.x-t.c.x)*(z-t.c.z))/t.denom,w=1-u-v;
  return u>=-eps&&v>=-eps&&w>=-eps?[u,v,w]:null;
}
export function indexTriangles(triangles,cell=.15){
  const bins=new Map(),key=(x,z)=>`${x},${z}`;
  for(const t of triangles)for(let x=Math.floor(t.minX/cell);x<=Math.floor(t.maxX/cell);x++)for(let z=Math.floor(t.minZ/cell);z<=Math.floor(t.maxZ/cell);z++){
    const k=key(x,z);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(t);
  }
  return {triangles,candidates(t){
    const found=new Set();
    for(let x=Math.floor(t.minX/cell);x<=Math.floor(t.maxX/cell);x++)for(let z=Math.floor(t.minZ/cell);z<=Math.floor(t.maxZ/cell);z++)
      for(const q of bins.get(key(x,z))||[])if(q!==t&&q.minX<=t.maxX&&q.maxX>=t.minX&&q.minZ<=t.maxZ&&q.maxZ>=t.minZ)found.add(q);
    return [...found];
  },sample(x,z){
    let best=null;
    for(const t of bins.get(key(Math.floor(x/cell),Math.floor(z/cell)))||[]){
      const w=weights(t,x,z);if(!w)continue;
      const y=t.a.y*w[0]+t.b.y*w[1]+t.c.y*w[2];
      if(!best||y>best.y)best={y,normal:t.normal,triangle:t,weights:w};
    }
    return best;
  }};
}
// Render-frame queries keep packed triangles: no million-Vector3 allocation on
// the render thread every time snow grows. The numbers are the WebGL Float32 data.
export function indexPackedTriangles(data,parts,disabled=new Set(),cell=.5,{epsilon=1e-8,minArea=1e-12,minY=-Infinity,upward=false}={}){
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<data.length;i+=9)if(!disabled.has(parts[i/9])){
    minX=Math.min(minX,data[i],data[i+3],data[i+6]);maxX=Math.max(maxX,data[i],data[i+3],data[i+6]);
    minZ=Math.min(minZ,data[i+2],data[i+5],data[i+8]);maxZ=Math.max(maxZ,data[i+2],data[i+5],data[i+8]);
  }
  if(minX===Infinity)return {sample:()=>null};
  const x0=Math.floor(minX/cell),z0=Math.floor(minZ/cell),nx=Math.floor(maxX/cell)-x0+1,nz=Math.floor(maxZ/cell)-z0+1;
  const offsets=new Uint32Array(nx*nz+1);
  function visit(append){
  for(let i=0;i<data.length;i+=9){
    if(disabled.has(parts[i/9]))continue;
    const xa=Math.floor(Math.min(data[i],data[i+3],data[i+6])/cell),xb=Math.floor(Math.max(data[i],data[i+3],data[i+6])/cell);
    const za=Math.floor(Math.min(data[i+2],data[i+5],data[i+8])/cell),zb=Math.floor(Math.max(data[i+2],data[i+5],data[i+8])/cell);
    for(let x=xa;x<=xb;x++)for(let z=za;z<=zb;z++)append((x-x0)*nz+z-z0,i);
  }
  }
  // A packed cell index avoids allocating/retaining arrays and string keys for
  // every snow update. Triangle order within each cell remains exactly the same.
  visit(k=>offsets[k+1]++);for(let i=1;i<offsets.length;i++)offsets[i]+=offsets[i-1];
  const entries=new Uint32Array(offsets.at(-1)),cursor=offsets.slice();
  visit((k,i)=>{entries[cursor[k]++]=i;});
  return {sample(x,z){
    const ix=Math.floor(x/cell)-x0,iz=Math.floor(z/cell)-z0;if(ix<0||ix>=nx||iz<0||iz>=nz)return null;
    const bin=ix*nz+iz;
    let y=-Infinity,best=-1;
    for(let j=offsets[bin];j<offsets[bin+1];j++){
      const i=entries[j];
      const ax=data[i],az=data[i+2],bx=data[i+3],bz=data[i+5],cx=data[i+6],cz=data[i+8];
      const d=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(d)<minArea)continue;
      const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/d,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/d,w=1-u-v;
      if(u< -epsilon||v< -epsilon||w< -epsilon)continue;
      const h=data[i+1]*u+data[i+4]*v+data[i+7]*w;if(h>=minY&&h>y){y=h;best=i;}
    }
    if(best<0)return null;
    const i=best,normal=new THREE.Vector3(data[i+3]-data[i],data[i+4]-data[i+1],data[i+5]-data[i+2])
      .cross(new THREE.Vector3(data[i+6]-data[i],data[i+7]-data[i+1],data[i+8]-data[i+2])).normalize();
    if(upward&&normal.y<0)normal.negate();
    return {y,normal,part:parts[i/9]};
  }};
}
export function readSurface(root,colors=null){
  const triangles=[];root.updateWorldMatrix(true,true);
  root.traverse(n=>{
    if(!n.isMesh||(colors&&!colors.includes(n.material.color?.getHexString())))return;
    const a=n.geometry.attributes.position,idx=n.geometry.index,count=idx?idx.count:a.count;
    for(let i=0;i<count;i+=3){
      const p=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(a,idx?idx.getX(i+k):i+k).applyMatrix4(n.matrixWorld));
      const t=triangle(...p);t.part=n.geometry.attributes.snowPart?.getX(idx?idx.getX(i):i)??0;
      if(t.normal.y>1e-5)triangles.push(t);
    }
  });
  return indexTriangles(triangles);
}

// Clip actual exposed source faces; each base remains on its source plane.
// A projection-only height grid would bridge tile steps and leaf gaps.
export function exposedFacets(surface,options){
  const result=[];
  let activePart=0;
  function append(a,b,c){
    if(new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).lengthSq()>1e-18){const f=[a,b,c];f.part=activePart;result.push(f);}
  }
  function partition(poly,fn){
    const inside=[],outside=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=fn(a),db=fn(b);
      (da>=0?inside:outside).push(a);
      if((da>=0)!==(db>=0)){const p=a.clone().lerp(b,da/(da-db));inside.push(p);outside.push(p);}
    }
    return {inside,outside};
  }
  // Exact projected polygon subtraction, instead of throwing away grid cells
  // near an occluder. This retains narrow exposed tile channels and real holes.
  const receivers=[];
  function localize(t){
    const v=[t.a,t.b,t.c],lengths=v.map((p,i)=>p.distanceToSquared(v[(i+1)%3])),edge=lengths.indexOf(Math.max(...lengths));
    if(lengths[edge]<=1.5**2){receivers.push(t);return;}
    const a=v[edge],b=v[(edge+1)%3],c=v[(edge+2)%3],m=a.clone().lerp(b,.5);
    for(const f of [[a,m,c],[m,b,c]]){const q=triangle(...f);q.part=t.part;localize(q);}
  }
  for(const t of surface.triangles)if(t.part>=0)localize(t);
  for(const t of receivers)if(t.part>=0&&t.normal.y>=(options.parts?.[t.part]?.minNormal??options.minNormal)){
    activePart=t.part;
    let polygons=[[t.a,t.b,t.c]];
    for(const q of surface.candidates(t)){
      const bary=p=>{
        const u=((q.b.z-q.c.z)*(p.x-q.c.x)+(q.c.x-q.b.x)*(p.z-q.c.z))/q.denom;
        const v=((q.c.z-q.a.z)*(p.x-q.c.x)+(q.a.x-q.c.x)*(p.z-q.c.z))/q.denom;
        return [u,v,1-u-v];
      };
      const above=p=>{const w=bary(p);return q.a.y*w[0]+q.b.y*w[1]+q.c.y*w[2]-p.y-.000002;};
      if([t.a,t.b,t.c].every(p=>above(p)<=0))continue;
      const cuts=[p=>bary(p)[0],p=>bary(p)[1],p=>bary(p)[2],above],remaining=[];
      for(const poly of polygons){
        let inside=poly;const outside=[];
        for(const cut of cuts){
          const parts=partition(inside,cut);
          if(parts.outside.length>=3)outside.push(parts.outside);
          inside=parts.inside;if(inside.length<3)break;
        }
        if(inside.length<3)remaining.push(poly);else remaining.push(...outside);
      }
      polygons=remaining;if(!polygons.length)break;
    }
    for(const poly of polygons)for(let i=1;i<poly.length-1;i++)append(poly[0],poly[i],poly[i+1]);
  }
  return result;
}

// Make neighbouring top faces agree at T junctions introduced by clipping and
// subdivision. Their bases still use their own actual source planes at steps.
export function conformFacets(facets,cell){
  const bins=new Map(),unique=new Map(),key=(x,z)=>`${x},${z}`;
  for(const face of facets)for(const p of face){
    const k=`${p.x.toFixed(7)},${p.y.toFixed(7)},${p.z.toFixed(7)}`;
    if(unique.has(k))continue;unique.set(k,p);
    const bin=key(Math.floor(p.x/cell),Math.floor(p.z/cell));
    if(!bins.has(bin))bins.set(bin,[]);bins.get(bin).push(p);
  }
  const result=[];
  for(const face of facets){
    const boundary=[];let changed=false;
    for(let i=0;i<3;i++){
      const a=face[i],b=face[(i+1)%3],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,cuts=[];
      boundary.push(a);if(l2<1e-15)continue;
      for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)
        for(let z=Math.floor(Math.min(a.z,b.z)/cell);z<=Math.floor(Math.max(a.z,b.z)/cell);z++)
          for(const p of bins.get(key(x,z))||[]){
            const t=((p.x-a.x)*dx+(p.z-a.z)*dz)/l2;
            if(t<1e-6||t>1-1e-6)continue;
            // A projected crossing at another height is not a T junction.
            if(Math.abs(p.y-(a.y+(b.y-a.y)*t))>1e-6)continue;
            const cross=(p.x-a.x)*dz-(p.z-a.z)*dx;
            if(cross*cross/l2<1e-15)cuts.push(t);
          }
      cuts.sort((a,b)=>a-b);
      let prev=-1;
      for(const t of cuts)if(t-prev>1e-6){boundary.push(a.clone().lerp(b,t));prev=t;changed=true;}
    }
    if(!changed){result.push(face);continue;}
    const center=face.reduce((p,q)=>p.add(q),new THREE.Vector3()).multiplyScalar(1/3);
    for(let i=0;i<boundary.length;i++){const f=[center,boundary[i],boundary[(i+1)%boundary.length]];f.part=face.part;result.push(f);}
  }
  return result;
}

export function subdivideFacets(facets,step){
  const result=[];
  function split(f,depth=0){
    const lengths=f.map((p,i)=>p.distanceToSquared(f[(i+1)%3])),i=lengths.indexOf(Math.max(...lengths));
    // Clipping leaves long, extremely thin slivers along tiles and leaves.
    // Preserve those exact boundaries; subdividing by length alone multiplies
    // them without adding visible snow detail.
    const area=new THREE.Vector3().subVectors(f[1],f[0]).cross(new THREE.Vector3().subVectors(f[2],f[0])).length()/2;
    if(lengths[i]<=step*step||area<=step*step*.25||depth>=18){result.push(f);return;}
    const a=f[i],b=f[(i+1)%3],c=f[(i+2)%3],mid=a.clone().lerp(b,.5);
    for(const next of [[a,mid,c],[mid,b,c]]){next.part=f.part;split(next,depth+1);}
  }
  facets.forEach(f=>split(f));return result;
}
