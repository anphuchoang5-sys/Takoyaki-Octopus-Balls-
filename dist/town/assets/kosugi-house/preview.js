import {createModel} from './index.js';
import {createResidentialPreview} from '../shared/residential-preview.js';
await createResidentialPreview(createModel,{height:12.5,referenceHeight:10.1,detailLabel:'六格窗、木窗扇与板墙起伏',roof:{position:[-12,15,17],target:[.0,5.2,-.5],height:8.4},detail:{position:[5.5,6.1,21],target:[1.8,4.9,2.5],height:3.8},gate:{position:[2,4,19],target:[1.7,1.45,4.8],height:4.4}});
