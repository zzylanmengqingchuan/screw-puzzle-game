import { LEVEL_DATA } from './levels.js';

export const ScrewState = {
  ON_PLATE: 'on_plate',
  ANIMATING: 'animating',
  IN_BUFFER: 'in_buffer',
  IN_BOX: 'in_box',
  REMOVED: 'removed',
};

export const PlateState = {
  ACTIVE: 'active',
  FALLING: 'falling',
  GONE: 'gone',
};

export class GameEngine {
  constructor() {
    this.levelId = null;
    this.screws = {};
    this.plates = {};
    this.buffer = [null, null, null, null, null];
    this.boxes = [
      { color: null, filled: 0 },
      { color: null, filled: 0 },
    ];
    this.boxQueue = [];
    this.boxQueueIndex = 0;
    this.gameOver = false;
    this.won = false;
    this.totalScrews = 0;
    this.removedCount = 0;
  }

  loadLevel(id) {
    const data = LEVEL_DATA[id];
    if (!data) return null;
    this.levelId = id;
    this.screws = {};
    this.plates = {};
    this.buffer = [null, null, null, null, null];
    this.boxQueue = data.boxQueue;
    this.boxQueueIndex = 0;
    this.gameOver = false;
    this.won = false;
    this.removedCount = 0;
    this.totalScrews = 0;

    data.plates.forEach(pd => {
      this.plates[pd.id] = {
        ...pd,
        state: PlateState.ACTIVE,
        screwIds: pd.screws.map(s => s.id),
        remainingScrews: pd.screws.length,
      };
      pd.screws.forEach(sd => {
        this.screws[sd.id] = {
          id: sd.id,
          color: sd.color,
          plateId: pd.id,
          localPos: sd.localPos,
          state: ScrewState.ON_PLATE,
          bufferIndex: -1,
        };
        this.totalScrews++;
      });
    });

    this._overlapMap = {};
    (data.overlaps || []).forEach(o => {
      o.blocksScrews.forEach(sid => {
        if (!this._overlapMap[sid]) this._overlapMap[sid] = new Set();
        this._overlapMap[sid].add(o.upper);
      });
    });

    this._applyBoxColors();
    return data;
  }

  _applyBoxColors() {
    if (this.boxQueueIndex < this.boxQueue.length) {
      const pair = this.boxQueue[this.boxQueueIndex];
      this.boxes[0] = { color: pair[0], filled: 0 };
      this.boxes[1] = { color: pair[1], filled: 0 };
    }
  }

  isExposed(screwId) {
    const s = this.screws[screwId];
    if (!s || s.state !== ScrewState.ON_PLATE) return false;
    const plate = this.plates[s.plateId];
    if (plate.state !== PlateState.ACTIVE) return false;
    const blockers = this._overlapMap[screwId];
    if (!blockers) return true;
    for (const upperId of blockers) {
      if (this.plates[upperId].state === PlateState.ACTIVE) return false;
    }
    return true;
  }

  getExposedScrewIds() {
    return Object.keys(this.screws).filter(id => this.isExposed(id));
  }

  tryPickScrew(screwId) {
    if (this.gameOver) return null;
    const screw = this.screws[screwId];
    if (!screw || screw.state !== ScrewState.ON_PLATE) return null;
    if (!this.isExposed(screwId)) return null;

    screw.state = ScrewState.ANIMATING;

    const commands = [];
    commands.push({ type: 'screw_out', screwId });

    const plate = this.plates[screw.plateId];
    plate.remainingScrews--;

    const boxIndex = this._findMatchingBox(screw.color);
    if (boxIndex >= 0) {
      commands.push(...this._placeScrewInBox(screw, boxIndex));
    } else {
      const bufIdx = this._findEmptyBuffer();
      if (bufIdx < 0) {
        this.gameOver = true;
        commands.push({ type: 'fail' });
        return commands;
      }
      screw.state = ScrewState.IN_BUFFER;
      screw.bufferIndex = bufIdx;
      this.buffer[bufIdx] = screwId;
      commands.push({ type: 'fly_to_buffer', screwId, bufferIndex: bufIdx });
    }

    if (plate.remainingScrews <= 0 && plate.state === PlateState.ACTIVE) {
      plate.state = PlateState.FALLING;
      commands.push({ type: 'plate_fall', plateId: plate.id });
    }

    const autoCommands = this._autoReturnLoop();
    commands.push(...autoCommands);

    if (!this.gameOver) {
      this._checkBufferFull(commands);
    }

    if (!this.gameOver && this.removedCount >= this.totalScrews) {
      this.won = true;
      this.gameOver = true;
      commands.push({ type: 'victory' });
    }

    return commands;
  }

