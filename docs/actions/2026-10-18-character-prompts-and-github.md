# 人物美术提示词与 GitHub 仓库接入

## Status and situation

- Completed。两份独立提示词已交付，当前项目已提交并推送到指定 GitHub 的 main。建筑与人物美术分开；人物先交可旋转的静态样板，确认长相和比例后才做走路、跑步动画。本轮没有制作人物模型。
- 用户同时授权将当前项目交由 `https://github.com/anphuchoang5-sys/Takoyaki-Octopus-Balls-` 管理。实际代码仓库根为 `E:\动森\小丸子小镇`，分支 main，原 HEAD 为 cc81931；当前没有 remote，没有已暂存文件。
- 目标仓库为公开仓库，连接器返回 push 权限；main 为 cd60fe461edc6fe80dfb718a4ec3d2a852665e61，仅有 LICENSE 初始提交，与本地历史无共同祖先。采用保留双方历史的合并：先提交当前项目快照，再合并远端初始记录并快进推送 main；不强推、不删除或覆盖远端已有历史。
- 本地未提交内容包括此前首页整理、B 樱家外壳/室内结构样板、C v2.4 统一晴雨。纳入项目快照，保留现有模型、源文件、归档和存档契约；不进行人物建模或运行功能修改。
- 已读取 project-control-report、action-document；未找到工作区额外 AGENTS.md。两份提示词遵循用户自行开窗/转交、不自动派发的规则。

## Implementation measures

1. 只读核对代码根、Git 状态、远端分支与当前 B/C 交付，保存修改前清单与文件指纹。
2. 编写独立的初始化提示词和人物建模提示词，包含当前真实路径、分工边界、风格参考、样板验收及用户确认后才进入动画的阶段要求。
3. 将本工作区项目相关参考文档保留到代码仓库的参考目录；检查拟提交文件、大小、依赖和敏感配置，仅纳入项目内容，依赖目录与临时产物继续排除。
4. 接入指定 GitHub；对照远端历史采用不覆盖已有内容的分支方案，提交当前项目，推送并核对远端提交与本地快照。
5. 记录真实完成状态及限制，向用户提供两份可复制提示词、仓库分支与提交结果。

## Affected file tree

实际新增/修改：
- `docs/prompts/character-artist-init.md`：人物美术窗口初始化提示词。
- `docs/prompts/maruko-character-model.md`：小丸子静态人物样板任务提示词。
- `docs/references/`：保留工作区上层已存在的项目建筑参考文档副本。
- `docs/actions/2026-10-18-character-prompts-and-github.md`：本行动记录。
- `README.md`：仓库管理与人物美术提示词入口。
- `.gitattributes`：保留源文件原有字节，避免 Windows 自动换行转换破坏已有 SHA256 保护基线及归档清单。
- `.git/config`、Git 提交及远端分支：版本管理接入，不变更产品运行行为。
- `artifacts/github-onboarding-20261018/`：本地指纹、范围核对、提交/远端核验凭据；不上传临时检查产物。

## Self-verification method

- 检查两份提示词分工独立、阶段明确，完整保留室内/室外独立空间决定和已有建筑。
- 比较当前产品源文件、模型与编辑/存档模块前后指纹；不因版本管理重复运行已有完整功能回归。
- 核对归档清单、文件体积、拟提交路径及敏感配置；运行适当语法/空白检查。
- 读取远端分支历史；推送后以 `git ls-remote` 对照精确提交 SHA，区分 GitHub 管理与网站发布。

## Self-verification results

- 只读核对：Git 根、原 HEAD、无远端/无暂存、B 室内结构样板与 C v2.4 晴雨均已核对；没有把人物任务当作已有成品。
- 已编写两份独立人物提示词；工作区上层 3 份建筑参考文档逐字复制并验证 SHA256，一并纳入项目，原文件保留。
- 网络读取首次在沙箱中连接本机代理失败；获准在沙箱外执行 git ls-remote / fetch 后成功。首次 GitHub 连接器参数名不匹配，按工具声明改为 repository_full_name 后成功获取权限和仓库状态。以上属于工具/网络环境问题，不是项目代码问题。
- 新文档及产品文件范围检查：158 个既有文件 SHA256 未变；本轮仅新增提示词/参考副本/仓库属性与记录、更新 README。首页宿主语法检查通过，拟提交路径未发现凭据文件或所检查的常见私钥/令牌模式，最大文件为樱家外观 GLB（8,705,228 字节）。
- 暂存全部现有作品后，完整 git diff --cached --check 提示 9 处既有空白问题：归档 Three.js 缩进一处、B 已有文件末尾空行八处。为保留模型源码/归档原文及保护指纹，不在本轮格式化这些文件；将单独检查本轮新增或编辑的文档及配置。首次暂存还提示全局换行转换，新增 .gitattributes 并重新暂存以保持逐字内容。
- 暂存字节验证发现首次按旧换行规则入库的缓存仍被复用；新增属性后使用 git add --renormalize 重新生成索引，逐文件核对原始 Git blob 和 SHA256，通过 166 项。没有改写工作区产品文件；CRLF 按原字节保留，空白检查识别合法 CR 行尾。
- 源码快照提交 f75a58d6d61a767ab289aaae1defbed9e7d410b0；与远端初始记录合并得到 ec5e43a07116e5e72430f80bad07653452af6e60，合并仅新增原远端 LICENSE，没有冲突。原本地 cc81931 与远端 cd60fe4 均保留为祖先。修改前完整 Git bundle 创建并 verify 通过。
- git push -u origin main 成功；随后 git ls-remote origin refs/heads/main 返回 ec5e43a07116e5e72430f80bad07653452af6e60，与本地完全一致。local main 已跟踪 origin/main；本次完成记录会作为后续文档提交同步，最终分支 SHA 以远端和本地 receipt.json 为准。
- 实际使用 git -c core.autocrlf=true checkout-index 导出到独立验证目录，166 个文件重新签出后 SHA256 与原工作区逐一一致；44 个归档原文件的清单再次验证通过。158 个既有产品/历史文件本轮前后字节不变，3 份上层参考文档副本与原文一致。
- 本轮新增/修改的文档与 .gitattributes 空白检查通过；完整树仍保留前述 9 个既有空白问题。本轮运行 node --check dist/main.js 通过，没有重复运行 B/C 的整套功能回归，也没有据历史报告宣称本轮美术或人物验收。
- 证据：artifacts/github-onboarding-20261018/ 下的 before-hashes.json、reference-copies.json、scope-check.json、index-proof.json、existing-whitespace.txt、receipt.json 和 history-before.bundle。临时目录、依赖和 artifacts 均未推送；产品源码、GLB、室内样板与旧原型源码归档均在仓库中。
- 当前无阻塞、无需用户再次确认仓库接入。未部署网站、未修改用户浏览器存档、未自动开窗派发美术任务。人物静态样板与后续动画仍由用户将提示词转交人物窗口后执行。
