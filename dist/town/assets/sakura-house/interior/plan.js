// Editable adopted layout. X follows the reference image to the right; +Z down.
// 0.91 m is a modelling grid, not a claimed official measurement.
export const GRID=.91, WALL=.12, HEIGHT=2.45;
export const sources={layout:'https://ameblo.jp/haruko2023/entry-12805827438.html',details:'https://manechiku.hatenablog.com/entry/2026/04/16/212338'};
export const rooms=[
 {id:'entry',name:'玄关',ja:'玄関',r:[10.01,0,11.83,1.82],floor:'tile',color:'#c2c4bd',y:-.16,ref:'03-whole.jpg',note:'低一级的土间；参考图上缘入户，向下进入门厅。'},
 {id:'hall',name:'门厅',ja:'ホール',r:[10.01,1.82,11.83,3.64],floor:'wood',color:'#d9b584',ref:'03-whole.jpg',note:'连接玄关、中央长廊与客厅。'},
 {id:'corridor',name:'中央长廊',ja:'廊下',r:[0,2.73,10.01,3.64],floor:'wood',color:'#d3ac78',ref:'04-corridor.jpg',note:'沿参考横向贯通；左端转入缘侧，再通向厕所。'},
 {id:'engawa',name:'缘侧走廊',ja:'縁側',r:[0,3.64,.91,7.28],floor:'wood',color:'#d3ac78',ref:'08-grandparents.jpg',note:'祖父母房西侧的窄长通道。'},
 {id:'living',name:'客厅',ja:'茶の間 · 8帖',r:[8.19,3.64,11.83,7.28],floor:'tatami8',color:'#ced6a2',ref:'05-living.jpg',note:'中央矮桌、左上电视、右墙柜体；位置沿用主参考。'},
 {id:'kitchen',name:'厨房',ja:'台所 · 6帖',r:[6.37,0,10.01,2.73],floor:'linoleum',color:'#a9d7ad',ref:'06-kitchen.jpg',note:'北墙冰箱—水槽—灶台；左侧四人桌，右侧柜体。'},
 {id:'sisters',name:'姐妹房',ja:'さきこ・まる子 · 8帖',r:[4.55,3.64,8.19,7.28],floor:'tatami8',color:'#ead0cb',ref:'07-sisters.jpg',note:'南侧两张书桌分别靠左右墙，入口两边书柜；粉色取自动画。'},
 {id:'grandparents',name:'祖父母房',ja:'友蔵・こたけ · 6帖',r:[.91,3.64,3.64,7.28],floor:'tatami6v',color:'#c7d5a5',ref:'08-grandparents.jpg',note:'北侧与缘侧均保留障子连接；南窗下低柜。'},
 {id:'parents',name:'父母房',ja:'ひろし・すみれ · 6帖',r:[1.82,0,5.46,2.73],floor:'tatami6',color:'#d9d6a8',ref:'09-parents.jpg',note:'左上衣柜、左下镜台，东侧壁橱；门向中央长廊。'},
 {id:'wash',name:'洗面室',ja:'洗面室 · 2帖',r:[0,.91,1.82,2.73],floor:'tile',color:'#d4e1db',ref:'01-plan.jpg',note:'左侧洗衣机、右侧洗面台，向上进入浴室。'},
 {id:'bath',name:'浴室',ja:'浴室 · 2帖',r:[0,-.91,1.82,.91],floor:'tile',color:'#91b6c6',ref:'01-plan.jpg',note:'北侧浴缸与窗，保留南侧洗浴位置。'},
 {id:'toilet',name:'厕所',ja:'トイレ',r:[0,7.28,1.82,8.19],floor:'tile',color:'#cfdbca',ref:'01-plan.jpg',note:'位于缘侧走廊尽端；洁具按主参考摆位，造型为结构补全。'},
 {id:'parent-storage',name:'父母壁橱',r:[5.46,0,6.37,2.73],floor:'wood',color:'#c5a072',storage:true},
 {id:'shared-storage',name:'分属两房的壁橱',r:[3.64,3.64,4.55,7.28],floor:'wood',color:'#c5a072',storage:true}
];
// Each wall appears once. Openings are real voids, not pictures on a solid wall.
const door=(a,b,kind='slide',room='')=>({a,b,sill:0,h:2.03,kind,room});
const win=(a,b,sill=.85,h=1.15)=>({a,b,sill,h,kind:'window'});
export const walls=[
 {id:'north-main',axis:'x',at:0,a:1.82,b:11.83,outer:true,open:[win(2.78,4.47),win(8.2,9.45),{...door(10.10,11.7,'entry'),sill:-.16,h:2.19}]},
 {id:'east-main',axis:'z',at:11.83,a:0,b:7.28,outer:true,open:[win(2.0,3.38,.25,1.72)]},
 {id:'south-main',axis:'x',at:7.28,a:1.82,b:11.83,outer:true,open:[win(2.1,3.2),win(5.5,7.23),win(9.0,10.9)]},
 {id:'bath-north',axis:'x',at:-.91,a:0,b:1.82,outer:true,open:[win(.48,1.32,1.25,.68)]},
 {id:'west-upper',axis:'z',at:0,a:-.91,b:3.64,outer:true,open:[win(1.36,2.08,1.13,.83)]},
 {id:'bath-east',axis:'z',at:1.82,a:-.91,b:0,outer:true,open:[]},
 {id:'bath-wash',axis:'x',at:.91,a:0,b:1.82,open:[door(.52,1.36,'hinge','bath')]},
 {id:'wash-parents',axis:'z',at:1.82,a:0,b:2.73,open:[]},
 {id:'wash-corridor',axis:'x',at:2.73,a:0,b:1.82,open:[door(.45,1.4,'hinge','wash')]},
 {id:'parents-corridor',axis:'x',at:2.73,a:1.82,b:6.37,open:[door(2.76,4.55,'shoji','parents')]},
 {id:'parents-storage',axis:'z',at:5.46,a:0,b:2.73,open:[door(.15,.78,'closet'),door(1.02,2.62,'closet')]},
 {id:'parent-storage-split',axis:'x',at:.91,a:5.46,b:6.37,open:[]},
 {id:'storage-kitchen',axis:'z',at:6.37,a:0,b:2.73,open:[]},
 {id:'kitchen-entry',axis:'z',at:10.01,a:0,b:2.73,open:[]},
 {id:'kitchen-corridor',axis:'x',at:2.73,a:6.37,b:10.01,open:[door(8.52,9.65,'open','kitchen')]},
 {id:'grandparents-corridor',axis:'x',at:3.64,a:.91,b:3.64,open:[door(1.44,3.12,'slide','grandparents')]},
 {id:'closets-north',axis:'x',at:3.64,a:3.64,b:4.55,open:[]},
 {id:'sisters-corridor',axis:'x',at:3.64,a:4.55,b:8.19,open:[door(6.02,6.96,'hinge','sisters')]},
 {id:'living-corridor',axis:'x',at:3.64,a:8.19,b:11.83,open:[door(9.03,10.78,'slide','living')]},
 {id:'sisters-living',axis:'z',at:8.19,a:3.64,b:7.28,open:[]},
 {id:'grandparents-closets',axis:'z',at:3.64,a:3.64,b:7.28,open:[door(5.65,7.15,'closet')]},
 {id:'sisters-closets',axis:'z',at:4.55,a:3.64,b:7.28,open:[door(3.83,5.3,'closet')]},
 {id:'shared-storage-split',axis:'x',at:5.46,a:3.64,b:4.55,open:[]},
 {id:'grandparents-engawa',axis:'z',at:.91,a:3.64,b:7.28,open:[door(4.05,6.63,'shoji','grandparents')]},
 {id:'west-engawa',axis:'z',at:0,a:3.64,b:7.28,outer:true,open:[{a:3.92,b:6.96,sill:.13,h:1.9,kind:'shoji-window'}]},
 {id:'toilet-entry',axis:'x',at:7.28,a:0,b:1.82,open:[door(.09,.85,'hinge','toilet')]},
 {id:'toilet-west',axis:'z',at:0,a:7.28,b:8.19,outer:true,open:[]},
 {id:'toilet-south',axis:'x',at:8.19,a:0,b:1.82,outer:true,open:[win(.45,1.25,1.35,.55)]},
 {id:'toilet-east',axis:'z',at:1.82,a:7.28,b:8.19,outer:true,open:[]}
];
export const connections=[['entry','hall'],['hall','corridor'],['hall','living'],['corridor','kitchen'],['corridor','parents'],['corridor','wash'],['wash','bath'],['corridor','sisters'],['corridor','grandparents'],['corridor','engawa'],['engawa','grandparents'],['engawa','toilet']];
export const entry={position:[11.28,-.16,.28],facing:[0,0,1],exit:[11.28,-.16,-.32],stepHeight:.16};
export const routes={
 main:[[11.28,.28],[10.93,1.9],[10.93,3.17],[.46,3.17],[.46,7.7]],
 living:[[10.4,3.17],[10.4,4.25],[10.0,4.45]],
 kitchen:[[8.82,3.17],[8.82,2.15],[8.65,1.3]],
 parents:[[3.22,3.17],[3.22,2.1],[3.8,1.4]],
 sisters:[[6.45,3.17],[6.45,4.1],[6.4,5.4]],
 grandparents:[[1.85,3.17],[1.85,4.1],[2.0,5.4]],
 wash:[[.93,3.17],[.93,2.2],[.93,1.35]],
 bath:[[.93,1.35],[.93,.55],[.93,.30]]
};
