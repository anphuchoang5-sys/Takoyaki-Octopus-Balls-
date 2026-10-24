# 全部走廊统一玄关木地板样式

## Status and situation

Completed（制作、交付及定向技术检查完成，画面待用户认可）。用户明确要求把所有走廊样式改成现在玄关旁门厅一样，已实际查看最新整屋截图。修改前 `hall` 为 entry-02 暖黄实体板条，`corridor`、`engawa` 仍是浅棕底与凸起线条；现已统一后两组地板。仅统一中央长廊及缘侧走廊的地板材质、板缝方向和边缘收口，保留现有玄关、台阶、踢脚木条、门框及其他房间。走廊没有玄关处的高差，不新增台阶；不把壁橱木地板列入走廊。

房间尺寸、布局、家具、门窗、正式室外、共用环境与存档保持；不派任务、不启停服务、不整项目回归、不提交推送发布或清理。现有未提交内容均保留。

## Implementation measures

1. 保存仅排除两组走廊地面的范围保护基线与同机位截图，保留平面/门窗/家具/通路完整签名。
2. 在既有地板生成分支让 corridor、engawa 复用 hall 的暖黄板面、暗金细缝、约 20 厘米板距及沿 Z 的板条方向。板顶为原地面高度，细缝有约 2 毫米深度；沿用同样边缘留缝，不添加跨门口凸条。
3. 增加缘侧查看机位，更新独立室内状态；同步原完整离线预览与整屋 GLB，提供本轮前后图册。

## Affected file tree

- `dist/town/assets/sakura-house/interior/index.js`：两组走廊地面复用既有门厅样式。
- 同目录 `preview.js`、`preview.html`：缘侧近看机位与当前状态；保留本地入口跳转。
- 同目录 `README.md`、`sakura-interior.glb`：当前说明与整屋模型交换文件。
- `scripts/inspect-corridors.mjs`：本轮两组地面范围保护、几何/高度/颜色及视角定向检查。
- `scripts/package-entry.mjs`：增加 `--corridors`，复用既有完整室内打包与离线验证。
- `artifacts/buildings/sakura-house/interior/corridor-01/`：前后截图、图册、检查证据；父目录原离线文件同步。
- 本行动记录。`plan.js`、`entry-room.js`、其他房间源码与正式室外不改。

## Self-verification method

- `node scripts/inspect-corridors.mjs --baseline` 保存修改前对象/文件/布局及同机位画面；修改后运行同脚本，严格核对两组地面以外未变。
- 实测各走廊板面与板缝颜色同 hall、最高面为 0、细缝为 -0.002 米，检查非有限/退化面；核对地板边界仍覆盖原走廊、无新增高差。
- 实看整屋俯视、中央走廊、缘侧、拐角和玄关近景；离线实际旋转/缩放/平移、原 file 入口、机位与参考加载检查。
- `node scripts/package-entry.mjs --corridors` 导出回读并比对两组地面外导出内容；语法、定向差异和交付指纹检查。使用隔离浏览器上下文，不接触用户地图存档。

## Self-verification results

- 首次受限环境启动 Chrome 遇到 `spawn EPERM`，未产生基线；按本地检查授权使用隔离 Chrome 后正常完成，未启动服务。
- 基线保存 470 组范围外对象、19 个独立室内保护文件、完整布局/通路和五个同机位截图。
- 第一轮修改后定向检查通过：470 组对象和 19 个文件完全一致，原玄关、门墙、柜盆及布局均保持。两段地板顶面为 0、凹缝 -0.002 米；板面 e5c34f、缝 b89a43 与原门厅一致，几何非有限/退化均为零，边界仍覆盖原走廊。旋转、缩放和参考加载通过。
- 已实际查看总览、中央走廊近景、缘侧近景与转角截图，确认门口和转角无新增凸条或高差。补齐缘侧机位隐藏其他房间标签的行为后再次运行 `node scripts/inspect-corridors.mjs`，相同范围保护、几何及交互检查通过；没有重置修改前基线。
- `node scripts/package-entry.mjs --corridors` 通过：整屋 GLB 58186168 字节，导出回读 1028 网格、439655 三角面，402 组范围外导出对象完全一致。完整墙体/天花保留，无剖视替代几何；原离线 HTML 同步为 86856727 字节，内嵌 18 模块/26 张参考。
- 离线实际旋转/缩放/平移、top/corridor-view/engawa-view/entry-cabinet 机位、玄关参考及门扇开关通过；原厨房饭锅与洗面室参考抽查通过。本地源码 file 入口自动转到最新离线版本，含本轮 corridor-01 状态及缘侧机位；网络请求与页面异常均为零。图册十张图加载通过。
- 四个修改的 JS/MJS 文件 `node --check` 通过，模型/预览/README 定向 `git diff --check` 通过；新检查脚本与行动记录不被 Git 忽略。README 与原整屋交付说明已同步。收尾 51 次源文件哈希核对及 GLB/离线 HTML 两个交付哈希匹配；已实看最终 `layout-pair.png` 和 `direct-file-engawa.png`，对照图与直接打开的预览显示本轮结果。
- 证据保存在 `artifacts/buildings/sakura-house/interior/corridor-01/inspection.json`、`delivery-inspection.json`、`走廊-修改前后对照.html`；五方向同机位前后图和原玄关样式图保留。仅新增本轮证据，未复制整套项目。
- 制作、交付与定向技术检查完成；画面待用户认可，正式进出门仍未接入。未进行整项目/天气/移动端回归，未启停服务、提交、推送、发布或派任务，其他窗口内容保留。
