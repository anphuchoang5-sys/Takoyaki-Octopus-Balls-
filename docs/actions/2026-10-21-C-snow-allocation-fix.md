# C 雪景内存与多建筑性能修复

## 状态与情况

2026-10-21，Completed（本轮四项修复及定向验证完成；1200 MiB 诊断线仍未通过，多建筑流畅度仍需优化）。用户授权按[已定位措施](2026-10-21-C-snow-diagnosis.md)实际修复，要求不降低雪景精细度和现有逻辑，保护存档，提供优化前后的真实内存及多建筑流畅度对比。

开始时 HEAD 为 `13f9b05d7c2384d53326646252bb6c523b1d05f1`；建筑室内及其脚本有其他窗口修改，全部保护。只复用 4173 服务，独立 Chrome 和 `rainy-corner.editor.review.snow.v1`。正式存档键、布局/环境格式、建筑原貌不改。不提交、发布、清理、不运行整项目回归。

## 实施措施

1. 先记录同一设备、1280×800、相同 3/6/12 栋布局的冷启动、帧间隔和私有提交量；记录采样限制，不把进程提交量称为雪景专属内存。
2. 雪面生成复用裁切容器与向量，保留原始数值运算顺序、三角形、法线、颜色和厚度。
3. 内部查询复用调用者结果容器，保留公共独立结果接口；不减雪花、不降低实时遮挡查询频率、不缓存过期落点。
4. 释放闲置灯槽阴影资源并验证重新启用；仅关闭默认画布重复抗锯齿，保留离屏 4 采样及后处理。
5. 精确几何/查询对照、定向编辑存档检查、循环积融雪与同场景优化后性能测量。

## 影响文件树

- `dist/town/assets/shared/snow-geometry.js`：生成暂存容器。
- `dist/town/assets/shared/snow-surfaces.js`、`snow.js`：无临时分配的内部查询兼容路径。
- `dist/town/editor/rain-surfaces.js`、`ground-snow.js`、`scene.js`、`snowfall.js`：连接地面/建筑世界空间查询。
- `dist/town/editor/lighting.js`：灯池阴影生命周期。
- `dist/main.js`：默认画布 AA 设置。
- `scripts/diagnose-snow-memory.mjs`：复用诊断工具增加可比的多建筑性能数据。
- `scripts/inspect-snow-allocation.mjs`：固定旧 commit 的画面/查询差分与灯池生命周期。
- `scripts/inspect-snow-memory.mjs`：原 5043 查询加入复用结果路径对照；`artifacts/editor/snow-allocation-fix/`：结果与画面证据。
- 本行动记录、`docs/handoffs/C-town-editor.md`、`docs/architecture/building-status.md`：实际结果与限制。

## 自验证方法

- 改前/改后同布局与固定镜头，不开启采样分析器/强制 GC 的性能对比；分析器另跑累计分配对照。
- 现有 prepared 15 组完整输出摘要与 1200 射线；5043 紧凑查询对照，新增复用容器查询/生命周期验证。
- 现有 promotion 定向 13 项：编辑变换、资源隔离、时间/天气、新旧导入/导出/非法输入和恢复。只运行任务相关检查，不改历史基线。
- 连续自然积融雪与取消/重建，记录真实采样峰值、资源回收及不足。
- 四时段、近景、旋转/缩放及 DPR 的固定图像对照；技术通过不代替用户画面认可。

## 自验证结果

四项正式代码修改已实施，定向验证与前后比较完成；通过项和未通过项分别如下。

