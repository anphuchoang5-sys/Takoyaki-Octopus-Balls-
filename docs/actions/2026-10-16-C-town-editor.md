# C · 地图编辑器与道路

## Status and situation

状态：Superseded（v1 视觉方案）。原 v1 功能实现与以下历史验证保留；用户否定其视觉重心，当前版本见 [场景呈现与草地交互重做](2026-10-16-C-town-editor-visual.md)。范围：C 的编辑状态、道路、界面、独立预览与交接。请求日期：2026-10-16。B 新建筑交付及 D 实际运行层接入仍未完成，不计入 C 的完成声明。

- 已完整读取用户提供的 AGENTS.md 规则、全局 project-control-report 与 action-document 技能。E:/、E:/动森/、项目内未发现额外 AGENTS.md。
- 用户确认 B 尚未交付，当前只有一个便利店素材。现有 `dist/walk/buildings.js` 导出 `createBuilding('convenience')`、`TILE_SIZE=14`，返回 root / colliders / occluders / roofs / lamps / floors / update。仅复用此便利店；其他旧工厂类型不视为本批建筑交付。
- 樱家、みまつや杂货店、学校、公园均待 B 交付，不制作替代模型，不将 AME MART 改称みまつや。
- 布局最多 10×10，每行由起点及连续长度定义；空格是草地，未启用位置是地图外。道路独立占格，形状由用户决定。
- 首次进入为空白地图；编辑操作、状态、场景和演示入口分离。时间、天气、散步运行能力由 D 接入，C 只提供请求和明确状态。
- 基线 `cc81931`；开始时已有 `docs/actions/2026-10-16-walking-neighborhood.md` 未提交修改，保留。无提交、推送、部署授权，不修改散步主入口、建筑源文件、人物或全局天气。
- 本轮期间 B 并行新增了自己的行动文档。核对时其状态仍为 In progress，未接收其制作中模块；仅使用用户确认的现有便利店。

## Implementation measures

1. 先实现版本化布局校验、原子事务、稳定实例 ID、撤销、形状影响预览及过期预览保护。
2. 复用现有便利店工厂；新增四种道路模型，真实模型渲染缩略图，未交付建筑仅显示禁用文字卡。
3. 独立界面支持点击/拖放、方向预览、选择/旋转/搬动/删除/撤销；占格和越界不覆盖。
4. 单地图自动保存、导入导出，失败导入与损坏存档不破坏当前数据。
5. 提供同场景组合、布局加载与变更事件、D 运行层请求接口，并明确尚未连接状态。
6. 使用本机 Chrome / Playwright 实际运行浏览器输入，保存截图与结构化结果；核对原文件边界及交接文档。

## Affected file tree

实际新增（未修改既有源文件）：

- `dist/town/editor/state.js`：与 Three.js/DOM 无关的布局模型、校验和编辑事务。
- `dist/town/editor/persistence.js`：浏览器存储及失败保护。
- `dist/town/editor/catalog.js`：复用当前已交付的便利店工厂；素材定义和实例分离。
- `dist/town/editor/roads.js`：C 所属的四种独立道路模型。
- `dist/town/editor/scene.js`：可挂入 D 场景的地面、网格、模型实例、吸附/影响预览。
- `dist/town/editor/runtime.js`：D 运行层接入、请求/确认/错误状态。
- `dist/town/editor/ui.js`、`editor.css`：编辑操作与界面。
- `dist/editor-preview/index.html`、`main.js`：独立预览组合入口。
- `scripts/inspect-editor.mjs`：状态边界与真实浏览器行为检查。
- `docs/handoffs/C-town-editor.md`：真实素材状态、格式、公开接口与 D 接入说明。
- `artifacts/editor/01-empty-map.png`、`02-snap-direction.png`、`03-shape-impact.png`、`04-irregular-town.png`、`05-desktop-1280.png`、`06-final-overview.png`：实际浏览器截图。
- `artifacts/editor/inspection.json`：最终状态/浏览器/边界检查结果；`exported-layout.json`：浏览器实际下载的布局。
- `artifacts/editor/boundary-baseline.json`：16 个保护文件 SHA256；`delivery.json`：C 源文件及文档交付清单和 SHA256。
- `artifacts/editor/failure.png`：第一次浏览器检查失败时的诊断截图，保留为失败证据，不作为最终画面。
- 本行动文档：实施与验证的持续记录。

## Self-verification method

