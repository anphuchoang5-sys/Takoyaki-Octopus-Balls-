import * as THREE from 'three';
import {createMaruko, specification as staticSpecification} from './model.js';

export const rigSpecification=Object.freeze({
 ...staticSpecification,revision:'rig-01',approvedShape:'static-06',rigged:true,
 stage:'已确认造型 · 骨骼与蒙皮 · 等待走路参考',animations:[],
 maxInfluences:4,poseUnits:'degrees',restPose:'approved natural stance',
});
const soleZ=.023*Math.cos(.23),floorOffset=.0002;
const smooth=THREE.MathUtils.smoothstep,rad=THREE.MathUtils.degToRad;
const definitions=[
 ['root',null,[0,0,0],'整体'],
 ['pelvis','root',[0,.365,0],'骨盆'],['spine','pelvis',[0,.47,0],'腰背'],
 ['chest','spine',[0,.60,0],'胸背'],['neck','chest',[0,.666,0],'颈部'],
 ['head','neck',[0,.692,0],'头部'],['head_tip','head',[0,1.21,0],'头顶参考'],
];
for(const [side,s,label] of [['left',1,'左'],['right',-1,'右']]){
 definitions.push(
  [side+'_clavicle','chest',[s*.047,.638,0],label+'肩带'],
  [side+'_upper_arm',side+'_clavicle',[s*.1,.64,0],label+'上臂'],
  [side+'_forearm',side+'_upper_arm',[s*.154,.525,.005],label+'前臂'],
  [side+'_hand',side+'_forearm',[s*.19,.432,.01],label+'手腕'],
  [side+'_hand_tip',side+'_hand',[s*.209,.378,.012],label+'手指参考'],
  [side+'_thigh','pelvis',[s*.058,.36,0],label+'大腿'],
  [side+'_shin',side+'_thigh',[s*.063,.192,0],label+'小腿'],
  [side+'_foot',side+'_shin',[s*.065,.055,0],label+'脚踝'],
  [side+'_toe',side+'_foot',[s*.076,.021,.060],label+'前脚掌'],
  [side+'_toe_tip',side+'_toe',[s*.08,.016,.091],label+'脚尖参考'],
 );
}
definitions.push(['skirt_lining','pelvis',[0,.2175,0],'裙内封口承托']);
for(let i=0;i<8;i++){
 const a=i*Math.PI/4;
 definitions.push(['skirt_'+i,'pelvis',[Math.sin(a)*.096,.389,Math.cos(a)*.061],'裙摆 '+(i+1)]);
 definitions.push(['skirt_tip_'+i,'skirt_'+i,[Math.sin(a)*.185,.223,Math.cos(a)*.105],'裙摆末端 '+(i+1)]);
}
export const boneGuide=Object.freeze(definitions.map(([name,parent,position,label])=>Object.freeze({name,parent,position,label,control:!name.includes('tip')&&name!=='skirt_lining'})));
// These are static deformation checks. No timed clips or gait have been authored.
export const testPoses=Object.freeze({
 neutral:{label:'已确认站姿',rotations:{}},
 head:{label:'头颈检查',rotations:{neck:[0,7,0],head:[-8,22,4]}},
 arms:{label:'肩肘检查',rotations:{left_upper_arm:[-15,0,24],left_forearm:[-62,0,0],left_hand:[0,0,-8],right_upper_arm:[-8,0,-18],right_forearm:[-40,0,0]}},
 legs:{label:'髋膝检查',rotations:{left_thigh:[-25,0,0],left_shin:[45,0,0],left_foot:[-12,0,0],left_toe:[-8,0,0],skirt_0:[-13,0,0],skirt_1:[-10,0,0],skirt_7:[-10,0,0]}},
 skirt:{label:'裙摆检查',rotations:{skirt_0:[-12,0,0],skirt_1:[-8,0,8],skirt_2:[0,0,12],skirt_3:[8,0,8],skirt_4:[12,0,0],skirt_5:[8,0,-8],skirt_6:[0,0,-12],skirt_7:[-8,0,-8]}},
 torso:{label:'躯干检查',rotations:{spine:[-6,8,0],chest:[0,7,3]}},
});
function torsoWeights(y){
 if(y<.51){const t=smooth(y,.415,.51);return [['pelvis',1-t],['spine',t]];}
 const t=smooth(y,.51,.61);return [['spine',1-t],['chest',t]];
}
function skirtWeights(p){
 const fall=smooth(.395-p.y,0,.13);
 if(Math.hypot(p.x,p.z)<.01&&fall>.9)return [['skirt_lining',1]];
 const angle=(Math.atan2(p.x/.19,p.z/.108)+2*Math.PI)%(2*Math.PI),q=angle/(Math.PI/4),i=Math.floor(q),t=q-i;
 return [['pelvis',1-fall],['skirt_'+i,fall*(1-t)],['skirt_'+((i+1)%8),fall*t]];
}
function weightsFor(name,p){
 if(/^(head ·|hair ·|ear |ear fold|black eye|eye glint|blush|eyebrow|open smile)/.test(name))return [['head',1]];
 if(name==='neck'){const t=smooth(p.y,.653,.704);return [['chest',1-t],['head',t]];}
 if(/^(red skirt|rolled skirt hem|skirt pleat)/.test(name))return skirtWeights(p);
 if(name==='waistband')return [['pelvis',1]];
 if(/^(white blouse|white collar band|pointed collar|suspender over shoulder)/.test(name)||/suspender/.test(name))return torsoWeights(p.y);
 const side=name.startsWith('left')?'left':name.startsWith('right')?'right':null;
 if(!side)throw new Error('Unclassified skin mesh: '+name);
 if(/palm|finger|thumb/.test(name))return [[side+'_hand',1]];
 if(/shoe|sole seam/.test(name)){const t=smooth(p.z,.045,.086);return [[side+'_foot',1-t],[side+'_toe',t]];}
 if(/leg|sock/.test(name)){
  if(p.y>.135){const t=smooth(.225-p.y,0,.065);return [[side+'_thigh',1-t],[side+'_shin',t]];}
  const t=smooth(.082-p.y,0,.04);return [[side+'_shin',1-t],[side+'_foot',t]];
 }
 if(/sleeve|shoulder/.test(name)){
  const lower=smooth(.559-p.y,0,.068),attached=(1-smooth(Math.abs(p.x),.075,.127))*smooth(p.y,.575,.632);
  const clavicle=attached*.45,chest=attached*.55;
  return [['chest',chest],[side+'_clavicle',clavicle],[side+'_upper_arm',(1-attached)*(1-lower)],[side+'_forearm',(1-attached)*lower]];
 }
 throw new Error('Unclassified skin mesh: '+name);
}

