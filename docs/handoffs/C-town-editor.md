# C → 用户 / 后续运行层：地图编辑器、道路与统一晴雨

更新日期：2026-10-17。交付标识：`C-town-editor-v2.4`；布局格式版本仍为 `1`。用户将统一天气交给 C，暂不开 D。本轮是本地文件交付，没有提交、推送或线上发布。

## v2.4 当前天气与接入

- 首页“布置街区 → 环境 → 天气”支持实际晴天/下雨。B 当前资产为 `exterior-03-states`；以下 v2.3 历史说明与报告不作为新版验证依据。
- `createTownWeather({scene,state,sceneView,tileSize})` 在现有场景增加一套雨丝/水花，无独立时钟或 RAF。首页已连接 `runtime.connect({setWeather: value => weather.setWeather(value)})`。
- `townEditor.setWeather('clear'|'rain')` 返回 Promise 确认结果；其他天气拒绝。时间和人物能力仍未接入。天气不写入布局、不产生撤销项，刷新默认晴天。
- 每帧先 `sceneView.update(elapsedSeconds)`，再 `weather.update(elapsedSeconds)`，传同一累计秒数。场景负责对每个 B 实例调用 `updateEnvironment(elapsedSeconds)`，天气只在变化时通过 `sceneView.setEnvironment({weather})` 转发 B 的 `setEnvironment({weather})`，保留 B 当前 time。便利店原 `update(dt,visitor)` 签名不变。
- 新放置、撤销恢复和导入实例立即继承天气与累计秒数。天气订阅在场景订阅之后注册，因此落点计算使用提交后的模型矩阵；旋转、搬动、删除、撤销、轮廓和导入同步更新。
- `rain-surfaces.js` 从实际不透明实体三角形建立局部 XZ 索引；把世界位置变换到实例局部空间，求竖直雨的最高接触面并返回世界点/法线。支持当前四向旋转及便利店 14/14.25 缩放。光束、光斑、透明粒子和樱家环境子树不遮雨，放置预览不参与。
- B 的 `roofs` 虽为空，本轮可直接用实际屋面工作，不要求 B 额外补交。B 的 44 处檐口滴水仍仅一套；全镇雨只负责从天空首次接触实体的水花。没有覆盖 B 文件，也没有重做光束或地面光斑。
- 诊断：`townEditor.weather.sampleSurface(worldX,worldZ)`、`getInspection()`、`getRainSamples()`；地图外返回 null。`dispose()` 取消布局订阅、释放本模块资源。`sceneView.dispose()` 继续管理 B 实例资源。
- 当前限制：竖直雨，不模拟带风雨、流水或积水；按当前资产 ID/版本缓存静态几何。后续若加入会活动的屋顶、透明实体雨棚、实例自定义几何或跨地块建筑，需要扩展表面接口/缓存策略，不能直接当作已支持。长草自身不作为屋顶，雨到草地下地面后被草叶自然遮挡。
- 后续运行层若调用 `connectRuntime` 会替换整个适配器，须保留 `setWeather: value => townEditor.weather.setWeather(value)`，不要再创建第二套雨或重复调用 B 环境更新。时间扩展另行授权。
- 实施及检查证据：`docs/actions/2026-10-17-C-town-weather.md`，`artifacts/editor/v2.4/`。美术效果由用户确认，自动检查不替代认可。

> 2026-10-16 目录整理补充：用户随后授权“一栋建筑一个文件夹”。现有模型已移至 `dist/town/assets/<建筑编号>/`，编辑器 `catalog.js` 改从 `../assets/index.js` 调用同一个创建接口；旧 `walk/buildings.js` 和 `store.js` 保留兼容转发。素材编号、布局 v1、存档键及 C 的交互逻辑保持原样。下文已更新为 v2，v1 源码指纹和检查仍保留为历史证据；本次迁移与独立回归记录见 `docs/actions/2026-10-16-building-folders.md`。

> 2026-10-17 正式首页整理：编辑器现为 `/`，原 `/editor-preview/` 跳转到同源首页。交互沿用 v2.2，布局格式和存档键不变；旧观赏/散步页面已归档，樱家新作品完整保留且未自动接入。当前源文件保护基线为 `scripts/fixtures/editor-protected-assets.json`，历史交付报告保持原样；实际变更和新验证见 `docs/actions/2026-10-17-editor-home-and-legacy-archive.md`。

