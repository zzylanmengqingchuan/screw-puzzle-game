import * as THREE from 'three';
import { InputControls } from './controls.js';
import { createScrew, createPlate, createCollectorBox, createBufferSlot, getColor } from './models.js';
import { GameEngine, ScrewState, PlateState } from './game.js';
import { UI } from './ui.js';
import {
  updateAnimations, animateScrewOut, animateFlyTo,
  animateBoxFlash, animateEliminate, animateColorChange,
  animateAutoReturn, animatePlateFall, animateFailShake, animateVictory,
} from './animations.js';
import {
  startTimer, stopTimer, getElapsedSeconds, recordMove, getMoveCount,
  recordHintUsed, recordUndoUsed, getMaxBufferUsed, updateMaxBuffer,
  onLevelComplete, getRecords, getBestRecord, resetCurrentRun,
} from './scores.js';
import { findNextMove } from './hint.js';
import { UndoManager } from './undo.js';
import { AudioManager } from './audio.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFDF6EC);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 9, 9);
camera.lookAt(0, 0.5, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 12, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.left = -10; dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10; dirLight.shadow.camera.bottom = -10;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xffeedd, 0.3);
fillLight.position.set(-3, 5, -5);
scene.add(fillLight);

const groundGeo = new THREE.PlaneGeometry(30, 30);
const groundMat = new THREE.MeshBasicMaterial({ color: 0xF3EBE0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3.0;
ground.receiveShadow = true;
scene.add(ground);

const controls = new InputControls(camera, canvas);
const engine = new GameEngine();
const ui = new UI();
const audio = new AudioManager();
const undoManager = new UndoManager(engine);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let audioUnlocked = false;

const LAYOUT = {
  boxY: 3.5, boxZ: -1.5,
  bufferY: 1.6, bufferZ: -0.5,
  plateBaseY: -1.2,
  boxSpacing: 4.5,
  bufferSpacing: 1.0,
};

let screwMeshes = {};
let plateMeshes = {};
let boxGroups = [null, null];
let bufferSlots = [];
let bufferScrewPositions = [];
let exposedScrewMeshList = [];
let animating = false;
let currentLevelId = 1;
let debugLabelsVisible = false;
let debugLabels = {};

function clearScene() {
  Object.values(screwMeshes).forEach(m => scene.remove(m));
  Object.values(plateMeshes).forEach(m => scene.remove(m));
  boxGroups.forEach(b => { if (b) scene.remove(b); });
  bufferSlots.forEach(s => scene.remove(s));
  Object.values(debugLabels).forEach(s => scene.remove(s));
  screwMeshes = {};
  plateMeshes = {};
  boxGroups = [null, null];
  bufferSlots = [];
  bufferScrewPositions = [];
  exposedScrewMeshList = [];
  debugLabels = {};
}

function createDebugLabel(text) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size * 0.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size/2, size/2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.4, 0.4, 1);
  sprite.visible = debugLabelsVisible;
  return sprite;
}

function toggleDebugLabels() {
  debugLabelsVisible = !debugLabelsVisible;
  Object.values(debugLabels).forEach(s => { s.visible = debugLabelsVisible; });
  document.getElementById('debug-btn').classList.toggle('active', debugLabelsVisible);
}

document.getElementById('debug-btn').addEventListener('click', toggleDebugLabels);

