# 小丸子小镇 · 实体目录改名与迭代冗余排查

## Status and situation

- Completed。用户本轮明确要求改名为「小丸子小镇」（去掉“的”），并排查多次迭代遗留代码。实体目录、当前页面和下载名称已更新；冗余排查已完成并记录，不删除旧产品入口、备份或其他窗口工作。
- 开始时实体目录为 `E:\动森\rainy-corner`，`E:\动森\小丸子的小镇` 是指向它的目录联接；目标 `E:\动森\小丸子小镇` 尚不存在。
- 已完整读取 project-control-report、action-document 与 code-review-skill；未发现磁盘祖先或项目内额外 AGENTS.md。沿用用户提供的协作规则。
- 工作区有多窗口未提交内容，先记录现状和指纹，再做限定修改；不提交、推送或发布。
- 当前 B 交接：exterior-02 获认可，exterior-02-lamp 新增电灯待查看；C 当前交接 v2.2。均不因改名冒充新的模型或交互验收。
- 存档格式 `rainy-corner-layout`、存储键 `rainy-corner.editor.layout.v1`、素材 ID、包名 `maruko-town` 和线上地址保留。

## Implementation measures

1. 保存改名前文件、Git 状态、项目文件指纹和目录联接信息。
2. 从项目外执行实体目录改名，核验源/目标均在 `E:\动森` 内。两次尝试均被占用阻止，第二次为用户关闭一个程序线程后的明确重试；随后确认占用者为两个项目预览服务及其非交互启动 shell。为完成已授权改名，短暂停止已核实的 4173/4184 服务，shell 随子进程退出；改名成功后建立旧路径联接，并以原端口、隐藏窗口恢复服务。未终止其他工作窗口。
3. 将 README、页面标题、编辑器品牌及导出/备份文件名改为「小丸子小镇」，同步当前交接和名称检查；旧行动记录仅增加后续状态指针，保留原始事实。
4. 从实际页面入口、模块引用和打包脚本追踪旧代码；区分仍使用、额外加载、闲置候选和历史归档，形成有行号依据的报告。
5. 核对路径指向、文件保全、名称与存档兼容；运行改名所需静态/浏览器检查，不将历史回归当作本轮执行。

## Affected file tree

实际范围：
- `E:\动森\小丸子小镇\`：已成为实际项目目录；`rainy-corner` 新建为指向它的联接，既有 `小丸子的小镇` 经旧路径联接访问同一份文件。
- `README.md`：正式名称和实际目录说明。
- `dist/index.html`、`dist/walk/index.html`、`dist/editor-preview/index.html`：页面标题。
- `dist/town/editor/ui-shell.js`：编辑器品牌。
- `dist/town/editor/ui.js`：布局导出和损坏存档备份的下载文件名，存档内容不变。
- `scripts/inspect-editor.mjs`：名称断言跟随改名。
- `docs/handoffs/C-town-editor.md`：当前名称与路径说明。
- `docs/actions/2026-10-16-project-rename.md`：增加本轮完成的后续状态链接，不重写历史执行结果。
- `docs/reviews/2026-10-17-code-redundancy.md`：引用关系与冗余排查结果。
- 本行动文档：实际执行与限制。
- `artifacts/project-rename-20261017/`：改名前副本、指纹、路径/检查证据；不覆盖历史交付。

## Self-verification method

- 改名前后比对所有原有项目源码、文档、脚本与模型指纹；明确排除本轮允许变更的文件，依赖和历史 artifacts 不改写。
- 用目录属性和 realpath 核对真实目录及兼容联接。
- 静态检查名称、布局格式/存档键不变、修改 JS 语法和 `git diff --check`。
- 隔离浏览器上下文核对页面标题、编辑器品牌和加载；不改用户浏览器存档。
- 冗余审计使用模块可达性、调用点与打包行为交叉核对，不以文本命中次数直接认定可删。

## Self-verification results

- 实体目录改名成功。Node `realpath` 与目录属性确认：`小丸子小镇` 为真实目录，两个旧路径均为联接且解析到同一个新目录；Git 顶层路径也为 `E:/动森/小丸子小镇`。没有复制项目。
- 4173、4184 原服务分别为 PID 53868、46456，已核对命令、监听端口与进程当前目录。停止后恢复为 PID 26524、13652；恢复时 cwd 为 `E:\动森`，通过新目录的绝对脚本路径启动，避免预览服务再次用 cwd 占用项目目录。实际页面 HTTP 200。过程见 `service-maintenance.json`、`path-and-service.json`。
- 隔离 Chrome 执行 `node artifacts/project-rename-20261017/verify-rename.mjs`：四个实际入口均正常加载，三个项目页面标题与编辑器品牌使用新名称，樱家独立预览正常；页面/控制台错误 0。旧格式/旧存储键的布局成功读取，导出为 `小丸子小镇-布局-v1.json`，解析后内容不变；损坏旧存档可原样下载为 `小丸子小镇-存档备份.json`，原存储未被覆盖。详见 `browser-check.json`。
- `node --check` 检查本轮修改的 `ui.js`、`ui-shell.js`、`inspect-editor.mjs` 通过；`git diff --check` 通过。没有为名称变更重新运行完整 21 组编辑器回归或 B 模型验收。
- 改名前记录 87 个项目源码、文档、脚本和模型文件的哈希（包括本行动记录；不遍历依赖、Git 内部或历史 artifacts）。最终比对仅本轮允许文件发生变化，无意外变更、无缺失；B 模型、原有运行代码、存档模块、依赖与配置保留。详见 `preservation.json`。
- 冗余审计：49 个 JS 模块在四入口的依赖并集中均可达；确认旧离线打包器多收模块、编辑器额外加载四种旧建筑、阴影重复判断和未消费 palette 常量。Chrome 请求记录验证了额外加载。旧模型仍用于 `/walk/`，兼容入口没有重复模型。完整依据、位置、过期说明和建议顺序见 `docs/reviews/2026-10-17-code-redundancy.md`。
- 环境限制：首次 Node 子进程执行 Git 遇到 `spawnSync git EPERM`，改为直接 PowerShell 执行 Git；只读进程查询和无界面 Chrome 在沙箱内被拒，授权提升后成功。它们属于执行环境限制，不是项目代码故障。
- 未删除运行代码、旧页面、离线交付或历史备份；未停止其他制作窗口；未提交、推送或发布。名称和路径检查不代表新的画面、完整玩法或设备验收。
