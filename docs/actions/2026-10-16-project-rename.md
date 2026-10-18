# 项目改名为「小丸子的小镇」

> 后续状态（2026-10-17）：正式名称为「小丸子小镇」，实体目录已经完成改名；旧路径为兼容联接。见 [本次行动记录](2026-10-17-project-rename-and-code-audit.md)。下文保留 2026-10-16 当时的执行事实。

## Status and situation

- 名称修改完成；实体目录改名待解除占用。用户已选择新项目名「小丸子的小镇」，授权修改项目文件夹和项目标题。
- 当前真实项目目录为 `E:\动森\rainy-corner`。C 正在继续做编辑器画面调整，B 的樱家仍未交付；保留既有工作，不停止其他窗口或服务。
- 新名称入口为 `E:\动森\小丸子的小镇`，包名为 `maruko-town`。实际执行中原目录被进程占用，重命名未发生；新名称入口是指向原目录的联接，两个路径仍指向同一份文件。
- 地图存档键、布局格式、素材编号、线上地址及 AME MART 店内招牌不随项目名称改变。无需重新安装依赖，不推送或发布。

## Implementation measures

1. 校验原目录与新目录均位于 `E:\动森`，保存本次涉及文件的改名前副本。
2. 将项目目录改为中文新名，并为旧路径建立目录联接；若操作系统因其他窗口持有目录而拒绝改名，先建立新名字到现有内容的兼容入口，明确记录实际结果。
3. 最小修改 README、包名与页面标题/编辑器品牌文字；保持其他窗口的页面结构和业务逻辑。
4. 检查新旧路径访问同一份文件、名称正确、预览可打开、存档标识及模型未改变。

## Affected file tree

- `E:\动森\小丸子的小镇\`：新建目录联接，目标为原项目目录。
- `E:\动森\rainy-corner\`：仍为真实项目目录，因进程占用尚未改名。
- `README.md`：项目名称和目录指引。
- `package.json`、`package-lock.json`：本地项目包名，依赖不变。
- `dist/index.html`、`dist/walk/index.html`、`dist/editor-preview/index.html`：页面标题。
- `dist/town/editor/ui-shell.js`：C 同时将界面模板拆到新文件，本次仅替换品牌文字；`ui.js` 未被本次写入。
- `docs/actions/2026-10-16-project-rename.md`：本次实际执行和验证记录。
- `artifacts/project-rename/`：改名前副本、路径和标题检查证据。

## Self-verification method

- 以 `Resolve-Path`、目录联接目标、文件标识和内容核对新旧目录。
- 静态检查项目包名、页面标题和未改动的地图存档标识；`git diff --check`。
- 通过现有本地服务检查页面状态和实际浏览器标题。仅验证此次改名，不重复与名称无关的模型/编辑器完整回归。

## Self-verification results

- 已校验两个路径均位于 `E:\动森`，目标不存在才执行；`Rename-Item` 返回“被另一个进程使用”，原目录未移动。随后建立新名字到原目录的联接，`realpath` 确认指向同一真实目录，未复制项目。
- README、package.json、package-lock.json、三个页面标题及编辑器品牌已改为新名称；依赖项未变。
- C 同时更新了 UI 并拆出 `ui-shell.js`，原位置名称替换因找不到旧文字而停止，未写入 C 的新版 `ui.js`。随后重新读取当前模板，仅替换其中的 AME MACHI 品牌文字；未回退 C 的变化。
- `persistence.js`、`state.js` 与本轮改名前副本逐字一致，地图存档键及布局格式未更改。
- `node --check dist/town/editor/ui-shell.js` 与 `git diff --check` 通过。独立 Chrome 打开 `/`、`/walk/`、`/editor-preview/` 均返回 200，实际标签页标题均以“小丸子的小镇”开头；证据在 `artifacts/project-rename/page-titles.json`。这里只验证名称，没有把 C 正在修改的功能当作已验收。
- 实体目录真正改名尚未完成，需在相关程序释放目录占用后进行；没有为改名终止 C/B 窗口或现有服务。未推送或发布。
