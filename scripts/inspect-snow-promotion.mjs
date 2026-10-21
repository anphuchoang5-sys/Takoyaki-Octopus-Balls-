import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
assert(!(process.argv.includes('--verify')&&process.argv.includes('--smoke')),'Run --verify and --smoke separately: they use different layouts');
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/editor/snow-promotion';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  console.log('opening');await page.goto('http://127.0.0.1:4173/?review=snow');console.log('loaded');
  await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
  console.log('ready');await page.evaluate(()=>{
    const l=townEditor.getLayout();l.rows=l.rows.map((r,z)=>({start:3,length:z>=3&&z<=5?3:0}));l.instances=[];
    townEditor.loadLayout(l);
    ['sakura-house','convenience','mitsuya'].forEach((id,i)=>townEditor.state.place(id,3+i,3));
    for(let x=3;x<=5;x++)townEditor.state.place('road-straight',x,4,90);
    townEditor.environment.set({time:'afternoon',weather:'snow',snowAmount:1});
    townEditor.showOverview({immediate:true});
  });
  console.log('layout applied');await page.waitForTimeout(1500);
  if(!process.argv.includes('--before')){
    const monitor=setInterval(async()=>{try{console.log(JSON.stringify(await page.evaluate(()=>({progress:townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>[e.placement.assetId,e.asset.snow.getInspection().preparation]),terrain:townEditor.sceneView.getInspection().snow.preparation}))));}catch{}},15000);
    try{await page.waitForFunction(()=>townEditor.sceneView.getInstances().every(e=>!e.asset.snow||e.asset.snow.getInspection().shown===1)&&townEditor.sceneView.getInspection().snow.shown===1,null,{timeout:180000});}
    catch(e){console.log(await page.evaluate(()=>({models:townEditor.sceneView.getInstances().map(e=>[e.placement.assetId,e.asset.snow?.getInspection()]),ground:townEditor.sceneView.getInspection().snow})));throw e;}finally{clearInterval(monitor);}
  }
  const stats=await page.evaluate(async()=>{
    const {isRainSurface}=await import('/town/editor/rain-surfaces.js');
    const models=townEditor.sceneView.getInstances().filter(e=>!e.placement.assetId.startsWith('road-')).map(({asset,placement})=>{
      const meshes=[];asset.root.traverse(n=>{
        if(isRainSurface(n,asset.root))meshes.push({name:n.name,parent:n.parent.name,faces:(n.geometry.index?.count||n.geometry.attributes.position.count)/3,
          color:n.material.color?.getHexString(),opaque:!n.material.transparent});
      });return {id:placement.assetId,meshes,snow:asset.snow?.getInspection()};
    });
    const times=[];await new Promise(resolve=>{let last=performance.now();function frame(t){times.push(t-last);last=t;if(times.length>=150)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
    times.sort((a,b)=>a-b);return {models,frameMs:{median:times[75],p95:times[142]},inspection:__editor.inspection};
  });
  const stage=process.argv.includes('--before')?'before':'after';
  await writeFile(`${out}/${stage}.json`,JSON.stringify({stats,errors},null,2));
  await page.screenshot({path:`${out}/${stage}.png`});
  console.log(JSON.stringify({stage,errors,frameMs:stats.frameMs,triangles:stats.inspection.triangles,models:stats.models.map(m=>({id:m.id,faces:m.meshes.reduce((n,x)=>n+x.faces,0)}))}));
  if(process.argv.includes('--smoke')){
    await page.evaluate(()=>{
      const l=townEditor.getLayout();l.instances=[];l.rows=l.rows.map((r,z)=>({start:3,length:z===4?4:0}));townEditor.loadLayout(l);
      ['road-straight','road-corner','road-tee','road-cross'].forEach((id,i)=>townEditor.state.place(id,3+i,4,i*90));
      townEditor.environment.set({time:'afternoon',weather:'snow',snowAmount:1});townEditor.showOverview({immediate:true});
    });
    await page.waitForFunction(()=>townEditor.sceneView.getInspection().snow.shown===1,null,{timeout:60000});
    const roads=await page.evaluate(()=>townEditor.getLayout().instances.map(p=>{
      const x=(p.x-4.5)*14,z=(p.z-4.5)*14;
      return {id:p.assetId,rotation:p.rotation,center:townEditor.weather.sampleSurface(x,z).point[1],edge:townEditor.weather.sampleSurface(x+6,z+6).point[1]};
    }));
    assert(roads.every(r=>r.center<r.edge-.2));
    const seams=await page.evaluate(()=>[-14,0,14].flatMap(x=>[-12,-7,-2].map(z=>{const v=townEditor.sceneView;return {x,z,difference:Math.abs(v.sampleGroundSnow(x-.02,z).y-v.sampleGroundSnow(x+.02,z).y)};})));
    assert(seams.every(s=>s.difference<.05));
    await page.screenshot({path:`${out}/four-road-shapes.png`});
    await page.evaluate(()=>townEditor.setWeather('clear'));
    const retained=await page.evaluate(()=>({environment:townEditor.environment.get(),formal:localStorage.getItem('rainy-corner.editor.layout.v1'),memory:__editor.renderer.info.memory}));
    assert(retained.environment.snowAmount>.99&&retained.formal===null);assert.deepEqual(errors,[]);
    await writeFile(`${out}/after-cleanup.json`,JSON.stringify({ok:true,errors,roads,seams,retained},null,2));
  }
  if(process.argv.includes('--verify')){
    const results=[],shots=[],stages=[];
    const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
    const check=async(name,run)=>{if(only&&name!==only)return;try{const evidence=await run();results.push({name,ok:true,evidence});}catch(e){results.push({name,ok:false,error:e.stack});}console.log(JSON.stringify(results.at(-1)));await writeFile(`${out}/checks.json`,JSON.stringify({results,errors,shots,stages},null,2));};
    const shot=async name=>{await page.screenshot({path:`${out}/${name}.png`});shots.push(name);};
    const settle=async amount=>{
      await page.waitForFunction(a=>{
        const v=townEditor.sceneView,all=[v.getInspection().snow,...v.getInstances().filter(e=>e.asset.snow).map(e=>e.asset.snow.getInspection())];
        return all.every(s=>s.error||Math.abs(s.shown-a)<.003);
      },amount,{timeout:90000});
      const s=await page.evaluate(()=>({ground:townEditor.sceneView.getInspection().snow,buildings:townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(e=>({id:e.placement.assetId,...e.asset.snow.getInspection()}))}));
      assert(!s.ground.error&&s.buildings.every(s=>!s.error));return s;
    };
    // Freeze only this test page's host advance; test the actual controller separately.
    await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();});
    await check('progressive-coverage-and-volume',async()=>{
      for(const amount of [0,.12,.4,.75,1]){
        await page.evaluate(a=>townEditor.environment.set({weather:'snow',snowAmount:a}),amount);
        const snapshot=await settle(amount);const attributes=await page.evaluate(()=>{
          const issues=[];townEditor.root.traverse(n=>{if(n.isMesh&&n.name==='surface-snow')for(const [key,a]of Object.entries(n.geometry.attributes)){let invalid=0;for(const v of a.array)if(!Number.isFinite(v))invalid++;if(key==='normal')for(let i=0;i<a.count;i++)if(Math.hypot(a.getX(i),a.getY(i),a.getZ(i))<.1)invalid++;if(invalid)issues.push({key,invalid,count:a.count});}});return issues;
        });assert.deepEqual(attributes,[]);snapshot.attributeIssues=attributes;stages.push({amount,...snapshot});console.log(JSON.stringify({amount,attributes}));
        await shot(`stage-${String(amount).replace('.','-')}`);
      }
      for(const id of ['sakura-house','convenience','mitsuya']){
        const s=stages.filter(s=>s.amount>0).map(s=>s.buildings.find(b=>b.id===id));
        assert(s.every(x=>Number.isFinite(x.maxThickness)&&x.sideInward===0&&x.bottomError<.0001));
        assert(s[0].coverageRatio<s[1].coverageRatio&&s[1].coverageRatio<s[3].coverageRatio);
        assert(s[0].maxThickness<s[3].maxThickness);
      }
      return stages.map(s=>({amount:s.amount,ground:s.ground.coverageRatio,buildings:s.buildings.map(b=>({id:b.id,coverage:b.coverageRatio,thickness:b.maxThickness,updateMs:b.rebuildMs,preparationMs:b.preparationMs}))}));
    });
    await check('visible-triangles-and-contact-query',async()=>{
      const r=await page.evaluate(async()=>{
        const T=await import('three'),ray=new T.Raycaster(),out=[];
        for(const {asset,placement}of townEditor.sceneView.getInstances().filter(e=>e.asset.snow)){
          asset.root.updateWorldMatrix(true,true);const m=asset.snow.root.getObjectByName('surface-snow'),p=m.geometry.attributes.position;
          let error=0,hits=0,bottomError=0,bottomCount=0;
          const physical=[];const {isRainSurface}=await import('/town/editor/rain-surfaces.js');
          asset.root.traverse(n=>{if(isRainSurface(n,asset.root)&&!n.material.transparent)physical.push(n);});townEditor.sceneView.root.children[0].traverse(n=>{if(n.isMesh)physical.push(n);});
          for(let i=0;i<35;i++){
            const x=-6+(i*5.17)%12,z=-6+(i*7.91)%12,hit=asset.snow.sample(x,z),origin=asset.root.localToWorld(new T.Vector3(x,15,z));
            ray.set(origin,new T.Vector3(0,-1,0));const rendered=ray.intersectObject(m,false)[0];
            if(hit&&rendered){const local=asset.root.worldToLocal(rendered.point.clone());error=Math.max(error,Math.abs(hit.y-local.y));hits++;}
            else if(!!hit!==!!rendered)error=Infinity;
          }
          for(let j=0;j<1500&&bottomCount<16;j++){
            const index=m.geometry.index,k=((j*7919)%Math.floor((index?.count??p.count)/3))*3,v=[0,1,2].map(i=>new T.Vector3().fromBufferAttribute(p,index?index.getX(k+i):k+i));
            const n=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));if(n.y>=-1e-9)continue;
            const c=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);
            const origin=asset.root.localToWorld(c.clone().add(new T.Vector3(0,.0002,0)));ray.set(origin,new T.Vector3(0,-1,0));
            const support=ray.intersectObjects(physical,false)[0];if(!support)continue;
            const y=asset.root.worldToLocal(support.point.clone()).y;bottomError=Math.max(bottomError,Math.abs(c.y-y));bottomCount++;
          }
          out.push({id:placement.assetId,hits,error,bottomCount,bottomError});
        }return out;
      });
      r.forEach(v=>{assert(v.hits>10&&v.error<.0001);assert(v.bottomCount>=12&&v.bottomError<.0005);});return r;
    });
    await check('plot-seams-and-sparse-snow-holes',async()=>{
      const seams=await page.evaluate(()=>townEditor.sceneView.getInstances().filter(e=>e.asset.snow).map(({placement:p})=>({id:p.assetId,samples:[-5,-2,1,5].map(dx=>{const x=(p.x-4.5)*14+dx,z=(p.z-4)*14;return [townEditor.weather.sampleSurface(x,z-.001)?.point[1],townEditor.weather.sampleSurface(x,z+.001)?.point[1]];})})));
      seams.forEach(s=>s.samples.forEach(([a,b])=>assert(Math.abs(a-b)<.03)));
      await page.evaluate(()=>townEditor.environment.set({snowAmount:.12}));await settle(.12);
      const holes=await page.evaluate(async()=>{
        const T=await import('three'),ray=new T.Raycaster(),r=[];
        for(const {asset,placement}of townEditor.sceneView.getInstances().filter(e=>e.asset.snow)){
          const m=asset.snow.root.getObjectByName('surface-snow');let empty=0,hit=0,error=0;
          // Retain all 45 original probes, plus a grid over the entire plot.
          // Sparse snow can legitimately miss a short list of interior points.
          for(let i=0;i<445;i++){
            const x=i<45?-5+(i*4.71)%10:-6.8+((i-45)%20+.5)*.68;
            const z=i<45?-5+(i*6.73)%10:-6.8+(Math.floor((i-45)/20)+.5)*.68;
            const h=asset.snow.sample(x,z);ray.set(asset.root.localToWorld(new T.Vector3(x,15,z)),new T.Vector3(0,-1,0));
            const visible=ray.intersectObject(m,false)[0];
            if(!h&&!visible)empty++;else if(h&&visible){hit++;error=Math.max(error,Math.abs(h.y-asset.root.worldToLocal(visible.point.clone()).y));}else error=Infinity;
          }
          r.push({id:placement.assetId,samples:445,empty,hit,error});
        }return r;
      });
      await page.evaluate(()=>townEditor.environment.set({snowAmount:1}));await settle(1);
      holes.forEach(h=>assert(h.empty>10&&h.hit>0&&h.error<.0001,JSON.stringify(h)));return {seams,holes};
    });
    await check('road-profile-contour-and-grass-burial' ,async()=>{
      const r=await page.evaluate(()=>{
        const v=townEditor.sceneView;
        return {center:v.sampleGroundSnow(-7,-7)?.y,edge:v.sampleGroundSnow(-7,-1)?.y,outside:v.sampleGroundSnow(60,60),
          lawn:v.sampleGroundSnow(-7,7)?.y,maxGrassTip:.012+1.035*(1-.36),inspection:v.getInspection().grass};
      });
      assert(r.center<r.edge-.25&&r.outside===null&&r.lawn>r.maxGrassTip,JSON.stringify(r));return r;
    });
    await check('four-periods-and-closeups',async()=>{
      const r=[];
      for(const time of ['morning','afternoon','dusk','night']){
        await page.evaluate(t=>townEditor.setTime(t),time);await page.waitForTimeout(300);await shot(`town-${time}`);
        const light=await page.evaluate(()=>__editor.inspection.lighting);assert(light.environment.time===time);r.push({time,lighting:light});
      }
      for(const id of ['sakura-house','mitsuya','convenience']){
        await page.evaluate(id=>{townEditor.setTime(id==='mitsuya'?'night':'afternoon');const p=townEditor.getLayout().instances.find(p=>p.assetId===id);__editor.cameraRig.focus(p.id,{immediate:true});},id);
        await page.waitForTimeout(500);await shot(`close-${id}`);
      }
      await page.evaluate(()=>{townEditor.setTime('afternoon');townEditor.showOverview({immediate:true});});return r;
    });
    await check('snow-and-rain-land-on-current-visible-surfaces',async()=>{
      await page.evaluate(()=>townEditor.setWeather('rain'));await page.waitForTimeout(500);
      const r=await page.evaluate(()=>{
        let maxError=0,underSnow=0,finite=true;
        const samples=townEditor.weather.getRainSamples();for(const s of samples){
          const hit=townEditor.weather.sampleSurface(s.point[0],s.point[2]);
          if(hit)maxError=Math.max(maxError,Math.abs(hit.point[1]-s.point[1]));
          if(s.headY<s.point[1]-.0001)underSnow++;finite&&=s.point.every(Number.isFinite);
        }return {count:samples.length,maxError,underSnow,finite};
      });
      assert(r.count>100&&r.maxError<.0001&&r.underSnow===0&&r.finite);await shot('snow-to-rain');
      await page.evaluate(()=>townEditor.setWeather('clear'));await shot('snow-after-clear');return r;
    });
    await check('rotate-move-delete-undo-shape-and-multiple-instances',async()=>{
      const result=await page.evaluate(()=>{
        const s=townEditor.state,v=townEditor.sceneView,p=s.getLayout().instances.find(p=>p.assetId==='mitsuya'),before=p.id;
        for(let i=0;i<4;i++)s.rotate(p.id);
        s.move(p.id,5,5,90);
        const moved=v.getInstances().find(e=>e.placement.id===p.id),root=moved.asset.root;
        const transformed=root.localToWorld(moved.asset.snow.root.position.clone().set(0,6,0)).toArray();
        const second=s.place('mitsuya',5,3,180);
        const shared=v.getInstances().filter(e=>e.placement.assetId==='mitsuya').map(e=>e.asset.snow.getInspection().sharedClients);
        s.remove(p.id);const removed=!v.getInstances().some(e=>e.placement.id===before);s.undo();
        const restored=s.getLayout().instances.find(e=>e.id===before);
        const rows=s.getLayout().rows;rows[5]={start:3,length:2};const plan=s.previewShape(rows);
        let refused=false;try{s.applyShape(plan);}catch{refused=true;}
        const next=s.previewShape(rows);s.applyShape(next,{confirmAffected:true});const removedByShape=!s.getLayout().instances.some(e=>e.id===before);s.undo();
        return {id:before,second:second.id,transformed,shared,removed,restored,refused,removedByShape,undo:s.getLayout().instances.find(e=>e.id===before)};
      });
      await settle(1);assert(result.removed&&result.refused&&result.removedByShape&&result.restored.id===result.undo.id);assert(result.shared.every(n=>n===2));
      await shot('rotated-and-restored');return result;
    });
    await check('shared-resource-and-part-replacement-isolation',async()=>{
      const r=await page.evaluate(async()=>{
        const T=await import('three'),v=townEditor.sceneView,entries=v.getInstances().filter(e=>e.placement.assetId==='mitsuya'),a=entries[0].asset,b=entries[1].asset;
        const bmesh=b.snow.root.getObjectByName('surface-snow'),geometry=bmesh.geometry;let geometryDisposed=0,ownedDisposed=0;
        geometry.addEventListener('dispose',()=>geometryDisposed++);
        a.snow.replacePart('roof-main',()=>{const root=new T.Group();return {root,setAmount(){},sample(){return null;},dispose(){ownedDisposed++;}};});
        const replaced=a.snow.getInspection().parts.find(p=>p.id==='roof-main').mode;
        const neighbour=b.snow.getInspection().parts.find(p=>p.id==='roof-main').mode;
        a.snow.replacePart('roof-main',null);
        const aGeometry=a.snow.root.getObjectByName('surface-snow').geometry;
        townEditor.state.remove(entries[0].placement.id);
        v.setEditing(true);v.preview({assetId:'mitsuya',x:5,z:5,rotation:270,valid:true});v.preview({assetId:'road-corner',x:5,z:5});v.setEditing(false);
        const {renderThumbnails}=await import('/town/editor/scene.js'),{createAsset}=await import('/town/editor/catalog.js');
        renderThumbnails([{id:'mitsuya'}],createAsset);
        return {replaced,neighbour,ownedDisposed,geometryDisposed,shared:aGeometry===geometry,remaining:!!b.snow.sample(0,0),error:b.snow.getInspection().error};
      });
      assert(r.replaced==='specialized'&&r.neighbour==='generic'&&r.ownedDisposed===1&&r.geometryDisposed===0&&r.shared&&r.remaining&&!r.error);return r;
    });
    await check('six-buildings-light-pool-and-performance',async()=>{
      await page.evaluate(()=>{const s=townEditor.state;s.place('convenience',3,5);s.place('convenience',4,5,90);s.place('sakura-house',5,5,270);townEditor.environment.set({time:'night',snowAmount:1,weather:'snow'});townEditor.showOverview({immediate:true});});
      await settle(1);await page.waitForTimeout(300);await shot('six-buildings-night');
      const r=await page.evaluate(async()=>{const ms=[];await new Promise(resolve=>{let last=performance.now();function f(t){ms.push(t-last);last=t;if(ms.length>=120)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);});ms.sort((a,b)=>a-b);return {lighting:__editor.inspection.lighting,median:ms[60],p95:ms[114],triangles:__editor.inspection.triangles};});
      assert(r.lighting.activeStoreLamps<=10&&r.lighting.activeDownlights<=4&&r.lighting.demand.point>10);return r;
    });
    await check('elapsed-clock-and-no-environment-undo' ,async()=>{
      const r=await page.evaluate(async()=>{
        const {createEnvironmentState}=await import('/town/editor/environment.js'),e=createEnvironmentState(),trace=[];
        e.set({weather:'snow'});for(const t of [0,15,60,90]){e.advance(t);trace.push(e.get().snowAmount);}
        e.set({weather:'clear'});e.advance(390);trace.push(e.get().snowAmount);
        e.set({weather:'snow'});e.advance(420);trace.push(e.get().snowAmount);
        e.set({weather:'rain',time:'night'});e.advance(450);trace.push(e.get().snowAmount);
        const rev=townEditor.state.revision;townEditor.environment.set({time:'dusk',weather:'clear',snowAmount:.75});
        return {trace,revision:rev,after:townEditor.state.revision};
      });
      assert.deepEqual(r.trace,[0,.25,1,1,0,.5,0]);assert(r.revision===r.after);return r;
    });
    await check('UI-file-export-import-old-layout-invalid-atomic',async()=>{
      await page.locator('#enter-editor').click();await page.locator('[data-panel="save"]').click();
      const waiting=page.waitForEvent('download');await page.locator('#export').click();const download=await waiting;
      const text=await readFile(await download.path(),'utf8'),doc=JSON.parse(text);assert(doc.format==='maruko-town'&&doc.version===2);
      await page.locator('#import-file').setInputFiles({name:'town.json',mimeType:'application/json',buffer:Buffer.from(text)});
      await page.waitForTimeout(150);
      const r=await page.evaluate(text=>{
        const doc=JSON.parse(text),before=townEditor.exportJSON(),invalid=[];
        for(const bad of [{...doc,version:900},{...doc,environment:{...doc.environment,snowAmount:-1}},{...doc,layout:{...doc.layout,instances:[...doc.layout.instances,doc.layout.instances[0]]}},
          {...doc,layout:{...doc.layout,instances:[{...doc.layout.instances[0],x:99}]}},{...doc,layout:{...doc.layout,instances:[{...doc.layout.instances[0],assetId:'unknown'}]}}]){
          let rejected=false;try{townEditor.importJSON(JSON.stringify(bad));}catch{rejected=true;}
          invalid.push({rejected,unchanged:townEditor.exportJSON()===before});
        }
        townEditor.importJSON(JSON.stringify(doc.layout));
        dispatchEvent(new Event('pagehide'));
        return {invalid,oldEnvironment:townEditor.environment.get(),expected:doc.environment,layout:townEditor.getLayout(),saved:JSON.parse(localStorage.getItem('rainy-corner.editor.review.snow.v1')),formal:localStorage.getItem('rainy-corner.editor.layout.v1')};
      },text);
      assert(r.invalid.every(x=>x.rejected&&x.unchanged));assert.deepEqual(r.oldEnvironment,r.expected);assert(r.formal===null);
      assert.deepEqual(r.saved.layout,r.layout);await writeFile(`${out}/exported-town.json`,text);return {invalid:r.invalid,oldEnvironment:r.oldEnvironment,formalStorageUntouched:r.formal===null,instances:r.layout.instances};
    });
    await check('reload-retains-environment-and-stable-instance-ids',async()=>{
      const before=await page.evaluate(()=>{dispatchEvent(new Event('pagehide'));return {layout:townEditor.getLayout(),environment:townEditor.environment.get()};});
      await page.reload();await page.waitForFunction(()=>window.__editor?.ready);
      const after=await page.evaluate(()=>({layout:townEditor.getLayout(),environment:townEditor.environment.get(),formal:localStorage.getItem('rainy-corner.editor.layout.v1')}));
      assert.deepEqual(after.layout,before.layout);assert(after.environment.time===before.environment.time&&after.environment.weather===before.environment.weather&&Math.abs(after.environment.snowAmount-before.environment.snowAmount)<.015);
      assert(after.formal===null);return {before,after};
    });
    await check('original-exterior-files-preserved',async()=>{
      const baseline=JSON.parse(await readFile('artifacts/editor/snow-surface-samples/formal-before.json','utf8'));
      const selected=baseline.filter(x=>x.path.startsWith('town/assets/')&&!x.path.endsWith('/snow.js')&&!x.path.includes('/shared/')&&!x.path.includes('/interior/'));
      const mismatch=[];
      for(const f of selected){const hash=createHash('sha256').update(await readFile(`dist/${f.path}`)).digest('hex');if(hash.toLowerCase()!==f.sha256.toLowerCase())mismatch.push(f.path);}
      assert.deepEqual(mismatch,[]);return {originalAssetFiles:selected.length,mismatch,excludedConcurrentWork:'sakura-house/interior/: independent room work changed during this run; historical broad-check failure retained in checks-before-boundaries.json'};
    });
    await writeFile(`${out}/checks.json`,JSON.stringify({results,errors,shots,stages},null,2));
    assert.deepEqual(errors,[]);assert(results.every(r=>r.ok));
  }
}finally{await browser.close();}