> 2026-10-17 v2.3：用户随后明确要求接入小丸子的家。现使用 B 的 `sakura-house / exterior-02-lamp` 原模型加入建筑列表；目录以实际存在的 `E:\动森\小丸子小镇` 为准，旧路径目前不可用。接入和验证见 `docs/actions/2026-10-17-C-sakura-editor.md`。

## 当前可用范围

- 正式首页：<http://127.0.0.1:4173/>。在 `E:\动森\小丸子小镇` 执行 `node scripts/serve.mjs` 可启动；若已有 4173 服务，无需重复启动。
- 首次进入为斜俯视空白 6×6 三维草地，置于固定 10×10 范围中央。默认全屏场景，仅一个“布置街区”入口；短暂的鼠标提示自动消失。打开后使用单个浮动面板切换素材/轮廓/环境/存档，退出隐藏格线及工具。
- 观赏：左键拖动环绕，右键或中键拖动平移。布置：左键选择/放置/直接拖建筑，右键环绕，中键平移。两种模式共用滚轮缩放、双击模型聚焦、Home 回全景。
- 鼠标不按键掠过可见草地，沿滑动方向产生局部风；操作镜头（含惯性/聚焦飞行）、放置/搬动素材、预览轮廓及切换运行模式时暂停新风，已有风自然衰减。离开画布或改变视角后重新建立划动起点。
- 草叶高度 .45–1.035（比 v2.1 高 50%），每完整草格 24,000 叶（密 33.3%），真实三维实例化几何；便利店、樱家整格与路面不长地图草，樱家自带植栽保留。编辑格线及辅助面在草冠上方，观赏隐藏。
- 每行起点和长度可单独调整，长度 0 表示停用；启用范围外无地图地面。预览背景接影平面不是可行走地图。
- 进入布置后点击卡片，再点击草地放置；支持卡片原生拖入、悬停吸附和方向预览。切换“选择”后可选已有实例，旋转、搬动、删除；也支持直接拖动已有实例。占格和地图外均拒绝，不覆盖。
- `R` 旋转、`M` 搬动、`Delete` 删除、`Ctrl/Cmd+Z` 撤销、`Esc` 取消当前操作，无操作时收起工具。文本/数字输入框中不接管这些快捷键。
- 地图轮廓先预览新增/移除格子和受影响实例，确认后一次提交；整次变化一步撤销。预览期间原布局不改变，过期预览拒绝执行。
- 自动保存、实际 JSON 文件导出/导入。损坏旧存档保留，支持下载原文备份及明确确认后替换；自动保存失败会提示导出。撤销历史仅在本次页面会话中保留，最多 100 步。
- 上帝视角和晴雨已可用。时间、散步准确显示待接入，未扩展人物或其他天气。

## 素材交付核对

| 素材 | 本轮状态 | 实际来源 |
| --- | --- | --- |
| AME MART 便利店 | 可选、重复放置；店体/内饰/售卖机/自行车/回收桶/伞架/电杆/底座完整，真实模型缩略图 | 原 `dist/town/assets/convenience/` 店体 + `dist/street.js` 完整街角，由 C 组合适配 |
| 直路、转角、丁字路、十字路 | C 本轮交付 | `dist/town/editor/roads.js` |
| 小丸子的家（樱家） | 可选、重复放置、占一格，房屋/院落/植栽/院外电灯完整，真实模型缩略图 | `dist/town/assets/sakura-house/index.js`，B `exterior-03-states` 原 `createModel()`；无完整室内 |
| みまつや杂货店、学校、公园 | 未接入；仅“待接入”文字 | 没有可用成品交付 |

不将便利店改称みまつや，不将旧 `home/garden/cafe/bookshop` 模型作为本批建筑。不制作建筑替代模型；接入仅使用已核对的实际 B 交付。

