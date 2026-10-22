import * as THREE from 'three';
import {createSnowLayer,surfacePart} from '../assets/shared/snow.js';
import {createRoad,ROAD_DEFINITIONS} from './roads.js';
const arms=new Map(ROAD_DEFINITIONS.map(d=>[d.id,d.exits]));
export function createGroundSnow(parent,{tileSize=14}){
  let layer=null,source=null,owned=[],amount=0,revision=0,key='';
  function rebuild(layout){
    const nextKey=JSON.stringify([layout.rows,layout.instances.map(p=>[p.assetId,p.x,p.z,p.rotation])]);
    if(nextKey===key)return;key=nextKey;
    layer?.dispose();owned.forEach(g=>g.dispose());owned=[];source=new THREE.Group();
    const placed=new Map(layout.instances.map(p=>[`${p.x},${p.z}`,p])),roads=[];
    const material=new THREE.MeshBasicMaterial();owned.push(material);
    for(let z=0;z<10;z++)for(let x=layout.rows[z].start;x<layout.rows[z].start+layout.rows[z].length;x++){
      const p=placed.get(`${x},${z}`);if(p&&!arms.has(p.assetId))continue;
      const cx=(x-4.5)*tileSize,cz=(z-4.5)*tileSize;
      const geometry=new THREE.PlaneGeometry(tileSize,tileSize,28,28);geometry.rotateX(-Math.PI/2);geometry.translate(cx,0,cz);owned.push(geometry);
      source.add(new THREE.Mesh(geometry,material));
      if(p){
        const road=createRoad(p.assetId,tileSize).root;road.position.set(cx,0,cz);road.rotation.y=p.rotation*Math.PI/180;source.add(road);
        roads.push({x:cx,z:cz,yaw:p.rotation*Math.PI/180,exits:arms.get(p.assetId)});
      }
    }
    const neighbours=layout.instances.filter(p=>!arms.has(p.assetId)).map(p=>({x:(p.x-4.5)*tileSize,z:(p.z-4.5)*tileSize}));
    const part={...surfacePart('terrain','map',.64),roads,neighbours,fillLimit:.02};
    layer=createSnowLayer(parent,{key:`terrain:${key}`,sourceRoot:source,parts:[part],choose:()=>0,step:.55});
    layer.root.name='地图地面与道路积雪';layer.setAmount(amount);revision++;
  }
  return {rebuild,setAmount(value){amount=value;layer?.setAmount(value);},sample:(x,z)=>layer?.sample(x,z),
    sampleInto:(x,z,out)=>layer?.sampleInto(x,z,out),
    getInspection:()=>({...layer?.getInspection(),revision}),dispose(){layer?.dispose();owned.forEach(g=>g.dispose());owned=[];source=null;}};
}
