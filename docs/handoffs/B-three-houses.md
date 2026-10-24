# 三栋参考住宅外观交付

2026-10-23。建筑美术按用户所附图片顺序完成小玉家、爷爷奶奶家、小衫家三栋外观。制作与本轮定向技术检查完成，画面待用户认可；没有接入正式地图。

2026-10-24 更新：仅小玉家改为 `exterior-02-gable`，纠正矩形主体、垂直的正面与左山墙、统一屋脊双坡屋面，更新粉墙、草地与植物；院门按追加要求左移、四周院墙统一高度。小玉家本轮 12 项基础检查、13 项结构/对照检查及离线鼠标操作通过；另两栋及共用文件哈希未变，没有重跑或重做另两栋。最新对照入口：`artifacts/buildings/three-houses/tama-house/structure-02/小玉家-修改对照.html`；详见[本轮行动记录](../actions/2026-10-24-B-tama-structure.md)。

| 建筑 | 稳定 ID / revision | 独立预览地块 | 当前入口 |
| --- | --- | --- | --- |
| 小玉家 | `tama-house / exterior-02-gable` | 16×14，待确认 | `artifacts/buildings/three-houses/tama-house/小玉家-三维预览.html` |
| 爷爷奶奶家 | `grandparents-house / exterior-01-reference` | 18×13，待确认 | `artifacts/buildings/three-houses/grandparents-house/爷爷奶奶家-三维预览.html` |
| 小衫家 | `kosugi-house / exterior-01-reference` | 14×12，待确认 | `artifacts/buildings/three-houses/kosugi-house/小衫家-三维预览.html` |

总入口为 `artifacts/buildings/three-houses/三栋住宅-交付图册.html`。三个单文件 HTML 均含模型、参考、运行模块与 GLB 下载，断网可拖动旋转、缩放、平移；不需要启动服务。每栋正式可编辑源码、参考和 GLB 位于 `dist/town/assets/<id>/`，对应 README 记载补全与接口。

三栋复用新 `shared/residential-kit.js`，后者复用已有且未修改的 `flowerorangebuilding/geometry.js`；共用预览为 `shared/residential-preview.js / .css`。没有改写任何现有建筑、editor/catalog.js、全镇灯光、天气、积雪或存档代码；旧目录内的未提交工作保留。

正式地图接入不是本轮交付：三栋没有登记在 catalog；尺寸由单张正面图补全，尚未确认占格，不可直接套用一格 14×14 或宣称多格已经可用。模型方法接收合法环境状态，但没有专属日夜响应、雨湿、承雪注册、积融雪或真实灯光；灯光描述为空，独立预览灯不进入资产。

未制作独立室内、人物、碰撞、寻路或进出门。侧后方、纵深、米制尺寸、屋面不可见的回接方式为合理补全，不能称原作严格复原。小衫家名称沿用用户原文，不自行改名。

2026-10-23 首版检查由 `scripts/inspect-three-houses.mjs --package` 完成，12 项/栋、合计 36 项通过，页面错误 0；GLB 回读的三角面与尺寸一致。`scripts/package-three-houses-gallery.mjs` 当时检查三份离线实际鼠标操作、参考加载、33 张图册图片，网络请求 0。这些为首版历史结果，小玉家当前结果以上方 2026-10-24 记录为准。没有运行全项目回归、正式地图组合、大量实例或长期性能验证。

制作过程、发现与修正、实际证据见 [行动记录](../actions/2026-10-23-B-three-houses.md)。新增源码/模型尚未提交，但未被忽略；未推送、发布或启停服务。
