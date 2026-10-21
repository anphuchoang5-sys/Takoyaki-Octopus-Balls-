export const editorShell = `
  <main class="viewport" id="viewport"></main>
  <button id="enter-editor" class="entry-button" aria-expanded="false">✦ <span>布置街区</span></button>
  <p id="scene-hint" class="scene-hint">左键拖动环绕 · 滚轮拉近 · 右键 / 中键平移 · 双击建筑细看<br>不按键，鼠标掠过草地就会带起风</p>
  <aside id="workbench" class="workbench" hidden>
    <header class="workbench-head"><div><span class="eyebrow">小丸子小镇</span><strong>布置你的街角</strong></div><button id="exit-editor" class="primary">完成 ✓</button></header>
    <nav class="panel-tabs" aria-label="布置工具"><button data-panel="assets" class="active">素材</button><button data-panel="shape">轮廓</button><button data-panel="environment">环境</button><button data-panel="save">存档</button></nav>
    <div class="panel-scroll">
    <section id="panel-assets"><p class="muted">点击模型，再点草地放置，也可直接拖入。<br>左键拖动已有建筑 · 右键环绕 · 中键平移</p><div class="section-label">建筑 <small id="building-count"></small></div><div id="buildings"></div>
      <div class="section-label">道路 <small>形状由你决定</small></div><div id="roads" class="road-cards"></div>
      <details class="pending"><summary>等待接入的建筑</summary><div id="pending-assets"></div></details>
    </section>
    <section id="panel-shape" hidden><h2>岛屿轮廓</h2><p class="muted">最多 10 × 10 格，每行连续。<br>长度设为 0 可停用整行。</p>
      <div class="row-heading"><span>行 / 轮廓</span><span>起点 1–10</span><span>格数</span></div><div id="rows"></div>
      <button id="preview-shape" class="wide secondary">预览轮廓变化</button>
      <section id="shape-impact" class="impact" hidden><strong>确认地图变化</strong><p id="impact-description"></p><ul id="affected-list"></ul><small>红色移除 · 绿色新增 · 金框标出受影响素材</small><button id="apply-shape" class="wide primary">确认变化</button><button id="cancel-shape" class="wide">取消</button></section>
    </section>
    <section id="panel-environment" hidden><h2>天空与漫游</h2><p class="muted">四时段、晴雨雪已接入。下雪约一分钟积满；转晴约五分钟、转雨约一分钟融完。散步待接入。</p>
      <label class="setting">时间 <select id="time"><option value="">待接入</option><option value="morning">早晨</option><option value="afternoon">午后</option><option value="dusk">黄昏</option><option value="night">夜晚</option></select></label>
      <label class="setting">天气 <select id="weather"><option value="">待接入</option><option value="clear">晴天</option><option value="rain">下雨</option><option value="snow">下雪</option></select></label>
      <p id="snow-status" class="muted">积雪 0%</p><div class="mode-switch"><button id="god" class="active">上帝视角</button><button id="walk">散步 <small>待接入</small></button></div><p id="runtime-status" class="muted"></p>
    </section>
    <section id="panel-save" hidden><h2>留住这个街角</h2><p id="save-status" role="status">正在读取本机存档…</p><div class="file-actions"><button id="export">↓ 导出布局</button><button id="import">↑ 导入布局</button></div><input type="file" id="import-file" accept=".json,application/json" hidden><button id="replace-save" class="wide" hidden>用当前布局替换旧存档</button><button id="backup-save" class="wide" hidden>下载保留的旧存档</button><p class="muted">自动保存在此浏览器。<br>导入也可以一步撤销。</p></section>
    </div><footer class="workbench-footer"><strong id="selection-title">尚未选择素材</strong><span id="selection-detail">点击已有素材可选中编辑</span><small id="map-count"></small></footer>
  </aside>
  <div id="edit-controls" hidden><div class="view-tools"><button id="view-overview">街区总览</button><button id="view-toggle">俯视布局</button></div>
    <div class="edit-toolbar" role="toolbar" aria-label="素材操作"><button id="select-tool" class="active">↖ 选择</button><button id="rotate" title="R 旋转 90°">↻ 旋转 <kbd>R</kbd></button><button id="move" title="M 搬动">↔ 搬动 <kbd>M</kbd></button><button id="delete" title="Delete 删除">⌫ 删除</button><button id="undo" title="Ctrl+Z 撤销">↶ 撤销</button></div>
    <span id="coordinates" class="coordinates"></span><div id="empty-note" hidden></div>
  </div><div id="message" class="message" role="status" aria-live="polite"></div>`;
