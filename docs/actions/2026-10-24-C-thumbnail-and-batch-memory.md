# 编辑器预生成缩略图与合批资源释放

## 状态与情况

- 状态：Completed（本轮两项优化、定向验证和对照完成；整体内存/帧率问题尚未全部解决）。用户授权先处理预生成缩略图、合批遗留资源，保留建筑/雪景细节与现有逻辑，完成 6/12 栋内存、帧率及画面对照，不提交或推送。
- 依据：[独立诊断](2026-10-24-C-memory-independent-diagnosis.md) 已完成复现、归因和隔离实验，本轮接续修复阶段，不重复全部诊断。缩略图启动时会临时构造所有资产；樱家和みつや合批后仍用所有权集合持有原几何。
- 保护其他窗口未提交修改。以本轮开始时的工作区源码为 before，不用 HEAD 取代当前交付。正式存档不访问，全部测试使用独立浏览器与 review 存储。
- 不改变几何/材质/光照/雪量精度、雪生成调度、编辑与保存协议；不启停服务、全项目回归、清理、提交、推送或发布。

## 实施措施

1. 保存必要的 before 源码及全运行文件指纹，记录当前 Git 状态；复用原三轮 6/12 栋压力协议。
2. 用原 `renderThumbnails` 生成 280×190 PNG，正式首页直接读取图片；提供可重复生成与检查入口，确保全部可选素材覆盖及画面一致。
3. 在资产完成合批后释放不在最终模型树上的自有几何，并从所有权集合移除；保留全部在用几何和每实例所有权。
4. 检查实际工厂的遗留资源、可见数据与释放隔离；6/12 栋 before/after 各两次三轮，画面对照独立于性能采样。
5. 更新当前状态与交接，报告内存和帧率实际结果，不把采样改善当成长期 OOM 已解决。

## 影响文件树

实际修改与新增（没有删除文件）：
- `dist/main.js`：仅缩略图来源替换。
- `dist/town/editor/thumbnails.js`、`dist/town/editor/thumbnails/`：预生成图片映射与正式 PNG。
- `dist/town/assets/sakura-house/geometry.js`：完成合批时移除无用自有几何。
- `dist/town/assets/mitsuya/workshop.js`、`index.js`：工厂完成后的几何所有权收尾。
- `scripts/generate-editor-thumbnails.mjs`：从原渲染入口生成/校验缩略图。
- `scripts/inspect-thumbnail-batch-memory.mjs`：实际工厂、启动、画面对照与源文件保护检查。
- `scripts/inspect-thumbnail-batch-visuals.mjs`：固定时钟的 6/12 栋图像、数值几何与落点对照。
- `scripts/summarize-thumbnail-batch-memory.mjs`：同协议压力结果汇总，帧率只比较两边共同完成的窗口。
- `artifacts/editor/thumbnail-batch-memory/`：隔离源码、原始测试结果与截图（按已有规则忽略）。
- `README.md`、`docs/architecture/building-status.md`、`docs/handoffs/C-town-editor.md`：维护入口与当前状态。

## 自验方法

- 先让实际工厂遗留几何/启动多余 WebGL 上下文检查报红，再验证修复；独立记录可见几何指纹、三角面、材质和实例释放。
- 原压力脚本：`node scripts/diagnose-snow-memory.mjs --bench --count=6或12 --limit=1800 --frame-ms=6000 --dynamic --rounds=3 --label=唯一标签 --out=artifacts/editor/thumbnail-batch-memory`；before 用本轮源码快照。无强制 GC、GL 包装或性能探针。串行运行，交替 before/after。
- 内存口径保持 CDP 进程列表的 PrivateMemorySize64 总和（MiB），不是显存；RAF 回调帧率不是屏幕显示帧率。1800 是诊断目标，1900 是保护停止线，不是浏览器 OOM 界限。
- 在隔离画面检查中固定时钟、环境、机位，对照 6/12 栋晴天、薄雪、厚雪、夜晚和建筑近景；缩略图逐像素对照原渲染。
- 定向检查编辑、保存、雪更新与释放，结束核对并发文件差异；不运行整项目回归。

## 自验结果

