import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const out='artifacts/buildings/sakura-house/interior';await mkdir(out,{recursive:true});
const hash=data=>createHash('sha256').update(data).digest('hex');
const protectionFile=out+'/living-01/scope-before.json';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];let report;
try{
 const page=await browser.newPage({viewport:{width:1560,height:1050},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4184/town/assets/sakura-house/interior/preview.html');await page.waitForFunction(()=>window.__sakuraInterior?.ready);await page.waitForTimeout(800);
 await page.screenshot({path:out+'/01-viewer.png'});
 const initial=await page.evaluate(()=>window.__sakuraInterior.inspect());assert.equal(initial.rooms.length,12);assert.equal(initial.specification.stage,'客厅精修待审 · 姐妹房保留 · 其余结构样板');
 assert.equal(await page.title(),'樱家 · 完整室内预览');assert((await page.locator('.stage').textContent()).includes('姐妹房'));
 // Use real pointer interaction, then restore via the user-facing button.
 const box=await page.locator('#world').boundingBox();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.67,box.y+box.height*.58,{steps:12});await page.mouse.up();await page.waitForTimeout(400);
 const orbited=await page.evaluate(()=>window.__sakuraInterior.inspect().camera);assert.notDeepEqual(orbited.position,initial.camera.position);
 await page.mouse.wheel(0,-400);await page.waitForTimeout(400);const zoomed=await page.evaluate(()=>window.__sakuraInterior.inspect().camera.zoom);assert(zoomed>orbited.zoom);
 const panBefore=await page.evaluate(()=>window.__sakuraInterior.inspect().camera.target);await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width*.72,box.y+box.height*.61,{steps:8});await page.mouse.up({button:'right'});await page.waitForTimeout(200);assert.notDeepEqual(await page.evaluate(()=>window.__sakuraInterior.inspect().camera.target),panBefore);
 await page.locator('#reset').click();await page.locator('[data-view="top"]').click();await page.waitForTimeout(400);await page.locator('#world').screenshot({path:out+'/02-top.png'});
 await page.locator('#compare').click();await page.waitForFunction(()=>document.getElementById('reference-image').complete&&document.getElementById('reference-image').naturalWidth>0);await page.screenshot({path:out+'/03-plan-comparison.png'});await page.locator('#close-reference').click();
 await page.locator('[data-view="reference"]').click();await page.waitForTimeout(400);await page.locator('#world').screenshot({path:out+'/04-reference-view.png'});
 await page.locator('#compare').click();await page.waitForTimeout(300);await page.screenshot({path:out+'/05-reference-comparison.png'});await page.locator('#close-reference').click();
 await page.locator('#walls').selectOption('cut');
 for(const [id,file] of [['living','06-living'],['kitchen','07-kitchen'],['sisters','08-sisters'],['grandparents','09-grandparents'],['parents','10-parents'],['wash','11-wash'],['bath','12-bath'],['toilet','13-toilet'],['entry','14-entry']]){
  await page.locator('#walls').selectOption('cut');await page.locator(`[data-room="${id}"]`).click();await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().selected),id);await page.locator('#world').screenshot({path:out+'/'+file+'.png'});
 }
 for(const id of ['hall','corridor','engawa']){await page.locator(`[data-room="${id}"]`).click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().selected),id);}
 const deskChecks=[];
 for(const [id,file,reference] of [['maruko','22-maruko-desk','sisters-04-maruko.jpg'],['sakiko','23-sakiko-desk','sisters-03-sakiko.jpg']]){
  await page.locator(`[data-desk="${id}"]`).click();await page.waitForTimeout(200);const state=await page.evaluate(()=>window.__sakuraInterior.inspect());assert.equal(state.desk,id);assert.equal(state.selected,'sisters');assert.equal(state.view.wallMode,'full');assert(await page.evaluate(()=>window.__sakuraInterior.house.sisters.walls.visible));
  await page.locator('#world').screenshot({path:out+'/'+file+'.png'});
  await page.locator('#compare').click();await page.waitForFunction(()=>document.getElementById('reference-image').complete&&document.getElementById('reference-image').naturalWidth>0);assert((await page.locator('#reference-image').getAttribute('src')).endsWith(reference));assert.equal(await page.locator('#reference-source').isVisible(),false);assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().desk),id);await page.locator('#close-reference').click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().desk),id);
  await page.locator('#walls').selectOption('hidden');assert.equal(await page.evaluate(()=>window.__sakuraInterior.house.sisters.walls.visible),false);await page.locator('#walls').selectOption('full');assert(await page.evaluate(()=>window.__sakuraInterior.house.sisters.walls.visible));deskChecks.push(id);
 }
 await page.locator('[data-room="sisters"]').click();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().view.wallMode),'full');
 await page.locator('[data-view="corridor-view"]').click();await page.waitForTimeout(250);await page.locator('#world').screenshot({path:out+'/15-corridor.png'});
 await page.locator('#reset').click();await page.locator('#walls').selectOption('full');await page.locator('#ceiling').check();await page.waitForTimeout(250);await page.locator('#world').screenshot({path:out+'/16-complete-ceilings.png'});assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().view.ceilingVisible),true);
 await page.locator('#ceiling').uncheck();for(const v of ['outer-hidden','hidden','cut']){await page.locator('#walls').selectOption(v);assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().view.wallMode),v);}
 await page.locator('#doors').uncheck();assert.equal(await page.evaluate(()=>window.__sakuraInterior.inspect().view.doorsOpen),false);await page.locator('#doors').check();
 await page.locator('[data-view="top"]').click();await page.locator('#routes').check();await page.waitForTimeout(300);await page.locator('#world').screenshot({path:out+'/17-routes.png'});await page.locator('#routes').uncheck();
 const audit=await page.evaluate(async()=>{
  const T=await import('three'),a=window.__sakuraInterior,h=a.house;let meshes=0,vertices=0,nonfinite=0,degenerate=0;const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3();
  h.root.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;vertices+=p.count;for(const v of p.array)if(!Number.isFinite(v))nonfinite++;const ix=o.geometry.index,n=ix?ix.count:p.count;for(let j=0;j<n;j+=3){va.fromBufferAttribute(p,ix?ix.getX(j):j);vb.fromBufferAttribute(p,ix?ix.getX(j+1):j+1);vc.fromBufferAttribute(p,ix?ix.getX(j+2):j+2);if(vb.sub(va).cross(vc.sub(va)).lengthSq()<1e-28)degenerate++;}});
  const visited=new Set(['entry']);let changed=true;while(changed){changed=false;for(const [p,q] of h.connections){if(visited.has(p)&&!visited.has(q)){visited.add(q);changed=true;}if(visited.has(q)&&!visited.has(p)){visited.add(p);changed=true;}}}
  // A 44 cm wide walking envelope along adopted route samples. This checks artwork clearances, not a character controller.
  const radius=.22,collisions=[];for(const [name,path] of Object.entries(h.routes))for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],len=Math.hypot(q[0]-p[0],q[1]-p[1]),steps=Math.ceil(len/.07);for(let s=0;s<=steps;s++){const t=s/steps,x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;
   for(const ob of h.obstacles){const dx=Math.max(Math.abs(x-ob.x)-ob.w/2,0),dz=Math.max(Math.abs(z-ob.z)-ob.d/2,0);if(Math.hypot(dx,dz)<radius-.005&&!collisions.some(c=>c.route===name&&c.object===ob.name))collisions.push({route:name,object:ob.name,at:[x,z]});}
   for(const w of h.walls){const along=w.axis==='x'?x:z,across=w.axis==='x'?z:x;if(Math.abs(across-w.at)>radius+.06||along<w.a-radius||along>w.b+radius)continue;
    const opening=w.open.find(o=>o.sill===0&&o.kind!=='closet'&&along-radius>=o.a+.025&&along+radius<=o.b-.025);if(opening)continue;
    // Endpoint disks are allowed to pass around the end of a wall.
    const nearest=Math.max(w.a,Math.min(w.b,along));if(Math.hypot(along-nearest,across-w.at)>=radius+.06)continue;
    if(!collisions.some(c=>c.route===name&&c.object===w.id))collisions.push({route:name,object:w.id,at:[x,z]});
   }
  }}
  const physical=[];h.fullWalls.traverse(o=>{if(o.isMesh)physical.push(o);});h.doors.traverse(o=>{if(o.isMesh)physical.push(o);});h.root.updateMatrixWorld(true);const ray=new T.Raycaster(),doorChecks=[];
  for(const [route,pts] of Object.entries(h.routes)){let hit=null;for(let i=1;i<pts.length&&!hit;i++){const p=pts[i-1],q=pts[i],d=Math.hypot(q[0]-p[0],q[1]-p[1]);for(let k=0;k<=Math.ceil(d/.12)&&!hit;k++){const t=Math.min(1,k*.12/d),x=p[0]+(q[0]-p[0])*t,z=p[1]+(q[1]-p[1])*t;for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){ray.set(new T.Vector3(x,1.0,z),new T.Vector3(Math.cos(angle),0,Math.sin(angle)));ray.far=radius;const hits=ray.intersectObjects(physical,false);if(hits.length){hit={point:[x,z],distance:hits[0].distance,object:hits[0].object.parent.name};break;}}}}
   doorChecks.push({route,clear:!hit,hit});
  }
  const sibling=a.createInterior();const counts=new Map();sibling.root.traverse(o=>{if(o.isMesh||o.isLineSegments){counts.set(o.geometry,0);const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)counts.set(m,0);}});for(const r of counts.keys())r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));sibling.dispose();sibling.dispose();const resourceDisposal=[...counts.values()].every(v=>v===1);
  const bounds=new T.Box3().setFromObject(h.root);return {meshes,vertices,nonfinite,degenerate,reachable:[...visited],routeRadius:radius,collisions,doorChecks,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},resourceDisposal,resources:counts.size};
 });
 const before=JSON.parse(await readFile(protectionFile,'utf8')).files,changed=[];for(const [file,hash] of Object.entries(before)){try{const now=createHash('sha256').update(await readFile(file)).digest('hex');if(now!==hash)changed.push(file);}catch{changed.push(file);}}
 report={passed:false,initial,audit,interaction:{orbit:true,zoom:true,pan:true,roomFocus:12,desks:deskChecks,reference:true,wallModes:true,ceiling:true,doors:true},protectedFiles:{count:Object.keys(before).length,changed},errors};
 await page.setViewportSize({width:720,height:900});await page.locator('#reset').click();await page.waitForTimeout(400);await page.screenshot({path:out+'/18-small-viewer.png'});
 assert.equal(audit.nonfinite,0);assert.equal(audit.degenerate,0);assert.equal(audit.reachable.length,12);assert(audit.resourceDisposal);assert.deepEqual(audit.collisions,[]);assert(audit.doorChecks.every(c=>c.clear));assert.deepEqual(changed,[]);assert.deepEqual(errors,[]);report.passed=true;
 console.log(JSON.stringify({passed:true,geometry:{meshes:audit.meshes,vertices:audit.vertices},rooms:audit.reachable.length,doors:audit.doorChecks,protected:report.protectedFiles}));
}finally{if(report)await writeFile(out+'/inspection.json',JSON.stringify(report,null,2));await browser.close();}
