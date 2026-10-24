# C → 用户 / 后续运行层：地图编辑器、道路与统一晴雨

## 2026-10-24 预生成缩略图与合批资源释放

- 已制作、正式接入：`main.js` 使用 `editor/thumbnails.js` 的图片映射，8 张真实模型 PNG 保留原渲染器/灯光/机位；启动不再构造全部缩略图模型及额外 WebGL 上下文。新增素材或外观/机位换版后运行 `node scripts/generate-editor-thumbnails.mjs` 并一同交付生成文件，`--check` 在相同浏览器/字体/GPU 下严格重绘核对。
- 樱家 `finish()` 清除合批后不在最终树上的自有几何；みつや在所有组挂接完成后调用 `w.finish()`。遍历包括隐藏节点，避免局部合批阶段误释放仍会使用的中间组；模型、材质、环境/雪接口、实例 ID 与存档格式均保留。
- 技术检查：资源/启动9项、雪/编辑/存档12项；6/12栋14对场景图逐像素相同，4组雪面及落点数据、みつや独立室内几何/切换一致。缩略图7张相同，便利店15像素差1/255已保留初始严格失败与逐像素证据。其他窗口室内修改未覆盖，正式存储未触碰。
- 性能边界：前后各两次三轮，6栋晴天1098→972 MiB、雪景峰值均值1485→1469；12栋1313→1238、1860→1785。12栋新峰值1812/1758仍非稳定低于1800；动态积雪FPS均值6栋74.4→71.0、12栋37.3→33.6，没有证明提速。8次均完成三轮，无PAGE_CRASH，不能外推长期无OOM。
- 全部原始数据、前后源码、画面对照页与失败边界见[行动记录](../actions/2026-10-24-C-thumbnail-and-batch-memory.md)。后续重点仍是雪面交付后的查询、阴影和绘制成本，保留细节。未提交、推送、发布、启停服务或清理。以下各节为历史快照。

## 2026-10-24 承雪面采集与精确量化正式优化

- 已制作、正式接入：`shared/snow.js`直接写数值缓冲并复用临时向量；`shared/snow-geometry.js`使用保留十进制边界/负零/大数回退的量化快路径。没有新增持久缓存或计时循环；真实几何、材质、0.005雪量档、宿主时钟、遮挡和实例/存档接口不变。
- 保真与功能技术通过：5500011个量化坐标、18帧雪面、15组旋转/移动承雪源、7992个世界查询和雪花矩阵一致；完整复测16对双DPR图像逐像素一致，初次一个像素差1/255保留在行动记录。编辑/保存13项、资源生命周期9项通过；35个本轮保护文件、53个历史外观文件指纹一致，用户地图未访问或覆盖。
- **性能仍未全面达标**：前后各两组三轮。6栋采样峰值均值1549→1513 MiB，动态积雪78.6→70.5 FPS；12栋1921→1834 MiB，39.2→36.5 FPS（帧率只比共同完成的前两轮）。12栋旧版两次第三轮约1920保护停止，新版两次均完成三轮、峰值1831/1836，但仍超过1800目标。没有实际PAGE_CRASH，不能保证长期不崩溃，也不能说整体更流畅。
- 独立计数确认生成提速后同约6秒积雪交付35→49次、阴影请求75→105次；这增加后段绘制工作，但不证明解释全部FPS差异。后续重点是交付后的上传/查询重建/阴影成本，不能以降低精度或产品强制GC换取通过。
- 同机协议、全部成功/失败数据、未运行边界和文件清单见[本轮行动记录](../actions/2026-10-23-C-snow-transient-allocation.md)。正式审看仍为`http://127.0.0.1:4173/?review=snow`，独立存储；用户画面认可沿用既有状态。未提交、推送、发布、启停服务或清理。以下各节是历史快照。

## 2026-10-23 反复积融雪多轮诊断（无正式运行变更）

- 已完成隔离诊断：确认回收延迟及承雪面扫描/顶点量化的短命分配热点；三栋清雪后堆快照仅增约0.17 MiB，未见足以解释增长规模的主线程存活泄漏。没有证实驱动泄漏，也未复现用户历史实际OOM。
- 原12栋三轮在1944 MiB保护停止；只优化源面采集的隔离实验完成三轮、最高1868，仍未达1800诊断目标。量化实验保真一致且减少累计分配，但12栋仍1953停止，不能把热点减少当成问题已修复。
- 正式6个运行文件6/6指纹不变，用户存档未触碰。具体修改顺序、14项实验、失败与未运行边界见[多轮诊断记录](../actions/2026-10-23-C-snow-retention-diagnosis.md)。下一步先处理源面采集，再做精确量化及原协议复验；不采用全保留scratch，也不靠产品强制GC。

## 2026-10-23 雪面共用坐标与显示缓冲验证

- 已制作、正式接入：顶面落点用Uint32索引读取当前可见Float32坐标，移除另一套顶面坐标；几何/法线/面顺序/分组和雪花每帧真实查询不变。全部持有者一同更新且容量足够时复用GPU属性；异量实例保留原面。容量预留2%，低于35%时缩容，最后引用照常释放。
- 保真与功能技术通过：18帧／90000离线落点、7992世界查询及雪花矩阵一致；最终16/16双DPR画面逐像素相同，近邻两次更新GPU新缓冲32→0；资源9项、现有雪/编辑/存档13项通过，错误0，用户存档未读写。建筑专属造型和公共环境/保存接口不改。
- **内存压力未全面通过**：6栋单轮采样最高1471→1415 MiB；同三轮协议的首轮12栋1809→1683。但旧版第二轮雨融1904、新版第三轮重建1923 MiB均触发1900保护停止，均未完成三轮；不是浏览器实际崩溃，也不能说反复下雪已安全。帧率波动大，未证明持续提升。
- 精确协议、所有成功/失败数据和未运行范围统一见[本轮验证记录](../actions/2026-10-23-C-snow-buffer-validation.md)。正式组合画面仍待用户认可；以下性能数字是历史记录，不能代替当前边界。

## 2026-10-22 渲染缓冲驻留内存修复

- `main.js` 中最后的 OutputPass 明确直接输出屏幕，设置 `needsSwap=false`，不再交替分配两张大场景目标。正式页面实际只分配一张场景 MSAA 缓冲；4采样、HDR、Bloom、像素比上限和建筑/雪面细节保留。没有新增运行框架、资产缓存或循环；若未来改成离屏输出或后面新增读取通道，需重新核对交换语义。
- 已制作、正式接入；30组双DPR画面对照通过（28组完全一致、2组各一个像素颜色末位差1/255），初始与缩放后实际目标数2→1。实际UI新旧文件/非法输入与刷新恢复两组定向通过，正式存储未触碰。建筑、通用雪、时钟/遮挡及存储源文件不改；前轮更广功能结果为历史证据。
- 同轮稳定夜晚厚雪：6栋内存1335→1283 MiB、12栋1652→1529；高像素密度6栋1603→1464。12栋这次完成积雪/雨融/清雪，但1842 MiB仍超过1800诊断目标；稳定画面FPS没有提升，不宣称已全面轻量流畅。完整方法、机器波动及失败线见[驻留内存行动记录](../actions/2026-10-22-C-resident-memory-optimization.md)。以下阴影优化结果为上一阶段记录。

