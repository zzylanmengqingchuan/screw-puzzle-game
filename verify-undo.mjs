// 使用真实规则引擎验证撤销、盒子进度、自动归位及三关通关，运行：node verify-undo.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameEngine, ScrewState, PlateState } from './js/game.js';
import { UndoManager } from './js/undo.js';

const solutions = JSON.parse(readFileSync(new URL('./level-solutions.json', import.meta.url)));

function pick(engine, id) {
  const commands = engine.tryPickScrew(id);
  assert.ok(commands, `螺丝 ${id} 应可拆卸`);
  // 与浏览器一致：掉落动画完成后，板件从 falling 变为 gone。
  for (const cmd of commands) {
    if (cmd.type === 'plate_fall') engine.plates[cmd.plateId].state = PlateState.GONE;
  }
  return commands;
}

function checkStorage(engine) {
  if (engine.boxQueueIndex < engine.boxQueue.length) {
    for (let i = 0; i < 2; i++) {
      const screws = Object.values(engine.screws)
        .filter(s => s.state === ScrewState.IN_BOX && s.boxIndex === i);
      assert.equal(screws.length, engine.boxes[i].filled, '盒内实物数量应与计数一致');
      assert.equal(new Set(screws.map(s => s.boxSlotIndex)).size, screws.length, '盒内孔位不能重叠');
      assert.deepEqual(screws.map(s => s.boxSlotIndex).sort(), screws.map((_, slot) => slot));
      screws.forEach(s => assert.equal(s.color, engine.boxes[i].color));
    }
  }
  engine.buffer.forEach((id, index) => {
    if (!id) return;
    assert.equal(engine.screws[id].state, ScrewState.IN_BUFFER);
    assert.equal(engine.screws[id].bufferIndex, index);
  });
  assert.equal(Object.values(engine.screws).filter(s => s.state === ScrewState.REMOVED).length,
    engine.removedCount, '消除计数应与已消除螺丝一致');
}

// 当前参考关：同色灰螺丝13、14、撤销、14、15，三个孔位不能丢失或重叠。
{
  const engine=new GameEngine();engine.loadLevel(1);const undo=new UndoManager(engine);
  undo.saveState();pick(engine,'s13');undo.saveState();pick(engine,'s14');undo.undo();
  assert.equal(engine.boxes[0].filled,1);
  assert.equal(engine.screws.s13.state,ScrewState.IN_BOX);
  assert.equal(engine.screws.s14.state,ScrewState.ON_PLATE);
  pick(engine,'s14');pick(engine,'s15');checkStorage(engine);assert.equal(engine.boxes[0].filled,3);
  undo.undo();assert.equal(engine.boxes[0].filled,0);assert.ok(!undo.canUndo());
}

// 在真实通关/失败路线的每一步撤销、重做，验证整个状态完全一致。
for (const level of [1, 2, 3]) {
  for (const outcome of ['win', 'fail']) {
    const route = solutions[level][outcome]?.path;
    if (!route) continue;
    const engine = new GameEngine();
    engine.loadLevel(level);
    const initial = engine.snapshot();
    const undo = new UndoManager(engine);
    const visible = new Set(Object.keys(engine.screws));
    for (const id of route) {
      const before = engine.snapshot();
      undo.saveState();
      pick(engine, id);
      checkStorage(engine);
      const after = engine.snapshot();
      undo.undo();
      assert.deepEqual(engine.snapshot(), before, `第 ${level} 关 ${id} 撤销应完整恢复`);
      undo.saveState();
      const commands = pick(engine, id);
      assert.deepEqual(engine.snapshot(), after, `第 ${level} 关 ${id} 重做结果应一致`);
      for (const cmd of commands) {
        if (cmd.type === 'eliminate_box') cmd.screwIds.forEach(sid => visible.delete(sid));
      }
      for (const s of Object.values(engine.screws)) {
        assert.equal(visible.has(s.id), s.state !== ScrewState.REMOVED,
          `消除命令不能误删下一轮已归位的 ${s.id}`);
      }
    }
    assert.equal(engine.gameOver, true);
    assert.equal(engine.won, outcome === 'win');
    while (undo.canUndo()) undo.undo();
    assert.deepEqual(engine.snapshot(), initial, '连续撤销整条路线应回到初始状态');
    console.log(`第 ${level} 关：${outcome === 'win' ? '通关' : '失败'}路线、逐步撤销重做、连续撤销通过`);
  }
}
