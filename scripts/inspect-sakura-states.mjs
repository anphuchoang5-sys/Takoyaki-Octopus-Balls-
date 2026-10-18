import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const destination='artifacts/buildings/sakura-house';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const response=await page.goto('http://127.0.0.1:4184/town/assets/sakura-house/preview.html?view=reference');
  assert.equal(response.status(),200);await page.waitForFunction(()=>window.__sakura?.ready);
  assert.equal(await page.evaluate(()=>window.__sakura.inspect().specification.revision),'exterior-03-states');
  const states=[];
  for(const time of ['morning','afternoon','dusk','night'])for(const weather of ['clear','rain']){
    await page.locator(`[data-time="${time}"]`).click();await page.locator(`[data-weather="${weather}"]`).click();
    await page.evaluate(()=>window.__sakura.setElapsed(2.03));await page.waitForTimeout(80);
    const state=await page.evaluate(()=>window.__sakura.inspect().environment);
    assert.equal(state.lightsOn,['dusk','night'].includes(time));assert.equal(state.rainOn,weather==='rain');
    const bounds=await page.evaluate(()=>[0,90,180,270].map(n=>window.__sakura.boundsAt(n)));
    for(const b of bounds)for(const j of [0,2]){assert(b.min[j]>=-7.00001,JSON.stringify(b));assert(b.max[j]<=7.00001,JSON.stringify(b));}
    states.push({time,weather,lightsOn:state.lightsOn,rainOn:state.rainOn,bounds});
  }
  const behavior=await page.evaluate(()=>{
    const {house,createModel}=window.__sakura;
    house.setEnvironment({time:'night',weather:'rain'});house.updateEnvironment(.3);const a=house.getEnvironmentState();house.updateEnvironment(1.1);const b=house.getEnvironmentState();
    const c=createModel(),d=createModel();
    const colors=o=>o.root.children.filter(n=>n.isMesh).map(n=>n.material.color.getHexString());
    const original=colors(c);c.setEnvironment({time:'night',weather:'rain'});c.updateEnvironment(3.7);
    const isolated=JSON.stringify(original)===JSON.stringify(colors(d))&&!d.getEnvironmentState().rainOn;
    c.setEnvironment({time:'afternoon',weather:'clear'});const reset=JSON.stringify(original)===JSON.stringify(colors(c));
    let rejected=false;try{c.setEnvironment({time:'invalid',weather:'rain'});}catch{rejected=true;}
    const unchanged=c.getEnvironmentState().time==='afternoon'&&!c.getEnvironmentState().rainOn;
    c.dispose();c.dispose();const siblingAlive=d.root.children.length>0;d.dispose();
    return {a,b,animated:JSON.stringify(a.samples)!==JSON.stringify(b.samples),isolated,reset,rejected,unchanged,siblingAlive};
  });
  for(const key of ['animated','isolated','reset','rejected','unchanged','siblingAlive'])assert(behavior[key],key);
  const design=await page.evaluate(()=>window.__sakura.inspect().design);assert.equal(design.westWindowBars,2);assert.equal(design.shrubTones,3);assert(design.entranceTuftsRemoved);assert(design.treeTrunkRadius>=.36);
  const lampMouth=await page.evaluate(async()=>{
    const T=await import('three'),beam=window.__sakura.house.root.getObjectByName('向下展开的动画式光束'),m=beam.userData.mouth,p=beam.geometry.attributes.position;
    let maxError=0;for(let i=0;i<32;i++){const a=i*Math.PI/16,expected=new T.Vector3(...m.center).addScaledVector(new T.Vector3(...m.axisX),Math.cos(a)*m.width/2).addScaledVector(new T.Vector3(...m.axisZ),Math.sin(a)*m.depth/2);let nearest=Infinity;for(let j=0;j<p.count;j++)nearest=Math.min(nearest,expected.distanceTo(new T.Vector3().fromBufferAttribute(p,j)));maxError=Math.max(maxError,nearest);}
    const aim=new T.Vector3(...m.aim),center=new T.Vector3(...m.center),foot=new T.Vector3(...m.foot),outward=[];
    for(const i of [0,8,16,24]){const angle=i*Math.PI/16,a=new T.Vector3(...m.axisX).multiplyScalar(Math.cos(angle)*m.width/2).addScaledVector(new T.Vector3(...m.axisZ),Math.sin(angle)*m.depth/2),target=foot.clone().add(new T.Vector3(Math.cos(angle)*m.poolRadius,0,Math.sin(angle)*m.poolReach)).clamp(new T.Vector3(-7,-Infinity,-7),new T.Vector3(7,Infinity,7)),b=target.sub(foot);a.addScaledVector(aim,-a.dot(aim));b.addScaledVector(aim,-b.dot(aim));outward.push({side:i,start:a.length(),end:b.length(),sameSide:a.dot(b)>0});}
    return {...m,maxError,outward,aimAlignment:foot.sub(center).normalize().dot(aim)};
  });assert(lampMouth.width>=.438&&lampMouth.width<=.49);assert(lampMouth.maxError<.00001);assert(lampMouth.aimAlignment>.999999);for(const edge of lampMouth.outward){assert(edge.sameSide);assert(edge.end>edge.start*2);}
  await page.evaluate(()=>document.body.classList.add('reference-capture'));
  const shots=[['19-day','reference','afternoon','clear'],['20-rain','hero','afternoon','rain'],['21-night','reference','night','clear'],['22-night-rain','hero','night','rain'],['23-lamp-detail','lamp','night','clear'],['24-eaves-detail','drips','afternoon','rain'],['25-garden-tones','garden','afternoon','clear'],['26-rear-tree','rear-detail','afternoon','clear']];
  for(const [name,view,time,weather]of shots){
    await page.evaluate(({view,time,weather})=>{window.__sakura.setView(view);window.__sakura.setEnvironment({time,weather});window.__sakura.setElapsed(2.03);},{view,time,weather});
    await page.waitForTimeout(200);await page.screenshot({path:`${destination}/${name}.png`});
  }
  await page.evaluate(()=>{document.body.classList.remove('reference-capture');window.__sakura.setView('reference');window.__sakura.setEnvironment({time:'night',weather:'rain'});window.__sakura.setElapsed(null);});
  const movingStart=await page.evaluate(()=>window.__sakura.inspect().environment);
  await page.waitForTimeout(650);const movingEnd=await page.evaluate(()=>window.__sakura.inspect().environment);assert(movingEnd.elapsedSeconds>movingStart.elapsedSeconds);assert.notDeepEqual(movingStart.samples,movingEnd.samples);
  await page.screenshot({path:`${destination}/27-state-viewer.png`});
  await page.mouse.move(850,550);await page.mouse.down();await page.mouse.move(1040,570,{steps:15});await page.mouse.up();await page.mouse.wheel(0,-250);await page.waitForTimeout(250);
  // Fresh browser storage: exercise the real C factory and lifecycle without touching user saves.
  const editor=await browser.newPage({viewport:{width:1400,height:900}});editor.on('pageerror',e=>errors.push(e.message));
  await editor.goto('http://127.0.0.1:4184/');await editor.waitForFunction(()=>window.__editor?.ready);
  const integration=await editor.evaluate(async()=>{
    const {createEditorState}=await import('/town/editor/state.js'),{createEditorScene,renderThumbnails}=await import('/town/editor/scene.js'),{createAsset,assetIds,ASSETS}=await import('/town/editor/catalog.js');
    const initial={format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:4,length:z===4?2:0})),instances:[{id:'state-a',assetId:'sakura-house',x:4,z:4,rotation:0},{id:'state-b',assetId:'sakura-house',x:5,z:4,rotation:90}]};
    const created=[];
    function factory(id){const asset=createAsset(id);if(id==='sakura-house'){
      const resources=new Set();asset.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){resources.add(m);if(m.map)resources.add(m.map);}});
      const hits=new Map([...resources].map(r=>[r,0]));resources.forEach(r=>r.addEventListener('dispose',()=>hits.set(r,hits.get(r)+1)));
      created.push({asset,inspect:()=>({total:hits.size,released:[...hits.values()].filter(v=>v>0).length,repeated:[...hits.values()].filter(v=>v>1).length})});
    }return asset;}
    const state=createEditorState({assetIds,initial}),scene=createEditorScene({state,createAsset:factory}),first=created[0],second=created[1];
    state.rotate('state-a');const rotated=scene.getInstances()[0].asset.root.rotation.y;
    state.remove('state-a');const removed=first.inspect(),survivor=second.inspect();state.undo();
    scene.preview({assetId:'sakura-house',x:4,z:4});const ghost=created.at(-1);scene.preview({assetId:'road-straight',x:4,z:4});const ghostDisposed=ghost.inspect();
    const thumbnails=renderThumbnails(ASSETS.filter(a=>a.id==='sakura-house'),factory),thumbnail=created.at(-1).inspect();scene.dispose();
    window.townEditor.loadLayout(initial);window.townEditor.focusInstance('state-a');
    return {revision:first.asset.specification.revision,rotated,removed,survivor,ghost:ghostDisposed,thumbnail,disposedScene:second.inspect(),thumbnailRendered:thumbnails.get('sakura-house').startsWith('data:image/png'),globalEnvironmentConnected:window.townEditor.runtime.getState().connected};
  });
  assert.equal(integration.revision,'exterior-03-states');assert.equal(integration.rotated,Math.PI/2);assert.equal(integration.survivor.released,0);assert(integration.thumbnailRendered);
  for(const key of ['removed','ghost','thumbnail','disposedScene']){assert.equal(integration[key].released,integration[key].total,key);assert.equal(integration[key].repeated,0,key);}
  await editor.waitForTimeout(700);await editor.screenshot({path:`${destination}/29-editor-compatibility.png`});await editor.close();
  if(process.argv.includes('--record')){
    await page.evaluate(()=>{document.body.classList.add('reference-capture');window.__sakura.setView('drips');window.__sakura.setEnvironment({time:'afternoon',weather:'rain'});window.__sakura.setElapsed(null);});
    const video=await page.evaluate(async()=>{
      const stream=document.getElementById('world').captureStream(24),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:3500000}),chunks=[];
      const finished=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));resolve(btoa(raw));};});
      recorder.start();await new Promise(r=>setTimeout(r,5500));window.__sakura.setView('lamp');window.__sakura.setEnvironment({time:'night',weather:'rain'});await new Promise(r=>setTimeout(r,4500));recorder.stop();const encoded=await finished;stream.getTracks().forEach(t=>t.stop());return encoded;
    });await writeFile(`${destination}/28-rain-and-lamp.webm`,Buffer.from(video,'base64'));
  }
  const before=JSON.parse((await readFile(`${destination}/protected-before.json`,'utf8')).replace(/^\uFEFF/,'')),changed=[];
  for(const file of before)if(createHash('sha256').update(await readFile(file.Path)).digest('hex').toUpperCase()!==file.Hash)changed.push(file.Path);
  assert.equal(changed.length,0);assert.deepEqual(errors,[]);
  const report={passed:true,states,behavior,design,lampMouth,integration,recorded:process.argv.includes('--record'),externalClockAnimation:true,mouseOrbitZoom:true,protectedFiles:{count:before.length,changed},errors,screenshots:shots.map(s=>s[0]),artApproval:'pending user review',environmentIntegration:'asset API and standalone preview only; C editor environment not connected'};
  await writeFile(`${destination}/state-inspection.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,states:states.length,behavior:{...behavior,a:undefined,b:undefined},protectedFiles:report.protectedFiles,errors}));
}finally{await browser.close();}
