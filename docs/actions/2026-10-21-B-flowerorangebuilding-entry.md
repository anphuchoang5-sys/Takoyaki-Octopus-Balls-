# flowerorangebuilding · 院门内凹与台阶花盆

## Status and situation

状态：Completed（入口修改、可旋转预览、前后对照和定向技术检查完成；本轮画面待用户美术认可）。用户确认“只改门口内凹、台阶和花盆，其他地方别动，改完给我看对照”。承接 exterior-01，交付 exterior-02-entry，按同一动画原图制作；不采用 ds 的 orange-house。修改前木门与正面围墙近乎齐平，门前台阶主要向街边伸出，缺少原图的内折短墙和凹入空间；本轮已补出。

已完整读取 AGENTS.md、project-control-report、action-document、资产 README、当前源码与上一轮行动记录，核对 Git 状态。目标资产、检查脚本当前无未提交修改；樱家室内、积雪诊断和共享状态文档有并行工作，保持不动。

范围：院门及随门移动的门柱、小屋顶、挂盆，两侧入口短墙，入口台阶/平台与三只落地花盆；保留建筑主体、橙瓦大屋顶、门窗、阳台、其他围墙/花木、材质配色、ID、地块、朝向和环境接口。凹入深度与踏步尺寸为依据画面关系确定的建模值，不声称原图精确尺寸。本轮不接地图、不改共享文件、不启动或停止服务、不提交推送发布。

## Implementation measures

1. 在修改前保存同机位的门口、正面与俯视截图，并记录非入口结构的几何指纹与目标文件状态。
2. 增加两侧实际内折短墙；门、柱、黄色门屋与挂盆整体后退，落在抬高的平台上。
3. 调整两级低台阶与平台的真实高度、踏面和侧面；左粉花、右高紫花、右低粉花置于对应承托面，保留中间通道。
4. 定向核对台阶高度、花盆底部承托、内折墙与院门的前后关系，以及主体几何未变化；观察正面、左右斜视、俯视和门口近景。
5. 更新本资产 README、静态 GLB、离线可旋转预览与原图/模型对照页，补充同机位修改前后对照。

## Affected file tree

- `dist/town/assets/flowerorangebuilding/index.js`：只改入口平台/台阶、内折围墙、院门整体位置与入口元数据。
- `dist/town/assets/flowerorangebuilding/garden.js`：只改三只门前花盆和随门挂盆的位置，保留随机调用顺序以保持其他花木。
- `dist/town/assets/flowerorangebuilding/README.md`：本次版本、改动与实际验证入口。
- `dist/town/assets/flowerorangebuilding/flowerorangebuilding.glb`：同步静态导出。
- `scripts/inspect-flowerorangebuilding.mjs`：沿用定向交付，补充门口前后对照与本轮检查。
- `artifacts/buildings/flowerorangebuilding/`：少量修改前证据截图、当前截图、前后对照、检查结果和离线预览；不复制整套源码/模型。
- `artifacts/buildings/flowerorangebuilding/inspect-entry.mjs`：本轮入口射线检查、几何指纹与同机位截图；属于本轮交付证据工具。
- 本行动记录：任务、边界、实施及实际验证结果。

## Self-verification method

- 修改的 JS/MJS 使用 `node --check`；仅运行本建筑的定向检查，不作全项目回归。
- 沿用现有 4184 服务与隔离浏览器；验证真实旋转、缩放，生成同机位前后截图。
- 对台阶/平台与花盆做表面射线检查，检查折墙深度、门柱落点和通道；几何有限/非退化及地块边界沿用原检查。
- 主体墙、屋顶、门窗/阳台分组几何指纹与修改前一致；Git 差异确认只更改指定入口与交付文件。
- 静态模型导出回读、离线预览与对照页实际打开；美术认可交由用户，正式地图本轮不验收。

## Self-verification results

已完成：院门整体向院内移动 1.0 个模型单位，平台标高 .44，外侧踏步标高 .20 / .32，连接到既有院内通道的短踏步属于入口范围。门屋随平台抬高 .23，门柱、门、黄色小坡顶与挂盆相对关系保持；未改形状或配色。两个实际折墙延续原墙底座、砌块和压顶。左粉花和右高紫花落在上平台，右低粉花落在外侧低踏步。

### 实际检查与证据

- `node --check dist/town/assets/flowerorangebuilding/index.js`、`node --check dist/town/assets/flowerorangebuilding/garden.js`、`node --check scripts/inspect-flowerorangebuilding.mjs` 均通过。
- `node artifacts/buildings/flowerorangebuilding/inspect-entry.mjs --before` 在模型修改前完成截图与基线；修改后不带参数运行退出 0。三处入口花盆承托、三个踏步/平台标高、两根门柱落点、两侧折墙和九处中间通行面射线符合预期。主体白墙、橙瓦组合屋面、门窗与阳台三个分组几何指纹完全一致；geometry.js、三份预览源文件及参考图哈希一致。详见 `entry-baseline.json` / `entry-inspection.json`。
- `node scripts/inspect-flowerorangebuilding.mjs --deliver --entry` 退出 0：115 网格、291652 三角形；非有限坐标 0、退化三角形 0，四向边界保持 14×14。12 处花盆承托、4 处窗面凹进、15 处原屋面交接抽查通过。运行错误 0；229 个可见资源的释放与相邻实例隔离通过。
- 真实鼠标旋转、缩放、平移、视角切换、参考显示通过；离线预览阻断 HTTP 后操作通过，请求 0。静态 GLB 导出回读边界一致，21121564 字节；离线 HTML 为 3417796 字节、8 个内嵌模块。导出器仍有第一版已有的线条材质通用建议，保留在 `inspection.json`，没有宣称 GLB 全角度美术验收。
- 已实看修改后的门口右斜视、左斜视、正面、整体近原图机位、俯视，以及 `entry-before-after.png`；前后截图的机位、光照、缩放一致。对照 HTML 实际在浏览器加载，所有图片完成加载，并截图验证对照区域。
- `git diff --check -- dist/town/assets/flowerorangebuilding scripts/inspect-flowerorangebuilding.mjs docs/actions/2026-10-21-B-flowerorangebuilding-entry.md` 通过；已复核源码差异，模型仅入口范围变化。garden.js 只改四个入口花盆/挂盆的位置，未改变其他花木的随机序列、形状、配色与位置。

### 交付入口

- [同机位门口前后对照图](../../artifacts/buildings/flowerorangebuilding/entry-before-after.png)（实际产物路径为仓库 `artifacts/buildings/flowerorangebuilding/entry-before-after.png`）。
- [原图与模型对照](../../artifacts/buildings/flowerorangebuilding/原图与模型对照.html)：原图、入口前后、另一侧斜视前后、整体正面前后及当前多面截图。
- [可旋转离线预览](../../artifacts/buildings/flowerorangebuilding/花满橙瓦屋-三维预览.html)；在线入口为现有 `http://127.0.0.1:4184/town/assets/flowerorangebuilding/preview.html?view=gate`。

### 边界与限制

本轮不启停服务、不访问用户存档、不修改共享环境、其他建筑或地图；未运行全项目/正式地图/移动设备验收，没有提交、推送或发布。已有并行樱家室内和积雪工作保留；交付脚本的 boundary 字段明确是 exterior-01 历史指纹，它列出的范围外变化不是本次入口修改造成的。当前技术检查完成，入口内凹深度和花盆层次仍待用户看图认可。

浏览器首次沙箱启动返回 spawn EPERM，经执行环境审批使用隔离 Chrome 完成全部上述核对，不属于模型失败；本轮模型定向检查无失败。
