import * as THREE from '../../../vendor/three.module.js';
import {readSurface,exposedFacets,conformFacets,subdivideFacets,triangle,weights} from './snow-surfaces.js';

const clamp=THREE.MathUtils.clamp;
// Float bits for regular roofs/roads share many low bits. Mix the high bits
// before masking a power-of-two table, otherwise probing becomes quadratic.
export function mixVertexHash(h){h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return h^(h>>>16);}
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function hash(x,z){const n=Math.sin(x*127.1+z*311.7+19.37)*43758.5453;return n-Math.floor(n);}
function noise(x,z){
  const i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(i,j),hash(i+1,j),u),THREE.MathUtils.lerp(hash(i,j+1),hash(i+1,j+1),u),v);
}

// Numeric work buffers, rather than millions of boxed JS numbers/triangle objects.
class Numbers {
  constructor(Type=Float32Array,capacity=1024){this.Type=Type;this.data=new Type(capacity);this.length=0;}
  push3(x,y,z){
    if(this.length+3>this.data.length){const next=new this.Type(Math.max(this.length+3,Math.ceil(this.data.length*1.5)));next.set(this.data);this.data=next;}
    const i=this.length;this.data[i]=x;this.data[i+1]=y;this.data[i+2]=z;this.length+=3;
  }
  push1(value){
    if(this.length===this.data.length){const next=new this.Type(Math.ceil(this.data.length*1.5));next.set(this.data);this.data=next;}
    this.data[this.length++]=value;
  }
  view(){return this.data.subarray(0,this.length);}
}

