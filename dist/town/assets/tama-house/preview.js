import {createModel} from './index.js';
import {createResidentialPreview} from '../shared/residential-preview.js';
const preview=await createResidentialPreview(createModel,{height:13,referenceHeight:11,detailLabel:'阳台、窗框与细栏杆',roof:{position:[-14,13,20],target:[0,5.5,.3],height:9.5},detail:{position:[-12,7,24],target:[1.8,4.3,3.6],height:5.4},gate:{position:[-7,5,20],target:[-2.4,1.3,5.7],height:5.5}});
// Local camera and light adjustments do not change the other two previews.
Object.assign(preview.views,{
 hero:{position:[-18,13,24],target:[0,3.3,0],height:16.5},
 reference:{position:[-23,7,42],target:[0,3.9,0],height:13.8},
 left:{position:[-32,10,9],target:[0,3,0],height:15}
});
preview.scene.background.set('#e8f0f1');
for(const light of preview.scene.children){if(light.isHemisphereLight){light.color.set('#ffffff');light.groundColor.set('#c6d9ea');light.intensity=2.25;}if(light.isDirectionalLight){light.color.set('#fffaf2');light.intensity=1.85;}}
preview.renderer.toneMappingExposure=1.0;
preview.setView(new URL(location.href).searchParams.get('view')||'hero');
