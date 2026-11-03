/**
 * Undo state management.
 * Maintains a stack of engine snapshots so the player can revert moves.
 */

const MAX_STACK = 50;

export class UndoManager {
  /**
   * @param {import('./game.js').GameEngine} engine
   */
  constructor(engine) {
    this._engine = engine;
    this._stack = [];
  }

  /** Push current engine state onto the undo stack (call BEFORE each move). */
  saveState() {
    if (this._stack.length >= MAX_STACK) {
      this._stack.shift(); // drop oldest
    }
    this._stack.push(this._engine.snapshot());
  }

  /** @returns {boolean} */
  canUndo() {
    return this._stack.length > 0;
  }

  /**
   * Pop the most recent snapshot, restore engine state, and return the snapshot
   * so the caller can rebuild the 3D scene.
   * @returns {object | null} the restored snapshot, or null if nothing to undo
   */
  undo() {
    if (this._stack.length === 0) return null;
    const snap = this._stack.pop();
    this._engine.restore(snap);
    return snap;
  }

  /** Clear all history (call on level load / restart). */
  clear() {
    this._stack = [];
  }
}
