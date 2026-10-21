# B → 用户统筹 / C / D：樱家 exterior-04-roof

> 2026-10-20 协作约定补充：后续环境工作沿用[通用规则与分工](../architecture/README.md)及[环境接口约定](../architecture/environment-contract.md)。樱家既有四时段与局部灯光保留并与地图协调；这次仅整理文档，不改变本文件的历史验证与美术认可范围。

2026-10-20 补充：用户授权仅修改樱家屋顶。当前 `exterior-04-roof` 调整浅灰瓦面、沿坡纵缝、弧形搭接和脊瓦分节；主屋顶／低附屋轮廓、坡度、檐口位置不变，墙窗、山墙、院子、植物、路灯、排水、独立室内与原环境接口保留。

源码工厂、GLB 和本店独立预览同步。新离线交付与同机位前后图册在 `artifacts/buildings/sakura-house/roof-04/`；该目录、室内、参考资料和根目录旧交付继续保留。2026-10-20 已在最新建筑本地提交后按用户授权删除五个旧 archive，范围见 `docs/actions/2026-10-20-building-commit-and-backup-cleanup.md`。本轮屋顶检查见 `docs/actions/2026-10-20-B-sakura-roof.md` 与 roof-04 内 `inspection.json`，画面待用户认可；不将下面的历史检查当作 04 新验证。

未修改 C 的编辑器／天气／存档、检查基线或其他资产；C 原工厂直接引用本店源码，重新加载即可显示新屋顶。本轮未做正式编辑器全量回归；后续如检查固定旧 revision 或源码指纹，应按本次授权的屋顶变更核对预期，勿回退美术源文件。

## exterior-03-states 历史交接

2026-10-17。本轮仅樱家：四项美术修正、局部檐下滴水、黄昏/夜晚暖窗和动画式路灯。技术检查通过，用户美术认可待定；便利店和其他建筑未做状态。未发布。

## 查看

- 独立三维：http://127.0.0.1:4184/town/assets/sakura-house/preview.html?view=reference
- 按本轮反馈修正的路灯：http://127.0.0.1:4184/town/assets/sakura-house/preview.html?view=lamp&time=night
- 离线：artifacts/buildings/sakura-house/樱家-三维外观预览.html。
- 图册、原图对照、19–29 状态截图/录像以及检查 JSON 均在 artifacts/buildings/sakura-house/。
- 当前真实项目路径：E:\动森\小丸子小镇。

## 交接要点

资产仍为 sakura-house，一格 14×14，+Z 正面、四向放置、独立 createModel()/dispose()。geometry.js 未改。当时已认可 exterior-02-lamp 的存档 archive-exterior-02-lamp-approved/ 后于 2026-10-20 按用户授权删除；用户对旧版认可不自动等于本轮认可。

新增 window 横框、粗树多枝、入口尖草移除和三档灌木绿色。44 处水珠聚集/脱落/涟漪；暖窗和路灯三层光效。用户反馈后，光束顶部采用整个倾斜灯罩开口的椭圆，宽 0.444、长 0.555，并按原灯头矩阵定位，不再由中央灯泡决定宽度；随后按用户反馈沿灯罩实际法线向右下方倾斜，圆光同步移动到对应地面落点。用户已认可该倾角；最新外扩修正将下沿/光斑半径扩大至 1.6，并按用户授权裁去地块外的光效部分。上沿、主轴和中心落点不动，中央亮区半径 1.1。

C 当前 catalog 直接读取工厂，刷新即可显示本轮默认午后晴天外观。C 的代码和现有运行桥未改；全镇环境未接入。外部运行层未来只需：

~~~js
// 环境变化时
asset.setEnvironment?.({time: 'night', weather: 'rain'});
// 每帧，所有建筑使用同一全镇累计秒数
asset.updateEnvironment?.(elapsedSeconds);
~~~

支持时段 morning / afternoon / dusk / night；当前天气美术只做 clear / rain。hail / wind / leaves 可接收但明确无专属效果。不能把独立预览中的状态控件当作已完成全镇运行层。

当前雨天只有建筑自身的 44 处檐口聚水、滴落与涟漪；没有覆盖地块的空中雨丝，也没有雨丝撞击屋顶、地面的效果。后续建议由统一环境生成降雨并处理屋顶/地面落点，编辑器提供天气选择，建筑继续响应檐口滴水等局部变化；此分工为后续接入说明，本轮没有实现统一降雨。

不添加各建筑自己的计时器或 requestAnimationFrame，不使用 convenience 的 update(dt, visitor) 签名。动态部分跟随 root，资源归属本实例。GLB 是午后晴天静态交换副本；JavaScript 工厂和 environment.js 才含动态状态。roofs/lamps 旧接口仍为空，需 D 实际接入时统一整理，避免重复生成灯光。

## 验证与限制

- 外观：8 处凹入门窗、224 块主屋面瓦；无栏杆转角院口保留；所有状态及四向旋转 XZ ±7。原图对照和多面截图已更新。
- 状态：8 组合、真实时间变化、雨晴复位、非法值不修改现状、实例隔离通过；光束口 32 点与灯罩变换一致。
- C 兼容：现有首页、缩略图、实例旋转、删除撤销、放置预览与销毁通过；157 个资源恰好释放一次，邻居不受影响，见 state-inspection.json。检查使用隔离浏览器存储。
- GLB 回读、离线断网运行和屋面 2110 条射线通过；43 个 dist 保护文件未变。几何与状态截图检查不等于用户美术认可、完整流水物理或全镇运行验收。
- C 的 inspect-editor.mjs 和 editor-protected-assets.json 仍固定 exterior-02-lamp 版本/指纹；本轮未改 C 基线。C 后续运行整套检查时应依据本次已授权 B 变更更新相应预期后重新验证，不得把旧 23/23 报告视为新版结果。
- 资产 README 是新接口、参考/补全和状态限制的详细说明；本交接取代旧 B 文档中“电灯仅外观”和“未接入编辑器”的当前状态描述，保留历史行动记录。
