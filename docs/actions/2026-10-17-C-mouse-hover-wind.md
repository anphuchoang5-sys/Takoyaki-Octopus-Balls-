# C · 分模式鼠标与长草甸 v2.2

## Status and situation

- 状态：Completed（本地实现和自动化浏览器验证）。用户已确认：观赏左键拖动环绕；布置左键直接拖建筑；不按键滑过草地触发风；操作镜头或素材时暂停新风；草高增加约 50%、密度增加约 33%。
- 修改前实文件 v2.1 为 .30–.69 草高、每完整草格 18,000 叶；观赏左键原被草风占用。现已改为 .45–1.035、每格 24,000 叶及分模式镜头操作。
- 范围：C 的编辑器鼠标、预览镜头、草叶、操作提示、浏览器检查及交接记录。保留存档 v1、原便利店与其完整街角。无提交、推送、发布。
- 已读取适用用户 AGENTS 规则、project-control-report / action-document 技能；磁盘祖先及项目没有额外 AGENTS.md。核对当前 C 交接、草地行动记录和 B 交接。
- B 当前已记录樱家 exterior-02 获认可，exterior-02-lamp 技术完成、新电灯待查看；本轮不自动接入，不再将其描述为从未交付。其他三栋未接入。D 运行层仍待接入。

## Implementation measures

1. 为观赏/布置分别配置镜头鼠标；保留布置左键选择/放置/直接拖动、右键环绕、中键平移，观赏左键环绕、右键或中键平移，滚轮缩放共用。
2. 悬停草风仅在鼠标无按键、可见草地、无操作工具、镜头静止时生成；已有风正常衰减。离开画布、镜头变化、模式/布局变化重新建立划动起点。
3. 草高 .45–1.035、完整格 24,000 叶；保持细叶层次，并抬高编辑辅助标记避免埋入草冠。
4. 更新模式相关操作提示及 D 镜头/编辑状态接点，保持真实运行能力状态。
5. 浏览器验证原编辑回归、两种鼠标模式、悬停起风与操作期间暂停；截图核对长草和完整便利店。

## Affected file tree

- `dist/town/editor/camera.js`：模式鼠标绑定、镜头忙状态。
- `dist/town/editor/ui.js`、`ui-shell.js`：悬停风、编辑操作隔离、提示。
- `dist/town/editor/grass.js`、`scene.js`：草高密度与编辑辅助高度。
- `dist/editor-preview/main.js`：组合上述接口与无障碍提示。
- `scripts/inspect-editor.mjs`：浏览器回归与交互冲突检查。
- `docs/handoffs/C-town-editor.md`：当前交接、鼠标与 D 接口。
- 本行动文档：当前事实及验证记录。
- `artifacts/editor/v2.2/`：修改前备份、截图、检查及文件指纹；`record-hover-wind.mjs` 录制真实 canvas 动画 `hover-wind.webm` 与读数；保留 v2/v2.1 历史证据。
- 不修改 B 素材、原型、散步主入口、人物、全局天气、公共依赖和服务。

## Self-verification method

- `node --check` 对本轮 JS/MJS；`git diff --check`。
- 已运行的 4173 HTTP 服务，隔离 Chrome/Playwright 上下文，`EDITOR_ARTIFACT_DIR=artifacts/editor/v2.2 node scripts/inspect-editor.mjs`。
- 真实鼠标验证环绕/平移/缩放、建筑直接拖动、模式切换、无按键草风、操作期间抑制、衰减；原存档/导入/撤销/轮廓验证保留。
- 查看截图；保护边界指纹检查，不将自动化或截图等同用户审美接受或多设备性能验收。

## Self-verification results

已运行并核对：

- `node --check`：本轮 camera/ui/ui-shell/grass/scene、预览 main、inspect-editor 语法通过。
- `node scripts/inspect-editor.mjs`：最终 21 组全通过，Chrome 页面与控制台错误 0，实际报告 `artifacts/editor/v2.2/inspection.json`。仍覆盖不规则轮廓、点击/原生卡片拖入、直接拖建筑、旋转/搬动/删除/撤销、刷新恢复、导出/导入、无效输入保护和 100 格道路。
- 首轮 18 组通过，第 19 组镜头目标检查将约 1e-19 的数值差误判为移动；这是检查精度问题，改为世界单位 .001 容差后重跑完整检查通过。首次报告及截图保存在 `inspection-first-failure.json` / `first-failure.png`，不作为最终结果。
- 新行为：观赏左键环绕、右/中键平移、滚轮缩放；布置右键环绕、左键直接搬建筑且相机不动。拖动中收起编辑取消搬动；布局保持不变。镜头操作/惯性/聚焦飞行、放置/搬动/轮廓预览、运行模式待确认与 walk 状态均不生成新风；无操作的布置状态仍允许悬停起风；跨面板返回重新建立起点。
- 草风实际鼠标滑动（没有 mouse.down）产生 24 次风脉冲，末方向约 `[1, 0]`；远处几乎不受影响，超过 3 秒后采样归零，布局/镜头不变。默认空场景 864,000 草叶、一便利店 840,000 草叶。
- `node artifacts/editor/v2.2/record-hover-wind.mjs`：真实 Chrome canvas 录制成功，30 次同向风脉冲，回弹归零，错误 0。当前录像 `hover-wind.webm`、截图 `13-long-meadow-hover.png`、读数 `wind-recording.json`。
- 实际查看 `10-grass-sweep.png`、`12-edit-tools.png`：长草和局部倒伏可见，便利店与街边装饰完整，编辑格线位于草冠上方。截图并非用户审美认可。
- 模型保真检查通过：店体与原工厂顶点/网格/贴图相同，完整街角保留售卖机、自行车、伞架等，14×14 占格有效；原有门动画实例隔离通过。20 个受保护文件与 v2 指纹一致，另外 5 个早先项目改名差异有既有记录。
- `git diff --check` 通过（已有文件换行提示不影响检查）；另对 8 个本轮改动文件与备份运行 no-index 空白检查。首次将 CRLF 误报为尾随空白、随后将 no-index 的“存在差异”退出码 1 误当失败；按 `core.whitespace=cr-at-eol` 检查输出后全部通过，没有为通过检查改写文件换行。22 项交付 SHA256 核对通过。无依赖变更，无提交/推送/发布。
- 交接新增 `mountEditorUI` 的 `onEditingChange(enabled)` / `isCameraBusy()` 接点；预览连接实际 cameraRig。布局 v1 与 localStorage 键不变。D 真正运行层、多设备性能与最多 240 万草叶的低端设备表现未验收。