现有便利店工厂没有显式接口版本号，沿用当前实文件契约：`TILE_SIZE=14`、`createBuilding(type, variant=0)` 返回 `root/type/colliders/occluders/roofs/lamps/floors/update/doorOpen`。C 保留原对象、每实例门动画闭包及 `doorOpen` getter。`convenience-scene.js` 在 C 目录组合原街角，替换该实例的公开 root 为组合组，并把店体元数据平移回原型坐标；原资产文件不改。原型外沿 14.25×14.25，整组统一缩放 14/14.25 到单格，保留全部几何和相对位置。自带的 L 形街道路面是原型的一部分，另外四种地图道路仍独立放置、无自动变形。

注意：已有 v1 存档的 `convenience` 编号和占格不变，刷新会显示完整街角。源文件指纹见 `artifacts/editor/v2/boundary-baseline.json`。

首页整理后，`catalog.js` / `convenience-scene.js` 仅引用便利店模型与 `assets/shared/instances.js` 的既有实例实现；`assets/index.js` 保留所有旧建筑的通用入口，但不在首页加载链中。

`catalog.js` 直接导入 B 的 `sakura-house/index.js`。当前 B `specification`：id 为 `sakura-house`、revision 为 `exterior-03-states`、tileSize 14、front `+Z`、placementRotations 为四个直角、interior 为 false。保留 `createModel()` 返回的原对象和原始 root（缩放 1），包括 colliders/occluders/floors/specification/dispose 和环境接口；C 仅追加 focus/thumbnail 取景信息。模型使用自身动画色阶（unlit / toneMapped=false），晴雨颜色变化由 B 的 setEnvironment 负责。B roofs/lamps 仍为空，局部檐水和完整灯束是 B 已有实现，全镇雨使用实际实体几何遮挡。

资源所有权：B 每次创建独立几何/材质/纹理，`dispose()` 必须由持有者调用；场景在删除、替换或整体释放时调用，缩略图渲染后立即调用。放置预览更换类型/销毁时，先释放 C 克隆的透明材质，再调用该模型 dispose；取消预览可暂存最多一个隐藏预览供继续使用。便利店/道路仍用共享缓存且没有实例 dispose，不能统一遍历释放它们的共享几何。撤销删除会重建 B 模型，但保留布局实例 ID。

`catalog.js` 是 C 的选择清单和现有工厂调用点，不是另造的 B 建筑标准。B 正式交付后，先读取其最终交接文件和版本，再在这个调用点按实际创建、生命周期、变换与环境契约接入。不得仅发现新文件就把素材改为“已完成”。

## 文件清单与职责

| 文件 | 责任 |
| --- | --- |
| `dist/town/editor/state.js` | 纯布局状态、校验、原子操作、影响预览、撤销、订阅 |
| `dist/town/editor/persistence.js` | localStorage 读取/保存/损坏保护，与渲染无关 |
| `dist/town/editor/catalog.js`、`convenience-scene.js` | 素材清单与完整原街角组合适配，保留原工厂契约 |
| `dist/town/editor/grass.js` | 草叶实例、占地遮罩、环境微风和局部划动风 |
| `dist/town/editor/camera.js` | 可选的预览镜头控制、聚焦及全景拟合 |
| `dist/town/editor/lighting.js` | 仅独立预览的柔和日光/阴影与近处店内、街灯 |
| `dist/town/editor/roads.js` | 固定形状道路模型，独立占一格，无自动邻接变形 |
| `dist/town/editor/scene.js` | 地面、格线、实例、预览；不创建相机、环境、渲染器或主循环 |
| `dist/town/editor/runtime.js` | 能力请求/确认/失败/连接状态桥接，首页已连接 C 晴雨 |
| `dist/town/editor/weather.js`、`rain-surfaces.js` | 统一雨丝/水花、实际实体首个接触面，不修改布局或 B 模型 |
| `dist/town/editor/ui.js`、`ui-shell.js`、`editor.css` | 界面、鼠标/键盘/文件交互 |
| `dist/index.html`、`dist/main.js` | 独立演示入口，组合渲染器、透视镜头、预览光照与轻微辉光；标题由改名窗口维护 |
| `scripts/inspect-editor.mjs` | 状态、持久化、真实 Chrome 操作及边界检查 |
| `docs/actions/2026-10-16-C-town-editor-visual.md` | v2 实施、反馈与实际验证；原 C action 保留 v1 历史 |
| `docs/actions/2026-10-17-C-mouse-hover-wind.md` | v2.2 分模式鼠标、悬停风与长草甸的实施和验证 |
| `docs/actions/2026-10-17-C-sakura-editor.md` | v2.3 樱家清单、真实模型和独立资源生命周期接入 |
| `docs/handoffs/C-town-editor.md` | 本交接说明 |
| `artifacts/editor/` | 截图、结构化检查报告、实际导出布局、保护边界指纹与交付清单 |

