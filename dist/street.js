import { THREE, world, random, box, cyl, sphere, tube, group, toon, glow, white, dark, metal, glass, canvasMap, face, label, point, halo, groundGlow } from './world.js';
import { poster } from './store.js';

export const signalLights=[];
const curb=toon('#8a9f9f');
const roadPaint=toon('#b9c4b6',.03);
const amber=glow('#ffcf78',2.5);
function torus(radius,thick,x,y,z,mat,parent=world){const m=new THREE.Mesh(new THREE.TorusGeometry(radius,thick,7,32),mat);m.position.set(x,y,z);parent.add(m);return m;}

function vendingMachine(x,z) {
  const g=group(x,.24,z,-.1);box(.98,1.96,.7,0,.98,0,toon('#bd6059'),g);
  box(1.02,.07,.74,0,1.99,0,toon('#d78772'),g);
  box(.79,1.12,.03,-.035,1.23,.366,dark,g);
  box(.74,1.03,.018,-.035,1.24,.39,glow('#d8eccc',.75),g,false);
  for(let row=0;row<3;row++)for(let col=0;col<5;col++) {
    const px=-.32+col*.14,py=.89+row*.33;const color=['#6caca0','#dba45a','#d76a57','#7e9aac','#e5d6b1'][(col+row)%5];
    cyl(.043,.045,.17,px,py,.43,toon(color,.25),g,8);cyl(.03,.03,.028,px,py+.1,.43,white,g,8);
    box(.06,.05,.004,px,py,.476,white,g,false);box(.08,.023,.02,px,py-.135,.47,glow('#8bcea9',.75),g,false);
  }
  box(.61,.19,.05,-.08,.37,.361,dark,g);box(.55,.04,.075,-.08,.27,.4,metal,g);
  box(.1,.24,.032,.35,.65,.381,toon('#324b50'),g);box(.055,.035,.02,.35,.69,.405,glow('#95c5a0'),g,false);
  face(.84,.24,0,1.8,.375,label('つめた〜い','COLD DRINKS','#4d9a9a','#f1e3be'),g,0,1.2);
  face(.75,.13,-.02,.56,.384,label('ひとやすみ。','','#b65e54','#f4ddad'),g);
  halo(x,1.45,z+.44,'#9addd9',2,.16);groundGlow(x,z+1.5,1.5,2.5,'#7ee9cd',.12);
}
function bicycle(x,z) {
  const g=group(x,.26,z,Math.PI/2+.12);const frame=toon('#b49c67');const tyre=toon('#23333d');
  for(const px of [-.56,.56]) {
    torus(.36,.036,px,.38,0,tyre,g);torus(.31,.014,px,.38,0,metal,g);
    for(let j=0;j<12;j++){const a=j/12*Math.PI*2;tube([[px,.38,0],[px+Math.cos(a)*.31,.38+Math.sin(a)*.31,0]],.006,metal,g);}
    cyl(.048,.048,.12,px,.38,0,metal,g).rotation.x=Math.PI/2;
  }
  const a=[-.56,.38,0],b=[-.17,.88,0],c=[0,.38,0],d=[.35,.9,0],e=[.56,.38,0];
  tube([a,b,c,a],.025,frame,g);tube([b,d,c],.026,frame,g);tube([c,e,d,[.3,1.09,0]],.026,frame,g);
  tube([b,[-.2,1.02,0]],.025,metal,g);box(.25,.055,.13,-.24,1.03,0,tyre,g);
  tube([[.3,1.09,-.18],[.3,1.09,.18]],.023,metal,g);tube([[.3,1.09,-.18],[.19,1.09,-.2]],.035,tyre,g);
  tube([[0,.38,0],[.1,.31,.13],[.22,.31,.13]],.018,metal,g);box(.14,.035,.08,.2,.31,.13,tyre,g);
  tube([[.0,.38,0],[-.14,.25,-.1],[-.22,.25,-.1]],.018,metal,g);
  tube([[.17,.5,.05],[.1,.03,.23]],.016,metal,g);
  tube([[-.74,.82,0],[-.32,.82,0]],.02,metal,g);
  // Wire basket with individual slats.
  box(.36,.025,.29,.57,.83,0,metal,g,false);
  for(let i=0;i<6;i++){tube([[.4+i*.065,.83,-.15],[.4+i*.065,1.08,-.18]],.008,metal,g);tube([[.4+i*.065,.83,.15],[.4+i*.065,1.08,.18]],.008,metal,g);}
  tube([[.38,1.08,-.18],[.77,1.08,-.18],[.77,1.08,.18],[.38,1.08,.18],[.38,1.08,-.18]],.015,metal,g);
  sphere(.045,.56,.92,.19,glow('#d5d3ad'),g);
}
function umbrellaRack() {
  const g=group(.96,.27,2.06);box(.57,.06,.48,0,.07,0,dark,g);
  for(let xx of [-.28,.28])for(let zz of [-.23,.23])cyl(.018,.018,.52,xx,.3,zz,metal,g,6);
  tube([[-.28,.53,-.23],[.28,.53,-.23],[.28,.53,.23],[-.28,.53,.23],[-.28,.53,-.23]],.017,metal,g);
  for(let i=0;i<4;i++){
    const xx=-.18+i*.12,zz=(i%2)*.2-.1;
    cyl(.052,.015,.59,xx,.38,zz,toon(['#668e9a','#d9d2be','#cc916f','#91aaa4'][i]),g,7);
    tube([[xx,.66,zz],[xx,.84,zz],[xx+.035,.9,zz],[xx+.085,.88,zz],[xx+.088,.83,zz]],.013,metal,g,true);
  }
}
function aircon(x,z,rot=0) {
  const g=group(x,.24,z,rot);box(1.03,.72,.43,0,.42,0,toon('#bdc3b7'),g);box(1.05,.055,.48,0,.8,0,white,g);
  const fan=cyl(.25,.25,.015,-.18,.43,.229,dark,g,24);fan.rotation.x=Math.PI/2;
  for(let i=0;i<10;i++)box(.48,.015,.02,-.18,.22+i*.045,.252,metal,g,false);
  for(let i=0;i<7;i++)box(.22,.014,.02,.32,.27+i*.053,.244,metal,g,false);
  for(let xx of [-.38,.38])box(.14,.1,.56,xx,.06,0,metal,g);
  tube([[.5,.38,-.14],[.65,.38,-.14],[.65,1.4,-.14],[.49,1.4,-.14]],.029,white,g);
}
function pole() {
  const g=group(-5.87,.2,2.9);const concrete=toon('#697b83');
  cyl(.11,.17,7.45,0,3.725,0,concrete,g,10);cyl(.19,.19,.32,0,.16,0,toon('#3d525a'),g);
  for(let y of [1.15,1.31,1.47,1.63])cyl(.172,.172,.08,0,y,0,toon('#d1ac65'),g,10);
  box(1.57,.12,.13,0,6.66,0,metal,g);box(1.24,.10,.13,0,7.15,0,metal,g);
  for(let xx of [-.67,0,.67]){cyl(.055,.055,.29,xx,6.87,0,toon('#bdc8bc'),g);for(let y of [6.79,6.88,6.96])cyl(.09,.09,.027,xx,y,0,white,g);}
  cyl(.23,.23,.64,.28,5.75,0,metal,g,14);tube([[.24,6.11,0],[.24,6.33,0],[-.15,6.33,0]],.027,dark,g);
  box(.32,.65,.17,-.07,3.48,.2,toon('#53646e'),g);
  for(let y of [3.18,3.8,5.4])cyl(.125,.125,.06,0,y,0,metal,g);
  const pl=face(.22,.68,-.01,2.35,.174,label('雨待町','2丁目','#d7d8bf','#485d60',128,400),g);
  tube([[0,5.15,0],[.15,5.35,0],[.95,5.35,0],[1.12,5.13,0]],.045,metal,g,true);
  box(.58,.12,.25,.97,5.13,0,dark,g);box(.48,.025,.2,.97,5.055,0,amber,g,false);
  point('#ffd69a',16,7,.97,4.98,0,g);halo(.97,5.05,0,'#ffca78',1.5,.28,g);
  // All overhead cables terminate on poles inside the square base.
  const wire=toon('#172b38');
  for(let offset of [-.61,.04,.65])tube([[-5.87+offset,7.05,2.9],[-5.5+offset,6.36,-1.0],[-5.2+offset,6.72,-5.75]],.018,wire,world,true);
  tube([[-5.87,6.75,2.9],[-1.1,5.95,2.05],[6.3,6.1,1.4]],.022,wire,world,true);
  tube([[-5.87,6.47,2.9],[-1.1,5.76,2.05],[6.3,5.88,1.4]],.014,wire,world,true);
  cyl(.095,.14,6.62,-5.2,3.51,-5.75,concrete);box(1.52,.1,.12,-5.2,6.64,-5.75,metal);
  cyl(.065,.09,5.96,6.3,3.15,1.4,metal);box(.48,.075,.1,6.3,6.12,1.4,metal);
  // Small blue location sign mounted on the pole, not a screen overlay.
  box(.97,.35,.06,0,4.44,.17,toon('#467d87'),g);
  face(.91,.29,0,4.44,.206,label('雨待町 ２','AMEMACHI','#467d87','#dde8d2'),g);
}
function guardrail(x,z,length,rotation=0) {
  const g=group(x,.2,z,rotation);const paint=toon('#bac4b6');
  for(let xx of [-length/2,length/2]){cyl(.04,.04,.76,xx,.38,0,paint,g,10);cyl(.085,.085,.045,xx,.025,0,dark,g,10);}
  tube([[-length/2,.72,0],[length/2,.72,0]],.043,paint,g);tube([[-length/2,.35,0],[length/2,.35,0]],.029,paint,g);
  for(let xx of [-length/2,length/2])box(.10,.12,.025,xx,.56,.04,toon('#d8ac68'),g,false);
}
export function buildStreet() {
  box(14.25,.19,14.25,0,-.63,0,toon('#142b3a'));
  box(14,.62,14,0,-.24,0,toon('#294553'));
  box(14.04,.045,14.04,0,-.54,0,toon('#526b72'));
  box(13.94,.065,13.94,0,.045,0,toon('#293c4a'));
  // One continuous pavement block leaves an L-shaped road along two sides.
  box(11.4,.19,10.31,-1.2,.14,-1.765,toon('#768c8b'));
  const paving=toon('#788f8c');
  for(let i=0;i<21;i++)for(let j=0;j<18;j++) {
    const x=-6.62+i*.54,z=-6.55+j*.56;
    if(x>-4.5&&x<3.32&&z>-4.75&&z<1.54)continue;
    box(.52,.013,.54,x,.244,z,j%2?toon('#788f8c'):toon('#7a908d'),world,false);
  }
  for(let i=0;i<19;i++)box(.58,.18,.19,-6.55+i*.58,.19,3.4,curb);
  for(let i=0;i<18;i++)box(.19,.18,.57,4.43,.19,-6.55+i*.57,curb);
  // Rain gutters and regularly spaced metal drainage slots.
  box(11.5,.017,.14,-1.19,.091,3.58,toon('#1d343e'),world,false);
  box(.14,.017,10.6,4.6,.091,-1.62,toon('#1d343e'),world,false);
  for(let x of [-5.3,-.1,3.2]) {box(.75,.02,.26,x,.102,3.6,dark);for(let i=0;i<10;i++)box(.024,.014,.23,x-.33+i*.073,.122,3.6,metal,world,false);}
  for(let z of [-4,-.8,2]) {box(.26,.02,.7,4.6,.102,z,dark);for(let i=0;i<9;i++)box(.23,.015,.023,4.6,.122,z-.3+i*.075,metal,world,false);}
  // Reflective zebra crossing and road edge markings.
  for(let i=0;i<6;i++)box(2.12,.009,.32,-2.65,.1,3.87+i*.49,roadPaint,world,false);
  for(let x of [-6,-4.75,.0,1.25,2.5,3.75,5])box(.75,.007,.055,x,.1,6.8,roadPaint,world,false);
  for(let z of [-6,-4.6,-3.2,-1.8,-.4,1,2.4])box(.055,.007,.85,6.75,.1,z,roadPaint,world,false);
  box(.04,.009,2.12,-6.47,.26,-3.4,roadPaint,world,false);box(.04,.009,2.12,-4.9,.26,-3.4,roadPaint,world,false);box(1.61,.009,.04,-5.68,.26,-4.46,roadPaint,world,false);
  const parking=face(.48,.58,-5.68,.266,-3.5,label('P','','#78908c','#d7d7bb'));parking.rotation.x=-Math.PI/2;
  box(.7,.11,.16,-5.66,.3,-4.1,toon('#a9b2a2'));
  // Asphalt manhole with radial cast-iron details.
  const lid=cyl(.47,.47,.016,1.96,.102,5.35,dark,world,32);
  const ring=torus(.42,.018,1.96,.117,5.35,metal);ring.rotation.x=-Math.PI/2;
  for(let i=0;i<9;i++)box(.54,.007,.016,1.96,.117,5.09+i*.062,metal,world,false);
  for(let i=0;i<7;i++)box(.016,.008,.55,1.75+i*.07,.119,5.35,metal,world,false);
  vendingMachine(-5.15,.78);bicycle(3.88,-.95);umbrellaRack();aircon(-4.85,-1.25,Math.PI/2);
  // Quiet rear service alley, conduit, pallets and utility door.
  aircon(-1.3,-5.2,Math.PI);box(.12,1.1,.11,-4.57,.82,-3.2,metal);
  for(let i=0;i<3;i++)box(.84,.16,.7,-3.5,.33+i*.17,-5.27,toon('#826b54'));
  tube([[2.7,.31,-4.73],[2.7,2.84,-4.73],[-.9,2.84,-4.73],[-.9,3.4,-4.73]],.028,metal);
  for(let y of [1.15,2.15])box(.4,.5,.12,1.2,y,-4.75,toon('#819791'));
  // Separate recycling bins with colored lids and front labels.
  for(let i=0;i<2;i++) {
    const x=2.15+i*.59;box(.49,.79,.47,x,.64,2.12,toon('#b7c1b7'));
    box(.51,.11,.49,x,1.08,2.12,toon(i?'#5e8c8b':'#74859a'));
    const slot=cyl(.09,.09,.016,x,1.14,2.12,dark,world,12);
    face(.25,.22,x,.78,2.362,label(i?'ビン':'カン','RECYCLE','#bcc8bb','#486b69'));
  }
  // A-board, framed notice board and small plants remain part of the model.
  const board=group(-1.55,.26,2.26,.12);const boardPanel=box(.66,.91,.045,0,.63,0,toon('#725a43'),board);boardPanel.rotation.x=-.1;
  for(let xx of [-.31,.31])tube([[xx,0,-.22],[xx,1.12,0],[xx,0,.28]],.025,toon('#a68d69'),board);
  poster(1,.57,.8,0,.64,.035,board);box(.7,.055,.08,0,1.1,0,toon('#af9977'),board);
  box(.075,1.32,.07,-5.25,.9,-5.2,metal);box(1.15,.93,.075,-5.25,1.58,-5.2,toon('#718c83'));
  box(1.04,.82,.02,-5.25,1.58,-5.15,toon('#cfbc92'));
  poster(0,.43,.59,-5.49,1.61,-5.13);poster(2,.43,.59,-5.01,1.61,-5.13);
  for(const [x,z] of [[-4.13,2.3],[3.89,-3.6],[-6.2,-5.5]]){
    cyl(.19,.14,.27,x,.39,z,toon('#af7e61'),world,10);cyl(.20,.20,.05,x,.54,z,toon('#bb9070'),world,10);
    for(let i=0;i<7;i++) {const a=i*2.4;const leaf=sphere(.15,x+Math.cos(a)*.15,.65+random()*.28,z+Math.sin(a)*.15,toon(i%2?'#477466':'#6f9175'));leaf.scale.set(.6,1.6,.6);leaf.rotation.z=Math.sin(a)*.5;}
  }
  guardrail(1.8,3.13,1.6);guardrail(4.14,-4.8,1.6,Math.PI/2);guardrail(-5.47,3.16,1.8);
  pole();
  // Distant traffic light: a gentle red/green cycle on the far corner.
  const tg=group(5.57,.1,-5.6);cyl(.065,.09,4.4,0,2.2,0,metal,tg);
  tube([[0,4.26,0],[-.14,4.44,0],[-.86,4.44,0]],.046,metal,tg,true);
  box(1.02,.36,.28,-.64,4.42,0,dark,tg);
  for(let i=0;i<3;i++){
    const m=glow(['#66dfaf','#e0bc6c','#ed796c'][i],i===2?1.6:.13);
    const light=cyl(.106,.106,.025,-.97+i*.33,4.42,.156,m,tg,16);light.rotation.x=Math.PI/2;signalLights.push(m);
    const hood=cyl(.13,.13,.18,-.97+i*.33,4.46,.17,dark,tg,12,true);hood.rotation.x=Math.PI/2;
    // Lens in front of the hood.
    const front=cyl(.094,.094,.01,-.97+i*.33,4.42,.27,m,tg,16);front.rotation.x=Math.PI/2;
  }
  face(.62,.25,0,3.72,.083,label('止まれ','','#c77669','#f4e4c6'),tg);
  const stop=cyl(.34,.34,.055,5.63,2.65,-3.42,toon('#b9685d'),world,3);stop.rotation.x=Math.PI/2;stop.rotation.z=Math.PI;
  cyl(.027,.027,2.6,5.63,1.38,-3.43,metal);
  groundGlow(-.4,3.9,6,3.5,'#efb765',.14);groundGlow(4.9,-.8,2.8,6,'#79bfae',.09);
}

export function updateStreet(time) {
  const p=time%32;const active=p<17?2:p<29?0:1;
  signalLights.forEach((m,i)=>m.color.set(['#66dfaf','#e0bc6c','#ed796c'][i]).multiplyScalar(i===active?1.9:.15));
}
