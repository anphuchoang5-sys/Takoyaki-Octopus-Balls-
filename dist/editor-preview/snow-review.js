// An explicitly requested review URL uses its own storage, never the user's map.
export const REVIEW_STORAGE_KEY='rainy-corner.editor.review.snow.v1';
export const REVIEW_TOWN={
  format:'maruko-town',version:2,
  layout:{format:'rainy-corner-layout',version:1,
    rows:Array.from({length:10},(_,z)=>({start:3,length:z>=3&&z<=5?3:0})),
    instances:[
      {id:'review-sakura',assetId:'sakura-house',x:3,z:3,rotation:0},
      {id:'review-mart',assetId:'convenience',x:4,z:3,rotation:0},
      {id:'review-mitsuya',assetId:'mitsuya',x:5,z:3,rotation:0},
      ...[3,4,5].map(x=>({id:`review-road-${x}`,assetId:'road-straight',x,z:4,rotation:90}))
    ]},
  environment:{time:'dusk',weather:'snow',snowAmount:.55}
};
