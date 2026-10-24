// Data only: rendered and edited by the formal map, in separate review storage.
export const FLOWER_REVIEW_STORAGE_KEY='rainy-corner.editor.review.flowerorangebuilding.v1';
export const FLOWER_REVIEW_TOWN={
  format:'maruko-town',version:2,
  layout:{format:'rainy-corner-layout',version:1,
    rows:Array.from({length:10},(_,z)=>({start:2,length:z>=3&&z<=5?5:0})),
    instances:[
      {id:'review-sakura',assetId:'sakura-house',x:2,z:3,rotation:0},
      {id:'review-flower-front',assetId:'flowerorangebuilding',x:3,z:3,rotation:0},
      {id:'review-mart',assetId:'convenience',x:4,z:3,rotation:0},
      {id:'review-flower-side',assetId:'flowerorangebuilding',x:5,z:3,rotation:90},
      {id:'review-mitsuya',assetId:'mitsuya',x:6,z:3,rotation:0},
      ...[2,3,4,5,6].map(x=>({id:`review-road-${x}`,assetId:'road-straight',x,z:4,rotation:90}))
    ]},
  environment:{time:'afternoon',weather:'clear',snowAmount:0}
};
