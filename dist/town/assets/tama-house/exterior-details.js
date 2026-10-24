// Local art primitives: the other residences keep their existing geometry.
export function tamaDetails(K){
 const {THREE,part,at,box,beam,ball,line,slab,mesh}=K;
 const fract=n=>n-Math.floor(n),rnd=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
 function clip(poly,axis,value,greater){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=greater?a[axis]>=value:a[axis]<=value,ib=greater?b[axis]>=value:b[axis]<=value;if(ia)out.push(a);if(ia!==ib){const t=(value-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;}
 function blueRoof(name,polygon,height){
  const g=part(name);slab(polygon,height,.14,'#3965b5',g);
  const minX=Math.min(...polygon.map(p=>p[0])),maxX=Math.max(...polygon.map(p=>p[0])),minZ=Math.min(...polygon.map(p=>p[1])),maxZ=Math.max(...polygon.map(p=>p[1]));
  const w=.52,d=.46;
  for(let x=minX;x<maxX;x+=w)for(let z=minZ;z<maxZ;z+=d){let p=polygon;for(const[a,v,gt]of[[0,x+.006,true],[0,x+w-.006,false],[1,z+.007,true],[1,z+d-.007,false]])p=clip(p,a,v,gt);if(p.length<3||Math.abs(THREE.ShapeUtils.area(p.map(v=>new THREE.Vector2(...v))))<.001)continue;
   const color=['#4676ce','#4878ce','#4777ce'][Math.floor(rnd(x*9+z*17)*3)];
   slab(p,(xx,zz)=>height(xx,zz)+.021+.008*(zz-z)/d,.026,color,g);
   if(rnd(x*8+z*5)>.56){const xx=x+w*.32,zz=z+d*.63;if(p.every(v=>Number.isFinite(v[0]))&&xx<maxX-.2&&zz<maxZ-.1){const inside=(px,pz)=>{let c=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>pz)!==(b[1]>pz)&&px<(b[0]-a[0])*(pz-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};if(inside(xx,zz)&&inside(xx+.14,zz))beam([xx,height(xx,zz)+.034,zz],[xx+.14,height(xx+.14,zz)+.034,zz],.004,'#3e6fc4',g);}}
  }
  // Thin pale underside and a broader blue outer fascia; no brown exposed core.
  for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];if(a[1]===0&&b[1]===0)continue;const strip=part('蓝色檐板',g);const va=new THREE.Vector3(a[0],height(...a)-.07,a[1]),vb=new THREE.Vector3(b[0],height(...b)-.07,b[1]),v=vb.clone().sub(va);const m=box(v.length(),.14,.09,0,0,0,'#3c68bd',strip);m.position.copy(va.clone().add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),v.normalize());beam([a[0],height(...a)-.155,a[1]],[b[0],height(...b)-.155,b[1]],.020,'#e5eff3',g);}
  return g;
 }
 function guard(name,{x,z,y,w,rotation=0}){
  const g=at(name,x,z,rotation),depth=.23,h=.49;
  for(const yy of [y,y+h])line([[-w/2+.05,yy,0],[-w/2,yy,.17],[-w/2+.08,yy,depth],[w/2-.08,yy,depth],[w/2,yy,.17],[w/2-.05,yy,0]],.017,'#e5eef0',g);
  for(let u=-w/2+.09;u<w/2-.05;u+=.155)beam([u,y,.23],[u,y+h,.23],.012,'#eef2f2',g);
  return g;
 }
 function pinkWall(name,x,z,w,h,rotation=0){
  const g=at(name,x,z,rotation);box(w-.035,h,.24,0,.12+h/2,0,'#bd6678',g);
  const band=h/4;
  for(let i=0;i<4;i++)box(w,band-.037,.27,0,.12+(i+.5)*band,0,['#eb95a2','#ec97a4','#ed99a6','#ee9ca9'][i],g);
  box(w,.065,.30,0,.12+h+.025,0,'#e897a5',g);
  for(let i=0;i<35;i++){const x0=(rnd(i+w*8)-.5)*(w-.05),y=.16+rnd(i*3+w)*h;box(.012+.012*rnd(i*5),.014,.006,x0,y,.139,'#cf8898',g);}
 }
 function lawn(){
  const g=part('草地与地块');box(16,.22,14,0,-.02,0,'#c4c9a3',g);
  // Shared vertices form gently uneven lawn; the building covers its interior.
  const nx=64,nz=56,positions=[],colors=[],indices=[];
  const col=new THREE.Color();
  for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){const x=-7.97+15.94*ix/nx,z=-6.97+13.94*iz/nz,y=.117+.006*Math.sin(x*1.9)*Math.sin(z*1.5);positions.push(x,y,z);col.set('#91bd58').offsetHSL(0,.015*Math.sin(x+z),.019*Math.sin(x*2.1+z*.7)+.01*Math.sin(z*3));colors.push(col.r,col.g,col.b);if(ix<nx&&iz<nz){const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const mat=K.material('#91bd58').clone();mat.color.set('#ffffff');mat.vertexColors=true;K.materials.set('tama-lawn',mat);mesh(geo,mat,g);
  let tufts=0;
  const grassY=(x,z)=>.117+.006*Math.sin(x*1.9)*Math.sin(z*1.5);
  const blades=[[],[],[]];
  for(let i=0;i<2000;i++){const x=-7.65+rnd(i*2+2)*15.3,z=-6.55+rnd(i*2+3)*13.35;if(Math.abs(x)<4.38&&Math.abs(z)<3.18)continue;if(x>-3.45&&x<-1.55&&z>3.08&&z<3.76)continue;const pathX=-2.5-1.5*Math.min(1,Math.max(0,(z-3.43)/2.77));if(Math.abs(x-pathX)<.91&&z>3.75&&rnd(i)>.28)continue;const y=grassY(x,z),h=.045+rnd(i*7)*.11;for(let j=0;j<3;j++){const a=rnd(i+j)*6.28,dx=Math.cos(a),dz=Math.sin(a),p=[x-dz*.009,y,z+dx*.009],q=[x+dz*.009,y,z-dx*.009],tip=[x+dx*.045,y+h*(.75+j*.13),z+dz*.045],back=[x,y+.002,z];blades[i%3].push(...p,...tip,...q,...p,...back,...tip,...q,...tip,...back);}tufts++;}
  blades.forEach((p,i)=>{const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();mesh(geo,['#719f42','#80b346','#a4ca5b'][i],g);});
  for(let i=0;i<48;i++){const x=-7.6+rnd(i+66)*15.2,z=6.65+rnd(i+12)*.2;if(Math.abs(x+2.5)<1.1)continue;const y=.22+rnd(i)*.1;beam([x,.12,z],[x,y,z],.006,'#689e47',g,.004);for(let j=0;j<5;j++)ball(.024,.020,.014,x+Math.cos(j*1.257)*.028,y+Math.sin(j*1.257)*.028,z,i%3?'#f3eee2':'#f0d763',g,6);}
  return {tufts,grassY:.117};
 }
 function canopy(x,y,z,rx,ry,rz,color,seed,parent){
  // A single continuous, lobed surface avoids intersecting oval "pumpkins".
  const lobes=[[0,0,0,.56]];
  for(let j=0;j<15;j++){const a=j*2.3999+seed,cy=-.80+1.6*(j+.5)/15,r=Math.sqrt(1-cy*cy)*.67;lobes.push([Math.cos(a)*r,cy*.67,Math.sin(a)*r,.33+rnd(j+seed)*.11]);}
  const geo=new THREE.SphereGeometry(1,64,40),a=geo.attributes.position,colors=[],directions=[];
  for(let i=0;i<a.count;i++){const v=new THREE.Vector3(a.getX(i),a.getY(i),a.getZ(i)).normalize();let r=.65;for(const[cx,cy,cz,rr]of lobes){const dot=v.x*cx+v.y*cy+v.z*cz,disc=rr*rr-(cx*cx+cy*cy+cz*cz-dot*dot);if(disc>0){const t=dot+Math.sqrt(disc),k=.055,d=Math.max(k-Math.abs(t-r),0)/k;r=Math.max(t,r)+d*d*k*.25;}}r*=1+.012*Math.sin(v.x*19+seed)*Math.sin(v.y*21+seed)*Math.sin(v.z*17);a.setXYZ(i,v.x*r,v.y*r,v.z*r);directions.push({v,r});const c=new THREE.Color(color).offsetHSL(0,0,.018*v.y+.012*Math.sin(v.x*4+v.z*5+seed));colors.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mat=K.material(color).clone();mat.color.set('#ffffff');mat.vertexColors=true;K.materials.set('canopy-'+seed,mat);const m=mesh(geo,mat,parent);m.position.set(x,y,z);m.scale.set(rx,ry,rz);
  for(let i=0;i<14;i++){const d=directions[Math.floor(rnd(i+seed)*directions.length)],v=d.v;if(v.y<-.4)continue;for(let j=0;j<3;j++){const leaf=ball(.021,.062,.010,x+v.x*d.r*rx+(j-1)*.05,y+v.y*d.r*ry+.015,z+v.z*d.r*rz+.012,'#c5d66f',parent,6);leaf.rotation.z=(j-1)*.32;}}
  return m;
 }
 function bush(name,x,z,w,h,d,color,seed,parent){
  const g=part(name,parent);beam([x,.12,z],[x,h*.55,z],.055,'#7d8050',g,.02);
  canopy(x,.12+h*.45,z,w*.49,h*.49,d*.49,color,seed,g);
  return g;
 }
 function leafyTree(parent){
  const g=part('左侧茂盛大树',parent),x=-6.0,z=-2.5;
  line([[x,.12,z],[x+.08,1.4,z-.06],[x-.15,2.8,z],[x+.06,4.2,z-.12],[x-.15,5.6,z]],.13,'#827b4e',g);
  for(let i=0;i<8;i++){const a=i*2.4,r=.85+.28*rnd(i);const start=[x,1.8+i*.22,z],end=[x+Math.cos(a)*r,4.1+rnd(i+3)*1.8,z+Math.sin(a)*r];beam(start,[end[0]*.4+x*.6,3.3+i*.12,end[2]*.4+z*.6],.09,'#827b4e',g,.065);beam([end[0]*.4+x*.6,3.3+i*.12,end[2]*.4+z*.6],end,.065,'#827b4e',g,.025);}
  canopy(x,4.55,z,1.75,2.05,1.67,'#7ba947',81,g);
  return g;
 }
 function branchTree(parent){
  // The entire tree is behind z=-3.1, not beside the wall.
  const g=part('右后自然稀叶树',parent),origin=[6.55,.12,-4.05],wood='#889066';g.position.set(1.2,0,1.0);let tips=0;
  const trunk=[[5.35,.12,-5.05],[5.25,1.45,-5.04],[5.41,2.7,-5.18],[5.28,3.9,-5.24],[5.45,5.08,-5.19],[5.36,6.65,-5.35]];
  for(let i=0;i<trunk.length-1;i++)beam(trunk[i],trunk[i+1],.10-i*.014,wood,g,.086-i*.014);
  function grow(start,dir,length,radius,depth,seed){
   const v=new THREE.Vector3(...dir).normalize(),p=new THREE.Vector3(...start),mid=p.clone().addScaledVector(v,length*.54);mid.x+=.10*Math.sin(seed);mid.z+=.08*Math.cos(seed);const end=p.clone().addScaledVector(v,length);beam(start,mid.toArray(),radius,wood,g,radius*.71);beam(mid.toArray(),end.toArray(),radius*.71,wood,g,radius*.44);
   if(depth>0){for(let j=0;j<2;j++){const a=seed*1.7+j*2.8,next=new THREE.Vector3(v.x*.6+Math.cos(a)*.55,.68+rnd(seed+j)*.7,v.z*.6+Math.sin(a)*.55);grow(end.toArray(),next.toArray(),length*(.49+rnd(seed+j+4)*.14),radius*.45,depth-1,seed*2+j+3);}}
   else {tips++;for(let k=0;k<2;k++){const leaf=ball(.029,.085,.012,end.x+(k-.5)*.045,end.y-.025*k,end.z,'#9ba95a',g,7);leaf.rotation.set(.3*Math.sin(seed),seed,.4*Math.cos(seed));}}
  }
  const branches=[[-.8,1.4,.1,2.8],[.85,1.8,.2,3.3],[-.3,1.4,-.75,3.8],[.55,1.5,-.45,4.3],[-.85,1.4,.28,4.65],[.8,1.65,.65,5.1]];
  branches.forEach(([dx,dy,dz,y],i)=>grow([5.32,y,-5.21],[dx,dy,dz],1.25+rnd(i+20)*.6,.047-i*.004,2,i+7));
  return {root:origin,twigs:tips,position:'rear-right'};
 }
 return {blueRoof,guard,pinkWall,lawn,bush,leafyTree,branchTree};
}
