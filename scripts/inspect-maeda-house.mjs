import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// 前田家定向检查：本机 Chrome 打开独立预览，渲染多机位截图并读取实际几何。
// 输出只写 artifacts/buildings/maeda-house/inspect-01/，不启动服务、不写存档、不改源码。
const root = path.resolve('dist/town/assets/maeda-house');
const outDir = path.resolve('artifacts/buildings/maeda-house/inspect-01');
await mkdir(outDir, {recursive: true});

const views = ['reference', 'hero', 'front', 'left', 'right', 'corner', 'back', 'roof', 'gate', 'door', 'window', 'yard', 'tree', 'top'];
const browser = await chromium.launch({channel: 'chrome', args: ['--allow-file-access-from-files']});
const page = await browser.newPage({viewport: {width: 1500, height: 940}, deviceScaleFactor: 1});
const errors = [], warnings = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

const url = pathToFileURL(path.join(root, 'preview.html')).href + '?view=hero';
await page.goto(url, {waitUntil: 'load'});
await page.waitForFunction(() => window.__maeda && window.__maeda.ready, null, {timeout: 60000});
await page.waitForTimeout(700);

const shots = [];
await page.evaluate(() => window.__maeda.clean(true));
for (const view of views) {
  await page.evaluate(v => window.__maeda.setView(v), view);
  await page.waitForTimeout(240);
  const file = path.join(outDir, `${view}.png`);
  await page.screenshot({path: file});
  shots.push(file);
}

const checks = await page.evaluate(() => {
  const s = window.__maeda;
  const names = ['双开大门', '正面木板墙', '前坡瓦面', '后坡瓦面', '右翼奶油体块', '右翼转角窗', '前墙左段', '左侧围墙', '后侧围墙',
    '屋后落叶树', '左院灌木（大）', '右院灌木（大）', '门头小坡檐', '右翼转角小雨棚'];
  const parts = Object.fromEntries(names.map(n => [n, s.measure(n)]));
  let meshes = 0, materials = new Set();
  s.asset.root.traverse(o => { if (o.isMesh) { meshes += 1; materials.add(o.material.uuid); } });
  return {inspection: s.inspect(), parts, meshes, materialCount: materials.size};
});

const compareFile = path.join(outDir, 'reference-compare.png');
await page.evaluate(() => { window.__maeda.clean(false); window.__maeda.reference(true); });
await page.waitForTimeout(320);
await page.screenshot({path: compareFile});
await page.evaluate(() => { window.__maeda.setTime('night'); window.__maeda.clean(true); window.__maeda.setView('front'); });
await page.waitForTimeout(300);
const nightFile = path.join(outDir, 'night-front.png');
await page.screenshot({path: nightFile});
await page.evaluate(() => { window.__maeda.setTime('afternoon'); window.__maeda.setView('hero'); });

const world = checks.parts;
const b = checks.inspection.bounds;
const report = {
  url, viewport: {width: 1500, height: 940},
  errors, warnings,
  renders: {views, shots, night: nightFile, compare: compareFile},
  geometry: {
    bounds: b,
    size: checks.inspection.size,
    meshes: checks.meshes,
    materialCount: checks.materialCount,
    parts: world
  },
  assertions: {
    withinPlotX: b.min[0] >= -7.01 && b.max[0] <= 7.01,
    withinPlotZ: b.min[2] >= -7.01 && b.max[2] <= 7.01,
    groundContact: b.min[1] >= -0.13 && b.min[1] <= 0.06,
    ridgeHeight: Number(checks.inspection.design.ridgeY) > 4.3 && Number(checks.inspection.design.ridgeY) < 4.7,
    wingTurn: checks.inspection.design.wingTurnDegrees,
    windows: checks.inspection.design.windows,
    wallFaceZ: world['正面木板墙'] ? world['正面木板墙'].max[2] : null,
    doorFrontZ: world['双开大门'] ? world['双开大门'].max[2] : null,
    fenceCapY: world['前墙左段'] ? world['前墙左段'].max[1] : null,
    treeBehindHouse: world['屋后落叶树'] ? world['屋后落叶树'].max[2] < -3.7 : null,
    bushAboveFence: world['左院灌木（大）'] ? world['左院灌木（大）'].max[1] > 1.68 : null,
    renderCalls: checks.inspection.render.calls,
    triangles: checks.inspection.render.triangles
  }
};
await writeFile(path.join(outDir, 'inspection.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({errors, warnings, assertions: report.assertions, meshes: checks.meshes, shots}, null, 2));
await browser.close();