export function rigBones(root){const map={};root.traverse(o=>{if(o.isBone)map[o.name]=o;});return map;}
export function refreshRig(root){
 root.updateMatrixWorld(true);const bones=rigBones(root),lining=bones.skirt_lining;
 if(lining){
  // Keep the existing modesty cap inside the moving hem. Future clips must bake
  // this helper's translations; glTF has bones/weights, not JavaScript constraints.
  if(Array.from({length:8},(_,i)=>bones['skirt_'+i]).every(b=>Math.abs(b.quaternion.w-1)<1e-12))lining.position.fromArray(lining.userData.restPosition);
  else{
   let skirt;root.traverse(o=>{if(o.isSkinnedMesh&&!o.userData.outline&&o.userData.rigMeshName==='red skirt · full bell')skirt=o;});
   const mean=new THREE.Vector3(),p=new THREE.Vector3(),count=root.userData.rig?.skirtHemVertices||112;
   for(let i=0;i<count;i++)mean.add(skirt.getVertexPosition(i,p).applyMatrix4(skirt.matrixWorld));
   mean.divideScalar(count);lining.position.copy(lining.parent.worldToLocal(mean));
  }
  root.updateMatrixWorld(true);
 }
 const skeletons=new Set();
 root.traverse(o=>{if(o.isSkinnedMesh){skeletons.add(o.skeleton);o.computeBoundingBox();o.computeBoundingSphere();}});
 for(const skeleton of skeletons)skeleton.update();
}
export function setTestPose(root,name='neutral',amount=1){
 const preset=testPoses[name];if(!preset)throw new Error('Unknown test pose: '+name);
 const bones=rigBones(root),t=THREE.MathUtils.clamp(amount,0,1);
 for(const bone of Object.values(bones))bone.quaternion.identity();
 for(const [key,r] of Object.entries(preset.rotations))bones[key]?.rotation.set(...r.map(v=>rad(v*t)));
 refreshRig(root);return preset.label;
}

