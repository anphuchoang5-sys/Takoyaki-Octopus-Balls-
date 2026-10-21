# 姐妹房 · 秀树方形贴画修正

## 状态与情况

- 状态：Completed。2026-10-21 制作、定向检查、模型与离线预览更新完成，画面待用户认可。用户要求姐姐桌后的秀树贴画为正方形，更贴近所给动画画像，允许不画五官。
- 已实际查看本轮附件；其 SHA256 与已保存的 `references/sisters-03-sakiko.jpg` 一致，沿用原参考，不重复存图。
- 修改前姐08纸面为 0.333×0.46 米，画稿为短尖发、正面头像；本轮改为0.44×0.44米方形纸面、0.42×0.42米画面，蓬松棕色长发、略侧转头形及浅色衣领，脸部留空。参考被播放界面遮住的顶部和透视后的真实尺寸仍属补全。
- 仅修改姐08几何与画稿、对应清单说明、必要交付。姐姐圆镜、其他姐妹房陈设、其他房间、外观、编辑器与天气不动。保留工作区并行变更；不派任务、不提交、不推送或发布。
- 使用 project-control-report 与 action-document。此前 sisters-02 的历史完成记录保留。

## 实施措施

1. 保存当前姐妹房分组和局部贴图签名，作为本轮范围比对依据。
2. 将姐08纸面和画面改为等宽高，保留挂墙位置；重画棕色长发、脸部轮廓、蓝底与浅色衣领，不画五官或添加无法辨认的文字。
3. 更新姐08清单与当前说明，重新导出房间/整屋GLB及现有离线预览、对照图册。
4. 查看正面贴画近景及姐姐书桌整体，核对方形、轮廓、贴墙和未波及其他陈设。

## 影响文件树

- `dist/town/assets/sakura-house/interior/sisters-room.js`：仅姐08纸面与贴图平面尺寸。
- `dist/town/assets/sakura-house/interior/sisters-art.js`：仅 hideki 局部画稿。
- `dist/town/assets/sakura-house/interior/sisters-checklist.json`：姐08特征说明。
- `dist/town/assets/sakura-house/interior/README.md`：当前修正与证据入口。
- `dist/town/assets/sakura-house/interior/sisters-room.glb`、`sakura-interior.glb`：从当前源码重新导出。
- `artifacts/buildings/sakura-house/interior/sisters-02/`：复用现有检查、截图和离线交付；新增本轮贴画签名比对与近景证据。
- 本行动记录。不删除文件，不复制整套备份，不改共享室内工厂或预览交互。

## 自检方法

- 修改前后比较姐妹房各清单组的几何、变换、材质与贴图签名：只允许姐08与 hideki 图案变化。
- 复用 `node scripts/inspect-sisters-room.mjs`：其他房间和共享结构273组未变，房内边界、接地、陈设间距与查看操作通过。
- 复用 `node scripts/package-sisters-room.mjs`：两个GLB导出回读，离线预览断网和操作检查。
- 实际查看贴画正面和书桌整体截图；纸面宽高比1:1，图案无拉伸。画面最终认可由用户决定。

## 自检结果

- 实际查看原参考与浏览器放大局部，确认长至颈侧的棕色头发、蓝色背景、浅蓝衣服和宽白领；未沿用原来的短尖发和额外 HIDEKI 标题，不画五官。查看修改后的贴画正面、姐姐桌整体截图，未见拉伸、被遮挡或离墙的问题。
- 本轮浏览器签名检查：62组中仅姐08几何变化，其余61组的几何、变换和材质未变；14种图案中仅 `sisters:hideki` 变化。测得纸面宽高均0.4399999976米，宽高比1。证据：`sisters-02/hideki-scope-before.json`、`hideki-inspection.json`、`hideki-before.png`、`hideki-after.png`、`hideki-reference-detail.png`。
- `node scripts/inspect-sisters-room.mjs` 通过：其他房间及共享结构273组未变；59项清单、房间边界、14组接地、19组支撑、13对间距、入口/壁橱前通道、702个资源释放与旋转/缩放/平移/开关检查通过；页面异常0。共享结构及预览文件未修改。
- `node scripts/package-sisters-room.mjs` 通过：姐妹房GLB 18883860字节，整屋GLB 21522000字节，回读及编号检查通过；离线HTML 29211031字节，11个模块，4张参考，0网络请求、0页面异常，旋转/缩放/聚焦/散落物开关通过。清单图册同步更新，59项制作、地06排除保持原状。
- 离线包11个源模块的签名与最终源码一致；`git diff --check` 通过。实际交付文件仍为 `sisters-02/樱家-姐妹房02-三维预览.html`，以姐姐书桌机位重新打开。
- 首次浏览器读取出现 `ERR_CONNECTION_REFUSED`，原因是此前4184服务已关闭。为本房预览恢复本机4184服务，后台窗口隐藏，页面返回200后继续检查；未停止其他服务。未运行编辑器/天气全量回归，未修改其他房间或外观，未提交、推送、发布或派任务。
- 最终美术认可待用户；局部重绘与遮挡处补全不称严格复原。
