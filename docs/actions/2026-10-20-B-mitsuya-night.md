# B · みつや夜晚状态与独立预览

## Status and situation

2026-10-20 后续确认：用户在讨论窗口已明确认可 `anime-facade-night-10` 建筑夜景画面。正式地图夜景仍待接入与验收；下面保留制作交付时的历史状态。后续统一规则和接入缺口见[环境与建筑协作约定](../architecture/README.md)及[当前状态](../architecture/building-status.md)。

状态：Completed（建筑夜晚状态、独立预览及本店定向技术验证完成；正式地图编辑器夜晚未接入，用户画面认可待定）。用户于 2026-10-20 授权本窗口完成みつや自身夜晚材质、灯光描述、环境接口、独立预览和定向验证。

起始资产为 `mitsuya / anime-facade-landscape-09`，正式外观由 C v2.5 直接调用源码工厂；无建筑环境接口，预览“较暗灯光”只修改宿主光照。既有两盏局部暖灯由预览/编辑器创建。编辑器 `scene.js` 只转发天气，`lighting.js` 每店读取前两个 `previewLamps`，目标固定为灯下 Y=.4。

已完整读取 project-control-report、action-document，遵守用户提供的 AGENTS 规则；磁盘未找到额外 AGENTS.md。重新核对当前资产、樱家 environment.js、编辑器 scene.js / lighting.js。其他窗口正在修改樱家屋顶、预览、GLB、说明和检查脚本，与本任务目标无重叠。

保留建筑全部结构、尺寸、入口、配色、陈设、低灌木粉花与独立室内布局；不恢复旧高长花丛。不改地图编辑器、其他建筑、全镇环境、存档或历史验收结论。不启停服务、不跑全量回归、不提交、不推送、不发布、不联系其他窗口。

## Implementation measures

1. 保存本店修改前源码及范围外指纹；每次写入前重读目标，出现并行重叠则停止该文件写入。
2. 每个建筑工厂创建独立环境控制器，支持项目四个时段；分别合并 time / weather，严格校验并从初始材质恢复，避免累计漂移。天气只记录，不实现雪、雨或融雪。
3. 保留日间暖光与既有返回字段；新增本地坐标灯光描述，建筑不创建实际光源、不修改场景、不启动动画循环。使用现有两盏灯，完善入口向前的柔和溢光，主体不增加发光平面。
4. 独立预览调用建筑环境接口；宿主根据描述创建有阴影的灯光并逐帧变换位置/目标，保持内外切换、剖切、屋顶开关及原有观察操作。增加完整释放入口。
5. 输出本轮独立离线预览、同机位昼夜、门口和室内夜景，完成针对状态、实例隔离、变换、恢复、资源释放及造型保留的检查。
6. 更新本店说明与本记录，提供可转交 C 的说明，分别记录制作、技术、编辑器接入和用户画面认可状态。

## Affected file tree

实际范围：

- `dist/town/assets/mitsuya/index.js`：原工厂附加环境接口，保留模型几何及旧字段，更新资产 revision，包装释放。
- `dist/town/assets/mitsuya/environment.js`：新增每实例状态与材质/灯光描述。
- `dist/town/assets/mitsuya/preview-lighting.js`：新增独立预览宿主灯光适配，不在资产工厂内创建 Light。
- `dist/town/assets/mitsuya/preview.js`、`preview.html`：日夜控制、独立场景预览与释放；CSS 沿用原文件，未修改。
- `dist/town/assets/mitsuya/README.md`：当前接口、状态与后续接入说明；旧 GLB 是未变的静态几何，不含新的 JS 环境控制器。
- `artifacts/buildings/mitsuya/night-10/`：本任务独立备份、定向验证/打包脚本、报告、截图与离线预览，不覆盖旧版产物。
- 本行动记录：范围、过程和真实验证结果。

## Self-verification method

