// 所有初始对象坐标来自用户指定的943×2048参考图。
export const WIDTH=943, HEIGHT=2781*943/1280;
export const PLATES={
  back:{bounds:[119,837,389,392],color:'#fc858c',path:'M176 855 Q150 851 139 875 Q128 891 136 923 L157 1029 L134 1158 Q126 1186 145 1200 Q159 1214 184 1207 L311 1181 L437 1210 Q465 1217 480 1193 Q486 1179 481 1155 L461 1029 L485 909 Q493 882 472 863 Q458 849 434 854 L311 879 Z',occluders:['pink','blue']},
  pink:{bounds:[300,850,495,382],color:'#f7a5e7',path:'M397 972 C409 929 451 886 499 875 C552 854 609 880 645 914 C663 930 677 952 688 969 C736 986 768 1009 769 1037 C770 1066 742 1091 697 1112 C679 1154 647 1190 608 1200 C559 1218 507 1197 475 1171 C453 1152 436 1133 423 1112 C380 1103 333 1078 322 1054 C309 1025 341 998 397 972 Z',occluders:['blue']},
  blue:{bounds:[462,1174,395,389],color:'#91bff9',path:'M521 1194 Q496 1184 484 1205 Q477 1218 482 1240 L508 1368 L484 1487 Q476 1515 494 1532 Q504 1543 527 1537 L658 1512 L792 1538 Q818 1545 830 1523 Q837 1510 831 1486 L807 1370 L831 1241 Q840 1209 823 1197 Q812 1188 792 1192 L658 1218 Z',occluders:[]},
  heart:{bounds:[90,1280,290,270],color:'#cbe985',path:'M240 1331 C215 1305 185 1300 158 1314 C129 1328 117 1355 127 1382 C139 1418 189 1461 234 1493 Q242 1500 250 1493 C296 1458 345 1416 351 1380 C356 1351 340 1326 317 1313 C289 1299 261 1305 240 1331 Z',occluders:[]},
};
export const REFERENCE_SCREWS={
 s1:[181,897,'green'],s2:[448,899,'green'],s3:[184,1168,'red'],s4:[446,1168,'green'],
 s5:[440,988,'red'],s6:[656,988,'blue'],s7:[542,1136,'red'],
 s8:[524,1233,'blue'],s9:[795,1235,'brown'],s10:[662,1364,'brown'],s11:[530,1509,'brown'],s12:[785,1504,'blue'],
 s13:[184,1366,'gray'],s14:[292,1362,'gray'],s15:[242,1444,'gray'],
};
export const COLORS={gray:'#888888',brown:'#82462f',green:'#8fe43b',red:'#f63830',blue:'#2b83f6',yellow:'#f5cf40',purple:'#a65fe2',orange:'#fa9247'};
export const CORE_BUFFER=[[208,548],[295,548],[383,548],[471,548],[559,548]];
export const BOX_SLOTS=[[[132,344],[95,400],[170,400]],[[357,344],[320,400],[395,400]],[[586,344],[550,400],[625,400]],[[813,344],[777,400],[852,400]]];
const levelViews=new WeakMap();
function rawPoint(pd,sd){const a=pd.rotation||0;return [471+(pd.position[0]+sd.localPos[0]*Math.cos(a)+sd.localPos[1]*Math.sin(a))*125,1190+(pd.position[2]-sd.localPos[0]*Math.sin(a)+sd.localPos[1]*Math.cos(a))*125];}
// 后续关卡与首关使用相同大小的游玩区域，不能缩成中央一小团。
export function configureLevelLayout(data){
 if(data.plates.some(p=>p.art))return;
 const points=data.plates.flatMap(p=>p.screws.map(s=>rawPoint(p,s))),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(635/Math.max(1,maxX-minX),580/Math.max(1,maxY-minY)),view={scale,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
 data.plates.forEach(p=>levelViews.set(p,view));
}
export function pointFor(pd,sd){
 if(pd.art)return [...sd.localPos];
 const p=rawPoint(pd,sd),view=levelViews.get(pd);return view?[471+(p[0]-view.cx)*view.scale,1200+(p[1]-view.cy)*view.scale]:p;
}