- `diagnose-snow-memory.mjs --bench --count=3/6/12 --label=before-N --limit=1800 --out=artifacts/editor/snow-allocation-fix`：三档基准完成。实际无强制 GC/Profiler；12 栋夜间厚雪约 6.32 FPS。1800 是分级压力检查的安全上限，未替换此前 1200 诊断触发线。
- `inspect-snow-prepared.mjs --label=allocation-fix-prepared`：生成器改后 15 组完整帧摘要、1200 四向射线与准备数据异常回退/取消释放通过。
- `inspect-snow-memory.mjs --topology --label=allocation --out=artifacts/editor/snow-allocation-fix`：5043 旧/新/复用查询对照通过，接触面细分与面积通过。
- `inspect-snow-allocation.mjs`：12 对 PNG（四时段、近景、旋转缩放 × DPR1/2）逐字节一致；3968 个实际世界表面结果与旧版一致、5168 次复用路径对照通过。五次灯池启用/删除/撤销/空描述/再启用检查通过，闲置阴影贴图为零。已查看みつや门口夜景近景。
- `diagnose-snow-memory.mjs --label=profile-after --rows=3 --rounds=1 --profile --gc --out=artifacts/editor/snow-allocation-fix`：通过原 1200 MiB 诊断触发线，采样峰值 1188.754 MiB。相同 .4/.75/1 三次重建：Worker 累计分配估计 2889.923 → 970.811 MiB（-66.4%），主线程 726.116 → 302.250 MiB（-58.4%）。累计分配包括已回收对象，不能当作常驻内存；GC仅在诊断步骤显式调用，生产代码没有此调用。
- 首轮多建筑检查保留 `before-N/after-N.json`，其中含 WebGL 计数包装。为降低测量本身的干扰，另用 `--bench --baseline` 固定旧 commit 请求响应与当前代码交替跑 `paired-before-N/paired-after-N`；工作区不回退。实际帧率有明显波动，不能凭单次高速窗口承诺提升。
- `inspect-snow-memory.mjs --label=allocation-cycle --out=artifacts/editor/snow-allocation-fix --seconds=310 --cycle --limit=1500 --lifecycle`：310.672 秒通过；峰值1396.133 MiB、末尾1079.301 MiB。此前同脚本同代码基线 `snow-startup/final-cycle.json` 为1454.156 MiB，本次低约4.0%（此前记录，不伪称本轮同步重跑）。两次积满、一轮雨融后雪资源归零、24次取消重建邻居保持正常，错误0、无崩溃、正式存储未写入。
- `inspect-snow-promotion.mjs --verify --out=artifacts/editor/snow-allocation-fix/verified`：13/13 通过，错误0。五档积雪、贴合/空隙/道路/草、四时段、1296 降水落点、变换/撤销/轮廓、多实例释放与灯池、统一时钟、新旧JSON、五种非法导入原子拒绝和刷新稳定ID/环境全部通过；原53个建筑外观文件摘要不变。
- `inspect-snow-allocation.mjs --flakes-only`：5个统一时刻的全部雪花矩阵与诊断落点逐值摘要一致；旧 `sample` 专属部位非空落点仍被查询，结果法线不污染工厂，恢复通用后没有旧索引残留，释放一次。
- `inspect-snow-prepared.mjs --label=allocation-final-prepared`：最终全部正式改动后再次15帧、1200四向屋面射线、缺失/损坏/来源失配回退和取消释放通过；历史摘要未更改。
- **未通过** `inspect-snow-memory.mjs --hold=1 --heap --label=allocation-original-repro --out=artifacts/editor/snow-allocation-fix --seconds=25 --limit=1200`：5.646秒采样1234.352 MiB，原1200诊断线仍触发，脚本退出1，未发生页面崩溃。此前原复现1234.996 MiB。不能把已修资源/分配问题描述为总内存稳定低于1200。该启动样本GPU提交量732.9→651.2 MiB，但主渲染进程386.98→469.58 MiB；采样时正在生成的资产/缓冲不同，不能当作精确的同状态常驻分解，更不能用强制GC掩盖。
- 12个本轮JS/MJS语法检查、目标差异空白检查通过，最后补充的两个测试脚本已再核对语法。四道路专查/完整项目回归/100建筑/手机/数小时运行未运行。汇总时 Node 启动 Git 被沙箱 EPERM 阻止，改用 shell 只读 Git diff 完成保护文件核对；这是汇总工具限制，不是产品失败。

