import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Interchange copy only. The authored Three.js module remains the toon-rendered source.
const exporter=await readFile('node_modules/three/examples/jsm/exporters/GLTFExporter.js','utf8');
const loader=(await readFile('node_modules/three/examples/jsm/loaders/GLTFLoader.js','utf8')).replace('../utils/BufferGeometryUtils.js','three/addons/utils/BufferGeometryUtils.js');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4184/town/assets/sakura-house/preview.html');await page.waitForFunction(()=>window.__sakura?.ready);
  const result=await page.evaluate(async({exporter,loader})=>{
    const THREE=await import('three');async function fromText(code){const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{return await import(url);}finally{URL.revokeObjectURL(url);}}
    const {GLTFExporter}=await fromText(exporter),{GLTFLoader}=await fromText(loader),root=window.__sakura.house.root.clone(true),owned=[];
    root.name='Sakura house exterior and garden';
    root.traverse(o=>{if(o.isMesh&&o.material.isMeshToonMaterial){const source=o.material;o.material=new THREE.MeshStandardMaterial({color:source.color,roughness:1,metalness:0});owned.push(o.material);}});
    const buffer=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});owned.forEach(m=>m.dispose());
    const parsed=await new GLTFLoader().parseAsync(buffer,'');const bounds=new THREE.Box3().setFromObject(parsed.scene),size=bounds.getSize(new THREE.Vector3()).toArray();let meshes=0,triangles=0;parsed.scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
    let unlitMeshes=0,vertexColorMeshes=0,deepBlueWindow=false;parsed.scene.traverse(o=>{if(o.isMesh){if(o.material.isMeshBasicMaterial)unlitMeshes++;if(o.geometry.attributes.color)vertexColorMeshes++;if(o.material.color?.getHexString()==='2633cf')deepBlueWindow=true;}});
    const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return {base64:btoa(binary),bytes:bytes.length,meshes,triangles,size,min:bounds.min.toArray(),max:bounds.max.toArray(),roundTrip:true,unlitMeshes,vertexColorMeshes,deepBlueWindow};
  },{exporter,loader});
  assert(Math.abs(result.size[0]-14)<.0001&&Math.abs(result.size[2]-14)<.0001);assert(result.meshes>20);assert(result.deepBlueWindow);assert(result.unlitMeshes===result.meshes);assert(result.vertexColorMeshes>20);
  const {base64,...metadata}=result;const path='dist/town/assets/sakura-house/sakura-house.glb';await writeFile(path,Buffer.from(base64,'base64'));await writeFile('artifacts/buildings/sakura-house/glb-inspection.json',JSON.stringify({...metadata,path,materialNote:'KHR_materials_unlit and vertex color bands preserve the authored flat animation palette, including deep blue windows.'},null,2));console.log(JSON.stringify(metadata));
}finally{await browser.close();}