- before 源码已保存：88 个 JS；全运行指纹 110 项，初始 Git 状态另存。快照过程中 Node 子进程调用 Git 遭 sandbox `EPERM`，改用 PowerShell 直接记录成功，没有重写已有快照。Chrome 检查使用已授权的隔离本地进程。
- `node scripts/inspect-thumbnail-batch-memory.mjs --before`：预期报红，启动上下文 2；樱家/みつや unused 分别 2486/2577，5,794,408 / 4,673,356 字节；真实释放与邻居隔离正常。
- 修复后同脚本：9/9 通过，上下文 1，两栋 unused 都为 0；80/321 份可见几何释放各一次，邻居 0；可见几何/材质 SHA256 完全相同；正式存档为空，页面错误 0。
- `node scripts/generate-editor-thumbnails.mjs` 与 `--check`：8 张原样 PNG，共 190,936 字节；生成与优化后原渲染器输出字节一致。原渲染器仍保留作为离线生成入口。
- 语法检查：`dist/main.js`、两栋 workshop/geometry 与みつや index，以及新画面脚本通过。
- 旧功能检查的“53 个历史资产源码哈希不变”与本轮授权修改源码冲突，因此从原脚本制作隔离副本，仅跳过这一项；其余 12 项照原逻辑运行，改以本轮可见数据与初始源码审计验证保护范围。原脚本、历史基准均不修改。
- 压力重复、画面与功能检查均完成，性能结论及未通过边界见下文。
- 初次 `inspect-thumbnail-batch-visuals.mjs` 严格字节比较报红：旧首页便利店卡片与离线生成的图片有 15 像素颜色末位差，最大 1/255；其余 7 张字节一致。独立 Canvas 像素读取列出全部坐标，人工查看两图未见细节差异；原失败保留于 `visuals.json`，逐像素列表在 `thumbnail-difference.json`。后续缩略图检查只允许最大 1/255 且至多 20 像素差，场景图仍严格逐像素比较；不把这一结果表述为 8 张都逐像素相同。
- `node scripts/inspect-thumbnail-batch-visuals.mjs --label=visuals-pixels`：19/19 检查通过，6/12 栋各 7 对场景图全部逐像素相同，4 组雪面几何/世界落点数据相同，みつや独立室内几何和 6 种检查视图及屋顶开关一致；页面错误 0。人工查看 12 栋厚雪总览与みつや雪夜近景，画面对照页为 `artifacts/editor/thumbnail-batch-memory/comparison.html`。
- `node artifacts/editor/thumbnail-batch-memory/functional-checks.mjs --verify --out=artifacts/editor/thumbnail-batch-memory/functional`：12/12 通过，包含雪面厚度/实体落点、地块接缝/道路/草、四时段、增删移转/撤销、部位替换释放、统一时钟、真实文件导出导入/非法原子拒绝、刷新与稳定实例 ID。页面/控制台错误 0，正式存储未触碰。

### 实际实现与资源边界

- 正式首页仅改为导入图片映射。8 张 PNG 共约 186.5 KiB；不新增运行时模型缓存、缩略图渲染器或帧循环，素材卡片与交互不改。生成脚本沿用原工厂与渲染函数，新增/换版后的维护入口已写入 README。
- 樱家在 `finish()` 后、みつや在全部构造完成后调用 `w.finish()`，遍历最终树（包括隐藏节点），仅对不再使用的自有几何执行 `dispose()` 和集合删除。没有在每次局部合批中提前清理，避免中间组尚未挂入最终树时误释放。材料、纹理、最终几何、实例资源隔离与雪源不变。
- 每栋被移出所有权集合的缓冲字节合计约 5.53 / 4.46 MiB；这是结构统计，不等同于可立即回收的进程内存，其他引用和浏览器回收时机仍会影响实际结果。

### 6 / 12 栋同机性能对照

8 次均完成全部三轮，页面错误和 PAGE_CRASH 都为 0；没有触发 1900 MiB 保护停止。12 栋 before 两次及 after 第一次超过 1800 诊断目标并以 exit 1 记录，不能把这些结果称为压力全部通过。

