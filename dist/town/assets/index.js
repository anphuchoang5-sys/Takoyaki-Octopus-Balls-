import {createBuildingInstance} from './shared/instances.js';
import {createModel as createConvenience} from './convenience/index.js';
import {createModel as createCafe} from './cafe/index.js';
import {createModel as createBookshop} from './bookshop/index.js';
import {createModel as createHome} from './home/index.js';
import {createModel as createGarden} from './garden/index.js';

export {TILE_SIZE} from './shared/instances.js';
export const BUILDING_TYPES=['convenience','cafe','bookshop','home','garden'];
const factories={convenience:createConvenience,cafe:createCafe,bookshop:createBookshop,home:createHome,garden:createGarden};

export function createBuilding(type,variant=0){
  if(!BUILDING_TYPES.includes(type))throw new Error(`Unknown building type: ${type}`);
  return createBuildingInstance(type,variant,factories[type]);
}
