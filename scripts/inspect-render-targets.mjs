// Framebuffer ownership and unchanged-output checks in an isolated review profile.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const red=process.argv.includes('--red'),out='artifacts/editor/resident-memory';await mkdir(out,{recursive:true});
const report={red,targets:[],images:[],errors:[]},hash=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  for(const dpr of red?[1]:[1,2])for(const variant of red?['before']:['before','after']){
    const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr});page.on('pageerror',e=>report.errors.push(e.message));
    let body=await readFile(variant==='before'?`${out}/before-source/main.js`:'dist/main.js','utf8');
    body=body.replace('time+=elapsedDt','time=0').replaceAll('frameId=requestAnimationFrame(draw);','if(!window.__residentManual)frameId=requestAnimationFrame(draw);')
      .replace('window.__editor={environment,','window.__editor={composer,environment,')
      .replace('window.townEditor=Object.freeze',"window.__residentTick=draw;window.__residentRender=()=>{renderScene();return canvas.toDataURL('image/png');};window.townEditor=Object.freeze");
    await page.route('**/main.js',r=>r.fulfill({status:200,contentType:'text/javascript',body}));
    await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready,null,{timeout:60000});
    await page.evaluate(()=>{townEditor.environment.advance=()=>townEditor.environment.get();window.__residentManual=true;});await page.waitForTimeout(100);
    const inspect=async name=>{
      const targets=await page.evaluate(()=>[__editor.composer.renderTarget1,__editor.composer.renderTarget2].map(t=>({width:t.width,height:t.height,samples:t.samples,allocated:!!__editor.renderer.properties.get(t).__webglFramebuffer})));
      report.targets.push({variant,dpr,name,targets});
      assert.equal(targets.filter(t=>t.allocated).length,red||variant==='after'?1:2,'REDUNDANT_MSAA_TARGET: screen output caused a second scene buffer');
      assert(targets.every(t=>t.samples===4),'Original four-sample scene antialiasing changed');
    };
    await inspect('initial');
    if(red)continue;
    async function capture(name){
      await page.evaluate(()=>{__residentTick(performance.now());__residentRender();__residentRender();});
      const png=Buffer.from((await page.evaluate(()=>__residentRender())).split(',')[1],'base64'),file=`${variant}-dpr${dpr}-${name}.png`;
      await writeFile(`${out}/${file}`,png);report.images.push({variant,dpr,name,file,hash:hash(png)});
      if(variant==='after'){
        const reference=report.images.find(x=>x.variant==='before'&&x.dpr===dpr&&x.name===name);
        let difference={pixels:0,maxChannelDelta:0};
        if(hash(png)!==reference.hash){
          const old=await readFile(`${out}/${reference.file}`);
          difference=await page.evaluate(async urls=>{
            const images=await Promise.all(urls.map(async url=>{const im=new Image();im.src=url;await im.decode();return im;}));
            const c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height;const ctx=c.getContext('2d',{willReadFrequently:true}),data=[];
            for(const im of images){ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(im,0,0);data.push(ctx.getImageData(0,0,c.width,c.height).data);}
            let pixels=0,maxChannelDelta=0;for(let i=0;i<data[0].length;i+=4){let changed=false;for(let j=0;j<4;j++){const d=Math.abs(data[0][i+j]-data[1][i+j]);changed ||= d!==0;maxChannelDelta=Math.max(maxChannelDelta,d);}if(changed)pixels++;}return {pixels,maxChannelDelta};
          },[old,png].map(b=>'data:image/png;base64,'+b.toString('base64')));
        }
        report.images.at(-1).difference=difference;
        // The unchanged renderer can vary at the final 8-bit rounding bit (recorded
        // in shadow-update/reference-repeat.json). Preserve and report every difference.
        assert(difference.maxChannelDelta<=1,`Rendered pixels changed: ${name} DPR${dpr} ${JSON.stringify(difference)}`);
      }
      console.log(`${variant} DPR${dpr} ${name}: ${hash(png).slice(0,12)}`);
    }
    for(const amount of [0,.25,1]){
      await page.evaluate(a=>townEditor.environment.set({weather:a?'snow':'clear',snowAmount:a}),amount);
      await page.waitForFunction(a=>townEditor.sceneView.getInstances().every(e=>!e.asset.snow||e.asset.snow.getInspection().shown===a)&&townEditor.sceneView.getInspection().snow.shown===a,amount,{timeout:90000});
      for(const time of ['morning','afternoon','dusk','night']){await page.evaluate(t=>townEditor.environment.set({time:t}),time);await capture(`snow-${amount}-${time}`);}
    }
    await page.evaluate(()=>__editor.cameraRig.focus('review-mitsuya',{immediate:true}));await capture('warm-snow-close');
    await page.evaluate(()=>townEditor.state.rotate('review-mitsuya'));await capture('rotated');
    await page.setViewportSize({width:1024,height:720});await page.waitForTimeout(100);await capture('resized');await inspect('resized');
    assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);
    await page.evaluate(()=>townEditor.dispose());await page.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e.message);}finally{await writeFile(`${out}/targets-${red?'red':'checks'}.json`,JSON.stringify(report,null,2)+'\n');await browser.close();}
