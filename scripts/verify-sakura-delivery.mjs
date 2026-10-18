import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const dir='artifacts/buildings/sakura-house';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(path.resolve(dir,'樱家-三维外观预览.html')).href);await page.waitForFunction(()=>window.__sakura?.ready);await page.getByRole('button',{name:'与 AME MART 同尺度'}).click();assert(await page.evaluate(()=>window.__sakura.inspect().comparison));await page.getByRole('button',{name:'回到全景'}).click();
  await page.getByRole('button',{name:'自动环绕'}).click();const start=await page.evaluate(()=>window.__sakura.inspect().camera);await page.waitForTimeout(450);const rotated=await page.evaluate(()=>window.__sakura.inspect().camera);assert.notDeepEqual(start.position,rotated.position);await page.getByRole('button',{name:'自动环绕'}).click();
  await page.keyboard.press('Home');const before=await page.evaluate(()=>window.__sakura.inspect().camera.zoom);await page.mouse.move(700,500);await page.mouse.wheel(0,-350);await page.waitForTimeout(250);assert.notEqual(before,await page.evaluate(()=>window.__sakura.inspect().camera.zoom));
  await page.keyboard.press('Home');await page.screenshot({path:`${dir}/14-offline-preview.png`});
  await page.getByRole('button',{name:'夜晚',exact:true}).click();await page.getByRole('button',{name:'下雨',exact:true}).click();
  const first=await page.evaluate(()=>window.__sakura.inspect().environment);assert(first.lightsOn&&first.rainOn);
  await page.waitForTimeout(400);const last=await page.evaluate(()=>window.__sakura.inspect().environment);assert.notDeepEqual(first.samples,last.samples);
  await page.getByRole('button',{name:'午后',exact:true}).click();await page.getByRole('button',{name:'晴天',exact:true}).click();
  // Independent roof ray probes detect openings that a plot bounding box cannot catch.
  const coverage=await page.evaluate(async()=>{const T=await import('@sakura/vendor/three.module.js'),root=window.__sakura.house.root,meshes=root.children.filter(o=>o.isMesh),ray=new T.Raycaster(),misses=[];let count=0;
    for(let x=-5.05;x<4.15;x+=.19)for(let z=-3.9;z<3.1;z+=.19){ray.set(new T.Vector3(x,10,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(meshes,false)[0];if(!hit||hit.point.y<2.6)misses.push([x,z,hit?.point.y]);count++;}
    for(let x=4.4;x<5.95;x+=.19)for(let z=-3;z<3.1;z+=.19){ray.set(new T.Vector3(x,10,z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(meshes,false)[0];if(!hit||hit.point.y<2.6)misses.push([x,z,hit?.point.y]);count++;}
    const gateHits=[];for(let z=2.55;z<4.5;z+=.15){ray.set(new T.Vector3(-7,.9,z),new T.Vector3(1,0,0));const hit=ray.intersectObjects(meshes,false)[0];if(hit&&hit.point.x<-6.2)gateHits.push({z,x:hit.point.x});}return {rays:count,misses,gateHits};});console.log(JSON.stringify({coverage}));assert.equal(coverage.misses.length,0);assert.equal(coverage.gateHits.length,0);
  assert.equal(errors.length,0);assert.equal(requests.length,0);
  const beforeFiles=JSON.parse((await readFile(`${dir}/protected-before.json`,'utf8')).replace(/^\uFEFF/,'')),changed=[];
  for(const entry of beforeFiles){const hash=createHash('sha256').update(await readFile(entry.Path)).digest('hex').toUpperCase();if(hash!==entry.Hash)changed.push(entry.Path);}
  assert.equal(changed.length,0);
  const report={offlineOpened:true,offlineNightRain:true,offlineComparison:true,offlineRotation:true,offlineZoom:true,networkRequests:requests,errors,roofCoverage:coverage,protectedFiles:{checked:beforeFiles.length,changed},userArtApproval:{exterior02:'approved by user',addedLamp:'approved by user',exterior03States:'pending user review'}};
  await writeFile(`${dir}/delivery-inspection.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}



