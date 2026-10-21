import {attachSnow,surfacePart} from '../shared/snow.js';
export function addMitsuyaSnow(asset){
  const parts=[surfacePart('roof-main'),surfacePart('shrub-right','shrub',.21),surfacePart('shrub-rear','shrub',.21),surfacePart('shrub-flowers','shrub',.18),surfacePart('yard','ground',.64),surfacePart('doghouse','roof',.24),surfacePart('bench','roof',.17),surfacePart('freezer','roof',.14),surfacePart('crates','roof',.18),surfacePart('sign-top','roof',.08)];
  return attachSnow(asset,{key:`mitsuya:${asset.specification.revision}:surface-1`,parts,step:.23,preparedURL:new URL('./snow-support.bin.gz',import.meta.url).href,
    choose({center:p,color:c,name,normal:n}){
      if(c&&c.g>c.r*1.12&&c.g>c.b*1.16&&p.y>.12){if(p.x>4.9&&p.z>-.5&&p.z<1.6)return 1;if(p.z< -3.5)return p.x<0?3:2;}
      if(name.includes('屋顶')&&p.y>3.5){if(p.z>2.42&&p.z<2.64&&p.y>5.05)return 9;return 0;}
      if(p.y<.35&&n.y>.7)return 4;
      if(name.includes('狗屋')&&p.y>.98)return 5;
      if(name.includes('长凳')&&p.y>.5)return 6;
      if(name.includes('冰淇淋柜')&&p.y>.95)return 7;
      if(name.includes('货箱')&&p.y>1.5)return 8;
      return -1;
    }});
}