C v2.4 新增统一晴雨，未修改原型源码、散步运行逻辑、人物或公共服务。2026-10-17 项目名称更新为“小丸子小镇”，实体目录为 `E:\动森\小丸子小镇`，包名仍为 maruko-town；本轮核对旧目录/联接已不可用，请使用当前实体路径。名称不改变布局格式和存档键。C 的历史边界检查将早先五个改名差异与 C 修改分开；实体改名和下载文件名更新的历史验证见 `docs/actions/2026-10-17-project-rename-and-code-audit.md`，历史交付指纹不重写。

## 布局格式 v1

完整的实际文件见 `artifacts/editor/v2/exported-layout.json`。以下是可校验的最小示例，数组必须包含十行：

```json
{
  "format": "rainy-corner-layout",
  "version": 1,
  "rows": [
    { "start": 0, "length": 0 },
    { "start": 0, "length": 0 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 0, "length": 0 },
    { "start": 0, "length": 0 }
  ],
  "instances": [
    { "id": "i-example-store", "assetId": "convenience", "x": 3, "z": 3, "rotation": 90 },
    { "id": "i-example-road", "assetId": "road-straight", "x": 3, "z": 4, "rotation": 0 }
  ]
}
```

- `rows[z]` 的 `start` 为 0–9，`length` 为 0–10，二者都是整数，和不超过 10。UI 为易读把起点显示为 1–10，内部仍为 0–9。
- `x/z` 是 0–9 整数且必须处于启用范围；`rotation` 只能是 0/90/180/270 度，按 Three.js 正 Y 轴转动。实例 `id` 全局唯一，搬动/旋转不变；`assetId` 可重复。
- 可选 ID：`convenience`、`sakura-house`、`road-straight`、`road-corner`、`road-tee`、`road-cross`。旧 v1 布局继续读取；包含樱家的新布局需用本版本或认识该资产的后续版本加载，旧编辑器会按未知素材拒绝。
- 不保存时间/天气/人物/选择态/撤销历史。这些不属于静态布局。存档不含可执行代码或模型文件地址。
- 文件导入上限 1 MiB；拒绝未知格式或版本、错误行定义、非整数/越界坐标、地图外实例、重复 ID、重复占格、非法旋转、未知/未交付素材。完整校验成功后才替换，失败不改变当前状态或 localStorage。
- 一个浏览器 origin 一张地图：`rainy-corner.editor.layout.v1`。不同端口/域名不共享该存档；跨来源用文件导入导出。

## 公开接口（供后续运行层复用）

预览页面的 `window.townEditor` 公开：

| 接口 | 行为 |
| --- | --- |
| `getLayout()` | 返回布局深拷贝 |
| `loadLayout(layout)` | 完整校验，原子加载，可撤销；错误抛异常 |
| `onLayoutChange(listener)` | 返回取消订阅函数；事件 `{reason, revision, layout, canUndo}` |
| `root` / `sceneView` | 当前实际 Three.js 场景子树及实例查询接口 |
| `connectRuntime(adapter)` | 替换完整运行适配器并返回断开函数；请求进行中拒绝更换；需保留现有 C 晴雨方法 |
| `requestMode('god'|'walk')` | 请求模式；Promise 结果见下 |
| `setTime('morning'|'afternoon'|'dusk'|'night')` | 请求时间 |
| `setWeather('clear'|'rain')` | 请求实际 C 晴雨，其他值拒绝 |
| `setEditing(boolean)` | 打开/收起工具；只有 god 模式允许布局编辑。walk 下打开环境页，可切回 god |
| `focusInstance(id)` | 平滑聚焦某个实例，失败返回 false |
| `showOverview({top?, immediate?})` | 当前地图完整入镜；top 为俯视编辑布局 |
| `state` / `runtime` | 模块对象；不依赖 DOM |
| `dispose()` | 结束该预览的监听、帧循环与渲染资源 |

