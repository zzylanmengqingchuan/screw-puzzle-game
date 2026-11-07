import * as THREE from 'three';
import {WIDTH,HEIGHT,PLATES,REFERENCE_SCREWS,COLORS,pointFor} from './reference-layout.js?v=20261107-r5-final';
export const artwork=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='assets/reference/art-native.png?v=20261107-r5-final';});
const NX=artwork.naturalWidth/WIDTH,NY=artwork.naturalHeight/HEIGHT;
const samples=document.createElement('canvas');samples.width=artwork.naturalWidth;samples.height=artwork.naturalHeight;
const sampleContext=samples.getContext('2d',{willReadFrequently:true});sampleContext.drawImage(artwork,0,0);
function sourcePixel(x,y){return sampleContext.getImageData(Math.round(x*NX),Math.round(y*NY),1,1).data;}
// 画布和裁剪框对齐原图整数像素，逻辑尺寸仍供Three.js的参考坐标使用。
function canvas(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w*NX);c.height=Math.ceil(h*NY);c.logicalWidth=c.width/NX;c.logicalHeight=c.height/NY;c.getContext('2d').scale(NX,NY);return c;}
function boundsCanvas(bounds){const [x,y,w,h]=bounds,left=Math.floor(x*NX),top=Math.floor(y*NY),right=Math.ceil((x+w)*NX),bottom=Math.ceil((y+h)*NY);const c=document.createElement('canvas');c.width=right-left;c.height=bottom-top;c.logicalWidth=c.width/NX;c.logicalHeight=c.height/NY;return {canvas:c,x:left/NX,y:top/NY,w:c.logicalWidth,h:c.logicalHeight};}
function transform(ctx,x=0,y=0){ctx.setTransform(NX,0,0,NY,-x*NX,-y*NY);}
function crop(ctx,sx,sy,sw,sh,dx,dy,dw=sw,dh=sh){ctx.drawImage(artwork,sx*NX,sy*NY,sw*NX,sh*NY,dx,dy,dw,dh);}
export function texture(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;}
export function sprite(c,w=c.logicalWidth||c.width,h=c.logicalHeight||c.height){return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture(c),transparent:true,depthWrite:false}));}
export const HAND_RECT={x:Math.floor(191*NX)/NX,y:Math.floor(1488*NY)/NY,w:Math.ceil(125*NX)/NX,h:Math.ceil(177*NY)/NY};
const tutorialSources=await Promise.all(['background-native.png','hand-native.png'].map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=`assets/reference/${name}?v=20261107-r5-final`;})));
const cleanBackground=document.createElement('canvas');cleanBackground.width=artwork.naturalWidth;cleanBackground.height=artwork.naturalHeight;
cleanBackground.getContext('2d').drawImage(tutorialSources[0],0,0);
// 清除上一版背景中残留的微弱引导圆环；这一区域是连续的蓝色渐变。
const backgroundContext=cleanBackground.getContext('2d',{willReadFrequently:true});
{
 const x=Math.round(126*NX),y=Math.round(1385*NY),w=Math.round(244*NX),h=Math.round(286*NY);
 const data=backgroundContext.getImageData(x,y,w,h),d=data.data;
 for(let py=0;py<h;py++)for(let px=0;px<w;px++){
  const i=(py*w+px)*4,a=py*w*4,b=(py*w+w-1)*4,t=px/(w-1);
  const feather=Math.min(1,px/(22*NX),(w-1-px)/(22*NX),py/(20*NY),(h-1-py)/(20*NY));
  for(let k=0;k<3;k++)d[i+k]=Math.round(d[i+k]*(1-feather)+(d[a+k]*(1-t)+d[b+k]*t)*feather);
 }
 backgroundContext.putImageData(data,x,y);
}
export const backdropURL=cleanBackground.toDataURL('image/png');
// 心形周围是柔和光圈，不能用硬路径裁剪，否则边缘会出现锯齿状碎片。
// 依据已清理的背景恢复透明度，同时扣除独立手势，避免板件移动时带着手指残影。
function isolateHeart(layer,x,y){
 const lc=layer.getContext('2d'),data=lc.getImageData(0,0,layer.width,layer.height),d=data.data;
 const bg=cleanBackground.getContext('2d').getImageData(Math.round(x*NX),Math.round(y*NY),layer.width,layer.height).data;
 const hand=canvas(layer.logicalWidth,layer.logicalHeight),hc=hand.getContext('2d');hc.drawImage(tutorialSources[1],HAND_RECT.x-x,HAND_RECT.y-y,HAND_RECT.w,HAND_RECT.h);
 const hd=hc.getImageData(0,0,layer.width,layer.height).data;
 for(let i=0;i<d.length;i+=4){
  let alpha=0;
  for(let k=0;k<3;k++){const delta=d[i+k]-bg[i+k];alpha=Math.max(alpha,delta>=0?delta/Math.max(1,255-bg[i+k]):-delta/Math.max(1,bg[i+k]));}
  if(alpha<1/255){d[i+3]=0;continue;}
  for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,Math.round(bg[i+k]+(d[i+k]-bg[i+k])/alpha)));
  d[i+3]=Math.round(alpha*(255-hd[i+3]));
 }
 lc.putImageData(data,0,0);
}
function removeSky(layer,x,y,path){
 const lc=layer.getContext('2d'),pixels=lc.getImageData(0,0,layer.width,layer.height),d=pixels.data;
 const bg=backgroundContext.getImageData(Math.round(x*NX),Math.round(y*NY),layer.width,layer.height).data;
 const inside=canvas(layer.logicalWidth,layer.logicalHeight),ic=inside.getContext('2d');transform(ic,x,y);ic.fill(path);const mask=ic.getImageData(0,0,layer.width,layer.height).data;
 for(let i=0;i<d.length;i+=4){
  if(!d[i+3])continue;
  if(mask[i+3]>128)continue;
  const difference=Math.max(...[0,1,2].map(k=>Math.abs(d[i+k]-bg[i+k])));
  d[i+3]=Math.round(d[i+3]*Math.max(0,Math.min(1,(difference-8)/18)));
 }
 lc.putImageData(pixels,0,0);
}
const caps=new Map();
export function screwArt(color,id=null,clean=false){
 const key=`${color}:${id||'generic'}:${clean}`;if(caps.has(key))return caps.get(key);
 // 收纳/飞行时用完整圆帽，不能把截图上的板件底色和引导光圈一起带走。
 const cleanSamples={gray:'s13',green:'s1',red:'s5',blue:'s8',brown:'s10'};
 const source=(clean&&REFERENCE_SCREWS[cleanSamples[color]])||(!clean&&id&&REFERENCE_SCREWS[id])||Object.values(REFERENCE_SCREWS).find(p=>p[2]===color)||REFERENCE_SCREWS.s13;
 const {canvas:c,x,y,w,h}=boundsCanvas([source[0]-40,source[1]-40,80,80]);const ctx=c.getContext('2d');transform(ctx,x,y);
 ctx.save();ctx.beginPath();ctx.arc(source[0],source[1],clean?31.5:38.5,0,Math.PI*2);ctx.clip();ctx.drawImage(artwork,0,0,WIDTH,HEIGHT);ctx.restore();
 c.centerOffset=[x+w/2-source[0],y+h/2-source[1]];
 if(clean&&color==='gray'){
  const image=ctx.getImageData(0,0,c.width,c.height),d=image.data;
  for(let i=0;i<d.length;i+=4){const gray=Math.round(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722);d[i]=d[i+1]=d[i+2]=gray;}
  ctx.putImageData(image,0,0);
 }
 if(!['red','green','blue','brown','gray'].includes(color)){
  const data=ctx.getImageData(0,0,c.width,c.height),d=data.data,target=COLORS[color].match(/\w\w/g).map(v=>parseInt(v,16));
  for(let i=0;i<d.length;i+=4){const light=Math.pow((d[i]+d[i+1]+d[i+2])/3/145,1.5);for(let k=0;k<3;k++)d[i+k]=Math.min(255,Math.round(target[k]*light));}
  ctx.putImageData(data,0,0);
 }
 caps.set(key,c);return c;
}
const plateCache=new WeakMap();
function roundedHull(points,pad=48){
 const cloud=points.flatMap(([x,y])=>Array.from({length:16},(_,i)=>[x+Math.cos(i*Math.PI/8)*pad,y+Math.sin(i*Math.PI/8)*pad])).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const lower=[],upper=[];
 for(const p of cloud){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of [...cloud].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 const hull=lower.slice(0,-1).concat(upper.slice(0,-1)),mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
 let path=`M ${mid(hull.at(-1),hull[0]).join(' ')}`;
 hull.forEach((p,i)=>path+=` Q ${p.join(' ')} ${mid(p,hull[(i+1)%hull.length]).join(' ')}`);
 return path+' Z';
}
export function plateArt(pd,index,pristine=false){
 const variants=plateCache.get(pd)||new Map();
 if(variants.has(pristine))return variants.get(pristine);
 let meta;
 if(pd.art)meta=PLATES[pd.art];
 else{
  const points=pd.screws.map(sd=>pointFor(pd,sd)),pad=52,xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const x=Math.min(...xs)-pad,y=Math.min(...ys)-pad,w=Math.max(...xs)-x+pad,h=Math.max(...ys)-y+pad;
  meta={bounds:[x-15,y-15,w+30,h+30],color:['#fc858c','#91bff9','#cbe985','#f7a5e7','#ffbf74','#a6dde1','#d0a6ee'][index%7],path:`M ${x+24} ${y} Q ${x+w/2} ${y+18} ${x+w-24} ${y} Q ${x+w+4} ${y-4} ${x+w} ${y+26} L ${x+w-16} ${y+h/2} L ${x+w} ${y+h-26} Q ${x+w+4} ${y+h+4} ${x+w-24} ${y+h} L ${x+w/2} ${y+h-16} L ${x+24} ${y+h} Q ${x-4} ${y+h+4} ${x} ${y+h-26} L ${x+16} ${y+h/2} L ${x} ${y+26} Q ${x-4} ${y-4} ${x+24} ${y} Z`,occluders:[]};
  if(pd.shape!=='rect')meta.path=roundedHull(points);
 }
 const {canvas:c,x,y,w,h}=boundsCanvas(meta.bounds),ctx=c.getContext('2d'),path=new Path2D(meta.path);transform(ctx,x,y);ctx.lineJoin='round';ctx.lineCap='round';ctx.fillStyle=pd.art==='heart'&&!pristine?'#dcfd8d':meta.color;
 if(!pristine){ctx.strokeStyle='#6f7779';ctx.lineWidth=17;ctx.stroke(path);}
 ctx.strokeStyle='#fff';ctx.lineWidth=13;ctx.stroke(path);ctx.fill(path);
 if(pd.art){
  const layer=boundsCanvas(meta.bounds).canvas,lc=layer.getContext('2d');transform(lc,x,y);lc.drawImage(artwork,0,0,WIDTH,HEIGHT);
  const mask=boundsCanvas(meta.bounds).canvas,mc=mask.getContext('2d');transform(mc,x,y);mc.fillStyle='#fff';mc.strokeStyle='#fff';mc.lineJoin='round';mc.lineWidth=34;mc.fill(path);mc.stroke(path);
  lc.resetTransform();if(pd.art==='heart')isolateHeart(layer,x,y);else{lc.globalCompositeOperation='destination-in';lc.drawImage(mask,0,0);lc.globalCompositeOperation='source-over';}transform(lc,x,y);
  lc.save();lc.clip(path);for(const id of meta.occluders){const p=new Path2D(PLATES[id].path);lc.fillStyle=meta.color;lc.strokeStyle=meta.color;lc.lineWidth=25;lc.fill(p);lc.stroke(p);}lc.restore();
  const screwPoints=pristine?pd.screws.map(sd=>pointFor(pd,sd)):Object.values(REFERENCE_SCREWS).map(p=>p.slice(0,2));
  for(const [sx,sy] of screwPoints){
   lc.save();lc.clip(path);lc.beginPath();lc.arc(sx,sy,37,0,Math.PI*2);
   const nearby=[],base=meta.color.match(/\w\w/g).map(v=>parseInt(v,16));
   for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p=sourcePixel(sx+Math.cos(a)*42,sy+Math.sin(a)*42);if(Math.hypot(p[0]-base[0],p[1]-base[1],p[2]-base[2])<85)nearby.push(p);}
   lc.fillStyle=nearby.length?'rgb('+[0,1,2].map(k=>Math.round(nearby.reduce((n,p)=>n+p[k],0)/nearby.length)).join(',')+')':meta.color;lc.fill();lc.restore();
  }
  if(pristine){ctx.save();ctx.resetTransform();if(pd.art==='heart')ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(layer,0,0);ctx.restore();}
  else if(pd.art!=='heart'){removeSky(layer,x,y,path);ctx.save();ctx.resetTransform();ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(layer,0,0);ctx.restore();}
 }
 if(!pristine&&(!pd.art||pd.art==='heart')){
  ctx.save();ctx.clip(path);const glass=ctx.createLinearGradient(x,y,x+w,y+h);glass.addColorStop(0,'#ffffff24');glass.addColorStop(.48,'#ffffff00');glass.addColorStop(.49,'#ffffff16');glass.addColorStop(1,'#ffffff00');ctx.fillStyle=glass;ctx.fillRect(x,y,w,h);ctx.restore();
 }
 for(const sd of pd.screws){const [sx,sy]=pointFor(pd,sd);ctx.save();ctx.clip(path);ctx.beginPath();ctx.arc(sx,sy,11,0,Math.PI*2);const depth=ctx.createLinearGradient(sx,sy-11,sx,sy+11);depth.addColorStop(0,'#56747e');depth.addColorStop(1,'#9fbdc1');ctx.fillStyle=pristine?'#59778455':depth;ctx.fill();ctx.strokeStyle='#ffffffb0';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
 const result={canvas:c,center:[x+w/2,y+h/2],size:[w,h],meta};variants.set(pristine,result);plateCache.set(pd,variants);return result;
}

export function progressArt(percent){
 const rect=[789,660,154,48],c=canvas(rect[2],rect[3]),ctx=c.getContext('2d');crop(ctx,...rect,0,0);
 // 用相邻蓝底逐列插值修复原有数字，保留右上角放射纹理，避免盖一块纯色。
 const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data,top=Math.round(7*NY),bottom=Math.round(39*NY);
 for(let py=top+1;py<bottom;py++)for(let px=0;px<c.width;px++){
  const t=(py-top)/(bottom-top),i=(py*c.width+px)*4,a=(top*c.width+px)*4,b=(bottom*c.width+px)*4;
  for(let k=0;k<3;k++)d[i+k]=Math.round(d[a+k]*(1-t)+d[b+k]*t);
 }
 ctx.putImageData(pixels,0,0);ctx.fillStyle='#000';ctx.font='900 29px "Heiti SC","PingFang SC",sans-serif';ctx.textBaseline='alphabetic';ctx.fillText(`进度${percent}%`,7,35);return c;
}
export function collectorArt(color){
 const c=canvas(192,258),ctx=c.getContext('2d');crop(ctx,37,245,192,258,0,0);
 const image=ctx.getImageData(0,0,c.width,c.height),v=image.data,target=(COLORS[color]||'#888888').match(/\w\w/g).map(v=>parseInt(v,16));
 for(let py=0;py<c.height;py++)for(let px=0;px<c.width;px++){
  const x=px/NX,y=py/NY;if(x>10&&x<179&&y>63&&y<192)continue;const i=(py*c.width+px)*4;
  if(v[i]>215&&v[i+1]>215&&v[i+2]>215)continue;if(Math.max(v[i],v[i+1],v[i+2])-Math.min(v[i],v[i+1],v[i+2])>25)continue;
  const light=(v[i]+v[i+1]+v[i+2])/3/92;v[i]=Math.min(255,target[0]*light);v[i+1]=Math.min(255,target[1]*light);v[i+2]=Math.min(255,target[2]*light);
 }ctx.putImageData(image,0,0);return c;
}
export function emptySlotArt(){const c=canvas(56,56);crop(c.getContext('2d'),180,520,56,56,0,0);return c;}