- `node --check`：仅本轮 JS/MJS。
- 修改前后指纹及模型数据比较：日间材质、几何、层级、入口、主要陈设、粉花与独立室内保持。
- 已安装 Chrome / Playwright 下定向浏览器检查：time/weather 分别更新、非法值原子拒绝、反复昼夜恢复、实例隔离、局部灯位与目标的世界变换、阴影、剖切/屋顶、实际旋转缩放及释放。
- 同机位昼夜、门口溢光、室内夜景、侧后墙截图实看，不把静态或数值检查当作画面认可。
- 先探测现有 HTTP 预览；无现成服务时使用本地离线包，不自动启停服务。
- 不运行编辑器、其他建筑或全镇天气完整回归。

## Self-verification results

### 制作与状态接口

- 资产 ID `mitsuya` 不变，版本为 `anime-facade-night-10`；09 全部几何与原日间材质保留。只新增每实例环境控制和宿主灯光描述，不在建筑 root 创建 Light、光束或地面光斑。
- `setEnvironment` 独立合并 time / weather，支持 time=`morning|afternoon|dusk|night`；前两个为原日间，dusk 为 45% 夜间过渡，night 为完整夜晚。weather=`clear|rain|snow|hail|wind|leaves` 只记录状态，`weatherEffectsImplemented:false` / `snowImplemented:false` 明确未制作任何天气视觉。
- 两盏现有吊灯白天均为强度 8、距离 4.3；夜晚分别为 13/5.5 与 11/4.95，暖色 `#ffd8a6`，柜台灯略朝门口照射。外观与独立室内入口灯描述一致，后灯保留各自原有纵深灯位。
- 夜晚普通材质移除原辅助自发光，由实际灯光形成明暗；玻璃与轮廓线略调，灯泡保持暖色。反向切换始终复制原始材质参数，无累计乘色。
- 保留 `lamps`、`previewLamps` 原日间数组及所有旧查看/释放字段；新增 `environmentSupport`、`setEnvironment`、`getEnvironment`、`getLightingDescriptors`。无动画，因此无需新增 `updateEnvironment` 或独立循环。

### 实际检查

- 已探测原 4173、4184 服务可访问，本轮复用 4184，未启停服务。使用独立无界面 Chrome 上下文，不访问用户现有浏览器存档。
- `node --check`：本轮四个运行 JS 及本任务 MJS 工具语法通过；`git diff --check -- dist/town/assets/mitsuya docs/actions/2026-10-20-B-mitsuya-night.md` 通过。
- `node artifacts/buildings/mitsuya/night-10/capture-baseline.mjs`：修改前保存 09 全量工厂数据。`review-night.mjs` 将新工厂与该基线比较，外观 366、室内 315 个节点的全量几何属性/索引、层级、局部变换、可见性、材质、图案、入口与陈设数量完全一致。植物和 GLB 原文件未改。
- `node artifacts/buildings/mitsuya/night-10/review-night.mjs`：六组定向检查通过，页面/控制台错误及警告均 0。40 次日夜往返、全部支持的 time/weather 独立更新、非法状态整组拒绝、多实例隔离、内外第一盏灯描述一致、返回描述防外部修改均通过。
- 灯位与目标随建筑 0/90/180/270 度旋转、平移，以及父级旋转/平移/正统一缩放，数值最大误差为 0；隐藏父级后实际灯隐藏。仅当前可见空间的两灯渲染，真实阴影图已生成。
- 本店 519 个可见几何/材质/贴图资源各 dispose 一次，邻居释放数 0；重复释放安全，释放后不再返回灯描述。预览灯阴影各释放一次，预览销毁后帧计数停止、场景清空。
- 实际鼠标/按钮验证日夜、进出、机位、屋顶、剖切、旋转、缩放、平移、便利店对比、恢复全景、参考图片。保留“隐藏灯具实体但灯光仍用于剖面观察”的既有约定。
- `node artifacts/buildings/mitsuya/night-10/package-preview.mjs`：生成 23,606,569 字节独立 HTML，18 个模块；禁止 HTTP(S) 后从 file URL 打开，网络请求 0、错误 0。昼夜、独立室内、旋转缩放、参考、便利店对比/恢复、两个原静态 GLB 实际下载和文件头/长度验证通过。
- 修改前指纹 160 项中，156 项原样保留，变化仅本店 README/index/preview.js/preview.html 四个既有文件；包含其他窗口当时已改的樱家文件也未再发生变化。本任务新增两份 JS 和独立行动记录；所有离线模块与当前磁盘源码对应。具体清单见 `boundary.json`。