function buildScene(levelData) {
  clearScene();

  const colors = engine.getBoxColors();
  for (let i = 0; i < 2; i++) {
    const box = createCollectorBox(colors[i] || 'red');
    box.position.set((i === 0 ? -1 : 1) * LAYOUT.boxSpacing / 2, LAYOUT.boxY, LAYOUT.boxZ);
    scene.add(box);
    boxGroups[i] = box;
  }

  for (let i = 0; i < 5; i++) {
    const slot = createBufferSlot();
    const x = (i - 2) * LAYOUT.bufferSpacing;
    slot.position.set(x, LAYOUT.bufferY, LAYOUT.bufferZ);
    scene.add(slot);
    bufferSlots.push(slot);
    bufferScrewPositions.push(new THREE.Vector3(x, LAYOUT.bufferY + 0.35, LAYOUT.bufferZ));
  }

  levelData.plates.forEach(pd => {
    const holePositions = pd.screws.map(s => s.localPos);
    const firstColor = pd.screws.length > 0 ? getColor(pd.screws[0].color) : null;
    const plateMesh = createPlate(pd.shape, pd.shapeParams, holePositions, firstColor);
    const layerOffset = pd.layer * 0.3;
    plateMesh.position.set(pd.position[0], LAYOUT.plateBaseY + layerOffset, pd.position[2]);
    if (pd.rotation) plateMesh.rotation.y = pd.rotation;
    plateMesh.userData.plateId = pd.id;
    scene.add(plateMesh);
    plateMeshes[pd.id] = plateMesh;

    pd.screws.forEach(sd => {
      const screwGroup = createScrew(sd.color);
      const wx = pd.position[0] + sd.localPos[0];
      const wz = pd.position[2] + sd.localPos[1];
      const wy = LAYOUT.plateBaseY + layerOffset + 0.15;
      screwGroup.position.set(wx, wy, wz);
      screwGroup.userData.screwId = sd.id;
      scene.add(screwGroup);
      screwMeshes[sd.id] = screwGroup;

      const label = createDebugLabel(sd.id.replace('s', ''));
      label.position.set(wx, wy + 0.55, wz);
      scene.add(label);
      debugLabels[sd.id] = label;
    });
  });

  updateExposedList();
}

function updateExposedList() {
  const exposedIds = engine.getExposedScrewIds();
  exposedScrewMeshList = [];
  Object.entries(screwMeshes).forEach(([id, mesh]) => {
    const isExposed = exposedIds.includes(id);
    mesh.traverse(child => {
      if (child.isMesh) {
        if (child.userData._origOpacity === undefined) {
          child.userData._origOpacity = child.material.opacity ?? 1;
          child.material = child.material.clone();
          child.material.transparent = true;
        }
        child.material.opacity = isExposed ? child.userData._origOpacity : 0.3;
        child.material.needsUpdate = true;
      }
    });
    if (isExposed) exposedScrewMeshList.push(mesh);
  });
}

function getBoxSlotWorldPos(boxIndex, slotIndex) {
  const box = boxGroups[boxIndex];
  if (!box) return new THREE.Vector3();
  const localX = box.userData.slotPositions[slotIndex];
  const pos = new THREE.Vector3(localX, 0.35, 0);
  box.localToWorld(pos);
  return pos;
}

function getSlotRings(boxIndex) {
  const rings = [];
  boxGroups[boxIndex]?.traverse(c => {
    if (c.userData?.isSlotRing) rings.push(c);
  });
  return rings;
}

