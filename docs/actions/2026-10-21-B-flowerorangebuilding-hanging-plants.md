# flowerorangebuilding · 挂盆下垂枝叶穿插修复

## Status and situation

状态：Completed（四只挂盆修复、在线/离线定向检查、静态模型与近景对照已交付；画面待用户认可）。用户提供阳台三个挂盆与院门挂盆截图，指出花下部穿模。本轮修复这四只挂盆的枝叶与盆壁接触关系，并补上仰视发现缺失的盆底；保持建筑、入口台阶、花盆位置、大小及配色，保留上一轮地块闪烁修复。

已读取项目 AGENTS.md、相关术语/资产 README、当前源文件及 Git 状态，完整读取 diagnosing-bugs、project-control-report、action-document。flowerorangebuilding 的未提交修改属于本窗口前轮工作；其他室内、地图和共享雪景的并行修改保持。本轮不改共享文件、不接地图、不启停服务、提交、推送或发布。

主证据为用户本轮两张挂盆近景截图。已用真实网格确认枝叶穿透盆壁，并在侧面/仰视检查与栏杆、挂钩的关系；不将普通视角遮挡误报为穿模。

## Implementation measures

1. 在修改前对四只挂盆的实际网格做定向穿插检查，保存阳台/院门近景与局部数据。
2. 验证根因后修正下垂枝条路线及叶片朝向/间隙，使枝条从盆内跨过盆沿再向外下垂，而非从盆壁中穿出。
3. 沿用现有花朵、花盆位置与随机序列，避免影响其他花木；核对四只挂盆、栏杆和挂钩关系。
4. 检查正面、斜侧、下方近景，更新可旋转预览、静态 GLB 和近景前后对照，记录实际结果。

## Affected file tree

- `dist/town/assets/flowerorangebuilding/garden.js`：挂盆枝叶几何，必要的局部净空处理。
- `dist/town/assets/flowerorangebuilding/index.js`：仅同步版本号，建筑造型保持。
- `scripts/inspect-flowerorangebuilding-hanging.mjs`：四只挂盆的实际几何穿插检查及同机位近景。
- `dist/town/assets/flowerorangebuilding/{README.md,flowerorangebuilding.glb}`：当前状态和同步静态交付。
- `artifacts/buildings/flowerorangebuilding/hanging-debug/`：诊断/检查记录、修改前后近景和对照；同建筑现有目录内更新离线预览与 `挂盆修复对照.html`。
- 本行动记录：执行边界、失败复现、根因、修复及验证。

## Self-verification method

- 读取真实生成的挂盆网格，用盆壁射线奇偶判定检测绿色枝叶的顶点/三角形中心是否进入陶盆实体，修复前应失败、修复后通过。
- 针对栏杆/挂钩做空间抽查，并实看阳台、院门正面/侧面/仰视。
- 核对四只挂盆之外的场景/花木几何不变；运行修改 JS/MJS 的语法检查与定向 diff 检查。
- 更新本建筑交付包，验证在线与离线使用同样修复；不作全项目回归。

## Self-verification results

### 复现与根因

`node scripts/inspect-flowerorangebuilding-hanging.mjs --label=before` 已运行，约 7.5 秒，退出 1 为预期失败：四盆共 1414 个绿色枝叶顶点/三角形中心采样落在陶盆壁实体内。分别为 370 / 437 / 347 / 260；碰撞同时来自花茎、下垂枝条和叶片。检查仅将每只盆的绿色几何与它自身盆壁相交，与场景灯光/阴影无关，直接对应用户近景中的穿插。

根因：原下垂枝条从盆内直接斜向下穿过盆壁；花茎根部按矩形散布，部分落在圆形盆口边缘；下垂叶片固定在盆壁附近并随机旋转。仰视同时发现挂盆底部未封口，能透看后方栏杆。

### 已实施与当前结果

- 保留花头位置，把挂盆花茎根部收进圆形内口，盆内叶片抬至盆沿上方；下垂枝条先越过盆沿再沿盆外下垂，叶片沿真实枝条连接并朝外展开。
- 四只挂盆补实体盆底；花盆原有位置、半径、高度、配色及挂钩保持。随机调用次数保持，其他花木不发生连带变化；index.js 仅同步 exterior-04-hanging 版本。
- `node scripts/inspect-flowerorangebuilding-hanging.mjs --label=after --compare` 退出 0：四盆穿壁采样均 0，四盆底射线命中，误差约 8.94e-10；其余具名花木及所有非花木建筑分组的几何指纹保持一致。已实看阳台/院门正面、阳台仰视和院门左斜视。
- garden.js、index.js 与新检查脚本的 `node --check` 已通过；定向 `git diff --check` 已通过。
- `node scripts/inspect-flowerorangebuilding.mjs --deliver --entry` 退出 0：115 网格、293668 三角形，非有限/退化为 0，地块边界、花盆承托、窗面凹进、屋面交接和资源释放检查通过。真实旋转、缩放、平移与离线断网操作通过；静态 GLB 回读边界一致。GLB 为 21266648 字节，离线 HTML 为 3420104 字节，HTTP 请求 0、运行错误 0；原有线条材质导出建议保留，未提升为静态 GLB 全角度美术验收。
- `node scripts/inspect-flowerorangebuilding-hanging.mjs --label=offline-after --offline --compare --comparison` 退出 0：从离线包实际模块重建四盆检查，穿壁采样均为 0，实体盆底通过、非目标分组几何指纹一致。对照 HTML 实际加载，所有图片成功显示；已实看两张生成的前后对照截图。

### 交付入口与限制

- [挂盆修复对照](../../artifacts/buildings/flowerorangebuilding/挂盆修复对照.html)：阳台/院门同机位前后，以及仰视/侧面检查。
- [可旋转离线预览](../../artifacts/buildings/flowerorangebuilding/花满橙瓦屋-三维预览.html)：当前版本 exterior-04-hanging；旧页面需刷新或重新打开。
- 检查针对四只挂盆的绿色几何顶点和三角形中心，是定向穿插检查；没有声称完成所有物体的穷尽碰撞验证。栏杆/挂钩通过侧面与仰视观察复核，挂钩接触保留。
- 临时诊断证据保存在明确命名的 hanging-debug 目录；未向生产代码加入调试日志。未改地图或共享文件，未启停服务、运行全项目回归、提交、推送或发布；不覆盖其他窗口未提交工作。技术完成与用户画面认可分别记录。