## 2026-10-22 阴影与灯光循环优化

- 正式 `main.js` 接入 `createShadowUpdates({scene,camera,renderer})`，在全部动画更新后比较深度图输入；不变时复用阴影，实际几何/变换/深度材质/灯与阴影相机变化时及时重画。自定义深度、骨骼等未知动画保守逐帧刷新，不改变雪花表面查询、雪量步长、分辨率或模型细节。`update/invalidate/getInspection/dispose` 属于宿主渲染维护接口，`__editor.shadows` 供检查；不写入存档。
- 灯描述仍逐帧读取，10 点灯 + 4 聚光及排序规则不变；复用中间记录/向量，修正仅 `shadowNear` 改变时的投影更新。阴影扫描已更新场景世界矩阵，紧接的渲染跳过重复遍历，完成或报错后恢复场景原标志。释放场景时先释放阴影跟踪，再释放灯/实例。
- 已制作、正式接入；阴影检查 38/38、原雪景/编辑/存档定向 13/13，页面错误 0。53 个原建筑外观文件指纹一致；布局格式、正式存储键与雨雪/积融雪实现未改，独立测试存储不接触用户地图。画面对照 35/37 对完全一致，其余仅 1/255 颜色末位差，详见记录；用户正式画面认可仍单列。
- 同轮配对夜晚厚雪 6 栋 19.0 → 26.2 FPS，12 栋 10.1 → 13.5 FPS；重复绘制明显减少，但总内存只有小幅变化。**12 栋积雪前后都触发 1900 MiB 测试保护线，压力检查未通过**；没有页面崩溃，也不能称为已解决多建筑轻量化。完整方法、机器波动、采样口径与未运行阶段统一见 [本轮行动记录](../actions/2026-10-22-C-shadow-update-optimization.md)。以下 2026-10-21 数字保留为历史结果。

## 2026-10-22 花满橙瓦屋正式接入

