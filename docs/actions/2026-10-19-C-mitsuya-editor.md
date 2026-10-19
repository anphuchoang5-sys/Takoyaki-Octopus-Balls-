# C · みつや小店接入编辑器 v2.5

## Status and situation

- Completed（接入与技术验收完成；地图内美术效果待用户确认）。用户许可将 B `mitsuya / anime-facade-landscape-09` 街区外观接入；本阶段可用不等于美术永久定稿。
- 已完整读取 project-control-report、action-document、用户 AGENTS 规则以及 B `README.md`、`index.js` 和实际工厂/预览灯光实现。未发现磁盘额外 AGENTS.md。
- B 使用独立资源工厂、MeshToonMaterial 与自定义明暗分层；外观 root 原始比例 1，14×14，+Z 朝前，地块表面 .045，外观提供两盏 previewLamps，无 setEnvironment/updateEnvironment。独立室内不加载。
- 工作区已有 B 本轮美术变更（README/facade/index/GLB/检查与打包脚本等），本轮保留并建立当前文件保护指纹；不提交、推送、发布或覆盖用户地图。
- 编辑器目前已有通用建筑草地遮罩、独立资源释放与静态几何雨面查询，可直接复用。灯光只对便利店筛选，需在 C 侧接入有阴影的限额暖色下照灯，避免穿墙漏光。

## Implementation measures

1. 实际浏览器打开用户指定的离线三维预览，核对 revision 与狗屋、长凳、竹帘、粉花等当前造型并截图。
2. catalog 注册稳定 ID mitsuya，名称“みつや小店”，调用 createModel() 原返回对象；增加编辑器取景与灯光策略，更新待接入项。布局 v1 和存档键不改，默认地图不自动加建筑。
3. 复用统一灯光组织，便利店原灯位/数量策略保持，新增有阴影暖光池，最近至多两家小店/四盏灯；不改变 B 材质或营业状态。预览透明材质保留原 shader 钩子。
4. 隔离 Chrome 布局验收：多实例、点击/拖放/选择/搬动/旋转/删除/撤销，存档刷新/真实 JSON 导出导入，四向边界、原模型保真、草地遮罩、同街区与门口/粉花/竹帘截图，暖光限额/遮挡、晴雨真实落点及资源生命周期。
5. 运行原编辑器与天气回归，更新当前交接及检查记录，最后打开正式编辑器供用户查看。

## Affected file tree

- `dist/town/editor/catalog.js`：原 B 工厂调用、素材列表与取景，保留对象与 dispose。
- `dist/town/editor/lighting.js`：主场景现有灯光组织的限额暖色下照灯；不放入 B 模型。
- `dist/town/editor/scene.js`：透明放置预览保留原材质 shader 钩子；原生命周期继续管理独立资源。
- `scripts/inspect-editor.mjs`、`scripts/fixtures/editor-protected-assets.json`：新的素材数和授权 C 修改后的保护预期。
- `scripts/inspect-mitsuya-editor.mjs`：本轮独立真实浏览器验收。
- `scripts/inspect-weather.mjs`：仅新增 WEATHER_ARTIFACT_DIR 输出路径参数，保留 v2.4 报告，不改天气实现。
- `README.md`、`docs/handoffs/C-town-editor.md`、本行动文档：当前能力、稳定 ID、接口、技术结果和美术待确认。
- `artifacts/editor/v2.5/`：改前保护与备份、独立预览与同街区证据、导出布局、检查和交付清单。
- 不改：B 建筑（含独立室内、GLB、纹理、预览）、樱家/便利店、人物、布局/存档协议、地图草高密度、统一晴雨算法、正式首页的默认地图、依赖/公共服务。

## Self-verification method

- 源码语法检查与修改前保护指纹比较；重新读取修改目标避免覆盖并行更改。
- Chrome 打开 B 离线页面及正式首页，真实 WebGL 截图，独立测试存储；技术与美术验收分别记录。
- 工厂/实例所有几何、材质（含 gradientMap、自定义 shader）、贴图、语义节点指纹比较；独立资源释放次数；邻居不释放。
- 实际射线交叉核对雨面；四方向/编辑后更新；暖光池数量、变换、阴影及遮挡检查。
- `node scripts/inspect-mitsuya-editor.mjs`、`node scripts/inspect-editor.mjs`、`node scripts/inspect-weather.mjs`。

## Self-verification results

### 实际技术结果

