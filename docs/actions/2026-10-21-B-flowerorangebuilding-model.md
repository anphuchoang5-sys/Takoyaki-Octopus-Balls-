# flowerorangebuilding · 外观 01

## Status and situation

状态：Completed（外观第一版、独立预览和定向技术验证完成；用户美术认可待定，正式地图未接入）。用户在参考分析后明确要求“开做吧”，授权制作该建筑外观、附属庭院及独立可操作预览。依据本目录原始动画截图，沿用[参考分析](2026-10-21-B-flowerorangebuilding-reference.md)；用户明确不采用 ds 的 `orange-house` 造型方案，本轮不读取或修改其模型。

已重读项目规则、两项工作技能、目标目录、当前 Git 状态及环境约定。项目有其他窗口未提交工作，全部保留。本任务只写新建筑目录、本行动记录、本任务检查脚本与忽略的交付产物；不注册编辑器，不改已有建筑/共享环境，不制作独立室内、人物、雪景，不启停服务、提交、推送或发布。现有 4184 HTTP 服务已只读探测可用。

截图可见正立面、屋面与院门花木；背面、纵深、隐藏入口和侧面连接属于补全。暂用稳定 ID `flowerorangebuilding`、14×14 地块、+Z 正面，revision `exterior-01`。静态模型不宣称具有全部环境能力。

## Implementation measures

1. 建立模型工厂及私有几何/植物制作代码，复用项目 Three.js、OrbitControls、BufferGeometryUtils；不复制 ds 模型，也不改共用文件。
2. 优先匹配左右体量、橙瓦坡顶、左侧前向山墙及屋面交接、院墙与黄褐门屋；再做凹窗、百叶、花盆阳台和植物花带。
3. 建筑只返回自身对象及局部环境状态，不创建全局灯光、天气或时钟；未制作的室内/积雪能力明确标注。
4. 独立预览支持旋转、缩放、平移、正面与参考机位、侧后、屋顶、院门、阳台近景和原图对照。既有服务复用；提供离线版本供直接查看。
5. 运行本建筑定向语法、几何、资源生命周期、边界与浏览器交互检查，实际查看多面截图并修正，再输出静态 GLB、对照图和真实检查记录。

## Affected file tree

实际新增或修改：

- `dist/town/assets/flowerorangebuilding/{index,geometry,garden}.js`：建筑工厂、实际结构和庭院附属。
- `dist/town/assets/flowerorangebuilding/preview.{html,css,js}`：独立旋转缩放预览、参考对照与近景。
- `dist/town/assets/flowerorangebuilding/flowerorangebuilding.glb`：静态交换模型，不包含 JavaScript 环境行为。
- `dist/town/assets/flowerorangebuilding/README.md`：真实能力、依据/补全与预览入口；原图不变。
- `scripts/inspect-flowerorangebuilding.mjs`：本建筑定向检查、截图、静态导出和离线打包。
- `artifacts/buildings/flowerorangebuilding/`：原工作区边界指纹、截图、对照、检查和离线预览；不复制整套项目或旧建筑。
- 本行动记录：执行措施与实际验证。

## Self-verification method

- 修改 JS/MJS 的 `node --check`；不运行全项目回归。
- 隔离 Chrome/Playwright 上下文访问现有 4184，不读写用户存档；检查控制台、真实旋转/缩放/平移、视角与参考图。
- 有限坐标、退化三角形、四向 14×14 边界、窗口凹进、花盆与家具承托、屋面交接，以及多实例与幂等释放。
- 实际查看正面、斜面、背面、两侧、屋顶/门屋/阳台近景，输出原图近似视角对照。
- GLB 导出回读；离线 HTML 阻断 HTTP 后运行与交互。
- 对本轮开始时范围外文件取指纹，结束核对；并行变化如实单列，不回退他人工作。

## Self-verification results

### 制作与实际查看