- `catalog.js` 使用 `flowerorangebuilding / exterior-04-hanging` 原 `createModel()` 与 `specification`；保留完整对象、14×14 / +Z / 比例 1、环境和释放接口，仅追加缩略图与聚焦机位。当前第四栋可选建筑，学校、公园仍待接入。
- [正式地图审看](http://127.0.0.1:4173/?review=flowerorangebuilding)复用同一个 `main.js`，`flowerorangebuilding-review.js` 只有布局数据。专用键 `rainy-corner.editor.review.flowerorangebuilding.v1`；普通入口原键、布局 v1 / 街区 v2 不变，不自动向用户地图摆建筑。
- 编辑、撤销、保存和多实例资源沿用既有链路。取消可保留一个隐藏 ghost；切换素材、时段/天气或释放场景时销毁。未添加加载系统、室内链接、全局光源或建筑专属雪。
- 原材质实际接受四时段全局光照；统一雨雪按不透明实际几何遮挡，雨水花落在屋顶、院门雨棚或庭院。建筑 `setEnvironment` 只记录状态、灯描述为空；**没有建筑积雪层、湿材质、檐滴、亮窗/局部夜灯或室内**。地图通用雪不会自动附到未注册承雪源的这栋楼：道路/公共地面仍积雪，其建筑格内地坪及屋顶保持原貌。后续接入承雪需另行授权，不改本轮共享方案。
- 定向浏览器检查 10/10、页面/控制台错误 0；工厂完整指纹相同，两个实例每个 115 网格 / 293668 三角面，四向边界 14×14。229 个可见资源释放各一次，邻居零释放；900 个四向实体落点与射线一致。完整过程、地面检查和截图见[行动记录](../actions/2026-10-22-C-flowerorangebuilding-integration.md)。技术通过、正式接入；用户画面待认可，未运行整项目回归或大规模性能测试。

以下保留前三栋环境及历史接入记录，其“三栋”计数不包含本次新增建筑。

> 2026-10-21 分配修复完成：临时容器和内部查询复用、闲置阴影释放、移除重复画布 AA 已正式接入。15组雪面、12对多时段/DPR截图和5个时刻全部雪花数据一致；13组编辑/存档检查通过。310秒连续测试峰值1396 MiB（此前同脚本1454）；累计分配显著下降，但1200 MiB启动诊断仍未通过，6/12栋帧率未稳定提高。完整前后数值、三栋波动复测和限制见 [修复记录](../actions/2026-10-21-C-snow-allocation-fix.md)，起因见 [历史诊断](../actions/2026-10-21-C-snow-diagnosis.md)。

> 上一轮首雪提速记录（2026-10-21）：新浏览器从晴天开始，三栋首次积雪约 1.8／3.3／3.9 秒可见；直接请求满雪（含地面）4.1 秒完成。自然积满仍按 60 秒推进，本机约 67 秒全部显示满雪。310 秒两轮积雪／一轮雨融峰值 1454 MiB，比更早版本 1593 MiB 再降约 9%。历史结果、失败尝试与性能边界见 [上一轮行动记录](../actions/2026-10-21-C-snow-startup.md)；更早崩溃原因见 [历史内存修复](../actions/2026-10-21-C-snow-memory.md)。最新事实以上方分配修复记录为准。

## C v2.7 贴合积雪推广（2026-10-21，当前）

用户已认可第一轮三个小样并明确授权推广。通用承雪现已接入正式地图；正式街区组合画面仍待用户认可，建筑专属美术分工不变。预览：`http://127.0.0.1:4173/?review=snow`，同一正式编辑器代码，使用独立审看存储；普通入口与用户存档不替换。点击“布置街区”打开环境选项，观赏模式左键拖动旋转、滚轮缩放、右键平移。

- 三栋沿用原工厂、稳定 ID、比例与原材质。每栋 `snow.js` 只选择真实朝上表面及参数；通用代码在 `assets/shared/snow*.js` 唯一维护。原手填高度的白板算法已被替换，未叠加第二份雪。
- 零星雪斑 → 连续薄雪 → 厚雪使用真实体积与可见面查询，考虑屋顶、雨棚及陈设遮挡。道路中央薄、边缘厚；公共地面小起伏、草叶逐渐埋没。建筑外沿同时计入正式地图实际存在的 y=0 地面，避免便利店低于地图的装饰外沿形成断层。它是承雪源，不另画地板。
- 原 `setEnvironment({time,weather,snowAmount})`、宿主累计时钟、四时段与灯池保留；布局 v1 / 街区 v2 / `rainy-corner.editor.layout.v1` 不变。环境变化不加入布局撤销。
- `asset.snow.sample(localX,localZ)` 返回当前**已显示**雪面或空隙 `null`，不再支持旧初稿的第三参数任意雪量预测。雨滴落点在显示几何变更时刷新，雪花逐帧取当前表面。
- 分配修复增加内部 `sampleInto(x,z,out)`：建筑/地面容器为 `{y,normal:THREE.Vector3,part}`，世界降水容器为 `{point:[x,y,z],normal:[x,y,z],instanceId,assetId,surface}`。命中返回传入容器，无命中返回 `null`；调用者按返回值使用。原 `sample` 保留独立结果；专属部位只有旧 `sample` 也继续支持。雪面换帧、替换部位和释放时清理查询引用，雪花仍每帧采样当前实际表面，不保留旧落点。
- `asset.snow.getInspection()` 包含 `amount`（请求值）、`shown`（已显示值）、准备/更新耗时、`parts`、共享订阅数、错误状态和 `memory`。同 revision、同雪量共享当前几何；全部持有者更新时可复用其存储，不会改写异量实例仍持有的面。材质/替换部位和资源引用归各实例。全镇至多一个计算 Worker，串行处理最新请求；准备参数用 Float64 表保留原精度，显示数据按位合并重复顶点。没有订阅的历史帧立即释放；零雪量及最后一个实例释放该模型的数据，所有模型清空后终止 Worker。缩略图与晴天零雪量不预先准备。
- `getSnowMemoryInspection()` 从 `assets/shared/snow.js` 导出，返回 `sources/workers/queued/active/clients/frames`，供资源验收；每实例 `memory.geometryBytes` 包含当前共享显示/查询缓冲及预留容量，`memory.queryBytes` 仅含顶面索引和部位表（不含空间分箱）。同源实例不可重复求和，这些值不等于浏览器全部内存。取消中的任务仍占单个计算位置至完成，旧 token 的结果不装入重建后的实例。
- 雪几何按 0.005 雪量档更新，实际开始计算时读取最新请求；所有雪量沿用同一体积生成器，不缓存整套不同雪量网格。底面／侧面直接合并完全相同顶点，数值查找与紧凑雨雪查询索引降低对象分配；串行 Worker 复用有界临时缓冲，所有模型满雪时释放临时工作区。保留原完整三角面与显示数据，不改变 60/300/60 秒计时。
- 三栋各自的 `snow-support.bin.gz` 共 10.285 MiB，是无损的静态承雪准备数据，必须随正式资产交付。首次加载校验格式版本及真实源坐标／部位／选项 SHA256；缺失、损坏或来源改变自动走原生成器。动态地图地面仍现场准备；晴天零雪不提前加载。`getInspection()` 增加 `preparationMode:'asset'|'generated'` 和 `preparationFallback`，可判断是否命中准备数据。
- 维护：B 改变原建筑几何或承雪参数后，在已有预览服务上运行 `node scripts/prepare-building-snow.mjs`，通过正式工厂调用 `asset.snow.getPreparationSource()` 提取源和选项，使用唯一生成器重建各栋数据，五档雪量对比后才写入。若改变准备算法本身，先增加 `snow-prepared.js` 的 `PREPARED_VERSION` 再重建。不得手改二进制或复用失配数据；`getPreparationSource()` 只供维护检查，不是另一套运行接口。无需另建预览或重启服务。
- `asset.snow.replacePart(id, factory)` 按部位替换，`id` 从 `getInspection().parts` 获取，例如 `roof-main`、みつや `shrub-right`、樱家 `shrub-1`。工厂接收 `{snowAmount}`，返回 `{root,setAmount,sample,dispose}`；几何及采样均使用建筑 root 局部坐标。接入后仅隐藏对应通用部位，查询改用专属部位；`factory=null` 恢复通用。专属方不另计时、不加 RAF，仍需完整稀疏/薄/厚/融雪响应。
- 独立小样目录 7 个文件及旧小样检查脚本已移除，共 54,363 字节；正式地图不引用已撤下入口。保留第一轮参考、截图、视频、报告与清理清单；`editor-preview/snow-review.js` 只是正式编辑器的隔离测试布局，没有另一套渲染或雪算法。

最新定向检查及6/12栋对比见[短命分配正式优化](../actions/2026-10-23-C-snow-transient-allocation.md)，此前阶段见[雪缓冲验证](../actions/2026-10-23-C-snow-buffer-validation.md)、[阴影优化记录](../actions/2026-10-22-C-shadow-update-optimization.md)、[分配修复记录](../actions/2026-10-21-C-snow-allocation-fix.md)；早期准备数据提速见 [首雪记录](../actions/2026-10-21-C-snow-startup.md)，更早推广和失败见 [历史推广记录](../actions/2026-10-20-C-snow-promotion.md)。循环内存目标仍未通过，不能宣称已实现全镇轻量流畅；动态地面／失效数据回退仍有等待。专属造型精修、樱家旧檐滴/地面光斑贴合厚雪、100建筑和手机仍未完成或未验证。

## C v2.6 环境接入（2026-10-20，历史）

已接通全镇四时段及晴雨雪、原 night-10 灯描述、道路/地图地面立体雪、统一积融雪与环境存档。**建筑专属雪层初稿暂停，交建筑美术接手，不是本轮建筑美术成品。** 逐文件状态与接入要求见 [建筑雪初稿交接](C-building-snow-draft.md)。本地交付，不提交、不发布、不启停服务。

- 正式入口 `http://127.0.0.1:4173/`。独立审看 `http://127.0.0.1:4173/?review=snow`：使用 `rainy-corner.editor.review.snow.v1`，首次载入三栋同街区，不读写用户正式存档；画面提示标明建筑初稿。
- 点击“布置街区 → 环境”切换早晨/下午/黄昏/夜晚及晴雨雪。时段、天气和现存雪量独立。雪量进度可见；退出布置回到全屏观赏。散步仍未接入。
- `townEditor.environment.get()/set(patch)/subscribe(listener)` 提供统一状态；宿主唯一累计秒数推进 `environment.advance(elapsedSeconds)`。建筑仅接收状态和同一累计秒数，不另计时。下雪60秒积满、晴天300秒/雨天60秒融完，线性、昼夜同速、后台与关闭暂停。
- `townEditor.setTime(value)` / `setWeather(value)` 仍通过运行桥返回确认；旧 `townEditor.weather.setWeather(value)` 在正式宿主也转入统一状态，避免只改降水而漏保存。季节/人物/新天气未接入。
- `townEditor.getLayout()/loadLayout()` 继续操作原布局v1；`townEditor.exportJSON()/importJSON(textOrObject)` 操作街区v2封装。UI导入/导出使用后一组。`onLayoutChange` 不因环境渐变触发；导入产生一个布局撤销步骤，撤销也恢复导入前环境，普通编辑撤销不回退自然积融雪。
- 新格式为 `{format:'maruko-town',version:2,layout:{format:'rainy-corner-layout',version:1,rows,instances},environment:{time,weather,snowAmount}}`。正式存储键仍 `rainy-corner.editor.layout.v1`。旧布局导入保留当前环境；首次读取旧存档默认下午/晴/0。先校验两部分再应用，无效输入不部分更新；无法读取的原存档保留且停止自动写入。
- 新建/撤销恢复实例继承环境；灯光池读取 `getLightingDescriptors()` 优先，无新描述才读 `previewLamps`。位置和目标都乘root世界矩阵，距离随缩放，强度不再重复乘时段系数。仍10点灯+4聚光。
- 动态雪面由 `asset.snow.sample(localX,localZ)` 查询（返回 y、局部 normal）；动态雪组标记 `userData.snowLayer`，不混入静态实体索引。空地/道路雪由地图唯一生成，建筑格子由建筑负责。建筑未来可替换雪工具，但需保留此采样或与C协调。
- 环境约0.003雪量步长更新几何，真实状态按经过时间推进；降雨落点按约0.008雪量步长刷新。主循环无帧率依赖的进度；相机动画仍使用限幅dt。

本轮证据、检查限制及文件清单见 [行动记录](../actions/2026-10-20-C-town-snow.md)。所有全镇夜景/雪景画面待用户认可，不能沿用みつや独立夜景认可替代。以下v2.5及更早内容保留为历史接口/制作记录，环境接入现状以上述v2.6为准。

## 历史交接记录

> 2026-10-20 环境约定补充：后续时段／建筑夜景／雪景接入先读 [环境与建筑协作约定](../architecture/README.md)、[接口约定](../architecture/environment-contract.md)和[当前缺口](../architecture/building-status.md)。这是已确认方案的文档，不表示本轮已实现。当前源码为みつや night-10、樱家 roof-04；下面 v2.5 的“みつや没有 setEnvironment”属于 09 交付时事实，已不适用于当前建筑。正式编辑器仍未接入全镇时段及 night-10 新灯光描述；みつや建筑夜景已获用户认可，地图整体夜景仍待验收。

更新日期：2026-10-19。交付标识：`C-town-editor-v2.5`；布局格式版本仍为 `1`。用户将统一天气交给 C，暂不开 D。本轮是本地文件交付，没有提交、推送或线上发布。

## v2.5 みつや小店当前接入

- 已按用户本阶段许可接入 B `mitsuya / anime-facade-landscape-09` 外观，名称“みつや小店”，稳定 ID `mitsuya`，后续美术换版不换 ID。不是永久美术定稿。独立离线预览已用真实 Chrome 打开、核对并截图。
- `catalog.js` 直接调用 `createModel()`，保留原返回对象、root、比例 1、全部三渲二材质/贴图/自定义 shader、previewLamps 与 dispose；仅追加 `focus` / `thumbnail` 取景和 C 侧 `previewLampStyle:'downlight'`。未调用独立室内创建选项或加载备用 GLB。
- 狗屋、长凳、右侧墙面松卷竹帘、左后低灌木粉花和门口商品原样保留。地块 14×14、中心原点、正面 +Z、支持四个直角。原地图草地规则遮罩建筑整格，小店自带草坪/植物/石板路仍为 B 模型组成部分。
- 点击/拖入、重复放置、选择、旋转、搬动、删除/撤销、自动保存、刷新与真实 JSON 导入导出使用已有状态 API；布局 v1 / 存档键不改。不自动摆入用户地图。旧编辑器不认识 mitsuya 时仍会按未知素材拒绝新布局，后续兼容版本保留同一 ID。
- 暖光由现有 `createPreviewLighting` 管理：B 原两盏灯位/强度/距离，参考 B 独立预览的向下 SpotLight（角度 .39π、penumbra .8、decay 1.5），512 阴影与实体墙体遮挡。按镜头目标最近至多两家有 downlight 策略的店、四盏灯；超出池的远店保留原材质自发光，不累加无限实时灯。便利店原最近两家/至多十盏 PointLight 策略保留，总池上限十四盏（不含既有日光）。
- 灯位及灯目标随 root.matrixWorld 变换，搬动、旋转、删除/撤销后的下一渲染帧更新。灯属于场景宿主，不塞进 B root；`lighting.dispose()` 释放阴影纹理。缩略图与透明放置预览不增加常驻灯。
- `scene.js` 的透明材质克隆显式保留原 onBeforeCompile/customProgramCacheKey，避免放置预览丢失 B 的三渲二明暗分层。正式实例、预览和缩略图分别创建独立 B 资源。取消操作最多缓存一个隐藏预览，更换素材或场景释放时 dispose；不释放其他实例资源。
- 沿用原统一晴雨和真实几何表面索引，缓存键自动使用资产 ID/revision；屋顶、狗屋和地面命中与四向/编辑后落点已单独核对。**小店没有 setEnvironment/updateEnvironment**，不宣称其已有昼夜/湿材质/檐口滴水响应，也不新增收冰柜或展开竹帘等动画。
- 独立室内资产仅保留，正式进出门、人物控制、碰撞和购物尚未接入。学校、公园仍为待接入文字。
- 当前证据：`artifacts/editor/v2.5/`；实施与技术/美术状态分别见 `docs/actions/2026-10-19-C-mitsuya-editor.md`。下列 v2.4/v2.3 报告为历史证据。
- 本轮实际检查：小店专项 **9/9**、原编辑器 **23/23**、统一天气 **10/10**，页面/控制台错误均 0。88 个受保护文件指纹一致；小店 519 个可见资源/纹理在释放场景中各释放一次，邻居不受影响。三栋同街区截图 `mitsuya/08-three-buildings-same-street.png`、粉花/竹帘与暖光近景均已查看；美术接受待用户，不以技术结果代替。

## v2.4 当前天气与接入

- 首页“布置街区 → 环境 → 天气”支持实际晴天/下雨。B 当前资产为 `exterior-03-states`；以下 v2.3 历史说明与报告不作为新版验证依据。
- `createTownWeather({scene,state,sceneView,tileSize})` 在现有场景增加一套雨丝/水花，无独立时钟或 RAF。首页已连接 `runtime.connect({setWeather: value => weather.setWeather(value)})`。
- `townEditor.setWeather('clear'|'rain')` 返回 Promise 确认结果；其他天气拒绝。时间和人物能力仍未接入。天气不写入布局、不产生撤销项，刷新默认晴天。
- 每帧先 `sceneView.update(elapsedSeconds)`，再 `weather.update(elapsedSeconds)`，传同一累计秒数。场景负责对每个 B 实例调用 `updateEnvironment(elapsedSeconds)`，天气只在变化时通过 `sceneView.setEnvironment({weather})` 转发 B 的 `setEnvironment({weather})`，保留 B 当前 time。便利店原 `update(dt,visitor)` 签名不变。
- 新放置、撤销恢复和导入实例立即继承天气与累计秒数。天气订阅在场景订阅之后注册，因此落点计算使用提交后的模型矩阵；旋转、搬动、删除、撤销、轮廓和导入同步更新。
- `rain-surfaces.js` 从实际不透明实体三角形建立局部 XZ 索引；把世界位置变换到实例局部空间，求竖直雨的最高接触面并返回世界点/法线。支持当前四向旋转及便利店 14/14.25 缩放。光束、光斑、透明粒子和樱家环境子树不遮雨，放置预览不参与。
- B 的 `roofs` 虽为空，本轮可直接用实际屋面工作，不要求 B 额外补交。B 的 44 处檐口滴水仍仅一套；全镇雨只负责从天空首次接触实体的水花。没有覆盖 B 文件，也没有重做光束或地面光斑。
- 诊断：`townEditor.weather.sampleSurface(worldX,worldZ)`、`getInspection()`、`getRainSamples()`；地图外返回 null。`dispose()` 取消布局订阅、释放本模块资源。`sceneView.dispose()` 继续管理 B 实例资源。
- 当前限制：竖直雨，不模拟带风雨、流水或积水；按当前资产 ID/版本缓存静态几何。后续若加入会活动的屋顶、透明实体雨棚、实例自定义几何或跨地块建筑，需要扩展表面接口/缓存策略，不能直接当作已支持。长草自身不作为屋顶，雨到草地下地面后被草叶自然遮挡。
- 后续运行层若调用 `connectRuntime` 会替换整个适配器，须保留 `setWeather: value => townEditor.weather.setWeather(value)`，不要再创建第二套雨或重复调用 B 环境更新。时间扩展另行授权。
- 实施及检查证据：`docs/actions/2026-10-17-C-town-weather.md`，`artifacts/editor/v2.4/`。美术效果由用户确认，自动检查不替代认可。

> 2026-10-16 目录整理补充：用户随后授权“一栋建筑一个文件夹”。现有模型已移至 `dist/town/assets/<建筑编号>/`，编辑器 `catalog.js` 改从 `../assets/index.js` 调用同一个创建接口；旧 `walk/buildings.js` 和 `store.js` 保留兼容转发。素材编号、布局 v1、存档键及 C 的交互逻辑保持原样。下文已更新为 v2，v1 源码指纹和检查仍保留为历史证据；本次迁移与独立回归记录见 `docs/actions/2026-10-16-building-folders.md`。

> 2026-10-17 正式首页整理：编辑器现为 `/`，原 `/editor-preview/` 跳转到同源首页。交互沿用 v2.2，布局格式和存档键不变；旧观赏/散步页面已归档，樱家新作品完整保留且未自动接入。当前源文件保护基线为 `scripts/fixtures/editor-protected-assets.json`，历史交付报告保持原样；实际变更和新验证见 `docs/actions/2026-10-17-editor-home-and-legacy-archive.md`。

> 2026-10-17 v2.3：用户随后明确要求接入小丸子的家。现使用 B 的 `sakura-house / exterior-02-lamp` 原模型加入建筑列表；目录以实际存在的 `E:\动森\小丸子小镇` 为准，旧路径目前不可用。接入和验证见 `docs/actions/2026-10-17-C-sakura-editor.md`。

## 当前可用范围

- 正式首页：<http://127.0.0.1:4173/>。在 `E:\动森\小丸子小镇` 执行 `node scripts/serve.mjs` 可启动；若已有 4173 服务，无需重复启动。
- 首次进入为斜俯视空白 6×6 三维草地，置于固定 10×10 范围中央。默认全屏场景，仅一个“布置街区”入口；短暂的鼠标提示自动消失。打开后使用单个浮动面板切换素材/轮廓/环境/存档，退出隐藏格线及工具。
- 观赏：左键拖动环绕，右键或中键拖动平移。布置：左键选择/放置/直接拖建筑，右键环绕，中键平移。两种模式共用滚轮缩放、双击模型聚焦、Home 回全景。
- 鼠标不按键掠过可见草地，沿滑动方向产生局部风；操作镜头（含惯性/聚焦飞行）、放置/搬动素材、预览轮廓及切换运行模式时暂停新风，已有风自然衰减。离开画布或改变视角后重新建立划动起点。
- 草叶高度 .45–1.035（比 v2.1 高 50%），每完整草格 24,000 叶（密 33.3%），真实三维实例化几何；便利店、樱家、みつや整格与路面不长地图草，各建筑自带植栽保留。编辑格线及辅助面在草冠上方，观赏隐藏。
- 每行起点和长度可单独调整，长度 0 表示停用；启用范围外无地图地面。预览背景接影平面不是可行走地图。
- 进入布置后点击卡片，再点击草地放置；支持卡片原生拖入、悬停吸附和方向预览。切换“选择”后可选已有实例，旋转、搬动、删除；也支持直接拖动已有实例。占格和地图外均拒绝，不覆盖。
- `R` 旋转、`M` 搬动、`Delete` 删除、`Ctrl/Cmd+Z` 撤销、`Esc` 取消当前操作，无操作时收起工具。文本/数字输入框中不接管这些快捷键。
- 地图轮廓先预览新增/移除格子和受影响实例，确认后一次提交；整次变化一步撤销。预览期间原布局不改变，过期预览拒绝执行。
- 自动保存、实际 JSON 文件导出/导入。损坏旧存档保留，支持下载原文备份及明确确认后替换；自动保存失败会提示导出。撤销历史仅在本次页面会话中保留，最多 100 步。
- 上帝视角和晴雨已可用。时间、散步准确显示待接入，未扩展人物或其他天气。

## 素材交付核对

| 素材 | 本轮状态 | 实际来源 |
| --- | --- | --- |
| AME MART 便利店 | 可选、重复放置；店体/内饰/售卖机/自行车/回收桶/伞架/电杆/底座完整，真实模型缩略图 | 原 `dist/town/assets/convenience/` 店体 + `dist/street.js` 完整街角，由 C 组合适配 |
| 直路、转角、丁字路、十字路 | C 本轮交付 | `dist/town/editor/roads.js` |
| 小丸子的家（樱家） | 可选、重复放置、占一格，房屋/院落/植栽/院外电灯完整，真实模型缩略图 | `dist/town/assets/sakura-house/index.js`，B `exterior-03-states` 原 `createModel()`；无完整室内 |
| みつや小店 | 本阶段可接入、重复放置，原狗屋/长凳/竹帘/粉花/门口陈设完整 | `dist/town/assets/mitsuya/index.js`，B `anime-facade-landscape-09` 原外观工厂；独立室内保留但不加载 |
| 学校、公园 | 未接入；仅“待接入”文字 | 没有可用成品交付 |

不将便利店改称みまつや，不将旧 `home/garden/cafe/bookshop` 模型作为本批建筑。不制作建筑替代模型；接入仅使用已核对的实际 B 交付。

现有便利店工厂没有显式接口版本号，沿用当前实文件契约：`TILE_SIZE=14`、`createBuilding(type, variant=0)` 返回 `root/type/colliders/occluders/roofs/lamps/floors/update/doorOpen`。C 保留原对象、每实例门动画闭包及 `doorOpen` getter。`convenience-scene.js` 在 C 目录组合原街角，替换该实例的公开 root 为组合组，并把店体元数据平移回原型坐标；原资产文件不改。原型外沿 14.25×14.25，整组统一缩放 14/14.25 到单格，保留全部几何和相对位置。自带的 L 形街道路面是原型的一部分，另外四种地图道路仍独立放置、无自动变形。

注意：已有 v1 存档的 `convenience` 编号和占格不变，刷新会显示完整街角。源文件指纹见 `artifacts/editor/v2/boundary-baseline.json`。

首页整理后，`catalog.js` / `convenience-scene.js` 仅引用便利店模型与 `assets/shared/instances.js` 的既有实例实现；`assets/index.js` 保留所有旧建筑的通用入口，但不在首页加载链中。

`catalog.js` 直接导入 B 的 `sakura-house/index.js`。当前 B `specification`：id 为 `sakura-house`、revision 为 `exterior-03-states`、tileSize 14、front `+Z`、placementRotations 为四个直角、interior 为 false。保留 `createModel()` 返回的原对象和原始 root（缩放 1），包括 colliders/occluders/floors/specification/dispose 和环境接口；C 仅追加 focus/thumbnail 取景信息。模型使用自身动画色阶（unlit / toneMapped=false），晴雨颜色变化由 B 的 setEnvironment 负责。B roofs/lamps 仍为空，局部檐水和完整灯束是 B 已有实现，全镇雨使用实际实体几何遮挡。

资源所有权：B 每次创建独立几何/材质/纹理，`dispose()` 必须由持有者调用；场景在删除、替换或整体释放时调用，缩略图渲染后立即调用。放置预览更换类型/销毁时，先释放 C 克隆的透明材质，再调用该模型 dispose；取消预览可暂存最多一个隐藏预览供继续使用。便利店/道路仍用共享缓存且没有实例 dispose，不能统一遍历释放它们的共享几何。撤销删除会重建 B 模型，但保留布局实例 ID。

`catalog.js` 是 C 的选择清单和现有工厂调用点，不是另造的 B 建筑标准。B 正式交付后，先读取其最终交接文件和版本，再在这个调用点按实际创建、生命周期、变换与环境契约接入。不得仅发现新文件就把素材改为“已完成”。

## 文件清单与职责

| 文件 | 责任 |
| --- | --- |
| `dist/town/editor/state.js` | 纯布局状态、校验、原子操作、影响预览、撤销、订阅 |
| `dist/town/editor/persistence.js` | localStorage 读取/保存/损坏保护，与渲染无关 |
| `dist/town/editor/catalog.js`、`convenience-scene.js` | 素材清单与完整原街角组合适配，保留原工厂契约 |
| `dist/town/editor/grass.js` | 草叶实例、占地遮罩、环境微风和局部划动风 |
| `dist/town/editor/camera.js` | 可选的预览镜头控制、聚焦及全景拟合 |
| `dist/town/editor/lighting.js` | 正式编辑器日光/阴影、便利店原灯池和みつや限额暖色下照灯 |
| `dist/town/editor/roads.js` | 固定形状道路模型，独立占一格，无自动邻接变形 |
| `dist/town/editor/scene.js` | 地面、格线、实例、预览；不创建相机、环境、渲染器或主循环 |
| `dist/town/editor/runtime.js` | 能力请求/确认/失败/连接状态桥接，首页已连接 C 晴雨 |
| `dist/town/editor/weather.js`、`rain-surfaces.js` | 统一雨丝/水花、实际实体首个接触面，不修改布局或 B 模型 |
| `dist/town/editor/ui.js`、`ui-shell.js`、`editor.css` | 界面、鼠标/键盘/文件交互 |
| `dist/index.html`、`dist/main.js` | 独立演示入口，组合渲染器、透视镜头、预览光照与轻微辉光；标题由改名窗口维护 |
| `scripts/inspect-editor.mjs` | 状态、持久化、真实 Chrome 操作及边界检查 |
| `scripts/inspect-mitsuya-editor.mjs` | みつや外观保真、实例/存档/释放、暖光/雨面和同街区截图 |
| `docs/actions/2026-10-16-C-town-editor-visual.md` | v2 实施、反馈与实际验证；原 C action 保留 v1 历史 |
| `docs/actions/2026-10-17-C-mouse-hover-wind.md` | v2.2 分模式鼠标、悬停风与长草甸的实施和验证 |
| `docs/actions/2026-10-17-C-sakura-editor.md` | v2.3 樱家清单、真实模型和独立资源生命周期接入 |
| `docs/handoffs/C-town-editor.md` | 本交接说明 |
| `artifacts/editor/` | 截图、结构化检查报告、实际导出布局、保护边界指纹与交付清单 |

C v2.4 新增统一晴雨，未修改原型源码、散步运行逻辑、人物或公共服务。2026-10-17 项目名称更新为“小丸子小镇”，实体目录为 `E:\动森\小丸子小镇`，包名仍为 maruko-town；本轮核对旧目录/联接已不可用，请使用当前实体路径。名称不改变布局格式和存档键。C 的历史边界检查将早先五个改名差异与 C 修改分开；实体改名和下载文件名更新的历史验证见 `docs/actions/2026-10-17-project-rename-and-code-audit.md`，历史交付指纹不重写。

## 布局格式 v1

完整的实际文件见 `artifacts/editor/v2/exported-layout.json`。以下是可校验的最小示例，数组必须包含十行：

```json
{
  "format": "rainy-corner-layout",
  "version": 1,
  "rows": [
    { "start": 0, "length": 0 },
    { "start": 0, "length": 0 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 2, "length": 6 },
    { "start": 0, "length": 0 },
    { "start": 0, "length": 0 }
  ],
  "instances": [
    { "id": "i-example-store", "assetId": "convenience", "x": 3, "z": 3, "rotation": 90 },
    { "id": "i-example-road", "assetId": "road-straight", "x": 3, "z": 4, "rotation": 0 }
  ]
}
```

- `rows[z]` 的 `start` 为 0–9，`length` 为 0–10，二者都是整数，和不超过 10。UI 为易读把起点显示为 1–10，内部仍为 0–9。
- `x/z` 是 0–9 整数且必须处于启用范围；`rotation` 只能是 0/90/180/270 度，按 Three.js 正 Y 轴转动。实例 `id` 全局唯一，搬动/旋转不变；`assetId` 可重复。
- 可选 ID：`convenience`、`sakura-house`、`mitsuya`、`road-straight`、`road-corner`、`road-tee`、`road-cross`。旧 v1 布局继续读取；包含新建筑的布局需用认识对应 ID 的版本加载，旧编辑器会按未知素材拒绝。
- 不保存时间/天气/人物/选择态/撤销历史。这些不属于静态布局。存档不含可执行代码或模型文件地址。
- 文件导入上限 1 MiB；拒绝未知格式或版本、错误行定义、非整数/越界坐标、地图外实例、重复 ID、重复占格、非法旋转、未知/未交付素材。完整校验成功后才替换，失败不改变当前状态或 localStorage。
- 一个浏览器 origin 一张地图：`rainy-corner.editor.layout.v1`。不同端口/域名不共享该存档；跨来源用文件导入导出。

## 公开接口（供后续运行层复用）

预览页面的 `window.townEditor` 公开：

| 接口 | 行为 |
| --- | --- |
| `getLayout()` | 返回布局深拷贝 |
| `loadLayout(layout)` | 完整校验，原子加载，可撤销；错误抛异常 |
| `onLayoutChange(listener)` | 返回取消订阅函数；事件 `{reason, revision, layout, canUndo}` |
| `root` / `sceneView` | 当前实际 Three.js 场景子树及实例查询接口 |
| `connectRuntime(adapter)` | 替换完整运行适配器并返回断开函数；请求进行中拒绝更换；需保留现有 C 晴雨方法 |
| `requestMode('god'|'walk')` | 请求模式；Promise 结果见下 |
| `setTime('morning'|'afternoon'|'dusk'|'night')` | 请求时间 |
| `setWeather('clear'|'rain')` | 请求实际 C 晴雨，其他值拒绝 |
| `setEditing(boolean)` | 打开/收起工具；只有 god 模式允许布局编辑。walk 下打开环境页，可切回 god |
| `focusInstance(id)` | 平滑聚焦某个实例，失败返回 false |
| `showOverview({top?, immediate?})` | 当前地图完整入镜；top 为俯视编辑布局 |
| `state` / `runtime` | 模块对象；不依赖 DOM |
| `dispose()` | 结束该预览的监听、帧循环与渲染资源 |

状态模块 `createEditorState({assetIds, initial?, idFactory?, onSubscriberError?})` 返回：

- 读取：`getLayout()`、`at(x,z)`、`canPlace(assetId,x,z,ignoreId?)`、`revision`、`canUndo`。
- 修改：`place(assetId,x,z,rotation=0)`、`move(id,x,z,rotation?)`、`rotate(id)`、`remove(id)`、`undo()`。
- 形状：`previewShape(rows)` 返回冻结的、绑定 revision 的计划；`applyShape(plan,{confirmAffected:true})` 执行。受影响实例存在时必须显式确认；不能伪造计划或复用过期计划。
- 文件：`importJSON(text)`、`exportJSON()`、`loadLayout(layout)`。
- 事件：`subscribe(listener)`。reason 为 `place/move/rotate/delete/shape/load/import/undo`。事件给出修改后的完整快照；一个形状变化只有一个事件。监听器抛错被隔离，其他监听器及已提交操作继续；集成方仍应处理自身错误。

运行适配器契约：

```js
const disconnect = townEditor.connectRuntime({
  async setMode(value) {
    // D 实际切换相机和人物；只有实际完成后返回成功。
    await yourRuntime.setMode(value);
    return { ok: true, value };
  },
  async setTime(value) {
    await yourRuntime.setPeriod(value);
    return { ok: true, value };
  },
  setWeather: value => townEditor.weather.setWeather(value)
});
```

上面的 `yourRuntime` 是 D 的实现位置说明，不是已存在的对象。可同步返回或返回 Promise；失败返回 `{ok:false,message}` 或抛错。只有 `{ok:true,value:请求原值}` 才更新已确认控制值。缺少方法显示未接入，同一类请求进行中拒绝重复请求；断开后忽略旧响应。`runtime.subscribe()` 可观察 `connection/request/confirmed/failed/unavailable/settled`。

`walk` 确认后隐藏编辑网格/辅助预览，禁用界面编辑；返回 `god` 后按工具是否展开恢复。实际人物、散步摄像机与碰撞留待后续，当前晴雨由 C 处理。状态 API 本身保留程序加载能力，不把 UI 锁定误当权限系统。

## 后续运行层复用同一场景的方式

不要在现有散步运行层里加载 `main.js`，它有自己的预览相机和帧循环。导入模块并把 `root` 加到 D 已有场景：

```js
import { createEditorState } from '../town/editor/state.js';
import { createEditorScene } from '../town/editor/scene.js';
import { assetIds, createAsset, TILE_SIZE } from '../town/editor/catalog.js';
import { createRuntimeBridge } from '../town/editor/runtime.js';
import { createTownWeather } from '../town/editor/weather.js';

const state = createEditorState({ assetIds, initial: savedLayout });
const editorScene = createEditorScene({ state, createAsset, tileSize: TILE_SIZE });
scene.add(editorScene.root); // scene 为 D 自有场景，仅一套 renderer / 环境 / 帧循环
const runtimeBridge = createRuntimeBridge();
const weather = createTownWeather({scene, state, sceneView: editorScene, tileSize: TILE_SIZE});
runtimeBridge.connect({setWeather: value => weather.setWeather(value)});
// 可选：mountEditorUI({host, canvas, camera, state, sceneView: editorScene, ...})
// UI 用 D 的 canvas 和上帝视角 camera，onOverview(options)/onFocus(instanceId) 交给 D。
// onEditingChange(enabled) 通知 D 切换上帝视角的鼠标分工；首次挂载也调用。
// isCameraBusy() 应返回镜头拖动、滚轮缩放、惯性、自动飞行期间是否忙碌，用于暂停新风。
// 唯一帧循环每帧调用 editorScene.update(elapsedSeconds) 和 weather.update(elapsedSeconds)。
// B 的 updateEnvironment 已由 editorScene 调用，不重复更新、不传 dt。
const stop = state.subscribe(event => {
  // D 按 event.layout 同步碰撞/路径/角色合法位置；不要复制创建第二套建筑。
});
```

场景坐标与数据：

- 正面 +Z，Y 向上；单格 14×14；`worldX=(x-4.5)*14`，`worldZ=(z-4.5)*14`。`cellToWorld/worldToCell` 已导出。默认 root 放在世界原点且无额外旋转缩放。
- `sceneView.getInstances()` 返回 `{placement, asset}` 列表。`asset` 保留实际工厂原对象；便利店公开 `root` 为完整组合组，其元数据已平移到这个组的坐标系；樱家为 B 原 root 及原局部元数据。樱家 colliders/floors 是 B 的集成参考，不代表角色碰撞通过。所有资产仍需 D 的实际角色验收。
- D 对每个 `asset` 的局部元数据应用其 `root.matrixWorld`；必须包含完整 root 缩放（便利店为 14/14.25），不能只处理旋转/平移。旋转后矩形轴互换；灯点、门口和屋顶也要变换。不要直接把局部坐标当世界坐标。
- `asset.update(dt, playerWorldPosition)` 保留原门动画闭包，能在组合组旋转/缩放后按世界位置响应，实例互不影响。`sceneView.update(elapsedSeconds)` 同时推进草叶、原信号灯和 B 的环境动画；传全镇累计秒数，不传单帧间隔或毫秒。
- 便利店 `asset.previewLamps` 是 C 预览使用的原始店内四灯及街灯数据 `[color,intensity,distance,x,y,z]`，局部位置须变换到世界，距离随 root.scale 缩放。可由 D 的统一灯光系统接管；不要同时添加 preview lighting 和另一套环境灯。
- `sceneView.grass.stroke(fromWorld,toWorld)` 输入 THREE.Vector3，沿该世界方向产生局部风；`sampleWind(x,z)` 和 `getInspection()` 供诊断。草地不占实例，道路没有阻挡碰撞。UI 只在无按键鼠标悬停且没有镜头/编辑操作时调用；直接调用此低层接口的集成方自行控制触发时机。
- `mountEditorUI` 新增可选 `onEditingChange(enabled)` 和 `isCameraBusy()`。前者在实际可编辑状态变化（含运行层切换）时通知，后者由 D 提供镜头拖动、惯性、缩放、飞行忙状态。省略后者时只有 UI 自身按键/工具与相机矩阵变化保护，不能保证 D 外部镜头动作全程暂停草风。复用 C 镜头时连接 `cameraRig.setEditing(enabled)` / `cameraRig.isBusy()`；D 不要同时安装两套镜头控制。
- `containsCell(x,z)` 只表示启用的土地范围。`getGroundHeight(worldX,worldZ)` 在启用地返回 0，在地图外返回 null；完整街角铺装、室内/台阶高度由 `asset.floors` 补充（按数组后面的更具体地面优先），不能单凭此方法穿过建筑。
- 修改轮廓或导入后，D 需要保证角色位置仍在合法地面上；具体回落位置策略由 D/统筹确定。D 复用 `sceneView` 时由 C 管理资产释放，D 不要再 dispose 同一对象；D 自行调用 `createAsset` 创建的独立樱家由 D 负责 dispose。
- `sceneView.setEditing(boolean)` 仅控制网格/编辑辅助；`UI.setEditing(boolean)` 同时控制面板与编辑鼠标分工，不改变地面和模型；`dispose()` 清理本模块监听和自有资源。当前便利店/道路是共享工厂缓存，实例移除不释放共享几何/纹理。
- 缩略图 `renderThumbnails(assets,createAsset,TILE_SIZE)` 由相同工厂渲染，一个临时 renderer 批量生成后释放。不引入占位图片。

## 验证与限制

运行：`node scripts/inspect-editor.mjs`（先运行本地服务；可将预览 URL 作为第一个参数）。检查使用已安装 Chrome，`CHROME_PATH` 可覆盖路径；在隔离浏览器上下文操作，不改用户浏览器中的地图。

当前 v2.4 检查结果见 `artifacts/editor/v2.4/editor/inspection.json` 与 `artifacts/editor/v2.4/weather/inspection.json`，实际结果汇总见本轮天气行动文档。以下 v2.3 数字仅为历史记录：23 组通过、页面及控制台错误 0，记录在 `docs/actions/2026-10-17-C-sakura-editor.md`，不替代 B 新版本与晴雨重新验证。

v2.4 最终实际复验：编辑器 **23/23**、天气 **10/10**，两者页面/控制台错误均 **0**。B 当前 77 个网格、239,671 个网格顶点的原工厂与放置实例指纹相同；157 个独立资源在删除/替换/预览/缩略图/场景释放各恰好释放一次。当前源码清单及 SHA256 在 `artifacts/editor/v2.4/delivery.json`。天气截图与短录像位于 `artifacts/editor/v2.4/weather/`；美术效果待用户确认。

樱家实时保真：与 B createModel 原件比对全部几何属性、索引、子节点变换、材质/贴图及部件元数据，三栋放置实例均一致，58 个网格、230,832 个网格顶点，缩放 1，四向占地 14×14。删除、替换、预览更换、缩略图结束、场景销毁各检查 120 个可见资源均收到一次 dispose，未删除的邻居收到 0 次。实际编辑截图 `artifacts/editor/v2.3/13-sakura-card-and-preview.png`，场景近看 `14-sakura-in-town.png`、全景 `15-sakura-town-overview.png`；导出布局为 `sakura-layout.json`。

v2.2 草风记录见 `docs/actions/2026-10-17-C-mouse-hover-wind.md`；前轮加草记录 `2026-10-17-C-grass-density.md` 保留历史。对应截图在 `artifacts/editor/v2.2/09-grass-before.png`、`10-grass-sweep.png`、`11-grass-rested.png`、`12-edit-tools.png`、`13-long-meadow-hover.png`。真实无按键鼠标录像为 `artifacts/editor/v2.2/hover-wind.webm`，对应 `wind-recording.json`：30 次风脉冲、沿 +X 方向、衰减归零、错误 0。以下原 v2 的完整街角截图与录像继续保留为历史证据：

- `13-complete-corner.png`：恢复全部陈设的原方形便利店与加高草叶。
- `07-store-closeup.png`、`08-window-detail.png`：原生聚焦与滚轮近看。
- `09-grass-before.png`、`10-grass-sweep.png`、`11-grass-rested.png`：划动前、同向风和衰减后的实际画面。
- `grass-wind.webm`：浏览器 canvas 的真实动画录制；`wind-recording.json` 对应交互读数。
- `01-empty-scene.png`、`03-shape-impact.png`、`04-irregular-town.png`、`12-edit-tools.png`：空场景、影响范围、不规则地图和按需浮层。

这些自动化浏览器操作与截图不等于用户最终审美认可。未做移动端、100 个完整便利店的性能压测、多标签页并发合并或真实角色/碰撞接入。100 格测试使用道路；默认空地图 864,000 草叶，放一格便利店为 840,000，最多 2,400,000 草叶，GPU 负担高于 v2.1。预览使用 2048 阴影与后期，最多点亮距离镜头目标最近两家便利店的十盏点光；远处模型和发光材质保留。默认近看完整街角，滚轮可继续拉近店内细节。

完整原型的内部道路样式/宽度与 C 独立道路不同，暂不修改原型或自动重排道路以强行接缝。所有行可为空，重新启用即可恢复草地。B 樱家与みつや外观已接入 C，保留原作者的院落、植物和陈设；学校、公园仍显示“待接入”。当前只接入 C 晴雨，不宣称人物或统一时段已实现。

本地服务没有 CSS MIME 配置，预览入口以 fetch 文本注入自身样式；不修改公共服务脚本。共享运行层集成 UI 时，需要自行加载 `editor.css`。打开页面需要 HTTP 服务，不是 file:// 单文件离线版。

后续接入由用户另行安排：复用上述状态、场景子树及 C 晴雨，扩展人物/模式/时间时保留同一累计时钟。B 新成品接口到达后由用户转交，按实际版本接入，不能自动替换本轮素材清单。
