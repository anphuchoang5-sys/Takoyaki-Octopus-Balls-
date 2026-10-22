# flowerorangebuilding · 旋转时地块闪烁

## Status and situation

状态：Completed（旋转闪烁已复现、修复并通过在线/离线定向验证；用户当前已打开页面需要刷新或重开）。用户反馈“旋转时地块出现不断闪烁的问题”，本轮定位并修复该建筑独立预览中的地块闪烁，保留 exterior-02-entry 的院门、台阶、花盆及建筑造型，交付版本 exterior-03-ground。

已读取项目 AGENTS.md、术语、资产说明，以及 diagnosing-bugs / project-control-report / action-document。当前资产与交付脚本包含本窗口上一轮入口修改，其他建筑、地图和共享积雪也有并行修改；不回退或覆盖。

已建立真实 WebGL 旋转复现，记录同一地块表面的像素稳定性与截图，并通过单变量探针确认草皮顶面与底座顶面共面是根因。本轮不改地图、共享灯光/积雪，不启停服务、提交、推送或发布。

## Implementation measures

1. 用现有预览和隔离浏览器复现旋转闪烁，建立能在修复前失败的定向检查。
2. 缩小到地块表面，逐项验证原因；只修复产生问题的几何或本建筑预览设置。
3. 重跑同一旋转检查，核对既有建筑、入口和花木保持不变。
4. 更新静态模型、离线预览和对照页，记录实际结果及用户浏览器尚需刷新查看的边界。

## Affected file tree

- `dist/town/assets/flowerorangebuilding/index.js`：仅调整底座厚度/中心高度和版本号，草面与建筑位置保持。
- `scripts/inspect-flowerorangebuilding-ground.mjs`：新增真实旋转的地面稳定性检查及证据截图。
- `dist/town/assets/flowerorangebuilding/{README.md,flowerorangebuilding.glb}`：状态说明与同步静态交付。
- `artifacts/buildings/flowerorangebuilding/`：问题复现、检查结果、更新的离线预览和截图；诊断证据放在 `ground-debug/`。
- 本行动记录：范围、根因证据、修复与实际验证。

## Self-verification method

- 对实际渲染的同一地表采样点，改变相机角度并读取像素，捕获异常颜色跳变；保留修改前失败与修改后通过记录。
- 单变量关闭阴影、隐藏重叠候选面或调整裁剪范围，区分原因，不将临时调试设置交付。
- 修改文件语法检查、定向 `git diff --check`；建筑分组与入口几何指纹对比。
- 复用本建筑交付检查验证旋转/缩放、离线包与 GLB 回读；不运行全项目回归。

## Self-verification results

### 已复现与根因

- `node scripts/inspect-flowerorangebuilding-ground.mjs --label=before` 已运行并失败（预期红灯）：17 个旋转角度，33/33 个固定地表点颜色跳变，最大通道范围 41/255，浏览器错误 0。命令约 8 秒，直达真实 WebGL 像素，捕获用户描述的旋转闪烁。
- `--label=minimal --minimal` 只显示地块两层仍为 33/33 跳变，排除建筑/花木；保留证据 `ground-debug/{before,minimal}.json` 与截图。
- 实际几何边界：底座顶与草皮顶都为 .0799999982。排序验证：隐藏底座后 0/33 跳变、最大范围 1；关闭阴影仍 33/33、范围 41；缩小相机 near/far 仍 33/33、范围 41。根因为同高度重叠面争抢深度（z-fighting），不是阴影或仅相机深度范围问题。
- 单变量探针分别为 `--label=probe-hide-base --minimal --probe=hide-base`、`--label=probe-no-shadow --minimal --probe=no-shadow`、`--label=probe-clip --minimal --probe=clip`。临时设置仅存在隔离浏览器，不写入交付预览。

### 修复与验证结果

只将底座厚度 .20 调为 .175、中心 Y 从 -.02 调为 -.0325，底部仍为 -.12、顶面变为 .055，刚好承托草皮底面。草皮顶面 .08、所有建筑/入口/花木位置保持。版本更新为 exterior-03-ground；预览光照、阴影和相机配置未修改。

- `node scripts/inspect-flowerorangebuilding-ground.mjs --label=after --compare` 退出 0：同样 17 个角度、33 个地表点，异常跳变 0，最大通道范围 1（修复前 41）。五个非地块分组（主体墙、橙瓦屋面、门窗阳台、围墙门屋、庭院花木）几何指纹与修改前完全一致。已实看 `ground-debug/after-a.png`，原先地块条纹消失。
- `node scripts/inspect-flowerorangebuilding-ground.mjs --label=offline-after --offline --compare` 退出 0：直接 file:// 打开更新后的离线预览，同样为 0/33 异常跳变、最大范围 1、浏览器错误 0，几何指纹保持。
- `node artifacts/buildings/flowerorangebuilding/inspect-entry.mjs` 退出 0：保留并重新核对两侧折墙、台阶/平台、花盆和门柱承托与通道，更新当前入口截图。
- `node scripts/inspect-flowerorangebuilding.mjs --deliver --entry` 退出 0：模型几何有限/非退化与地块边界通过，真实旋转/缩放/平移和离线包断网操作通过，HTTP 请求 0；静态 GLB 导出回读边界一致。GLB 为 21121568 字节，离线 HTML 为 3417932 字节；对照页更新并实际加载。原有 LineBasicMaterial 导出建议仍保留，不作为新失败或 GLB 全角度美术认可。
- 运行文件和新检查脚本的 `node --check` 通过；定向 `git diff --check` 通过。`rg -n 'DEBUG-' dist/town/assets/flowerorangebuilding scripts/inspect-flowerorangebuilding-ground.mjs` 无匹配（rg 退出 1 为正常无匹配）；没有生产调试日志或临时隐藏/禁用阴影设置。诊断 JSON/截图留在明确命名的 `ground-debug/`，回归脚本保留单变量诊断选项用于复现。

### 交付与边界

- [当前可旋转离线预览](../../artifacts/buildings/flowerorangebuilding/花满橙瓦屋-三维预览.html)；在线入口沿用 `http://127.0.0.1:4184/town/assets/flowerorangebuilding/preview.html`。
- [原图与模型对照](../../artifacts/buildings/flowerorangebuilding/原图与模型对照.html) 和静态 GLB 已同步当前版本；既有入口修改前截图保留为历史证据。
- 检查覆盖本建筑预览的 17 个旋转角度和地面采样，不等于所有设备/正式地图已验收。未操作用户当前浏览器标签；已加载的旧离线页面需要重新打开或刷新才读取新文件。
- 未修改其他窗口文件、地图、共享雪景/灯光/天气，未启动/停止服务，未提交、推送、发布或运行全项目回归。前一轮未提交的入口工作保留。
