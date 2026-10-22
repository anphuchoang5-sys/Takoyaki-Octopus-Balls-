export function createGarden(W, parent) {
  const {THREE,group,mesh,box,ball,cylinder,beam,line}=W;
  const supports=[], colors={dark:'#246448',middle:'#3c8549',light:'#6caa52',leaf:'#85b75c',bark:'#766140'};
  let seed=1979;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function leaf(x,y,z,size,color,g,angle=0){const m=ball(size*.42,size,size*.13,x,y,z,color,g,8);m.rotation.z=angle;m.rotation.y=random()*Math.PI;return m;}
  function flowers(g,x,base,z,width,depth,h,palette,count=12,potOpening=null){
    for(let i=0;i<count;i++){
      const px=x+(random()-.5)*width,pz=z+(random()-.5)*depth,top=base+h*(.65+random()*.35);
      if(potOpening){
        // Preserve flower heads, but keep roots inside the round opening and foliage above its rim.
        const offset=new THREE.Vector2(px-x,pz-z);if(offset.length()>potOpening.radius)offset.setLength(potOpening.radius);
        const start=new THREE.Vector3(x+offset.x,base,z+offset.y),end=new THREE.Vector3(px+.025,top,pz);
        beam(start.toArray(),end.toArray(),.008,colors.middle,g);
        const lowerY=Math.max(base+(top-base)*.45,potOpening.rim+.065),upperY=Math.max(base+(top-base)*.67,potOpening.rim+.06);
        const lower=start.clone().lerp(end,(lowerY-base)/(top-base)),upper=start.clone().lerp(end,(upperY-base)/(top-base));
        leaf(lower.x-.025,lowerY,lower.z,.065,colors.light,g,-.65);leaf(upper.x+.035,upperY,upper.z,.06,colors.leaf,g,.8);
      }else{
        beam([px,base,pz],[px+.025,top,pz],.008,colors.middle,g);
        leaf(px-.025,base+(top-base)*.45,pz,.065,colors.light,g,-.65);leaf(px+.035,base+(top-base)*.67,pz,.06,colors.leaf,g,.8);
      }
      const flower=group('花',g);flower.position.set(px+.025,top,pz);flower.rotation.set((random()-.5)*.7,random()*6.28,(random()-.5)*.6);
      const color=palette[i%palette.length],radius=.055+random()*.018;
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const petal=ball(radius*.65,.017,radius*.98,Math.cos(a)*radius*.57,0,Math.sin(a)*radius*.57,color,flower,8);petal.rotation.y=-a+Math.PI/2;}
      ball(.022,.018,.022,0,.016,0,'#edc65c',flower,8);
    }
  }
  function planter(name,x,base,z,width=.65,palette=['#d578ae','#e8a8ca'],support='wall'){
    const g=group(name,parent),depth=.29,h=.18;
    box(width,h,depth,x,base+h/2,z,'#a87150',g,true);
    box(width+.035,.035,depth+.035,x,base+h-.012,z,'#b98761',g);
    box(width-.055,.018,depth-.045,x,base+h+.002,z,'#574d36',g);
    flowers(g,x,base+h+.012,z,width-.05,depth*.7,.24,palette,Math.round(width*16));
    supports.push({name,base,support,x,z});return g;
  }
  function pot(name,x,base,z,r=.23,h=.29,palette=['#b5a1dd','#e1d4ef'],hanging=false,support='step'){
    const g=group(name,parent);
    const profile=[[r*.65,0],[r*.68,.025],[r*.96,h-.045],[r,h-.035],[r,h],[r*.88,h],[r*.85,h-.045],[r*.58,.045]];
    const geo=new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),18),m=mesh(geo,'#ad7656',g);m.position.set(x,base,z);
    if(hanging)cylinder(r*.58,r*.65,.045,x,base+.0225,z,'#ad7656',g,18);
    cylinder(r*.82,r*.82,.024,x,base+h-.036,z,'#514934',g,18);
    flowers(g,x,base+h-.025,z,r*1.7,r*1.3,hanging?.23:.37,palette,12,hanging?{radius:r*.60,rim:base+h}:null);
    if(hanging){
      for(const dx of [-r*.7,r*.7])line([[x+dx,base+h-.03,z-r*.5],[x+dx,base+h+.065,z-r*1.05],[x+dx,base+h+.03,z-r*1.35],[x+dx,base+h-.035,z-r*1.35]],.012,'#737668',g);
      for(let k=0;k<3;k++){
        const angle=(k-1)*.55,outward=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)),sideways=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle));
        const at=(radius,dy)=>[x+outward.x*radius,base+h+dy,z+outward.z*radius];
        // Rise clear of the rim before dropping along the outside of the pot.
        const vine=line([at(r*.5,-.025),at(r*.82,.055),at(r+.045,.048),at(r+.065,-.07),at(r+.06,-.19),at(r+.04,-.30)],.008,colors.middle,g).geometry.parameters.path;
        for(let j=0;j<4;j++){
          const attachment=vine.getPoint(.49+j*.13),center=attachment.clone().addScaledVector(outward,.034).addScaledVector(sideways,j%2?.018:-.018);center.y-=.027;
          const blade=leaf(center.x,center.y,center.z,.055,colors.light,g,j%2?.5:-.5);
          blade.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),attachment.clone().sub(center).normalize());
        }
      }
    }
    supports.push({name,base,support,x,z});return g;
  }
  function shrub(name,x,z,rx,h,rz,color=colors.middle){
    const g=group(name,parent),y=.08;
    beam([x,y,z],[x,y+h*.65,z],.045,colors.bark,g,.025);
    const tones=[color,'#'+new THREE.Color(color).offsetHSL(0,-.015,-.025).getHexString(),'#'+new THREE.Color(color).offsetHSL(0,-.01,.025).getHexString()];
    ball(rx*.83,h*.37,rz*.83,x,y+h*.45,z,color,g,18);
    for(let i=0;i<16;i++){
      const a=i*2.399,r=i?Math.sqrt(random())*.65:0;
      const px=x+Math.cos(a)*rx*r,pz=z+Math.sin(a)*rz*r,py=y+h*(.24+random()*.52);
      ball(rx*(.52+random()*.12),Math.min(rx*.76,h*.28),rz*(.52+random()*.12),px,py,pz,tones[i%3],g,16);
    }
    for(let i=0;i<35;i++){const a=random()*6.28,r=random()*.85;leaf(x+Math.cos(a)*rx*r,y+h*(.60+.22*random()),z+Math.sin(a)*rz*r,.065+random()*.035,colors.leaf,g,random()-.5);}
    return g;
  }
  function clippedTree(){
    const g=group('左侧曲干与分层扁树冠',parent),x=-5.12,z=2.3;
    const trunk=[[x,.08,z],[x-.12,.9,z-.03],[x-.43,1.75,z],[x-.17,2.65,z-.06],[x+.18,3.5,z-.2],[x+.42,4.32,z-.27]];
    for(let i=1;i<trunk.length;i++)beam(trunk[i-1],trunk[i],.19-(i-1)*.025,colors.bark,g,.17-(i-1)*.025);
    const layers=[[-.62,2.55,.22,1.02,.25,.62],[.17,3.46,.03,1.12,.27,.65],[.30,4.36,-.18,1.03,.25,.59],[.57,5.10,-.23,.79,.23,.49]];
    layers.forEach(([dx,y,dz,rx,ry,rz],i)=>{
      beam([x-.22,y-.65,z-.04],[x+dx,y-.12,z+dz],.09,colors.bark,g,.045);
      for(let j=0;j<8;j++){const a=j*2.4;const b=ball(rx*.58,ry*(.8+random()*.35),rz*.68,x+dx+Math.cos(a)*rx*.4,y+Math.sin(a)*.10,z+dz+Math.sin(a)*rz*.36,i%2?'#286c52':'#2c7153',g);b.rotation.z=-.21;}
      for(let j=0;j<16;j++){const px=x+dx+(random()-.5)*rx*1.4;leaf(px,y+.20+random()*.08,z+dz+rz*.55,.065,'#8fac4c',g,.05);}
    });
    return g;
  }
  function build(){
    clippedTree();
    shrub('左侧门墙后矮灌木',-4.85,4.55,1.05,2.55,.68,'#78aa50');
    shrub('左边缘低灌木',-6.12,4.35,.57,2.1,.57,'#83af50');
    shrub('门屋后花丛',.55,3.94,.72,2.35,.62,'#7bad51');
    shrub('右侧前景圆树丛',4.70,3.65,1.25,3.2,1.0,'#377b46');
    shrub('右侧后景高树丛',5.23,-.55,1.30,4.45,1.10,'#30754b');
    shrub('右边缘绿篱',6.05,4.45,.54,1.65,.62,'#8db953');
    shrub('后院树丛补全',-4.98,-4.15,.85,2.15,.77,'#497f49');
    const pink=['#d879ad','#e79cc7','#eed2e4'],white=['#f3eee1','#f7f5dc'],yellow=['#edbf47','#f5d664'];
    planter('左墙粉花箱一',-5.62,1.76,5.47,.58,pink);
    planter('左墙粉花箱二',-4.89,1.76,5.47,.58,pink);
    planter('左墙白花长箱',-3.88,1.76,5.47,1.1,white);
    for(let i=0;i<4;i++)planter('右墙粉花箱'+i,.92+i*.68,1.76,5.47,.60,pink);
    pot('右墙橙花盆',4.02,1.76,5.47,.19,.21,['#e8a36c','#e3bf55'],false,'wall');
    pot('右墙黄花盆',4.62,1.76,5.47,.19,.21,yellow,false,'wall');
    planter('门前左花箱',-2.15,.44,4.87,.52,pink,'step');
    pot('门前右高紫花盆',.20,.44,4.84,.23,.33,['#ac9ad3','#c6b6e4'],false,'step');
    pot('门前右低粉花盆',.23,.20,5.64,.22,.25,pink,false,'step');
    for(let i=0;i<3;i++)pot('阳台挂盆'+(i+1),1.77+i*.69,3.47,2.15,.19,.20,yellow,true,'balcony rail');
    pot('木门上的紫花挂盆',-.37,1.65,4.78,.17,.18,['#b6a2dc','#ebe2f4'],true,'gate rail');
    // Sparse grass at the wall foot, preserving the entrance and the street edge.
    for(let i=0;i<52;i++){
      const x=-6.65+random()*13.3;if(x>-2.55&&x<.9)continue;
      const z=5.77+random()*.12;
      for(let j=0;j<3;j++)leaf(x+(j-1)*.035,.12+random()*.035,z,.07,['#79a951','#92b961'][i%2],parent,(j-1)*.4);
      if(i%6===0)flowers(parent,x,.08,z,.12,.09,.11,['#f3e8a0','#f1f1d8'],2);
    }
  }
  return {build,supports};
}
