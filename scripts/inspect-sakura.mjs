import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const destination='artifacts/buildings/sakura-house';await mkdir(destination,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const url=process.argv[2]||'http://127.0.0.1:4184/town/assets/sakura-house/preview.html';
try{
  const response=await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__sakura?.ready,{timeout:60000});
  const initial=await page.evaluate(()=>window.__sakura.inspect());
  const bounds=await page.evaluate(()=>[0,90,180,270].map(n=>window.__sakura.boundsAt(n)));
  for(const b of bounds){for(const i of [0,2]){assert(b.min[i]>=-7.00001,`rotation ${b.degrees} min ${i}`);assert(b.max[i]<=7.00001,`rotation ${b.degrees} max ${i}`);}}
  assert.equal(initial.openings.length,8);assert(initial.openings.some(o=>o.side==='北面补全'));assert(initial.openings.some(o=>o.side==='西端山墙窗'));assert(initial.openings.some(o=>o.side==='低附屋东面小窗'));assert(initial.tileCount>=200);assert.equal(initial.design.gate.railings,false);assert.equal(initial.design.roof,'single-gable');assert.equal(initial.design.windowColor,'#2633cf');assert(bounds[0].max[1]>7);
  const geometry=await page.evaluate(()=>{let nonFinite=0,degenerate=0;const root=window.__sakura.house.root;root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index,count=idx?.count||p.count;for(const v of p.array)if(!Number.isFinite(v))nonFinite++;for(let i=0;i<count;i+=3){const ai=idx?idx.getX(i):i,bi=idx?idx.getX(i+1):i+1,ci=idx?idx.getX(i+2):i+2;const ax=p.getX(bi)-p.getX(ai),ay=p.getY(bi)-p.getY(ai),az=p.getZ(bi)-p.getZ(ai),bx=p.getX(ci)-p.getX(ai),by=p.getY(ci)-p.getY(ai),bz=p.getZ(ci)-p.getZ(ai);if(Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)<1e-10)degenerate++;}});return {nonFinite,degenerate};});
  assert.equal(geometry.nonFinite,0);
  assert.equal(geometry.degenerate,0);
  await page.mouse.move(820,600);await page.mouse.down();await page.mouse.move(1090,640,{steps:16});await page.mouse.up();await page.waitForTimeout(600);
  const rotated=await page.evaluate(()=>window.__sakura.inspect().camera);assert.notDeepEqual(rotated.position,initial.camera.position);
  await page.mouse.wheel(0,-480);await page.waitForTimeout(500);const zoomed=await page.evaluate(()=>window.__sakura.inspect().camera);assert.notEqual(zoomed.zoom,rotated.zoom);
  await page.keyboard.press('Home');await page.waitForTimeout(200);
  const screenshots=[];
  await page.evaluate(()=>document.body.classList.add('clean'));
  for(const [key,name]of [['hero','01-oblique'],['front','02-front'],['left','03-left'],['right','04-right'],['back','05-back'],['top','06-top'],['roof','07-roof-detail'],['entry','08-entry-detail'],['garden','09-garden-detail'],['rear-detail','10-rear-detail']]){
    await page.evaluate(k=>window.__sakura.setView(k),key);await page.waitForTimeout(350);const file=`${destination}/${name}.png`;await page.screenshot({path:file});screenshots.push(file);
  }
  await page.evaluate(()=>window.__sakura.compare(true));await page.waitForTimeout(400);await page.screenshot({path:`${destination}/11-comparison.png`});
  const comparison=await page.evaluate(()=>window.__sakura.inspect());assert.deepEqual(comparison.houseScale,[1,1,1]);assert.deepEqual(comparison.shopScale,[1,1,1]);
  await page.evaluate(()=>window.__sakura.compare(false));
  const isolation=await page.evaluate(()=>{const a=window.__sakura.createModel(),b=window.__sakura.createModel(),original=window.__sakura.house;const ma=a.root.children.find(o=>o.isMesh),mb=b.root.children.find(o=>o.isMesh);const separate=ma.material!==mb.material&&ma.geometry!==mb.geometry;a.dispose();const siblingAlive=b.root.children.length>0&&original.root.children.length>0;b.dispose();return {separate,siblingAlive};});assert(isolation.separate&&isolation.siblingAlive);
  await page.evaluate(()=>document.body.classList.remove('clean'));await page.screenshot({path:`${destination}/12-viewer.png`});
  await page.setViewportSize({width:1100,height:760});await page.waitForTimeout(350);await page.screenshot({path:`${destination}/13-small-desktop.png`});
  const final=await page.evaluate(()=>window.__sakura.inspect());assert(final.frames>initial.frames);assert.equal(errors.length,0,errors.join('\n'));
  const report={url,httpStatus:response?.status(),errors,initial,bounds,geometry,interaction:{rotation:true,zoom:true,home:true},isolation,comparison:{houseScale:comparison.houseScale,shopScale:comparison.shopScale,stats:comparison.stats},final,screenshots,userArtApproval:{exterior02:'approved by user',addedLamp:'approved by user',exterior03States:'pending user review'},limitations:['Screenshots and geometry checks do not prove absence of every internal mesh intersection.','State art acceptance and town environment integration are not part of the technical pass.']};
  await writeFile(`${destination}/inspection.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,bounds,geometry,interaction:report.interaction,isolation,stats:final.stats,tileCount:initial.tileCount,errors},null,2));
}finally{await browser.close();}