### 实看证据与限制

本轮截图位于 `artifacts/buildings/mitsuya/night-10/`：

| 文件 | 实际内容 |
| --- | --- |
| `01-day.png` / `02-night.png` | 完全相同相机的日间/夜晚整体，日间原造型保留，夜晚屋顶、招牌及主要颜色可辨 |
| `04-entry-day.png` / `03-entry-night.png` | 相同门口机位；暖光照在真实柜台、罐子、门槛和门前局部石板，阴影体现纵深 |
| `05-interior-night.png` / `06-interior-entry-night.png` | 独立室内夜景与朝门口看，原桌凳/货柜布局保留，入口暖光协调 |
| `07-jars-night.png` | 糖果罐近景 |
| `08-back-night.png` / `09-left-night.png` / `10-left-day.png` | 侧后及左侧；低灌木粉花保留，已查看侧后画面没有明显穿墙亮斑 |
| `11-offline-night.png` / `12-gallery.png` | 离线预览和审看图册 |

已实际打开整体昼夜、门口夜景、独立室内、室内朝外、背侧与图册截图。没有把数值通过当作用户审美认可；未承诺所有机位绝无光漏、移动设备效果、大量建筑性能或不同宿主曝光完全一致。

本轮未运行原本店整套导出检查、GLB 重导出/重渲染、编辑器全量回归、全镇天气回归或移动设备验收；原 GLB 是 09 静态文件，不能承载新的 JS 日夜状态。未接入正式全镇时间、夜间灯池、正式室内进出、人物/购物或雪景。

### 检查过程中的修正

- 首次隔离 Chrome 启动被沙箱以 `spawn EPERM` 拒绝，执行环境审批后通过；没有启动或停止预览服务，不是模型故障。
- 首次基线对比因 JSON 文件省略 undefined、浏览器返回对象保留 undefined，导致检查误报；统一双方序列化后通过，未改变旧基线或模型来消除差异。
- 修改前截图路径最初错误地使用 URL 的编码 pathname，写到百分号编码的目录；已将本任务单张截图移回正确的 night-10，只移除已核对为空的误建目录，脚本改用 `fileURLToPath` 并加 09 版本保护。本店素材和其他工作文件未受影响。

### 可转交地图编辑器窗口

> B 已交付 `mitsuya / anime-facade-night-10`，原结构、粉花、独立室内与日间材质保留。请通过 `setEnvironment({time,weather})` 部分更新状态，并在 C 的既有限额灯池读取 `getLightingDescriptors()`；每条描述的 position 和 target 都是建筑局部坐标，需要按 root.matrixWorld 变换。旧 previewLamps 只保留日间兼容，不应与新描述重复布灯，也不要同时启用独立预览的 preview-lighting 适配器。全局夜色由 C 负责；建筑 dispose 不释放 C 的灯池。snow 仅记录状态，积雪和融雪未实现。夜晚独立制作及定向检查已完成，正式编辑器夜晚接入与用户画面认可仍待完成。

独立预览：`artifacts/buildings/mitsuya/night-10/みつや-夜晚10-独立预览.html`；日间/夜晚从左侧“时段”切换。当前可用 HTTP 入口：`http://127.0.0.1:4184/town/assets/mitsuya/preview.html`。没有提交、推送、发布或向其他窗口发送消息。
