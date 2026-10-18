import {THREE,world} from '../../../world.js';
import {buildStore} from './store.js';
import {bounds} from '../shared/building-parts.js';

export function createModel(){
  // Adapt the existing authored model once; instances retain their own door transforms.
  if(world.children.length)throw new Error('Convenience prefab requires the isolated, empty construction group.');
  buildStore();const root=new THREE.Group(),content=new THREE.Group();content.position.set(.6,0,1.6);root.add(content);
  for(const child of [...world.children]){if(child.isLight||child.isSprite)child.removeFromParent();else content.add(child);}
  return {root,
    colliders:[bounds(0,-3.0,7.8,.2,3.9),bounds(-3.8,0,.2,6,3.9),bounds(3.8,0,.2,6,3.9),bounds(-2.2,3.03,3.2,.16,3),bounds(2.59,3.03,2.42,.16,3),bounds(-2.3,.5,.9,1.85,1.9),bounds(-.45,.5,.9,1.85,1.9),bounds(2.78,1.46,1.3,2.25,1.5),bounds(-1.4,-2.57,4.3,.85,2.7),bounds(1.82,-.7,1.05,1.3,1.5)],
    occluders:[bounds(0,0,8.2,6.5,4.1)],roofs:[bounds(0,.1,8.4,6.9,4.02)],lamps:[{x:-1,y:2.5,z:.0},{x:2,y:2.4,z:2.1},{x:0,y:2.7,z:3.65}],floors:[{x:0,z:0,w:7.7,d:6.1,height:.395}]};
}
