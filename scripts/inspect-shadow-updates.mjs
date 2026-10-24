// Scoped browser verification; independent profile/review storage, no user map access.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out='artifacts/editor/shadow-update';
const red=process.argv.includes('--red');
const reference=process.argv.includes('--reference-repeat');
await mkdir(out,{recursive:true});
const report={red,checks:[],errors:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>report.errors.push(e.message));
  let main=await readFile(red||reference?`${out}/before-source/main.js`:'dist/main.js','utf8');
  main=main.replace('time+=elapsedDt','time=0');
  if(!red)main=main.replaceAll('frameId=requestAnimationFrame(draw);','if(!window.__shadowManual)frameId=requestAnimationFrame(draw);')
    .replace('window.townEditor=Object.freeze',`window.__shadowTick=draw;window.__shadowRenderOnly=(force=false)=>{${reference?'renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();':'if(force)shadows.invalidate();renderScene();'}return renderer.domElement.toDataURL('image/png');};window.townEditor=Object.freeze`);
  await page.route('**/main.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:main}));
  const oldLighting=await readFile(`${out}/before-source/lighting.js`,'utf8');
  await page.route('**/__shadow-reference-lighting.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:oldLighting}));
  if(red||reference){const body=await readFile(`${out}/before-source/lighting.js`,'utf8');await page.route('**/town/editor/lighting.js',r=>r.fulfill({status:200,contentType:'text/javascript',body}));}
  await page.goto('http://127.0.0.1:4173/?review=snow');
  await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
  await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();townEditor.environment.set({weather:'clear',snowAmount:0});townEditor.showOverview({immediate:true});});
  await page.waitForTimeout(500);
  const updates=await page.evaluate(async()=>{
    const counts={};__editor.scene.traverse(n=>{if(n.isLight&&n.shadow){const old=n.shadow.updateMatrices.bind(n.shadow);counts[n.id]=0;n.shadow.updateMatrices=(...args)=>{counts[n.id]++;return old(...args);};}});
    await new Promise(resolve=>{let i=0;function frame(){if(++i===24)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
    return Object.values(counts).reduce((a,b)=>a+b,0);
  });
  report.checks.push({name:'unchanged-scene-reuses-shadow-maps',updates});
  if(!reference)assert.equal(updates,0,'UNCHANGED_SHADOW_REDRAW: unchanged scene rendered shadow maps');
  if(!red){
    await page.evaluate(()=>window.__shadowManual=true);await page.waitForTimeout(100);
    await page.evaluate(async()=>{const T=await import('three'),m=await import('/__shadow-reference-lighting.js');const scene=new T.Scene();scene.background=new T.Color();window.__referenceLighting=m.createPreviewLighting(scene,townEditor.sceneView);});
    const tick=()=>page.evaluate(()=>window.__shadowTick(performance.now()));
    const hash=b=>createHash('sha256').update(b).digest('hex');
    async function pixelDifference(a,b){
      if(a.equals(b))return {pixels:0,maxChannelDelta:0};
      return page.evaluate(async urls=>{
        const c=document.createElement('canvas');c.width=1280;c.height=800;const ctx=c.getContext('2d',{willReadFrequently:true});
        const data=[];for(const url of urls){const im=new Image();im.src=url;await im.decode();ctx.clearRect(0,0,1280,800);ctx.drawImage(im,0,0);data.push(ctx.getImageData(0,0,1280,800).data);}
        let pixels=0,maxChannelDelta=0;for(let i=0;i<data[0].length;i+=4){let changed=false;for(let j=0;j<4;j++){const delta=Math.abs(data[0][i+j]-data[1][i+j]);maxChannelDelta=Math.max(maxChannelDelta,delta);changed ||= delta!==0;}if(changed)pixels++;}return {pixels,maxChannelDelta};
      },[a,b].map(b=>'data:image/png;base64,'+b.toString('base64')));
    }
    async function pixels(name){
      if(reference)name=`reference-${name}`;
      await tick();
      const firstState=await page.evaluate(()=>__editor.shadows?.getInspection());
      // An unchanged second render is used for both sides. The old always-refresh renderer
      // has the same one-channel/one-pixel transition on the first morning render (reference-repeat.json).
      const cached=Buffer.from((await page.evaluate(()=>__shadowRenderOnly(false))).split(',')[1],'base64');
      await writeFile(`${out}/${name}.png`,cached);
      const state=await page.evaluate(()=>__editor.shadows?.getInspection());
      const firstForced=Buffer.from((await page.evaluate(()=>__shadowRenderOnly(true))).split(',')[1],'base64');
      const forced=Buffer.from((await page.evaluate(()=>__shadowRenderOnly(true))).split(',')[1],'base64');
      const repeated=Buffer.from((await page.evaluate(()=>__shadowRenderOnly(true))).split(',')[1],'base64');
      report.checks.push({name,hash:hash(cached),forcedHash:hash(forced),firstForcedHash:hash(firstForced),repeatForcedHash:hash(repeated),state,firstState});
      if(!forced.equals(repeated)){
        await writeFile(`${out}/${name}-reference-2.png`,forced);await writeFile(`${out}/${name}-reference-3.png`,repeated);
      }
      const referenceDifference=await pixelDifference(forced,repeated);
      const difference=await pixelDifference(cached,forced);
      Object.assign(report.checks.at(-1),{difference,referenceDifference});
      // Bound 8-bit render rounding by channel, and report the number of affected
      // pixels. No geometry, lighting, resolution or material tolerance is used.
      assert(referenceDifference.maxChannelDelta<=1,`Forced reference itself unstable: ${name} ${JSON.stringify(referenceDifference)}`);
      if(!cached.equals(forced)){
        await writeFile(`${out}/${name}-forced.png`,forced);
        for(let i=2;i<=3;i++){
          const other=Buffer.from((await page.evaluate(()=>__shadowRenderOnly(true))).split(',')[1],'base64');await writeFile(`${out}/${name}-forced-${i}.png`,other);report.checks.at(-1)[`forced${i}`]=hash(other);
        }
      }
      assert(difference.maxChannelDelta<=1,`Cached shadow pixels differ: ${name} ${JSON.stringify(difference)}`);
      const lighting=await page.evaluate(()=>{const current=__editor.inspection.lighting;__referenceLighting.setEnvironment(current.environment);__referenceLighting.update(__editor.cameraRig.controls.target,__editor.camera.position.distanceTo(__editor.cameraRig.controls.target));return {old:__referenceLighting.getInspection(),current};});
      assert.deepEqual(lighting.current,lighting.old,`Light assignments changed: ${name}`);
      console.log(`${name}: ${difference.pixels===0?'exact pixels':`${difference.pixels} pixels / one channel level (recorded)`}; exact light assignments`);
    }
    const settle=amount=>page.waitForFunction(a=>townEditor.sceneView.getInstances().every(e=>!e.asset.snow||e.asset.snow.getInspection().shown===a)&&townEditor.sceneView.getInspection().snow.shown===a,amount,{timeout:90000});
    for(const time of ['morning','afternoon','dusk','night']){
      await page.evaluate(time=>townEditor.environment.set({time}),time);await pixels(`clear-${time}`);
    }
    for(const amount of [.25,1]){
      await page.evaluate(amount=>townEditor.environment.set({weather:'snow',snowAmount:amount}),amount);await settle(amount);await pixels(`snow-${amount}`);
    }
    await page.evaluate(()=>__editor.cameraRig.focus('review-mitsuya',{immediate:true}));await pixels('mitsuya-night-close');
    for(const time of ['morning','afternoon','dusk','night']){
      await page.evaluate(time=>{townEditor.environment.set({time});townEditor.showOverview({immediate:true});},time);await pixels(`snow-${time}`);
    }
    await page.evaluate(()=>{
      const c=__editor.cameraRig,delta=c.camera.position.clone().sub(c.controls.target),x=delta.x;delta.x=delta.z;delta.z=-x;c.camera.position.copy(c.controls.target).addScaledVector(delta,.75);c.controls.update();
    });await pixels('camera-rotate-zoom');
    await page.evaluate(()=>townEditor.state.rotate('review-mitsuya'));await settle(1);await pixels('building-rotate');
    await page.evaluate(()=>townEditor.state.move('review-mitsuya',5,5));await settle(1);await pixels('building-move');
    await page.evaluate(()=>townEditor.state.remove('review-mitsuya'));await settle(1);await pixels('building-delete');
    await page.evaluate(()=>townEditor.state.undo());await settle(1);await pixels('building-undo');
    await page.evaluate(()=>{const rows=townEditor.getLayout().rows;rows[5]={start:3,length:2};townEditor.state.applyShape(townEditor.state.previewShape(rows),{confirmAffected:true});});await settle(1);await pixels('shape-removal');
    await page.evaluate(()=>townEditor.state.undo());await settle(1);await pixels('shape-undo');
    await page.evaluate(()=>{townEditor.setEditing(true);townEditor.sceneView.preview({assetId:'sakura-house',x:3,z:5,rotation:0});});
    await page.waitForFunction(async()=>{const m=(await import('/town/assets/shared/snow.js')).getSnowMemoryInspection();return !m.active&&!m.queued;},null,{timeout:90000});await pixels('ghost-visible');
    await page.evaluate(()=>townEditor.sceneView.preview({assetId:'sakura-house',x:4,z:5,rotation:90}));await pixels('ghost-move');
    await page.evaluate(()=>{townEditor.sceneView.preview();townEditor.setEditing(false);});await pixels('ghost-hidden');
    await page.evaluate(()=>townEditor.environment.set({weather:'rain',snowAmount:.25}));await settle(.25);await pixels('rain-residual-snow');
    await page.evaluate(()=>townEditor.environment.set({weather:'clear',snowAmount:0}));await pixels('melt-restored');
    // Drive the original door animation, not a mock transform. Stop the host's next visitor update for this comparison.
    report.door=await page.evaluate(()=>{
      const e=townEditor.sceneView.getInstances().find(e=>e.placement.id==='review-mart'),asset=e.asset;
      const building=asset.root.getObjectByName('original-convenience-building');
      const visitor=building.localToWorld(building.position.clone().set(.45,0,3.08));
      const nodes=[];building.traverse(n=>{if(n.userData.closedX!==undefined)nodes.push(n);});
      window.__originalDoorUpdate=asset.update;window.__doorAsset=asset;window.__doorVisitor=visitor;
      asset.update=()=>{};__editor.cameraRig.focus('review-mart',{immediate:true});
      return {before:nodes.map(n=>n.position.x),count:nodes.length};
    });
    for(let i=0;i<4;i++){
      await page.evaluate(()=>__originalDoorUpdate(.05,__doorVisitor));await pixels(`door-open-${i}`);
    }
    report.door.after=await page.evaluate(()=>{const v=[];__doorAsset.root.traverse(n=>{if(n.userData.closedX!==undefined)v.push(n.position.x);});return v;});
    assert.notDeepEqual(report.door.before,report.door.after,'Original door did not animate');
    for(let i=0;i<4;i++){
      await page.evaluate(()=>__originalDoorUpdate(.05,{x:9999,z:9999}));await pixels(`door-close-${i}`);
    }
    await page.evaluate(()=>{__doorAsset.update=__originalDoorUpdate;townEditor.showOverview({immediate:true});});
    // Visible-material and in-place geometry changes, not just layout event invalidation.
    await page.evaluate(async()=>{
      const T=await import('three'),asset=townEditor.sceneView.getInstances()[0].asset;let mesh;
      asset.root.traverse(n=>{if(!mesh&&n.isMesh&&n.castShadow&&!Array.isArray(n.material))mesh=n;});
      window.__probe={mesh,geometry:mesh.geometry,material:mesh.material};mesh.geometry=mesh.geometry.clone();mesh.material=mesh.material.clone();
      mesh.material.visible=false;
    });await pixels('caster-material-hidden');
    await page.evaluate(()=>{__probe.mesh.material.visible=true;__probe.mesh.geometry.attributes.position.setY(0,__probe.mesh.geometry.attributes.position.getY(0)+1);__probe.mesh.geometry.attributes.position.needsUpdate=true;});await pixels('caster-geometry-version');
    await page.evaluate(()=>{__probe.mesh.geometry.dispose();__probe.mesh.material.dispose();__probe.mesh.geometry=__probe.geometry;__probe.mesh.material=__probe.material;});await pixels('caster-restored');
    // Each spotlight must invalidate independently of the sun, and survive hiding/re-enabling.
    await page.evaluate(()=>{window.__spot=__editor.scene.getObjectByName('town-lighting').children.find(n=>n.isSpotLight&&n.intensity>0);__spot.visible=false;});await pixels('spot-hidden');
    await page.evaluate(()=>__spot.visible=true);await pixels('spot-restored');
    report.lightPool=await page.evaluate(()=>({assignments:__editor.inspection.lighting.assignments,tracked:__editor.shadows.getInspection().trackedLights}));
    await page.evaluate(()=>{const l=townEditor.getLayout();l.instances=[];townEditor.loadLayout(l);});
    await pixels('all-buildings-removed');
    report.released=await page.evaluate(()=>__editor.shadows.getInspection());
    await page.evaluate(()=>__referenceLighting.dispose());
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}
finally{await writeFile(`${out}/${red?'red':reference?'reference-repeat':'checks'}.json`,JSON.stringify(report,null,2));await browser.close();}
