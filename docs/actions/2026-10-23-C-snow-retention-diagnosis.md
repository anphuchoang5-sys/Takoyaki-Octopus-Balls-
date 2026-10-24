# C：反复积融雪内存增长的多轮诊断

## 状态与情况

2026-10-23，Completed（多轮诊断与隔离反事实实验；不是正式修复完成，也不是历史OOM根因全部闭环）。用户要求“开始定位问题+多轮诊断”。本轮针对12栋反复积雪/雨融/清雪后的增长，区分真实持有、回收延迟、GPU/分配器驻留及测量工具影响；正式运行代码只读，实验使用隔离浏览器与请求拦截，不先做猜测性的优化。继续保留全部细节、逻辑、存档键和其他窗口改动。不委派、不提交/推送/发布、不清理文件、不跑全项目回归；复用已获准启动的本地服务。

上轮已运行且可重复的失败入口：`node scripts/diagnose-snow-memory.mjs --bench --count=12 --limit=1800 --frame-ms=6000 --dynamic --rounds=3 --label=final-after-12-cycles --out=artifacts/editor/snow-buffers`，第三轮重新满雪1923 MiB触发1900保护停止；旧版第二轮雨融1904 MiB停止。保护线不是浏览器硬上限，两者未实际OOM。本轮先核对当前运行指纹与现有结果，再重放/最小化。

## 实施措施

1. 固定布局、尺寸和状态切换，复用原1800/1900诊断与保护线。先复现增长，再缩小到仍能出现持续增长的最小场景。
2. 排序提出可证伪假设：检查工具持有；应用对象/缓冲持有；已不可达但回收延迟；GPU/原生驻留。单变量实验不与基准性能混跑。
3. 记录进程分项、主线程/Worker堆及后备存储、活跃GPU资源；每轮清雪同状态比较。堆快照/强制GC仅作诊断，不混入正常运行收益，也不作为产品修复。
4. 对有增长的对象读取堆快照及引用链，必要时在最小复现上抓分配堆栈；只对证据指向的代码进行隔离反事实试验，再用原12栋循环验证。
5. 记录已证实与仍未证实原因、具体修改措施和剩余风险；更新交接/状态，原历史失败结果保留。

## 影响文件树

- `scripts/diagnose-snow-memory.mjs`：按需增加诊断开关与快照，保持既有基准行为与保护线。
- `scripts/analyze-snow-retention.mjs`：堆快照分组和强引用路径分析，仅检查用途。
- `scripts/create-snow-retention-probes.mjs`：生成隔离请求替换与坐标量化差分检查，正式源码只读。
- `artifacts/editor/snow-retention/`：当前指纹、循环结果、堆证据、最小化与隔离试验。
- 本记录、编辑器交接和架构状态表：实际结论。
- `dist/`：只读；实验通过隔离HTTP请求替换，不写入用户正式运行代码。

## 自验证方法

每个实验对应一个预测，保留命令和失败信号；同状态比较，避免把累计分配、驻留、峰值或GPU资源计数混为一谈。正常基准与GC/堆快照分开；保护线触发后停止该测试。正式浏览器profile不读取，测试存储隔离。修改前重读文件并保护并发工作。

测量标志：`bench`关闭GL包装采样，早期stdout里的buffers/programs为0是未测占位，不是GPU资源为零；`noWorkerInspection`下workers数组为空表示未读取Worker堆，真实数量看scene.pool.workers。脚本现已将未测GL摘要显示为null、Worker摘要使用实际池数量。原始记录不重写。

## 自验证结果

正式6个运行文件与上轮final-source指纹一致。原命令 `--label=repeat-baseline --out=artifacts/editor/snow-retention` 再次失败，第三轮重新满雪1944 MiB触发保护。缩小 `--bench --count=3 --cycle-only --dynamic --rounds=4 --limit=1800 --label=min-three`，清雪总量990→1074→1172→1163 MiB，而主线程堆/后备并未持续增长、GPU几何652/纹理63稳定；增量主要在应用renderer进程。

