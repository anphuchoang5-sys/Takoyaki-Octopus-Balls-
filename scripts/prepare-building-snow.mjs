// Reuse the running local editor and the production algorithm. No service,
// alternative model, user storage or preview implementation is created here.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const out='artifacts/editor/snow-startup';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[];
try{
  const page=await browser.newPage();
  await page.addInitScript(()=>localStorage.setItem('rainy-corner.editor.review.snow.v1',JSON.stringify({format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:3,length:z===3?3:0})),instances:['sakura-house','convenience','mitsuya'].map((assetId,i)=>({id:`bake-${i}`,assetId,x:i+3,z:3,rotation:0}))},environment:{time:'afternoon',weather:'clear',snowAmount:0}})));
  await page.goto('http://127.0.0.1:4173/?review=snow');await page.waitForFunction(()=>window.__editor?.ready);
  for(const assetId of ['sakura-house','convenience','mitsuya']){
    const result=await page.evaluate(async assetId=>{
      const T=await import('three'),{prepareSnowSurface,createSurfaceSnow}=await import('/town/assets/shared/snow-geometry.js');
      const {snowSourceFingerprint,encodePreparedSnow,decodePreparedSnow}=await import('/town/assets/shared/snow-prepared.js');
      const asset=townEditor.sceneView.getInstances().find(e=>e.placement.assetId===assetId).asset;
      const {source,options}=asset.snow.getPreparationSource();
      const fingerprint=await snowSourceFingerprint(source,options),root=new T.Group(),g=new T.BufferGeometry(),material=new T.MeshBasicMaterial();
      g.setAttribute('position',new T.BufferAttribute(source.positions,3));g.setAttribute('snowPart',new T.BufferAttribute(source.parts,1));root.add(new T.Mesh(g,material));
      const stages=[],started=performance.now();
      const state=prepareSnowSurface({...options,root,progress:stage=>stages.push({...stage,ms:performance.now()-started})});g.dispose();material.dispose();
      const binary=encodePreparedSnow(state,fingerprint),decoded=decodePreparedSnow(binary,fingerprint);
      const original=createSurfaceSnow(options,state),loaded=createSurfaceSnow(options,decoded),comparisons=[];
      const hash=async(frame,key)=>{
        let a=frame[key];if(frame.indices&&['positions','normals','colors'].includes(key)){a=new Float32Array(frame.indices.length*3);for(let i=0;i<frame.indices.length;i++)a.set(frame[key].subarray(frame.indices[i]*3,frame.indices[i]*3+3),i*3);}
        return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),n=>n.toString(16).padStart(2,'0')).join('');
      };
      for(const amount of [.005,.12,.4,.75,1]){
        original.setAmount(amount);const a=original.takeFrame(),before={};for(const key of ['positions','normals','colors','top','parts'])before[key]=await hash(a,key);original.releaseFrame();
        loaded.setAmount(amount);const b=loaded.takeFrame(),after={};for(const key of Object.keys(before))after[key]=await hash(b,key);loaded.releaseFrame();
        comparisons.push({amount,before,after,equal:JSON.stringify(before)===JSON.stringify(after)});
      }
      original.dispose();loaded.dispose();
      let encoded='';const bytes=new Uint8Array(binary);for(let i=0;i<bytes.length;i+=32768)encoded+=String.fromCharCode(...bytes.subarray(i,i+32768));
      const oldPosition=asset.root.position.clone(),oldRotation=asset.root.rotation.clone();
      asset.root.position.set(123,-2,88);asset.root.rotation.y=Math.PI/2;asset.root.updateMatrixWorld(true);
      const moved=asset.snow.getPreparationSource(),transformedFingerprint=await snowSourceFingerprint(moved.source,moved.options);
      asset.root.position.copy(oldPosition);asset.root.rotation.copy(oldRotation);asset.root.updateMatrixWorld(true);
      return {assetId,fingerprint,transformedFingerprint,stages,preparationMs:state.preparationMs,vertices:state.vertexData.length/13,facets:state.facetCount,rawBytes:binary.byteLength,comparisons,base64:btoa(encoded)};
    },assetId);
    assert(result.comparisons.every(x=>x.equal),'Prepared data changed snow output');assert.equal(result.fingerprint,result.transformedFingerprint,'Instance transform changed preparation identity');
    const compressed=gzipSync(Buffer.from(result.base64,'base64'));delete result.base64;
    result.compressedBytes=compressed.byteLength;
    await writeFile(`dist/town/assets/${assetId}/snow-support.bin.gz`,compressed);
    results.push(result);await writeFile(`${out}/prepared-data.json`,JSON.stringify(results,null,2));
    console.log(JSON.stringify({assetId,seconds:result.preparationMs/1000,MiB:compressed.byteLength/1048576,equal:true}));
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),null);
}finally{await browser.close();}
