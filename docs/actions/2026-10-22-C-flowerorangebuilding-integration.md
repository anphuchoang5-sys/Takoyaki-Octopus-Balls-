# C 花满橙瓦屋编辑器接入

## 状态与现状

2026-10-22，**Completed（范围内制作、正式接入及定向技术检查完成；用户画面待认可）**。用户授权将现有 `flowerorangebuilding / exterior-04-hanging` 接入正式地图，保留外观及原有编辑、存档、环境链路。以实际源码和 [建筑说明](../../dist/town/assets/flowerorangebuilding/README.md)、[环境契约](../architecture/environment-contract.md)为依据。

初次读取时工作区含其他窗口的暂存内容；开始写入前 HEAD 已变为 `a0b9143cbbd12425e295eaa5789df785d8775a8b`，工作区干净。没有进行提交或修改暂存区。写入前重读目标，保护其他窗口后续改动。

建筑工厂返回完整实例、独立 dispose、环境状态接口和空灯光描述；没有自身雨雪视觉、积雪层、局部灯或室内。本轮只注册工厂及取景，按实际情况验证通用降水遮挡，不修改建筑造型或共享积雪实现，不接院门进屋。不提交、推送、发布、清理或派任务。

4173、4184 初次 HTTP 核对均无服务。正式预览采用本窗口本地静态服务，不启停其他窗口服务。测试使用独立浏览器和专用审看存储，普通地图及原格式、原键不改。

## 实施措施

1. 在既有 catalog 注册 specification 和 createModel；仅追加完整取景，不克隆或替换返回对象。
2. 复用正式主入口已有审看模式，新增两栋花满橙瓦屋与现有街区的纯布局 fixture；仅显式审看地址使用独立存储。
3. 定向检查真实点击/拖放、四向、编辑撤销、文件与刷新、资源释放；比对原工厂全部几何与材质。实测地块接地、地图长草遮罩和四时段/晴雨雪遮挡。
4. 输出正式地图整体、前后侧面、门口和阳台近景；核对后更新接入状态，技术通过与用户美术认可分开。

## 影响文件树

- `dist/town/editor/catalog.js`：原工厂注册与聚焦/缩略图机位。
- `dist/main.js`：复用已有审看存储分支，普通入口不变。
- `dist/editor-preview/flowerorangebuilding-review.js`（新增）：隔离审看的布局数据；没有第二套渲染实现。
- `scripts/inspect-flowerorangebuilding-editor.mjs`（新增）：正式编辑器定向检查。
- `artifacts/editor/flowerorangebuilding/`（新增）：检查报告、截图、布局和受保护源码哈希。
- 本行动文档、`docs/handoffs/C-town-editor.md`、`docs/architecture/building-status.md`、`README.md`、建筑 `README.md`：实际接入状态与限制；建筑源码不改。

## 自检方法

- `node --check` 检查实际修改的 JavaScript；不运行整项目回归。
- 独立 Chrome + 正式首页，专用 `?review=flowerorangebuilding`：卡片、点击/拖入、占地冲突、四向、搬动、删除撤销、保存刷新、真实文件导出/导入、旧布局、无效输入原子拒绝。
- 两个以上新建筑实例与旧建筑、道路同场；原工厂几何/材质指纹、14×14 边界、草遮罩、资源 dispose 计数与邻居零释放。
- 屋顶、院门雨棚、院子实际射线与统一降水采样比较；编辑变换同步，四时段和晴雨雪真实截图；不把环境参数接收当作建筑积雪完成。
- 正式地图旋转、缩放、地块接缝及院门/阳台近景人工审看；建筑源码和共享环境代码哈希保留。

## 自检结果