- JavaScript 语法检查，Node 状态校验（坐标、版本、占格、未知素材、旋转、形状事务、撤销）。
- 本机 HTTP + Chrome / Playwright：首次空白、不规则轮廓、点击与鼠标拖放、旋转、搬动、删除、撤销、影响预览/确认/取消、刷新、导出文件/导入、无效输入、自动保存失败、未连接及模拟连接的 D 请求。
- 真实 WebGL 截图及控制台检查，缩略图来自相同素材工厂。运行层模拟不代表 D 实际人物/天气已接入。
- `git diff --check`、既有边界文件 SHA256 对比。不替代用户手动体验或最终审美验收。

## Self-verification results

2026-10-16，本机 Chrome + Playwright，最终 17 组检查全部通过，浏览器控制台错误和 pageerror 均为 0。完整结果在 `artifacts/editor/inspection.json`。

### 已执行检查

- `Get-ChildItem dist/town/editor/*.js,dist/editor-preview/*.js,scripts/inspect-editor.mjs | ForEach-Object { node --check $_.FullName }`：全部通过。
- `node scripts/serve.mjs`：本地 4173 HTTP 预览启动成功；`/editor-preview/` 实际 HTTP 200。
- `node scripts/inspect-editor.mjs`：纯状态事务、校验、撤销；损坏保存及存储错误；D 契约的未连接/确认/拒绝/重复/断开响应均通过。
- 同一检查脚本实际驱动 Chrome：首次空白、5 个真实模型缩略图、四种未交付建筑的文字状态；点击放置和重复实例、原生 HTML 拖入；方向预览；已选实例旋转/搬动/拖动/删除/撤销，稳定 ID 保持；占格、越界拒绝。
- 不规则行形状、起点＋长度越界、三个受影响实例的范围预览、取消、确认移除及一步整体撤销通过。检查了金框的实际世界坐标。
- 刷新恢复、真实下载 JSON、文件输入导入、导入撤销通过；损坏 JSON、未知版本、重复占格、越界、未交付素材导入全部拒绝，布局和已保存 JSON 均未改变。
- 浏览器旧存档损坏时保留原文，取消恢复确认不覆盖，明确确认后替换通过；注入 QuotaExceededError 后提示导出，当前内存布局仍可使用。
- D 模拟适配器确认后界面和格线正确响应，散步时界面编辑锁定；这是接口模拟，未运行真实 D 人物/天气。
- 1280×900 无页面横向溢出；10×10 满地图、100 道路实例、四个角仍在镜头内、相邻道路不改形、键盘旋转/Ctrl+Z、全空行后撤销恢复通过。
- 保护文件 SHA256 对比：16 个既有文件一致，覆盖现有 walk、人物、环境、便利店、主观赏页、依赖清单、README 和服务脚本。
- `git diff --check`：通过。当前 C 文件为未提交新增，未做广泛暂存或提交。已有其他窗口修改保留。
- 已打开查看最终六类浏览器截图，确认非空渲染、左右面板、道路形状、空白/不规则地面、吸附箭头、影响范围和小屏桌面可用性。

### 实际失败与修复

1. 初次在受限环境启动 Chrome 返回 `spawn EPERM`，属于浏览器启动权限问题；通过自动审批的限定本地检查命令后成功运行，无网页/模型错误结论。
2. 第一次浏览器检查发现页面未应用样式，放置点击未落到实际画布；现有服务脚本不提供 CSS MIME。独立入口改为读取自身 CSS 文本注入，不修改公共服务；增加实际 computedStyle 断言后重跑通过。
3. 截图核对发现 Box3Helper 自行按 box 更新变换，原金框位置不正确；改为世界坐标 bounds，并增加三个受影响实例 bounds 断言，重跑通过。
4. 接口核对发现 spread 会抹平现有素材的 `doorOpen` getter；改为保留工厂原对象，增加浏览器 getter 断言通过。

### 当前限制与交接

- B 第一批新建筑仍待正式交付；本轮没有替代建筑或假缩略图。
- D 真实散步、碰撞同步和统一时间天气未接入。C 只完成状态桥与同场景挂接接口，详见 `docs/handoffs/C-town-editor.md`。
- 撤销历史只在当前页面内保留；localStorage 按 origin 保存单张布局；未实现多标签页并行冲突合并。
- 未做移动设备或 100 个复杂建筑性能压测；100 格验证使用道路。浏览器自动操作与截图检查不替代用户手动体验或审美确认。
- 无新增依赖、无 Git 提交/推送、无站点发布。独立预览需 HTTP 服务。
