# 樱家室内本地预览入口修复

## Status and situation

Completed（入口修复及定向检查完成，用户当前窗口需刷新）。用户反馈页面能打开但模型空白，并提供掉样式截图与实际地址 `file:///E:/动森/小丸子小镇/dist/town/assets/sakura-house/interior/preview.html`。本轮仅修复预览入口，不修改建筑、颜色、房间布局或模型交付。

已用隔离 Chrome 实测两个文件入口：完整离线 HTML 在约 1.3 秒内 ready，样式 5326 字符、12 个房间按钮、1370×942 画布且无报错；源码 `preview.html` 在 8 秒后仍未 ready，样式 0 字符、房间按钮 0、画布 300×150，报 `file://` 模块 CORS 拦截，与用户截图一致。已有明确对照证据，故不再假设 GPU、模型或色彩故障。截图与用户地址补齐前的只读进程查询因权限拒绝，未依赖此信息作结论。

## Implementation measures

1. 在源码 HTML 入口延迟执行模块：本地文件且无离线内嵌资源时，转到已有完整离线预览，保留 query/hash。
2. HTTP 源码与后续内嵌打包继续启动原模块；保留打包器既有模块标记兼容性。
3. 用用户实际 file 地址验证样式、房间按钮、非空模型画布、旋转及玄关原图加载；核对 HTTP 模式和离线入口仍正常。
4. 更新 README 的本地打开说明，不改模型、不重复导出整屋，不启停服务。

## Affected file tree

- `dist/town/assets/sakura-house/interior/preview.html`：仅启动入口，模型与交互仍由原 preview.js 管理。
- 同目录 `README.md`：入口修复和本地使用说明。
- `scripts/inspect-interior-entry.mjs`：本次入口回归检查，拦截本地 HTTP 文件读取而不启动服务。
- `artifacts/buildings/sakura-house/interior/entry-01/preview-entry/`：本次检查报告与修复后实际截图。
- 本行动记录：原因、过程和检查事实。已完成的玄关制作记录保持历史状态。

## Self-verification method

- 同一检查命令在修复前应因本地源码入口未 ready 失败，修复后通过。
- 原地址、带玄关视角/对照参数的地址均抵达现有离线文件；样式为 grid、12 房间按钮、画布绘制有非背景像素，实际鼠标旋转有效。
- 本地读取拦截下的 HTTP 原源码正常运行；兼容已有内嵌打包模块替换，直接离线入口仍能启动。
- 源模块、GLB、现有离线文件与前次交付签名一致，只改变入口和本次记录；新增脚本语法及文本差异检查。

## Self-verification results

- `node scripts/inspect-interior-entry.mjs --before`：按预期失败，原 file 源码入口 8 秒后未 ready，body 为 block、样式为空、房间按钮 0、画布仅单色；控制台记录 file 模块 CORS 错误。报告及原始截图保存在 `preview-entry/before.json`、`before-source-file.png`，没有覆盖。
- 修复后 `node scripts/inspect-interior-entry.mjs`：四种打开方式全部通过。用户原地址自动转离线文件约 1.43 秒 ready，指定盆花视角/参考参数的地址约 1.12 秒 ready 且 query/hash 保持；直接离线入口约 1.12 秒，HTTP 源码约 0.78 秒。各页面 body 均为 grid，12 个房间按钮；80×60 画布采样获得 342–614 种颜色且有实际渲染三角面，非空白画布；鼠标拖动改变相机，玄关原图宽 1200 且面板可见。
- 既有打包器仍可替换模板中的原模块标记；内嵌资源分支在本地文件下成功执行替换模块且不发生跳转。此小型检查页保存在 `preview-entry/embedded-launcher-check.html`，用于复现入口分支，不是另一份模型交付。
- 页面异常/控制台错误为零；45 个非入口源文件签名、原完整离线 HTML 及 GLB 签名与玄关交付报告一致。此次不重新打包或修改模型资源。
- 已实际查看修复后整屋及盆花参考对照截图，样式恢复、模型可见。当前用户窗口没有被远程刷新，需要用户刷新原页面或打开完整离线入口。
- 收尾检查：`node --check scripts/inspect-interior-entry.mjs`、HTML 启动脚本的 `vm.Script` 语法解析、相关已跟踪文本的 `git diff --check` 均通过；新增脚本与行动记录正常出现在 Git 未跟踪列表，未被忽略。
- 未启停服务、未全项目回归、未改建筑/共享雪/用户存档，未提交推送发布或派任务。
