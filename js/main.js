import {enhanced,initialLevel} from './features.js?v=20261107-r5-final';
import * as THREE from 'three';
import {GameEngine,ScrewState,PlateState} from './game.js?v=20261107-r5-final';
import {LEVEL_DATA} from './levels.js?v=20261107-r5-final';
import {UndoManager} from './undo.js?v=20261107-r5-final';
import {AudioManager} from './audio.js?v=20261107-r5-final';
import {findNextMove} from './hint.js?v=20261107-r5-final';
import {startTimer,stopTimer,getElapsedSeconds,recordMove,recordHintUsed,recordUndoUsed,updateMaxBuffer,onLevelComplete,getRecords,resetCurrentRun} from './scores.js?v=20261107-r5-final';
import {WIDTH,HEIGHT,PLATES,REFERENCE_SCREWS,CORE_BUFFER,BOX_SLOTS,pointFor,configureLevelLayout} from './reference-layout.js?v=20261107-r5-final';
import {sprite,screwArt,plateArt,collectorArt,emptySlotArt,progressArt,texture,HAND_RECT,backdropURL} from './reference-art.js?v=20261107-r5-final';

const stage=document.getElementById('reference-stage'),container=document.getElementById('game-container'),canvas=document.getElementById('game-canvas');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-WIDTH/2,WIDTH/2,HEIGHT/2,-HEIGHT/2,.1,4000);
camera.position.z=2000;camera.lookAt(0,0,0);
const board=new THREE.Group();board.position.y=HEIGHT/2-1180;scene.add(board);
const hud=new THREE.Group();scene.add(hud);
const engine=new GameEngine(),undo=new UndoManager(engine),audio=enhanced?new AudioManager():null;
let level=initialLevel,playing=false,toolBusy=false,paused=false,touched=false,storage=[],storageHistory=[],meshes={},plates={},levelData,scale=1,gesture=null;
document.documentElement.dataset.build='20261107-r5-final';
stage.style.width=WIDTH+'px';stage.style.height=HEIGHT+'px';
const hand=document.getElementById('tutorial-hand');Object.assign(hand.style,{left:HAND_RECT.x+'px',top:HAND_RECT.y+'px',width:HAND_RECT.w+'px',height:HAND_RECT.h+'px'});

const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const colorKeys=['gray','brown'];

// 背景资产已移除所有板件、螺丝、手势和光圈；这些对象全部由独立图层渲染。
document.getElementById('reference-backdrop').src=backdropURL;

