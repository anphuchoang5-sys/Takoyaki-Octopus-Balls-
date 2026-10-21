# 小学校 · 2×2 外观研究

2026-10-21，revision `preview-01`。按用户提供的小学校动画参考制作，占地 **2×2（28×28）**，当前只做独立预览，尚未接入地图编辑器。

## 预览

`http://127.0.0.1:4184/town/assets/school/preview.html`

- 视角：立体全景、正立面、钟楼、门廊、校门、屋顶、俯视。
- 时段：午后、黄昏、夜晚；夜晚窗光与门廊灯。
- “打开原图对照”查看本地参考副本。
- `?clean=1` 隐藏界面，用于截图。

## 当前范围

- 三层黄色校舍、左右各 5 开间、3 层窗列；左右侧墙补侧窗。
- 中央钟楼：钟面、竖向窗带、顶部天线。
- 入口门廊、柱子、平雨棚、台阶、双门。
- 平屋顶、女儿墙、金属栏杆。
- **四周围墙**：正面、左右、背面都有低墙和压顶；正面和背面墙脚有低矮青苔。
- 校门：黑栏杆门、门口两侧转内角墙和砖花池；右侧墙有一扇小门。学校招牌已按用户要求移除。
- 围墙内左右侧有高过围墙的树；教学楼前有高矮不一的灌木和小树。
- 2×2 占地：28×28，中心原点，入口朝 +Z。

用户建议“以后所有建筑四周都有围墙”作为区分规则；本栋先按四周围墙执行，正式是否写成项目规则待后续定稿。

## 未接入

- `catalog.js`、编辑器、存档均未改动。
- 现有编辑器按一格 14×14 放置；2×2 需要额外的占格、碰撞、放置预览和存档支持，尚未实现。
- 侧面、背面、室内和未显示细节为补全设计，不称严格复原。
- 参考图只保留为本地 `references/school-exterior.jpg`，不随运行时加载。

## 接口

`createModel()` 返回 `root`、`specification`、`colliders`、`occluders`、`floors`、`entry`、`setEnvironment()`、`getEnvironmentState()`、`getLightingDescriptors()` 和 `dispose()`。当前灯光描述为空；正式接入时再补入口灯和灯池消费。

## 给地图编辑器

入口：`dist/town/assets/school/index.js`

```js
export const specification = {
  id: 'school',
  name: '小学校',
  revision: 'preview-01',
  tileSize: 28,
  plot: [28, 28],
  footprint: [2, 2],
  front: '+Z',
  placementRotations: [0, 90, 180, 270],
  entry: {x: 0, y: 0, z: 6.4, facing: '+Z', clearWalkWidth: 5.0}
};
```

`createModel()` 返回：

- `root`：28×28、中心原点、入口朝 +Z 的 `THREE.Group`。
- `specification`、`colliders`、`occluders`、`floors`、`entry`。
- `setEnvironment({time})`、`getEnvironmentState()`、`getLightingDescriptors()`、`dispose()`。

### 2×2 放置要求

现有编辑器按一格 14×14 放置；不能只把 `school` 加进 `catalog.js`，否则它会只占一格并与邻居重叠。接入时需要：

1. 以 `footprint:[2,2]` 占 `(x,z)`、`(x+1,z)`、`(x,z+1)`、`(x+1,z+1)` 四格；四格都必须在有效轮廓内。
2. 世界中心用 2×2 的中心：`cellToWorld(x + 0.5, z + 0.5, 14)`；不要用单格中心。
3. 放置预览、碰撞、选中框都按 2×2；删除、旋转、撤销、导入恢复同步。
4. 旧布局格式不改；载入时从 `specification.footprint` 推导占格并校验，不要给旧存档加必填字段。

### 已知缺口

- 当前 `setEnvironment` 只处理 `time`；`weather`、`snowAmount` 不报错但也没有雪/雨表现，`getLightingDescriptors()` 返回空数组。
- 没有接入共享 `attachSnow`，建筑本体暂无积雪；地图地面雪仍由编辑器负责。
- `catalog.js`、场景、存档、2×2 占格均未修改；本轮只交付资产和独立预览。
- 建筑侧面、背面、室内和准确尺寸是补全设计。

## 检查

- `node --check index.js workshop.js preview.js`。
- 4184 独立预览：页面/控制台错误、四向 28×28 边界、日间/黄昏/夜晚、近景截图。
- 薄装饰件不投影，阴影贴图缓存，窗框/玻璃分层，避免共面闪烁。