状态模块 `createEditorState({assetIds, initial?, idFactory?, onSubscriberError?})` 返回：

- 读取：`getLayout()`、`at(x,z)`、`canPlace(assetId,x,z,ignoreId?)`、`revision`、`canUndo`。
- 修改：`place(assetId,x,z,rotation=0)`、`move(id,x,z,rotation?)`、`rotate(id)`、`remove(id)`、`undo()`。
- 形状：`previewShape(rows)` 返回冻结的、绑定 revision 的计划；`applyShape(plan,{confirmAffected:true})` 执行。受影响实例存在时必须显式确认；不能伪造计划或复用过期计划。
- 文件：`importJSON(text)`、`exportJSON()`、`loadLayout(layout)`。
- 事件：`subscribe(listener)`。reason 为 `place/move/rotate/delete/shape/load/import/undo`。事件给出修改后的完整快照；一个形状变化只有一个事件。监听器抛错被隔离，其他监听器及已提交操作继续；集成方仍应处理自身错误。

运行适配器契约：

```js
const disconnect = townEditor.connectRuntime({
  async setMode(value) {
    // D 实际切换相机和人物；只有实际完成后返回成功。
    await yourRuntime.setMode(value);
    return { ok: true, value };
  },
  async setTime(value) {
    await yourRuntime.setPeriod(value);
    return { ok: true, value };
  },
  setWeather: value => townEditor.weather.setWeather(value)
});
```

上面的 `yourRuntime` 是 D 的实现位置说明，不是已存在的对象。可同步返回或返回 Promise；失败返回 `{ok:false,message}` 或抛错。只有 `{ok:true,value:请求原值}` 才更新已确认控制值。缺少方法显示未接入，同一类请求进行中拒绝重复请求；断开后忽略旧响应。`runtime.subscribe()` 可观察 `connection/request/confirmed/failed/unavailable/settled`。

`walk` 确认后隐藏编辑网格/辅助预览，禁用界面编辑；返回 `god` 后按工具是否展开恢复。实际人物、散步摄像机与碰撞留待后续，当前晴雨由 C 处理。状态 API 本身保留程序加载能力，不把 UI 锁定误当权限系统。

## 后续运行层复用同一场景的方式

不要在现有散步运行层里加载 `main.js`，它有自己的预览相机和帧循环。导入模块并把 `root` 加到 D 已有场景：

```js
import { createEditorState } from '../town/editor/state.js';
import { createEditorScene } from '../town/editor/scene.js';
import { assetIds, createAsset, TILE_SIZE } from '../town/editor/catalog.js';
import { createRuntimeBridge } from '../town/editor/runtime.js';
import { createTownWeather } from '../town/editor/weather.js';

const state = createEditorState({ assetIds, initial: savedLayout });
const editorScene = createEditorScene({ state, createAsset, tileSize: TILE_SIZE });
scene.add(editorScene.root); // scene 为 D 自有场景，仅一套 renderer / 环境 / 帧循环
const runtimeBridge = createRuntimeBridge();
const weather = createTownWeather({scene, state, sceneView: editorScene, tileSize: TILE_SIZE});
runtimeBridge.connect({setWeather: value => weather.setWeather(value)});
// 可选：mountEditorUI({host, canvas, camera, state, sceneView: editorScene, ...})
// UI 用 D 的 canvas 和上帝视角 camera，onOverview(options)/onFocus(instanceId) 交给 D。
// onEditingChange(enabled) 通知 D 切换上帝视角的鼠标分工；首次挂载也调用。
// isCameraBusy() 应返回镜头拖动、滚轮缩放、惯性、自动飞行期间是否忙碌，用于暂停新风。
// 唯一帧循环每帧调用 editorScene.update(elapsedSeconds) 和 weather.update(elapsedSeconds)。
// B 的 updateEnvironment 已由 editorScene 调用，不重复更新、不传 dt。
const stop = state.subscribe(event => {
  // D 按 event.layout 同步碰撞/路径/角色合法位置；不要复制创建第二套建筑。
});
```

