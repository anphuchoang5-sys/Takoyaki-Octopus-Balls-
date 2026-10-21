import {attachSnow,surfacePart} from '../shared/snow.js';
// These masks select actual source triangles, never fabricated roof heights.
export function addSakuraSnow(asset){
  const plants=[[-5.7,1.4],[-5.67,-4.8],[-5.7,-3.5],[-4.5,4.82],[-3.2,4.9],[-1.85,4.9],[5,4.6],[4.3,-5.3]];
  const parts=[surfacePart('roof-main'),surfacePart('roof-annex','roof',.28),surfacePart('awnings','roof',.24),surfacePart('walls','roof',.25),surfacePart('yard','ground',.64),...plants.map((_,i)=>surfacePart(`shrub-${i+1}`,'shrub',.23))];
  return attachSnow(asset,{key:`sakura:${asset.specification.revision}:surface-1`,parts,step:.24,preparedURL:new URL('./snow-support.bin.gz',import.meta.url).href,
    choose({center:p,color:c,normal:n}){
      const green=c&&c.g>c.r*1.18&&c.g>c.b*1.10;
      if(green&&p.y>.15){let near=-1,d=Infinity;plants.forEach(([x,z],i)=>{const q=Math.hypot(p.x-x,p.z-z);if(q<d){d=q;near=i;}});if(d<1.3)return 5+near;}
      if(p.y>2.84&&p.x>-5.4&&p.x<4.4&&p.z>-4.2&&p.z<3.38)return 0;
      if(p.y>2.65&&p.y<4.7&&p.x>=3.7&&p.x<6.2&&p.z>-3.4&&p.z<3.35)return 1;
      if(p.y>2.55&&p.y<2.95&&p.x>-5.5&&p.x<3.2&&p.z>-2.2&&p.z<3.5)return 2;
      if(p.y>1.48&&p.y<1.66&&(Math.abs(p.x)>6.15||p.z>5.45||p.z< -6.15))return 3;
      if(p.y<.36&&n.y>.7)return 4;
      return -1;
    }});
}
