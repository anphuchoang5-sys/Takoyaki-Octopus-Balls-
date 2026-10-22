// Differential checks against the recorded pre-fix commit; fresh review storage only.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='artifacts/editor/snow-allocation-fix',base='13f9b05d7c2384d53326646252bb6c523b1d05f1';
const flakesOnly=process.argv.includes('--flakes-only');
const paths=['main.js','town/assets/shared/snow-geometry.js','town/assets/shared/snow-surfaces.js','town/assets/shared/snow.js','town/editor/rain-surfaces.js','town/editor/ground-snow.js','town/editor/scene.js','town/editor/snowfall.js','town/editor/lighting.js'];
await mkdir(out,{recursive:true});
const report={base,images:[],queries:[],flakes:[],lights:[],errors:[]},hash=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const dpr of flakesOnly?[1]:[1,2])for(const variant of ['before','after']){
    const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr});page.on('pageerror',e=>report.errors.push(e.message));
    for(const path of paths){
      let body=variant==='before'?execFileSync('git',['show',`${base}:dist/${path}`],{encoding:'utf8',maxBuffer:8*1024*1024}):await readFile(`dist/${path}`,'utf8');
      if(path==='main.js')body=body.replace('time+=elapsedDt','time=0');
      await page.route('**/'+path,r=>r.fulfill({status:200,contentType:'text/javascript',body}));
    }
    await page.addInitScript(()=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<=5?3:0})),instances:['sakura-house','convenience','mitsuya','road-straight','road-corner','road-cross'].map((assetId,i)=>({id:`fixed-${i}`,assetId,x:3+i%3,z:3+Math.floor(i/3),rotation:i===4?90:0}))},environment:{time:'afternoon',weather:'clear',snowAmount:0}})));
    await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
    await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();townEditor.environment.set({snowAmount:1});});
    await page.waitForFunction(()=>townEditor.sceneView.getInstances().every(e=>!e.asset.snow||e.asset.snow.getInspection().shown===1)&&townEditor.sceneView.getInspection().snow.shown===1,null,{timeout:90000});
    for(const mode of flakesOnly?[]:['morning','afternoon','dusk','night','close','rotate']){
      await page.evaluate(mode=>{
        if(['morning','afternoon','dusk','night'].includes(mode)){townEditor.environment.set({time:mode});townEditor.showOverview({immediate:true});}
        if(mode==='close')__editor.cameraRig.focus('fixed-2',{immediate:true});
        if(mode==='rotate'){const {camera,controls}=__editor.cameraRig;const v=camera.position.clone().sub(controls.target);const x=v.x;v.x=v.z;v.z=-x;camera.position.copy(controls.target).addScaledVector(v,.8);controls.update();}
      },mode);
      await page.waitForTimeout(350);const file=`${variant}-dpr${dpr}-${mode}.png`,png=await page.screenshot({path:`${out}/${file}`});
      const entry={variant,dpr,mode,file,hash:hash(png)};report.images.push(entry);
      if(variant==='after')assert.equal(entry.hash,report.images.find(e=>e.variant==='before'&&e.dpr===dpr&&e.mode===mode).hash,`Pixels changed: ${mode}/DPR${dpr}`);
    }
    if(dpr===1){
      const values=await page.evaluate(async variant=>{
        const T=await import('three'),{createRainSurfaces}=await import('/town/editor/rain-surfaces.js');
        const surfaces=createRainSurfaces({state:townEditor.state,sceneView:townEditor.sceneView});surfaces.rebuild();
        const result=[],out={point:[0,0,0],normal:[0,0,0]},local={y:0,normal:new T.Vector3(),part:0};let reused=0;
        for(let x=-28.03;x<14.5;x+=.67)for(let z=-28.09;z<14.5;z+=.69){
          const a=surfaces.sample(x,z);result.push(a);
          if(variant==='after'){
            const b=surfaces.sampleInto(x,z,out);if(JSON.stringify(a)!==JSON.stringify(b))throw Error('world sampleInto mismatch');
            if(b!==null&&b!==out)throw Error('world sampleInto did not reuse output');reused++;
          }
        }
        if(variant==='after')for(const {asset}of townEditor.sceneView.getInstances().filter(e=>e.asset.snow))for(let x=-7;x<=7;x+=.73)for(let z=-7;z<=7;z+=.71){
          const a=asset.snow.sample(x,z),b=asset.snow.sampleInto(x,z,local);
          if(JSON.stringify(a)!==JSON.stringify(b))throw Error('local sampleInto mismatch');reused++;
        }
        surfaces.dispose();return {result,reused};
      },variant);
      const entry={variant,count:values.result.length,reused:values.reused,hash:hash(JSON.stringify(values.result))};report.queries.push(entry);
      if(variant==='after')assert.equal(entry.hash,report.queries[0].hash,'Actual surface results changed');
      const falls=await page.evaluate(()=>{
        townEditor.environment.set({weather:'snow'});const frames=[];
        for(const t of [0,.5,4,12,30]){townEditor.weather.update(t);const mesh=__editor.scene.getObjectByName('全镇六角飘雪');frames.push({t,matrix:Array.from(mesh.instanceMatrix.array),samples:townEditor.weather.getInspection().snowfall.samples});}
        return frames;
      });
      report.flakes.push({variant,frames:falls.length,hash:hash(JSON.stringify(falls))});
      if(variant==='after')assert.equal(report.flakes[1].hash,report.flakes[0].hash,'Snowfall motion/occlusion changed');
      if(variant==='after'){
        const lights=async stage=>{
          await page.waitForTimeout(250);
          const data=await page.evaluate(()=>__editor.scene.children.find(n=>n.name==='town-lighting').children.filter(n=>n.isSpotLight).map(n=>({intensity:n.intensity,castShadow:n.castShadow,map:!!n.shadow.map})));
          assert(data.every(l=>l.intensity>0?l.castShadow&&l.map:!l.castShadow&&!l.map));report.lights.push({stage,data});
        };
        await lights('active');await page.evaluate(()=>townEditor.state.remove('fixed-2'));await lights('delete');
        await page.evaluate(()=>townEditor.state.undo());await lights('undo');
        await page.evaluate(()=>{const asset=townEditor.sceneView.getInstances().find(e=>e.placement.id==='fixed-2').asset;window.__savedDescriptors=asset.getLightingDescriptors;asset.getLightingDescriptors=()=>[];});await lights('empty-descriptors');
        await page.evaluate(()=>{const asset=townEditor.sceneView.getInstances().find(e=>e.placement.id==='fixed-2').asset;asset.getLightingDescriptors=__savedDescriptors;});await lights('reenabled');
        report.replacement=await page.evaluate(async()=>{
          const T=await import('three'),snow=townEditor.sceneView.getInstances().find(e=>e.placement.id==='fixed-2').asset.snow;
          const original=snow.sample(0,0),normal=new T.Vector3(0,1,0),out={y:0,normal:new T.Vector3(),part:0};let disposed=0;
          snow.replacePart('roof-main',()=>({root:new T.Group(),setAmount(){},sample(){return {y:99,normal};},dispose(){disposed++;}}));
          const first=snow.sampleInto(0,0,out);if(first!==out||first.y!==99)throw Error('Legacy replacement not sampled');
          out.normal.set(0,0,0);if(normal.y!==1||snow.sample(0,0).normal.y!==1)throw Error('Caller mutated replacement normal');
          snow.replacePart('roof-main',null);
          if(JSON.stringify(snow.sample(0,0))!==JSON.stringify(original))throw Error('Stale replacement lookup');
          return {legacyHeight:first.y,normalIsolated:true,genericRestored:true,disposed};
        });assert.equal(report.replacement.disposed,1);
      }
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);
    await page.close();console.log(`${variant} DPR${dpr} passed`);
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}
finally{await writeFile(`${out}/${flakesOnly?'flakes':'differential'}.json`,JSON.stringify(report,null,2));await browser.close();}