实施期间花橙建筑和樱家室内继续出现其他窗口修改，保持不动；本轮对比只锁定列出的环境相关 9 个文件，原建筑外观另用既有 53 文件摘要验证。

## 多建筑前后对比与实际限制

同机 RTX 4060 Laptop / ANGLE D3D11，独立 Chrome，1280×800、DPR1，三个原建筑循环摆放为3/6/12栋，无雪启动后直接请求满雪。固定全景，下午/夜晚分别测量180帧；没有WebGL计数包装、Profiler或强制GC。私有提交量是该测试浏览器全部进程之和，包含GPU进程，不是雪几何独占内存或物理显存；阶段采样可能漏掉瞬时尖峰。文件为 `paired-before-N/paired-after-N.json`，旧版9个目标模块来自固定开始 commit，未回退工作区。

| 栋数 | 采样峰值 MiB 前→后 | 下午厚雪 FPS 前→后 | 夜晚厚雪 FPS 前→后 | 夜晚 P95 帧间隔 ms 前→后 | 直接满雪等待 s 前→后 |
| --- | --- | --- | --- | --- | --- |
| 3 | 1189.8 → 1110.9 | 74.9 → 28.2 | 69.3 → 21.2 | 27.8 → 69.4 | 3.70 → 7.98 |
| 6 | 1371.6 → 1360.0 | 27.5 → 29.7 | 25.2 → 24.1 | 76.4 → 83.4 | 5.23 → 4.73 |
| 12 | 1661.1 → 1590.3 | 14.3 → 14.4 | 14.5 → 14.7 | 125.1 → 125.2 | 5.17 → 3.87 |

三栋短窗口表现反常，因此专门延长每阶段至少8秒复测一次（`--frame-ms=8000`，`long-before-3/long-after-3.json`）：下午54.7→58.5 FPS，夜晚53.5→64.7 FPS，夜晚P95 41.6→34.6 ms，直接满雪4.15→3.56秒；采样峰值1167.7→1163.7 MiB。两轮没有一致的提升/下降方向，**不选择其中较好的结果宣称稳定提速**；具体波动原因未证实。直接满雪等待不是产品自然积雪时间，60/300/60秒规则保留。

6/12栋在本轮可比测试中帧率基本不变，12栋仍明显卡顿。六栋/十二栋夜间每帧实际绘制调用分别5392/9371次、三角形约1224万/2265万（含阴影重复绘制），前后完全相同；本轮修复没有改活动灯阴影重画策略，也没有合并原建筑的绘制提交。后续若继续提高多建筑流畅度，应单独验证绘制批次及阴影更新开销，不能把本轮内存分配改善当作这一问题已解决。

## 交付状态

- 已制作／正式本地接入：复用生成临时容器；内部 `sampleInto` 查询；闲置阴影释放/再启用；默认画布不重复AA，原离屏4采样保留。新增代码都在已有运行模块，无新增运行预览或第二套雪算法。
- 技术通过：15帧完整数据、12对PNG、5个时刻全部雪花数据一致；查询、资源生命周期、13组编辑/存档功能、310秒无崩溃通过。**1200 MiB 启动诊断仍未通过，稳定帧率提升未证明**。详细机器结果和源文件摘要见 `artifacts/editor/snow-allocation-fix/delivery.json`。
- 存档保护：测试仅用隔离浏览器/审看键；`state.js/persistence.js/document.js/environment.js/catalog.js` 对开始commit的只读Git差异为空，布局格式、环境推进与正式键保持原样。已读取不到的旧存档保护逻辑未改，专门坏存档恢复浏览器用例本轮未重跑。
- 用户画面认可：已有小样认可继续保留，正式街区组合仍待用户审看；数值/像素一致证明本轮保真，不代替新的用户认可。
- 入口仍为 `http://127.0.0.1:4173/`，刷新即可载入；`?review=snow` 为独立审看存档。没有启停服务、提交、推送、发布、清理或扩展季节/人物/建筑美术。