场景坐标与数据：

- 正面 +Z，Y 向上；单格 14×14；`worldX=(x-4.5)*14`，`worldZ=(z-4.5)*14`。`cellToWorld/worldToCell` 已导出。默认 root 放在世界原点且无额外旋转缩放。
- `sceneView.getInstances()` 返回 `{placement, asset}` 列表。`asset` 保留实际工厂原对象；便利店公开 `root` 为完整组合组，其元数据已平移到这个组的坐标系；樱家为 B 原 root 及原局部元数据。樱家 colliders/floors 是 B 的集成参考，不代表角色碰撞通过。所有资产仍需 D 的实际角色验收。
- D 对每个 `asset` 的局部元数据应用其 `root.matrixWorld`；必须包含完整 root 缩放（便利店为 14/14.25），不能只处理旋转/平移。旋转后矩形轴互换；灯点、门口和屋顶也要变换。不要直接把局部坐标当世界坐标。
- `asset.update(dt, playerWorldPosition)` 保留原门动画闭包，能在组合组旋转/缩放后按世界位置响应，实例互不影响。`sceneView.update(elapsedSeconds)` 同时推进草叶、原信号灯和 B 的环境动画；传全镇累计秒数，不传单帧间隔或毫秒。
- 便利店 `asset.previewLamps` 是 C 预览使用的原始店内四灯及街灯数据 `[color,intensity,distance,x,y,z]`，局部位置须变换到世界，距离随 root.scale 缩放。可由 D 的统一灯光系统接管；不要同时添加 preview lighting 和另一套环境灯。
- `sceneView.grass.stroke(fromWorld,toWorld)` 输入 THREE.Vector3，沿该世界方向产生局部风；`sampleWind(x,z)` 和 `getInspection()` 供诊断。草地不占实例，道路没有阻挡碰撞。UI 只在无按键鼠标悬停且没有镜头/编辑操作时调用；直接调用此低层接口的集成方自行控制触发时机。
- `mountEditorUI` 新增可选 `onEditingChange(enabled)` 和 `isCameraBusy()`。前者在实际可编辑状态变化（含运行层切换）时通知，后者由 D 提供镜头拖动、惯性、缩放、飞行忙状态。省略后者时只有 UI 自身按键/工具与相机矩阵变化保护，不能保证 D 外部镜头动作全程暂停草风。复用 C 镜头时连接 `cameraRig.setEditing(enabled)` / `cameraRig.isBusy()`；D 不要同时安装两套镜头控制。
- `containsCell(x,z)` 只表示启用的土地范围。`getGroundHeight(worldX,worldZ)` 在启用地返回 0，在地图外返回 null；完整街角铺装、室内/台阶高度由 `asset.floors` 补充（按数组后面的更具体地面优先），不能单凭此方法穿过建筑。
- 修改轮廓或导入后，D 需要保证角色位置仍在合法地面上；具体回落位置策略由 D/统筹确定。D 复用 `sceneView` 时由 C 管理资产释放，D 不要再 dispose 同一对象；D 自行调用 `createAsset` 创建的独立樱家由 D 负责 dispose。
- `sceneView.setEditing(boolean)` 仅控制网格/编辑辅助；`UI.setEditing(boolean)` 同时控制面板与编辑鼠标分工，不改变地面和模型；`dispose()` 清理本模块监听和自有资源。当前便利店/道路是共享工厂缓存，实例移除不释放共享几何/纹理。
- 缩略图 `renderThumbnails(assets,createAsset,TILE_SIZE)` 由相同工厂渲染，一个临时 renderer 批量生成后释放。不引入占位图片。

## 验证与限制

运行：`node scripts/inspect-editor.mjs`（先运行本地服务；可将预览 URL 作为第一个参数）。检查使用已安装 Chrome，`CHROME_PATH` 可覆盖路径；在隔离浏览器上下文操作，不改用户浏览器中的地图。