export function createRiggedMaruko(){
 const source=createMaruko(),root=source.root;
 root.name='maruko-rig-01';root.userData={...root.userData,specification:{...rigSpecification},rig:{version:1,bones:boneGuide,approvedShape:'static-06',skirtHemVertices:112,clips:[]}};
 const bones={},indices={},rest={};
 for(const [name,parent,position,label] of definitions){
  const bone=new THREE.Bone();bone.name=name;bone.userData={label};
  rest[name]=new THREE.Vector3(position[0],position[1]-(name==='root'?0:floorOffset),position[2]-(name==='root'?0:soleZ));
  bone.position.copy(rest[name]);if(parent)bone.position.sub(rest[parent]);bone.userData.restPosition=bone.position.toArray();
  (parent?bones[parent]:root).add(bone);indices[name]=Object.keys(bones).length;bones[name]=bone;
 }
 root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(Object.values(bones));
 const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const p=new THREE.Vector3(),weightCache=new Map();
 // Compute each silhouette from its base mesh's weights, not its inflated vertices.
 for(const mesh of meshes.filter(o=>!o.userData.outline)){
  const position=mesh.geometry.attributes.position,skinIndex=[],skinWeight=[];
  for(let i=0;i<position.count;i++){
   p.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);p.y+=floorOffset;p.z+=soleZ;
   const list=weightsFor(mesh.name,p).filter(([,w])=>w>1e-9),sum=list.reduce((s,[,w])=>s+w,0);
   if(!sum||list.length>4)throw new Error('Invalid influence set: '+mesh.name);
   for(let j=0;j<4;j++){skinIndex.push(j<list.length?indices[list[j][0]]:0);skinWeight.push(j<list.length?list[j][1]/sum:0);}
  }
  weightCache.set(mesh,{index:new THREE.Uint16BufferAttribute(skinIndex,4),weight:new THREE.Float32BufferAttribute(skinWeight,4)});
 }
 for(const [meshId,mesh] of meshes.entries()){
  const base=mesh.userData.outline?meshes.find(o=>!o.userData.outline&&o.name===mesh.name.replace(/ · silhouette$/,'')):mesh,w=weightCache.get(base);
  if(!w||w.index.count!==mesh.geometry.attributes.position.count)throw new Error('Missing paired outline weights: '+mesh.name);
  mesh.geometry.setAttribute('skinIndex',w.index.clone());mesh.geometry.setAttribute('skinWeight',w.weight.clone());
  const skinned=new THREE.SkinnedMesh(mesh.geometry,mesh.material),parent=mesh.parent,slot=parent.children.indexOf(mesh);
  skinned.name=mesh.name;skinned.position.copy(mesh.position);skinned.quaternion.copy(mesh.quaternion);skinned.scale.copy(mesh.scale);
  skinned.castShadow=mesh.castShadow;skinned.receiveShadow=mesh.receiveShadow;skinned.userData={...mesh.userData,rigMeshName:mesh.name,rigMeshId:meshId};
  parent.remove(mesh);parent.add(skinned);parent.children.splice(parent.children.indexOf(skinned),1);parent.children.splice(slot,0,skinned);
  skinned.bind(skeleton,mesh.matrixWorld);skinned.normalizeSkinWeights();
 }
 refreshRig(root);let disposed=false;
 return {root,bones,skeleton,specification:rigSpecification,joints:source.joints,
  setPose:(name,amount)=>setTestPose(root,name,amount),
  dispose(){if(disposed)return;disposed=true;skeleton.dispose();source.dispose();}
 };
}
