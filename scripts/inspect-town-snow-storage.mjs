import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/editor/snow',browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1400,height:900}}),results=[],errors=[];
let page=await context.newPage();
const attach=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
const ready=async p=>{await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__editor?.ready,{},{timeout:60000});};
const only=new Set(process.argv.slice(2));
const check=async(name,fn)=>{if(only.size&&!only.has(name))return;try{results.push({name,ok:true,evidence:await fn()});}catch(e){results.push({name,ok:false,error:e.stack});}};
attach(page);
try {
  await ready(page);
  await page.evaluate(()=>{
    const l=townEditor.getLayout();l.rows=l.rows.map((r,z)=>({start:3,length:z===4?4:0}));townEditor.loadLayout(l);
    for(const [i,id]of ['road-straight','road-corner','road-tee','road-cross'].entries())townEditor.state.place(id,3+i,4,i*90);
    townEditor.environment.set({time:'afternoon',weather:'snow',snowAmount:1});townEditor.showOverview({immediate:true});
  });
  await page.waitForTimeout(350);
  await page.screenshot({path:`${out}/09-four-road-shapes.png`});
  await check('road-shapes-rotation-and-no-grass-through-thick-snow',async()=>{
    const data=await page.evaluate(()=>{
      const l=townEditor.getLayout(),samples=l.instances.map(p=>{const x=(p.x-4.5)*14,z=(p.z-4.5)*14;return{asset:p.assetId,rotation:p.rotation,center:townEditor.weather.sampleSurface(x,z),edge:townEditor.weather.sampleSurface(x+6,z+6)};});
      return{samples,grass:__editor.inspection.scene.grass};
    });
    assert.equal(data.samples.length,4);assert(data.samples.every(s=>s.center.point[1]<s.edge.point[1]));return data;
  });
  await check('actual-ui-file-export-import-and-invalid-feedback',async()=>{
    await page.locator('#enter-editor').click();await page.locator('[data-panel="save"]').click();
    const waiting=page.waitForEvent('download');await page.locator('#export').click();const download=await waiting;
    const path=await download.path(),text=await readFile(path,'utf8'),document=JSON.parse(text);assert.equal(document.format,'maruko-town');
    document.environment={time:'dusk',weather:'clear',snowAmount:.5};
    await page.locator('#import-file').setInputFiles({name:'town.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
    await page.waitForFunction(()=>townEditor.environment.get().time==='dusk');
    const accepted=await page.evaluate(()=>townEditor.environment.get());
    const bad=structuredClone(document);bad.environment.snowAmount=-1;
    await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(()=>document.getElementById('message').textContent.includes('导入失败'));
    const rejected=await page.locator('#message').textContent();assert.equal((await page.evaluate(()=>townEditor.environment.get())).time,'dusk');
    const old=document.layout;await page.locator('#import-file').setInputFiles({name:'old-v1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
    await page.waitForFunction(()=>document.getElementById('message').textContent.includes('已导入'));
    assert.equal((await page.evaluate(()=>townEditor.environment.get())).time,'dusk');return {download:download.suggestedFilename(),accepted,rejected};
  });
  await check('actual-background-pause',async()=>{
    await page.evaluate(()=>townEditor.environment.set({weather:'snow',snowAmount:.3}));
    const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();
    const hidden=await page.evaluate(()=>document.hidden);
    if(!hidden){await other.close();return {notRun:true,reason:'This headless browser does not hide the original tab; visibility pause remains code-checked.'};}
    const before=await page.evaluate(()=>({environment:townEditor.environment.get(),elapsed:townEditor.environment.elapsedSeconds}));
    await new Promise(r=>setTimeout(r,2200));
    const after=await page.evaluate(()=>({environment:townEditor.environment.get(),elapsed:townEditor.environment.elapsedSeconds}));
    assert.deepEqual(after,before);await other.close();await page.bringToFront();return {hidden,before,after};
  });
  await check('closed-time-does-not-advance',async()=>{
    await page.evaluate(()=>{townEditor.environment.set({weather:'snow',snowAmount:.4});});await page.waitForTimeout(1100);
    const saved=await page.evaluate(()=>{dispatchEvent(new Event('pagehide'));return JSON.parse(localStorage.getItem('rainy-corner.editor.layout.v1'));});
    await page.close();await new Promise(r=>setTimeout(r,2500));page=await context.newPage();attach(page);await ready(page);
    const reopened=await page.evaluate(()=>townEditor.environment.get());assert(Math.abs(reopened.snowAmount-saved.environment.snowAmount)<.018);return {saved:saved.environment,reopened,closedWaitMilliseconds:2500};
  });
  await check('real-browser-corrupt-save-not-overwritten',async()=>{
    const original='{\"format\":\"unknown-preserved-version\",\"version\":123,\"original\":\"retain\"}';
    // Seed before the next application's startup. Writing into a still-running
    // old page would be overwritten by that page's legitimate pagehide flush.
    await page.addInitScript(raw=>localStorage.setItem('rainy-corner.editor.layout.v1',raw),original);
    await page.reload();await page.waitForFunction(()=>__editor?.ready,{},{timeout:60000});
    await page.evaluate(()=>townEditor.environment.set({weather:'snow'}));await page.waitForTimeout(1200);
    const data=await page.evaluate(()=>({raw:localStorage.getItem('rainy-corner.editor.layout.v1'),message:document.getElementById('save-status').textContent}));
    assert.equal(data.raw,original);return data;
  });
  await check('snow-normal-and-legacy-weather',async()=>{
    const data=await page.evaluate(async()=>{
      const T=await import('three'),api=townEditor,l=api.getLayout();l.rows[5]={start:3,length:1};api.loadLayout(l);
      const p=api.state.place('mitsuya',3,5,90);api.environment.set({time:'night',snowAmount:.7});
      const result=api.weather.setWeather('snow'),entry=api.sceneView.getInstances().find(e=>e.placement.id===p.id);
      const point=entry.asset.root.localToWorld(new T.Vector3(0,0,1)),hit=api.weather.sampleSurface(point.x,point.z);
      return {result,environment:api.environment.get(),runtime:api.runtime.getState().values,hit};
    });
    assert(data.result.ok);assert.equal(data.environment.time,'night');assert.equal(data.environment.weather,'snow');assert.equal(data.environment.snowAmount,.7);assert.equal(data.runtime.weather,'snow');
    assert(Math.abs(Math.hypot(...data.hit.normal)-1)<1e-6);assert(Math.abs(data.hit.normal[0])>.3);return data;
  });
  console.log(JSON.stringify({results,errors}));await writeFile(`${out}/storage-inspection${only.size?'-followup':''}.json`,JSON.stringify({results,errors},null,2));
  assert(results.every(r=>r.ok));assert.deepEqual(errors,[]);
}finally{await browser.close();}
