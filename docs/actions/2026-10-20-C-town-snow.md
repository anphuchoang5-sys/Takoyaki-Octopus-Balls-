# C：全镇时段与雪景

## 状态与情况

Completed（调整后 C 负责的环境运行层范围；建筑专属造型已暂停移交，画面待用户认可）。2026-10-20 最初授权全镇时段、雪景及建筑雪层；**执行中用户调整分工：建筑专属积雪造型改交建筑美术窗口，C 立即暂停该造型工作，保留已有内容不删改回退。** C 完成时段与夜景、统一雨雪/遮挡、道路及地图地面积雪、积融雪时钟、存档和建筑接口接入。已实际查看指定参考图。原正式入口只有晴雨，みつや night-10 新灯光描述未消费，樱家 exterior-04-roof 旧白名单没有 snow，存档不含环境。

保留布局稳定 ID、v1 布局和原存档键，保留原造型及编辑操作。只做必要语法和定向验证，复用已运行的 4173 服务；不启停服务、不运行整套历史回归、不清理旧文件、不提交/推送/发布。测试独立浏览器存储。人物、季节、室内进出及其他天气不在范围。

起始工作区已有他人文档修改：B-mitsuya-night 行动记录、B-sakura-house/C-town-editor 交接，以及新建 architecture 目录与环境架构行动记录。过程中新增的 AGENTS.md 已阅读，保留其他窗口内容。用户已明确采用匀速/昼夜同速/后台暂停；旧文件导入保留当前环境，首次旧存档恢复默认下午晴天无雪；便利店招牌原亮度保留。

## 实施措施

1. 接通单一环境状态、四时段天空和照明；新灯光描述优先，位置及目标完整世界变换，保留 10 点灯/4 聚光限额。
2. 已写出的共用实体雪工具和三栋初稿保留；专属造型暂停、交建筑美术接手。地面/道路仅由地图生成，建筑地块仍由建筑负责，不双重覆盖。
3. 单宿主时钟驱动六角飘雪、遮挡、60 秒积雪、晴天 300 秒/雨天 60 秒融雪；残雪雨落点抬升。
4. 带版本的布局+环境封装，旧布局兼容、完整验证后原子应用；环境推进不进入布局撤销历史。
5. 定向浏览器检查与截图，记录运行证据、性能观察和画面待认可范围。

## 实际影响文件树

- `dist/main.js`：环境宿主、时钟、保存和公开接口。
- `dist/town/editor/{environment,document,ground-snow,snowfall}.js`（新增）：单一环境状态、街区文件事务、连续地面雪与六角飘雪。
- `dist/town/editor/{persistence,runtime,lighting,scene,weather,grass,ui,ui-shell,rain-surfaces,state,convenience-scene}.js`：保存/旧接口、灯池、编辑事件与雪面接入；布局历史仅追加导入撤销上下文。
- `dist/editor-preview/snow-review.js`（新增）：显式审看 URL 的独立布局与存储键。
- `dist/town/assets/shared/{snow,environment-rules}.js`（新增）：雪体几何/采样/资源工具与共用夜灯开启规则。
- `dist/town/assets/{sakura-house,mitsuya,convenience}/snow.js`：各建筑适配的雪层。
- 建筑现有环境/工厂及编辑器便利店组合适配：必要兼容、资源生命周期。
- `dist/town/assets/{sakura-house,mitsuya}/{index,environment}.js`：工厂挂接已有初稿、樱家 snow 兼容、みつや共用灯规则；原建筑几何代码没有重做。
- `scripts/inspect-town-snow.mjs`、`scripts/inspect-town-snow-storage.mjs`（新增）：本轮定向检查，不修改历史基线。
- `artifacts/editor/snow/`：截图、状态轨迹及检查结果。
- `README.md`、`docs/handoffs/{C-town-editor,C-building-snow-draft}.md`、`docs/architecture/{README,environment-contract,building-status,open-questions}.md`：当前入口/接口/状态与建筑初稿交接。保留他人已写的旧记录，明确历史快照。

## 自验证方法

对修改的 JS 执行 `node --check`。在现有 HTTP 服务中使用独立 Playwright context，验证四时段、雪量时间规则、遮挡、变换/删除/撤销/轮廓、保存刷新、新旧及非法导入、实例资源隔离、灯池上限，并截图实际画面。时间推进使用同一运行控制器输入的累计秒数，另记录实际帧推进观察；不将加速采样冒充真实等待。

## 自验证结果

