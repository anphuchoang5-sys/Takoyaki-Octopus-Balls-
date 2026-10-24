# 爷爷奶奶家 · exterior-01-reference

2026-10-23。按用户本轮所附对应正面动画截图制作的新三维外观；**制作与定向检查完成，画面待用户认可，未接入地图**。

## 身份与文件

- 稳定 ID：`grandparents-house`；revision：`exterior-01-reference`；正面 +Z、Y 向上。
- 独立预览地块：18×13，中心原点。尺寸根据参考比例补全，未获确认，也不是编辑器已支持的占格；不填写虚假的单格 tileSize。
- `index.js` 为正式可编辑几何工厂；`grandparents-house.glb` 为静态交换模型（不含预览地面、相机或灯）。
- `references/user-exterior.jpg` 是用户提供的原始参考，不包含使用授权判断。
- 复用 `../shared/residential-kit.js` 与已有 `../flowerorangebuilding/geometry.js`；后者未修改，交付源码时须包含这项依赖。
- `preview.html / preview.js` 使用 `../shared/residential-preview.js / residential-preview.css` 和仓库 `dist/vendor/`。

## 查看

无需启动服务，直接打开：
`artifacts/buildings/three-houses/grandparents-house/爷爷奶奶家-三维预览.html`

包含模型、Three.js、参考图与 GLB 下载；支持真实拖动旋转、滚轮缩放、右键平移、十个机位、植物显隐、自动环绕与原图同屏。
总图册：`artifacts/buildings/three-houses/三栋住宅-交付图册.html`，含各自参考、侧后、俯视与重点近景。
源码入口：`dist/town/assets/grandparents-house/preview.html`（需提供模块文件的 HTTP 宿主；本轮未启停服务）。

## 制作依据与补全

横向低宽红屋顶、右侧抬高山墙、薄荷绿墙面、山墙纹章、菱形玄关与院门、双层蓝灰/奶油围墙、左圆树与右柏树。
正面右山墙高于横向主屋脊；菱形玄关、院门和通道已对齐。

真实几何：有厚度的相交坡面与顺坡接缝、山墙白边、雨棚、窗框与菱形木格、石门柱、围墙压顶、树干与叶团。
表面表现：玻璃使用不透明动画蓝色，细反光线为浅浮起几何；没有动态反射或照片贴图。植物的小叶片也是几何。
光照：独立预览提供半球光和日光，仅用于审看；未向建筑实例塞入真实光源。
补全：抬高山墙向后回接主屋脊的坡度、整屋纵深、侧后门窗、庭院尺寸和部分植物位置。不可称为原作严格复原。

## 接口与边界

`createModel()` 返回 `root/specification/dispose/setEnvironment/getEnvironment/getLightingDescriptors/getInspection`；资源为实例所有，重复释放保护已验证。
`setEnvironment` 仅记录合法的时段、天气、雪量，材质可接受宿主光照；`getLightingDescriptors()` 返回空数组。没有专属日夜变化、雨湿、积雪、融雪或承雪注册；不能把参数接收当作效果已制作。
未制作独立室内、角色、碰撞、寻路和进出门；`colliders/floors/roofs/lamps` 为空的兼容元数据，不作为能力承诺。
当前 `editor/catalog.js` 未引用本资产，正式首页不自动加载本次新增模型。没有修改任何共用雪代码、承雪二进制或缓存。
后续地图接入应先由用户确认占地及对应占格能力，再按实际工厂和所有权接入，不强制缩放为 14×14。

## 本轮验证

- `node scripts/inspect-three-houses.mjs --package`：本资产 12 项定向检查通过，页面错误 0；真实旋转、缩放、平移、植物切换通过。
- 实际几何 82,340 三角面；有限坐标、地块边界、屋面封板无穿出、实例资源独立及重复释放保护通过。
- GLB 回读三角面相同、包围盒最大误差 < 0.0001；离线模块和原图加载不依赖网络。
- 检查和截图：`artifacts/buildings/three-houses/grandparents-house/inspection.json`；实际目检与修正详见本轮行动记录。
- 正式源码、参考、GLB 均处于未忽略目录；本轮仅本地新增，未提交、推送或发布。图册及报告沿用 artifacts 忽略规则。
- 未运行全项目回归、正式地图组合或大规模性能检查。技术通过不代替画面认可。

行动记录：`docs/actions/2026-10-23-B-three-houses.md`。