- B 离线独立预览已在本机真实 Chrome 中打开：`artifacts/buildings/mitsuya/みつや-三维预览.html`。页面 revision 为 `anime-facade-landscape-09`，外观包含 1 狗屋、1 长凳、1 冰柜、3 糖果罐；页面错误 0。已查看总览与门口截图；证据 `artifacts/editor/v2.5/B-preview-inspection.json`、`00-B-offline-preview.png`、`00-B-entry.png`。
- `git diff --check`、`npm run check` 以及本轮 catalog/lighting/scene/专项脚本的 `node --check`：通过。
- `node scripts/inspect-mitsuya-editor.mjs`：**9/9 组通过，页面/控制台错误 0**。报告 `artifacts/editor/v2.5/mitsuya/inspection.json`。实际点击/原生卡片拖入、重复放置、选中/四向旋转、占格拒绝、搬动、直接拖建筑、删除/撤销、刷新恢复、文件导出/导入和未知资产拒绝均通过。实例 ID、位置与朝向正确，旧存档格式和键未改。
- `EDITOR_ARTIFACT_DIR=artifacts/editor/v2.5/editor`，运行 `node scripts/inspect-editor.mjs`：**23/23 组通过，页面/控制台错误 0**。原便利店、樱家、道路、全部编辑/轮廓撤销/旧存档恢复/导入保护/鼠标草风和独立资源检查重新运行通过。
- `WEATHER_ARTIFACT_DIR=artifacts/editor/v2.5/weather`，运行 `node scripts/inspect-weather.mjs`：**10/10 组通过，页面/控制台错误 0**。原晴雨、樱家局部环境与灯束、统一时钟、编辑后落点等回归通过。
- 当前小店原厂与三份放置实例：全部几何属性、索引、局部变换、材质/贴图及 shader 钩子指纹一致，**292 个网格、187 个材质、12 个纹理，其中 184 个三渲二材质**。保留 50 朵低灌木粉花，以及狗屋/长凳/竹帘/门帘/蒸笼/三罐/挂板/冰柜/货箱等原语义部件。
- 四向外观完整边界为 14×约 6.023×14、root.scale=1，底面约 -.14，地块嵌入地图地面无悬浮；和樱家/便利店原比例同街区展示。抽查相邻道路交界高差约 .028 项目单位，底面连续，没有改动原铺装或自动改变道路形状。该几何检查不代表人物碰撞/行走验收。
- 三个小店占格地图长草均为 false，默认 36 格中三栋小店后的地图草数为 33×24,000；小店自带草坪、低草簇、植物、粉花和石板路保持原几何。
- 资源检查：每小店当前可见资源/纹理集合 **519 个**；删除、替换、放置预览更换、缩略图结束、场景销毁各释放 519/519 且无重复，邻居 0 个释放。取消放置隐藏最多一个缓存预览，未释放或改变邻居；透明预览保留自定义三渲二 shader。
- 暖光检查：三家小店时最多 4 盏下照灯，两家最近实例参与；同场便利店仍使用原 5 盏灯。四向灯位与实例矩阵一致，512 阴影图实际生成，灯光向下、原强度 8/距离 4.3 未放大；实体侧墙/后墙拦截测试光路。实际近景可见柔和暖光；没有作全角度绝对无漏光的美术保证。
- 小店雨面独立双面射线交叉检查：四向各 420 点（共 **1,680**），每向 119 个斜面，最大误差约 6.83e-15。实际店顶/狗屋顶/地面均命中，144 条本格雨柱无低于首次接触面的穿雨；移动、旋转、删除、撤销后同步更新。晴天关闭统一雨，小店仍无自身环境 hooks。
- 修改前记录的 **88 个**受保护文件（全部建筑资产及室内/GLB/预览、原 world/street、状态/存档/草地/天气/首页）SHA256 全一致。B 工作区既有变更未覆盖。本轮仅更新授权的 C catalog/lighting/scene 指纹并加入小店当前交付基线，其他旧保护项保持。
- 两次小店专项均通过；第二次只补充更清楚的门口、整街、粉花和竹帘镜头。未发生产品或验收失败。原本地服务未运行，已使用既有 serve.mjs 启动 127.0.0.1:4173；没有更改服务、依赖或发布。

### 交付与美术待确认

- 正式首页 http://127.0.0.1:4173/ 已通过 Chrome 新窗口打开；“布置街区 → 素材 → みつや小店”可自行摆放。打开首页没有执行布局加载或放置代码，用户浏览器已有地图未自动替换。
- 同街区截图：`artifacts/editor/v2.5/mitsuya/08-three-buildings-same-street.png`；小店聚焦与左右邻居：`02-mitsuya-with-neighbours.png`。
- 门口暖光：`05-entry-warm-light.png`；左后粉花：`09-rear-pink-flowers.png`；右侧松卷竹帘：`10-right-bamboo-blind.png`。已实际查看这些截图。
- 晴雨与旋转：`03-rain-mitsuya-neighbours.png`、`04-rain-rotated.png`。测试布局导出为 `same-street-layout.json`，只用于隔离测试，没有导入用户浏览器。
- 已确认的只是本阶段接入许可；同街区体量、整体画风、暖光强弱及后续细化仍待用户美术认可。没有改 B 模型来强行统一其他建筑的画风。
- 小店无 setEnvironment/updateEnvironment；未实现独立昼夜/湿材质/檐水或营业状态动画。独立室内保留；正式进出门、人物、碰撞、购物未接入。未进行 100 个精细小店或移动设备性能验收。
- 本轮无提交、推送或网站发布。文件清单/版本/哈希见 `artifacts/editor/v2.5/delivery.json`，接入说明更新至 `docs/handoffs/C-town-editor.md`。