当前 v2.4 检查结果见 `artifacts/editor/v2.4/editor/inspection.json` 与 `artifacts/editor/v2.4/weather/inspection.json`，实际结果汇总见本轮天气行动文档。以下 v2.3 数字仅为历史记录：23 组通过、页面及控制台错误 0，记录在 `docs/actions/2026-10-17-C-sakura-editor.md`，不替代 B 新版本与晴雨重新验证。

v2.4 最终实际复验：编辑器 **23/23**、天气 **10/10**，两者页面/控制台错误均 **0**。B 当前 77 个网格、239,671 个网格顶点的原工厂与放置实例指纹相同；157 个独立资源在删除/替换/预览/缩略图/场景释放各恰好释放一次。当前源码清单及 SHA256 在 `artifacts/editor/v2.4/delivery.json`。天气截图与短录像位于 `artifacts/editor/v2.4/weather/`；美术效果待用户确认。

樱家实时保真：与 B createModel 原件比对全部几何属性、索引、子节点变换、材质/贴图及部件元数据，三栋放置实例均一致，58 个网格、230,832 个网格顶点，缩放 1，四向占地 14×14。删除、替换、预览更换、缩略图结束、场景销毁各检查 120 个可见资源均收到一次 dispose，未删除的邻居收到 0 次。实际编辑截图 `artifacts/editor/v2.3/13-sakura-card-and-preview.png`，场景近看 `14-sakura-in-town.png`、全景 `15-sakura-town-overview.png`；导出布局为 `sakura-layout.json`。

v2.2 草风记录见 `docs/actions/2026-10-17-C-mouse-hover-wind.md`；前轮加草记录 `2026-10-17-C-grass-density.md` 保留历史。对应截图在 `artifacts/editor/v2.2/09-grass-before.png`、`10-grass-sweep.png`、`11-grass-rested.png`、`12-edit-tools.png`、`13-long-meadow-hover.png`。真实无按键鼠标录像为 `artifacts/editor/v2.2/hover-wind.webm`，对应 `wind-recording.json`：30 次风脉冲、沿 +X 方向、衰减归零、错误 0。以下原 v2 的完整街角截图与录像继续保留为历史证据：

- `13-complete-corner.png`：恢复全部陈设的原方形便利店与加高草叶。
- `07-store-closeup.png`、`08-window-detail.png`：原生聚焦与滚轮近看。
- `09-grass-before.png`、`10-grass-sweep.png`、`11-grass-rested.png`：划动前、同向风和衰减后的实际画面。
- `grass-wind.webm`：浏览器 canvas 的真实动画录制；`wind-recording.json` 对应交互读数。
- `01-empty-scene.png`、`03-shape-impact.png`、`04-irregular-town.png`、`12-edit-tools.png`：空场景、影响范围、不规则地图和按需浮层。

这些自动化浏览器操作与截图不等于用户最终审美认可。未做移动端、100 个完整便利店的性能压测、多标签页并发合并或真实角色/碰撞接入。100 格测试使用道路；默认空地图 864,000 草叶，放一格便利店为 840,000，最多 2,400,000 草叶，GPU 负担高于 v2.1。预览使用 2048 阴影与后期，最多点亮距离镜头目标最近两家便利店的十盏点光；远处模型和发光材质保留。默认近看完整街角，滚轮可继续拉近店内细节。

完整原型的内部道路样式/宽度与 C 独立道路不同，暂不修改原型或自动重排道路以强行接缝。所有行可为空，重新启用即可恢复草地。B 樱家已接入 C，保留原作者的院落、植物和院外电灯；另三栋没有成品交付，仍显示“待接入”。当前只接入 C 晴雨，不宣称人物或统一时段已实现。

本地服务没有 CSS MIME 配置，预览入口以 fetch 文本注入自身样式；不修改公共服务脚本。共享运行层集成 UI 时，需要自行加载 `editor.css`。打开页面需要 HTTP 服务，不是 file:// 单文件离线版。

后续接入由用户另行安排：复用上述状态、场景子树及 C 晴雨，扩展人物/模式/时间时保留同一累计时钟。B 新成品接口到达后由用户转交，按实际版本接入，不能自动替换本轮素材清单。
