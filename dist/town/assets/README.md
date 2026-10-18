# 建筑文件夹

要改哪栋建筑，就打开对应文件夹。

| 文件夹 | 内容 | 当前用途 |
| --- | --- | --- |
| `convenience/` | AME MART 便利店；`index.js` 为地块模型，`store.js` 为外观、店内陈设与门动画 | 正式地图编辑器与樱家预览的同尺度对照正在使用 |
| `cafe/` | 咖啡店，修改 `index.js` | 旧散步原型样稿，未加入新编辑器 |
| `bookshop/` | 书店，修改 `index.js` | 旧散步原型样稿，未加入新编辑器 |
| `home/` | 普通住宅，修改 `index.js` | 旧散步原型样稿，不是樱家 |
| `garden/` | 小公园，修改 `index.js` | 旧散步原型样稿，不是待制作的原作公园 |
| `sakura-house/` | B 建筑窗口的新作品；源码、GLB 与独立预览完整保留 | exterior-02 已获认可，补灯版电灯待查看；尚未加入编辑器 |

`shared/building-parts.js` 保存共用的树、长椅等零件；`shared/instances.js` 保存既有实例缓存、克隆和独立门动画。各栋建筑的造型代码都在自己的文件夹内。

本层 `index.js` 保留既有完整 `createBuilding(type, variant)` 接口。编辑器直接组合便利店的模型工厂和共用实例实现，不再因通用入口而加载四种旧样稿。各建筑的 `createModel()` 创建原始模型；使用者不要自行重复合批或释放共享资源。

尺寸、碰撞、灯位、屋顶数据保持原值。编辑器可选清单位于 `../editor/catalog.js`，全镇时间天气仍待接入；本次整理不增加可选素材，也不改变任何建筑模型。

旧 `dist/walk/buildings.js` 和 `dist/store.js` 已随旧页面归档到项目根目录 `archive/2026-10-17-legacy-prototypes/`。当前街角直接引用便利店文件夹；实际修改建筑请使用这里的文件夹，勿修改归档快照或另建第二份模型。