function world([x,y],z=0){return new THREE.Vector3(x-WIDTH/2,HEIGHT/2-y,z);}
function place(mesh,xy,z=0,parent=scene){
 if(parent===board)mesh.position.set(xy[0]-WIDTH/2,1180-xy[1],z);else mesh.position.copy(world(xy,z));
 parent.add(mesh);return mesh;
}
function dispose(mesh){mesh.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});mesh.removeFromParent();}
function clearVisual(){Object.values(meshes).forEach(dispose);Object.values(plates).forEach(dispose);meshes={};plates={};}
function showToast(text){const el=document.getElementById('toast');el.textContent=text;el.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.hidden=true,2500);}
function action(text,fn,secondary=false,disabled=false){return {text,fn,secondary,disabled};}
function dialog(title,content,actions=[]){
 paused=true;document.getElementById('dialog-title').textContent=title;document.getElementById('dialog-content').innerHTML=content;
 const target=document.getElementById('dialog-actions');target.replaceChildren();
 for(const item of actions){const b=document.createElement('button');b.className='menu-button'+(item.secondary?' secondary':'');b.textContent=item.text;b.disabled=!!item.disabled;b.onclick=item.fn;target.append(b);}
 document.getElementById('dialog').hidden=false;
}
function closeDialog(){document.getElementById('dialog').hidden=true;paused=false;}
document.getElementById('dialog-close').onclick=closeDialog;
function saveUndo(){if(!enhanced)return;undo.saveState();storageHistory.push(storage.map(s=>({...s,xy:[...s.xy]})));if(storageHistory.length>50)storageHistory.shift();}
function doUndo(){if(!enhanced||playing||toolBusy||!undo.canUndo())return;undo.undo();storage=storageHistory.pop();recordUndoUsed();closeDialog();buildVisual();}
function drawHUD(colors=engine.getBoxColors()){
 for(const child of [...hud.children])dispose(child);
 colors.forEach((color,i)=>{
  if(color===colorKeys[i])return;
  const box=sprite(collectorArt(color));box.renderOrder=2000;
  place(box,[i?360:133,374],200,hud);if(!color)box.material.opacity=.5;
 });
 const opened=new Set(storage.filter(s=>s.box!=null).map(s=>s.box));
 for(const bi of opened){const box=sprite(collectorArt('gray'),202,258);box.renderOrder=2000;place(box,[bi===2?586:820,374],200,hud);}
 for(const item of storage){if(item.kind==='extra'){const hole=sprite(emptySlotArt());hole.renderOrder=2000;place(hole,item.xy,200,hud);}}
}
function buildVisual(){
 clearVisual();drawHUD();
 const pristine=level===1&&!touched;
 levelData.plates.forEach((pd,index)=>{
  const p=engine.plates[pd.id];if(p.state!==PlateState.ACTIVE)return;
  const art=plateArt(pd,index,pristine),mesh=sprite(art.canvas,...art.size);mesh.renderOrder=pd.layer*10;
  place(mesh,art.center,pd.layer*8,board);plates[pd.id]=mesh;
 });
 levelData.plates.forEach(pd=>pd.screws.forEach(sd=>{
  const s=engine.screws[sd.id];if(s.state===ScrewState.REMOVED)return;
  let artId=pd.art?sd.id:null;
  if(pd.art&&['s2','s4'].includes(sd.id)&&engine.isExposed(sd.id))artId=null;
  const clean=!pristine||!pd.art||s.state!==ScrewState.ON_PLATE||(pd.art&&['s2','s4'].includes(sd.id)&&engine.isExposed(sd.id));
  const cap=screwArt(s.color,artId,clean);
  const m=sprite(cap);m.userData.screwId=s.id;m.userData.artId=artId;m.userData.color=s.color;meshes[s.id]=m;
  if(s.state===ScrewState.ON_PLATE){m.renderOrder=pd.art?pd.layer*10+2:100+pd.layer;m.material.opacity=pd.art||engine.isExposed(sd.id)?1:.18;const p=pointFor(pd,sd);place(m,[p[0]+cap.centerOffset[0],p[1]+cap.centerOffset[1]],pd.layer*8+2,board);}
  else if(s.state===ScrewState.IN_BOX){m.renderOrder=2010;place(m,BOX_SLOTS[s.boxIndex][s.boxSlotIndex],210);m.scale.setScalar(.70);}
  else if(s.state===ScrewState.IN_BUFFER){m.renderOrder=2010;place(m,storage[s.bufferIndex].xy,210);m.scale.setScalar(.66);}
 }));
 updateLabels();
}
function updateLabels(){
 const count=Object.values(engine.screws).filter(s=>s.state!==ScrewState.ON_PLATE).length,percent=Math.round(count/engine.totalScrews*100)||0;
 const progress=document.getElementById('progress-text');progress.hidden=percent===0;
 if(percent&&progress.dataset.percent!==String(percent)){const art=progressArt(percent);progress.width=art.width;progress.height=art.height;progress.getContext('2d').drawImage(art,0,0);progress.dataset.percent=String(percent);progress.setAttribute('aria-label',`进度${percent}%`);}
 const title=document.getElementById('level-title');title.hidden=level===1;title.textContent=`第${level}关`;
 document.getElementById('tutorial-hand').hidden=touched||level!==1||engine.screws.s15?.state!==ScrewState.ON_PLATE;
 canvas.dataset.animating=String(playing);
 document.querySelectorAll('.unlock').forEach(b=>b.disabled=storage.some(s=>s.box===Number(b.dataset.box)));
}
function tween(ms,fn){return new Promise(resolve=>{const duration=reduced?ms*.20:ms,start=performance.now();function frame(now){const raw=Math.min(1,(now-start)/duration),e=1-Math.pow(1-raw,3);fn(e,raw);if(raw<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});}
async function fly(mesh,target,buffer=false){
 if(!mesh)return;scene.attach(mesh);mesh.renderOrder=3000;const from=mesh.position.clone(),to=world(target,240),startScale=mesh.scale.x;
 await tween(420,(e,t)=>{mesh.position.lerpVectors(from,to,e);mesh.position.y+=Math.sin(t*Math.PI)*90;mesh.rotation.z=t*Math.PI*2;mesh.scale.setScalar(startScale+((buffer ? .66 : .70)-startScale)*e);});
 mesh.position.copy(to);mesh.scale.setScalar(buffer?.66:.70);mesh.rotation.set(0,0,0);
}
async function execute(commands){
 playing=true;updateLabels();
 try{for(const cmd of commands){const m=meshes[cmd.screwId];switch(cmd.type){
  case 'screw_out':if(m){const clean=texture(screwArt(m.userData.color,m.userData.artId,true));m.material.map.dispose();m.material.map=clean;m.material.needsUpdate=true;scene.attach(m);m.renderOrder=3000;const z=m.position.z;await tween(330,(e)=>{m.rotation.z=e*Math.PI*4;m.position.z=z+e*90;});}audio?.playScrewOut();break;
  case 'fly_to_box':await fly(m,BOX_SLOTS[cmd.boxIndex][cmd.slotIndex]);audio?.playBoxPlace();break;
  case 'fly_to_buffer':await fly(m,storage[cmd.bufferIndex].xy,true);audio?.playBufferPlace();break;
  case 'auto_return':break; // 紧随的 fly_to_box 负责同一颗螺丝的归位动画。
  case 'eliminate_box':cmd.screwIds.forEach(id=>{if(meshes[id])meshes[id].visible=false;});audio?.playBoxComplete();break;
  case 'box_color_change':drawHUD(cmd.colors);audio?.playColorChange();break;
  case 'plate_fall':{const p=plates[cmd.plateId];if(p){const y=p.position.y;await tween(450,(e)=>{p.position.y=y-e*230;p.rotation.z=e*.08;p.material.opacity=1-e;});p.visible=false;}engine.plates[cmd.plateId].state=PlateState.GONE;audio?.playPlateFall();break;}
  case 'victory':stopTimer();if(enhanced)onLevelComplete(level,true);audio?.playVictory();break;
  case 'fail':stopTimer();if(enhanced)onLevelComplete(level,false);audio?.playFail();break;
 }} }finally{playing=false;buildVisual();}
 if(engine.gameOver){const won=engine.won;dialog(won?'通关成功！':'暂存孔满了',won?`<p>全部螺丝已收好！${enhanced?'用时 '+Math.round(getElapsedSeconds())+' 秒。':''}</p>`:'<p>换个拆卸顺序，先收齐当前盒子需要的颜色。</p>',[
  ...(won&&level<3?[action('下一关',()=>startLevel(level+1))]:[]),action('重新开始',()=>startLevel(level)),...(!won&&enhanced?[action('撤销一步',doUndo,true)]:[]),action('返回菜单',showMenu,true)
 ]);}
}
async function pick(id,internal=false){
 if(playing||(toolBusy&&!internal)||paused||engine.gameOver||!engine.isExposed(id))return;
 audio?.unlock();if(!internal)saveUndo();
 // 引导层只用于尚未操作的首屏，点击后立即切成不含手势和光圈的干净板件。
 if(!touched){touched=true;buildVisual();}
 const commands=engine.tryPickScrew(id);if(!commands)return;
 if(enhanced){recordMove(id);updateMaxBuffer(engine.buffer.filter(Boolean).length);}await execute(commands);
}
function startLevel(id){
 closeDialog();level=id;levelData=engine.loadLevel(id);configureLevelLayout(levelData);storage=CORE_BUFFER.map(xy=>({xy:[...xy],kind:'core'}));storageHistory=[];undo.clear();touched=false;playing=false;toolBusy=false;
 board.rotation.set(0,0,0);resetCurrentRun();if(enhanced)startTimer();buildVisual();
}
function showHelp(){dialog('玩法说明','<p>点击露出的螺丝。同色装进顶部收纳盒，每盒三颗；其他颜色先放五个暂存孔。两个盒子收满后换色，匹配的暂存螺丝会自动归位。</p><p>拆空板件后它会落下，露出下层。暂存区满格就会失败。轻拖画面可观察图层。</p>',[action('开始玩',closeDialog)]);}
function showHistory(){
 const rs=getRecords(level),sorted=[...rs].sort((a,b)=>a.timeSeconds-b.timeSeconds);
 const body=sorted.length?'<table class="record-table"><thead><tr><th>用时</th><th>步数</th><th>辅助</th><th>结果</th></tr></thead><tbody>'+sorted.map((r,i)=>`<tr class="${i===0?'best':''}"><td>${r.timeSeconds}秒</td><td>${r.moves}</td><td>${r.assisted?'是':'否'}</td><td>${r.won?'通关':'失败'}</td></tr>`).join('')+'</tbody></table>':'<p>本浏览器还没有这关的成绩，通关后会自动保存。</p>';
 dialog('本机成绩',body,[action('返回菜单',showMenu)]);
}
function showMenu(){
 if(playing||toolBusy)return;
 dialog('游戏暂停',`<p>第${level}关 · ${LEVEL_DATA[level].name}</p>`,[
 action('继续游戏',closeDialog),action('重玩本关',()=>startLevel(level),true),
 ...[1,2,3].map(n=>action(`第${n}关`,()=>startLevel(n),true)),
 ...(enhanced?[action('提示下一步',()=>{closeDialog();const hint=findNextMove(engine);if(hint?.screwId){recordHintUsed();const m=meshes[hint.screwId];tween(1000,(e,t)=>m.scale.setScalar(1+Math.sin(t*Math.PI*6)*.13)).then(()=>m.scale.setScalar(1));}else showToast('当前没有找到通关路线，可以撤销或重玩');}),action('撤销上一步',doUndo,false,!undo.canUndo()),action('本机成绩',showHistory,true),action(audio.isMuted()?'打开音效':'关闭音效',()=>{audio.unlock();audio.toggleMute();showMenu();},true)]:[]),
 action('玩法说明',showHelp,true),action('复位视角',()=>{board.rotation.set(0,0,0);closeDialog();},true)
 ]);
}
for(const id of ['pause-btn','menu-btn'])document.getElementById(id).onclick=showMenu;document.getElementById('help-btn').onclick=showHelp;
function addStorage(items){if(playing||toolBusy||engine.gameOver)return;saveUndo();for(const item of items){storage.push(item);engine.buffer.push(null);}if(enhanced)recordHintUsed();closeDialog();buildVisual();}
document.querySelectorAll('.unlock').forEach(b=>b.onclick=()=>{
 const bi=Number(b.dataset.box);if(storage.some(s=>s.box===bi))return;
 dialog('解锁辅助盒','<p>获得三个额外暂存位置，换色后同样会自动归位。本地试玩可直接解锁。</p>',[action('解锁',()=>addStorage(BOX_SLOTS[bi].map(xy=>({xy:[...xy],kind:'unlock',box:bi})))),action('取消',closeDialog,true)]);
});
document.getElementById('add-slot-btn').onclick=()=>{const count=storage.filter(s=>s.kind==='extra').length;if(count>=2){showToast('最多增加两个孔位');return;}addStorage([{xy:[647+count*88,548],kind:'extra'}]);showToast('增加一个暂存孔位');};
document.getElementById('clear-slots-btn').onclick=()=>{
 if(playing||toolBusy||!engine.buffer.some(Boolean)){showToast('暂存区还没有螺丝');return;}saveUndo();
 for(let i=0;i<engine.buffer.length;i++){const id=engine.buffer[i];if(!id)continue;const s=engine.screws[id];s.state=ScrewState.ON_PLATE;s.bufferIndex=-1;const p=engine.plates[s.plateId];p.state=PlateState.ACTIVE;p.remainingScrews++;engine.buffer[i]=null;}
 engine.gameOver=false;engine.won=false;if(enhanced)recordHintUsed();buildVisual();showToast('暂存螺丝已放回板件，孔位腾空');
};
document.getElementById('melt-btn').onclick=async()=>{
 if(playing||toolBusy||paused||engine.gameOver)return;
 const target=[...levelData.plates].reverse().find(p=>engine.plates[p.id].state===PlateState.ACTIVE&&p.screws.every(s=>engine.screws[s.id].state!==ScrewState.ON_PLATE||engine.isExposed(s.id)));
 if(!target)return;saveUndo();if(enhanced)recordHintUsed();toolBusy=true;
 try{for(const s of target.screws){if(engine.gameOver)break;if(engine.isExposed(s.id))await pick(s.id,true);}}finally{toolBusy=false;}
};
canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary){gesture=null;return;}gesture={id:e.pointerId,x:e.clientX,y:e.clientY,rx:board.rotation.x,ry:board.rotation.y};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId||playing||paused)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.hypot(dx,dy)>8){if(!touched){touched=true;buildVisual();}board.rotation.y=Math.max(-.16,Math.min(.16,gesture.ry+dx*.003));board.rotation.x=Math.max(-.12,Math.min(.12,gesture.rx+dy*.003));}});
canvas.addEventListener('pointercancel',()=>gesture=null);
canvas.addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y);gesture=null;
 if(distance>8||playing||paused||toolBusy)return;
 const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
 const exposed=engine.getExposedScrewIds().map(id=>meshes[id]).filter(Boolean),hits=raycaster.intersectObjects(exposed,false),candidates=new Map(hits.map(h=>[h.object.userData.screwId,h.object]));
 const dist=m=>{const p=m.getWorldPosition(new THREE.Vector3()).project(camera);return Math.hypot(r.left+(p.x+1)*r.width/2-e.clientX,r.top+(1-p.y)*r.height/2-e.clientY);};
 if(e.pointerType==='touch')exposed.forEach(m=>{if(dist(m)<=23)candidates.set(m.userData.screwId,m);});
 const chosen=[...candidates.values()].sort((a,b)=>dist(a)-dist(b))[0];if(chosen)pick(chosen.userData.screwId);
});
function resize(){scale=Math.min(innerWidth/WIDTH,innerHeight/HEIGHT);container.style.width=WIDTH*scale+'px';container.style.height=HEIGHT*scale+'px';stage.style.transform=`scale(${scale})`;stage.style.setProperty('--hit-size',44/scale+'px');renderer.setPixelRatio(Math.min(devicePixelRatio,3));renderer.setSize(WIDTH*scale,HEIGHT*scale,false);}
addEventListener('resize',resize);resize();
function render(){requestAnimationFrame(render);renderer.render(scene,camera);}render();startLevel(level);document.getElementById('loading').hidden=true;
if(new URLSearchParams(location.search).has('test'))window.__gameInspection={
 read:()=>({enhanced,level,animating:playing,paused,gameOver:engine.gameOver,won:engine.won,audioState:audio?._ctx?.state||'absent',buffer:[...engine.buffer],boxes:engine.boxes.map(b=>({...b})),storage:storage.map(s=>({...s})),screws:Object.fromEntries(Object.entries(engine.screws).map(([id,s])=>[id,{...s,visible:!!meshes[id]?.visible,attached:!!meshes[id]?.parent}])),plates:Object.fromEntries(Object.entries(engine.plates).map(([id,p])=>[id,{state:p.state,attached:!!plates[id]?.parent}]))}),
 points:()=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld();const r=canvas.getBoundingClientRect();return Object.fromEntries(Object.entries(meshes).filter(([id,m])=>m.parent&&m.visible).map(([id,m])=>{const p=m.getWorldPosition(new THREE.Vector3()).project(camera);return [id,{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}];}));}
};
