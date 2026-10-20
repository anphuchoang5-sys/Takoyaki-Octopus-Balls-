# 按既有清单执行剩余旧备份清理

## Status and situation

状态：Completed。

用户于 2026-10-20 明确授权“按 Codex 之前列的清理计划开始清理”。该计划是此前 Codex 清理会话中列出的 12 个剩余候选目录，与仓库内[剩余候选清单](2026-10-20-backup-cleanup-candidates.md)一致；本轮按这 12 个明确目录执行删除，已全部完成。

起始事实：项目根目录 `E:\动森\小丸子小镇`，分支 `main`，HEAD `880ec06`，本地记录的 `origin/main` 为 `e0b9f57`，本地领先 5 个提交；已跟踪工作区干净。五个樱家旧 archive 已在上一轮删除，不恢复、不重复处理。

执行环境：DSH 沙箱先后在项目根和 `artifacts/` 上缺少写入所需权限，Git 与 artifacts 写入被拒；按授权运行了两次 Windows 文件权限诊断修复（根目录、`artifacts/`），均验证通过，未改文件内容或所有者。沙箱进程为低完整性且 `artifacts/` 未继承相应标签，实际删除脚本在获授权的非沙箱 PowerShell 中运行；脚本只处理下列 12 个绝对路径，并在删除前重新核对路径与重解析点。权限恢复脚本保留在 `E:\动森\_dsh-acl-recovery\`。

本授权覆盖此前“其他备份只列清单、不删除”的临时边界，但**不覆盖**以下保留决定：

- `artifacts/buildings/sakura-house/roof-04/` 整个目录，含 `before/` 与 `protected-before.json`；
- `artifacts/buildings/sakura-house/interior/`、`references/` 及樱家根目录资料；
- `artifacts/buildings/mitsuya/night-10/` 当前交付，含 `before/`；
- `archive/2026-10-17-legacy-prototypes/` 旧原型归档；
- `dist/town/assets/` 全部正式资产；
- 编辑器各版本 `before/` 之外的检查基线、截图、报告与交付产物，特别是 v2.4/v2.5 的 `protected-before.json`。

`artifacts/` 仍被 Git 忽略；本轮删除的 12 个目录均未纳入 Git，删除后不能从 GitHub 完整恢复。部分目录含未进入 Git 的独有中间版本，用户已在获知这一点后授权。

## Implementation measures

1. 只读复核 12 个目标的绝对路径、存在性、文件数、容量、重解析点及保留目录；确认起始 HEAD 与工作区状态。
2. 为删除目标和保留目标建立 SHA-256 清单，写入本地 `artifacts/backup-cleanup-20261020/`；不复制源码。
3. 使用同一个 PowerShell 过程再次验证全部目标均位于 `artifacts/` 内、无重解析点后，按逐项 `Remove-Item -LiteralPath` 删除 12 个目录。
4. 删除后核对 12 个目标不存在、保留目录与关键检查输入仍存在、保留文件摘要未变。
5. 更新根 README、候选清单、本行动记录、みつや README 和交接提示词的后续状态；只做静态引用检查，不运行浏览器、全量回归、模型导出或服务启停。
6. 按明确文档路径本地提交；不推送、不发布。

## Affected file tree

仅删除以下 12 个目录（均相对项目根）：

- `artifacts/buildings/mitsuya/history/`
- `artifacts/editor/v2/before/`
- `artifacts/editor/v2.1/before/`
- `artifacts/editor/v2.2/before/`
- `artifacts/editor/v2.3/before/`
- `artifacts/editor/v2.4/before/`
- `artifacts/editor/v2.5/before/`
- `artifacts/building-folders/before/`
- `artifacts/editor-home-20261017/before/`
- `artifacts/project-rename/before/`
- `artifacts/project-rename-20261017/before/`
- `artifacts/github-onboarding-20261018/checkout-verification/`

新增或更新：

- 本行动记录：授权、范围、删除与保留核对结果。
- `docs/actions/2026-10-20-backup-cleanup-candidates.md`：把 12 项标记为已按新授权删除，保留历史核对数据。
- `README.md`：同步当前清理状态。
- `dist/town/assets/mitsuya/README.md`：移除指向已删除 `history/01-before-color-reference.zip` 的当前说明。
- `docs/prompts/backup-cleanup-agent-handoff.md`：补充“12 项已执行”的后续状态，保留交接时的边界。

本地证据（不进入 Git）：`artifacts/backup-cleanup-20261020/pre-delete-targets.json`、`pre-delete-retained.json`、`pre-delete-summary.json`、`post-delete-verification.json`。

## Self-verification method

- `git status`、`git rev-parse HEAD`、`git rev-parse origin/main`：起始和收尾状态。
- 逐目标解析绝对路径，检查位于 `artifacts/` 下、目录存在、无重解析点；检查路径祖先无重解析点。
- 删除前对全部目标文件与 `artifacts/` 内非目标文件计算 SHA-256，记录文件数、字节数和排序摘要。
- 删除后检查 12 个目标均不存在；保留目录、roof-04 检查输入、v2.4/v2.5 保护基线仍存在。
- 复核保留文件清单的路径集合与 SHA-256；核对当前代码和脚本未引用被删目录。
- `git diff --check`、`git diff --cached --check` 检查文档差异。
- 不运行回归、浏览器、模型导出、服务启停或推送。

## Self-verification results

### 删除前

- 2026-10-20 18:00 前后核对：HEAD `880ec06`，`origin/main` `e0b9f57`，已跟踪工作区干净；五个樱家旧 archive 仍不存在。
- 12 个目标全部存在；合计 361 个文件、37,061,888 字节（35.34 MiB）。逐项确认绝对路径位于 `artifacts/` 下；目标内部与路径祖先均无重解析点。
- 保留输入存在：roof-04（含 `before/index.js`、`protected-before.json`）、interior、references、night-10（含 `before`）、v2.4/v2.5 保护基线、archive、dist/town/assets。
- 目标 SHA-256 清单与聚合见 `pre-delete-targets.json` / `pre-delete-summary.json`：聚合 `b7945cc564d06ec764cd11fcc32af5a88b9eb477dc40d814c22b76a036326c88`。
- 保留 artifacts 485 个文件 SHA-256 清单与聚合见 `pre-delete-retained.json`：聚合 `5eac245a0ddb09e5cc9cbd19b7536928431231c4d15f62d426d1e1e75efb4b12`。

### 删除与保留核对

- 12 个目录逐个使用 `Remove-Item -LiteralPath -Recurse -Force` 删除；共 361 个文件、37,061,888 字节（35.34 MiB）。
- 删除后 12 个目标全部不存在。
- 保留的 485 个 artifacts 文件全部存在；missing、changed、extra 均为 0；聚合仍为 `5eac245a...`，与删除前一致。
- 关键检查输入仍存在：`roof-04/before/index.js`、`roof-04/protected-before.json`、`interior/protected-before.json`、`sakura-house/protected-before.json`、`v2.4/protected-before.json`、`v2.5/protected-before.json`。
- 删除后、文档更新前，已跟踪工作区仍干净；删除本身没有改动任何 Git 跟踪文件。
- 证据：`artifacts/backup-cleanup-20261020/post-delete-verification.json`。

### 文档与引用

- 已更新根 README、候选清单、本记录、みつや README 和交接提示词的后续状态。
- 静态检索当前 `scripts/` 与 `dist/`：没有引用被删的 12 个目录；`scripts/inspect-sakura-roof.mjs` 仍读取保留的 `roof-04/before/index.js`。
- `git diff --check`、`git diff --cached --check` 在提交前检查；本地提交在文档收尾后创建，提交标识以包含本记录最终内容的 Git 历史为准。

### 偏差、限制与未运行项

- 预检曾因脚本执行策略、`pwsh` 路径、脚本编码解析和被占用的 `server-error.log` 中止；这些尝试都没有删除文件。最终改为纯 ASCII 脚本与共享读取，目标文件仍要求全部可读，成功完成。
- `artifacts/` 仍被 Git 忽略；12 个目录均未纳入 Git，删除后不能从 GitHub 完整恢复。部分目录含独有中间版本，已按用户新授权舍弃。
- 没有运行浏览器、全量回归、模型导出、服务启停或发布；没有推送。
