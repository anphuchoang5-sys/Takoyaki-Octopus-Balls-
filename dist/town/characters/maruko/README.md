# 小丸子 · 已确认造型 static-06 / 骨骼蒙皮 rig-01

**static-06 的长相与比例已获用户认可。rig-01 已完成骨骼绑定和蒙皮，走路等待用户转交参考后再制作。** 本轮不制作走路/跑步片段，不接人物控制、碰撞或正式场景，不发布网站。

## 骨骼与蒙皮 · 当前交付

直接打开[骨骼与蒙皮预览](http://127.0.0.1:4185/town/characters/maruko/rig-preview.html)。沿用人物原 4185 服务；若停服，按下文原启动命令恢复。

- 左键旋转、滚轮缩放、右键/中键平移，Home 返回全身；可切换正面、左右侧面、背面和面部近景。
- “显示骨架”查看真实骨骼；头颈、肩肘、髋膝、裙摆、躯干按钮是**静态变形测试姿势**，没有时间轴或动作循环。
- “测试幅度”调整预设幅度；下拉选择关节后可分别调整 X/Y/Z 旋转。“回到已确认站姿”复位所有测试关节。
- “查看骨骼 GLB”实际加载 `maruko-rigged.glb`，保留当前测试姿势，可与源绑定切换对照。

| 文件 | 当前职责 |
| --- | --- |
| [rig.js](rig.js) | 可编辑骨骼层级、蒙皮权重、静态检查姿势与裙内承托约束 |
| [maruko-rigged.glb](maruko-rigged.glb) | 骨骼/蒙皮交换文件，约 11.85 MB，44 个关节节点、107 个蒙皮网格、0 动画片段 |
| [rig-preview.html](rig-preview.html)、[rig-preview.js](rig-preview.js) | 独立绑定预览和单关节操作 |
| [tools/inspect-rig.mjs](tools/inspect-rig.mjs) | 本人物绑定/蒙皮检查、GLB 导出回读和截图 |
| [evidence/rig-01/inspection.json](evidence/rig-01/inspection.json) | 本轮实际检查结果与并行改动记录 |
| [evidence/rig-01/11-skeleton.png](evidence/rig-01/11-skeleton.png) | 实际骨架显示截图 |
| `evidence/approved-static-06/` | 已认可的静态源文件、GLB 与主要截图归档 |

中立站姿保持确认版全部 107 个网格的几何、颜色、描边与变换。每顶点最多四个权重；描边使用对应表面的同组权重。头部、头发、耳朵及五官整体跟随头骨，维持已确认的后脑包覆关系；袖子在肩肘处平滑过渡，腿/袜子在膝踝处过渡，鞋前掌可以弯曲。裙摆由 8 个辅助骨控制，另设裙内封口承托骨，保持既有遮挡面位于展开后的裙摆内部。

骨架包含整体根、骨盆、腰背、胸背、颈部、头部、左右肩带/上臂/前臂/手、左右大腿/小腿/脚/前掌、裙摆辅助骨及末端参考节点。当前手指整体随手骨，未制作逐指操控或表情骨骼。

```js
import { createRiggedMaruko, refreshRig } from './town/characters/maruko/rig.js';
const actor = createRiggedMaruko();
scene.add(actor.root);
actor.root.position.set(x, floorY, z);
actor.root.scale.setScalar(1); // 只整体等比缩放
actor.setPose('arms', 0.5); // 静态肩肘变形测试，非动作片段
actor.setPose('neutral'); // 回到已确认站姿
// 直接调整 actor.bones 中的关节后，调用 refreshRig(actor.root)。
refreshRig(actor.root);
actor.dispose(); // 包含骨骼纹理，重复调用安全
```

`setTestPose(root, name, amount)`、`rigBones(root)` 和 `refreshRig(root)` 也支持本次 GLB 回读后的根对象。裙内封口承托在 `refreshRig` 中根据裙摆下缘更新；GLB 保留此辅助骨与权重，但不保存 JavaScript 约束。后续制作动作时，应把该辅助骨的位移一并烘焙进动画轨道，避免外部播放器依赖预览脚本。当前没有任何动作片段需要播放。

运行检查：`node dist/town/characters/maruko/tools/inspect-rig.mjs`，要求上述 4185 服务已运行。加 `--draft` 只查看静态测试姿势和截图，不重新导出。工具使用隔离 Chrome，不读写正式编辑器存档。

本轮 **34 项局部检查通过，浏览器错误 0**。中立姿态相对确认版的几何与颜色无改动，同相机实际渲染的像素对照一致；CPU 蒙皮后的最大位置误差约 2.22e-8 米。源绑定与 GLB 在六种静态测试姿势及整体位移/旋转/缩放下最大误差约 3.66e-8 米；四组实际回读画面仅 1–6 个像素的通道差超过 2/255，非 PNG 字节完全相同。44 关节、权重归一、成对描边、单关节操作、姿势复位、实例隔离与资源释放均通过。

本轮保护基线含 207 个目录外文件，其中三矢建筑窗口的 5 个文件在工作期间更新，已单独记录并保留；没有将并行变更称为“全部文件未变”。实际关节姿势检查不代表未来走路落脚、滑步、裙腿全周期穿插或多角色移动端性能已经验收。

绑定实现核对项目安装的 Three.js 0.180.0 源码，并参考官方 [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html) 与 [Skeleton](https://threejs.org/docs/pages/Skeleton.html) 接口。中立姿态的静态文件与场景比例说明保留在下文。

## 已确认静态版 · 保留作对照

static-06 按沟通后确认的“头发包住圆润完整后脑”完成修形，随后获用户认可。保留干净的浅斜发尾、可见前脸、薄嘴缘、五官、身体与服装。static-05 源文件、GLB 和关键截图保存在 `evidence/before-side-06/`，更早归档保留。

直接查看[侧脸近景](http://127.0.0.1:4185/town/characters/maruko/preview.html?view=side-face)，可继续拖动旋转。

## 打开与操作

本人物独立预览：[http://127.0.0.1:4185/town/characters/maruko/preview.html](http://127.0.0.1:4185/town/characters/maruko/preview.html)。该端口只用于本预览，既有 4173/4184 服务不作改动。

如果服务未运行，在 PowerShell 执行：

```powershell
Set-Location -LiteralPath 'E:\动森\小丸子小镇'
node dist/town/characters/maruko/tools/serve.mjs
```

需要 Node.js 和支持 WebGL 2 的浏览器；页面依赖均已在本地。现有项目服务也可使用同一路径。本 `preview.html` 使用 ES modules，需要 HTTP 服务，不是直接双击的离线单页。

- 左键拖动环绕，滚轮缩放，右键或中键拖动平移。
- “全身”或 Home 恢复全身；正面、四分之三、左右侧面、背面、面部近景和侧脸近景分别取景。
- 左栏切换人物样板、樱家门口、完整 AME MART 街角、樱家室内；“环境全景”查看引用资产，室内低墙用于绕看。
- “参考图片”查看原四张图及用户新提供的侧面截图；“查看导出的 GLB”直接加载交付文件，可以切回源模型比对。
- [截图图册](gallery.html)与 [GLB 文件](maruko.glb)可单独查看；截图不能替代三维操作。

## 模型、尺寸与材质

固定白色翻领长袖上衣、红色背带裙、白袜红鞋。正面没有围兜，两条背带之间是白衣；背面为 X 形交叉，无帽、无书包。

建议身高 **1.24 米**，含轮廓网格实际高约 1.2398，最宽约 0.646，最大前后厚约 0.598；尺寸用于本项目，不是官方实测。室内外都推荐 **1.00 整体倍率**，室内 2.03 米门框可直接对照；日后可整体等比调整展示倍率，人物自身头身比例保持不变。外部一格 14×14 与独立室内空间分开处理，不将室内塞进外壳。

原点为两只鞋底中心之间的地面点，Y 向上、正面朝 +Z。落地几何最低 Y 约 0；预览用原建筑表面射线确定静态站位高度，未制作人物碰撞或行走控制。樱家对照使用原玄关台阶，便利店使用原铺装，室内使用姐妹房门框和两侧家具。

模型采用实体网格、固定曲面五官、无高光的柔和顶点明暗与细轮廓。头部、头发、躯干、四肢和衣服具有真实深度；眼睛、腮红和嘴为贴合脸部的网格，不随相机转动，不使用整人平面图。参考照片没有贴到模型上。

所有人物颜色直接保存在材质/顶点色中，无外部人物纹理。GLB 使用 `KHR_materials_unlit`，包含实际反向绕序的轮廓壳；支持此标准扩展的查看器可保留当前动画配色。不要在运行层重复添加第二套描边。颜色、几何、边界和同相机画面均有源模型/GLB 回读检查。

## 文件与使用

| 文件 | 职责 |
| --- | --- |
| `model.js` | 可编辑造型、比例、衣服与五官，导出 createMaruko/specification/joints |
| `geometry.js` | 曲面/闭合体/丝带、柔和顶点色和实体轮廓，实例独占资源 |
| `maruko.glb` | 静态人物交换文件；不含建筑、相机、灯光、动作 |
| `preview.html`、`preview.js` | 独立预览和原资产比例对照，不读取/写入布局存档 |
| `references/` | 原四张参考、用户侧面截图及 SOURCES.md |
| `gallery.html`、`evidence/` | 正侧背、近景与比例截图，几何/交互/GLB 检查记录及保护指纹 |
| `tools/` | 本人物局部服务、截图和完整检查脚本；GLTFLoader.js 为 Three.js 0.180.0 原依赖的本地副本（仅改工具依赖路径），许可见 LICENSE.three |
| `ACTION.md` | 本人物实际实施、修正、验证与停止点记录 |

在已有 Three.js 0.180.0 环境中：

```js
import { createMaruko } from './town/characters/maruko/model.js';
const actor = createMaruko();
scene.add(actor.root);
actor.root.position.set(x, floorY, z);
actor.root.scale.setScalar(1); // 只整体等比缩放
// actor.joints 是当前模型局部坐标的关节位置参考，不是已绑定骨骼。
// 不在人物模块中创建渲染器、相机或帧循环。
actor.dispose(); // 释放本实例，重复调用安全，不影响其他实例
```

运行本人物检查：`node dist/town/characters/maruko/tools/inspect.mjs`（先启动上述服务）。该脚本会重新生成本目录 GLB、截图和 inspection.json，使用隔离 Chrome，不触碰用户浏览器存档；不运行建筑/编辑器整套回归。

后脑结构检查：`node dist/town/characters/maruko/tools/capture-head-fit.mjs`。它在隔离页面临时隐藏头发，保存实际头部侧面/后斜面截图和 `evidence/head-fit.json`。隐藏头发仅用于检查内部体积，不是新的角色造型；正常预览与 GLB 始终显示完整头发。

## 参考、补全与下一阶段

详见 [参考来源](references/SOURCES.md)：授权活动二维图决定长相、正面轮廓和配色；用户新截图是本轮侧面修形的主参考；同款 SOFVIPS 正侧背照片辅助理解体积，黄色上衣未采用。它们不是动画原始三视图，连续曲面、厚度、站姿、背面细化与尺寸均为项目补全。保留首版笑脸，不将新截图的闭口表情作为全脸改版要求。

此处 `model.js` / `maruko.glb` 是保留的静态对照文件；绑定版见前文 `rig.js` / `maruko-rigged.glb`。后续收到参考后制作普通走路循环，再检查完整周期的裙腿遮挡、摆臂、脚底接触与步幅；跑步另行授权。当前展示精度较高，不将其视为已优化的多角色移动端资产。

## static-06 历史检查

static-06 当轮局部检查 **34/34 通过，浏览器错误 0**。四分之三、侧脸近景和后脑近景的源模型/GLB 回读 canvas 截图各自字节一致；与 static-05 对照，103 个非头部/头发网格（含五官、耳朵、身体、服装）及关节点一致，可见前脸 9,600 个顶点位置未变，嘴部贴肤检查继续通过；当轮 167 个既有受跟踪文件 SHA256 未变。后脑射线检查的 66 个表面采样和 68 个后发缘采样均有头部支撑。此处是静态版历史结果，rig-01 的结果见前文。

完整结果见 [inspection.json](evidence/inspection.json) 和 [行动记录](ACTION.md)。GLB 约 7.18 MB，107 网格、337,452 三角形（含轮廓壳）；图册含实际 WebGL 截图、侧面/背面前后对照和内部后脑体积检查图。技术通过不代表用户认可长相和比例，也不代表行走/跑步、真实移动设备性能或正式场景验收。

当前停止点：骨骼与蒙皮已交付，等待用户转交走路参考；不自动制作跑步或接入正式场景。
