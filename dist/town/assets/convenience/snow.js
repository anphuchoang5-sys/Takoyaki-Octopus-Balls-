import {attachSnow,surfacePart} from '../shared/snow.js';
export function addConvenienceSnow(asset){
  const parts=[surfacePart('roof-main','roof',.34),surfacePart('canopies','roof',.20),surfacePart('roof-equipment','roof',.18),surfacePart('vending','roof',.18),surfacePart('pavement','ground',.64),surfacePart('road','road',.13),surfacePart('bins','roof',.14)];
  return attachSnow(asset,{key:'convenience:surface-1',groundBounds:[-7.125,7.125,-7.125,7.125],parts,step:.28,preparedURL:new URL('./snow-support.bin.gz',import.meta.url).href,
    choose({center:p,name,normal:n}){
      if(p.y<.32&&n.y>.7)return p.z>3.5||p.x>4.45?5:4;
      if(name.includes('original-convenience-building')){
        if(p.y>4.18)return 2;
        if(p.y>3.85)return 0;
        if(p.y>2.96&&p.y<3.12)return 1;
      }
      if(name.includes('vending-machine')&&p.y>2.1)return 3;
      if(p.x>1.7&&p.x<3.2&&p.z>1.7&&p.z<2.6&&p.y>.96&&p.y<1.3)return 6;
      return -1;
    }});
}
