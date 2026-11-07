const ScrewState = { ON_PLATE: 'on_plate', IN_BUFFER: 'in_buffer', IN_BOX: 'in_box', REMOVED: 'removed' };

import { LEVEL_DATA } from './js/levels.js';

class SimEngine {
  constructor(levelData) {
    this.screws = {};
    this.plates = {};
    this.buffer = [null, null, null, null, null];
    this.boxes = [{ color: null, filled: 0 }, { color: null, filled: 0 }];
    this.boxQueue = levelData.boxQueue;
    this.boxQueueIndex = 0;
    this.gameOver = false;
    this.won = false;
    this.totalScrews = 0;
    this.removedCount = 0;
    this._overlapMap = {};

    levelData.plates.forEach(pd => {
      this.plates[pd.id] = { id: pd.id, state: 'active', screwIds: pd.screws.map(s => s.id), remainingScrews: pd.screws.length };
      pd.screws.forEach(sd => {
        this.screws[sd.id] = { id: sd.id, color: sd.color, plateId: pd.id, state: 'on_plate', bufferIndex: -1 };
        this.totalScrews++;
      });
    });

    (levelData.overlaps || []).forEach(o => {
      o.blocksScrews.forEach(sid => {
        if (!this._overlapMap[sid]) this._overlapMap[sid] = new Set();
        this._overlapMap[sid].add(o.upper);
      });
    });

    this._applyBoxColors();
  }

  clone() {
    const c = Object.create(SimEngine.prototype);
    c.screws = {};
    for (const [k, v] of Object.entries(this.screws)) c.screws[k] = { ...v };
    c.plates = {};
    for (const [k, v] of Object.entries(this.plates)) c.plates[k] = { ...v, screwIds: [...v.screwIds] };
    c.buffer = [...this.buffer];
    c.boxes = this.boxes.map(b => ({ ...b }));
    c.boxQueue = this.boxQueue;
    c.boxQueueIndex = this.boxQueueIndex;
    c.gameOver = this.gameOver;
    c.won = this.won;
    c.totalScrews = this.totalScrews;
    c.removedCount = this.removedCount;
    c._overlapMap = this._overlapMap;
    return c;
  }

  _applyBoxColors() {
    if (this.boxQueueIndex < this.boxQueue.length) {
      const pair = this.boxQueue[this.boxQueueIndex];
      this.boxes[0] = { color: pair[0], filled: 0 };
      this.boxes[1] = { color: pair[1], filled: 0 };
    }
  }

  isExposed(sid) {
    const s = this.screws[sid];
    if (!s || s.state !== 'on_plate') return false;
    if (this.plates[s.plateId].state !== 'active') return false;
    const blockers = this._overlapMap[sid];
    if (!blockers) return true;
    for (const uid of blockers) {
      if (this.plates[uid].state === 'active') return false;
    }
    return true;
  }

  getExposed() {
    return Object.keys(this.screws).filter(id => this.isExposed(id));
  }

  tryPick(sid) {
    if (this.gameOver) return false;
    const screw = this.screws[sid];
    if (!screw || screw.state !== 'on_plate' || !this.isExposed(sid)) return false;

    const plate = this.plates[screw.plateId];
    plate.remainingScrews--;

    const bi = this._matchBox(screw.color);
    if (bi >= 0) {
      this._placeInBox(screw, bi);
    } else {
      const bufIdx = this.buffer.indexOf(null);
      if (bufIdx < 0) { this.gameOver = true; return true; }
      screw.state = 'in_buffer';
      screw.bufferIndex = bufIdx;
      this.buffer[bufIdx] = sid;
    }

    if (plate.remainingScrews <= 0 && plate.state === 'active') plate.state = 'gone';

    this._autoReturn();
    if (!this.gameOver && this.buffer.filter(s => s !== null).length >= this.buffer.length) {
      this.gameOver = true;
    }
    if (!this.gameOver && this.removedCount >= this.totalScrews) {
      this.won = true;
      this.gameOver = true;
    }
    return true;
  }

  _matchBox(color) {
    for (let i = 0; i < 2; i++) {
      if (this.boxes[i].color === color && this.boxes[i].filled < 3) return i;
    }
    return -1;
  }

  _placeInBox(screw, bi) {
    screw.state = 'in_box';
    this.boxes[bi].filled++;
    const lDone = !this.boxes[0].color || this.boxes[0].filled >= 3;
    const rDone = !this.boxes[1].color || this.boxes[1].filled >= 3;
    if (lDone && rDone) {
      this.removedCount += (this.boxes[0].color ? 3 : 0) + (this.boxes[1].color ? 3 : 0);
      Object.values(this.screws).forEach(s => { if (s.state === 'in_box') s.state = 'removed'; });
      this.boxQueueIndex++;
      if (this.boxQueueIndex < this.boxQueue.length) this._applyBoxColors();
    }
  }

