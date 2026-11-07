/**
 * Hint solver — finds the next move leading to a win via DFS.
 * Uses a lightweight SimEngine (adapted from verify-levels.js) that
 * operates on engine snapshots so the real GameEngine is never mutated.
 */

class SimEngine {
  /** Build from a GameEngine snapshot (engine.snapshot()) */
  static fromSnapshot(snap) {
    const s = Object.create(SimEngine.prototype);
    s.screws = {};
    for (const [k, v] of Object.entries(snap.screws)) s.screws[k] = { ...v };
    s.plates = {};
    for (const [k, v] of Object.entries(snap.plates)) s.plates[k] = { ...v, screwIds: [...v.screwIds] };
    s.buffer = [...snap.buffer];
    s.boxes = snap.boxes.map(b => ({ ...b }));
    s.boxQueue = null; // set externally
    s.boxQueueIndex = snap.boxQueueIndex;
    s.gameOver = snap.gameOver;
    s.won = snap.won;
    s.totalScrews = 0;
    s.removedCount = snap.removedCount;
    s._overlapMap = snap._overlapMap; // immutable ref
    // count totalScrews from screws that aren't removed
    for (const v of Object.values(s.screws)) {
      s.totalScrews++;
    }
    // subtract removed ones that were already counted
    // actually totalScrews = all screws regardless of state, same as GameEngine
    return s;
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

  _matchBox(color) {
    for (let i = 0; i < 2; i++) {
      if (this.boxes[i].color === color && this.boxes[i].filled < 3) return i;
    }
    return -1;
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

/**
 * Find the next move (screwId) that leads to a win from the current state.
 * @param {GameEngine} engine — the live game engine (not mutated)
 * @returns {{ screwId: string } | null}
 */
export function findNextMove(engine) {
  if (engine.gameOver) return null;

  const snap = engine.snapshot();
  const init = SimEngine.fromSnapshot(snap);
  init.boxQueue = engine.boxQueue;
  init.totalScrews = engine.totalScrews;

  const MAX_ITER = 100000;
  const MAX_DEPTH = 200;
  let iterations = 0;

  const stack = [{ engine: init, path: [] }];

  while (stack.length > 0 && iterations < MAX_ITER) {
    iterations++;
    const { engine: eng, path } = stack.pop();

    if (eng.won) {
      // Return the first move of the winning path
      return path.length > 0 ? { screwId: path[0] } : null;
    }
    if (eng.gameOver || path.length >= MAX_DEPTH) continue;

    const exposed = eng.getExposed();
    // Heuristic: prefer screws matching current box colors (pushed last = tried first in DFS)
    const sorted = [...exposed].sort((a, b) => {
      const ma = eng._matchBox(eng.screws[a].color) >= 0 ? 0 : 1;
      const mb = eng._matchBox(eng.screws[b].color) >= 0 ? 0 : 1;
      return mb - ma; // non-matching first in array → matching last → popped first
    });

    for (const sid of sorted) {
      const clone = eng.clone();
      clone.tryPick(sid);
      stack.push({ engine: clone, path: [...path, sid] });
    }
  }

  return null;
}
