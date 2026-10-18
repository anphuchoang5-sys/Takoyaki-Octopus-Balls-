# 小镇规划编辑器正式首页与旧原型归档

## Status and situation

- Completed。本地首页整理、旧页面归档、确认无用代码清理与验证已完成。用户已明确授权本轮修改，并在执行中强调樱家属于建筑窗口新作品，必须保留。
- 真实项目目录为 `E:\动森\小丸子小镇`；两个旧目录名只是兼容联接。工作区有 B/C 与之前整理的未提交内容，先保存指纹和归档，不重置、不广泛暂存、不提交或发布。
- 已读取 project-control-report、action-document 及适用协作规则；未发现额外磁盘 AGENTS.md。
- 整理前首页为旧便利店观赏页，编辑器在 `/editor-preview/`；旧 `/walk/` 使用固定九地块、旧人物与环境。整理后 `/` 为正式编辑器，旧编辑器地址跳转首页，旧原型可在归档中独立运行；人物和统一环境仍待接入。
- 现有便利店、四种道路、樱家独立模型及旧样稿全部保留。樱家未在本次自动接入编辑器。
- 布局格式、版本、素材 ID 和 localStorage 键不改；同源根路径迁移不要求用户迁移存档。

## Implementation measures

1. 保存当前项目文件指纹、Git 状态和拟修改文件；归档旧观赏/散步页面、完整依赖及专用脚本，逐文件核验 SHA256 后才移除活动目录中的旧页面代码。
2. 将编辑器页面/宿主移到 `dist/index.html` 与 `dist/main.js`，校正相对路径；`/editor-preview/` 保留跳转，沿用同一来源和存储键。
3. 提取既有建筑实例缓存/门动画的共用实现，让编辑器直接使用便利店工厂，保留完整建筑目录和通用创建入口，避免下载四种旧样稿。
4. 归档并移除旧页面独占的运行代码、反射依赖、旧页面检查与全量离线打包脚本；保留街角/几何/材质和建筑共用部分。仅清除确认无效的阴影判断和闲置 palette 定义。
5. 更新当前 README、建筑说明、交接及 npm 检查入口；当前编辑器检查使用相对路径资产基线，历史证据保留。
6. 执行编辑器完整回归、迁移/跳转/旧存档保护、建筑前后对比及归档可打开检查，记录实际结果。

## Affected file tree

实际新增/修改：
- `archive/2026-10-17-legacy-prototypes/`：旧页面的可独立运行源码快照、依赖、专用脚本、原 README 和校验清单；不放进发布目录。
- `dist/index.html`、`dist/main.js`：正式编辑器入口及宿主。
- `dist/editor-preview/index.html`：旧编辑器地址跳转。
- `dist/town/assets/shared/instances.js`、`dist/town/assets/index.js`：复用既有缓存/克隆/门动画，保留全部建筑工厂接口。
- `dist/town/editor/catalog.js`、`convenience-scene.js`：只导入当前所需建筑实现。
- `dist/street.js`：直接引用便利店共用贴图，移除已无必要的转发依赖。
- `dist/world.js`：仅删除无消费者的调色板常量。
- `scripts/inspect-editor.mjs`、`scripts/fixtures/editor-protected-assets.json`：正式首页回归与当前不可变资产/编辑模块保护。
- `scripts/vendor.mjs`、`package.json`：移除旧反射依赖复制和旧页面检查入口。
- `README.md`、`dist/town/assets/README.md`、`docs/handoffs/C-town-editor.md`、旧排查报告：当前入口、归档位置和清理结果。
- `artifacts/editor-home-20261017/`：修改前副本、指纹、模型前后对比、回归报告与截图。

已在归档核验后移除活动副本：`dist/scene.js`、`weather.js`、`store.js`、`walk/` 内六个旧文件、`editor-preview/main.js`、`vendor/addons/objects/Reflector.js`；`scripts/inspect.mjs`、`inspect-walk.mjs`、`inspect-walk-states.mjs`、`standalone.mjs`。共 15 个文件，每个均有哈希一致的副本；编辑器宿主移动前另保存副本，不将它误标为旧原型。仅移除已空的 `dist/walk/`、`dist/vendor/addons/objects/` 目录。