1. 对实际修改/新增的 **28 个 JS/MJS 执行 `node --check`，全部通过**；逐文件 SHA256 和结果在 `artifacts/editor/snow/syntax.json`。定向 `git diff --check` 无输出。正式雪源码未被忽略规则排除；保持未提交状态。
2. `node scripts/inspect-town-snow.mjs`：**15/15 核心项通过，页面/控制台错误 0**。涵盖四时段、新灯描述位置/目标、积融雪速率与连续切换、宿主真实时间、雪体/首接触面、旋转搬动删除撤销及资源隔离、轮廓变更、残雪雨点、新旧/非法导入事务、保存刷新、旧存档保护、有限灯池与性能。结果 `inspection.json`。
3. `node scripts/inspect-town-snow-storage.mjs`：四种道路形状、实际文件下载/选择导入及非法反馈、关闭后恢复通过。后台测试得到 `document.hidden=false`，**真实切后台未运行**，不计通过，保留代码核对。初次损坏保存测试失败是测试设置：在旧页面仍运行时写入损坏原文，随后 pagehide 合法保存覆盖了测试种子；不是“启动读取损坏存档”场景。初次失败证据保留在 `storage-inspection.json`。
4. 修正为下一页面启动前注入原文后，仅运行 `node scripts/inspect-town-snow-storage.mjs real-browser-corrupt-save-not-overwritten snow-normal-and-legacy-weather`：**2/2 通过，错误 0**。实际原文保留并显示自动保存暂停；新增雪面法线随建筑旋转正确，旧 weather.setWeather 入口也进入统一状态。结果 `storage-inspection-followup.json`，未修改历史检查基线。
5. 独立审看入口定向浏览器检查通过：实际点选夜晚/晴天，6 个实例正常，正式存储标记完全不变，独立存档写入正确、错误 0。证据 `review-inspection.json`。
6. 时间证据：同一环境控制器累计秒数输入 0/15/30/60/90 秒得到 0/.25/.5/1/1；转晴 60 秒后 .8、300 秒后 0；转雨60秒融完，重下雪从残量继续。60 FPS 分步输入与一次60秒一致。该长过程是确定性累计秒数检查，**不是实际等待五分钟**。宿主真实运行观察 3.2221 秒积雪 .0537017，布局 revision 保持7；关闭2.5秒没有推进离线雪量（重开后仅增加首帧实际运行时间）。
7. 6栋建筑+3条道路、夜晚满雪，短时观察约 **67 FPS**、5136 draw calls（含阴影等多通道）、约235万三角形；点灯需求15仅分配10，聚光4。不是100建筑压力测试，也不承诺所有设备帧率或远处每栋都有局部光。

普通沙箱首次启动 Chrome 得到 EPERM，后续经自动审批在独立测试 Chrome 执行。全过程复用已有4173服务，没有启停服务、运行旧整套回归、删除旧文件、提交、推送或发布。原换行字节中存在混合形式，已对未改行恢复原字节，避免无意义整文件差异。

## 画面证据与限制

- `01-morning/afternoon/dusk/night.png`：三栋同街区四时段；黄昏亮灯、夜间道路可辨。
- `02-thin-snow-night.png`、`03-thick-snow.png`、`06-snow-after-clear.png`、`07-town-night-snow.png`：薄/厚雪、雪后晴天、夜雪。
- `04-sakura-house-snow.png`、`04-mitsuya-snow.png`、`05-mitsuya-night-snow.png`：建筑初稿联调近景，不是建筑雪美术认可证据。
- `08-thaw-restored.png`、`09-four-road-shapes.png`：融完原貌、四种道路的薄中央/厚两侧。
- `10-review-entry.png`、`11-review-controls.png`：独立可操作入口与环境控件。

已修正地图格子雪面接缝和偏暗雪花，地图雪面为闭合体积、非自发光；厚雪通过实体高度配合草叶压低遮住长草，零雪量恢复。建筑地块与邻地最终衔接仍须在美术成品交付后联调。三栋专属雪层仍是暂停初稿；招牌遮挡、小物贴合、樱家残雪上的原滴水/光斑高度等见 [移交说明](../handoffs/C-building-snow-draft.md)。

“已制作/技术通过/正式接入”仅覆盖上述 C 运行层范围；建筑雪初稿不标完成。全镇夜景、地面雪与飘雪均**待用户画面认可**。后台真实隐藏验证、100栋压力、人物/季节/室内进出及历史整套回归均未运行或未制作。交付后等待用户审看，不继续扩展任务。
