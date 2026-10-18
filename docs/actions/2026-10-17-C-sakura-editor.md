# C · 小丸子的家接入编辑器 v2.3

## Status and situation

- 状态：Completed（本地实现与实际浏览器验证）。用户明确要求把“小丸子的家”加入建筑列表，亲自在小镇中摆放。
- 已完整读取项目汇报/action-document 技能和用户 AGENTS 规则；实际目录及祖先未发现额外 AGENTS.md。旧 rainy-corner 路径已不可用，当前实际目录为 `E:\动森\小丸子小镇`，现有 4173 首页 HTTP 200。已读目录改名、首页归档行动记录，保留其他窗口未提交工作。
- 已核对 B 交接、README 和实际源文件：`sakura-house` / `exterior-02-lamp`，14×14，+Z 正面，Y 向上；`createModel()` 返回独立 root、specification、colliders/occluders/floors、空 roofs/lamps 及 `dispose()`。房屋基线获认可，补灯技术完成；本轮按用户要求直接接入这份实际交付，不重做或修改 B 模型。
- 修改前编辑器仅便利店和四种道路，现新增小丸子的家。B 材质使用固定动画色阶；没有完整室内、动态照明、人物碰撞或遮雨运行验收，本轮不冒充这些能力。
- 范围：C 素材目录登记、真实缩略图、聚焦、资源生命周期、原编辑流程验证及交接。布局格式/存档键不变，不自动向用户存档放入建筑。无提交/推送/发布。

## Implementation measures

1. 在 catalog 注册 `sakura-house`，显示“小丸子的家”，直接调用 B 的 createModel，保持模型缩放、几何、材质、元数据和 dispose；仅补编辑器展示/聚焦配置。
2. 建筑数从清单计算，卡片说明区分完整便利店街角与房屋院子；待接入仅保留另三栋。
3. 场景移除/替换/销毁、放置预览更换和缩略图生成后，调用独立资源模型的 dispose；便利店/道路共享缓存按原规则保留。
4. 核对占一格、四向旋转和草地遮罩；验证重复放置/点击/拖拽/搬动/删除/撤销、刷新与文件导出导入、不覆盖已有素材。
5. 查看同场景完整模型截图；更新 D 交接及当前资源保护基线，保留 B 源码指纹和所有历史交付记录。

## Affected file tree

- `dist/town/editor/catalog.js`：素材注册，复用 B 原对象与展示配置。
- `dist/town/editor/scene.js`：独立资源生命周期及每素材缩略图取景。
- `dist/town/editor/camera.js`：支持素材指定聚焦方向。
- `dist/town/editor/ui-shell.js`、`ui.js`：建筑数量、卡片说明与待接入清单。
- `scripts/inspect-editor.mjs`：加入樱家实际操作、模型保真与资源释放验证。
- `scripts/fixtures/editor-protected-assets.json`：更新本轮有意改动的 C 文件指纹，B 与其他受保护文件指纹保持原值；旧基线备份。
- `docs/handoffs/C-town-editor.md`：当前可用素材、版本和 D 资产生命周期约定。
- `README.md`：仅同步当前可用建筑与樱家已接入的两条说明，保留其他窗口内容。
- 本行动记录；`artifacts/editor/v2.3/`：修改前备份、截图、检查、导出布局与交付清单。
- 不修改 `dist/town/assets/`、原型、公共首页/环境、B 预览、归档和其他窗口文件。

## Self-verification method

- 修改前保护指纹核对；本轮 JS/MJS `node --check` 与限定文件差异检查。
- 隔离 Chrome/Playwright：`EDITOR_ARTIFACT_DIR=artifacts/editor/v2.3 node scripts/inspect-editor.mjs`，原 21 组回归及新增樱家流程。
- 与 B createModel 实时比对几何、材质、贴图、组成元数据及四向边界；重复实例资源隔离与 dispose 事件；检查截图中院落/植物/灯杆、缩略图及与便利店同场景呈现。
- 保留并核验 B 和非本轮文件指纹；不改用户浏览器存档，不将自动化当作人工审美或 D 运行验收。

## Self-verification results

已运行并检查：

- 先尝试旧工作目录，进程启动返回目录无效（Windows 267）；只读核对根目录和改名/归档记录后改用实际路径 `E:\动森\小丸子小镇`。未重建旧联接或改名。4173 现有首页 HTTP 200。
- 修改前 `scripts/fixtures/editor-protected-assets.json` 的 24 项指纹全部匹配；8 个拟改文件已备份至 `artifacts/editor/v2.3/before/`。
- `node --check`：catalog、scene、camera、ui-shell、ui、inspect-editor 通过。
- `$env:EDITOR_ARTIFACT_DIR='artifacts/editor/v2.3'; node scripts/inspect-editor.mjs`：最终 **23/23 通过，页面/控制台错误 0**。原有布局、道路、便利店、鼠标、草风、无效导入保护、运行层契约检查重新执行通过。
- 樱家流程：真实模型缩略图、点击与原生素材卡拖放、3 栋重复实例、四向旋转占地 14×14/缩放 1、占格与地图外拒绝、点击搬动与直接拖动、删除撤销、不规则轮廓移除 2 栋后一并撤销、刷新恢复、实际文件导出导入、未知素材导入不改当前地图/存档、双击聚焦均通过。界面正确显示 2 件建筑可用，另 3 栋待接入。
- 保真：3 栋场景实例与 B 实时 createModel 原件的几何属性/索引、局部变换、材质/贴图及组成元数据一致，签名 `0ffeee804f06e7a78ec51b696f5290cdf17f517d0edb22ffd4b6008dd6f41072`。58 个网格，230,832 个网格顶点；原院外电杆、植栽和院落保留。原作者模型文件未改。
- 草地：3 栋樱家各自占满一格且不长地图草，其余 33 格为 792,000 草叶，建筑自带植物保留。
- 生命周期：删除、同 ID 更换类型、放置预览更换、缩略图完成及场景释放，分别追踪到 120 个可见几何/材质/纹理全部恰好释放一次；邻居实例释放次数 0，撤销重建新 root 并保留实例 ID。
- 首轮 20 组通过，新增检查误用“植栽/庭院”猜测 B 的组名，实际名称是“高树、成片灌木和阔叶矮树”。保真数据已经一致，修正名称断言后完整重跑通过；首轮报告和截图保留为 `inspection-first-failure.json`、`first-failure.png`，不作为最终结果。
- 实际查看 `13-sakura-card-and-preview.png`、`14-sakura-in-town.png`：真实卡片、吸附预览、完整房屋/院子/电灯/树木以及与便利店同场景显示正常。`15-sakura-town-overview.png` 为整体布局；`sakura-layout.json` 是真实导出的布局。自动化和截图不替代用户审美确认。
- 当前保护检查 24 项通过；基线中仅本轮有意修改的 camera/scene/ui-shell/ui 四项更新指纹，其余 20 项包括全部 B 受保护文件保持修改前值。旧基线完整备份，不改历史 artifacts。
- 本轮变更文件与备份的 `git diff --no-index --check` 按 CRLF 规则检查通过。收尾核对 README 发现仍写“未接入”，已限定更新这两条现状说明。
- 布局版本和存储键不变；不修改用户实际浏览器的地图；无需新增依赖、未提交/推送/发布。未做 100 栋樱家性能压测、移动端、完整室内或 D 人物/统一天气验收。