function mapDepth(p,settings){
  let depth=.66-p.y;
  for(const road of settings.roads){
    const dx=p.x-road.x,dz=p.z-road.z,outside=Math.hypot(Math.max(0,Math.abs(dx)-7),Math.max(0,Math.abs(dz)-7));if(outside>=1.2)continue;
    const x=dx*Math.cos(road.yaw)-dz*Math.sin(road.yaw),z=dx*Math.sin(road.yaw)+dz*Math.cos(road.yaw);
    let d=Math.hypot(x,z);
    for(const e of road.exits)d=Math.min(d,e==='N'?Math.hypot(x,Math.max(0,z)):e==='S'?Math.hypot(x,Math.min(0,z)):e==='E'?Math.hypot(Math.min(0,x),z):Math.hypot(Math.max(0,x),z));
    const depression=(.56-.56*smooth(1.35,3.65,d))*(1-smooth(0,1.2,outside));
    depth=Math.min(depth,.66-p.y-depression);
  }
  for(const b of settings.neighbours||[]){
    const dx=Math.max(0,Math.abs(p.x-b.x)-7),dz=Math.max(0,Math.abs(p.z-b.z)-7),distance=Math.hypot(dx,dz);
    depth=THREE.MathUtils.lerp(.66-p.y,depth,smooth(0,1.2,distance));
  }
  return Math.max(.04,depth);
}
export function prepareSnowSurface(options){
  const started=performance.now();let surface=readSurface(options.root,options.receivingColors);
  const sourceFaces=surface.triangles.length;
  options.root=null;options.bounds=null;
  options.progress?.({stage:'indexed',faces:surface.triangles.length});
  const exposed=exposedFacets(surface,options);options.progress?.({stage:'exposed',facets:exposed.length});
  const detailStep=Math.max(options.step,.35),detailed=subdivideFacets(exposed,detailStep);
  const facets=conformFacets(detailed,detailStep);
  const topology={clipped:exposed.length,detailed:detailed.length,final:facets.length};
  detailed.length=0;options.progress?.({stage:'conformed',facets:facets.length,topology});
  const points=new Map(),fits=new Map(),partBounds=new Map();
  for(const face of facets){if(!partBounds.has(face.part))partBounds.set(face.part,new THREE.Box3());for(const p of face)partBounds.get(face.part).expandByPoint(p);}
  function point(p,part){
    const settings=options.parts?.[part]??options,bounds=partBounds.get(part);
    const key=part+':'+[p.x,p.y,p.z].map(x=>x.toFixed(7)).join(',');
    if(points.has(key))return points.get(key);
    let high=surface.sample(p.x,p.z)?.y??p.y;if(high-p.y>.085)high=p.y;
    const resolution=settings.kind==='shrub'?.035:.08,fitKey=`${part}:${Math.round(p.x/resolution)},${Math.round(p.z/resolution)}`;
    let fit=fits.get(fitKey);
    if(['ground','map','road'].includes(settings.kind))fit={x:p.x,z:p.z,y:high,gx:0,gz:0,normal:new THREE.Vector3(0,1,0)};
    if(!fit||Math.abs(fit.y-high)>.2){
      const r=settings.fillRadius;let w=0,sx=0,sz=0,sy=0,xx=0,zz=0,xz=0,xy=0,zy=0;
      for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){
        const dx=i*r/2,dz=j*r/2,q=surface.sample(p.x+dx,p.z+dz);if(!q||Math.abs(q.y-high)>.18)continue;
        const weight=Math.exp(-(i*i+j*j)*.3);w+=weight;sx+=dx*weight;sz+=dz*weight;sy+=q.y*weight;
        xx+=dx*dx*weight;zz+=dz*dz*weight;xz+=dx*dz*weight;xy+=dx*q.y*weight;zy+=dz*q.y*weight;
      }
      if(!w){w=1;sy=high;}
      const cx=xx-sx*sx/w,cz=zz-sz*sz/w,cc=xz-sx*sz/w,bx=xy-sx*sy/w,bz=zy-sz*sy/w,det=cx*cz-cc*cc;
      const gx=Math.abs(det)>1e-12?(bx*cz-bz*cc)/det:0,gz=Math.abs(det)>1e-12?(bz*cx-bx*cc)/det:0;
      fit={x:p.x,z:p.z,y:sy/w-gx*sx/w-gz*sz/w,gx,gz,normal:new THREE.Vector3(-gx,1,-gz).normalize()};fits.set(fitKey,fit);
    }
    const normal=fit.normal,fill=clamp(fit.y+fit.gx*(p.x-fit.x)+fit.gz*(p.z-fit.z)-high,-settings.fillLimit,settings.fillLimit);
    const s=settings.scale,n=.66*noise(p.x/s,p.z/s)+.34*noise(p.x/s*2.7+21,p.z/s*2.7-13);
    const border=Math.min(p.x-bounds.min.x,bounds.max.x-p.x,p.z-bounds.min.z,bounds.max.z-p.z);
    const bx=((p.x%14)+14)%14,bz=((p.z%14)+14)%14;
    const plot=options.groundBounds,plotEdge=plot?Math.min(p.x-plot[0],plot[1]-p.x,p.z-plot[2],plot[3]-p.z):99;
    const groundEdge=settings.kind==='map'?Math.min(bx,14-bx,bz,14-bz):border;
    const drift=.07*noise(p.x/3+5,p.z/3-9)*smooth(0,1.4,groundEdge);
    const value={key,index:points.size,part,x:p.x,y:p.y,z:p.z,normal,fill,high,
      depth:settings.kind==='map'?mapDepth(p,settings)*(1+drift/.66):settings.kind==='ground'?Math.max(.05,.66-p.y)+drift:settings.kind==='road'?THREE.MathUtils.lerp(Math.max(.04,.66-p.y),settings.maxDepth,smooth(0,.8,plotEdge)):settings.maxDepth,
      score:.03+.94*n,
      mound:.84+.16*noise(p.x/(s*4)+5,p.z/(s*4)),
      edge:settings.kind==='shrub'?smooth(.32,.72,normal.y):['ground','map','road'].includes(settings.kind)?1:.22+.78*smooth(0,settings.kind==='roof'?.16:.12,border)};
    points.set(key,value);return value;
  }
  const prepared=facets.map(f=>f.map(p=>point(p,f.part))).sort((a,b)=>a[0].part-b[0].part);
  const edgeKey=(a,b)=>a.index<b.index?`${a.index}/${b.index}`:`${b.index}/${a.index}`;
  const edgeCounts=new Map();
  prepared.forEach(f=>f.forEach((p,i)=>{const k=edgeKey(p,f[(i+1)%3]);edgeCounts.set(k,(edgeCounts.get(k)||0)+1);}));
  const fields=['x','y','z','fill','high','score','mound','edge','depth','part'];
  let vertexData=new Float64Array(points.size*13);
  for(const p of points.values()){
    const k=p.index*13;fields.forEach((name,j)=>vertexData[k+j]=p[name]);p.normal.toArray(vertexData,k+10);
  }
  const faces=new Uint32Array(prepared.length*3),shared=new Uint8Array(prepared.length);
  prepared.forEach((f,i)=>f.forEach((p,j)=>{faces[i*3+j]=p.index;if(edgeCounts.get(edgeKey(p,f[(j+1)%3]))>1)shared[i]|=1<<j;}));
  const facetCount=facets.length,sourceArea=facets.reduce((sum,f)=>sum+Math.abs(triangle(...f).denom)/2,0);
  const partStats=options.parts?.map((p,i)=>({id:p.id,facets:facets.filter(f=>f.part===i).length}));
  // Contact geometry never changes with snow amount. Check it once while the
  // source index is available, then release that large object graph entirely.
  const occlusions=new Float32Array(facetCount);topology.occludedArea=0;topology.occludedFacets=0;
  prepared.forEach((f,i)=>{
    const x=(f[0].x+f[1].x+f[2].x)/3,z=(f[0].z+f[1].z+f[2].z)/3,y=(f[0].y+f[1].y+f[2].y)/3;
    const hit=surface.sample(x,z);if(hit)occlusions[i]=Math.max(0,hit.y-y);
    if(occlusions[i]>.0001){topology.occludedArea+=Math.abs(triangle(...f).denom)/2;topology.occludedFacets++;}
  });
  // These were previously retained by the closure for the lifetime of the Worker.
  points.clear();fits.clear();edgeCounts.clear();partBounds.clear();
  prepared.length=0;facets.length=0;exposed.length=0;surface=null;
  const preparationMs=performance.now()-started;
  return {vertexData,faces,shared,occlusions,facetCount,sourceFaces,sourceArea,partStats,topology,preparationMs};
}
export function createSurfaceSnow(options,prepared=prepareSnowSurface(options),workspace=null){
  let {vertexData}=prepared;
  const {faces,shared,occlusions,facetCount,sourceFaces,sourceArea,partStats,topology,preparationMs}=prepared;
  const face=Array.from({length:3},()=>({normal:new THREE.Vector3()}));
  // A triangle clipped by one threshold has at most four vertices/two crossings.
  // These records never escape the serial generator or become live geometry.
  const crossings=Array.from({length:2},()=>({normal:new THREE.Vector3()}));
  const poly=[],masks=[],bottom=Array.from({length:4},()=>new THREE.Vector3()),top=Array.from({length:4},()=>new THREE.Vector3());
  const center=new THREE.Vector3(),faceNormal=new THREE.Vector3(),faceEdge=new THREE.Vector3(),sideNormal=new THREE.Vector3(),sideEdge=new THREE.Vector3(),mid=new THREE.Vector3(),hintNormals=new Array(3);
  const pointFields=['x','y','z','fill','high','score','mound','edge','depth'];
  const flatKind=kind=>kind==='ground'||kind==='map'||kind==='road';
  const material=new THREE.MeshStandardMaterial({color:'#f6fafc',roughness:.98,metalness:0,side:THREE.FrontSide});
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.name=`surface-snow-${options.id}`;
  mesh.castShadow=mesh.receiveShadow=true;
  let amount=0,lastStats={},disposed=false,topOffsets=new Uint32Array(),topParts=new Int16Array();
  // The worker processes one job at a time and packs/releases its result before
  // the next job. Reuse that one scratch arena across models, never live meshes.
  function buffer(name,Type=Float32Array){
    if(!workspace)return new Numbers(Type);
    if(!workspace.has(name))workspace.set(name,new Numbers(Type));
    const b=workspace.get(name);b.length=0;return b;
  }
  function interpolate(a,b,t,out){
    out.part=a.part;for(const k of pointFields)out[k]=THREE.MathUtils.lerp(a[k],b[k],t);
    out.normal.copy(a.normal).lerp(b.normal,t).normalize();return out;
  }
  function height(p,threshold){
    const coverage=smooth(0,.12,threshold-p.score);
    const thin=.0018+.018*smooth(0,.65,amount);
    const deep=p.depth*Math.pow(amount,2.65)*(flatKind(options.parts?.[p.part]?.kind)?1:p.mound);
    const base=p.y+(p.high-p.y)*smooth(.2,.6,amount);
    const top=base+Math.max(thin,thin+deep+p.fill*smooth(.22,.86,amount))*p.edge;
    return p.y+Math.max(0,top-p.y)*coverage;
  }
  function setAmount(next){
    if(!Number.isFinite(next)||next<0||next>1)throw new RangeError('snowAmount 必须在 0～1 之间');
    if(disposed)throw new Error('雪层已释放');
    amount=next;const t0=performance.now();
    // Release the previous Worker frame before allocating its replacement. The
    // render thread already owns its independent transferred frame.
    mesh.geometry.dispose();mesh.geometry=new THREE.BufferGeometry();
    const positions=buffer('positions'),normals=buffer('normals'),colors=buffer('colors'),indices=buffer('indices',Uint32Array);
    const vertexTable=buffer('vertexTable',Int32Array),vertexHashes=buffer('vertexHashes',Uint32Array);
    let vertexCapacity=vertexTable.data.length,vertexCount=0;vertexTable.data.fill(-1);
    const vertexValues=new Float32Array(9),vertexBits=new Uint32Array(vertexValues.buffer);
    const offsets=buffer('offsets',Uint32Array),partIds=buffer('partIds',Int16Array),weldIds=buffer('weldIds',Uint32Array),blends=buffer('blends');
    const sums=buffer('sums',Float64Array),weldCoordinates=buffer('weldCoordinates',Int32Array),weldHash=buffer('weldHash',Int32Array);
    let weldCapacity=16;while(weldCapacity<facetCount*6)weldCapacity*=2;
    if(weldHash.data.length<weldCapacity)weldHash.data=new Int32Array(weldCapacity);
    weldHash.data.fill(-1,0,weldCapacity);
    // Away from decimal half ties, the multiplication error cannot change the
    // rounded integer. Keep toFixed at the uncertainty boundary and outside
    // the bounded range, preserving its exact rounding and negative-zero key.
    const quantize=n=>{
      const scaled=Math.abs(n)*1e6,rounded=Math.floor(scaled+.5);
      const q=scaled<2147483647&&Math.abs(scaled-(rounded-.5))>Math.max(1,scaled)*Number.EPSILON*2
        ?(n<0?-rounded:rounded):Math.round(Number(n.toFixed(6))*1e6);
      return q===0&&n<0?-2147483648:q;
    };
    function weld(p){
      const x=quantize(p.x),y=quantize(p.y),z=quantize(p.z);
      let slot=mixVertexHash(Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791))&(weldCapacity-1),id;
      while((id=weldHash.data[slot])>=0){
        const k=id*3,a=weldCoordinates.data;if(a[k]===x&&a[k+1]===y&&a[k+2]===z)return id;
        slot=(slot+1)&(weldCapacity-1);
      }
      id=sums.length/3;weldHash.data[slot]=id;weldCoordinates.push3(x,y,z);sums.push3(0,0,0);return id;
    }
    const groups=[];let groupPart=-1,groupStart=0;
    let coverageArea=0,maxThickness=0,sideCount=0,sideInward=0,bottomError=0,occlusionError=0;
    const threshold=Math.min(1.1,.12+amount*1.7);
    const emittedNormal=new THREE.Vector3(),emittedEdge=new THREE.Vector3();
    function emitVertex(p,n,top){
      const shade=smooth(.13,.65,p.y);
      vertexValues[0]=p.x;vertexValues[1]=p.y;vertexValues[2]=p.z;vertexValues[3]=n.x;vertexValues[4]=n.y;vertexValues[5]=n.z;
      vertexValues[6]=.83+.17*shade;vertexValues[7]=.89+.11*shade;vertexValues[8]=.96+.04*shade;
      let hash=2166136261,slot=-1;
      // Top vertices remain independent until their formed normals are resolved.
      // Bottom/side duplicates are identical now, so never expand them first.
      if(!top){
        for(let j=0;j<9;j++)hash=Math.imul(hash^vertexBits[j],16777619);
        hash=mixVertexHash(hash);
        if(vertexCount>=vertexCapacity*.6){
          const previous=vertexTable.data;vertexCapacity*=2;vertexTable.data=new Int32Array(vertexCapacity);vertexTable.data.fill(-1);
          for(const id of previous)if(id>=0){let s=vertexHashes.data[id]&(vertexCapacity-1);while(vertexTable.data[s]>=0)s=(s+1)&(vertexCapacity-1);vertexTable.data[s]=id;}
        }
        slot=hash&(vertexCapacity-1);
        while(vertexTable.data[slot]>=0){
          const id=vertexTable.data[slot],k=id*3;let equal=true;
          for(let j=0;j<3;j++)if(!Object.is(positions.data[k+j],vertexValues[j])||!Object.is(normals.data[k+j],vertexValues[j+3])||!Object.is(colors.data[k+j],vertexValues[j+6])){equal=false;break;}
          if(equal)return id;slot=(slot+1)&(vertexCapacity-1);
        }
      }
      const id=positions.length/3;
      positions.push3(vertexValues[0],vertexValues[1],vertexValues[2]);normals.push3(vertexValues[3],vertexValues[4],vertexValues[5]);colors.push3(vertexValues[6],vertexValues[7],vertexValues[8]);vertexHashes.push1(hash);
      if(!top){vertexTable.data[slot]=id;vertexCount++;}return id;
    }
    function emit(a,b,c,ns=null){
      emittedNormal.subVectors(b,a).cross(emittedEdge.subVectors(c,a)).normalize();
      if(Math.abs(emittedNormal.lengthSq())<1e-10)return;
      indices.push3(emitVertex(a,ns?.[0]??emittedNormal,!!ns),emitVertex(b,ns?.[1]??emittedNormal,!!ns),emitVertex(c,ns?.[2]??emittedNormal,!!ns));
    }
    if(amount>0)for(let faceIndex=0;faceIndex<facetCount;faceIndex++){
      for(let j=0;j<3;j++){
        const k=faces[faceIndex*3+j]*13,p=face[j];
        p.x=vertexData[k];p.y=vertexData[k+1];p.z=vertexData[k+2];p.fill=vertexData[k+3];p.high=vertexData[k+4];
        p.score=vertexData[k+5];p.mound=vertexData[k+6];p.edge=vertexData[k+7];p.depth=vertexData[k+8];p.part=vertexData[k+9];p.normal.fromArray(vertexData,k+10);
      }
      if(face[0].part!==groupPart){
        if(groupPart>=0&&indices.length>groupStart)groups.push({start:groupStart,count:indices.length-groupStart,materialIndex:groupPart});
        groupPart=face[0].part;groupStart=indices.length;
      }
      poly.length=0;masks.length=0;let crossing=0;
      for(let i=0;i<3;i++){
        const a=face[i],b=face[(i+1)%3],da=threshold-a.score,db=threshold-b.score;
        if(da>0){poly.push(a);masks.push((1<<i)|(1<<((i+2)%3)));}
        if((da>0)!==(db>0)){poly.push(interpolate(a,b,da/(da-db),crossings[crossing++]));masks.push(1<<i);}
      }
      if(poly.length<3)continue;
      occlusionError=Math.max(occlusionError,occlusions[faceIndex]);
      center.set(0,0,0);
      for(let i=0;i<poly.length;i++){const p=poly[i];bottom[i].set(p.x,p.y,p.z);top[i].set(p.x,height(p,threshold),p.z);center.add(bottom[i]);}
      center.multiplyScalar(1/poly.length);
      for(let i=1;i<poly.length-1;i++){
        const a=top[0],b=top[i],c=top[i+1],denom=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
        // Skip zero thickness fragments at the edge of a newly appearing patch.
        if(Math.max(a.y-bottom[0].y,b.y-bottom[i].y,c.y-bottom[i+1].y)<1e-7)continue;
        hintNormals[0]=poly[0].normal;hintNormals[1]=poly[i].normal;hintNormals[2]=poly[i+1].normal;
        const offset=positions.length;emit(a,b,c,hintNormals);
        if(positions.length===offset)continue;
        offsets.push1(offset);partIds.push1(face[0].part);
        const n=faceNormal.subVectors(b,a).cross(faceEdge.subVectors(c,a));
        for(let j=0;j<3;j++){
          const index=j===0?0:j===1?i:i+1,v=top[index],hint=poly[index];
          const id=weld(v);
          sums.data[id*3]+=n.x;sums.data[id*3+1]+=n.y;sums.data[id*3+2]+=n.z;weldIds.push1(id);
          const kind=options.parts?.[hint.part]?.kind;
          blends.push1(kind==='shrub'?.92:flatKind(kind)?0:hint.edge>.98?.88:.25);
        }
        emit(bottom[0],bottom[i+1],bottom[i]);
        coverageArea+=Math.abs(denom)/2;
        if(offsets.length%Math.max(1,Math.floor(facetCount/600))===0){
          const p=bottom[0].clone().add(bottom[i]).add(bottom[i+1]).multiplyScalar(1/3),baseTri=triangle(...face),w=weights(baseTri,p.x,p.z);
          if(w)bottomError=Math.max(bottomError,Math.abs(p.y-baseTri.a.y*w[0]-baseTri.b.y*w[1]-baseTri.c.y*w[2]));
        }
      }
      // Independent closed micro-volumes share their exact contact faces. Internal
      // walls are buried; exterior walls use the top's outward boundary ordering.
      for(let i=0;i<poly.length;i++){
        const j=(i+1)%poly.length;
        maxThickness=Math.max(maxThickness,top[i].y-bottom[i].y);
        if(shared[faceIndex]&masks[i]&masks[j])continue;
        for(let half=0;half<2;half++){
          const a=top[i];let b=half===0?bottom[i]:bottom[j],c=half===0?bottom[j]:top[j];
          sideNormal.subVectors(b,a).cross(sideEdge.subVectors(c,a)).normalize();
          if(sideNormal.lengthSq()<1e-8)continue;
          mid.set(0,0,0).add(a).add(b).add(c).multiplyScalar(1/3);
          if(sideNormal.x*(mid.x-center.x)+sideNormal.z*(mid.z-center.z)<-1e-8){const swap=b;b=c;c=swap;sideNormal.subVectors(b,a).cross(sideEdge.subVectors(c,a)).normalize();}
          emit(a,b,c);sideCount++;
          if(sideNormal.x*(mid.x-center.x)+sideNormal.z*(mid.z-center.z)<-1e-8)sideInward++;
        }
      }
    }
    // Formed-snow normals retain the rounded rim. Blend the interior toward the
    // locally fitted surface for the reference's soft animation shading.
    const n=new THREE.Vector3(),hintNormal=new THREE.Vector3();
    for(let i=0;i<weldIds.length;i++){
      const id=weldIds.data[i]*3,k=offsets.data[Math.floor(i/3)]+i%3*3;
      n.fromArray(sums.data,id).normalize();hintNormal.fromArray(normals.data,k);n.lerp(hintNormal,blends.data[i]).normalize();
      if(n.lengthSq()<1e-12)n.set(0,1,0);
      normals.data[k]=n.x;normals.data[k+1]=n.y;normals.data[k+2]=n.z;
    }
    if(groupPart>=0&&indices.length>groupStart)groups.push({start:groupStart,count:indices.length-groupStart,materialIndex:groupPart});
    const geometry=new THREE.BufferGeometry();
    for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
    geometry.setAttribute('position',new THREE.BufferAttribute(positions.view(),3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(normals.view(),3));
    geometry.setAttribute('color',new THREE.BufferAttribute(colors.view(),3));
    geometry.setIndex(new THREE.BufferAttribute(indices.view(),1));
    geometry.computeBoundingSphere();mesh.geometry.dispose();mesh.geometry=geometry;mesh.visible=amount>0;
    topOffsets=offsets.view();topParts=partIds.view();
    lastStats={amount,coverageArea,coverageRatio:sourceArea?coverageArea/sourceArea:0,maxThickness,sourceArea,
      triangles:indices.length/3,topTriangles:topOffsets.length,sideCount,sideInward,bottomError,occlusionError,parts:partStats,
      rebuildMs:performance.now()-t0,sourceFaces,exposedFacets:facetCount,topology,preparationMs,preparationMode:options.preparationMode??'generated',preparationFallback:options.preparationFallback??null};
    return {...lastStats};
  }
  setAmount(0);
  return {mesh,setAmount,getAmount:()=>amount,inspect:()=>({...lastStats}),
    releaseFrame(){
      mesh.geometry.dispose();mesh.geometry=new THREE.BufferGeometry();
      topOffsets=new Uint32Array();topParts=new Int16Array();
    },
    takeFrame(allocate=(name,Type,length)=>new Type(length),indexedTop=false){
      const g=mesh.geometry,p=g.attributes.position.array,parts=allocate('parts',Int16Array,topParts.length);
      // Live queries reference the rendered vertices; the coordinate form remains
      // available only for the existing offline preparation/equality inspector.
      const top=indexedTop?allocate('topIndices',Uint32Array,topOffsets.length*3):allocate('top',Float32Array,topOffsets.length*9);
      if(indexedTop){for(let i=0;i<topOffsets.length;i++)for(let j=0;j<3;j++)top[i*3+j]=topOffsets[i]/3+j;}
      else for(let i=0;i<topOffsets.length;i++)for(let j=0;j<9;j++)top[i*9+j]=p[topOffsets[i]+j];
      parts.set(topParts);
      // The index packer makes the sole transferable frame. Keep these as views,
      // avoiding another full-size copy of the formed topology before packing.
      const array=name=>g.attributes[name].array;
      return {positions:array('position'),normals:array('normal'),colors:array('color'),indices:g.index.array,...(indexedTop?{topIndices:top}:{top}),parts,groups:g.groups};
    },
    dispose(){if(disposed)return;disposed=true;mesh.geometry.dispose();material.dispose();mesh.removeFromParent();vertexData=null;}
  };
}
