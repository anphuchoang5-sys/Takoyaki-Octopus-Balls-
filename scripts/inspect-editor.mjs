import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createEditorState, emptyLayout, validateLayout, parseLayout} from '../dist/town/editor/state.js';
import {readSavedLayout, connectAutosave, STORAGE_KEY} from '../dist/town/editor/persistence.js';
import {createRuntimeBridge} from '../dist/town/editor/runtime.js';

const output = process.env.EDITOR_ARTIFACT_DIR || 'artifacts/editor/current';
await mkdir(output, {recursive: true});
const report = {startedAt: new Date().toISOString(), layers: [], errors: [], limitations: [
  'Headless Chrome with real WebGL and DOM pointer/drag/keyboard/file input; not user manual acceptance.',
  'Clear/rain use the real C runtime; traveler and time-of-day adapter checks use a contract stub only.',
  'AME MART and B Sakura exterior-03-states are integrated. Three other buildings, walking and town day/night remain pending; no complete house interior.'
]};
let browser, page;
async function check(name, action) {
  const start = Date.now();
  try { await action(); report.layers.push({name, passed: true, elapsedMs: Date.now() - start}); }
  catch (error) { report.layers.push({name, passed: false, error: error.stack}); throw error; }
}
const ids = new Set(['convenience', 'sakura-house', 'road-straight', 'road-corner', 'road-tee', 'road-cross']);
const equal = (a, b) => assert.deepEqual(a, b);
const nearVector = (a, b) => assert.ok(a.every((value,i)=>Math.abs(value-b[i])<.001),`Vector moved: ${a} vs ${b}`);
try {
  await check('pure model: stable IDs, duplicate prevention, atomic operations, complete undo', () => {
    let id = 0; const state = createEditorState({assetIds: ids, idFactory: () => `test-${++id}`});
    const first = state.place('road-straight', 3, 3), second = state.place('road-straight', 4, 3);
    assert.notEqual(first.id, second.id);
    const before = state.getLayout(), revision = state.revision;
    for (const action of [() => state.place('road-corner', 3, 3), () => state.place('road-straight', 0, 0), () => state.move(first.id, 4, 3), () => state.place('unknown', 2, 2), () => state.place('road-straight', 2, 2, 45)]) {
      assert.throws(action); equal(state.getLayout(), before); assert.equal(state.revision, revision);
    }
    state.rotate(first.id); assert.equal(state.at(3, 3).rotation, 90);
    state.move(first.id, 5, 5); assert.equal(state.at(5, 5).id, first.id);
    state.remove(first.id); assert.equal(state.at(5, 5), null); state.undo(); assert.equal(state.at(5, 5).id, first.id);
    state.undo(); state.undo(); equal(state.getLayout(), before);
    const read = state.getLayout(); read.instances[0].x = 9; equal(state.getLayout(), before);
    const subscriberErrors = [], isolated = createEditorState({assetIds: ids, onSubscriberError: error => subscriberErrors.push(error.message)});
    let observed = 0; isolated.subscribe(() => { throw new Error('bad integration listener'); }); isolated.subscribe(() => observed++);
    isolated.place('road-straight', 3, 3); assert.equal(observed, 1); assert.equal(subscriberErrors.length, 1);
  });
  await check('pure model: shape validation, mandatory confirmation, stale-plan rejection, one-step undo', () => {
    const state = createEditorState({assetIds: ids}); state.place('convenience', 3, 3); state.place('road-tee', 3, 4);
    const before = state.getLayout(), rows = structuredClone(before.rows); rows[3] = {start: 4, length: 3}; rows[4] = {start: 4, length: 3};
    const plan = state.previewShape(rows); assert.equal(plan.affected.length, 2);
    assert.throws(() => state.applyShape(plan)); equal(state.getLayout(), before);
    assert.throws(() => state.applyShape({...plan}, {confirmAffected: true}));
    state.applyShape(plan, {confirmAffected: true}); assert.equal(state.getLayout().instances.length, 0); state.undo(); equal(state.getLayout(), before);
    const stale = state.previewShape(rows); state.rotate(before.instances[0].id); assert.throws(() => state.applyShape(stale, {confirmAffected: true}));
    for (const row of [{start: 9, length: 2}, {start: -.1, length: 2}, {start: 1, length: -1}, {start: '1', length: 2}, {start: 0, length: 11}]) {
      const invalid = structuredClone(rows); invalid[0] = row; assert.throws(() => state.previewShape(invalid));
    }
    const allOff = rows.map(() => ({start: 0, length: 0})); state.applyShape(state.previewShape(allOff), {confirmAffected: true}); assert.equal(state.canPlace('convenience', 0, 0).ok, false);
  });
  await check('pure model: version, bounds, IDs, duplicates, assets and corrupt imports reject without mutation', () => {
    const state = createEditorState({assetIds: ids}); state.place('convenience', 2, 2);
    const before = state.getLayout(), invalids = ['{', 'null', '[]', 'x'.repeat(1024 * 1024 + 1)];
    for (const change of [v => v.version = 2, v => v.version = '1', v => v.format = 'other', v => v.rows.pop(), v => v.instances[0].x = 10,
      v => v.instances[0].z = -1, v => v.instances[0].x = 2.5, v => v.instances[0].x = '2', v => v.instances[0].rotation = 360,
      v => v.instances[0].assetId = 'sakura-home', v => v.instances[0].id = '<script>', v => v.instances.push({...v.instances[0], id: 'duplicate-cell'}),
      v => v.instances.push({...v.instances[0], x: 3}), v => v.rows[2].length = 0]) {
      const candidate = structuredClone(before); change(candidate); invalids.push(JSON.stringify(candidate));
    }
    for (const invalid of invalids) { assert.throws(() => state.importJSON(invalid)); equal(state.getLayout(), before); }
    equal(parseLayout(state.exportJSON(), ids), before); equal(validateLayout(before, ids), before);
    state.importJSON(JSON.stringify(emptyLayout())); assert.equal(state.getLayout().instances.length, 0); state.undo(); equal(state.getLayout(), before);
  });
  await check('persistence: corrupt save preserved; failures reported; explicit replacement and subscription cleanup', () => {
    let raw = '{bad', writes = 0; const storage = {getItem: () => raw, setItem: (key, value) => { assert.equal(key, STORAGE_KEY); writes++; raw = value; }};
    const saved = readSavedLayout(storage, ids); assert.equal(saved.blocked, true); assert.equal(saved.raw, raw);
    const state = createEditorState({assetIds: ids, initial: saved.layout}), statuses = [];
    const persistence = connectAutosave(state, storage, {blocked: saved.blocked, onStatus: status => statuses.push(status)});
    state.place('road-straight', 2, 2); assert.equal(writes, 0); assert.equal(raw, '{bad');
    assert.equal(persistence.replacePreservedSave(), true); assert.equal(writes, 1); assert.equal(readSavedLayout(storage, ids).layout.instances.length, 1);
    persistence.dispose(); state.rotate(state.at(2, 2).id); assert.equal(writes, 1);
    const quota = connectAutosave(state, {setItem() { throw new Error('QuotaExceededError'); }}, {onStatus: status => statuses.push(status)});
    state.rotate(state.at(2, 2).id); assert.equal(statuses.at(-1).ok, false); quota.dispose();
  });
  await check('runtime contract: unavailable, rejected, pending, confirmed and disconnected requests', async () => {
    const bridge = createRuntimeBridge(); assert.equal((await bridge.request('weather', 'rain')).ok, false); assert.equal(bridge.getState().values.weather, null);
    let resolve; const disconnect = bridge.connect({setMode: value => new Promise(done => { resolve = () => done({ok: true, value}); }), setTime: () => ({ok: false, message: 'test rejection'})});
    const pending = bridge.request('mode', 'walk'); assert.equal((await bridge.request('mode', 'god')).ok, false);
    assert.equal(bridge.getState().values.mode, 'god'); resolve(); assert.equal((await pending).ok, true); assert.equal(bridge.getState().values.mode, 'walk');
    assert.equal((await bridge.request('time', 'night')).ok, false); assert.equal(bridge.getState().values.time, null);
    const stale = bridge.request('mode', 'god'); disconnect(); resolve(); assert.equal((await stale).ok, false);
  });

  browser = await chromium.launch({executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1, acceptDownloads: true});
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', entry => { if (entry.type() === 'error') report.errors.push(entry.text()); });
  const url = process.argv[2] || 'http://127.0.0.1:4173/';
  const ready = () => page.waitForFunction(() => window.__editor?.ready, null, {timeout: 45000});
  const layout = () => page.evaluate(() => window.townEditor.getLayout());
  const point = (x, z) => page.evaluate(([x, z]) => window.__editor.screenCell(x, z), [x, z]);
  async function clickCell(x, z) { const p = await point(x, z); await page.mouse.click(p.x, p.y); }
  async function hoverCell(x, z) { const p = await point(x, z); await page.mouse.move(p.x, p.y); }
  async function panel(name) { await page.locator(`[data-panel="${name}"]`).click(); }
  async function openEditor() { if(await page.locator('#enter-editor').isVisible()) await page.locator('#enter-editor').click(); }
  async function settle() { await page.waitForFunction(()=>!window.__editor.inspection.camera.busy); }
  async function topView() { await page.locator('#view-toggle').click(); await settle(); }
  async function choose(id) { await panel('assets'); await page.locator(`[data-asset="${id}"]`).click(); }
  async function cancelTool() { await page.locator('#select-tool').click(); }
  async function importValue(value, name = 'layout.json') {
    await panel('save');
    await page.locator('#import-file').setInputFiles({name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))});
    await page.waitForFunction(() => /导入/.test(document.getElementById('message').textContent));
    // File.text resolves asynchronously; wait for an explicit success/failure message for this input.
    await page.waitForFunction(() => /已导入布局|导入失败|不能超过/.test(document.getElementById('message').textContent));
  }
  async function resetMessage() { await cancelTool(); }
  await check('browser: first entry empty, real model thumbnails, planned buildings not selectable', async () => {
    const response = await page.goto(url, {waitUntil: 'networkidle'}); assert.equal(response.status(), 200); await ready();
    assert.equal(await page.locator('#workbench').isVisible(), false);
    assert.equal(await page.locator('#edit-controls').isVisible(), false);
    assert.equal(await page.evaluate(()=>window.__editor.inspection.scene.gridVisible),false);
    assert.equal(await page.evaluate(()=>window.__editor.inspection.scene.grass.bladeCount),864000);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
    await page.screenshot({path: `${output}/01-empty-scene.png`});
    for (const [x,z] of [[2,2],[7,2],[2,7],[7,7]]) { const p=await point(x,z);assert.ok(p.x>0&&p.x<1440&&p.y>0&&p.y<1000); }
    await openEditor(); await topView();
    assert.equal((await layout()).instances.length, 0); assert.equal(await page.locator('[data-asset]').count(), 6);
    assert.equal(await page.locator('[data-asset].building').count(), 2);
    assert.equal(await page.locator('#building-count').innerText(), '2 件可用');
    assert.equal(await page.locator('[data-asset="sakura-house"] strong').innerText(), '小丸子的家');
    assert.equal(await page.locator('[data-asset] img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth === 280 && img.src.startsWith('data:image/png'))), true);
    assert.equal(await page.locator('.pending-row').count(), 3);
    await page.screenshot({path: `${output}/01-empty-map.png`});
  });
  await check('browser: click placement, repeated assets, occupied and out-of-map rejection', async () => {
    await choose('road-straight'); await clickCell(3, 3); await clickCell(3, 4);
    let l = await layout(); assert.equal(l.instances.length, 2); assert.notEqual(l.instances[0].id, l.instances[1].id);
    await choose('road-corner'); await clickCell(3, 3); equal(await layout(), l); assert.match(await page.locator('#message').innerText(), /占用/);
    await clickCell(9, 4); equal(await layout(), l); assert.match(await page.locator('#message').innerText(), /地图外/);
    await page.locator('#rotate').click(); await page.locator('#rotate').click(); await hoverCell(3, 5);
    assert.equal(await page.evaluate(() => window.__editor.inspection.scene.previewVisible), true);
    assert.equal(Math.round(await page.evaluate(() => window.__editor.inspection.scene.previewRotation)), 180);
    await page.screenshot({path: `${output}/02-snap-direction.png`});
    await clickCell(3, 5); assert.equal((await layout()).instances.find(p => p.x === 3 && p.z === 5).rotation, 180);
  });
  await check('browser: native HTML drag/drop from a model card', async () => {
    const p = await point(4, 5), rect = await page.locator('#editor-world').boundingBox();
    await page.locator('[data-asset="road-tee"]').dragTo(page.locator('#editor-world'), {targetPosition: {x: p.x-rect.x, y: p.y-rect.y}});
    assert.equal((await layout()).instances.find(p => p.x === 4 && p.z === 5)?.assetId, 'road-tee');
    await choose('road-cross'); await clickCell(5, 5);
    await choose('convenience'); await clickCell(4, 3); await clickCell(5, 3);
    assert.equal((await layout()).instances.filter(p => p.assetId === 'convenience').length, 2);
    assert.equal(await page.evaluate(() => window.townEditor.sceneView.getInstances().filter(item => item.placement.assetId === 'convenience').every(item => typeof Object.getOwnPropertyDescriptor(item.asset, 'doorOpen')?.get === 'function')), true);
  });
  await check('browser: select, rotate, move, collision rejection, delete and undo preserve IDs', async () => {
    await cancelTool(); await clickCell(4, 3);
    const original = (await layout()).instances.find(p => p.x === 4 && p.z === 3);
    await page.locator('#rotate').click(); assert.equal((await layout()).instances.find(p => p.id === original.id).rotation, 90);
    await page.locator('#move').click(); await clickCell(3, 3);
    assert.equal((await layout()).instances.find(p => p.id === original.id).x, 4); assert.match(await page.locator('#message').innerText(), /占用/);
    await clickCell(4, 4); const moved = (await layout()).instances.find(p => p.id === original.id); assert.equal(moved.z, 4); assert.equal(moved.rotation, 90);
    await page.locator('#delete').click(); assert.equal((await layout()).instances.some(p => p.id === original.id), false);
    await page.locator('#undo').click(); equal((await layout()).instances.find(p => p.id === original.id), moved);
    await cancelTool(); const from = await point(5, 3), to = await point(6, 4);
    const dragId = (await layout()).instances.find(p => p.x === 5 && p.z === 3).id;
    const cameraBefore=await page.evaluate(()=>window.__editor.inspection.camera.position);
    const windBefore=await page.evaluate(()=>window.__editor.inspection.scene.grass.emitted);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, {steps: 15}); await page.mouse.up();
    assert.equal((await layout()).instances.find(p => p.id === dragId).x, 6); assert.equal((await layout()).instances.find(p => p.id === dragId).z, 4);
    equal(await page.evaluate(()=>window.__editor.inspection.camera.position),cameraBefore);
    assert.equal(await page.evaluate(()=>window.__editor.inspection.scene.grass.emitted),windBefore);
  });
  await check('browser: irregular rows, invalid row rejection, preview/cancel/confirm and atomic shape undo', async () => {
    await panel('shape'); await settle();
    const rows = [[1,7],[0,8],[1,8],[2,7],[1,8],[0,7],[1,6],[2,6],[3,4],[4,2]].map(([start,length]) => ({start,length}));
    for (let z = 0; z < 10; z++) { await page.locator(`#start-${z}`).fill(String(rows[z].start+1)); await page.locator(`#length-${z}`).fill(String(rows[z].length)); }
    await page.locator('#preview-shape').click(); await page.locator('#apply-shape').click(); equal((await layout()).rows, rows);
    const before = await layout(); await page.locator('#start-0').fill('10'); await page.locator('#length-0').fill('2'); await page.locator('#preview-shape').click();
    equal(await layout(), before); assert.match(await page.locator('#message').innerText(), /超过 10/);
    await page.locator('#start-0').fill('2'); await page.locator('#length-0').fill('7');
    await page.locator('#length-4').fill('0'); await page.locator('#preview-shape').click();
    assert.equal(await page.locator('#affected-list li').count(), 3); equal(await layout(), before);
    const bounds = await page.evaluate(() => window.__editor.inspection.scene.impactBounds);
    equal(bounds.map(box => box.min), [[-28,0,-14],[-14,0,-14],[14,0,-14]]);
    await page.screenshot({path: `${output}/03-shape-impact.png`});
    await page.locator('#cancel-shape').click(); equal(await layout(), before);
    await page.locator('#length-4').fill('0'); await page.locator('#preview-shape').click(); await page.locator('#apply-shape').click();
    assert.equal((await layout()).instances.length, before.instances.length - 3);
    await page.locator('#undo').click(); equal(await layout(), before);
    await page.locator('#view-overview').click(); await settle(); await page.screenshot({path: `${output}/04-irregular-town.png`});
    await topView();
  });
  await check('browser: autosave survives refresh; real export download and import restore layout', async () => {
    const saved = await layout(); await page.reload({waitUntil: 'networkidle'}); await ready(); equal(await layout(), saved);
    await openEditor(); await topView(); await panel('save');
    assert.match(await page.locator('#save-status').innerText(), /已恢复/);
    const pendingDownload = page.waitForEvent('download'); await page.locator('#export').click(); const download = await pendingDownload;
    await download.saveAs(`${output}/exported-layout.json`); const exported = JSON.parse(await readFile(`${output}/exported-layout.json`, 'utf8')); equal(exported, saved);
    await cancelTool(); await clickCell(4, 4); await page.locator('#delete').click(); assert.equal((await layout()).instances.length, saved.instances.length-1);
    await resetMessage(); await importValue(exported); equal(await layout(), saved);
    await page.locator('#undo').click(); assert.equal((await layout()).instances.length, saved.instances.length-1);
    await resetMessage(); await importValue(exported); equal(await layout(), saved);
  });
  await check('browser: invalid imports keep both current map and saved JSON unchanged', async () => {
    const before = await layout(), saved = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
    const invalid = ['{', JSON.stringify({...before, version: 999}), JSON.stringify({...before, instances: [...before.instances, {...before.instances[0], id: 'duplicate-cell'}]}),
      JSON.stringify({...before, instances: [{...before.instances[0], x: 10}]}), JSON.stringify({...before, instances: [{...before.instances[0], assetId: 'sakura-home'}]})];
    for (const input of invalid) {
      await resetMessage(); await importValue(input); equal(await layout(), before);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), saved);
      assert.match(await page.locator('#message').innerText(), /导入失败/);
    }
  });
  await check('browser: actual clear/rain controls; missing time/walk stay pending; adapter events lock editing', async () => {
    await panel('environment');
    await page.locator('#weather').selectOption('rain'); assert.equal(await page.locator('#weather').inputValue(), 'rain');
    assert.equal(await page.evaluate(()=>window.townEditor.weather.getInspection().visible),true);
    await page.locator('#weather').selectOption('clear'); assert.equal(await page.evaluate(()=>window.townEditor.weather.getInspection().visible),false);
    assert.equal(await page.locator('#time').isDisabled(), true); assert.equal(await page.locator('#time').inputValue(), '');
    await page.locator('#walk').click(); assert.equal(await page.evaluate(() => window.townEditor.runtime.getState().values.mode), 'god');
    await page.evaluate(() => {
      window.__runtimeCalls = [];
      const acknowledge = kind => async value => { window.__runtimeCalls.push({kind,value}); await new Promise(resolve => setTimeout(resolve, 60)); return {ok: true, value}; };
      window.__disconnectRuntime = window.townEditor.connectRuntime({setMode: acknowledge('mode'), setTime: acknowledge('time'), setWeather: acknowledge('weather')});
    });
    await page.locator('#time').selectOption('night'); await page.waitForFunction(() => window.townEditor.runtime.getState().values.time === 'night');
    await page.locator('#weather').selectOption('rain'); await page.waitForFunction(() => window.townEditor.runtime.getState().values.weather === 'rain');
    await page.locator('#walk').click(); await page.waitForFunction(() => window.townEditor.runtime.getState().values.mode === 'walk');
    assert.equal(await page.locator('#preview-shape').isDisabled(), true); assert.equal(await page.evaluate(() => window.__editor.inspection.scene.gridVisible), false);
    const before = await layout(); await choose('road-cross'); await clickCell(7, 4); equal(await layout(), before);
    await page.locator('#exit-editor').click();await openEditor();assert.equal(await page.locator('#panel-environment').isVisible(),true);
    await panel('environment'); await page.locator('#god').click(); await page.waitForFunction(() => window.townEditor.runtime.getState().values.mode === 'god');
    assert.equal(await page.evaluate(() => window.__editor.inspection.scene.gridVisible), true);
    assert.equal((await page.evaluate(() => window.__runtimeCalls)).length, 4);
    await page.evaluate(() => window.__disconnectRuntime());
    await page.reload({waitUntil: 'networkidle'}); await ready();
  });
  await check('browser: corrupt saved layout preserved until explicit recovery; quota failure stays exportable', async () => {
    const clean = await layout();
    await page.evaluate(key => localStorage.setItem(key, '{preserve-me'), STORAGE_KEY); await page.reload({waitUntil: 'networkidle'}); await ready();
    await openEditor(); await topView(); await panel('save');
    assert.equal((await layout()).instances.length, 0); assert.equal(await page.locator('#replace-save').isVisible(), true);
    await choose('road-straight'); await clickCell(3, 3); assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), '{preserve-me');
    await panel('save');
    page.once('dialog', dialog => dialog.dismiss()); await page.locator('#replace-save').click(); assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), '{preserve-me');
    page.once('dialog', dialog => dialog.accept()); await page.locator('#replace-save').click(); assert.equal(JSON.parse(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).instances.length, 1);
    await resetMessage(); await importValue(clean);
    await page.evaluate(() => { window.__originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new DOMException('test quota exhausted', 'QuotaExceededError'); }; });
    await choose('road-cross'); await clickCell(7, 4); assert.match(await page.locator('#save-status').textContent(), /自动保存失败/);
    assert.equal((await layout()).instances.some(p => p.x === 7 && p.z === 4), true);
    await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });
    await resetMessage(); await importValue(clean);
  });
  await check('browser: 1280px desktop layout and final rendering have no page or console errors', async () => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.waitForFunction(() => document.querySelector('#editor-world').clientWidth > 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({path: `${output}/05-desktop-1280.png`});
    await page.setViewportSize({width: 1440, height: 1000}); await page.locator('#view-overview').click(); await settle();
    await page.screenshot({path: `${output}/06-final-overview.png`});
    report.finalInspection = await page.evaluate(() => window.__editor.inspection); assert.ok(report.finalInspection.frames > 2); equal(report.errors, []);
  });
  await check('browser: all 100 slots, full-road layout, shape-stable neighbours, keyboard undo and empty-map recovery', async () => {
    const original = await layout(); const full = emptyLayout(); full.rows = Array.from({length: 10}, () => ({start: 0, length: 10}));
    full.instances = Array.from({length: 100}, (_, index) => ({id: `stress-${index}`, assetId: ['road-straight','road-corner','road-tee','road-cross'][index % 4], x: index % 10, z: Math.floor(index/10), rotation: index % 4 * 90}));
    await resetMessage(); await importValue(full); equal(await layout(), full);
    await page.locator('#view-overview').click(); await settle();
    assert.equal(await page.evaluate(() => window.__editor.inspection.scene.instances), 100);
    for (const [x,z] of [[0,0],[9,0],[0,9],[9,9]]) {
      const p = await point(x,z), rect = await page.locator('#editor-world').boundingBox();
      assert.ok(p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height, 'Full 10x10 remains visible');
    }
    await topView(); await cancelTool(); await clickCell(5,5);
    await page.keyboard.press('r'); const turned = await layout();
    equal(turned.instances.filter(p => p.id !== 'stress-55'), full.instances.filter(p => p.id !== 'stress-55'));
    assert.equal(turned.instances[55].rotation, (full.instances[55].rotation + 90) % 360);
    await page.keyboard.press('Control+z'); equal(await layout(), full);
    const off = {...full, rows: full.rows.map(() => ({start: 0, length: 0})), instances: []};
    await resetMessage(); await importValue(off); assert.equal(await page.evaluate(() => window.__editor.inspection.scene.groundRows), 0);
    await page.locator('#undo').click(); equal(await layout(), full);
    await resetMessage(); await importValue(original);
  });
  await check('browser: folded scene, original store detail, native focus/orbit/zoom/pan and edit isolation', async () => {
    await topView(); await cancelTool();
    const before=await layout(),store=before.instances.find(p=>p.assetId==='convenience');
    await page.locator('#exit-editor').click(); await page.keyboard.press('Home'); await settle();
    const p=await point(store.x,store.z); await page.mouse.dblclick(p.x,p.y); await settle();
    assert.equal(await page.evaluate(()=>window.__editor.inspection.camera.focusedId),store.id);
    assert.ok(Math.abs(await page.evaluate(()=>window.__editor.inspection.camera.distance)-33)<.1);
    assert.equal(await page.locator('#workbench').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__editor.inspection.scene.gridVisible),false);
    report.modelFidelity=await page.evaluate(async()=>{
      const {createBuilding}=await import('/town/assets/index.js');const original=createBuilding('convenience');const THREE=await import('three');
      const stats=root=>{let vertices=0,meshes=0;const textures=new Set();root.traverse(n=>{if(n.isMesh){meshes++;vertices+=n.geometry.attributes.position.count;for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.map)textures.add(m.map.uuid);}});return{vertices,meshes,textures:textures.size};};
      const stores=window.townEditor.sceneView.getInstances().filter(p=>p.placement.assetId==='convenience');
      return{original:stats(original.root),placed:stores.map(({asset})=>stats(asset.root.getObjectByName('original-convenience-building'))),corners:stores.map(({asset})=>{
        const box=new THREE.Box3().setFromObject(asset.root),size=box.getSize(new THREE.Vector3());
        return{...stats(asset.root),size:size.toArray(),props:['vending-machine','bicycle','umbrella-rack','a-board'].map(name=>!!asset.root.getObjectByName(name)),lamps:asset.previewLamps.length};
      })};
    });
    for(const placed of report.modelFidelity.placed)equal(placed,report.modelFidelity.original);
    for(const corner of report.modelFidelity.corners){assert.ok(corner.vertices>65000);assert.ok(corner.textures>=30);assert.ok(corner.props.every(Boolean));assert.equal(corner.lamps,5);assert.ok(corner.size[0]<=14.001&&corner.size[2]<=14.001,'Complete authored scene must stay in one cell');}
    const doors=await page.evaluate(async()=>{const T=await import('three'),stores=window.townEditor.sceneView.getInstances().filter(p=>p.placement.assetId==='convenience');const a=stores[0].asset,b=stores[1].asset;
      const entrance=a.root.getObjectByName('original-convenience-building').localToWorld(new T.Vector3(.45,0,3.08));
      for(let i=0;i<20;i++){a.update(.1,entrance);b.update(.1,new T.Vector3(999,0,999));}return{a:a.doorOpen,b:b.doorOpen};});
    assert.ok(doors.a>.9);assert.ok(doors.b<.01);
    assert.ok(report.modelFidelity.original.vertices>39000);assert.ok(report.modelFidelity.original.textures>=19);
    await page.screenshot({path:`${output}/07-store-closeup.png`});
    const camera=()=>page.evaluate(()=>window.__editor.inspection.camera);
    let from=await camera();await page.mouse.move(1040,480);await page.mouse.down();await page.mouse.move(1160,530,{steps:20});await page.mouse.up();await settle();
    assert.notDeepEqual((await camera()).position,from.position);
    nearVector((await camera()).target,from.target);
    from=await camera();await page.mouse.wheel(0,-500);await page.waitForTimeout(300);assert.ok((await camera()).distance<from.distance*.9);
    await page.screenshot({path:`${output}/08-window-detail.png`});
    from=await camera();await page.mouse.move(1000,450);await page.mouse.down({button:'middle'});await page.mouse.move(1100,480,{steps:12});await page.mouse.up({button:'middle'});await page.waitForTimeout(250);assert.notDeepEqual((await camera()).target,from.target);
    await settle();from=await camera();await page.mouse.move(1000,450);await page.mouse.down({button:'right'});await page.mouse.move(1060,480,{steps:12});await page.mouse.up({button:'right'});await settle();assert.notDeepEqual((await camera()).target,from.target);
    await page.mouse.move(720,500);await page.mouse.down();await page.mouse.move(820,530,{steps:10});await page.mouse.up();await page.keyboard.press('Delete');await page.keyboard.press('r');equal(await layout(),before);
  });
  await check('browser: no-button grass hover follows direction, rebounds and never edits layout or camera', async () => {
    // A known empty patch in front of one unrotated store makes the wind recording reproducible.
    const before=await layout(),windLayout=emptyLayout();windLayout.instances=[{id:'wind-store',assetId:'convenience',x:4,z:4,rotation:0}];
    await page.evaluate(l=>{window.townEditor.loadLayout(l);window.townEditor.focusInstance('wind-store');},windLayout);await settle();
    const world=(x,z)=>page.evaluate(([x,z])=>window.__editor.screenWorld(x,0,z),[x,z]);
    const from=await world(-11,2),to=await world(-5,2);
    for(const p of [from,to])assert.ok(p.x>0&&p.x<1440&&p.y>0&&p.y<910,'Grass stroke must hit canvas above entry button');
    const emitted=await page.evaluate(()=>window.__editor.inspection.scene.grass.emitted);
    await page.screenshot({path:`${output}/09-grass-before.png`});
    const cameraBefore=await page.evaluate(()=>window.__editor.inspection.camera.position);
    await page.mouse.move(from.x,from.y);
    for(let i=1;i<=24;i++){await page.mouse.move(from.x+(to.x-from.x)*i/24,from.y+(to.y-from.y)*i/24);await page.waitForTimeout(35);}
    const active=await page.evaluate(()=>{const g=window.townEditor.sceneView.grass,i=g.getInspection();return{...i,near:g.sampleWind(i.lastPulse[0],i.lastPulse[1]),far:g.sampleWind(35,35)};});
    assert.ok(active.emitted>emitted+8);assert.ok(active.lastDirection[0]>.95);assert.ok(Math.abs(active.lastDirection[1])<.1);
    assert.ok(active.near.x>.25);assert.ok(Math.hypot(active.far.x,active.far.z)<.001);
    await page.screenshot({path:`${output}/10-grass-sweep.png`});
    equal(await layout(),windLayout);
    const cameraAfter=await page.evaluate(()=>window.__editor.inspection.camera.position);
    assert.ok(cameraBefore.every((n,i)=>Math.abs(n-cameraAfter[i])<.001));
    assert.equal(active.bladeCount,840000);
    await page.waitForFunction(start=>window.__editor.inspection.scene.grass.time-start>3,active.time);
    const rested=await page.evaluate(([x,z])=>window.townEditor.sceneView.grass.sampleWind(x,z),active.lastPulse);equal(rested,{x:0,z:0});
    await page.screenshot({path:`${output}/11-grass-rested.png`});
    report.wind={active,rested,layoutUnchanged:true};
    await page.evaluate(l=>window.townEditor.loadLayout(l),before);
    await openEditor();await topView();await panel('assets');await page.screenshot({path:`${output}/12-edit-tools.png`});
    await page.locator('#exit-editor').click();
  });
  await check('browser: camera gestures and inertia pause new wind; mode switches preserve mouse roles', async () => {
    const before=await layout(),fixture=emptyLayout();fixture.instances=[{id:'input-store',assetId:'convenience',x:4,z:4,rotation:0}];
    await page.evaluate(l=>{window.townEditor.loadLayout(l);window.townEditor.setEditing(false);},fixture);
    const count=()=>page.evaluate(()=>window.__editor.inspection.scene.grass.emitted);
    const camera=()=>page.evaluate(()=>window.__editor.inspection.camera);
    async function patch(){await page.evaluate(()=>window.townEditor.focusInstance('input-store'));await settle();return page.evaluate(()=>[window.__editor.screenWorld(-11,0,2),window.__editor.screenWorld(-5,0,2)]);}
    for(const button of ['left','right','middle']) {
      const [a,b]=await patch();await page.mouse.move(a.x,a.y);await page.mouse.down({button});const n=await count(),old=await camera();
      await page.mouse.move(b.x,b.y,{steps:15});assert.equal(await count(),n);await page.mouse.up({button});
      assert.equal((await camera()).busy,true);
      await page.mouse.move(b.x+12,b.y-12,{steps:4});assert.equal(await count(),n);await settle();
      const next=await camera();assert.notDeepEqual(next.position,old.position);
      if(button==='left')nearVector(next.target,old.target);else assert.notDeepEqual(next.target,old.target);
      equal(await layout(),fixture);
    }
    let [a,b]=await patch();await page.mouse.move(a.x,a.y);const n=await count();await page.mouse.wheel(0,-120);
    assert.equal((await camera()).busy,true);await page.mouse.move(b.x,b.y,{steps:10});assert.equal(await count(),n);await settle();
    // Programmatic focus must also suspend hover wind throughout its flight.
    await page.evaluate(()=>window.townEditor.showOverview());await page.mouse.move(a.x,a.y,{steps:4});assert.equal(await count(),n);await settle();
    await openEditor();await topView();await cancelTool();const old=await camera();assert.equal(old.editing,true);
    await page.mouse.move(1000,450);await page.mouse.down({button:'right'});const editWind=await count();await page.mouse.move(1100,480,{steps:15});await page.mouse.up({button:'right'});await settle();
    const next=await camera();nearVector(next.target,old.target);assert.notDeepEqual(next.position,old.position);assert.equal(await count(),editWind);equal(await layout(),fixture);
    // Switching away during a left drag cancels its pending move; release cannot place it.
    await topView();a=await point(4,4);b=await point(5,4);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});
    assert.equal(await page.evaluate(()=>window.__editor.inspection.selection.movingId),'input-store');
    await page.evaluate(()=>window.townEditor.setEditing(false));await page.mouse.up();equal(await layout(),fixture);await settle();
    assert.equal((await camera()).editing,false);
    await page.evaluate(l=>window.townEditor.loadLayout(l),before);
    report.mouseModes={view:{left:'orbit',right:'pan',middle:'pan'},edit:{left:'select/place/drag asset',right:'orbit',middle:'pan'},cameraAndInertiaPauseWind:true,midDragExitCancelled:true};
  });
  await check('browser: placement, move, shape and runtime transitions block hover wind; re-entry starts a fresh stroke', async () => {
    const before=await layout(),fixture=emptyLayout();fixture.instances=[{id:'tool-store',assetId:'convenience',x:4,z:4,rotation:0}];
    await page.evaluate(l=>window.townEditor.loadLayout(l),fixture);await openEditor();await topView();
    const [a,b]=await page.evaluate(()=>[window.__editor.screenWorld(14,0,14),window.__editor.screenWorld(24,0,14)]);
    const count=()=>page.evaluate(()=>window.__editor.inspection.scene.grass.emitted);
    async function sweep(){await page.mouse.move(a.x,a.y);for(let i=1;i<=8;i++){await page.mouse.move(a.x+(b.x-a.x)*i/8,a.y+(b.y-a.y)*i/8);await page.waitForTimeout(40);}}
    await choose('road-corner');let n=await count();await sweep();assert.equal(await count(),n);
    await cancelTool();await clickCell(4,4);await page.locator('#move').click();n=await count();await sweep();assert.equal(await count(),n);
    await cancelTool();await panel('shape');await settle();await page.locator('#preview-shape').click();n=await count();await sweep();assert.equal(await count(),n);await page.locator('#cancel-shape').click();
    await topView();await panel('assets');await cancelTool();await settle();
    n=await count();await sweep();assert.ok(await count()>n+2,'Free hover in edit mode still makes wind');
    const active=await page.evaluate(()=>window.__editor.inspection.scene.grass);
    // Crossing the panel does not connect distant ground positions with a fictitious gust.
    await page.mouse.move(100,160);n=await count();await page.mouse.move(a.x,a.y);assert.equal(await count(),n);
    await choose('road-straight');await page.waitForFunction(t=>window.__editor.inspection.scene.grass.time-t>3,active.time);
    equal(await page.evaluate(([x,z])=>window.townEditor.sceneView.grass.sampleWind(x,z),active.lastPulse),{x:0,z:0});
    await cancelTool();
    await page.evaluate(()=>{window.__disconnectInputs=window.townEditor.connectRuntime({setMode:mode=>new Promise(resolve=>window.__ackInputMode=()=>resolve({ok:true,value:mode}))});window.__modeInput=window.townEditor.requestMode('walk');});
    n=await count();await sweep();assert.equal(await count(),n);
    await page.evaluate(()=>window.__ackInputMode());await page.waitForFunction(()=>window.__editor.inspection.runtime.values.mode==='walk');await sweep();assert.equal(await count(),n);
    await page.evaluate(()=>{window.__modeInput=window.townEditor.requestMode('god');});await page.evaluate(()=>window.__ackInputMode());await page.waitForFunction(()=>window.__editor.inspection.runtime.values.mode==='god');
    await page.evaluate(()=>window.__disconnectInputs());await settle();equal(await layout(),fixture);
    await page.evaluate(l=>{window.townEditor.setEditing(false);window.townEditor.loadLayout(l);},before);
    report.windGating={placement:true,move:true,shape:true,runtimePendingAndWalk:true,decayWhileBusy:true,canvasReentry:true};
  });
  await check('browser: Sakura original model, card drag, repeated placement, four rotations, move, undo and save roundtrip', async () => {
    const before=await layout();await page.evaluate(l=>window.townEditor.loadLayout(l),emptyLayout());await openEditor();await topView();
    await choose('sakura-house');await hoverCell(4,4);assert.equal(await page.evaluate(()=>window.__editor.inspection.scene.previewAsset),'sakura-house');
    await page.locator('[data-asset="sakura-house"]').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/13-sakura-card-and-preview.png`});
    await clickCell(4,4);await clickCell(5,4);
    const first=(await layout()).instances.find(p=>p.x===4&&p.z===4),second=(await layout()).instances.find(p=>p.x===5&&p.z===4);
    assert.notEqual(first.id,second.id);const two=await layout();await clickCell(4,4);equal(await layout(),two);assert.match(await page.locator('#message').innerText(),/占用/);
    await clickCell(9,4);equal(await layout(),two);assert.match(await page.locator('#message').innerText(),/地图外/);
    const p=await point(6,5),rect=await page.locator('#editor-world').boundingBox();
    await page.locator('[data-asset="sakura-house"]').dragTo(page.locator('#editor-world'),{targetPosition:{x:p.x-rect.x,y:p.y-rect.y}});
    assert.equal((await layout()).instances.filter(p=>p.assetId==='sakura-house').length,3);
    await cancelTool();await clickCell(4,4);
    const rotations=[];
    for(let i=0;i<4;i++) {
      await page.locator('#rotate').click();
      const bounds=await page.evaluate(async id=>{const T=await import('three'),entry=window.townEditor.sceneView.getInstances().find(e=>e.placement.id===id);entry.asset.root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(entry.asset.root);return{rotation:entry.placement.rotation,size:box.getSize(new T.Vector3()).toArray(),scale:entry.asset.root.scale.toArray()};},first.id);
      equal(bounds.scale,[1,1,1]);assert.ok(Math.abs(bounds.size[0]-14)<.001&&Math.abs(bounds.size[2]-14)<.001);rotations.push(bounds.rotation);
    }
    equal(rotations,[90,180,270,0]);
    report.sakuraFidelity=await page.evaluate(async()=>{
      const {createModel,specification}=await import('/town/assets/sakura-house/index.js');
      const hash=async buffer=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');
      async function fingerprint(root){
        const nodes=[];root.traverse(n=>{if(n.geometry)nodes.push(n);});
        const data=await Promise.all(nodes.map(async n=>({type:n.type,transform:[n.position.toArray(),n.quaternion.toArray(),n.scale.toArray()],
          geometry:await Promise.all(Object.entries(n.geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(async([name,a])=>({name,itemSize:a.itemSize,normalized:a.normalized,count:a.count,hash:await hash(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength))}))),
          index:n.geometry.index?await hash(n.geometry.index.array):null,
          materials:(Array.isArray(n.material)?n.material:[n.material]).map(m=>({type:m.type,color:m.color?.getHexString(),toneMapped:m.toneMapped,vertexColors:m.vertexColors,opacity:m.opacity,side:m.side,map:m.map?.image?.toDataURL?.()||null}))})));
        return{hash:await hash(new TextEncoder().encode(JSON.stringify(data))),meshes:nodes.filter(n=>n.isMesh).length,vertices:nodes.filter(n=>n.isMesh).reduce((n,m)=>n+m.geometry.attributes.position.count,0),components:root.userData.components,specification:root.userData.specification};
      }
      const original=createModel();try{
        const entries=window.townEditor.sceneView.getInstances().filter(e=>e.placement.assetId==='sakura-house');
        const {hasGrassAt}=await import('/town/editor/grass.js'),l=window.townEditor.getLayout();
        return{revision:specification.revision,original:await fingerprint(original.root),placed:await Promise.all(entries.map(e=>fingerprint(e.asset.root))),grassOnPlots:entries.map(e=>hasGrassAt(l,(e.placement.x-4.5)*14,(e.placement.z-4.5)*14)),bladeCount:window.__editor.inspection.scene.grass.bladeCount};
      }finally{original.dispose();}
    });
    assert.equal(report.sakuraFidelity.revision,'exterior-03-states');
    for(const placed of report.sakuraFidelity.placed)equal(placed,report.sakuraFidelity.original);
    assert.ok(report.sakuraFidelity.original.components.some(c=>c.name.includes('电杆')));assert.ok(report.sakuraFidelity.original.components.some(c=>c.name.includes('灌木')));
    equal(report.sakuraFidelity.grassOnPlots,[false,false,false]);assert.equal(report.sakuraFidelity.bladeCount,33*24000);
    await page.locator('#move').click();await clickCell(5,4);equal((await layout()).instances.find(p=>p.id===first.id),first);
    await clickCell(4,3);assert.equal((await layout()).instances.find(p=>p.id===first.id).z,3);
    await cancelTool();const from=await point(5,4),to=await point(5,3);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:15});await page.mouse.up();
    assert.equal((await layout()).instances.find(p=>p.id===second.id).z,3);
    await clickCell(4,3);await page.locator('#delete').click();assert.equal((await layout()).instances.some(p=>p.id===first.id),false);await page.locator('#undo').click();assert.equal((await layout()).instances.find(p=>p.id===first.id).z,3);
    await panel('shape');await settle();await page.locator('#length-3').fill('0');await page.locator('#preview-shape').click();assert.equal(await page.locator('#affected-list li').count(),2);
    const shapeBefore=await layout();await page.locator('#apply-shape').click();assert.equal((await layout()).instances.filter(p=>p.assetId==='sakura-house').length,1);await page.locator('#undo').click();equal(await layout(),shapeBefore);
    await topView();await choose('convenience');await clickCell(3,4);await choose('road-straight');await clickCell(4,5);await cancelTool();
    const saved=await layout();await page.reload({waitUntil:'networkidle'});await ready();equal(await layout(),saved);
    await openEditor();await panel('save');const downloadEvent=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadEvent;await download.saveAs(`${output}/sakura-layout.json`);equal(JSON.parse(await readFile(`${output}/sakura-layout.json`,'utf8')),saved);
    await resetMessage();await importValue(emptyLayout());await resetMessage();await importValue(saved);equal(await layout(),saved);
    const rawSave=await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1'));const invalid=structuredClone(saved);invalid.instances[0].assetId='unaccepted-house';await resetMessage();await importValue(invalid);equal(await layout(),saved);assert.equal(await page.evaluate(()=>localStorage.getItem('rainy-corner.editor.layout.v1')),rawSave);
    await panel('assets');await topView();await page.locator('#exit-editor').click();const housePoint=await point(4,3);await page.mouse.dblclick(housePoint.x,housePoint.y);await settle();
    assert.equal(await page.evaluate(()=>window.__editor.inspection.camera.focusedId),first.id);assert.ok(Math.abs(await page.evaluate(()=>window.__editor.inspection.camera.distance)-35)<.1);
    await page.screenshot({path:`${output}/14-sakura-in-town.png`});
    await page.evaluate(()=>window.townEditor.showOverview());await settle();await page.screenshot({path:`${output}/15-sakura-town-overview.png`});
    report.sakuraOperations={stableIds:true,cardDrag:true,rotations,clickAndDirectDrag:true,shapeUndo:true,refresh:true,exportImport:true,invalidImportPreservesSave:true,focus:true};
    await page.evaluate(l=>window.townEditor.loadLayout(l),before);
  });
  await check('browser: independent Sakura resources released on removal, replacement, ghost, thumbnail and scene disposal', async () => {
    report.sakuraResources=await page.evaluate(async()=>{
      const {createEditorState}=await import('/town/editor/state.js'),{createEditorScene,renderThumbnails}=await import('/town/editor/scene.js'),{createAsset,assetIds,ASSETS}=await import('/town/editor/catalog.js');
      function track(asset){const resources=new Set();asset.root.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[]){resources.add(m);if(m.map)resources.add(m.map);}});const hits=new Map([...resources].map(r=>[r,0]));for(const r of resources)r.addEventListener('dispose',()=>hits.set(r,hits.get(r)+1));return()=>({total:resources.size,released:[...hits.values()].filter(n=>n>0).length,repeated:[...hits.values()].filter(n=>n>1).length});}
      const created=[];const factory=id=>{const asset=createAsset(id);if(id==='sakura-house')created.push({asset,inspect:track(asset)});return asset;};
      const initial={format:'rainy-corner-layout',version:1,rows:Array.from({length:10},(_,z)=>({start:4,length:z===4?2:0})),instances:[{id:'owned-a',assetId:'sakura-house',x:4,z:4,rotation:0},{id:'owned-b',assetId:'sakura-house',x:5,z:4,rotation:0}]};
      const state=createEditorState({assetIds,initial}),scene=createEditorScene({state,createAsset:factory}),a=created[0],b=created[1];
      state.remove('owned-a');const removed=a.inspect(),survivor=b.inspect();state.undo();const restored=created.at(-1),differentRoot=restored.asset.root!==a.asset.root;
      scene.preview({assetId:'sakura-house',x:4,z:4,rotation:0});const ghost=created.at(-1);scene.preview({assetId:'road-straight',x:4,z:4,rotation:0});const ghostDisposed=ghost.inspect();
      const changed=state.getLayout();changed.instances[0].assetId='road-corner';state.loadLayout(changed);const replaced=restored.inspect();
      const cards=renderThumbnails(ASSETS.filter(a=>a.id==='sakura-house'),factory);const thumbnail=created.at(-1).inspect();scene.dispose();
      return{removed,survivor,differentRoot,ghost:ghostDisposed,replaced,thumbnail,scene:b.inspect(),validThumbnail:cards.get('sakura-house').startsWith('data:image/png')};
    });
    const r=report.sakuraResources;assert.equal(r.survivor.released,0);assert.equal(r.differentRoot,true);assert.equal(r.validThumbnail,true);
    for(const key of ['removed','ghost','replaced','thumbnail','scene']){assert.ok(r[key].total>100);assert.equal(r[key].released,r[key].total,key);assert.equal(r[key].repeated,0,key);}
  });
  await check('scope: authored buildings, roads, editing and save modules preserved', async () => {
    const baseline=JSON.parse(await readFile(new URL('./fixtures/editor-protected-assets.json',import.meta.url),'utf8'));
    report.protectedFilesChecked=0;
    for(const entry of baseline.files){
      const data=await readFile(new URL('../'+entry.path,import.meta.url));
      assert.equal(createHash('sha256').update(data).digest('hex'),entry.hash,'Unexpected protected change: '+entry.path);
      report.protectedFilesChecked++;
    }
  });
  equal(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack;
  if (page) await page.screenshot({path: `${output}/failure.png`}).catch(() => {});
} finally {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(`${output}/inspection.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({passed: report.passed, checks: report.layers.map(layer => ({name: layer.name, passed: layer.passed})), errors: report.errors, failure: report.failure}, null, 2));
  if (!report.passed) process.exitCode = 1;
}
