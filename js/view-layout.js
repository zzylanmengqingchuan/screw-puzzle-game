import {WIDTH,HEIGHT} from './reference-layout.js?v=20261107-r5-final';
import {cleanBackground} from './reference-art.js?v=20261112-desktop';

// 手机沿用原坐标。电脑只映射显示位置，关卡与规则继续使用相同数据。
export const MOBILE_VIEW={name:'mobile',width:WIDTH,height:HEIGHT,boardScale:1,hudScale:1,boardCenter:[WIDTH/2,1180]};
export const DESKTOP_VIEW={name:'desktop',width:1600,height:900,boardScale:.88,hudScale:.52,boardCenter:[1110,420]};
export function hudPoint(view,[x,y]){return view===MOBILE_VIEW?[x,y]:[54+x*.52,160+(y-140)*.52];}
export function boardPoint(view,[x,y]){return [view.boardCenter[0]+(x-WIDTH/2)*view.boardScale,view.boardCenter[1]+(y-1180)*view.boardScale];}
export function toolPoint(view,[x,y]){return view===MOBILE_VIEW?[x,y]:[84+(x-110)*.60,730+(y-1795)*.60];}

let desktopBackground;
export function desktopBackdrop(){
 if(desktopBackground)return desktopBackground;
 const c=document.createElement('canvas');c.width=2400;c.height=1350;const ctx=c.getContext('2d');ctx.scale(1.5,1.5);
 const nx=cleanBackground.width/WIDTH,ny=cleanBackground.height/HEIGHT;
 const crop=([sx,sy,sw,sh],[x,y,w,h])=>ctx.drawImage(cleanBackground,sx*nx,sy*ny,sw*nx,sh*ny,x,y,w,h);
 // 仅重排干净背景与原有控件美术，不把板件画进背景；游戏板仍为独立可操作对象。
 crop([0,800,WIDTH,950],[0,0,1600,900]);
 ctx.save();ctx.shadowColor='#32587824';ctx.shadowBlur=22;ctx.shadowOffsetY=8;ctx.fillStyle='#f9fcff';ctx.beginPath();ctx.roundRect(32,28,550,844,28);ctx.fill();ctx.restore();
 ctx.fillStyle='#ffffff24';ctx.strokeStyle='#ffffff80';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(612,28,956,844,28);ctx.fill();ctx.stroke();
 ctx.fillStyle='#294d67';ctx.font='700 38px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText('拧走小烦恼',64,91);
 ctx.fillStyle='#6386a0';ctx.font='18px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText('按颜色收纳，拆开层层玻璃',66,125);
 crop([0,140,WIDTH,480],[54,160,WIDTH*.52,480*.52]);
 const [bx,by]=hudPoint(DESKTOP_VIEW,[750,540]);crop([750,540,193,168],[bx,by,193*.52,168*.52]);
 ctx.save();ctx.shadowColor='#668f9a55';ctx.shadowOffsetY=4;ctx.fillStyle='#eaf5fa';ctx.strokeStyle='#557e8c';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(72,500,694*.65,128*.65,10);ctx.fill();ctx.stroke();ctx.restore();
 crop([185,698,566,64],[111.65,523.4,566*.65,64*.65]);
 ctx.fillStyle='#6386a0';ctx.font='19px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillText('两盒都收满后一起换色',72,631);ctx.fillText('其他颜色先暂存，注意剩余孔位',72,664);
 crop([110,1795,730,180],[84,730,438,108]);
 desktopBackground=c.toDataURL('image/png');return desktopBackground;
}
