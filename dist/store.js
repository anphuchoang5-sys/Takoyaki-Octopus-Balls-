import { THREE, world, dynamic, random, box, cyl, tube, group, toon, glow, white, dark, metal, glass, canvasMap, face, label, point, halo } from './world.js';

export const doors = [];
export const shopSign = glow('#fff0c8', 1.25);
const teal = toon('#387f78');
const cream = toon('#d5d8c4', .05);
const packageColors = ['#d65a4f', '#ddb75a', '#5b9980', '#e9d9a7', '#799eb1', '#a37ba8'];
const packageMats = packageColors.map(c => toon(c, .12));
const whiteLabel = toon('#f4ebce', .15);
const mainSign = canvasMap(1536, 280, c => {
  c.fillStyle = '#eee9d0'; c.fillRect(0, 0, 1536, 280);
  c.fillStyle = '#377e74'; c.fillRect(0, 0, 1536, 22); c.fillRect(0, 253, 1536, 27);
  c.fillStyle = '#d8b76e'; c.fillRect(0, 234, 1536, 8);
  c.fillStyle = '#397c70'; c.beginPath(); c.arc(125, 125, 77, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ede8cb'; c.beginPath(); c.arc(145, 104, 65, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#397c70'; c.font = '800 125px "Arial", sans-serif'; c.textAlign = 'left'; c.fillText('AME MART', 253, 166);
  c.font = '600 28px "Yu Gothic", "Meiryo", sans-serif'; c.fillText('雨 待 ち 商 店', 265, 209);
  c.textAlign = 'right'; c.fillStyle = '#be8650'; c.font = '700 62px Arial'; c.fillText('24', 1460, 137);
  c.font = '500 23px Arial'; c.fillText('HOURS', 1461, 171);
  c.font = '400 21px "Yu Gothic", sans-serif'; c.fillText('いつでも、ここに。', 1461, 210);
});
const posterTextures = [
  canvasMap(256, 350, c => { c.fillStyle = '#e6b867'; c.fillRect(0,0,256,350); c.fillStyle='#325e56'; c.textAlign='center'; c.font='bold 29px "Yu Gothic",sans-serif'; c.fillText('ほっと、ひと息。',128,51); c.fillStyle='#f7ebc8'; c.beginPath();c.ellipse(128,195,79,60,0,0,7);c.fill(); c.fillStyle='#663e29';c.beginPath();c.ellipse(128,177,61,27,0,0,7);c.fill(); c.strokeStyle='#fff4d2';c.lineWidth=5;for(let i=0;i<3;i++){c.beginPath();c.moveTo(101+i*24,136);c.bezierCurveTo(77+i*24,106,124+i*24,101,103+i*24,79);c.stroke();} c.fillStyle='#325e56';c.font='bold 27px Arial';c.fillText('COFFEE  ¥120',128,302); }),
  canvasMap(256,350,c=>{c.fillStyle='#f1dec5';c.fillRect(0,0,256,350);c.fillStyle='#bb644e';c.textAlign='center';c.font='bold 37px "Yu Gothic",sans-serif';c.fillText('おでん',128,58);c.font='20px "Yu Gothic",sans-serif';c.fillText('今夜も、あったか。',128,94);c.fillStyle='#526d69';c.beginPath();c.ellipse(128,245,98,43,0,0,7);c.fill();for(let i=0;i<5;i++){c.fillStyle=['#d8ae68','#edcd8d','#ae7946'][i%3];c.beginPath();c.ellipse(71+i*29,212+Math.sin(i*4)*20,24,21,0,0,7);c.fill();}c.fillStyle='#865541';c.font='bold 27px Arial';c.fillText('70 yen ~',128,319);}),
  label('新発売', '季節のおむすび  ¥150', '#e8d7a2', '#547e5f', 256, 350)
];
export function poster(i, w, h, x, y, z, parent=world, rot=0) { return face(w,h,x,y,z,posterTextures[i%3],parent,rot); }

function bottle(x,y,z,color,parent=world,scale=1) {
  cyl(.046*scale,.052*scale,.19*scale,x,y+.095*scale,z,color,parent,8);
  cyl(.025*scale,.04*scale,.045*scale,x,y+.21*scale,z,white,parent,8);
  box(.087*scale,.066*scale,.004,x,y+.11*scale,z+.05*scale,whiteLabel,parent,false);
}
function pack(x,y,z,i,parent=world) {
  const h=.17+(i%3)*.022;
  const p=box(.11,h,.10,x,y+h/2,z,packageMats[i%packageMats.length],parent,false);p.rotation.z=Math.sin(i*3)*.06;
  box(.075,.055,.004,x,y+h*.57,z+.052,whiteLabel,parent,false);
}
function riceball(x,y,z,parent) {
  const tri = new THREE.Shape(); tri.moveTo(-.075,0);tri.lineTo(0,.13);tri.lineTo(.075,0);tri.closePath();
  const geo = new THREE.ExtrudeGeometry(tri,{depth:.075,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.009,bevelThickness:.009});
  const m=new THREE.Mesh(geo,whiteLabel);m.position.set(x,y,z);parent.add(m);
  box(.045,.065,.082,x,y+.035,z+.037,toon('#254438'),parent,false);
}
function shelf(x,z,type=0) {
  const g=group(x,.32,z); box(.055,1.34,1.7,0,.67,0,toon('#b7b49a'),g);
  for(const xx of [-.4,.4])for(const zz of [-.87,.87])box(.045,1.5,.045,xx,.75,zz,white,g);
  for(let level=0;level<4;level++) {
    const y=.16+level*.32;
    box(.86,.045,1.8,0,y,0,white,g);
    box(.86,.055,.035,0,y-.014,.9,toon('#cea667'),g,false);
    for(let col=0;col<5;col++) for(let row=0;row<2;row++) {
      const px=-.29+col*.145, pz=.73-row*.22;
      if(type===1&&level<2) riceball(px,y+.026,pz,g); else pack(px,y+.025,pz,col+row*2+level+type,g);
      pack(px,y+.025,-.8+row*.2,col+level+2,g);
    }
    for(let row=0;row<5;row++)for(let side of [-1,1]) {
      const item=group(side*.29,0,-.55+row*.25,side*Math.PI/2,g);
      if(type===1&&level<2)riceball(0,y+.026,0,item);else pack(0,y+.025,0,row+level+type,item);
    }
    for(let i=0;i<4;i++) box(.10,.025,.003,-.3+i*.2,y-.01,.92,whiteLabel,g,false);
  }
  face(.68,.18,0,1.47,.91,label(type===1?'おむすび':'お菓子', '', '#eddda7','#5b6d54'),g);
}
function fridge(x) {
  const g=group(x,.32,-4.17);box(1.36,2.27,.55,0,1.135,0,dark,g);
  box(1.24,2.02,.1,0,1.1,.27,toon('#badbd2',.35),g);
  for(let j=0;j<5;j++) {
    const y=.25+j*.34;box(1.21,.035,.35,0,y,.37,white,g);
    for(let k=0;k<9;k++) bottle(-.52+k*.13,y+.023,.37,packageMats[(k+j)%6],g,.8);
  }
  for(let i=0;i<3;i++) {
    const xx=-.44+i*.44;box(.024,1.85,.04,xx-.21,1.15,.55,metal,g,false);
    box(.026,.36,.045,xx+.12,1.17,.58,white,g,false);
    box(.41,1.86,.008,xx,1.13,.565,glass,g,false);
  }
  box(1.23,.055,.05,0,2.13,.32,glow('#d0fff0',1.6),g,false);
  face(1.18,.17,0,2.27,.30,label('冷たい飲みもの','', '#467c71','#f6e7bc'),g);
}
export function buildStore() {
  // Raised foundation, warm tiled floor and solid service walls.
  box(7.9,.14,6.35,-.6,.27,-1.6,toon('#b8b7a5'));
  box(7.6,.06,6,-.6,.36,-1.6,toon('#ddd2b0',.22));
  for(let i=0;i<13;i++)box(.012,.003,5.93,-4.3+i*.6,.393,-1.6,toon('#bcb79f'),world,false);
  for(let i=0;i<11;i++)box(7.55,.003,.012,-.6,.394,-4.55+i*.58,toon('#bcb79f'),world,false);
  box(7.72,2.86,.16,-.6,1.78,-4.6,cream);
  box(.16,2.86,6.03,-4.4,1.78,-1.6,cream);
  // Ceramic tiles along the low walls.
  box(7.65,.27,.16,-.6,.49,1.4,teal);
  box(.16,.27,6.04,3.2,.49,-1.6,teal);
  for(let i=0;i<24;i++)box(.018,.27,.01,-4.35+i*.32,.49,1.489,toon('#5c8e83'),world,false);
  for(let i=0;i<19;i++)box(.01,.27,.018,3.289,.49,-4.5+i*.32,toon('#5c8e83'),world,false);
  // Front glazing, door opening and fine metal mullions.
  const panes=[[-3.31,2.02],[-1.68,1.18],[1.98,2.31]];
  for(const [x,w] of panes)box(w,2.32,.016,x,1.78,1.411,glass,world,false);
  for(const x of [-4.39,-2.28,-1.06,.79,3.2])box(.065,2.7,.09,x,1.78,1.43,metal);
  box(7.68,.075,.1,-.6,.65,1.43,metal);box(7.68,.07,.1,-.6,2.96,1.43,metal);
  for(const z of [-4.59,-2.6,-.61,1.4])box(.09,2.7,.065,3.22,1.78,z,metal);
  for(const z of [-3.59,-1.6,.4])box(.016,2.3,1.94,3.211,1.8,z,glass,world,false);
  box(.1,.07,6.05,3.22,2.96,-1.6,metal);box(.1,.07,6.05,3.22,.65,-1.6,metal);
  // Storefront safety stripe, kept narrow so the interior remains clearly visible.
  for(const [x,w] of panes){box(w,.055,.006,x,1.32,1.432,teal,world,false);box(w,.018,.006,x,1.26,1.434,toon('#e7b873'),world,false);}
  box(.006,.055,5.95,3.234,1.32,-1.6,teal,world,false);
  for(let i=0;i<2;i++) {
    const xx=-.59+i*.88;const g=group(xx,0,1.46,0,world,true);g.userData.closedX=xx;g.userData.side=i===0?-1:1;
    box(.86,2.39,.024,0,1.68,0,glass,g,false);
    for(const dx of [-.43,.43])box(.045,2.42,.065,dx,1.68,0,metal,g);
    for(const yy of [.48,2.88])box(.9,.05,.065,0,yy,0,metal,g);
    box(.88,.065,.006,0,1.32,.025,teal,g,false);box(.027,.28,.06,i===0?.33:-.33,1.51,.04,white,g,false);
    face(.22,.12,0,1.64,.04,label('自動','', '#eee6cb','#4c7771'),g); doors.push(g);
  }
  box(1.83,.1,.2,-.15,2.97,1.46,dark);
  box(.12,.055,.1,-.15,2.93,1.57,glow('#a7c6ae',.55));
  box(1.95,.025,1.03,-.15,.357,1.99,toon('#465451'));
  for(let i=0;i<16;i++)box(1.87,.006,.014,-.15,.374,1.55+i*.055,toon('#728175'),world,false);
  // Wraparound illuminated fascia and a shallow metal rain canopy.
  box(8.12,.56,6.4,-.6,3.32,-1.58,teal);
  box(8.24,.1,6.5,-.6,3.65,-1.58,toon('#64968b'));
  box(8.28,.14,6.55,-.6,3.77,-1.58,toon('#314d55'));
  face(7.83,.5,-.6,3.32,1.636,mainSign,world,0,1.05);
  face(5.96,.5,3.467,3.32,-1.58,mainSign,world,Math.PI/2,1.02);
  box(8.22,.075,.55,-.6,3.01,1.71,toon('#537779'));
  box(8.1,.035,.15,-.6,2.96,1.81,shopSign,world,false);
  box(.5,.075,6.1,3.45,3.01,-1.56,toon('#537779'));
  box(.1,.025,5.96,3.53,2.96,-1.58,shopSign,world,false);
  // Roof parapet, seams, vent pipes and small maintenance details.
  box(7.94,.075,6.2,-.6,3.87,-1.58,toon('#36535b'));
  for(const x of [-4.62,3.42])box(.095,.22,6.44,x,3.91,-1.58,toon('#718581'));
  for(const z of [-4.78,1.62])box(8.12,.22,.095,-.6,3.91,z,toon('#718581'));
  for(let i=0;i<9;i++)box(7.8,.015,.018,-.6,3.914,-4.4+i*.68,toon('#47646b'),world,false);
  box(1.22,.7,.95,-2.8,4.24,-3.35,toon('#9cafaa'));
  box(1.3,.06,1.03,-2.8,4.62,-3.35,metal);
  for(let i=0;i<10;i++)box(1.05,.035,.018,-2.8,3.98+i*.055,-2.864,dark,world,false);
  cyl(.21,.21,.78,1.72,4.26,-3.72,metal);cyl(.31,.25,.12,1.72,4.68,-3.72,metal);
  tube([[-2.8,3.99,-3.85],[-2.8,4.05,-4.5],[-4.25,4.05,-4.5]],.044,metal);
  cyl(.048,.048,3.3,-4.56,1.9,1.18,metal);tube([[-4.56,.28,1.18],[-4.56,.28,1.5]],.055,metal);
  // Visible interior: refrigerated wall, low stocked aisles and fresh food zone.
  for(const x of [-3.47,-2.02,-.57])fridge(x);
  shelf(-2.9,-1.1,0);shelf(-1.05,-1.1,1);
  const backDoor=group(2.18,.36,-4.49);box(.91,2.22,.055,0,1.11,0,toon('#94a598'),backDoor);box(.12,.035,.04,.28,1.02,.05,metal,backDoor);
  face(.5,.15,0,1.69,.038,label('STAFF ONLY','','#94a598','#e6e5c8'),backDoor);
  face(.67,.18,1.17,2.87,-4.47,label('お弁当・お惣菜','','#d5b966','#4f6454'));
  const bento=group(.98,.39,-3.9);box(1.21,.83,.72,0,.415,0,white,bento);box(1.22,.08,.76,0,.87,0,teal,bento);
  for(let i=0;i<3;i++)for(let j=0;j<2;j++) {
    box(.32,.055,.25,-.4+i*.4,.95,-.17+j*.34,dark,bento,false);box(.29,.035,.22,-.4+i*.4,.99,-.17+j*.34,whiteLabel,bento,false);
    box(.1,.03,.15,-.48+i*.4,1.02,-.17+j*.34,toon('#bf7854'),bento,false);box(.06,.028,.07,-.33+i*.4,1.02,-.1+j*.34,teal,bento,false);
  }
  // Front checkout: till, coffee machine, steaming oden and payment tray.
  const till=group(2.18,.39,-.14);box(1.15,.9,2.12,0,.45,0,toon('#d4bd94'),till);box(1.28,.09,2.24,0,.94,0,white,till);
  box(1.16,.15,2.13,0,.2,0,teal,till);
  box(.32,.07,.28,0,1.03,.46,dark,till);cyl(.035,.04,.18,0,1.14,.46,metal,till);
  const screen=box(.4,.29,.055,0,1.31,.44,dark,till);screen.rotation.x=-.2;
  const sface=face(.34,.22,0,1.32,.475,label('¥ 480','ありがとうございます','#92bb9d','#2a564f',256,128),till);sface.rotation.x=-.2;
  box(.28,.025,.2,.36,1.005,.71,toon('#557d75'),till);
  box(.48,.61,.44,-.1,1.29,-.71,dark,till);box(.4,.12,.1,-.1,1.49,-.45,toon('#ba9f80'),till);
  face(.27,.11,-.1,1.51,-.387,label('COFFEE','','#2c4849','#e2c18b'),till);
  cyl(.07,.052,.14,-.1,1.08,-.43,white,till);box(.36,.025,.22,-.1,1.015,-.41,metal,till);
  const oden=group(-.07,1.04,-.06,0,till);box(.7,.13,.43,0,0,0,metal,oden);box(.63,.015,.36,0,.075,0,toon('#a77c43'),oden);
  box(.018,.05,.36,0,.1,0,metal,oden,false);box(.63,.05,.018,0,.1,0,metal,oden,false);
  for(let i=0;i<8;i++)cyl(.041,.05,.055,-.23+(i%4)*.15,.11,-.09+Math.floor(i/4)*.19,toon(i%2?'#ddb67b':'#ecdbc0'),oden,8);
  box(.71,.3,.008,0,.23,-.235,glass,oden,false);
  // Magazine stand and a glass-topped ice cream freezer beside the window.
  const mag=group(-3.78,.39,.78);box(.74,.88,.28,0,.44,0,dark,mag);
  for(let r=0;r<3;r++)for(let i=0;i<4;i++) {
    const book=box(.155,.24,.025,-.26+i*.175,.31+r*.25,.19+r*.014,packageMats[(i+r)%6],mag,false);book.rotation.x=-.15;
    box(.105,.027,.006,-.26+i*.175,.37+r*.25,.218+r*.014,whiteLabel,mag,false);
  }
  const freezer=group(1.22,.4,-2.3);box(.9,.82,1.25,0,.41,0,white,freezer);box(.92,.08,1.27,0,.85,0,teal,freezer);
  box(.77,.012,1.11,0,.9,0,glass,freezer,false);face(.67,.26,0,.52,.635,label('ICE CREAM','','#e6c18b','#4c776c'),freezer);
  // Floor guide, baskets, ceiling battens and shop posters.
  const arrow=face(.45,.55,.3,.4,-1.6,label('↑','','#d8cead','#748b73'));arrow.rotation.x=-Math.PI/2;
  for(let i=0;i<4;i++)box(.48,.12,.36,.63,.45+i*.08,.96,teal);
  poster(0,.55,.78,-3.89,2.17,1.437);poster(1,.6,.84,2.8,2.04,1.439);
  poster(2,.65,.86,-3.99,2.07,-2.64,world,Math.PI/2);
  face(1.4,.23,-2.4,2.82,-4.47,label('DRINKS & DAILY','','#4c8379','#fff0b9'));
  for(let x of [-2.7,.2,2.25])box(.12,.045,4.8,x,2.88,-1.67,glow('#ffe4ac',1.65),world,false);
  point('#ffc379',12,7,-1.5,2.5,-1.7);point('#ffd79b',8,5,1.9,2.35,.2);
  point('#bfe8d9',4,4,-2.1,1.9,-3.8);
  point('#ffbe71',6,6,-.3,2.65,2.0);
  halo(-.4,2.5,1.8,'#ffda96',5,.065);
  // Vertical projecting lightbox: legible from the street corner.
  box(.6,2.03,.15,3.7,4.15,.79,teal);box(.7,.075,.2,3.7,5.2,.79,metal);
  face(.51,1.89,3.7,4.15,.884,canvasMap(192,600,c=>{c.fillStyle='#e9dfbc';c.fillRect(0,0,192,600);c.fillStyle='#39766d';c.textAlign='center';c.font='bold 100px "Yu Gothic",sans-serif';['雨','待','ち'].forEach((s,i)=>c.fillText(s,96,130+i*135));c.fillStyle='#c08653';c.font='bold 58px Arial';c.fillText('24H',96,558);}),world,0,1.25);
  for(let y of [3.5,4.9])tube([[3.22,y,.79],[3.7,y,.79]],.035,metal);
}

export function updateStore(time) {
  const phase=time%22;
  const openness=phase<13?0:phase<14.5?THREE.MathUtils.smoothstep(phase,13,14.5):phase<17?1:1-THREE.MathUtils.smoothstep(phase,17,18.5);
  for(const g of doors)g.position.x=g.userData.closedX+g.userData.side*openness*.78;
  const flicker=1.2+(Math.sin(time*1.7)*.01)-(time%19>18.83?.15:0);
  shopSign.color.set('#fff0c8').multiplyScalar(flicker);
}
