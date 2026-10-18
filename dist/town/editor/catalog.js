import {TILE_SIZE} from '../assets/shared/instances.js';
import {createConvenienceScene} from './convenience-scene.js';
import {createRoad, ROAD_DEFINITIONS} from './roads.js';
import {createModel as createSakuraHouse, specification as sakuraSpecification} from '../assets/sakura-house/index.js';

export {TILE_SIZE};
// C's selectable list uses each delivered factory and preserves its returned asset object.
export const ASSETS = Object.freeze([
  Object.freeze({id: 'convenience', name: 'AME MART 便利店', category: 'building', note: '完整街角 · 1 格', source: 'dist/town/assets/convenience/ + dist/street.js'}),
  Object.freeze({id: sakuraSpecification.id, name: '小丸子的家', category: 'building', note: '房屋与院子 · 1 格', revision: sakuraSpecification.revision, source: 'dist/town/assets/sakura-house/'}),
  ...ROAD_DEFINITIONS.map(item => Object.freeze({...item, category: 'road', source: 'C:roads.js'}))
]);
export const PENDING_BUILDINGS = Object.freeze(['みまつや杂货店', '学校', '公园']);
export const assetIds = new Set(ASSETS.map(item => item.id));
export function createAsset(assetId) {
  if (assetId === 'convenience') return createConvenienceScene();
  if (assetId === sakuraSpecification.id) {
    const asset = createSakuraHouse();
    asset.focus = {target: [0,2.1,0], distance: 35, direction: [-.8,.65,1.3]};
    asset.thumbnail = {position: [-17,19,24], target: [0,2.1,0]};
    return asset;
  }
  if (ROAD_DEFINITIONS.some(item => item.id === assetId)) return createRoad(assetId, TILE_SIZE);
  throw new Error(`素材未交付：${assetId}`);
}
