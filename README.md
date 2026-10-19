# 小丸子小镇

当前正式版本是网页版小镇规划编辑器：在最大 10×10 范围内摆放建筑与道路，逐行调整地图轮廓，支持旋转、搬动、撤销、自动保存和布局文件导入导出。

实际项目目录为 `E:\动森\小丸子小镇`；旧路径目前不可用，请使用此目录。

## 版本管理与美术分工

GitHub 仓库：[anphuchoang5-sys/Takoyaki-Octopus-Balls-](https://github.com/anphuchoang5-sys/Takoyaki-Octopus-Balls-)，本地 remote 为 `origin`，日常分支为 `main`。项目显示名称仍为「小丸子小镇」。本次接入保留原本地历史和远端初始许可记录；GitHub 源码同步不代表网站发布。

源码、现有建筑 GLB、樱家室内结构样板、旧原型归档及项目文档纳入管理；`node_modules/`、`artifacts/`、日志和浏览器临时目录继续按 `.gitignore` 保留在本地。现有 Three.js 许可与参考图片来源说明一并保留。

`.gitattributes` 保留原文件换行字节，避免 Windows 拉取时自动改写文件而使资产保护指纹和归档清单失效。

建筑与人物美术分别工作。用户已于 2026-10-19 取消“樱桃小丸子本人”方案，该人物资产、专属代码、预览与任务入口已清理，旧走路/跑步制作计划取消。B 方案方块人尚未确认，本轮不启动新人物或正式场景接入。见[人物清理记录](docs/actions/2026-10-19-maruko-character-cleanup.md)。

工作区上层三份建筑参考文档已原样保留在 `docs/references/`；樱家室内最新状态见其 [独立说明](dist/town/assets/sakura-house/interior/README.md)。仓库接入过程与验证见 [行动记录](docs/actions/2026-10-18-character-prompts-and-github.md)。

## 打开编辑器

在项目根目录运行 `npm start`（或 `node scripts/serve.mjs`），打开 [小镇规划编辑器](http://127.0.0.1:4173/)。正式入口为 `/`，旧 `/editor-preview/` 地址会跳转到同源首页并保留查询参数和锚点。

当前页面依赖均在本地，浏览器需支持 WebGL 2。已有 4173 服务时无需重复启动。

| 场景 / 操作 | 使用方式 |
| --- | --- |
| 观赏 | 左键拖动环绕，右键或中键平移，滚轮缩放 |
| 布置 | 点击“布置街区”；左键放置、选择或拖动建筑，右键环绕，中键平移 |
| 查看建筑 | 双击建筑聚焦，Home 回到街区全景 |
| 编辑快捷键 | R 旋转、M 搬动、Delete 删除、Ctrl/Cmd+Z 撤销、Esc 取消 |
| 草地 | 不按键滑过可见草地会产生局部风；镜头或素材操作期间暂停新风 |
| 晴雨 | “布置街区 → 环境 → 天气”选择晴天或下雨；退出布置可近看，双击建筑聚焦 |
| 保存与文件 | “存档”面板自动保存、导出布局、导入布局；损坏旧存档保留原文，可下载备份 |

首开为 6×6 草地。每行可设置起点和格数，格数为 0 表示停用；轮廓变化先预览，确认后一次提交，可一步撤销。默认只显示场景和小型布置入口，进入布置后才显示工具与格线。

## 建筑与后续功能

- 编辑器当前可用：完整 AME MART 便利店街角、小丸子的家、みつや小店，以及直路、转角、丁字路、十字路。学校、公园仍待接入。
- みつや小店使用 B `anime-facade-landscape-09` 源码工厂，稳定 `assetId=mitsuya`，外观原比例占一格 14×14。狗屋、长凳、右侧松卷竹帘、左后低灌木粉花和门口陈设原样保留；全格遮罩地图长草。现有晴雨按实际屋顶与地面计算落点，门口暖光使用最多两家店/四盏有阴影下照灯。小店自身没有时间天气接口，不增加营业状态动画；独立室内继续保留，正式进出门、人物、碰撞和购物未接入。用户许可本阶段接入，后续美术可继续细化。
- 小丸子的家使用 B 交付的樱家 `exterior-03-states`，房屋、院落、植栽和院外电灯占一格 14×14，支持重复摆放、旋转、搬动和存档。原源码、GLB 和[独立预览](http://127.0.0.1:4173/town/assets/sakura-house/preview.html)保留在 `dist/town/assets/sakura-house/`。局部檐口滴水已通过 [B 当前接口](docs/handoffs/B-sakura-house.md)接入统一晴雨；原有夜灯、完整梯形光束和地面光斑保留，完整室内与全镇时段控制尚未实现。
- 咖啡店、书店、普通住宅和小公园仍作为旧样稿保留在各自建筑文件夹，通用创建入口仍可使用；正式编辑器不加载它们。
- C v2.4 已接入全地图晴天/下雨：雨丝按实体模型的首个接触面停止，在屋顶、院子、道路产生小水花；编辑建筑后同步更新。樱家已有檐口滴水复用原接口，所有实例共用累计秒数。人物、散步、全镇时段和其他天气仍待接入，本轮不发布网站。

## 存档兼容

正式首页沿用 `rainy-corner-layout` 格式、版本 1、已有素材 ID 和 `rainy-corner.editor.layout.v1` 存储键。旧编辑器地址与首页在同一个浏览器来源下共享存档，无需迁移。不同端口、域名或浏览器仍是不同存储空间，需要通过文件导出/导入。

下载文件名为 `小丸子小镇-布局-v1.json` 和 `小丸子小镇-存档备份.json`；文件名不改变格式。撤销历史只在当前会话保留。

天气属于运行状态，不写入布局或增加撤销步骤；刷新后恢复地图并回到晴天。

## 文件位置

- `dist/index.html`、`dist/main.js`：正式首页与编辑器宿主，相机、光照和帧循环。
- `dist/town/editor/`：布局、存档、编辑交互、草地、道路及运行桥；`weather.js` 管理全镇晴雨，`rain-surfaces.js` 查询真实几何遮挡。
- `dist/town/assets/<建筑编号>/`：一栋建筑一个文件夹；[建筑目录说明](dist/town/assets/README.md)。
- `dist/town/assets/shared/instances.js`：既有建筑缓存、实例克隆与独立门动画；完整资产入口和编辑器共用。
- `dist/world.js`、`dist/street.js`：仍在使用的几何、材质、贴图及完整便利店街角。
- `dist/vendor/`：固定版本 Three.js 0.180.0 与 MIT 许可。
- `scripts/inspect-editor.mjs`：当前编辑器回归，默认检查首页；`scripts/fixtures/editor-protected-assets.json` 保存整理前的受保护资产与编辑模块哈希。

## 旧页面归档

原雨夜便利店观赏页和固定地图散步页已移出正式运行目录，完整源码、依赖和专用脚本保存在 [旧原型归档](archive/2026-10-17-legacy-prototypes/README.md)。旧 `/walk/` 不再是当前站点入口；可按归档说明在独立端口查看。

以前的离线 HTML、截图、检查结果和樱家已认可版本仍保留在 `artifacts/`。本次整理没有发布网站，既有线上地址的内容不由本地文件变更自动更新。

## 检查与记录

`npm run check` 检查首页宿主语法；本地服务运行后，`npm run check:editor` 使用本机 Chrome/Playwright 执行完整编辑器检查，输出到 `artifacts/editor/current/`。检查使用隔离浏览器，不修改用户浏览器的存档。

`node scripts/inspect-weather.mjs` 检查晴雨控件、实体遮挡、四向旋转及搬动/删除/撤销、累计时钟、灯光保留和存档；结果、近景和录像在 `artifacts/editor/v2.4/weather/`。本轮实际结果与限制见 [C v2.4 天气行动记录](docs/actions/2026-10-17-C-town-weather.md)，技术检查与用户美术认可分别记录。

`node scripts/inspect-mitsuya-editor.mjs` 验证小店原模型、真实编辑交互、存档、资源隔离、暖光与雨面，输出到 `artifacts/editor/v2.5/mitsuya/`。小店接入及本轮完整回归结果见 [C v2.5 行动记录](docs/actions/2026-10-19-C-mitsuya-editor.md)。未向用户地图自动摆入建筑，布局格式和存档键不变；后续美术换版继续使用 `mitsuya`。

本次整理和实际验证见 [行动记录](docs/actions/2026-10-17-editor-home-and-legacy-archive.md)；[C 当前交接](docs/handoffs/C-town-editor.md)说明编辑器接口。自动检查不代表用户新的美术认可、完整人物玩法或真实移动设备验收。
