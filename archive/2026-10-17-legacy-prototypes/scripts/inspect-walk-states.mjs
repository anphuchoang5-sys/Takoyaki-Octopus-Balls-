import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try {
  await page.goto('http://127.0.0.1:4173/walk/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__walk?.ready);
  const read=()=>page.evaluate(()=>window.__walk.state);
  async function pace(run){
    await page.keyboard.press('Home');
    if(run)await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyS');await page.waitForTimeout(300);
    const start=await read();await page.waitForTimeout(650);const end=await read();
    await page.keyboard.up('KeyS');await page.keyboard.up('ShiftLeft');await page.waitForTimeout(500);
    return {speed:(end.walked-start.walked)/(end.environment.clock-start.environment.clock),gait:end.gait,stopped:(await read()).gait};
  }
  const walk=await pace(false),run=await pace(true);
  await page.keyboard.press('Home');await page.keyboard.down('KeyW');await page.waitForTimeout(900);await page.keyboard.up('KeyW');await page.waitForTimeout(800);
  const door=(await read()).doors[0];
  const combinations=[];
  for(const [key,period] of [['Digit1','morning'],['Digit2','afternoon'],['Digit3','dusk'],['Digit4','night']]){
    await page.keyboard.press(key);
    for(const [weatherKey,weather] of [['KeyC','clear'],['KeyR','rain'],['KeyH','hail']]){
      await page.keyboard.press(weatherKey);await page.waitForTimeout(120);
      const state=await read();combinations.push({period,weather,passed:state.environment.period===period&&state.environment.weather===weather&&state.weatherSystems===1});
    }
  }
  await page.keyboard.press('KeyC');await page.waitForTimeout(4000);
  const cleared=(await read()).environment;
  const passed=errors.length===0&&run.speed>walk.speed*1.4&&walk.stopped==='idle'&&run.stopped==='idle'&&door.openness>.8&&combinations.every(c=>c.passed)&&cleared.rainAmount<.01&&cleared.hailAmount<.01;
  const report={passed,errors,walk,run,door,combinations,cleared};
  await writeFile('artifacts/walk/states-inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  if(!passed)process.exitCode=1;
} finally {await browser.close();}
