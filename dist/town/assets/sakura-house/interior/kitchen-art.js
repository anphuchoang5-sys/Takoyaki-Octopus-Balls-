// Small paper and textile drawings, recreated locally from the supplied frames.
// Appliances, dishes, shelving and cloth folds are geometry, not photo cutouts.
export function kitchenArt(THREE,resources){
 const cache=new Map();
 return id=>{if(cache.has(id))return cache.get(id);const a=document.createElement('canvas');a.width=512;a.height=id==='calendar'?720:384;const c=a.getContext('2d');
  const poly=(p,color)=>{c.fillStyle=color;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  const ellipse=(x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();};
  c.fillStyle='#f5f0d9';c.fillRect(0,0,a.width,a.height);
  if(id==='calendar'){
   c.fillStyle='#a8cee2';c.fillRect(18,18,476,240);poly([[36,249],[221,51],[265,85],[304,64],[480,249]],'#617ba7');poly([[169,109],[221,51],[265,85],[304,64],[357,124],[303,105],[268,127],[226,96],[201,126]],'#f7f7e9');
   for(let row=0;row<5;row++)for(let col=0;col<7;col++){c.fillStyle=col===0?'#c86f73':col===6?'#6b9cb4':'#878b8a';c.fillRect(36+col*68,320+row*64,19+(row+col)%3*2,23);}
   c.fillStyle='#c97d7e';c.fillRect(25,658,462,10);c.fillStyle='#819dac';c.fillRect(173,688,148,9);
  }else if(id==='runner'){
   c.fillStyle='#aa8050';c.fillRect(0,0,512,384);for(const x of [18,423]){c.fillStyle='#98704e';c.fillRect(x,0,72,384);for(let y=0;y<384;y+=64)poly([[x,y],[x+70,y+32],[x,y+64]],'#d9bd63');}c.strokeStyle='#bc965e';c.lineWidth=2;for(let y=3;y<384;y+=6){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
  }else if(id==='note'){
   c.strokeStyle='#b7b1ac';c.lineWidth=3;for(let y=110;y<300;y+=47){c.beginPath();c.moveTo(70,y);c.lineTo(385-(y%73),y);c.stroke();}
  }else if(id==='animal'){
   c.fillStyle='#e5f0d9';c.fillRect(0,0,512,384);poly([[102,334],[240,212],[403,318],[390,367]],'#63a4ba');ellipse(260,170,155,114,'#e6b16d');poly([[124,155],[88,67],[185,95]],'#e6b16d');poly([[345,90],[416,62],[408,172]],'#e6b16d');for(const [x,y]of[[185,135],[292,125],[349,169]])ellipse(x,y,12,24,'#ae805d');ellipse(225,190,9,13,'#785c48');ellipse(315,190,9,13,'#785c48');poly([[261,212],[283,212],[270,232]],'#c37c68');
  }else if(id==='flower'){
   c.fillStyle='#e5edd6';c.fillRect(0,0,512,384);c.strokeStyle='#5a9f6c';c.lineWidth=15;c.beginPath();c.moveTo(255,185);c.lineTo(250,360);c.stroke();for(let i=0;i<7;i++){const t=i*7/7;ellipse(256+65*Math.cos(t),150+60*Math.sin(t),47,39,'#d77277');}ellipse(256,150,39,35,'#e2b955');poly([[253,287],[157,237],[165,308]],'#6baf72');
  }else if(id==='cloth'){
   c.fillStyle='#eff4e6';c.fillRect(0,0,512,384);c.fillStyle='#d6b78c';for(let x=15;x<512;x+=41){c.beginPath();c.ellipse(x,351,4,12,-.25,0,7);c.fill();}
  }
  const t=new THREE.CanvasTexture(a);t.colorSpace=THREE.SRGBColorSpace;t.name='厨房图案:'+id;t.anisotropy=4;resources.add(t);cache.set(id,t);return t;
 };
}