  _findMatchingBox(color) {
    for (let i = 0; i < 2; i++) {
      if (this.boxes[i].color === color && this.boxes[i].filled < 3) return i;
    }
    return -1;
  }

  _findEmptyBuffer() {
    for (let i = 0; i < 5; i++) {
      if (this.buffer[i] === null) return i;
    }
    return -1;
  }

  _placeScrewInBox(screw, boxIndex) {
    const commands = [];
    screw.state = ScrewState.IN_BOX;
    const slotIdx = this.boxes[boxIndex].filled;
    this.boxes[boxIndex].filled++;
    commands.push({ type: 'fly_to_box', screwId: screw.id, boxIndex, slotIndex: slotIdx });

    let bothFull = true;
    for (let i = 0; i < 2; i++) {
      if (this.boxes[i].color !== null && this.boxes[i].filled < 3) bothFull = false;
    }
    const leftDone = !this.boxes[0].color || this.boxes[0].filled >= 3;
    const rightDone = !this.boxes[1].color || this.boxes[1].filled >= 3;
    if (leftDone && rightDone) {
      this.removedCount += (this.boxes[0].color ? 3 : 0) + (this.boxes[1].color ? 3 : 0);
      commands.push({ type: 'eliminate_box', boxIndex: 0 });
      commands.push({ type: 'eliminate_box', boxIndex: 1 });

      this.boxQueueIndex++;
      if (this.boxQueueIndex < this.boxQueue.length) {
        this._applyBoxColors();
        commands.push({ type: 'box_color_change', colors: [this.boxes[0].color, this.boxes[1].color] });
      }
    }

    return commands;
  }

  _autoReturnLoop() {
    const commands = [];
    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < 5; i++) {
        const sid = this.buffer[i];
        if (!sid) continue;
        const screw = this.screws[sid];
        const boxIndex = this._findMatchingBox(screw.color);
        if (boxIndex >= 0) {
          this.buffer[i] = null;
          screw.bufferIndex = -1;
          found = true;
          const placeCommands = this._placeScrewInBox(screw, boxIndex);
          commands.push({ type: 'auto_return', screwId: sid, bufferIndex: i, boxIndex });
          commands.push(...placeCommands);
        }
      }
    }
    return commands;
  }

  _checkBufferFull(commands) {
    const usedSlots = this.buffer.filter(s => s !== null).length;
    if (usedSlots >= 5) {
      this.gameOver = true;
      this.won = false;
      commands.push({ type: 'fail' });
    }
  }

  getBoxColors() {
    return [this.boxes[0].color, this.boxes[1].color];
  }

  getBoxFilled() {
    return [this.boxes[0].filled, this.boxes[1].filled];
  }

  getBufferState() {
    return this.buffer.map(sid => sid ? this.screws[sid].color : null);
  }

  snapshot() {
    const screws = {};
    for (const [k, v] of Object.entries(this.screws)) {
      screws[k] = { ...v, localPos: v.localPos ? { ...v.localPos } : v.localPos };
    }
    const plates = {};
    for (const [k, v] of Object.entries(this.plates)) {
      plates[k] = { ...v, screwIds: [...v.screwIds] };
    }
    return {
      screws,
      plates,
      buffer: [...this.buffer],
      boxes: this.boxes.map(b => ({ ...b })),
      boxQueueIndex: this.boxQueueIndex,
      gameOver: this.gameOver,
      won: this.won,
      removedCount: this.removedCount,
      _overlapMap: this._overlapMap,
    };
  }

  restore(snap) {
    this.screws = {};
    for (const [k, v] of Object.entries(snap.screws)) {
      this.screws[k] = { ...v, localPos: v.localPos ? { ...v.localPos } : v.localPos };
    }
    this.plates = {};
    for (const [k, v] of Object.entries(snap.plates)) {
      this.plates[k] = { ...v, screwIds: [...v.screwIds] };
    }
    this.buffer = [...snap.buffer];
    this.boxes = snap.boxes.map(b => ({ ...b }));
    this.boxQueueIndex = snap.boxQueueIndex;
    this.gameOver = snap.gameOver;
    this.won = snap.won;
    this.removedCount = snap.removedCount;
    this._overlapMap = snap._overlapMap;
    this._applyBoxColors();
  }
}
