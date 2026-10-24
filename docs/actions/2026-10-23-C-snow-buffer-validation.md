# C 雪面共用坐标与显示缓冲验证

## 状态与情况

2026-10-23，Completed（两项实现与验证完成；12栋反复积融雪的内存压力仍未达标）。用户明确要求开始验证上轮研究推荐的前两项：显示与落点共用坐标、复用雪面显示缓冲。沿用建筑/雪景细节和既有逻辑不变、保护存档、6/12栋对照的要求。职责仅共享雪计算/查询和运行层；不修改建筑专属造型、不迁移引擎、不引入高度图简化。

已读取 project-control-report、action-document、diagnosing-bugs、项目 AGENTS 与环境/术语/交接资料；工作区 HEAD a0b9143。B 的室内、street-house、maeda-house 与前轮 C 改动保留。先保存本轮实际源码基准，不使用较早低性能版本。用户已明确批准启动本地预览服务；现复用现有 serve.mjs，127.0.0.1:4173 HTTP 200，隐藏后台窗口，未停止其他服务。

## 实施措施

1. 创建源码与资源指纹基准；复用1800 MiB诊断/1900 MiB保护线，建立重复查询坐标与GPU重分配的小型失败检查。
2. 验证假设：移除查询坐标副本可降低精确字节数；复用属性对象可降低实际GPU创建/删除；预留容量可能反增驻留量，必须同协议实测。
3. 先改索引查询，再独立验证显示缓冲复用。原裁切、厚度、法线、三角面顺序、0.005雪量档和60/300/60秒规则不变。遇不兼容结果保留失败证据并修正。
4. 实际浏览器验证画面/落点/资源生命周期，独立存储下6/12栋前后配对，以及多轮积融雪、编辑和文件/刷新定向检查。不运行全项目回归。
5. 根据实测保留有收益且通过保真的改动，同步交接与状态表。不提交、推送、发布或清理其他窗口文件。

## 影响文件树

- `dist/town/assets/shared/snow-geometry.js`、`snow-worker.js`：打包顶面索引，保留原生成器。
- `dist/town/assets/shared/snow-surfaces.js`、`snow.js`：共用显示顶点的精确查询及按所有权复用显示缓冲。
- `scripts/inspect-snow-buffers.mjs`（新增）：字节、输出、生命周期与浏览器对照。
- `scripts/diagnose-snow-memory.mjs`：必要的局部源码基准路由支持，保留旧参数与保护线。
- `artifacts/editor/snow-buffers/`：局部源码基准、检查/图片/性能证据；不载入正式运行。
- 本记录、`docs/handoffs/C-town-editor.md`、`docs/architecture/building-status.md`：最终真实状态。

## 自验证方法

先运行失败信号，再修改；与本轮before逐值/逐图对照，定位所有差异。浏览器使用全新隔离profile与review存储，正式存储键必须不被写入。分开记录精确缓冲字节和隔离Chrome进程私有提交量，稳定帧率与动态阶段分开，不强制GC，不修改历史基线。无收益、未运行、失败或外部阻塞如实说明。

## 自验证结果

先运行 `node scripts/inspect-snow-buffers.mjs --red`，复现 DUPLICATE_QUERY_COORDINATES（退出1）；再运行不带参数的同一检查，修改后18帧／90000次落点比较相同，顶面索引字节为旧坐标副本的1/3。`--gpu-red` 在旧源浏览器复现 SNOW_GPU_REALLOCATION（两次更新32个新缓冲，退出1）。中间候选浏览器16组图像中15组相同、1组7像素差1色阶；最终证据见下文。初步before-12运行曾与离线几何计算并行，不能用其帧率作最终对比；后续paired/final/cycles系列串行运行，无重型并行检查。

中间候选保留在 reserve-12-source：预留12.5%显示容量虽然减少动态GPU分配，却吃掉大部分坐标去重收益；6栋驻留显示/查询缓冲仅59,836,170→58,396,306字节，满雪整页占用未下降。因此将预留降至2%，稀疏雪低于容量35%时仍重建缩小。最终同一满雪共享缓冲为53,351,426字节，比旧版少6,484,744字节（6.18 MiB）；这不是浏览器整体收益。paired-after-6/12属于12.5%候选，不能列作最终版本；final-source记录最终源码指纹，所有历史结果保留。

最终2%版本的定向证据：

