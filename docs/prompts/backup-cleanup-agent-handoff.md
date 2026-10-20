# 小丸子小镇：旧备份清理交接

你接手「小丸子小镇」的旧备份清理任务，不需要任何聊天历史。先按本文完成清理前核对，将可执行的目录清单直接列给用户。

**当前只授权核对剩余候选，没有授权继续删除。** 如果用户在转交本文时另外明确了要删除的目录，就按那份授权完成对应清理，不重复索取同一个确认；仅有“接手”“继续检查”或本文中的“候选”不构成删除授权。

## 1. 项目与规则

- 环境：Windows、PowerShell。
- 真实项目根目录：`E:\动森\小丸子小镇`。
- 仓库：`https://github.com/anphuchoang5-sys/Takoyaki-Octopus-Balls-`。
- 用户负责最终决定及窗口协调；不要自行打开窗口或向其他 agent 派任务。
- 一栋建筑一个文件夹，正式代码与模型在 `E:\动森\小丸子小镇\dist\town\assets`。保持该目录结构。
- 不使用旧 rainy-corner 路径，不改建筑美术、功能、存档、服务或忽略规则，不推送、不发布。
- 先读取适用 AGENTS.md 和 `C:\Users\YINGYI\.codex\skills\project-control-report\SKILL.md`。实际修改前读取 `C:\Users\YINGYI\.codex\skills\action-document\SKILL.md`，按现有行动记录方式记录范围与结果。

## 2. 已经完成的工作

以下是 2026-10-20 的交接事实，接手时重新核对，不强制回到这些提交：

- `4ab0dd4a1a522238321ae8147cf9274e6cee61c6`：已本地保存樱家 `exterior-04-roof`、みつや `anime-facade-night-10` 的最新代码、模型及交付记录。
- `4c6a747583ac527a0c735882bc8c211ff23a18b9`：已本地保存清理记录、剩余清单与当前说明。以上提交没有由本任务推送。
- 在建筑提交成功后，已删除下列五个目录，合计 99 个文件、约 45.75 MiB：

```text
E:\动森\小丸子小镇\artifacts\buildings\sakura-house\archive-beam-aim-approved
E:\动森\小丸子小镇\artifacts\buildings\sakura-house\archive-beam-full-spread
E:\动森\小丸子小镇\artifacts\buildings\sakura-house\archive-exterior-01
E:\动森\小丸子小镇\artifacts\buildings\sakura-house\archive-exterior-02-approved
E:\动森\小丸子小镇\artifacts\buildings\sakura-house\archive-exterior-02-lamp-approved
```

这些旧目录的清理已经结束；缺失是预期结果，不恢复它们，也不将它们继续列为待清理。

## 3. 接手时必须读取的文件

按顺序完整阅读：

1. `E:\动森\小丸子小镇\README.md`：当前正式资产和编辑器状态。
2. `E:\动森\小丸子小镇\.gitignore`：哪些内容只在本地。
3. `E:\动森\小丸子小镇\docs\actions\2026-10-20-building-commit-and-backup-cleanup.md`：实际授权、已删范围和保留验证。
4. `E:\动森\小丸子小镇\docs\actions\2026-10-20-backup-cleanup-candidates.md`：剩余目录的唯一详细清单，含数量、用途和已知依赖。

候选包括みつや history、编辑器 v2 至 v2.5 下的 before、建筑目录整理副本、编辑器首页改造副本、两轮项目改名副本和仓库签出验证副本。以清单中的具体路径逐项核对，不按“old”“archive”“before”等名称全盘搜索后批量删除。

只有核对到相关目录时才补读对应建筑 README、交接记录、检查脚本或旧原型 README；无需重新阅读整个美术制作历史。

## 4. 明确保留的内容

- `E:\动森\小丸子小镇\dist\town\assets`：所有正式建筑源码、模型、参考、贴图和共用代码，包括仍有通用接口的旧样稿资产。
- `E:\动森\小丸子小镇\artifacts\buildings\sakura-house\roof-04`：完整保留，包含 before。`E:\动森\小丸子小镇\scripts\inspect-sakura-roof.mjs` 会直接读取 before 中的 index.js。
- `E:\动森\小丸子小镇\artifacts\buildings\sakura-house\interior`、`E:\动森\小丸子小镇\artifacts\buildings\sakura-house\references`，以及樱家该层剩余文件。
- `E:\动森\小丸子小镇\artifacts\buildings\mitsuya\night-10`：当前交付及其 before、检查／打包脚本和模型基线。它不是整目录可删的旧备份。
- `E:\动森\小丸子小镇\archive\2026-10-17-legacy-prototypes`：旧便利店观赏页、散步原型与旧建筑的独立归档，已经纳入 Git，当前仍按此前决定保留。
- 编辑器各版本 before 之外的资料不随候选目录扩大删除，尤其是现行检查仍读取的 protected-before.json 等基线。

其他建筑窗口可能仍在工作。写入前重读目标文件；保留他人的未提交内容，不覆盖、回退、清理或顺手提交。仅出现无关目录的改动不必停止核对，目标文件发生重叠时先说明具体冲突并推进不冲突部分。

## 5. 核对方法与本阶段完成标准

1. 在真实项目根目录执行只读检查：Git 工作区、暂存区、最近提交、目录存在性。记录事实，不把交接日期时的干净状态当成当前状态。
2. 对清单每个目录确认用途、内容和大小；分别检查正式运行、离线预览、检查／打包工具及文档是否引用它。
3. 分清三个问题：目录是否被 Git 跟踪；文件内容是否在 Git 历史出现；完整旧版本能否恢复。这三者不能互相代替。
4. `artifacts` 被整目录忽略，部分旧源码、截图和工具仅本地存在。“看起来是生成文件”不等于可重建，“有 GitHub 仓库”不等于该目录已上传。
5. 将各项归为：可删除候选、删除会舍弃独有历史、仍在使用需保留、证据不足待核对。用户无需重新回答代码中可查到的事实。
6. 直接在回复中列出目录、用途、依赖和建议，简要说明哪些需要用户作舍弃历史的决定；不要只给文档链接。本阶段以完整核对清单为交付，不实际删除。

## 6. 只有获得具体目录删除授权后才执行的步骤

1. 形成明确的绝对路径删除清单和保留清单。若新授权包含此前保留目录，应明确指出覆盖了哪项旧决定，并以最新用户指示为准。
2. 按当次授权先本地提交需要保存的现有成果，核对暂存内容及提交成功；如现有提交已经完整覆盖要保留的版本，报告该提交即可，不制造空提交或另存整份源码备份。
3. 记录保留文件和删除目标的 SHA-256。检查最终绝对路径位于已授权目录内，没有重解析点把操作导向其他位置。
4. Windows 删除使用同一个 PowerShell 过程和 `Remove-Item -LiteralPath`，先验证全部目标再执行；不使用宽泛通配符、跨 shell 拼接删除或全仓库清理。
5. 删除后核对目标确实消失、保留内容未变、现行引用仍有效；必要时只更新直接相关的当前说明，保留历史记录作为当时事实。
6. 按明确路径本地提交实际发生的文档／受跟踪变更，再报告提交号、已删项、保留项、未完成项及真实验证结果；始终不推送。

这项清理不需要自行启动或停止服务、运行全量回归、重新导出模型或重新验收美术。若遇到仍在使用的代码／基线，保留并说明依赖，不为删除它而绕过检查。
