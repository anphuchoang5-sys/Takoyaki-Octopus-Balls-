# 已放弃的小丸子人物清理 · 2026-10-19

## Status and situation

- Completed。用户已取消继续制作“樱桃小丸子本人”；专属模型、代码、预览、工具及当前引用已清理，历史行动记录保留并标明取消状态。B 方案方块人未确认，本轮未制作替代人物或功能。
- 本轮根目录为 `E:\动森\小丸子小镇`。先完整读取 project-control-report、action-document 与用户 AGENTS 规则；磁盘未找到额外 AGENTS.md。
- 实际依赖核对：正式首页、编辑器、建筑未加载这个人物；人物静态比例预览单向引用樱家/室内与便利店组合，骨骼预览独立。共用 Three.js、建筑 GLTF 导出/加载工具和通用人物变更保护规则保留。
- 起始 Git 有みつや、编辑器、共用 README 等其他窗口未提交变更。它们不是清理目标；共用 README 仅替换人物任务段落，其余字节保留。写入/删除前重读并对照指纹；出现外部变化或归属不明即保留并记录。
- 主人物目录清理前有 177 个文件，含 8 个当前/历史 GLB、人物代码、预览、参考、截图、报告和日志。原 ACTION.md 正文已完整迁到[历史记录](2026-10-19-maruko-character-history.md)；其余专属内容已按[逐文件清单](2026-10-19-maruko-character-cleanup-files.json)删除。
- 目录外两份人物提示词及其 Git 签出验证副本已删除。README、建筑初始化说明、相关历史行动记录与快照中的人物任务段落已取消旧制作计划/链接。
- 不修改樱家、みつや、便利店、其他建筑、编辑器、天气、存档、项目名、包名、存档键、旧旅人原型。保留共享历史核验清单/哈希及 Git 历史，不据名称含“小丸子”或 maruko 删除。
- 不启动或停止任何服务，不运行浏览器/功能回归，不提交、推送、发布或派发任务。

## Implementation measures

1. 读取当前 Git 状态和候选文件，按实际职责/依赖确定清单，记录文件摘要、删除允许列表和范围外保护指纹。
2. 在 docs/actions 保留原人物 ACTION 正文，新增清理状态前言，明确下文属于已取消方案的历史记录；相关旧行动记录加同类说明，不把旧继续制作计划保留为待办。
3. 仅修改共用 README 与建筑初始化提示词中的人物关联；从历史签出/README 快照移除该人物任务入口，保留建筑及其他历史内容。
4. 对照允许列表逐项重读哈希，以 PowerShell 原生命令按绝对 LiteralPath 删除专属文件；仅移除清空后的原人物目录，禁止扩大到其父目录或其他目录。
5. 静态检查现行代码、HTML 入口、脚本命令和文档链接；比较范围外指纹、Git 索引/HEAD 和原有未提交变更；记录删除清单、保留理由及未运行项目。

## Affected file tree

实际新增：
- `docs/actions/2026-10-19-maruko-character-cleanup.md`：本轮记录。
- `docs/actions/2026-10-19-maruko-character-cleanup-files.json`：逐文件删除/迁移清单与原摘要。
- `docs/actions/2026-10-19-maruko-character-history.md`：迁移保留人物 ACTION.md 原文，顶部标记取消/清理状态。
- `artifacts/maruko-character-cleanup-20261019/`：本地清理前指纹、静态检查结果及执行记录；不含备份模型或新人物。

实际删除（180 个文件，另迁移 1 份行动记录）：
- `dist/town/characters/maruko/**`：该人物专属模型、材质/造型/蒙皮代码、当前与历史 GLB、预览、工具、参考和证据；ACTION.md 先迁移保留。
- `docs/prompts/character-artist-init.md`、`docs/prompts/maruko-character-model.md`：已取消人物的专属任务。
- `artifacts/github-onboarding-20261018/checkout-verification/docs/prompts/character-artist-init.md`、`artifacts/github-onboarding-20261018/checkout-verification/docs/prompts/maruko-character-model.md`：上述已取消任务的历史签出验证副本。

实际修改（8 个文档，只改人物关联）：
- `README.md`：取消旧人物制作任务与链接；保留并行编辑器/建筑说明。
- `docs/prompts/building-artist-init.md`：取消人物成品/README 查阅指令，其余建筑要求保持。
- `docs/actions/2026-10-18-character-prompts-and-github.md`、`docs/actions/2026-10-18-maruko-character-references.md`、`docs/actions/2026-10-19-building-artist-init-and-local-commit.md`：补充清理状态，保留原历史正文。
- `artifacts/github-onboarding-20261018/checkout-verification/README.md`、该目录的 `docs/actions/2026-10-18-character-prompts-and-github.md`、`artifacts/editor/v2.5/before/README.md`：移除人物任务入口或补充失效历史说明。其他历史核验凭据保留原样，原哈希仅说明当时快照。