- `node scripts/inspect-snow-buffers.mjs --browser --tag=final-`：通过。16/16组双DPR截图逐像素相同；6档雪量的活动属性/索引/材质分组、7992次世界落点、5时刻雪花实例矩阵与旧版一致；两次近邻雪量更新GPU缓冲创建32→0。输出 `final-browser-checks.json` 和 `final-*.png`。
- `node scripts/inspect-snow-buffers.mjs --lifecycle --tag=final-`：9项通过，包括同量共享、异量保留原面、合流释放旧帧、全部持有者更新才复用、稀疏缩容、实际在途任务取消、同key重建、最后持有者释放和正式键未写入。输出 `final-lifecycle-checks.json`。
- `node scripts/inspect-snow-promotion.mjs --verify --out=artifacts/editor/snow-buffers/targeted`：原雪景模块13/13通过，页面/控制台错误0；覆盖体积/接缝/草埋没/道路、真实雨雪落点、四时段灯池、四向旋转搬动删除撤销轮廓、部位替换/缩略图/预览资源隔离、统一计时、新旧UI文件导入导出、5类非法输入原子拒绝、刷新ID及环境恢复。使用新的独立测试profile/review键，正式键为空。没有运行整项目回归。
- `node --check`：四个变更共享运行文件与两个变更检查脚本均通过；收尾 `git diff --check` 通过，预览HTTP 200。
- 本轮保护清单112文件，首次复核111一致，仅其他窗口的 `sakura-house/interior/README.md`变化；收尾复核107一致，同目录另有 `kitchen-room.js`、`preview.html`、`preview.js`、`sakura-interior.glb` 并发变化，均非本轮写入，保留原样。三栋外观、雪配置/准备数据、时钟/保存源文件不变；主入口及灯光也与本轮开始指纹相同。历史53外观指纹检查本次亦通过；未修改历史检查基线。收尾证据为 `final-integrity.json`。

### 性能与未通过项

硬件/协议：本机 Chrome 155、ANGLE D3D11／RTX4060 Laptop，1280×800、DPR1；三种建筑每种2/4栋，3×2／3×4有效格全部由建筑占用，无额外大片草地或道路。道路/草地的功能与视觉由上面的13组检查覆盖，不将紧凑布局性能外推到大地图。帧率窗口至少6秒/180帧；每次全新隔离Chrome、无强制GC或分配剖析。内存为隔离Chrome进程（含GPU）私有提交量之和，表中是离散采样最高值，不是连续采集的瞬时峰值、物理RAM或单纯雪景缓冲。1800 MiB诊断目标/1900 MiB保护线保留。

共同命令前缀：`node scripts/diagnose-snow-memory.mjs --bench --count=N --limit=1800 --frame-ms=6000 --dynamic --out=artifacts/editor/snow-buffers`。

| 实际命令的额外参数/证据名 | 结果 |
| --- | --- |
| N=6，`--source-dir=artifacts/editor/snow-buffers/before-source --label=paired-before-6` | 旧版完整一轮，采样最高1471 MiB；夜晚1257 MiB／48.9 FPS，积雪43.4 FPS；退出0 |
| N=6，`--label=final-after-6` | 新版完整一轮，采样最高1415 MiB；夜晚1244 MiB／73.9 FPS，积雪46.0 FPS；退出0 |
| N=12，`--source-dir=artifacts/editor/snow-buffers/before-source --label=paired-before-12` | 旧版单轮完成，采样最高1836 MiB；夜晚1550 MiB／47.6 FPS，积雪43.6 FPS；超过1800，退出1 |
| N=12，`--rounds=3 --source-dir=artifacts/editor/snow-buffers/before-source --label=before-12-cycles` | 第一轮采样最高1809 MiB；第二轮雨融1904 MiB触发保护，89.5秒停止，第三轮未运行；退出1 |
| N=12，`--rounds=3 --label=final-after-12-cycles` | 第一轮采样最高1683 MiB；第二轮重新满雪1804 MiB已超诊断线；第三轮重新满雪1923 MiB触发保护，102.6秒停止，第三轮后续未运行；退出1 |

同三轮协议的第一轮，12栋采样最高1809→1683 MiB（约少126 MiB/7%）；6栋单轮1471→1415 MiB（约少56 MiB/4%）。新旧两轮夜晚帧率分别24.3–25.3→26.3–28.5，积雪21.9–33.0→23.6–24.6；不能宣称动态帧率稳定提升，最慢一帧仍约0.1秒。6栋无雪对照也出现72.2→119.7 FPS，旧版12栋两次无雪76.4/44.4 FPS，说明机器/运行时波动显著，不能将全部帧率差归功于修改。所有原始采样、p95、长帧与硬件信息见 `comparison.json` 及对应运行JSON，未挑选最快结果作为保证。

三轮检查前后均没有 PAGE_CRASH；**均未完成三轮，不是压力通过**。旧版第二轮雨融停止，新版延后到第三轮重建停止；证明本轮缓解了短程占用，但没有证明可长期反复下雪。每次清雪后应用级sources/workers/frames归零，GPU几何数热身后不再逐轮增加；浏览器私有提交量和主线程backing storage仍增长。其剩余增长尚未通过堆保留链/强制GC诊断区分为真实引用泄漏、回收延迟或分配器驻留，不宣称已查清具体根因，也不把强制GC当解决方案。

未运行：整项目回归、数小时/100建筑/移动端、12栋DPR2性能、真实用户浏览器配置；2倍像素密度只做3栋画面/缓冲检查。所有测试不读取用户原浏览器profile或地图；服务保留运行，不提交、不推送、不发布、不清理旧产物。本轮已制作并正式接入共享运行实现；保真/资源/编辑/保存技术通过，循环内存目标未通过，正式街区画面仍由用户审看。后续应以同一三轮超线复现继续定位重建峰值，而非放宽保护线。