async function executeCommands(commands) {
  animating = true;
  const skipScrewFly = new Set();
  for (const cmd of commands) {
    const mesh = cmd.screwId ? screwMeshes[cmd.screwId] : null;
    switch (cmd.type) {
      case 'screw_out':
        if (mesh) await animateScrewOut(mesh);
        audio.playScrewOut();
        break;
      case 'fly_to_box': {
        if (skipScrewFly.has(cmd.screwId)) { skipScrewFly.delete(cmd.screwId); break; }
        const target = getBoxSlotWorldPos(cmd.boxIndex, cmd.slotIndex);
        if (mesh) await animateFlyTo(mesh, target);
        audio.playBoxPlace();
        const rings = getSlotRings(cmd.boxIndex);
        if (rings.length) await animateBoxFlash(rings);
        break;
      }
      case 'fly_to_buffer': {
        const target = bufferScrewPositions[cmd.bufferIndex];
        if (mesh) await animateFlyTo(mesh, target);
        audio.playBufferPlace();
        break;
      }
      case 'auto_return': {
        const flyCmd = commands.find(c => c.type === 'fly_to_box' && c.screwId === cmd.screwId);
        const slotIdx = flyCmd ? flyCmd.slotIndex : 0;
        const target = getBoxSlotWorldPos(cmd.boxIndex, slotIdx);
        if (mesh) await animateAutoReturn(mesh, target);
        skipScrewFly.add(cmd.screwId);
        audio.playAutoReturn();
        const rings = getSlotRings(cmd.boxIndex);
        if (rings.length) await animateBoxFlash(rings);
        break;
      }
      case 'eliminate_box':
        removeScrewsInBox();
        audio.playBoxComplete();
        break;
      case 'box_color_change': {
        for (let i = 0; i < 2; i++) {
          const c = cmd.colors[i];
          if (!c) continue;
          const rings = getSlotRings(i);
          if (rings.length) await animateColorChange(rings, getColor(c));
        }
        removeScrewsInBox();
        audio.playColorChange();
        break;
      }
      case 'plate_fall': {
        const pm = plateMeshes[cmd.plateId];
        if (pm) {
          await animatePlateFall(pm);
          scene.remove(pm);
        }
        audio.playPlateFall();
        if (engine.plates[cmd.plateId]) {
          engine.plates[cmd.plateId].state = PlateState.GONE;
        }
        updateExposedList();
        break;
      }
      case 'fail':
        stopTimer();
        onLevelComplete(currentLevelId, false);
        audio.playFail();
        await animateFailShake(bufferSlots[2] || new THREE.Object3D());
        ui.showModal('暂存区满了！', '合理规划拆卸顺序，避免暂存区被占满哦。', [
          { text: '再试一次', style: 'primary', action: () => startLevel(currentLevelId) },
        ]);
        break;
      case 'victory': {
        stopTimer();
        onLevelComplete(currentLevelId, true);
        audio.playVictory();
        await animateVictory(boxGroups.filter(Boolean));
        const names = { 1: '教学关', 2: '正式关', 3: '挑战关' };
        const best = getBestRecord(currentLevelId);
        const timeStr = formatTime(getElapsedSeconds());
        const nextId = currentLevelId < 3 ? currentLevelId + 1 : null;
        const btns = [{ text: '再玩一次', style: 'secondary', action: () => startLevel(currentLevelId) }];
        if (nextId) btns.push({ text: '下一关', style: 'primary', action: () => startLevel(nextId) });
        // 其他关卡入口
        const levelOpts = [1, 2, 3]
          .filter(id => id !== currentLevelId && id !== nextId)
          .map(id => ({ text: names[id], action: () => startLevel(id) }));
        ui.showVictoryModal('太棒了！', `通过「${names[currentLevelId]}」· 用时 ${timeStr}`, btns, levelOpts);
        break;
      }
    }
  }
  animating = false;
}