`--label=three-gc-snapshots --clear-gc --snapshot-clear=0,3` 同一三栋4轮，诊断GC后主线程堆+后备约75 MiB稳定。两次完整堆快照总自有字节81,492,288→81,667,216，只增174,928字节；无新增≥100,000字节的大节点，最大增长为JIT代码等小量热身，未看到可解释数百MiB的存活对象增长。此为诊断证据，不是正式性能结果。新增 `scripts/analyze-snow-retention.mjs` 分析快照与强引用路径；原生分配器转储、检查工具影响与原12栋验证继续。

后续证据：12栋仅增加 `--clear-gc` 后完成三轮，峰值1805 MiB（仍超过1800诊断线）；清雪后主线程存活堆+后备196–197 MiB稳定，回收释放进程119/150/150 MiB。三栋关闭Worker检查器仍会增长及回落，检查器不是增长的必要条件。当前代码三次重建的分配采样：Worker `weld` 累计361 MiB、`setAmount` 227 MiB、`indexedFrame` 206 MiB；主线程矩阵/材质上传和逐帧扫描也有大量短命分配。累计分配不是同时驻留量。下一步只在隔离请求中检验：精确量化的数值快路径是否降低分配；最大雪量立即清空临时工作区是否造成反复再分配。保持三角形、法线、边界舍入和雪量逻辑，先差分，再原12栋对照。原生Tracing首轮采集范围过宽、阶段转储不完整，不能据此判定驱动泄漏。

### 最终证据与结论

1. **已确认回收时机是压力的重要组成部分，未发现解释增长规模的主线程存活泄漏。** 三栋堆快照的ArrayBuffer后备总量两次均49,093,210字节、BufferGeometry均1064个、原生WebGLBuffer均3084个；总自有字节仅增加174,928。12栋清雪强制GC能释放119–150 MiB并完成三轮，但这是诊断对照，不能要求产品主动GC，也不能保证不存在其他场景泄漏。峰值为进程PrivateMemory合计，GPU进程的PrivateMemory不是显存读数。
2. **定位到主线程冷启动承雪面采集的大量短命分配。** `snow.js collectSnowSource` 每次零雪后重新启动都扫描原模型；逐三角形创建Vector3/clone/数组，再把普通数字数组转成TypedArray。采样中两个主要分配点合计135.73 MiB。隔离替换为TypedArray写入与临时向量复用后，相应热点约26.25 MiB；并非新增源面缓存。三栋+地图底面4次逐值检查完全一致，三栋均使用原预处理资产，无回退。原12栋协议完成三轮，最高1868 MiB；原版1944 MiB第三轮停止。**仍超过1800诊断目标，不能据单次配对宣称可靠消除崩溃。**
3. **定位到Worker精确坐标量化的字符串分配。** `snow-geometry.js weld` 中 `Number(n.toFixed(6))` 高频运行。只替换为保留边界回退的数值快路径，热点累计分配361.43→5.63 MiB，整个Worker采样累计899.15→546.39 MiB；这些是包含已回收对象的累计采样估计，不是常驻量减少。5,500,011个边界/随机值一致；三栋18帧位置、法线、颜色、索引、顶面索引、分组逐值/哈希一致。但12栋仍在第三轮1953 MiB保护停止，**证伪“修这个热点就能解决压力”**。
4. **不采用全保留工作区。** 单独停止满雪时的scratch清空，三栋首次满雪Worker堆+后备约84→132 MiB，三个重建后进程约1095→1209 MiB；没有证明收益，不推进12栋/正式接入。它不是生产修复候选。
5. **当前还不能归因于驱动泄漏或还原用户历史OOM的唯一链条。** Tracing接口返回成功，但首轮记录过宽（约1.13GB）且导出缺少后面阶段，已标记无效归因证据；修正类别过滤未重跑。实际浏览器OOM未复现，保护停止提前结束测试。6/12栋长期运行、完整自然一分钟积雪/融雪、多次移动删除与用户原地图本轮未运行；现有历史保真/存档结果不冒充本轮新验收。

### 可复核命令与结果

所有浏览器命令均为 `node scripts/diagnose-snow-memory.mjs --bench --limit=1800 --out=artifacts/editor/snow-retention` 加下列参数，使用独立profile与`?review=snow`。`cycle-only`缩短停留，仅用于诊断；原12栋协议未缩短。