正式入口：[花满橙瓦屋审看](http://127.0.0.1:4173/?review=flowerorangebuilding)，同一正式编辑器；专用键 `rainy-corner.editor.review.flowerorangebuilding.v1`。普通入口 `rainy-corner.editor.layout.v1`、布局 v1 / 街区 v2、原实例 ID 保留。只有显式审看地址默认生成示例；用户原地图未读取或修改。

### 实际运行

- `node --check dist/main.js`、`node --check dist/town/editor/catalog.js`、`node --check dist/editor-preview/flowerorangebuilding-review.js`、`node --check scripts/inspect-flowerorangebuilding-editor.mjs`：通过。
- `node scripts/inspect-flowerorangebuilding-editor.mjs`：**10/10 通过，页面/控制台错误 0**。实际浏览器为独立 Chrome，1600×1000，DPR 1。
- 点击、重复放置、原生卡片拖放、建筑直接拖动、占格拒绝、四向旋转、搬动、删除、撤销：通过。实际文件下载/上传、自动保存刷新、旧布局恢复、6 类非法导入整体拒绝：通过，实例 ID 与坐标/朝向保持。
- 原工厂与两个正式实例全部节点/变换/几何属性/索引/材质指纹相同；每栋 **115 网格、293668 三角面**，缩放 1，四向占地均 14×14。缩略图投影最大绝对坐标 0.969，完整入镜。288 个建筑格内草遮罩采样均无地图草。
- 独立实例、预览原资源、缩略图、撤销恢复、场景释放：**每个 229 个可见资源各释放一次**；预览透明副本各释放一次，存活邻居释放 0。重复 dispose 无重复释放。新建、预览、撤销恢复继承当前环境状态。
- 建筑草坪底部 y=0.055、顶部 0.08，地图顶面 y=0；没有共面，无需抬高、缩放或改模型。边界过渡约 0.055，未见悬空裂缝；保留原道路草边，没有额外铺院门连接道。
- 17 个绕转角度 × 33 个不受前景遮挡的草坪点：像素最大色差 **0**，保留阴影。正面、两侧、背面、门口、阳台和挂盆近景已人工查看，未见旧穿盆壁问题复现；原几何未改。本轮未重跑 B 独立穿模算法，不能将人工截图等同全部空间交叉数学证明。
- 4 个朝向共 **900 个**实际射线对比统一降水落点，最大高度误差约 `7.1e-15`；每栋 144 条雨丝无越过承接面。屋顶、院门雨棚、庭院落点及搬动/删除/撤销同步通过。雪花抽样无可见粒子低于命中面。
- 早晨、下午、黄昏、夜晚及雨、夜雪实际渲染通过；状态/环境刷新保持。建筑无 `snow`、灯描述为空、实现标志仍 false；全局受光和统一降水有效，不声称建筑已积雪、湿润、开灯或可进屋。
- 受保护清单 `protected-before.json` 记录 163 项，检查排除注册入口和 README 后，其余建筑/编辑器/共享雪/依赖文件哈希不变。原历史检查基线没有修改。

### 过程中失败及修正

1. 沙箱启动 Chrome 报 `spawn EPERM`；改用已获执行审核允许的隔离本机 Chrome。这是执行设施限制，不是页面错误。
2. 测试最初直接注入旧存档，被旧页面关闭时的正常保存覆盖；先停止测试宿主再注入，旧存档恢复与审看隔离通过。另一次搬动目标落到左浮层，改为实际可见格子；未改产品交互。
3. 地面低角度像素探针出现 11～12 个变化点，集中在临近道路长草的前沿；缩小为 `--only=ground` 后调整测试视线越过前景草，保留全部模型和阴影，33 点均稳定。该测试原先混入遮挡颜色变化，未发现需要修改建筑/地图地面的深度重叠。

### 证据与限制

结构报告：[inspection.json](../../artifacts/editor/flowerorangebuilding/inspection.json)。实际导出文件为同目录 `exported-town.json`，交付布局为 `review-town.json`，地面逐角度读数为 `ground-probe.json`。

- [街区整体](../../artifacts/editor/flowerorangebuilding/06-whole-town.png)、[建筑在地图中](../../artifacts/editor/flowerorangebuilding/08-flower-in-town.png)
- [门口近景](../../artifacts/editor/flowerorangebuilding/13-gate-detail.png)、[阳台近景](../../artifacts/editor/flowerorangebuilding/14-balcony-detail.png)、[挂盆侧面](../../artifacts/editor/flowerorangebuilding/15-gate-pot-side.png)、[阳台下方](../../artifacts/editor/flowerorangebuilding/16-balcony-under.png)
- 四时段为 `04-time-*.png`，雨为 `03-rain-roof-and-gate.png`，夜雪为 `05-night-snow.png`，其余前后侧面同目录。早期 `failure.png` 是测试排查截图，保留不作为最终证据。

本轮没有制作建筑承雪源/专属雪、雨水材质/檐滴、局部夜灯或室内；公共地面/道路雪仍由地图负责，本建筑格内地面不自动补雪。没有修改共享积雪实现或其他建筑；未运行整项目回归、厚雪长期压力、移动端或大规模性能检查。技术检查及正式接入已完成，最终美术认可等待用户；不自动继续扩展。
