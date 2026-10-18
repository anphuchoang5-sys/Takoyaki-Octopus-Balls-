# 一栋建筑一个文件夹

## Status and situation

- Completed。用户明确要求直接整理现有建筑目录；现有五类模型已分别归入独立文件夹，引用已更新并完成回归。
- 现有便利店、咖啡店、书店、住宅、小公园集中在 `dist/walk/buildings.js`；便利店陈设位于 `dist/store.js`。
- 编辑器已交付，仅便利店与道路是当前素材清单。其余旧模型保持旧原型身份，不增加到编辑器中。
- B 的樱家尚无模型文件；保留其工作记录，不代做樱家，不建立未完成建筑的假素材。
- 保留全部既有未提交工作；不改人物、天气、道路、布局格式，不推送或发布。

## Implementation measures

1. 保存本次变更前文件副本、指纹和建筑模型输出，供对照。
2. 将五类现有模型分别整理到 `dist/town/assets/` 下同名文件夹；便利店陈设归入便利店文件夹；仅共用造型辅助放入 shared。
3. 原有入口保留兼容转发，编辑器引用新素材入口，素材编号及实例行为不变。
4. 更新简短目录说明；执行模型前后对照和实际浏览器回归。

## Affected file tree

- `dist/town/assets/{convenience,cafe,bookshop,home,garden}/index.js`：每栋模型的独立实现。
- `dist/town/assets/convenience/store.js`：原便利店陈设与动画实现。
- `dist/town/assets/shared/building-parts.js`：旧模型实际共用零件。
- `dist/town/assets/index.js`：保持既有创建、缓存、实例与门动画行为。
- `dist/town/assets/README.md`：中文目录指引和旧样稿标识。
- `dist/town/assets/sakura-house/`：仅预留本地空目录，未写入 B 的模型或交付内容；空目录不会进入 Git。
- `dist/walk/buildings.js`、`dist/store.js`：旧入口兼容转发。
- `dist/town/editor/catalog.js`：更新素材来源位置。
- `README.md`：更新建筑位置及编辑器入口说明。
- `docs/handoffs/C-town-editor.md`：补充本次目录迁移说明，原交付事实保留。
- `artifacts/building-folders/`：变更前副本、模型对照、隔离回归报告（不提交）。

## Self-verification method

- Node 语法检查修改后的模型模块和兼容入口。
- 浏览器对照迁移前后五类模型（含住宅两种外观）的完整序列化输出，归一化随机对象标识；检查实例独立与自动门。
- 原编辑器检查在独立输出目录运行；历史边界基线只排除本次明确修改的文件，保留 C 的原始报告和基线。
- 旧散步与原观赏页使用现有浏览器检查，输出到本次独立目录。
- 核对所有其他既有文件指纹及地图素材编号、存档格式。

## Self-verification results

- 变更前副本及 54 个既有文件指纹保存在 `artifacts/building-folders/before/` 与 `before-hashes.json`；保留此前其他窗口未提交工作。
- 11 个新增或修改 JS 模块均通过 `node --check`。
- `node artifacts/building-folders/verify-models.mjs before` 与 `after`：五类建筑、住宅两种外观共六个模型的完整序列化数据在归一化随机 UUID 后 SHA256 完全一致；几何、材质、碰撞、屋顶、灯位及地面元数据不变；便利店两个实例的自动门互不影响，浏览器无 pageerror。
- `node artifacts/building-folders/inspect-editor.mjs`：17 组检查全部通过，无控制台或页面错误；覆盖真实缩略图、放置、旋转、拖放、撤销、存档刷新、文件导入导出、100 格道路等。采用原 C 脚本，仅调整副本的相对导入和输出路径；历史 16 个保护文件中排除本次有意修改的 `walk/buildings.js`、`store.js`、`README.md`，其余 13 个指纹一致。C 原始脚本、报告及基线均未覆盖。
- `node artifacts/building-folders/inspect-walk.mjs`：HTTP 200，无错误，移动、碰撞、统一天气、昼夜/天气独立切换及唯一格子均通过。
- `node artifacts/building-folders/inspect-showcase.mjs`：HTTP 200，无错误，原观赏页旋转、缩放、动画推进、自动门开合均正常。
- 浏览器启动和 Node 子进程语法检查最初在沙箱内遇到 EPERM；浏览器经批准使用隔离无界面 Chrome 重跑成功，语法检查改为直接逐文件运行成功。不是代码故障。
- 最终差异和其他既有文件指纹核对结果另见 `artifacts/building-folders/preservation.json`；`git diff --check` 通过。
- 本次是目录整理，不构成新模型美术验收。未改人物、道路、全局天气或地图格式；未修改用户浏览器存档，未重新生成旧离线包，未提交、推送或线上发布。
