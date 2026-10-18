import {chromium} from 'playwright';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
const dir='artifacts/buildings/sakura-house';
await copyFile('C:/WINDOWS/TEMP/codex-clipboard-75028aac-fa6c-44d4-8277-6e62ef02b11e.png',`${dir}/references/user-exterior.png`);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1024,height:575},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:4184/town/assets/sakura-house/preview.html?view=reference');
  await page.waitForFunction(()=>window.__sakura?.ready);
  await page.evaluate(()=>document.body.classList.add('reference-capture'));await page.waitForTimeout(350);
  await page.screenshot({path:`${dir}/15-reference-view.png`});
  console.log(JSON.stringify(await page.evaluate(()=>({bounds:window.__sakura.boundsAt(0),view:window.__sakura.inspect().view}))));
  const images=await Promise.all(['references/user-exterior','15-reference-view'].map(async p=>'data:image/png;base64,'+(await readFile(`${dir}/${p}.png`)).toString('base64')));
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>樱家 · 原图对照 03</title><style>*{box-sizing:border-box}body{margin:0;background:#f2f4ed;color:#343c4d;font:16px/1.65 'Microsoft YaHei',sans-serif}main{padding:24px 28px}h1{font-size:25px;margin:0 0 8px;font-weight:500}p{margin:4px 0 16px;color:#576175}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0;background:white;border:1px solid #dce1d9}img{display:block;width:100%;aspect-ratio:1024/575;object-fit:contain}figcaption{padding:12px 16px}small{display:block;margin-top:20px}a{color:#346d81}</style><main><h1>樱家 · 原图与三维样板 03</h1><p>动画色块、单一主屋顶、偏置入户、高树与灌木层次。右图为实际三维预览截图。</p><div class="grid"><figure><img src="${images[0]}"><figcaption>用户提供的动画参考（含原标注）</figcaption></figure><figure><img src="${images[1]}"><figcaption>真实三维 · 接近原图的视角 · 14 × 14 地块</figcaption></figure></div><small>屋顶三维解释、转角开放院口和背面布局为补全设计；单张动画透视无法唯一确定整屋结构。技术检查与美术认可分别记录。</small><p><a href="樱家-三维外观预览.html?view=reference">打开可旋转、缩放的三维预览</a>　<a href="多面验收图册.html">多面截图</a></p></main></html>`;
  await writeFile(`${dir}/原图对照.html`,html);await page.setViewportSize({width:1800,height:760});await page.setContent(html);await page.screenshot({path:`${dir}/16-reference-comparison.png`,fullPage:true});
}finally{await browser.close();}