## Self-verification method

- 归档清单哈希与修改前原文件一致；所有移除路径位于项目根内且有已核验副本。
- 修改 JS 语法、剩余模块引用及 Git 空白检查。
- 现有 Chrome/Playwright 编辑器完整回归：摆放、移动、旋转、撤销、地图轮廓、导入导出、错误保护、100 格道路、镜头和草风。
- 同源旧存档在首页加载、从旧编辑器地址跳转后内容不变、损坏原文保留；网络记录确认不再加载旧页面和旧样稿。
- 六个旧资产实例（含住宅两种）完整序列化归一化对比、独立门动画；樱家源码/GLB 保全及独立预览。
- 独立端口启动归档，检查旧两页启动；不以此推断手机或完整人工玩法验收。

## Self-verification results

- **归档与保全：通过。** 修改前记录 89 个文件指纹并保存副本；旧原型归档 44 个原文件（2,254,319 字节），清单 SHA256 全部一致。樱家的 6 个资产文件（含 GLB、源码、预览和 README）、B 行动记录与交接文档共 8 项均未改变。最终范围对照见 `artifacts/editor-home-20261017/preservation.json`；未覆盖已有未提交内容。
- **语法与引用：通过。** 对本轮改动的 9 个 JS 文件逐个运行 `node --check`，运行 `git diff --check` 无错误。活动 JS 为 41 个；以首页、樱家预览、保留的完整建筑工厂为入口扫描，没有缺失或不可达模块。首页依赖从 38 个减为 33 个，实际网络请求确认不加载四种旧样稿、旧观赏/散步代码或整库入口。详见 `module-audit-after.json`。
- **完整编辑器回归：通过 21/21。** 使用 `$env:EDITOR_ARTIFACT_DIR='artifacts/editor-home-20261017/regression'; node scripts/inspect-editor.mjs`，真实 Chrome/WebGL 验证摆放、移动、旋转、撤销、不规则轮廓、保存/刷新/导出/导入、损坏数据保护、100 格道路、镜头与草风交互，页面/控制台错误为 0；24 个资产/核心编辑模块指纹保护通过。详见 `regression/inspection.json`。
- **建筑前后对比：通过。** `node artifacts/editor-home-20261017/verify-models.mjs before` 与 `after` 分别生成整理前后报告。便利店、咖啡店、书店、住宅两款及小公园共 6 个实例，完整序列化模型消除随机 UUID 后的 SHA256 一致；多实例门动画状态互相独立。详见 `models-before.json`、`models-after.json`。
- **首页迁移、旧存档与归档启动：通过。** `node artifacts/editor-home-20261017/verify-home-and-archive.mjs` 验证旧编辑器带查询参数/锚点跳转、原存档原文不变、首页编辑刷新后保留、损坏原文仍保留；格式、版本与存储键不变。旧活动入口返回 404；在临时独立端口启动归档，两页均返回 200 且渲染就绪，验证后停止临时归档服务。原 4173、4184 服务保留。详见 `home-and-archive.json`。
- **樱家独立预览：通过。** 实际打开预览，检查旋转、缩放、便利店对照及四方向边界，最大地块范围仍为 ±7；没有自动把樱家接入编辑器。查看 `homepage.png`、`sakura-preserved.png` 确认两页正常显示，此项不替代用户美术认可。
- **执行环境及限制：** 沙箱中 Chrome 子进程启动遇到 EPERM，使用获准的本机隔离 Chrome 检查后通过；这是执行环境限制，不是页面故障。未操作用户浏览器存档，未进行真实手机或人工完整玩法验收，未提交、推送或发布。B 原交付脚本及其历史保护基线保留原样，本轮没有将历史目录指纹检查宣称为现状回归。
- **结论：** 本轮目标已完成，无待决事项。后续可继续评审樱家补灯版或接入其他功能，均不属于本次清理。