| 建筑数 | 晴天稳态 MiB，前→后 | 三轮采样峰值均值 MiB，前→后 | 晴天 FPS，前→后 | 动态积雪 FPS，前→后 | 积雪 P95 ms，前→后 |
| --- | --- | --- | --- | --- | --- |
| 6 | 1098.4 → 972.2 | 1485.3 → 1468.7 | 137.9 → 137.9 | 74.4 → 71.0 | 18.6 → 20.9 |
| 12 | 1312.8 → 1237.6 | 1860.3 → 1784.7 | 73.2 → 71.8 | 37.3 → 33.6 | 46.3 → 52.1 |

- 每侧两次独立浏览器，3 种建筑（樱家/便利店/みつや）各 2 或 4 栋，1280×800、DPR 1；Chrome 155.0.8059.85、RTX 4060 Laptop / ANGLE D3D11。每个帧率窗口约 6 秒，晴天均值来自 2 个窗口，动态积雪来自 6 个窗口；不是显示器实际呈现帧率。
- 6 栋峰值 before 1485.16 / 1485.42，after 1465.59 / 1471.81 MiB；12 栋 before 1856.77 / 1863.76，after 1811.69 / 1757.62 MiB。6 栋雪景峰值仅小幅下降约 17 MiB；12 栋约下降 76 MiB，仍有一次超过 1800，不能承诺长时无 OOM。
- 夜晚厚雪 FPS：6 栋 84.4→83.3，12 栋 43.1→40.1；雨融 FPS：6 栋 111.3→108.7，12 栋 54.8→48.9。没有证实稳定提速；12 栋第一对动态 FPS 均值 39.7→31.3，反向顺序第二对 34.9→35.9，存在明显运行波动，不能将整体均值差完全归因于本轮代码。全部数据保留，不挑最好的一次。
- 顺序：before-6-a → after-6-a → before-12-a → after-12-a →（独立保真/功能检查）→ after-12-b → before-12-b → after-6-b → before-6-b。性能运行之间没有并行启动本轮其他 GPU 检查；没有强制 GC、GL 包装、Profiler 或修改雪量精度/更新频率。
- 原始报告为 `artifacts/editor/thumbnail-batch-memory/{before,after}-{6,12}-{a,b}.json`。全部使用 `--bench --limit=1800 --frame-ms=6000 --dynamic --rounds=3`，分别指定对应 `--count`、`--label`、`--source-dir=.../{before,after}-source` 与本轮 `--out`；第二组串行执行脚本和完整日志保留在同目录。`node scripts/summarize-thumbnail-batch-memory.mjs` 已执行，汇总为 `performance-summary.json`。
- 24 个清雪检查点的雪资源池 sources/workers/queued/clients/frames 均归零；阶段采样可能漏掉阶段间瞬时峰值。进程总和包含 CDP 报告的隔离 Chrome 进程，并不测显存，也沿用前轮口径不纳入约 2.5 MiB 的 crashpad-handler。

### 并发保护与交付

- 起始 110 项运行文件：103 项最终指纹不变，本轮按授权修改 4 项；另 3 项樱家室内 index/preview.html/preview.js 是其他窗口修改，原样保留。before/after 快照里也含当时室内变化，但正式编辑器资产工厂不加载这些室内模块；不影响本轮比较。
- 正式 5 个本轮 JS 文件（4 个修改 + thumbnails.js）与实际 after 测试快照 5/5 一致，未发生测试后换源码；`final-source-audit.json` 保留逐文件证据。既有共享雪模块、光照、布局/保存、模型材质与生成参数均未在本轮改动。
- 新增正式 PNG/映射/manifest 不被 Git 忽略；`git diff --check` 与新增脚本语法检查通过。HEAD 仍为 `a0b9143cbbd12425e295eaa5789df785d8775a8b`，暂存区为空。没有提交、推送、发布、服务启停或清理。
- 对照页已在独立浏览器实际切换 6/12 栋和场景，图片正常解码（1280×800）；人工查看 `comparison-preview.png`，前后并排布局与说明可读。最终汇总复核确认 8 次运行、24 轮/清雪池释放、14 对精确场景图、8 个正式图片文件均与记录一致。
- 未运行整项目回归、多小时、100 栋、12 种独特资产、DPR 2 性能或其他硬件。14 对技术保真检查不替代用户全镇雪景/夜景美术认可。
- 本轮已经降低晴天常驻开销；下一阶段应针对雪面更新后的实际绘制/查询/阴影成本继续定位，不能以降细节或减雪量精度换取通过。
