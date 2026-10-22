// Local graphic details redrawn from the user's animation frame; no room-photo surfaces.
export function livingArt(THREE,resources){
 const cache=new Map();
 return function texture(id){if(cache.has(id))return cache.get(id);const canvas=document.createElement('canvas');canvas.width=512;canvas.height=id==='calendar'?640:id==='bucket'?256:384;const c=canvas.getContext('2d');
  const path=(pts,color,stroke=null,width=4)=>{c.beginPath();for(const [i,p] of pts.entries())i?c.lineTo(...p):c.moveTo(...p);c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
  const ellipse=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  if(id==='television'){
   c.fillStyle='#c1e2e9';c.fillRect(0,0,512,384);c.fillStyle='#e8f0df';c.fillRect(0,255,512,129);
   // A static, simplified programme illustration, never a character asset in the room.
   for(const [x,y,s,dress,hair] of [[109,138,1.20,'#8ab4a6','#89715f'],[258,169,1.00,'#e5c857','#544942'],[399,95,1.50,'#9fcbcb','#69615c']]){
    c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle='#56666a';c.lineWidth=4;
    path([[-17,94],[-15,152],[-4,154],[-1,104]],'#edd2b7','#56666a');path([[3,104],[7,154],[20,154],[17,94]],'#edd2b7','#56666a');
    ellipse(0,-3,34,41,hair);ellipse(0,5,24,29,'#f1d6bd');path([[-22,39],[-41,106],[36,106],[20,39]],dress,'#56666a');
    path([[-21,41],[-34,83],[-24,87],[-10,52]],'#efd4bb','#56666a');path([[20,41],[34,84],[24,88],[11,52]],'#efd4bb','#56666a');
    ellipse(-8,5,2.3,3,'#5d5655');ellipse(8,5,2.3,3,'#5d5655');c.beginPath();c.arc(0,13,7,0,Math.PI);c.stroke();
    path([[-16,38],[0,53],[-3,66],[-21,44]],'#e5e9d9');path([[15,38],[0,53],[4,66],[21,44]],'#e5e9d9');c.restore();
   }
   c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=2;for(let y=3;y<384;y+=8){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
  }else if(id==='daruma'){
   c.clearRect(0,0,512,384);ellipse(256,173,215,163,'#f4ead1');
   for(const x of [160,352]){ellipse(x,167,58,51,'#534b42');ellipse(x,164,35,36,'#f6edda');ellipse(x,170,17,21,'#3e3935');}
   path([[73,102],[145,60],[225,94],[205,117],[144,97]],'#443b34');path([[439,102],[367,60],[287,94],[307,117],[368,97]],'#443b34');
   path([[243,184],[223,237],[256,248],[289,237],[269,184]],'#ae694e');
   c.strokeStyle='#554638';c.lineWidth=8;for(const s of [-1,1])for(let i=0;i<3;i++){c.beginPath();c.moveTo(256+s*35,255+i*8);c.quadraticCurveTo(256+s*95,250+i*17,256+s*(160+i*12),213+i*29);c.stroke();}
   c.strokeStyle='#ac4e3d';c.lineWidth=8;for(const s of [-1,1]){c.beginPath();c.moveTo(256+s*156,129);c.lineTo(256+s*188,106);c.stroke();}
  }else if(id==='calendar'){
   c.fillStyle='#e3e5d5';c.fillRect(0,0,512,640);c.strokeStyle='#697566';c.lineWidth=4;c.strokeRect(10,10,492,620);
   c.fillStyle='#566251';c.font='64px "Yu Gothic",sans-serif';c.fillText('10',33,80);
   c.font='bold 38px "Yu Gothic",sans-serif';c.textAlign='center';
   for(let day=1;day<=31;day++){const slot=day+5,col=slot%7,row=Math.floor(slot/7);c.fillStyle=col===0?'#976b62':'#566550';c.fillText(String(day),50+col*68,125+row*52);}
   c.save();c.translate(0,430);c.scale(1,1.65);c.fillStyle='#61715e';c.font='bold 97px "Yu Gothic","Meiryo",sans-serif';c.fillText('さとう酒店',256,105,478);c.restore();
  }else if(id==='bucket'){

   c.fillStyle='#dec393';c.fillRect(0,0,512,256);c.strokeStyle='#a17b58';c.lineWidth=5;
   for(const x of [54,177,302,426]){c.beginPath();c.moveTo(x-12,62);c.lineTo(x+12,62);c.moveTo(x,47);c.lineTo(x,77);c.stroke();c.beginPath();c.moveTo(x+40,153);c.lineTo(x+62,153);c.moveTo(x+51,139);c.lineTo(x+51,168);c.stroke();}
   c.lineWidth=2.5;for(let i=0;i<15;i++){const x=18+(i*73)%490,y=95+(i%4)*27;c.beginPath();c.moveTo(x,y);c.lineTo(x+10+(i%3)*3,y+2);c.stroke();}
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.name='客厅图案:'+id;t.anisotropy=4;resources.add(t);cache.set(id,t);return t;
 };
}