  _autoReturn() {
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.buffer.length; i++) {
        const sid = this.buffer[i];
        if (!sid) continue;
        const bi = this._matchBox(this.screws[sid].color);
        if (bi >= 0) {
          this.buffer[i] = null;
          this.screws[sid].bufferIndex = -1;
          found = true;
          this._placeInBox(this.screws[sid], bi);
        }
      }
    }
  }
}

function findWinPath(levelData, maxDepth = 200) {
  const init = new SimEngine(levelData);
  const stack = [{ engine: init, path: [] }];
  let iterations = 0;
  const maxIter = 500000;

  while (stack.length > 0 && iterations < maxIter) {
    iterations++;
    const { engine: eng, path } = stack.pop();
    if (eng.won) return { found: true, path, iterations };
    if (eng.gameOver || path.length >= maxDepth) continue;

    const exposed = eng.getExposed();
    const sorted = [...exposed].sort((a, b) => {
      const ca = eng.screws[a].color, cb = eng.screws[b].color;
      const ma = eng._matchBox(ca) >= 0 ? 0 : 1;
      const mb = eng._matchBox(cb) >= 0 ? 0 : 1;
      return ma - mb;
    });

    for (const sid of sorted) {
      const clone = eng.clone();
      clone.tryPick(sid);
      stack.push({ engine: clone, path: [...path, sid] });
    }
  }
  return { found: false, iterations };
}

function findFailPath(levelData, maxDepth = 50) {
  const init = new SimEngine(levelData);
  const stack = [{ engine: init, path: [] }];
  let iterations = 0;
  const maxIter = 200000;

  while (stack.length > 0 && iterations < maxIter) {
    iterations++;
    const { engine: eng, path } = stack.pop();
    if (eng.gameOver && !eng.won) return { found: true, path, iterations };
    if (eng.gameOver || path.length >= maxDepth) continue;

    const exposed = eng.getExposed();
    const sorted = [...exposed].sort((a, b) => {
      const ca = eng.screws[a].color, cb = eng.screws[b].color;
      const ma = eng._matchBox(ca) >= 0 ? 0 : 1;
      const mb = eng._matchBox(cb) >= 0 ? 0 : 1;
      return mb - ma;
    });

    for (const sid of sorted) {
      const clone = eng.clone();
      clone.tryPick(sid);
      stack.push({ engine: clone, path: [...path, sid] });
    }
  }
  return { found: false, iterations };
}

console.log('=== Level Verification ===\n');

const results = {};
for (const id of [1, 2, 3]) {
  const data = LEVEL_DATA[id];
  console.log(`--- Level ${id}: ${data.name} ---`);

  const totalByColor = {};
  data.plates.forEach(p => p.screws.forEach(s => { totalByColor[s.color] = (totalByColor[s.color] || 0) + 1; }));
  console.log('  Colors:', JSON.stringify(totalByColor));

  let queueNeeds = {};
  data.boxQueue.forEach(([l, r]) => {
    if (l) queueNeeds[l] = (queueNeeds[l] || 0) + 3;
    if (r) queueNeeds[r] = (queueNeeds[r] || 0) + 3;
  });
  console.log('  Queue needs:', JSON.stringify(queueNeeds));

  let colorMatch = true;
  for (const c of Object.keys(totalByColor)) {
    if (totalByColor[c] !== queueNeeds[c]) { colorMatch = false; break; }
  }
  console.log('  Color/queue match:', colorMatch ? 'OK' : 'MISMATCH');

  const winResult = findWinPath(data);
  console.log(`  Win path: ${winResult.found ? 'FOUND' : 'NOT FOUND'} (${winResult.iterations} iterations)`);
  if (winResult.found) console.log('    Path:', winResult.path.join(' → '));

  results[id] = { win: winResult };

  if (id >= 2) {
    const failResult = findFailPath(data);
    console.log(`  Fail path: ${failResult.found ? 'FOUND' : 'NOT FOUND'} (${failResult.iterations} iterations)`);
    if (failResult.found) console.log('    Path:', failResult.path.join(' → '));
    results[id].fail = failResult;
  }
  console.log();
}

const fs = await import('fs');
fs.writeFileSync('level-solutions.json', JSON.stringify(results, null, 2));
console.log('Results written to level-solutions.json');
