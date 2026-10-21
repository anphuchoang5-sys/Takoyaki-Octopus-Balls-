// Local illustrated surfaces, drawn in code. These are not photographs of furniture.
// Small illegible writing and unseen poster areas are intentionally not invented.
export function makeSistersArt(THREE, resources) {
 const cache=new Map();
 function texture(kind){
  if(cache.has(kind))return cache.get(kind);
  const c=document.createElement('canvas');c.width=512;c.height=kind==='momoe'?562:512;
  const a=c.getContext('2d');a.lineJoin='round';a.lineCap='round';
  const rect=(x,y,w,h,color)=>{a.fillStyle=color;a.fillRect(x,y,w,h);};
  const ellipse=(x,y,rx,ry,color)=>{a.fillStyle=color;a.beginPath();a.ellipse(x,y,rx,ry,0,0,Math.PI*2);a.fill();};
  const line=(pts,color,width=4,close=false,fill=null)=>{a.beginPath();a.moveTo(...pts[0]);for(const p of pts.slice(1))a.lineTo(...p);if(close)a.closePath();if(fill){a.fillStyle=fill;a.fill();}a.strokeStyle=color;a.lineWidth=width;a.stroke();};
  const text=(s,x,y,size,color)=>{a.font=`${size}px "Yu Gothic","Arial",sans-serif`;a.fillStyle=color;a.fillText(s,x,y);};
  if(kind==='momoe'||kind==='hideki'){
   rect(0,0,c.width,c.height,kind==='momoe'?'#b47dcc':'#77b3d3');
   if(kind==='momoe'){
    // The upper anime panel is the pose reference. The 225 x 246 drawing
    // space preserves its broad bob, bent microphone arm and cropped sleeve.
    a.save();a.scale(c.width/225,c.height/246);
    const skin='#f2d4cf',hair='#9a6c5e',blouse='#f4d5eb';
    a.fillStyle=hair;a.beginPath();a.moveTo(35,94);
    a.bezierCurveTo(39,78,48,61,58,49);
    a.quadraticCurveTo(69,35,86,30);a.quadraticCurveTo(102,23,119,26);
    a.bezierCurveTo(138,28,153,46,165,64);
    a.quadraticCurveTo(179,85,183,98);
    a.bezierCurveTo(189,114,173,124,158,128);
    a.quadraticCurveTo(115,139,66,128);
    a.bezierCurveTo(44,126,31,111,35,94);a.closePath();a.fill();
    // Pink torso and sleeves form a bent arm on the viewer's left and a
    // separate diagonal sleeve reaching the lower-right edge of the print.
    a.fillStyle=blouse;a.beginPath();a.moveTo(96,163);
    a.quadraticCurveTo(122,158,148,166);
    a.quadraticCurveTo(157,169,162,183);
    a.quadraticCurveTo(169,204,178,215);a.quadraticCurveTo(192,231,201,246);
    a.lineTo(173,246);a.quadraticCurveTo(160,229,149,209);
    a.lineTo(143,229);a.lineTo(158,246);a.lineTo(79,246);a.lineTo(92,228);
    a.lineTo(84,207);a.quadraticCurveTo(78,217,74,224);
    a.bezierCurveTo(66,236,54,231,52,222);
    a.bezierCurveTo(48,212,62,189,70,180);
    a.quadraticCurveTo(80,167,96,163);a.closePath();a.fill();
    a.fillStyle=skin;a.beginPath();a.moveTo(107,144);a.lineTo(119,145);
    a.quadraticCurveTo(117,156,122,159);a.lineTo(139,165);
    a.quadraticCurveTo(118,178,97,164);a.lineTo(108,158);a.closePath();a.fill();
    // Face silhouette and the asymmetric, parted hairline are drawn together.
    a.beginPath();a.moveTo(55,104);
    a.quadraticCurveTo(64,95,71,80);a.quadraticCurveTo(77,72,85,78);
    a.quadraticCurveTo(94,64,104,66);
    a.bezierCurveTo(116,68,127,90,145,97);
    a.quadraticCurveTo(152,100,160,102);
    a.bezierCurveTo(171,106,160,117,154,119);
    a.quadraticCurveTo(139,137,116,148);
    a.quadraticCurveTo(111,151,105,148);
    a.quadraticCurveTo(79,139,65,123);
    a.bezierCurveTo(56,119,49,109,55,104);a.closePath();a.fill();
    a.strokeStyle='#a78482';a.lineWidth=1.2;
    a.beginPath();a.moveTo(71,97);a.quadraticCurveTo(82,90,91,94);
    a.moveTo(117,92);a.quadraticCurveTo(128,87,139,93);a.stroke();
    a.strokeStyle='#947779';a.lineWidth=1.25;
    a.beginPath();a.moveTo(74,106);a.quadraticCurveTo(83,99,91,104);
    a.moveTo(119,104);a.quadraticCurveTo(128,97,136,103);a.stroke();
    ellipse(91,108,3.2,3.6,'#6f5459');ellipse(136,105,3.2,3.6,'#6f5459');
    ellipse(91.6,106.9,1,1.1,'#f9e8e2');ellipse(136.6,103.9,1,1.1,'#f9e8e2');
    line([[111,116],[110.5,120]],'#c3a3a0',1);
    a.strokeStyle='#bc9699';a.lineWidth=1.2;a.beginPath();a.moveTo(108,134);a.quadraticCurveTo(113,137,119,134);a.stroke();
    // Microphone at the left of the chin, hand wrapped around its handle.
    line([[83,171],[81,186]],'#d5b16c',4);
    ellipse(83,162.5,11.3,11.7,'#efd06b');
    a.fillStyle=skin;a.beginPath();a.moveTo(79,177);
    a.quadraticCurveTo(85,171,89,177);a.quadraticCurveTo(93,184,88,191);
    a.quadraticCurveTo(86,199,80,201);a.quadraticCurveTo(72,199,72,194);
    a.quadraticCurveTo(71,187,75,182);a.closePath();a.fill();
    // Large, slightly rising lettering occupies the upper-right of the image.
    a.save();a.translate(108,53);a.rotate(-.16);
    a.font='bold 34px "Arial",sans-serif';a.fillStyle='#fae1ec';
    a.scale(102/a.measureText('MoMoE').width,1);a.fillText('MoMoE',0,0);a.restore();
    a.restore();
   }else{
    // Square print: the supplied oblique view shows swept brown hair reaching
    // the nape, a slight head turn, a blue shirt and a wide white open collar.
    // Facial features are deliberately omitted, as requested by the user.
    // The partly obscured crown is a restrained reconstruction, not a tracing.
    a.fillStyle='#69452f';a.beginPath();a.moveTo(117,280);
    a.bezierCurveTo(93,249,100,216,100,187);
    a.bezierCurveTo(93,151,106,116,130,92);
    a.bezierCurveTo(146,76,153,51,179,48);
    a.bezierCurveTo(200,47,213,59,235,59);
    a.bezierCurveTo(273,56,313,78,329,111);
    a.bezierCurveTo(351,142,344,171,354,197);
    a.bezierCurveTo(377,232,364,268,352,295);
    a.bezierCurveTo(339,324,338,351,350,374);
    a.quadraticCurveTo(356,387,343,389);
    a.quadraticCurveTo(327,390,319,373);
    a.quadraticCurveTo(311,389,322,407);
    a.quadraticCurveTo(304,407,297,391);
    a.lineTo(160,346);a.quadraticCurveTo(143,340,136,328);
    a.quadraticCurveTo(120,339,110,329);a.lineTo(119,313);
    a.quadraticCurveTo(102,317,99,300);a.quadraticCurveTo(120,307,117,280);a.closePath();a.fill();
    // Close shoulder crop leaves the long nape silhouette readable.
    a.fillStyle='#c5dfea';a.beginPath();a.moveTo(70,512);a.lineTo(98,415);
    a.quadraticCurveTo(125,378,193,350);a.lineTo(293,354);
    a.quadraticCurveTo(364,377,416,423);a.lineTo(451,512);a.closePath();a.fill();
    a.fillStyle='#f1b38d';a.beginPath();a.moveTo(196,307);
    a.quadraticCurveTo(209,345,201,367);a.lineTo(233,453);
    a.quadraticCurveTo(255,430,279,379);a.lineTo(278,306);a.closePath();a.fill();
    a.beginPath();a.moveTo(153,139);
    a.bezierCurveTo(173,116,202,108,229,116);
    a.bezierCurveTo(268,123,301,150,316,188);
    a.bezierCurveTo(328,222,320,263,302,291);
    a.quadraticCurveTo(285,319,257,333);
    a.quadraticCurveTo(241,342,224,332);
    a.bezierCurveTo(199,319,179,298,166,271);
    a.bezierCurveTo(153,245,143,219,145,193);
    a.quadraticCurveTo(144,161,153,139);a.closePath();a.fill();
    // Asymmetric, rounded wave across the forehead; no short spiky fringe.
    a.fillStyle='#69452f';a.beginPath();a.moveTo(134,143);
    a.quadraticCurveTo(144,98,181,89);
    a.bezierCurveTo(221,84,278,98,306,127);
    a.quadraticCurveTo(335,155,328,202);a.lineTo(314,239);
    a.quadraticCurveTo(310,202,294,177);a.lineTo(284,155);
    a.bezierCurveTo(269,172,251,167,237,155);
    a.bezierCurveTo(220,140,211,122,189,115);
    a.quadraticCurveTo(161,137,157,173);
    a.quadraticCurveTo(155,213,165,243);a.lineTo(155,272);
    a.quadraticCurveTo(126,241,128,201);a.closePath();a.fill();
    line([[197,347],[219,409],[233,453],[198,421],[174,437],[164,380]],'#f7eee2',2,true,'#f7eee2');
    line([[281,349],[274,399],[233,453],[269,431],[289,447],[310,383]],'#f7eee2',2,true,'#f7eee2');
    line([[198,421],[233,453],[240,512]],'#aac6d6',2.5);
   }
  }else if(kind==='calendar'){
   rect(0,0,512,512,'#f7ece9');rect(0,0,512,245,'#73b7d5');
   ellipse(260,121,143,68,'#b4d78e');line([[363,122],[454,65],[447,179]],'#a5ce80',2,true,'#a5ce80');
   line([[121,85],[120,157],[76,121]],'#ead68a',2,true,'#ead68a');ellipse(135,105,6,7,'#526e67');
   for(let r=0;r<3;r++)for(let i=0;i<5;i++)ellipse(190+i*29,85+r*31,9,3,'#77ae83');
   line([[218,41],[266,32],[313,38]],'#efdd90',13);
   for(const [x,y] of [[72,58],[64,177],[461,46],[450,192]]){line([[x,y],[x+12,y+15]],'#f6eaa7',5);line([[x+19,y-4],[x+23,y+12]],'#f6eaa7',5);}
   text('7',24,287,44,'#938982');text('8',274,287,44,'#938982');
   for(let m=0;m<2;m++)for(let r=0;r<6;r++)for(let i=0;i<7;i++)rect(26+m*250+i*29,320+r*25,21,18,i===0?'#d88a9e':'#b2a6b1');
   for(let m=0;m<2;m++)for(let i=0;i<7;i++)rect(28+m*250+i*29,302,18,4,'#a99caa');
  }else if(kind==='tulip'){
   rect(0,0,512,512,'#f8dfe7');a.strokeStyle='#d78eb5';a.lineWidth=13;a.strokeRect(26,28,460,456);a.lineWidth=6;a.strokeRect(76,78,360,356);
   for(let i=0;i<4;i++){ellipse(104+i*100,52,5,5,'#d78eb5');ellipse(104+i*100,460,5,5,'#d78eb5');ellipse(51,105+i*100,5,5,'#d78eb5');ellipse(462,105+i*100,5,5,'#d78eb5');}
   line([[250,280],[251,365]],'#d78eb5',16);
   a.fillStyle='#d78eb5';a.beginPath();a.moveTo(181,186);a.quadraticCurveTo(193,204,216,209);a.lineTo(251,179);a.lineTo(285,210);a.quadraticCurveTo(307,201,321,184);a.bezierCurveTo(334,264,302,297,251,298);a.bezierCurveTo(200,298,166,265,181,186);a.fill();
   ellipse(207,331,30,15,'#d78eb5');ellipse(297,331,30,15,'#d78eb5');
  }else if(kind==='checked'){
   rect(0,0,512,512,'#edf0b3');for(let i=0;i<512;i+=128){rect(i,0,24,512,'#729b52');rect(0,i,512,24,'#83ab55');rect(i+33,0,8,512,'#b1c985');rect(0,i+33,512,8,'#b1c985');}
  }else if(kind==='lamp'){
   rect(0,0,512,512,'#fff1d5');for(let i=0;i<=512;i+=64)rect(i,0,5,512,'#c78a67');for(let i=32;i<512;i+=100)rect(0,i,512,6,'#c78a67');
  }else if(kind==='dots'||kind==='outlined-circles'){
   rect(0,0,512,512,kind==='dots'?'#c58fc6':'#e38fb6');
   for(const [x,y,r,c] of [[110,83,71,'#de74b4'],[391,184,91,'#efe477'],[125,348,75,'#ecd76e'],[440,478,92,'#e9a472']]){
    if(kind==='dots')ellipse(x,y,r,r,c);else{a.strokeStyle='#7d4e76';a.lineWidth=7;a.beginPath();a.arc(x,y,r*.8,0,Math.PI*2);a.stroke();}
   }
  }else if(kind==='grid-note'){
   rect(0,0,512,512,'#c5d3ac');for(let i=20;i<512;i+=31){rect(i,0,3,512,'#91ac85');rect(0,i,512,3,'#91ac85');}
  }else if(kind==='pages'||kind==='magazine'){
   rect(0,0,512,512,'#fff5db');
   if(kind==='magazine'){rect(20,20,215,120,'#8ab7cf');rect(280,35,210,50,'#e67a9a');ellipse(380,165,58,60,'#c3d49d');text('♪',74,117,61,'#f4e3b4');}
   for(let col=0;col<2;col++)for(let j=0;j<16;j++){const y=(kind==='magazine'?250:30)+j*25;if(y<490)rect(20+col*260,y,150+((j*17)%65),4,j%4===0?'#897a71':'#b0a293');}
   rect(254,0,4,512,'#d3c7ab');
  }else if(kind==='cover'){
   rect(0,0,512,512,'#8dc2d5');rect(0,0,512,95,'#e89cc1');text('♪',40,82,67,'#fef0b7');ellipse(276,300,115,128,'#845a4a');ellipse(277,323,89,102,'#f5c6aa');ellipse(244,313,8,11,'#564941');ellipse(315,313,8,11,'#564941');line([[255,360],[281,369],[302,360]],'#b87874',5);
  }else if(kind==='snack'){
   rect(0,0,512,512,'#eee385');for(let x=0;x<512;x+=32)rect(x,0,16,512,'#a6c28d');rect(0,73,512,360,'#f4df78');rect(0,192,512,128,'#d77956');text('P O T A T O',36,271,45,'#6c5545');ellipse(373,374,56,24,'#e8bd57');
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.name='sisters:'+kind;cache.set(kind,t);resources.add(t);return t;
 }
 return texture;
}
