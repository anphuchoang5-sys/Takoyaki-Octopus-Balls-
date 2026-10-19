import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const base=fileURLToPath(new URL('../',import.meta.url));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1040}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(process.argv[2]==='comparison'){
   await page.goto('http://127.0.0.1:4185/town/characters/maruko/gallery.html');
   await page.waitForFunction(()=>[...document.querySelectorAll('#profile-comparison img')].every(i=>i.complete&&i.naturalWidth>0));
   await page.locator('#profile-comparison').screenshot({path:base+'evidence/28-profile-comparison-static-06.png'});
   console.log(JSON.stringify({comparison:true,errors}));
  }else{
  await page.goto('http://127.0.0.1:4185/town/characters/maruko/preview.html');
  try{await page.waitForFunction(()=>window.__maruko?.ready,{},{timeout:30000});}
  catch(e){console.log(JSON.stringify({errors,body:await page.locator('body').innerText()}));throw e;}
  const views=(process.argv[2]||'front,quarter,side,back,face').split(',');
  for(const view of views){await page.evaluate(v=>window.__maruko.setView(v),view);await page.waitForTimeout(160);await page.screenshot({path:base+'evidence/draft-'+view+'.png'});}
  console.log(JSON.stringify({inspect:await page.evaluate(()=>window.__maruko.inspect()),errors}));
  await writeFile(base+'evidence/draft-errors.json',JSON.stringify(errors,null,2));
  }
}finally{await browser.close();}