## Self-verification method

- Git 只读状态、差异、HEAD/索引摘要；静态文本搜索覆盖工作区有效代码/入口/脚本、提示词/说明及被忽略的历史目录，分类区分项目名、建筑来源、旧旅人与目标人物。
- 删除前后逐文件 SHA-256 和存在性检查；迁移后的历史正文与原 ACTION 比较；共用文档仅指定段落改变；其他受保护文件摘要不变。
- 不执行产品代码的静态依赖分析：解析本地 import/export/dynamic import、HTML src/href/importmap 和文档 Markdown 链接；检查没有指向本轮删除目标的有效引用，记录已有无关失效项。
- 检查现行包脚本无人物命令；保留项目名、包名、存档键。对本轮文档运行限定路径的 `git diff --check`。
- 不运行模型、建筑、编辑器或天气回归，不通过 HTTP/浏览器启动预览，不操作服务/提交/推送/发布。

## Self-verification results

### 删除与保留

- 删除日志与清单精确一致：180 个专属文件删除，1 份原行动记录迁移保留，共 181 个原路径移除；`dist/town/characters/maruko/` 已不存在，删除目标残留 0。文件逻辑大小合计删除 73,014,035 字节，不将其称为实测磁盘回收空间。
- 所有删除均为 PowerShell `Remove-Item -LiteralPath` 逐文件执行；删除前再次读取 SHA-256，核对完整允许列表、绝对目标边界及路径无重解析点。目录仅在确认已空后逐个移除，没有递归删除父目录。
- 原 ACTION.md 正文逐字节保留；另三份相关历史行动记录和一份历史签出记录只增加清理状态前言。原模型/骨骼完成报告不代表当前存在成品，旧继续制作计划明确取消。
- 204 个范围外受保护文件 SHA-256 全部不变，包含其他窗口的みつや/编辑器/天气未提交变更及共用工具。README 除人物任务段落外的内容与清理前一致，保留其他窗口已有编辑；建筑初始化说明仅变更人物状态和旧 README 查阅指令。
- 项目标题、包名 `maruko-town`、布局/存档契约与键、旧旅人原型、樱家/みつや/便利店及其他建筑保留。没有创建方块人或任何替代人物。

### 实际静态检查

- `git status --porcelain=v1 --untracked-files=all`、`git diff`、`git rev-parse HEAD` 与索引 SHA-256 已核对。HEAD 保持 `c693d8027df3598994f9fe96f0f5bb33e0523d7e`，索引字节保持不变；未暂存、提交、切换分支、推送或发布。
- Node 内联只读扫描覆盖 `dist/`、`scripts/` 的 79 个 JS/MJS/HTML/CSS/JSON 文件及根 README、docs 下 28 个 Markdown；对 137 个可静态解析的本地导入、资源/入口和文档链接核对目标存在性。指向已删除文件的引用 0，活动人物专属标识引用 0，发现的失效本地链接 0；未声称执行过运行时或回归检查。
- `package.json` 的 start/check/check:editor 原有命令保持，无专属人物命令需要删除；人物 GLTFLoader 副本删除，建筑工具实际使用的 node_modules/Three.js 加载器和共用许可保留。
- 通过 `rg` 扫描当前目录以及被忽略的 artifacts、.openai 和旧原型 archive，目录外额外确认并删除两份专属提示词副本；改掉其共用 README 快照中的人物入口。旧原型里的 character.js 与截图是旧旅人，不属于该人物，未删除。
- 限定本轮编辑文档的 `git diff --check` 通过；新文档/清单、迁移历史正文、修改后文件摘要和删除日志已核对。
- 本地证据位于 `artifacts/maruko-character-cleanup-20261019/`：`before.json`、`document-edits.json`、`deletions.jsonl`、`deletion-summary.json`、`verification.json`、`git-verification.json`、`status-after.txt`。跟踪的完整删除清单见上方 JSON 链接。

### 有意保留的历史引用与执行边界

- `docs/actions/` 的历史正文以及 `artifacts/github-onboarding-20261018/`、`artifacts/local-commit-20261019/`、`artifacts/buildings/mitsuya/protected-*-before.json` 等共用历史核验清单仍记载当时的人物路径/哈希。这些是历史事实，不是运行入口、可用模型或继续制作待办；没有篡改历史校验结果或清除 Git 对象。
- 共用签出验证及编辑器 README 快照仅移除人物任务段落；其原核验哈希仍表示清理前快照，不宣称修改后仍与旧快照相等。旧旅人、项目名称和建筑出处中的“小丸子”继续保留。
- 未发现归属不明或持续变化而暂留的活动人物文件，当前清单无未清理项。
- 按用户要求未启动/停止任何服务，未执行 HTTP/浏览器预览或模型/建筑/编辑器/天气回归，也未读写用户浏览器存档。本记录中的通过结论仅指本轮静态核对。