function removeScrewsInBox() {
  Object.entries(screwMeshes).forEach(([id, mesh]) => {
    const s = engine.screws[id];
    if (s && s.state === ScrewState.IN_BOX) {
      scene.remove(mesh);
      s.state = ScrewState.REMOVED;
    }
  });
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function startLevel(id) {
  currentLevelId = id;
  ui.setActiveLevel(id);
  ui.hideModal();
  ui.showRuleHint();
  resetCurrentRun();
  undoManager.clear();
  const data = engine.loadLevel(id);
  if (data) buildScene(data);
  startTimer();
  ui.showScoreDisplay();
  ui.updateScoreDisplay(0, 0);
}

controls.onClick((e) => {
  if (!audioUnlocked) { audio.unlock(); audioUnlocked = true; }
  if (animating || engine.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(exposedScrewMeshList, true);
  if (hits.length === 0) return;

  let target = hits[0].object;
  while (target && !target.userData?.screwId) target = target.parent;
  if (!target) return;

  const screwId = target.userData.screwId;
  undoManager.saveState();
  const commands = engine.tryPickScrew(screwId);
  if (commands) {
    recordMove(screwId);
    const bufUsed = engine.buffer.filter(s => s !== null).length;
    updateMaxBuffer(bufUsed);
    executeCommands(commands);
  }
});

ui.onLevelSelect(id => { if (!animating) startLevel(id); });
ui.onRestart(() => { if (!animating) startLevel(currentLevelId); });

document.getElementById('hint-btn').addEventListener('click', () => {
  if (!audioUnlocked) { audio.unlock(); audioUnlocked = true; }
  if (animating || engine.gameOver) return;
  const result = findNextMove(engine);
  if (result && result.screwId && screwMeshes[result.screwId]) {
    recordHintUsed();
    const mesh = screwMeshes[result.screwId];
    let flash = 0;
    const interval = setInterval(() => {
      mesh.visible = !mesh.visible;
      flash++;
      if (flash >= 6) { clearInterval(interval); mesh.visible = true; }
    }, 200);
  } else {
    ui.showModal('无法找到通关路线', '当前局面可能无解，试试撤销几步？', [
      { text: '好的', style: 'primary' },
    ]);
  }
});

document.getElementById('undo-btn').addEventListener('click', () => {
  if (!audioUnlocked) { audio.unlock(); audioUnlocked = true; }
  if (animating) return;
  if (!undoManager.canUndo()) return;
  recordUndoUsed();
  const snap = undoManager.undo();
  if (snap) {
    const data = { plates: [] };
    for (const [pid, pstate] of Object.entries(engine.plates)) {
      const screws = pstate.screwIds.map(sid => {
        const s = engine.screws[sid];
        return { id: s.id, color: s.color, localPos: s.localPos };
      });
      data.plates.push({
        id: pid, shape: pstate.shape, shapeParams: pstate.shapeParams,
        position: pstate.position, rotation: pstate.rotation, layer: pstate.layer,
        screws
      });
    }
    buildScene(data);
    Object.entries(engine.screws).forEach(([sid, s]) => {
      const mesh = screwMeshes[sid];
      if (!mesh) return;
      if (s.state === ScrewState.IN_BUFFER && s.bufferIndex >= 0) {
        const pos = bufferScrewPositions[s.bufferIndex];
        if (pos) mesh.position.copy(pos);
      } else if (s.state === ScrewState.REMOVED || s.state === ScrewState.IN_BOX) {
        scene.remove(mesh);
      }
    });
    Object.entries(engine.plates).forEach(([pid, p]) => {
      if (p.state !== 'active' && plateMeshes[pid]) {
        scene.remove(plateMeshes[pid]);
      }
    });
    updateExposedList();
  }
});

const muteBtn = document.getElementById('mute-btn');
muteBtn.addEventListener('click', () => {
  if (!audioUnlocked) { audio.unlock(); audioUnlocked = true; }
  const muted = audio.toggleMute();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.classList.toggle('muted', muted);
});
if (audio.isMuted()) { muteBtn.textContent = '🔇'; muteBtn.classList.add('muted'); }

ui.onHistoryClick(() => {
  const records = getRecords(currentLevelId);
  const best = getBestRecord(currentLevelId);
  const bestIdx = best ? records.findIndex(r => r.timestamp === best.timestamp) : -1;
  ui.showHistoryModal(records, bestIdx);
});

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  if (w / h < 1) {
    camera.fov = 65;
    camera.position.set(0, 11, 11);
  } else if (w / h < 1.2) {
    camera.fov = 55;
    camera.position.set(0, 10, 10);
  } else {
    camera.fov = 50;
    camera.position.set(0, 9, 9);
  }
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

let _scoreUpdateCounter = 0;
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateAnimations();
  if (debugLabelsVisible) {
    Object.entries(debugLabels).forEach(([id, label]) => {
      const mesh = screwMeshes[id];
      if (mesh && mesh.parent) {
        label.position.set(mesh.position.x, mesh.position.y + 0.55, mesh.position.z);
      }
    });
  }
  _scoreUpdateCounter++;
  if (_scoreUpdateCounter % 30 === 0 && !engine.gameOver) {
    ui.updateScoreDisplay(getElapsedSeconds(), getMoveCount());
  }
  renderer.render(scene, camera);
}
animate();

startLevel(1);