| label | 补充参数（另加对应 `--label`） | 实际结果 |
| --- | --- | --- |
| repeat-baseline | `--count=12 --frame-ms=6000 --dynamic --rounds=3` | 第三轮1944保护停止 |
| min-three | `--count=3 --cycle-only --dynamic --rounds=4` | 4轮完成，清雪990/1074/1172/1163 |
| three-gc-snapshots | 上行加 `--clear-gc --snapshot-clear=0,3` | 4轮完成，快照增174,928字节 |
| three-native | min-three参数加 `--no-worker-inspection --native-dumps` | 流程完成，转储不可用于完整阶段归因；不是单变量性能对照 |
| three-no-inspector | min-three参数加 `--no-worker-inspection` | 4轮完成，清雪979/1184/1048/1019，增长/回落仍存在 |
| twelve-clear-gc | repeat-baseline参数加 `--clear-gc` | 3轮完成，最高1805；诊断线未通过 |
| three-allocation-profile | `--count=3 --cycle-only --rounds=1 --profile` | 采集主线程/Worker三次重建分配栈 |
| three-quantize-profile | 上行加 `--source-dir=artifacts/editor/snow-retention/numeric-quantize` | weld累计361.43→5.63 MiB |
| twelve-quantize | repeat-baseline参数加上述source-dir | 第三轮1953保护停止 |
| three-scratch-profile | three-allocation-profile参数加 `--source-dir=artifacts/editor/snow-retention/keep-scratch` | 常驻增加，不采纳 |
| three-cold-profile | `--count=3 --cycle-only --rounds=1 --profile-main-cycle` | 冷启动主线程采集热点定位 |
| three-source-exact | `--count=3 --cycle-only --rounds=1 --source-dir=artifacts/editor/snow-retention/verify-packed-source` | 原建筑3种+地图底面，共4次采集完全一致 |
| three-packed-profile | three-cold-profile参数加 `--source-dir=artifacts/editor/snow-retention/packed-source` | 采集热点约136→26 MiB |
| twelve-packed-source | repeat-baseline参数加上述packed-source目录 | 3轮完成，最高1868；诊断线未通过 |

`node scripts/create-snow-retention-probes.mjs --geometry`：5,500,011个量化值、18组雪面数据通过。`node scripts/analyze-snow-retention.mjs three-gc-snapshots-clear-0.heapsnapshot three-gc-snapshots-clear-3.heapsnapshot`：快照分析完成，无新增≥100,000字节的大存活节点，无此类节点的新增持有链。三个本轮诊断脚本分别`node --check`通过；全项目回归未运行。

原始结果与汇总：`artifacts/editor/snow-retention/round-summary.json`、`heap-analysis.json`、各label JSON与采样栈、`quantize-differential.json`、`quantize-geometry.json`、`final-integrity.json`。14个隔离浏览器实验均无pageerror/PAGE_CRASH，每个采样正式存储键为空；其中两项按1900保护停止，两项完成原协议但未达1800目标。这些是明确失败/限制，不修改历史基线。正式6个运行文件末尾再次核对6/6指纹一致；其他窗口脏文件保留。

### 具体修改顺序与交接

- 第一优先：整理并正式实现`collectSnowSource`的数值缓冲写入、临时向量复用，保留真实遍历、局部矩阵、选择规则和相同输出。禁止用缓存旧位置替代真实数据；增加旋转/搬动/重建及全部现有资产的逐值核对后再正式接入。
- 第二优先：精确量化快路径，保留半单位边界、负零、大数的原路径；结合实际资产数据扩充差分。它已证明减少分配，但不能单独作为OOM修复交付。
- 继续针对重建传输/工作缓冲与主线程材质/矩阵上传采样，先证明实际峰值减少再改；不盲目增大永久缓存或删细节。后续正式修改仍需6/12栋重复压力、保存与编辑定向验收。
- 本轮没有正式接入以上实验，不改变建筑、雪量/遮挡逻辑、存档键/内容，不做美术认可判断。保留原始失败证据与诊断产物，未自动清理；原生大trace仅供排查采集失败，不纳入运行依赖或发布包。
