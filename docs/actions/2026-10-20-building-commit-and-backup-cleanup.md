# 最新建筑本地提交与樱家旧备份清理

## Status and situation

状态：In progress。

用户明确授权：先将最新建筑代码和模型本地提交，再删除樱家五个指定旧备份；保留 roof-04、室内和参考资料；其他建筑及编辑器的旧备份只整理清理清单，不推送。

项目为 `E:\动森\小丸子小镇`，起始 HEAD 为 `c6ce576f77b0aa0180abd8b8b5f53e20fbf8c2d0`，分支 main，暂存区为空。本地记录的 origin/main 为 `e0b9f57c7d4e9b490e536e8dd33848fe7263a04c`；本轮不联网更新或推送。

当前 9 个已跟踪修改与 5 个新文件来自樱家 `exterior-04-roof` 和みつや `anime-facade-night-10` 的已交付工作。本轮保存现有实现，不重做美术；技术与视觉验证沿用各建筑行动记录，不冒称本次重新验收画面。

`artifacts/` 被 Git 忽略。指定旧备份中有些历史代码没有对应的现有 Git 内容；本次删除是按用户决定舍弃这些旧副本，不声称已上传或能够完整从 Git 恢复，也不额外复制一套旧备份。

## Implementation measures

1. 核对 Git 差异、建筑交付记录和提交钩子，记录候选文件及范围外文件摘要。
2. 对本轮建筑 JS/MJS 执行语法检查，对现有 GLB 执行文件头、长度及 JSON 块检查；不运行浏览器或全量回归。
3. 按明确文件清单暂存建筑代码、模型、交付记录与本行动记录，核对内容后先创建本地建筑提交。
4. 在提交成功且目标路径、文件摘要再次确认后，只删除五个指定目录。Windows 删除使用 PowerShell 原生 LiteralPath，并检查解析后的绝对路径及重解析点。
5. 其他备份只形成独立清理清单；同步当前说明中关于已删除目录的文字，不改写历史行动记录的原有事实。
6. 核对保留目录、其他备份和正式资产未被清理操作改变，再本地提交清理说明与清单。

## Affected file tree

本地建筑提交保存的已有成果：

- `dist/town/assets/mitsuya/README.md`、`index.js`、`preview.html`、`preview.js`、新增 `environment.js` 与 `preview-lighting.js`：夜晚 10 资产与预览接口。既有外观和室内 GLB 保留，不重导出。
- `dist/town/assets/sakura-house/README.md`、`index.js`、`preview.html`、`sakura-house.glb`：屋顶 04 资产与模型。
- `docs/handoffs/B-sakura-house.md`、`docs/actions/2026-10-20-B-sakura-roof.md`、`docs/actions/2026-10-20-B-mitsuya-night.md`：已有建筑交付记录。
- `scripts/inspect-sakura-roof.mjs`：屋顶交付工具，只保存并检查语法，不执行其浏览器检查。

本轮新写或更新：

- 本行动记录：授权、提交顺序、实际清理范围与核对结果。
- `docs/actions/2026-10-20-backup-cleanup-candidates.md`：其余建筑、编辑器及相关旧备份清单，仅登记，不删除。
- 根 `README.md`、樱家资产 `README.md` 及樱家交接说明：同步最新资产和五个旧备份已删除的事实。

仅删除以下五个目录（均在 `artifacts/buildings/sakura-house/`）：

| 目录 | 起始文件数 | 起始字节数 |
| --- | ---: | ---: |
| archive-beam-aim-approved | 4 | 377191 |
| archive-beam-full-spread | 4 | 382727 |
| archive-exterior-01 | 28 | 15420682 |
| archive-exterior-02-approved | 32 | 15595341 |
| archive-exterior-02-lamp-approved | 31 | 16197895 |

保留：同目录 `roof-04/`、`interior/`、`references/` 及根目录文件；所有正式资产、其他建筑和编辑器备份、旧原型归档、存档、服务及 Git 忽略规则。

## Self-verification method

- `git status`、工作区和暂存差异、HEAD 与本地 origin/main：提交范围和本地提交结果。
- `git diff --check`、`git diff --cached --check`、`node --check`：差异与语法检查。
- GLB 魔数、版本、文件长度、块边界和 JSON 解析：模型文件基本完整性，不等同于渲染验收。
- SHA-256：提交前已核对文件内容、删除目标及保留内容一致性。起始记录覆盖 213 个已跟踪文件、5 个新增文件与 547 个保留产物。
- 删除后检查五个目录不存在、保留目录存在且原有文件内容一致。
- 不运行回归、构建、模型导出、浏览器、美术验收、服务启停或任何推送。

## Self-verification results

提交前检查已完成，提交及清理尚待执行：

- 提交钩子目录没有启用的非 sample 钩子。
- `git diff --check` 通过；6 个变更 JS/MJS 的 `node --check` 全部通过。
- 樱家外观、樱家室内、みつや外观和みつや室内共 4 个 GLB 的文件头、长度、块边界和 JSON 块均通过基本完整性检查。樱家外观为 10014344 字节，SHA-256 为 `fe9a06154abed81f251f194d4d2a7287cfd761f973eb2f673856c0dd84213de9`。
- 最新建筑的浏览器与美术检查没有在本轮重跑；原制作验证及待审状态仍以各建筑行动记录为准。