- 完成偏右两层主体、左侧单层与前向山墙、浅弧橙瓦、真实屋面谷口、黄褐院门小坡顶、凹窗与百叶、浅阳台、三个挂盆、围墙/台阶、庭院树丛及花带；主体均为真实几何，没有整张图片替代建筑。
- 主屋顶根据较短脊线/较宽檐线采用大前后坡加短侧坡，区别于读图时暂定的双坡解释；短侧坡、背面、纵深、隐藏入户门和右附屋连接明确为补全，不声称严格复原。
- 实际打开查看 `reference/hero/left/right/back/top/roof/gate/balcony.png`、`00-interactive.png` 和 `reference-comparison.png`；根据初图调整橙瓦明度、瓦片浅弧、左树间隙、左右灌木轮廓与高度、挂盆挂钩接触及门前花盆支撑。花叶和瓦缝采用规整三维近似，未声称复刻手绘的全部笔触。

### 检查结果

- 本轮四个运行 JS 与检查 MJS 的 `node --check` 已运行通过。
- `node scripts/inspect-flowerorangebuilding.mjs --deliver` 最终退出 0；现有 4184 HTTP 服务未启停，检查使用新建隔离 Chrome 上下文，不访问地图页面或用户存储。
- 115 网格、291508 三角形；非有限坐标 0，退化三角形 0；四向 XZ 均为 ±7（浮点误差范围内），最高 Y=6.375。
- 12 处落地/台阶/墙顶花盆承托射线通过，最大高度误差约 9.54e-9；4 处正面窗面实测凹进约 .076；15 处山墙与低屋面交接射线均命中，表面高度与结构坡面的差值在瓦片起伏范围内。
- 真实鼠标旋转、滚轮缩放、右键平移、恢复全景、视角按钮、原图对照和花木显示切换通过。多实例状态隔离、非法输入原子拒绝、释放后空灯列表通过；本实例 229 个可见几何/材质各释放一次，邻居释放数 0，重复释放安全。
- `flowerorangebuilding.glb` 为 21109472 字节，115 网格；导出回读边界一致。GLTFExporter 对 LineBasicMaterial 产生一条通用材质建议：`Use MeshStandardMaterial or MeshBasicMaterial for best results.`；回读成功，不把该检查提升为 GLB 全角度美术验收。
- 离线 HTML 为 3417048 字节、8 个内嵌模块；阻断 HTTP 后启动、旋转、缩放、参考图和近景切换通过，网络请求 0。主预览与离线页面运行错误 0；上述导出建议保留在报告中。
- 主要证据：`artifacts/buildings/flowerorangebuilding/{inspection,geometry}.json`；离线预览、原图与模型对照 HTML、多面截图在同目录。

### 失败与修正

- 首次 Chrome 启动被沙箱以 `spawn EPERM` 拒绝，经执行环境审批后使用隔离本机 Chrome 完成检查；没有将基础设施失败归为模型失败。
- 现有服务对 CSS 返回 `application/octet-stream`，首轮截图未加载样式；改为仅在本建筑预览中读取 CSS 注入 style，离线版直接内嵌，未修改共享服务。
- 首次几何检查发现左树冠越界和 24 个退化三角形；树冠收回地块，退化来自最后一节脊瓦的浮点近零长度，改为有效长度条件后为 0。后续修正屋面侧壁法线并重生成全部交付。

### 并行工作与边界

开始时记录 279 个范围外文件。最终发现以下并行变化，均未由本轮工具写入，也未回退：`dist/town/assets/shared/snow.js`、`scripts/inspect-sisters-room.mjs`、根 `README.md`、`dist/town/assets/sakura-house/interior/{README.md,preview.html,preview.js}`、`scripts/inspect-sakura-interior.mjs`、`scripts/package-sakura-interior.mjs`。其余记录文件指纹保持；`orange-house` 未改。

本轮无正式地图接入、独立室内、人物、天气/积雪及夜间局部灯光制作。环境方法仅校验记录，明确返回未实现标志；静态 GLB 无运行时逻辑。没有全项目回归、地图压力/移动端验收或用户美术认可，没有提交、推送或发布。

最终定向 Git 状态列出本轮源码、预览、模型、README、脚本与行动记录为未跟踪；`git check-ignore -v` 对交付源码/模型无命中，正式资产不依赖被忽略的产物目录。原图 SHA256 仍为 `B41321EC2949149C77A1B0135054A48EFA1C3DAF0105FB06BFBCBFECD1647046`，保持不变；离线预览、对照 HTML 和静态 GLB 均已确认存在。最终法线修正后的全景与屋顶截图已再次实际查看。
