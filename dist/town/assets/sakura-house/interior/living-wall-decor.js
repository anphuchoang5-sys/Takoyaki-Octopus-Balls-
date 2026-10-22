// Living-room-only wall decorations. The caller owns every material and geometry.
export function addLivingWallDecor({THREE,part,box,cyl,plane,mesh,tube}){
 const calendar=part('客13','柜左さとう酒店日历',[11.754,1.65,4.36,-Math.PI/2],g=>{
  box(g,.50,.67,.007,0,0,0,'#e7e5cf');plane(g,.486,.655,0,0,.0042,'#ffffff','calendar');
  box(g,.49,.014,.009,0,.334,0,'#8f9278',false);
  const nail=cyl(g,.006,.006,.008,0,.349,0,'#726b55');nail.rotation.x=Math.PI/2;
 });
 const curtain=part('客15','米白束帘与两道粉色横带',[9.95,0,7.12],g=>{
  // The cropped suspension is a minimal supporting rail, not a claimed reference detail.
  box(g,2.22,.022,.038,0,2.114,.015,'#c0b29a');
  for(const x of [-1.03,1.03])box(g,.025,.026,.082,x,2.114,.052,'#b6a88e',false);
  function point(side,u,v,back=false){
   const tie=.56,k=v<tie?v/tie:(v-tie)/(1-tie),blend=(1-Math.cos(Math.PI*k))/2;
   const width=v<tie?.34+(.105-.34)*blend:.105+(.30-.105)*blend;
   const centre=side*(.95+.055*Math.sin(Math.PI*v)),amp=.004+.013*Math.abs(v-tie)/.56;
   return [centre+(u-.5)*width,2.10-1.44*v+Math.max(0,(v-.85)/.15)*.010*Math.sin(u*Math.PI*3),-.012+amp*Math.cos(u*Math.PI*6)+.018*Math.sin(Math.PI*v)+(back?.007:0)];
  }
  function strip(side,v0,v1,color){
   const cols=24,rows=Math.max(3,Math.ceil((v1-v0)*42)),positions=[],indices=[],n=(cols+1)*(rows+1);
   for(const back of [false,true])for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++)positions.push(...point(side,i/cols,v0+(v1-v0)*j/rows,back));
   const quad=(a,b,c,d)=>indices.push(a,b,c,b,d,c);
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;quad(a,b,c,d);quad(n+a,n+c,n+b,n+d);}
   for(let j=0;j<rows;j++){const a=j*(cols+1),b=a+cols+1;quad(a,b,n+a,n+b);quad(a+cols,n+a+cols,b+cols,n+b+cols);}
   if(v0===0)for(let i=0;i<cols;i++)quad(i,n+i,i+1,n+i+1);
   if(v1===1)for(let i=0;i<cols;i++){const a=rows*(cols+1)+i;quad(a,a+1,n+a,n+a+1);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,color,g);
  }
  for(const side of [-1,1]){
   for(const [v0,v1,c] of [[0,.76,'#f0e5d8'],[.76,.793,'#cc9b9c'],[.793,.86,'#f0e5d8'],[.86,.94,'#cc9b9c'],[.94,1,'#f0e5d8']])strip(side,v0,v1,c);
   for(const u of [0,1])tube(g,Array.from({length:34},(_,i)=>point(side,u,i/33)),.0016,'#a89b89');
   tube(g,Array.from({length:25},(_,i)=>point(side,i/24,1)),.0017,'#a89b89');
   // An inclined closed band wraps the gathered fabric, including its side and back.
   const centre=side*(.95+.055*Math.sin(Math.PI*.56)),positions=[],indices=[],segments=40;
   for(const inner of [false,true])for(const high of [false,true])for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,x=Math.cos(a)*(inner?.060:.064),z=Math.sin(a)*(inner?.015:.019);
    positions.push(centre+x,2.10-1.44*.56+(high?.027:-.027)+side*x*.18,.006+z);
   }
   const n=segments+1;for(let i=0;i<segments;i++)for(const [a,b,reverse] of [[0,n,false],[2*n,3*n,true],[n,3*n,false],[2*n,0,false]]){
    const q=[a+i,a+i+1,b+i,b+i+1];if(reverse)indices.push(q[0],q[2],q[1],q[1],q[2],q[3]);else indices.push(q[0],q[1],q[2],q[1],q[3],q[2]);
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,'#e5d8c7',g);
  }
 });
 const outlet=part('客16','窗下左侧插座',[11.08,.40,7.205,Math.PI],g=>{
  box(g,.13,.15,.012,0,0,0,'#e4e1c5');box(g,.105,.125,.004,0,0,.008,'#eeead6');
  for(const y of [-.030,.030])for(const x of [-.020,.020])box(g,.007,.021,.003,x,y,.011,'#5e6251',false);
  for(const y of [-.058,.058]){const screw=cyl(g,.003,.003,.003,0,y,.011,'#96947d');screw.rotation.x=Math.PI/2;}
 });
 return [calendar,curtain,outlet];
}
